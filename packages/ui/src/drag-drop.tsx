"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type Modifier,
  type PointerSensorOptions,
  type TouchSensorOptions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { cx } from "./utils";

/* -------------------------------------------------------------------------------------------------
 * Shared types and pure helpers
 * -----------------------------------------------------------------------------------------------*/

/** Anything that can be reordered. IDs must be non-empty, stable and unique within one collection. */
export interface SortableEntity {
  id: string;
}

/** Where an item moved inside one ordered collection. Indexes are zero-based. */
export interface SortableMove {
  id: string;
  fromIndex: number;
  toIndex: number;
}

/**
 * `handle`: only the grip button starts a drag (default; safest when items hold inputs).
 * `item`: the whole item starts a pointer drag; inputs, buttons, links and `[data-no-drag]`
 * descendants never start one. The grip button stays the keyboard entry point either way.
 */
export type DragFrom = "handle" | "item";

/** Returns a new array with the entry at `fromIndex` moved to `toIndex`. Out-of-range moves return a copy. */
export function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice();
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.length ||
    toIndex >= next.length
  ) {
    return next;
  }
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved as T);
  return next;
}

/**
 * Throws when an ID is missing, empty or repeated. Drag and drop identifies items by ID, so
 * duplicates would silently move the wrong record; failing loudly protects consumer data.
 */
export function validateSortableIds(ids: readonly unknown[], component = "Sortable"): void {
  const seen = new Set<string>();
  for (const [index, id] of ids.entries()) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(
        `@brandcloud/ui: ${component} needs a non-empty string \`id\` on every item (index ${index}).`,
      );
    }
    if (seen.has(id)) {
      throw new Error(`@brandcloud/ui: ${component} found the duplicate id "${id}". IDs must be unique.`);
    }
    seen.add(id);
  }
}

const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "a[href]",
  "label",
  "summary",
  "[contenteditable='']",
  "[contenteditable='true']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='menuitem']",
  "[role='slider']",
  "[data-no-drag]",
].join(",");

/**
 * True when a pointer or touch on `target` belongs to an interactive descendant (field, button,
 * link, `[data-no-drag]`) rather than to the draggable item. Drag handles are never "interactive".
 */
export function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return interactive !== null && interactive.closest("[data-drag-handle]") === null;
}

function isInsideHandle(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && target.closest("[data-drag-handle]") !== null;
}

/**
 * Pointer sensor that ignores interactive descendants and leaves touches outside a drag handle
 * to the touch sensor (which waits for a press-and-hold so the page can still scroll).
 */
export class InteractiveSafePointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: ReactPointerEvent, { onActivation }: PointerSensorOptions) => {
        if (!event.isPrimary || event.button !== 0) return false;
        if (isInteractiveDragTarget(event.target)) return false;
        if (event.pointerType === "touch" && !isInsideHandle(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Touch sensor (press and hold) that ignores interactive descendants. */
export class InteractiveSafeTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent, { onActivation }: TouchSensorOptions) => {
        if (event.touches.length > 1) return false;
        if (isInteractiveDragTarget(event.target)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

/** Pointer (mouse, pen, touch on the handle), touch-and-hold and keyboard sensors, ready for DndContext. */
export function useDragSensors() {
  return useSensors(
    useSensor(InteractiveSafePointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(InteractiveSafeTouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** DndContext modifier that locks movement to one axis. */
export function restrictToAxis(axis: "x" | "y"): Modifier {
  return ({ transform }) => (axis === "y" ? { ...transform, x: 0 } : { ...transform, y: 0 });
}

/** Silences dnd-kit's built-in announcer; components announce through `useLiveAnnouncer` instead. */
export const silentAnnouncements: Announcements = {
  onDragStart: () => undefined,
  onDragMove: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/** True when the user asked the OS for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/* -------------------------------------------------------------------------------------------------
 * Live announcements and focus
 * -----------------------------------------------------------------------------------------------*/

export interface LiveAnnouncer {
  announce: (message: string) => void;
  /** Render once inside the component. */
  region: ReactNode;
}

/** A polite, visually hidden live region. Repeating the same message still re-announces it. */
export function useLiveAnnouncer(): LiveAnnouncer {
  const [message, setMessage] = useState("");
  const flip = useRef(false);
  const announce = useCallback((next: string) => {
    flip.current = !flip.current;
    // A trailing no-break space toggles so identical consecutive messages are spoken again.
    setMessage(flip.current ? next : `${next}\u00a0`);
  }, []);
  const region = (
    <div className="brand-visually-hidden" role="status" aria-live="polite" aria-atomic="true" data-drag-announcer="">
      {message}
    </div>
  );
  return { announce, region };
}

/**
 * Moves focus to `[data-drag-focus-id="<id>"]` inside `root` after the next render where
 * `version` changes. Used after keyboard or menu moves that remount the moved item.
 */
// useLayoutEffect warns during server rendering on React 18; these components also render on the server.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useFocusAfterMove(root: { current: HTMLElement | null }, version: unknown) {
  const pending = useRef<string | null>(null);
  useIsomorphicLayoutEffect(() => {
    const id = pending.current;
    if (id === null) return;
    pending.current = null;
    const target = root.current?.querySelector<HTMLElement>(
      `[data-drag-focus-id="${escapeAttribute(id)}"]`,
    );
    if (target && target !== document.activeElement) target.focus();
  }, [root, version]);
  return useCallback((id: string) => {
    pending.current = id;
  }, []);
}

function escapeAttribute(value: string): string {
  // `CSS` in this module is dnd-kit's helper, so reach the DOM one through globalThis.
  const domCss = (globalThis as { CSS?: { escape?: (value: string) => string } }).CSS;
  return typeof domCss?.escape === "function"
    ? domCss.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}

/* -------------------------------------------------------------------------------------------------
 * Messages
 * -----------------------------------------------------------------------------------------------*/

/** Screen reader text for ordered collections. Override any entry to translate or reword. */
export interface SortableMessages {
  /** Read when a drag handle receives focus. */
  instructions: string;
  /** Accessible name of each drag handle. */
  handleLabel: (label: string) => string;
  pickedUp: (label: string, position: number, total: number) => string;
  movedOver: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
  /** Read after a keyboard shortcut or button moves an item without dragging. */
  moved: (label: string, position: number, total: number) => string;
}

export const defaultSortableMessages: SortableMessages = {
  instructions:
    "To pick up an item, press Space or Enter. Use the arrow keys to move it, Space or Enter to drop it, or Escape to cancel. Alt with an arrow key moves it one place without picking it up.",
  handleLabel: (label) => `Reorder ${label}`,
  pickedUp: (label, position, total) => `Picked up ${label}. Position ${position} of ${total}.`,
  movedOver: (label, position, total) => `${label} is over position ${position} of ${total}.`,
  dropped: (label, position, total) => `Dropped ${label} at position ${position} of ${total}.`,
  cancelled: (label, position, total) =>
    `Move cancelled. ${label} is back at position ${position} of ${total}.`,
  moved: (label, position, total) => `${label} moved to position ${position} of ${total}.`,
};

/* -------------------------------------------------------------------------------------------------
 * Drag handle
 * -----------------------------------------------------------------------------------------------*/

/** Props to spread onto a custom handle element. Includes the ref, ARIA attributes and listeners. */
export type SortableHandleProps = DraggableAttributes & {
  ref: (element: HTMLElement | null) => void;
  "aria-label": string;
  "data-drag-handle": "";
  "data-drag-focus-id": string;
  disabled: boolean;
  onKeyDown?: ((event: KeyboardEvent<HTMLElement>) => void) | undefined;
  onPointerDown?: ((event: ReactPointerEvent<HTMLElement>) => void) | undefined;
  onTouchStart?: ((event: ReactTouchEvent<HTMLElement>) => void) | undefined;
};

export interface DragHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Spread from a sortable item's render state. */
  handleProps?: SortableHandleProps | undefined;
}

/** The grip button. Native button, so it is focusable and reachable on every input type. */
export const DragHandle = forwardRef<HTMLButtonElement, DragHandleProps>(function DragHandle(
  { className, handleProps, children, ...props },
  ref,
) {
  const { ref: handleRef, disabled, ...rest } = handleProps ?? ({} as Partial<SortableHandleProps>);
  return (
    <button
      type="button"
      {...rest}
      {...props}
      ref={mergeRefs<HTMLButtonElement>(ref, handleRef as Ref<HTMLButtonElement> | undefined)}
      className={cx("brand-drag-handle", className)}
      disabled={props.disabled ?? disabled}
    >
      {children ?? (
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
          <circle cx="5.5" cy="3.5" r="1.25" />
          <circle cx="10.5" cy="3.5" r="1.25" />
          <circle cx="5.5" cy="8" r="1.25" />
          <circle cx="10.5" cy="8" r="1.25" />
          <circle cx="5.5" cy="12.5" r="1.25" />
          <circle cx="10.5" cy="12.5" r="1.25" />
        </svg>
      )}
    </button>
  );
});

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (value: T | null) => void {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(value);
      else if (ref) (ref as { current: T | null }).current = value;
    }
  };
}

/* -------------------------------------------------------------------------------------------------
 * useSortableItem: shared by SortableList, SortableTable and KanbanBoard
 * -----------------------------------------------------------------------------------------------*/

export type KeyboardMoveDirection = -1 | 1;

export interface UseSortableItemOptions {
  id: string;
  label: string;
  disabled: boolean;
  /** Prevent other items being dropped on this one (kanban: locked column). */
  dropDisabled?: boolean | undefined;
  dragFrom: DragFrom;
  handleLabel: string;
  describedBy?: string | undefined;
  reducedMotion: boolean;
  data?: Record<string, unknown> | undefined;
  axis?: "x" | "y" | "both" | undefined;
  /**
   * Alt+Arrow handler. `keyAxis` says which arrow pair was used: `y` for Up/Down, `x` for
   * Left/Right. With `axis="y"` only Up/Down are handled. The component announces and refocuses.
   */
  onKeyboardMove?: ((direction: KeyboardMoveDirection, keyAxis: "x" | "y") => void) | undefined;
}

export interface SortableItemBinding {
  setNodeRef: (element: HTMLElement | null) => void;
  style: CSSProperties;
  isDragging: boolean;
  /** Pointer and touch listeners for the item element when `dragFrom` is `item`. */
  itemListeners: Pick<SortableHandleProps, "onPointerDown" | "onTouchStart">;
  handleProps: SortableHandleProps;
}

/** Internal building block. Must be used inside a dnd-kit SortableContext. */
export function useSortableItem({
  axis = "y",
  data,
  describedBy,
  disabled,
  dragFrom,
  dropDisabled = false,
  handleLabel,
  id,
  onKeyboardMove,
  reducedMotion,
}: UseSortableItemOptions): SortableItemBinding {
  const sortable = useSortable({
    id,
    ...(data ? { data } : {}),
    disabled: { draggable: disabled, droppable: dropDisabled },
    ...(reducedMotion ? { transition: null } : {}),
  });
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = sortable;
  const { onKeyDown: dndKeyDown, onPointerDown, onTouchStart } = (listeners ?? {}) as {
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
    onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
    onTouchStart?: (event: ReactTouchEvent<HTMLElement>) => void;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey && onKeyboardMove && !disabled) {
      const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      const horizontal = axis !== "y" && (event.key === "ArrowLeft" || event.key === "ArrowRight");
      if (vertical || horizontal) {
        event.preventDefault();
        const back = event.key === "ArrowUp" || event.key === "ArrowLeft";
        onKeyboardMove(back ? -1 : 1, vertical ? "y" : "x");
        return;
      }
    }
    dndKeyDown?.(event);
  };

  const pointer = { onPointerDown, onTouchStart };
  const handleProps: SortableHandleProps = {
    ...attributes,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    "aria-roledescription": "drag handle",
    ref: setActivatorNodeRef,
    "aria-label": handleLabel,
    "data-drag-handle": "",
    "data-drag-focus-id": id,
    disabled,
    onKeyDown: handleKeyDown,
    ...(dragFrom === "handle" ? pointer : {}),
  };

  return {
    setNodeRef,
    isDragging,
    style: {
      transform: CSS.Translate.toString(transform),
      transition: reducedMotion ? undefined : transition,
    },
    itemListeners: dragFrom === "item" && !disabled ? pointer : {},
    handleProps,
  };
}

/* -------------------------------------------------------------------------------------------------
 * useSortableController: drag lifecycle for one ordered collection
 * -----------------------------------------------------------------------------------------------*/

export interface UseSortableControllerOptions<T extends SortableEntity> {
  items: readonly T[];
  onItemsChange: (items: T[], move: SortableMove) => void;
  getItemLabel: (item: T) => string;
  messages: SortableMessages;
  component: string;
  axis: "x" | "y" | "both";
  disabled: boolean;
  isItemDisabled?: ((item: T) => boolean) | undefined;
  onDragStart?: ((id: string) => void) | undefined;
  onDragCancel?: ((id: string) => void) | undefined;
}

/** Internal building block shared by SortableList and SortableTable. */
export function useSortableController<T extends SortableEntity>({
  axis,
  component,
  disabled,
  getItemLabel,
  isItemDisabled,
  items,
  messages,
  onDragCancel,
  onDragStart,
  onItemsChange,
}: UseSortableControllerOptions<T>) {
  const contextId = useId();
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  validateSortableIds(ids, component);
  const sensors = useDragSensors();
  const { announce, region } = useLiveAnnouncer();
  const rootRef = useRef<HTMLElement | null>(null);
  const focusAfterMove = useFocusAfterMove(rootRef, items);
  const [activeId, setActiveId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const total = items.length;

  const labelOf = useCallback(
    (id: UniqueIdentifier) => {
      const item = items.find((entry) => entry.id === id);
      return item ? getItemLabel(item) : String(id);
    },
    [getItemLabel, items],
  );

  const commit = useCallback(
    (fromIndex: number, toIndex: number) => {
      const item = items[fromIndex];
      if (!item || fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return false;
      // Latest props: a list or item locked mid-drag must not commit.
      if (disabled || isItemDisabled?.(item)) return false;
      onItemsChange(moveItem(items, fromIndex, toIndex), { id: item.id, fromIndex, toIndex });
      return true;
    },
    [disabled, isItemDisabled, items, onItemsChange],
  );

  const moveBy = useCallback(
    (id: string, direction: KeyboardMoveDirection) => {
      if (disabled) return;
      const fromIndex = ids.indexOf(id);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0) return;
      if (toIndex < 0 || toIndex >= ids.length) {
        announce(messages.moved(labelOf(id), fromIndex + 1, total));
        return;
      }
      focusAfterMove(id);
      if (commit(fromIndex, toIndex)) announce(messages.moved(labelOf(id), toIndex + 1, total));
    },
    [announce, commit, disabled, focusAfterMove, ids, labelOf, messages, total],
  );

  // dnd-kit reports "over itself" right after pick-up; only announce real changes of target.
  const lastOver = useRef<UniqueIdentifier | null>(null);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    lastOver.current = active.id;
    setActiveId(id);
    announce(messages.pickedUp(labelOf(id), ids.indexOf(id) + 1, total));
    onDragStart?.(id);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || over.id === lastOver.current) return;
    lastOver.current = over.id;
    announce(messages.movedOver(labelOf(active.id), ids.indexOf(String(over.id)) + 1, total));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const id = String(active.id);
    const fromIndex = ids.indexOf(id);
    const toIndex = over ? ids.indexOf(String(over.id)) : -1;
    if (toIndex < 0) {
      announce(messages.cancelled(labelOf(id), fromIndex + 1, total));
      onDragCancel?.(id);
      return;
    }
    if (fromIndex !== toIndex && !commit(fromIndex, toIndex)) {
      announce(messages.cancelled(labelOf(id), fromIndex + 1, total));
      onDragCancel?.(id);
      return;
    }
    announce(messages.dropped(labelOf(id), toIndex + 1, total));
  };

  const handleDragCancel = ({ active }: { active: { id: UniqueIdentifier } }) => {
    setActiveId(null);
    const id = String(active.id);
    announce(messages.cancelled(labelOf(id), ids.indexOf(id) + 1, total));
    onDragCancel?.(id);
  };

  const modifiers = useMemo(() => (axis === "both" ? [] : [restrictToAxis(axis)]), [axis]);

  return {
    ids,
    activeId,
    rootRef,
    region,
    moveBy,
    reducedMotion,
    labelOf,
    contextProps: {
      id: contextId,
      sensors,
      collisionDetection: closestCenter,
      modifiers,
      accessibility: {
        announcements: silentAnnouncements,
        screenReaderInstructions: { draggable: messages.instructions },
      },
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      onDragCancel: handleDragCancel,
    },
  };
}

/* -------------------------------------------------------------------------------------------------
 * SortableList
 * -----------------------------------------------------------------------------------------------*/

export type SortableListOrientation = "vertical" | "horizontal" | "grid";

export interface SortableItemRenderState {
  index: number;
  /** This item is being dragged. */
  dragging: boolean;
  disabled: boolean;
  /** Spread onto your own handle element (with `handlePlacement="custom"`). */
  handleProps: SortableHandleProps;
  /** The built-in grip button, already wired. */
  handle: ReactNode;
  /** Move one place earlier. Undefined when the item cannot move that way. */
  moveBackward: (() => void) | undefined;
  /** Move one place later. Undefined when the item cannot move that way. */
  moveForward: (() => void) | undefined;
}

export interface SortableListProps<T extends SortableEntity>
  extends Omit<HTMLAttributes<HTMLElement>, "children" | "onChange" | "onDragStart"> {
  /** Controlled order. Persist it yourself in `onItemsChange`. */
  items: readonly T[];
  /** Called with the new order and the move that produced it. Not called when nothing moved. */
  onItemsChange: (items: T[], move: SortableMove) => void;
  /** Content of one item. The list supplies the `li`, handle and drag styling. */
  renderItem: (item: T, state: SortableItemRenderState) => ReactNode;
  /** Plain-text name used in announcements and handle labels. */
  getItemLabel: (item: T) => string;
  /** Accessible name for the list. Use this or `aria-labelledby`. */
  label?: string | undefined;
  orientation?: SortableListOrientation | undefined;
  /** Renders an ordered (`ol`, default) or unordered (`ul`) list. */
  as?: "ol" | "ul" | undefined;
  dragFrom?: DragFrom | undefined;
  /** `start`/`end` places the built-in handle; `custom` lets `renderItem` place `state.handle`. */
  handlePlacement?: "start" | "end" | "custom" | undefined;
  disabled?: boolean | undefined;
  isItemDisabled?: ((item: T) => boolean) | undefined;
  /** Shown instead of the list when `items` is empty. */
  empty?: ReactNode | undefined;
  messages?: Partial<SortableMessages> | undefined;
  itemClassName?: string | undefined;
  onDragStart?: ((id: string) => void) | undefined;
  onDragCancel?: ((id: string) => void) | undefined;
}

/** A reorderable list with pointer, touch and keyboard support. Fully controlled. */
export function SortableList<T extends SortableEntity>({
  as: ListTag = "ol",
  className,
  disabled = false,
  dragFrom = "handle",
  empty,
  getItemLabel,
  handlePlacement = "start",
  isItemDisabled,
  itemClassName,
  items,
  label,
  messages: messagesProp,
  onDragCancel,
  onDragStart,
  onItemsChange,
  orientation = "vertical",
  renderItem,
  ...props
}: SortableListProps<T>) {
  const messages = useMemo(() => ({ ...defaultSortableMessages, ...messagesProp }), [messagesProp]);
  const axis = orientation === "vertical" ? "y" : orientation === "horizontal" ? "x" : "both";
  const controller = useSortableController({
    axis,
    component: "SortableList",
    disabled,
    getItemLabel,
    isItemDisabled,
    items,
    messages,
    onDragCancel,
    onDragStart,
    onItemsChange,
  });
  const strategy: SortingStrategy =
    orientation === "vertical"
      ? verticalListSortingStrategy
      : orientation === "horizontal"
        ? horizontalListSortingStrategy
        : rectSortingStrategy;

  return (
    <div
      ref={(element) => {
        controller.rootRef.current = element;
      }}
      className={cx("brand-sortable", className)}
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      data-dragging={controller.activeId !== null || undefined}
    >
      {items.length === 0 ? (
        <div className="brand-sortable__empty">{empty ?? "Nothing to show yet."}</div>
      ) : (
        <DndContext {...controller.contextProps}>
          <SortableContext items={controller.ids} strategy={strategy} disabled={disabled}>
            <ListTag {...props} aria-label={label ?? props["aria-label"]} className="brand-sortable__list">
              {items.map((item, index) => (
                <SortableListItem
                  key={item.id}
                  item={item}
                  index={index}
                  count={items.length}
                  label={getItemLabel(item)}
                  disabled={disabled || (isItemDisabled?.(item) ?? false)}
                  dragFrom={dragFrom}
                  handlePlacement={handlePlacement}
                  axis={axis}
                  messages={messages}
                  reducedMotion={controller.reducedMotion}
                  className={itemClassName}
                  moveBy={controller.moveBy}
                  renderItem={renderItem}
                />
              ))}
            </ListTag>
          </SortableContext>
        </DndContext>
      )}
      {controller.region}
    </div>
  );
}

interface SortableListItemProps<T extends SortableEntity> {
  item: T;
  index: number;
  count: number;
  label: string;
  disabled: boolean;
  dragFrom: DragFrom;
  handlePlacement: "start" | "end" | "custom";
  axis: "x" | "y" | "both";
  messages: SortableMessages;
  reducedMotion: boolean;
  className: string | undefined;
  moveBy: (id: string, direction: KeyboardMoveDirection) => void;
  renderItem: (item: T, state: SortableItemRenderState) => ReactNode;
}

function SortableListItem<T extends SortableEntity>({
  axis,
  className,
  count,
  disabled,
  dragFrom,
  handlePlacement,
  index,
  item,
  label,
  messages,
  moveBy,
  reducedMotion,
  renderItem,
}: SortableListItemProps<T>) {
  const binding = useSortableItem({
    id: item.id,
    label,
    disabled,
    dragFrom,
    axis,
    reducedMotion,
    handleLabel: messages.handleLabel(label),
    onKeyboardMove: (direction) => moveBy(item.id, direction),
  });
  const handle = <DragHandle handleProps={binding.handleProps} />;
  const state: SortableItemRenderState = {
    index,
    dragging: binding.isDragging,
    disabled,
    handleProps: binding.handleProps,
    handle,
    moveBackward: !disabled && index > 0 ? () => moveBy(item.id, -1) : undefined,
    moveForward: !disabled && index < count - 1 ? () => moveBy(item.id, 1) : undefined,
  };

  return (
    <li
      ref={binding.setNodeRef}
      style={binding.style}
      className={cx("brand-sortable__item", className)}
      data-dragging={binding.isDragging || undefined}
      data-disabled={disabled || undefined}
      data-drag-from={dragFrom}
      {...binding.itemListeners}
    >
      {handlePlacement === "start" ? handle : null}
      <div className="brand-sortable__content">{renderItem(item, state)}</div>
      {handlePlacement === "end" ? handle : null}
    </li>
  );
}
