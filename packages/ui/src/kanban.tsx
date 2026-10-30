"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  DragHandle,
  silentAnnouncements,
  useDragSensors,
  useFocusAfterMove,
  useLiveAnnouncer,
  usePrefersReducedMotion,
  useSortableItem,
  validateSortableIds,
  type DragFrom,
  type KeyboardMoveDirection,
  type SortableEntity,
  type SortableHandleProps,
} from "./drag-drop";
import { Menu, MenuItem, MenuPopover, MenuSeparator, MenuTrigger } from "./menu";
import { cx } from "./utils";

/* -------------------------------------------------------------------------------------------------
 * Types and pure helpers
 * -----------------------------------------------------------------------------------------------*/

export interface KanbanColumn<T extends SortableEntity> {
  /** Stable, unique column key. */
  id: string;
  title: ReactNode;
  /** Plain-text column name for announcements. Required when `title` is not a string. */
  label?: string | undefined;
  description?: ReactNode | undefined;
  items: readonly T[];
  /** Locked column: its cards cannot be moved and nothing can be dropped into it. */
  disabled?: boolean | undefined;
}

/** A single card move. Indexes are zero-based positions in the final column order. */
export interface KanbanMove {
  itemId: string;
  fromColumnId: string;
  fromIndex: number;
  toColumnId: string;
  toIndex: number;
}

export interface KanbanCardLocation {
  columnIndex: number;
  columnId: string;
  index: number;
}

/** Finds which column holds `itemId` and where. */
export function locateKanbanCard<T extends SortableEntity>(
  columns: ReadonlyArray<KanbanColumn<T>>,
  itemId: string,
): KanbanCardLocation | null {
  for (const [columnIndex, column] of columns.entries()) {
    const index = column.items.findIndex((item) => item.id === itemId);
    if (index >= 0) return { columnIndex, columnId: column.id, index };
  }
  return null;
}

/**
 * Pure move: returns new columns with `itemId` placed at `toIndex` (clamped) in `toColumnId`, plus
 * the resulting move. Untouched columns keep their identity. Returns null when nothing changes.
 */
export function moveKanbanCard<T extends SortableEntity>(
  columns: ReadonlyArray<KanbanColumn<T>>,
  itemId: string,
  toColumnId: string,
  toIndex: number,
): { columns: Array<KanbanColumn<T>>; move: KanbanMove } | null {
  const from = locateKanbanCard(columns, itemId);
  const targetIndex = columns.findIndex((column) => column.id === toColumnId);
  if (!from || targetIndex < 0) return null;
  const source = columns[from.columnIndex] as KanbanColumn<T>;
  const item = source.items[from.index] as T;
  const sourceItems = source.items.filter((_, index) => index !== from.index);
  const targetItems =
    targetIndex === from.columnIndex ? sourceItems : (columns[targetIndex] as KanbanColumn<T>).items.slice();
  const index = Math.max(0, Math.min(toIndex, targetItems.length));
  if (targetIndex === from.columnIndex && index === from.index) return null;
  targetItems.splice(index, 0, item);
  const next = columns.map((column, columnIndex) => {
    if (columnIndex === targetIndex) return { ...column, items: targetItems };
    if (columnIndex === from.columnIndex) return { ...column, items: sourceItems };
    return column;
  });
  return {
    columns: next,
    move: { itemId, fromColumnId: from.columnId, fromIndex: from.index, toColumnId, toIndex: index },
  };
}

// A NUL prefix keeps column drop targets out of the card ID space.
const COLUMN_PREFIX = "\u0000kanban-column:";
const columnKey = (id: string) => `${COLUMN_PREFIX}${id}`;
const columnIdFromKey = (key: UniqueIdentifier) =>
  typeof key === "string" && key.startsWith(COLUMN_PREFIX) ? key.slice(COLUMN_PREFIX.length) : null;

/* -------------------------------------------------------------------------------------------------
 * Messages
 * -----------------------------------------------------------------------------------------------*/

export interface KanbanMessages {
  instructions: string;
  handleLabel: (card: string) => string;
  moveMenuLabel: (card: string) => string;
  moveMenuTrigger: string;
  moveUp: string;
  moveDown: string;
  moveToColumn: (column: string) => string;
  cardCount: (count: number) => string;
  emptyColumn: string;
  pickedUp: (card: string, column: string, position: number, total: number) => string;
  movedOver: (card: string, column: string, position: number, total: number) => string;
  dropped: (card: string, column: string, position: number, total: number) => string;
  cancelled: (card: string, column: string, position: number, total: number) => string;
  moved: (card: string, column: string, position: number, total: number) => string;
  blocked: (card: string, column: string) => string;
}

export const defaultKanbanMessages: KanbanMessages = {
  instructions:
    "To pick up a card, press Space or Enter. Use the arrow keys to move it within and between columns, Space or Enter to drop it, or Escape to cancel. Alt with Up or Down moves it one place; Alt with Left or Right moves it to the next column. The Move menu does the same.",
  handleLabel: (card) => `Drag ${card}`,
  moveMenuLabel: (card) => `Move ${card}`,
  moveMenuTrigger: "Move",
  moveUp: "Move up",
  moveDown: "Move down",
  moveToColumn: (column) => `Move to ${column}`,
  cardCount: (count) => (count === 1 ? "1 card" : `${count} cards`),
  emptyColumn: "No cards yet. Drop one here.",
  pickedUp: (card, column, position, total) =>
    `Picked up ${card} in ${column}, position ${position} of ${total}.`,
  movedOver: (card, column, position, total) =>
    `${card} is over ${column}, position ${position} of ${total}.`,
  dropped: (card, column, position, total) =>
    `Dropped ${card} in ${column}, position ${position} of ${total}.`,
  cancelled: (card, column, position, total) =>
    `Move cancelled. ${card} is back in ${column}, position ${position} of ${total}.`,
  moved: (card, column, position, total) => `${card} moved to ${column}, position ${position} of ${total}.`,
  blocked: (card, column) => `${card} cannot move to ${column}.`,
};

/* -------------------------------------------------------------------------------------------------
 * KanbanBoard
 * -----------------------------------------------------------------------------------------------*/

export interface KanbanCardRenderState {
  columnId: string;
  index: number;
  /** This card is the one being dragged (its placeholder, or the floating copy when `overlay`). */
  dragging: boolean;
  /** True for the floating copy that follows the pointer. */
  overlay: boolean;
  disabled: boolean;
  handleProps: SortableHandleProps | undefined;
  /** The grip button, already wired. */
  handle: ReactNode;
  /** The accessible Move menu (up, down, other columns). */
  moveMenu: ReactNode;
  /** Programmatic move with the same validation, callback and announcement as a drag. */
  moveTo: (columnId: string, index?: number) => void;
}

export interface KanbanColumnRenderState {
  count: number;
  titleId: string;
  disabled: boolean;
}

export interface KanbanBoardProps<T extends SortableEntity>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange" | "onDragStart"> {
  /** Controlled columns and cards. Persist them yourself in `onColumnsChange`. */
  columns: ReadonlyArray<KanbanColumn<T>>;
  /** Called once per completed move with the new columns and the exact move. */
  onColumnsChange: (columns: Array<KanbanColumn<T>>, move: KanbanMove) => void;
  renderCard: (item: T, state: KanbanCardRenderState) => ReactNode;
  /** Plain-text card name for announcements and control labels. */
  getItemLabel: (item: T) => string;
  /** Accessible name of the board. */
  label: string;
  /** Veto a move (WIP limits, permissions). Rejected moves snap back and are announced. */
  canMove?: ((move: KanbanMove, item: T) => boolean) | undefined;
  disabled?: boolean | undefined;
  isItemDisabled?: ((item: T) => boolean) | undefined;
  /** Defaults to `item`: press anywhere on the card (except its fields and buttons) to drag. */
  dragFrom?: DragFrom | undefined;
  /** `auto` adds the handle and Move menu to each card; `custom` lets `renderCard` place them. */
  cardActions?: "auto" | "custom" | undefined;
  headingLevel?: 2 | 3 | 4 | undefined;
  renderColumnHeader?: ((column: KanbanColumn<T>, state: KanbanColumnRenderState) => ReactNode) | undefined;
  renderColumnFooter?: ((column: KanbanColumn<T>, state: KanbanColumnRenderState) => ReactNode) | undefined;
  /** Replaces the default empty-column text. */
  columnEmpty?: ReactNode | ((column: KanbanColumn<T>) => ReactNode) | undefined;
  messages?: Partial<KanbanMessages> | undefined;
  onDragStart?: ((itemId: string) => void) | undefined;
  onDragCancel?: ((itemId: string) => void) | undefined;
}

/** A controlled Kanban board: reorder within columns and move cards between them. */
export function KanbanBoard<T extends SortableEntity>({
  canMove,
  cardActions = "auto",
  className,
  columnEmpty,
  columns,
  disabled = false,
  dragFrom = "item",
  getItemLabel,
  headingLevel = 3,
  isItemDisabled,
  label,
  messages: messagesProp,
  onColumnsChange,
  onDragCancel,
  onDragStart,
  renderCard,
  renderColumnFooter,
  renderColumnHeader,
  ...props
}: KanbanBoardProps<T>) {
  const contextId = useId();
  validateSortableIds(columns.map((column) => column.id), "KanbanBoard columns");
  const cardIds = columns.flatMap((column) => column.items.map((item) => item.id));
  validateSortableIds(cardIds, "KanbanBoard");
  const reserved = cardIds.find((id) => id.startsWith(COLUMN_PREFIX));
  if (reserved !== undefined) {
    throw new Error(
      `@brandcloud/ui: KanbanBoard card id ${JSON.stringify(reserved)} uses the reserved column prefix. Choose another id.`,
    );
  }

  const messages = useMemo(() => ({ ...defaultKanbanMessages, ...messagesProp }), [messagesProp]);
  const sensors = useDragSensors();
  const reducedMotion = usePrefersReducedMotion();
  const { announce, region } = useLiveAnnouncer();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const focusAfterMove = useFocusAfterMove(rootRef, columns);

  // While dragging, cards move between columns in a local draft; the consumer only hears about
  // the final move. Cancel or a vetoed move simply drops the draft.
  const [draft, setDraftState] = useState<Array<KanbanColumn<T>> | null>(null);
  const draftRef = useRef<ReadonlyArray<KanbanColumn<T>> | null>(null);
  const origin = useRef<KanbanCardLocation | null>(null);
  // dnd-kit reports targets that do not change the card's place (itself, its own column) right
  // after pick-up; only announce when the column or position actually changes.
  const lastSpoken = useRef("");
  // The card a pointer drag was just placed below in another column. dnd-kit keeps reporting that
  // card as the target, which sortable reads as "go above it"; see collisionDetection.
  const placedBelow = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const view = draft ?? columns;

  const setDraft = (next: Array<KanbanColumn<T>> | null) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const findItem = useCallback(
    (id: string) => {
      for (const column of columns) {
        const item = column.items.find((entry) => entry.id === id);
        if (item) return item;
      }
      return undefined;
    },
    [columns],
  );
  const cardLabel = (id: string) => {
    const item = findItem(id);
    return item ? getItemLabel(item) : id;
  };
  const columnLabel = (column: KanbanColumn<T> | undefined) =>
    column ? (column.label ?? (typeof column.title === "string" ? column.title : column.id)) : "";
  const columnById = (cols: ReadonlyArray<KanbanColumn<T>>, id: string) => cols.find((column) => column.id === id);

  const announceAt = (
    message: (card: string, column: string, position: number, total: number) => string,
    cols: ReadonlyArray<KanbanColumn<T>>,
    itemId: string,
  ) => {
    const at = locateKanbanCard(cols, itemId);
    if (!at) return;
    const column = cols[at.columnIndex];
    announce(message(cardLabel(itemId), columnLabel(column), at.index + 1, column?.items.length ?? 0));
  };

  // Checked against the latest props, so locks applied mid-drag still stop the drop.
  const isAllowed = (move: KanbanMove) => {
    const item = findItem(move.itemId);
    const source = columnById(columns, move.fromColumnId);
    const target = columnById(columns, move.toColumnId);
    if (disabled || !item || !source || !target || source.disabled || target.disabled) return false;
    if (isItemDisabled?.(item)) return false;
    return canMove ? canMove(move, item) : true;
  };

  /** Commits a move against the controlled columns. Returns true when the consumer was called. */
  const commit = (itemId: string, toColumnId: string, toIndex: number, refocus: boolean) => {
    const result = moveKanbanCard(columns, itemId, toColumnId, toIndex);
    if (!result) return false;
    if (!isAllowed(result.move)) {
      announce(messages.blocked(cardLabel(itemId), columnLabel(columnById(columns, toColumnId))));
      return false;
    }
    if (refocus) focusAfterMove(itemId);
    onColumnsChange(result.columns, result.move);
    return true;
  };

  const moveTo = (itemId: string, toColumnId: string, toIndex?: number) => {
    if (disabled) return;
    const target = columnById(columns, toColumnId);
    const index = toIndex ?? target?.items.length ?? 0;
    const result = moveKanbanCard(columns, itemId, toColumnId, index);
    if (result && commit(itemId, toColumnId, index, true)) {
      announceAt(messages.moved, result.columns, itemId);
    }
  };

  const keyboardMove = (itemId: string, direction: KeyboardMoveDirection, keyAxis: "x" | "y") => {
    const at = locateKanbanCard(columns, itemId);
    if (!at) return;
    if (keyAxis === "y") {
      const index = at.index + direction;
      const column = columns[at.columnIndex];
      if (index < 0 || index >= (column?.items.length ?? 0)) {
        announceAt(messages.moved, columns, itemId);
        return;
      }
      moveTo(itemId, at.columnId, index);
      return;
    }
    // Next column in that direction that accepts cards; keep the same row where possible.
    for (let next = at.columnIndex + direction; next >= 0 && next < columns.length; next += direction) {
      const column = columns[next] as KanbanColumn<T>;
      if (!column.disabled) {
        moveTo(itemId, column.id, Math.min(at.index, column.items.length));
        return;
      }
    }
    announceAt(messages.moved, columns, itemId);
  };

  /* Drag lifecycle -------------------------------------------------------------------------- */

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (!args.pointerCoordinates) return closestCorners(args);
    const pointer = pointerWithin(args);
    let hits = pointer.length > 0 ? pointer : rectIntersection(args);
    const overId = getFirstCollision(hits, "id");
    const columnId = overId === null ? null : columnIdFromKey(overId);
    if (columnId !== null) {
      // Over a column's padding: snap to the nearest card in that column, if it has any.
      const cards = new Set(
        (draftRef.current ?? []).find((column) => column.id === columnId)?.items.map((item) => item.id) ?? [],
      );
      if (cards.size > 0) {
        const inner = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id !== args.active.id && cards.has(String(container.id)),
          ),
        });
        if (inner.length > 0) hits = inner;
      }
    }
    // Still below the middle of the card it was placed under: target the card itself, so the
    // preview and the drop both keep it below. Moving above that middle reorders as usual.
    const anchor = placedBelow.current;
    const anchorRect = anchor === null ? undefined : args.droppableRects.get(anchor);
    if (anchorRect && getFirstCollision(hits, "id") === anchor && args.collisionRect.top > anchorRect.top + anchorRect.height / 2) {
      return [{ id: args.active.id }];
    }
    return hits;
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    origin.current = locateKanbanCard(columns, id);
    lastSpoken.current = origin.current ? `${origin.current.columnId}:${origin.current.index}` : "";
    setDraft(columns.slice());
    setActiveId(id);
    announceAt(messages.pickedUp, columns, id);
    onDragStart?.(id);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const current = draftRef.current;
    if (!over || !current) return;
    const id = String(active.id);
    const from = locateKanbanCard(current, id);
    const overColumnId = columnIdFromKey(over.id) ?? locateKanbanCard(current, String(over.id))?.columnId;
    if (!from || overColumnId === undefined) return;
    const target = columnById(current, overColumnId);
    if (!target || target.disabled) return;

    if (from.columnId === overColumnId) {
      const overIndex = target.items.findIndex((item) => item.id === over.id);
      const position = overIndex < 0 ? from.index : overIndex;
      const spoken = `${target.id}:${position}`;
      if (spoken === lastSpoken.current) return;
      lastSpoken.current = spoken;
      announce(messages.movedOver(cardLabel(id), columnLabel(target), position + 1, target.items.length));
      return;
    }

    let index = target.items.length;
    const overIndex = target.items.findIndex((item) => item.id === over.id);
    if (overIndex >= 0) {
      const translated = active.rect.current.translated;
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      index = overIndex + (below ? 1 : 0);
    }
    const result = moveKanbanCard(current, id, overColumnId, index);
    if (!result) return;
    placedBelow.current = overIndex >= 0 && index > overIndex ? String(over.id) : null;
    lastSpoken.current = `${result.move.toColumnId}:${result.move.toIndex}`;
    setDraft(result.columns);
    announceAt(messages.movedOver, result.columns, id);
  };

  const finish = () => {
    setDraft(null);
    setActiveId(null);
    origin.current = null;
    placedBelow.current = null;
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const current = draftRef.current ?? columns;
    const start = origin.current;
    finish();
    if (!over || !start) {
      announceAt(messages.cancelled, columns, id);
      onDragCancel?.(id);
      return;
    }
    let at = locateKanbanCard(current, id);
    if (!at) return;
    const overColumn = columnById(current, at.columnId);
    const overIndex = overColumn?.items.findIndex((item) => item.id === over.id) ?? -1;
    if (overIndex >= 0 && overIndex !== at.index) at = { ...at, index: overIndex };

    if (at.columnId === start.columnId && at.index === start.index) {
      announceAt(messages.dropped, columns, id);
      return;
    }
    const result = moveKanbanCard(columns, id, at.columnId, at.index);
    if (result && commit(id, at.columnId, at.index, false)) {
      announceAt(messages.dropped, result.columns, id);
    }
  };

  const handleDragCancel = ({ active }: { active: { id: UniqueIdentifier } }) => {
    const id = String(active.id);
    finish();
    announceAt(messages.cancelled, columns, id);
    onDragCancel?.(id);
  };

  const activeItem = activeId ? findItem(activeId) : undefined;
  const activeAt = activeId ? locateKanbanCard(view, activeId) : null;

  return (
    <div
      {...props}
      ref={rootRef}
      role="group"
      aria-label={label}
      className={cx("brand-kanban", className)}
      data-disabled={disabled || undefined}
      data-dragging={activeId !== null || undefined}
    >
      <DndContext
        id={contextId}
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{
          announcements: silentAnnouncements,
          screenReaderInstructions: { draggable: messages.instructions },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="brand-kanban__columns">
          {view.map((column) => (
            <KanbanColumnView
              key={column.id}
              column={column}
              columns={view}
              boardDisabled={disabled}
              cardActions={cardActions}
              columnEmpty={columnEmpty}
              dragFrom={dragFrom}
              getItemLabel={getItemLabel}
              headingLevel={headingLevel}
              isItemDisabled={isItemDisabled}
              messages={messages}
              reducedMotion={reducedMotion}
              renderCard={renderCard}
              renderColumnFooter={renderColumnFooter}
              renderColumnHeader={renderColumnHeader}
              columnLabel={columnLabel}
              isAllowed={(itemId, toColumnId, toIndex) => {
                const result = moveKanbanCard(columns, itemId, toColumnId, toIndex);
                return result !== null && isAllowed(result.move);
              }}
              moveTo={moveTo}
              keyboardMove={keyboardMove}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
          {activeItem && activeAt ? (
            <div className="brand-kanban__card" data-overlay="">
              <div className="brand-kanban__card-body">
                {renderCard(activeItem, {
                  columnId: activeAt.columnId,
                  index: activeAt.index,
                  dragging: true,
                  overlay: true,
                  disabled: false,
                  handleProps: undefined,
                  handle: null,
                  moveMenu: null,
                  moveTo: () => undefined,
                })}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {region}
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Column and card
 * -----------------------------------------------------------------------------------------------*/

interface KanbanColumnViewProps<T extends SortableEntity> {
  column: KanbanColumn<T>;
  columns: ReadonlyArray<KanbanColumn<T>>;
  boardDisabled: boolean;
  cardActions: "auto" | "custom";
  columnEmpty: KanbanBoardProps<T>["columnEmpty"];
  dragFrom: DragFrom;
  getItemLabel: (item: T) => string;
  headingLevel: 2 | 3 | 4;
  isItemDisabled: ((item: T) => boolean) | undefined;
  messages: KanbanMessages;
  reducedMotion: boolean;
  renderCard: KanbanBoardProps<T>["renderCard"];
  renderColumnFooter: KanbanBoardProps<T>["renderColumnFooter"];
  renderColumnHeader: KanbanBoardProps<T>["renderColumnHeader"];
  columnLabel: (column: KanbanColumn<T> | undefined) => string;
  isAllowed: (itemId: string, toColumnId: string, toIndex: number) => boolean;
  moveTo: (itemId: string, toColumnId: string, toIndex?: number) => void;
  keyboardMove: (itemId: string, direction: KeyboardMoveDirection, keyAxis: "x" | "y") => void;
}

function KanbanColumnView<T extends SortableEntity>(props: KanbanColumnViewProps<T>) {
  const { boardDisabled, column, columnEmpty, headingLevel, messages, renderColumnFooter, renderColumnHeader } = props;
  const titleId = useId();
  const columnDisabled = boardDisabled || column.disabled === true;
  const { isOver, setNodeRef } = useDroppable({
    id: columnKey(column.id),
    data: { type: "column", columnId: column.id },
    disabled: columnDisabled,
  });
  const ids = useMemo(() => column.items.map((item) => item.id), [column.items]);
  const state: KanbanColumnRenderState = { count: column.items.length, titleId, disabled: columnDisabled };
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const emptyContent = typeof columnEmpty === "function" ? columnEmpty(column) : columnEmpty;

  return (
    <section
      className="brand-kanban__column"
      aria-labelledby={titleId}
      data-column-id={column.id}
      data-disabled={columnDisabled || undefined}
      data-over={isOver || undefined}
    >
      {renderColumnHeader ? (
        renderColumnHeader(column, state)
      ) : (
        <header className="brand-kanban__column-header">
          <Heading id={titleId} className="brand-kanban__column-title">
            {column.title}
          </Heading>
          <span className="brand-kanban__count">{messages.cardCount(column.items.length)}</span>
          {column.description !== undefined ? (
            <p className="brand-kanban__column-description">{column.description}</p>
          ) : null}
        </header>
      )}
      <div ref={setNodeRef} className="brand-kanban__dropzone" data-empty={column.items.length === 0 || undefined}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="brand-kanban__cards" aria-labelledby={titleId}>
            {column.items.map((item, index) => (
              <KanbanCardView key={item.id} {...props} item={item} index={index} columnDisabled={columnDisabled} />
            ))}
          </ul>
        </SortableContext>
        {column.items.length === 0 ? (
          <div className="brand-kanban__empty">{emptyContent ?? messages.emptyColumn}</div>
        ) : null}
      </div>
      {renderColumnFooter ? <div className="brand-kanban__column-footer">{renderColumnFooter(column, state)}</div> : null}
    </section>
  );
}

interface KanbanCardViewProps<T extends SortableEntity> extends KanbanColumnViewProps<T> {
  item: T;
  index: number;
  columnDisabled: boolean;
}

function KanbanCardView<T extends SortableEntity>({
  cardActions,
  column,
  columnDisabled,
  columnLabel,
  columns,
  dragFrom,
  getItemLabel,
  index,
  isAllowed,
  isItemDisabled,
  item,
  keyboardMove,
  messages,
  moveTo,
  reducedMotion,
  renderCard,
}: KanbanCardViewProps<T>) {
  const label = getItemLabel(item);
  const disabled = columnDisabled || (isItemDisabled?.(item) ?? false);
  const binding = useSortableItem({
    id: item.id,
    label,
    disabled,
    dropDisabled: columnDisabled,
    dragFrom,
    axis: "both",
    reducedMotion,
    data: { type: "card", columnId: column.id },
    handleLabel: messages.handleLabel(label),
    onKeyboardMove: (direction, keyAxis) => keyboardMove(item.id, direction, keyAxis),
  });
  const handle = <DragHandle handleProps={binding.handleProps} />;
  const count = column.items.length;
  const otherColumns = columns.filter((entry) => entry.id !== column.id);
  const moveMenu = (
    <Menu align="end">
      <MenuTrigger
        className="brand-button brand-kanban__move"
        data-tone="neutral"
        data-appearance="ghost"
        data-size="sm"
        aria-label={messages.moveMenuLabel(label)}
        disabled={disabled}
      >
        {messages.moveMenuTrigger}
      </MenuTrigger>
      <MenuPopover>
        <MenuItem
          disabled={index === 0 || !isAllowed(item.id, column.id, index - 1)}
          onSelect={() => moveTo(item.id, column.id, index - 1)}
        >
          {messages.moveUp}
        </MenuItem>
        <MenuItem
          disabled={index >= count - 1 || !isAllowed(item.id, column.id, index + 1)}
          onSelect={() => moveTo(item.id, column.id, index + 1)}
        >
          {messages.moveDown}
        </MenuItem>
        {otherColumns.length > 0 ? <MenuSeparator /> : null}
        {otherColumns.map((target) => (
          <MenuItem
            key={target.id}
            disabled={!isAllowed(item.id, target.id, target.items.length)}
            onSelect={() => moveTo(item.id, target.id)}
          >
            {messages.moveToColumn(columnLabel(target))}
          </MenuItem>
        ))}
      </MenuPopover>
    </Menu>
  );
  const state: KanbanCardRenderState = {
    columnId: column.id,
    index,
    dragging: binding.isDragging,
    overlay: false,
    disabled,
    handleProps: binding.handleProps,
    handle,
    moveMenu,
    moveTo: (toColumnId, toIndex) => moveTo(item.id, toColumnId, toIndex),
  };

  return (
    <li
      ref={binding.setNodeRef}
      style={binding.style}
      className="brand-kanban__card"
      data-card-id={item.id}
      data-dragging={binding.isDragging || undefined}
      data-disabled={disabled || undefined}
      data-drag-from={dragFrom}
      {...binding.itemListeners}
    >
      <div className="brand-kanban__card-body">{renderCard(item, state)}</div>
      {cardActions === "auto" ? (
        <div className="brand-kanban__card-actions">
          {handle}
          {moveMenu}
        </div>
      ) : null}
    </li>
  );
}
