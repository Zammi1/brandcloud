"use client";

import { DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, type ReactNode, type TableHTMLAttributes } from "react";
import {
  DragHandle,
  defaultSortableMessages,
  useSortableController,
  useSortableItem,
  type DragFrom,
  type KeyboardMoveDirection,
  type SortableEntity,
  type SortableHandleProps,
  type SortableMessages,
  type SortableMove,
} from "./drag-drop";
import { cx } from "./utils";

export interface SortableTableCellState {
  index: number;
  dragging: boolean;
  disabled: boolean;
  handleProps: SortableHandleProps;
  handle: ReactNode;
}

export interface SortableTableColumn<T> {
  /** Stable, unique column key. */
  id: string;
  header: ReactNode;
  /** Cell content. Defaults to `String(row[id])` when the row has that key. */
  cell?: ((row: T, state: SortableTableCellState) => ReactNode) | undefined;
  /** Renders the cell as `<th scope="row">`. Use on the column that names the row. */
  rowHeader?: boolean | undefined;
  align?: "start" | "center" | "end" | undefined;
  /** Any CSS length, applied to the column header. */
  width?: string | undefined;
  className?: string | undefined;
  headerClassName?: string | undefined;
}

export interface SortableTableProps<T extends SortableEntity>
  extends Omit<TableHTMLAttributes<HTMLTableElement>, "children" | "onChange" | "onDragStart"> {
  /** Controlled row order. Persist it yourself in `onItemsChange`. */
  items: readonly T[];
  onItemsChange: (items: T[], move: SortableMove) => void;
  columns: ReadonlyArray<SortableTableColumn<T>>;
  /** Plain-text row name for announcements and handle labels. */
  getItemLabel: (item: T) => string;
  /** Table caption. Strongly recommended; it names the table for assistive technology. */
  caption?: ReactNode | undefined;
  /** Keeps the caption for screen readers but hides it visually. */
  captionHidden?: boolean | undefined;
  /** Shown in a full-width cell when there are no rows. */
  empty?: ReactNode | undefined;
  disabled?: boolean | undefined;
  isRowDisabled?: ((item: T) => boolean) | undefined;
  dragFrom?: DragFrom | undefined;
  /** Where the built-in handle column goes. `custom` lets a column cell place `state.handle`. */
  handlePlacement?: "start" | "end" | "custom" | undefined;
  /** Visually hidden header of the handle column. */
  handleColumnLabel?: string | undefined;
  messages?: Partial<SortableMessages> | undefined;
  rowClassName?: string | ((item: T, index: number) => string | undefined) | undefined;
  onDragStart?: ((id: string) => void) | undefined;
  onDragCancel?: ((id: string) => void) | undefined;
}

/** A semantic `<table>` whose rows can be reordered by pointer, touch or keyboard. Fully controlled. */
export function SortableTable<T extends SortableEntity>({
  caption,
  captionHidden = false,
  className,
  columns,
  disabled = false,
  dragFrom = "handle",
  empty,
  getItemLabel,
  handleColumnLabel = "Reorder",
  handlePlacement = "start",
  isRowDisabled,
  items,
  messages: messagesProp,
  onDragCancel,
  onDragStart,
  onItemsChange,
  rowClassName,
  ...props
}: SortableTableProps<T>) {
  const messages = useMemo(() => ({ ...defaultSortableMessages, ...messagesProp }), [messagesProp]);
  validateColumnIds(columns);
  const controller = useSortableController({
    axis: "y",
    component: "SortableTable",
    disabled,
    getItemLabel,
    isItemDisabled: isRowDisabled,
    items,
    messages,
    onDragCancel,
    onDragStart,
    onItemsChange,
  });
  const handleHeader = (
    <th scope="col" className="brand-sortable-table__handle-cell">
      <span className="brand-visually-hidden">{handleColumnLabel}</span>
    </th>
  );
  const columnCount = columns.length + (handlePlacement === "custom" ? 0 : 1);

  return (
    <div
      ref={(element) => {
        controller.rootRef.current = element;
      }}
      className={cx("brand-sortable-table", className)}
      data-disabled={disabled || undefined}
      data-dragging={controller.activeId !== null || undefined}
    >
      <DndContext {...controller.contextProps}>
        <table {...props} className="brand-sortable-table__table">
          {caption !== undefined ? (
            <caption className={captionHidden ? "brand-visually-hidden" : "brand-sortable-table__caption"}>
              {caption}
            </caption>
          ) : null}
          <thead>
            <tr>
              {handlePlacement === "start" ? handleHeader : null}
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={column.headerClassName}
                  data-align={column.align}
                  style={column.width ? { inlineSize: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
              {handlePlacement === "end" ? handleHeader : null}
            </tr>
          </thead>
          <SortableContext items={controller.ids} strategy={verticalListSortingStrategy} disabled={disabled}>
            <tbody>
              {items.length === 0 ? (
                <tr className="brand-sortable-table__empty-row">
                  <td colSpan={columnCount} className="brand-sortable-table__empty">
                    {empty ?? "No rows yet."}
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <SortableTableRow
                    key={row.id}
                    row={row}
                    index={index}
                    columns={columns}
                    label={getItemLabel(row)}
                    disabled={disabled || (isRowDisabled?.(row) ?? false)}
                    dragFrom={dragFrom}
                    handlePlacement={handlePlacement}
                    messages={messages}
                    reducedMotion={controller.reducedMotion}
                    className={typeof rowClassName === "function" ? rowClassName(row, index) : rowClassName}
                    moveBy={controller.moveBy}
                  />
                ))
              )}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
      {controller.region}
    </div>
  );
}

function validateColumnIds(columns: ReadonlyArray<{ id: string }>) {
  const seen = new Set<string>();
  for (const column of columns) {
    if (!column.id || seen.has(column.id)) {
      throw new Error(`@brandcloud/ui: SortableTable column ids must be unique and non-empty ("${column.id}").`);
    }
    seen.add(column.id);
  }
}

interface SortableTableRowProps<T extends SortableEntity> {
  row: T;
  index: number;
  columns: ReadonlyArray<SortableTableColumn<T>>;
  label: string;
  disabled: boolean;
  dragFrom: DragFrom;
  handlePlacement: "start" | "end" | "custom";
  messages: SortableMessages;
  reducedMotion: boolean;
  className: string | undefined;
  moveBy: (id: string, direction: KeyboardMoveDirection) => void;
}

function SortableTableRow<T extends SortableEntity>({
  className,
  columns,
  disabled,
  dragFrom,
  handlePlacement,
  index,
  label,
  messages,
  moveBy,
  reducedMotion,
  row,
}: SortableTableRowProps<T>) {
  const binding = useSortableItem({
    id: row.id,
    label,
    disabled,
    dragFrom,
    reducedMotion,
    handleLabel: messages.handleLabel(label),
    onKeyboardMove: (direction) => moveBy(row.id, direction),
  });
  const handle = <DragHandle handleProps={binding.handleProps} />;
  const state: SortableTableCellState = {
    index,
    dragging: binding.isDragging,
    disabled,
    handleProps: binding.handleProps,
    handle,
  };
  const handleCell = <td className="brand-sortable-table__handle-cell">{handle}</td>;

  return (
    <tr
      ref={binding.setNodeRef}
      style={binding.style}
      className={cx("brand-sortable-table__row", className)}
      data-dragging={binding.isDragging || undefined}
      data-disabled={disabled || undefined}
      data-drag-from={dragFrom}
      {...binding.itemListeners}
    >
      {handlePlacement === "start" ? handleCell : null}
      {columns.map((column) => {
        const content = column.cell
          ? column.cell(row, state)
          : formatValue((row as Record<string, unknown>)[column.id]);
        const Cell = column.rowHeader ? "th" : "td";
        return (
          <Cell
            key={column.id}
            scope={column.rowHeader ? "row" : undefined}
            className={column.className}
            data-align={column.align}
          >
            {content}
          </Cell>
        );
      })}
      {handlePlacement === "end" ? handleCell : null}
    </tr>
  );
}

function formatValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
