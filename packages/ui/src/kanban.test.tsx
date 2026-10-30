import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KanbanBoard,
  locateKanbanCard,
  moveKanbanCard,
  type KanbanBoardProps,
  type KanbanColumn,
  type KanbanMove,
} from "./kanban";

if (typeof window.PointerEvent !== "function") {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    writable: true,
    value: class PointerEventForBaseUIKeyboardClick extends MouseEvent {},
  });
}

interface Card {
  id: string;
  title: string;
}

const board: Array<KanbanColumn<Card>> = [
  {
    id: "todo",
    title: "To do",
    items: [
      { id: "c1", title: "Write brief" },
      { id: "c2", title: "Book shoot" },
    ],
  },
  { id: "doing", title: "Doing", items: [{ id: "c3", title: "Edit video" }] },
  { id: "done", title: "Done", items: [] },
];

function Harness(
  props: Partial<KanbanBoardProps<Card>> & { onMove?: (columns: Array<KanbanColumn<Card>>, move: KanbanMove) => void },
) {
  const { onMove, columns: initial = board, ...rest } = props;
  const [columns, setColumns] = useState(initial);
  return (
    <KanbanBoard
      label="Production board"
      columns={columns}
      getItemLabel={(card) => card.title}
      renderCard={(card) => <strong>{card.title}</strong>}
      onColumnsChange={(next, move) => {
        onMove?.(next, move);
        setColumns(next);
      }}
      {...rest}
    />
  );
}

const announcer = () => document.querySelector("[data-drag-announcer]") as HTMLElement;
const column = (name: string) => screen.getByRole("region", { name });
const cardsIn = (name: string) =>
  within(column(name))
    .queryAllByRole("listitem")
    .map((item) => item.querySelector("strong")?.textContent);

/** Columns 300px apart, cards 60px tall: enough geometry for dnd-kit collisions in jsdom. */
function mockBoardRects(overlayFromFirstCard = false) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      // The drag overlay floats over the card it was lifted from (the first card of "To do" here).
      if (overlayFromFirstCard && (this.closest("[data-overlay]") || this.querySelector(":scope > [data-overlay]"))) {
        return { x: 0, y: 40, top: 40, left: 0, width: 280, height: 56, right: 280, bottom: 96, toJSON: () => ({}) } as DOMRect;
      }
      const section = this.closest("[data-column-id]");
      const columnIndex = section ? Array.from(section.parentElement?.children ?? []).indexOf(section) : 0;
      const card = this.closest("li");
      const cardIndex = card ? Array.from(card.parentElement?.children ?? []).indexOf(card) : -1;
      const left = columnIndex * 300;
      const top = card ? 40 + cardIndex * 60 : 0;
      const height = card ? 56 : 400;
      return { x: left, y: top, top, left, width: 280, height, right: left + 280, bottom: top + height, toJSON: () => ({}) } as DOMRect;
    });
}

// jsdom's pointer events lack isPrimary and pointerType, which the pointer sensor checks.
const pointer = (type: string, clientX: number, clientY: number) =>
  Object.assign(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX, clientY }), {
    isPrimary: true,
    pointerType: "mouse",
  });
const step = async (type: "pointermove" | "pointerup", clientX: number, clientY: number) => {
  await act(async () => {
    fireEvent(document, pointer(type, clientX, clientY));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("kanban helpers", () => {
  it("locates cards and moves them between and within columns without mutating input", () => {
    expect(locateKanbanCard(board, "c3")).toEqual({ columnIndex: 1, columnId: "doing", index: 0 });
    expect(locateKanbanCard(board, "nope")).toBeNull();

    const across = moveKanbanCard(board, "c1", "done", 0);
    expect(across?.move).toEqual({ itemId: "c1", fromColumnId: "todo", fromIndex: 0, toColumnId: "done", toIndex: 0 });
    expect(across?.columns[0]?.items.map((card) => card.id)).toEqual(["c2"]);
    expect(across?.columns[2]?.items.map((card) => card.id)).toEqual(["c1"]);
    expect(across?.columns[1]).toBe(board[1]);
    expect(board[0]?.items).toHaveLength(2);

    const within = moveKanbanCard(board, "c1", "todo", 5);
    expect(within?.move).toEqual({ itemId: "c1", fromColumnId: "todo", fromIndex: 0, toColumnId: "todo", toIndex: 1 });
    expect(moveKanbanCard(board, "c1", "todo", 0)).toBeNull();
    expect(moveKanbanCard(board, "c1", "missing", 0)).toBeNull();
  });
});

describe("KanbanBoard", () => {
  it("renders a labelled board of named column regions with counts and an empty drop target", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Production board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "To do" })).toBeInTheDocument();
    expect(within(column("To do")).getByText("2 cards")).toBeInTheDocument();
    expect(within(column("To do")).getByRole("list", { name: "To do" })).toBeInTheDocument();
    expect(within(column("Done")).getByText("No cards yet. Drop one here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag Write brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Write brief" })).toBeInTheDocument();
  });

  it("moves a card to another column from the Move menu with the exact move data", async () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Book shoot" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to Done" }));

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]?.[1]).toEqual({
      itemId: "c2",
      fromColumnId: "todo",
      fromIndex: 1,
      toColumnId: "done",
      toIndex: 0,
    });
    expect(cardsIn("To do")).toEqual(["Write brief"]);
    expect(cardsIn("Done")).toEqual(["Book shoot"]);
    expect(within(column("Done")).queryByText("No cards yet. Drop one here.")).not.toBeInTheDocument();
    expect(announcer()).toHaveTextContent("Book shoot moved to Done, position 1 of 1.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Drag Book shoot" })).toHaveFocus());
  });

  it("reorders within a column from the menu and disables impossible moves", async () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Write brief" }));
    expect(await screen.findByRole("menuitem", { name: "Move up" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Move down" }));
    expect(onMove.mock.calls[0]?.[1]).toMatchObject({ fromColumnId: "todo", toColumnId: "todo", fromIndex: 0, toIndex: 1 });
    expect(cardsIn("To do")).toEqual(["Book shoot", "Write brief"]);
  });

  it("moves with Alt+Arrow: Up/Down within a column, Left/Right across columns", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Drag Write brief" }), { key: "ArrowDown", altKey: true });
    expect(cardsIn("To do")).toEqual(["Book shoot", "Write brief"]);

    fireEvent.keyDown(screen.getByRole("button", { name: "Drag Write brief" }), { key: "ArrowRight", altKey: true });
    expect(onMove.mock.calls[1]?.[1]).toEqual({
      itemId: "c1",
      fromColumnId: "todo",
      fromIndex: 1,
      toColumnId: "doing",
      toIndex: 1,
    });
    expect(cardsIn("Doing")).toEqual(["Edit video", "Write brief"]);
  });

  it("skips locked columns and never drops into them", () => {
    const locked = board.map((entry) => (entry.id === "doing" ? { ...entry, disabled: true } : entry));
    const onMove = vi.fn();
    render(<Harness columns={locked} onMove={onMove} />);
    expect(screen.getByRole("button", { name: "Drag Edit video" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Drag Write brief" }), { key: "ArrowRight", altKey: true });
    expect(onMove.mock.calls[0]?.[1]).toMatchObject({ itemId: "c1", toColumnId: "done", toIndex: 0 });
  });

  it("lets the consumer veto moves with canMove and announces the refusal", async () => {
    const onMove = vi.fn();
    const canMove = vi.fn((move: KanbanMove) => move.toColumnId !== "done");
    render(<Harness onMove={onMove} canMove={canMove} />);

    fireEvent.click(screen.getByRole("button", { name: "Move Edit video" }));
    expect(await screen.findByRole("menuitem", { name: "Move to Done" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    fireEvent.keyDown(screen.getByRole("button", { name: "Drag Edit video" }), { key: "ArrowRight", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
    expect(announcer()).toHaveTextContent("Edit video cannot move to Done.");
    expect(canMove).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: "c3", toColumnId: "done" }),
      { id: "c3", title: "Edit video" },
    );
  });

  it("exposes moveTo and custom placement of the handle and menu", () => {
    const onMove = vi.fn();
    render(
      <Harness
        onMove={onMove}
        cardActions="custom"
        renderCard={(card, state) => (
          <div>
            <strong>{card.title}</strong>
            {state.handle}
            <button type="button" onClick={() => state.moveTo("done")}>
              Finish {card.title}
            </button>
          </div>
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: "Move Write brief" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Finish Edit video" }));
    expect(onMove.mock.calls[0]?.[1]).toMatchObject({ itemId: "c3", toColumnId: "done", toIndex: 0 });
  });

  it("keeps fields inside cards usable: typing Space or pressing in them never starts a drag", async () => {
    const onDragStart = vi.fn();
    render(
      <Harness
        onDragStart={onDragStart}
        renderCard={(card) => (
          <>
            <strong>{card.title}</strong>
            <input aria-label={`${card.title} note`} />
          </>
        )}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Write brief note" });
    fireEvent.pointerDown(field, { button: 0, isPrimary: true });
    fireEvent.keyDown(field, { code: "Space", key: " " });
    fireEvent.keyDown(field, { code: "Enter", key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("supports a keyboard drag across columns and reports one final move", async () => {
    mockBoardRects();
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Drag Write brief" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Write brief in To do, position 1 of 2."));
    for (const code of ["ArrowRight", "Space"]) {
      await act(async () => {
        fireEvent.keyDown(document, { code, key: code === "Space" ? " " : code });
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    }
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]?.[1]).toMatchObject({ itemId: "c1", fromColumnId: "todo", fromIndex: 0, toColumnId: "doing" });
    expect(cardsIn("To do")).toEqual(["Book shoot"]);
    expect(cardsIn("Doing")).toContain("Write brief");
    expect(announcer()).toHaveTextContent(/Dropped Write brief in Doing/);
  });

  // Grab points and release points (x 440 is inside "Doing"; "Edit video" spans y 40-96 there):
  // released in the empty space under it, and released over its lower half while the card's top
  // edge is already past that card's middle.
  it.each([
    ["in the empty space under it", 68, 170],
    ["over its lower half", 44, 90],
  ])("pointer drop below the last card of another column, %s, lands below it", async (_, grabY, dropY) => {
    mockBoardRects(true);
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const card = screen.getByText("Write brief").closest("li") as HTMLElement;
    fireEvent(card, pointer("pointerdown", 140, grabY));
    await step("pointermove", 150, grabY + 2);
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Write brief"));
    await step("pointermove", 440, dropY);
    await step("pointermove", 440, dropY + 1);
    expect(cardsIn("Doing")).toEqual(["Edit video", "Write brief"]);
    await step("pointerup", 440, dropY + 1);
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]?.[1]).toEqual({
      itemId: "c1",
      fromColumnId: "todo",
      fromIndex: 0,
      toColumnId: "doing",
      toIndex: 1,
    });
    expect(cardsIn("Doing")).toEqual(["Edit video", "Write brief"]);
    expect(announcer()).toHaveTextContent("Dropped Write brief in Doing, position 2 of 2.");
  });

  it("after a pointer places a card below another column's last card, moving back above its middle drops it above", async () => {
    mockBoardRects(true);
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const card = screen.getByText("Write brief").closest("li") as HTMLElement;
    fireEvent(card, pointer("pointerdown", 140, 44));
    await step("pointermove", 150, 46);
    await step("pointermove", 440, 90);
    expect(cardsIn("Doing")).toEqual(["Edit video", "Write brief"]);
    await step("pointermove", 440, 50);
    await step("pointerup", 440, 50);
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]?.[1]).toMatchObject({ itemId: "c1", toColumnId: "doing", toIndex: 0 });
    expect(cardsIn("Doing")).toEqual(["Write brief", "Edit video"]);
  });

  it("Escape during a keyboard drag puts the card back and calls nothing", async () => {
    const onMove = vi.fn();
    const onDragCancel = vi.fn();
    mockBoardRects();
    render(<Harness onMove={onMove} onDragCancel={onDragCancel} />);
    const handle = screen.getByRole("button", { name: "Drag Book shoot" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Enter", key: "Enter" });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Book shoot"));
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    await waitFor(() => expect(onDragCancel).toHaveBeenCalledWith("c2"));
    expect(onMove).not.toHaveBeenCalled();
    expect(cardsIn("To do")).toEqual(["Write brief", "Book shoot"]);
    expect(announcer()).toHaveTextContent("Move cancelled. Book shoot is back in To do, position 2 of 2.");
  });

  it.each([
    ["the board", { disabled: true }],
    ["the source column", { columns: board.map((entry) => (entry.id === "todo" ? { ...entry, disabled: true } : entry)) }],
    ["the card", { isItemDisabled: (card: Card) => card.id === "c1" }],
  ] as const)("refuses a drop when %s is disabled during the drag", async (_, lock) => {
    mockBoardRects();
    const onMove = vi.fn();
    const Locking = ({ locked }: { locked: boolean }) => {
      const [columns, setColumns] = useState(board);
      const lockedProps: Partial<KanbanBoardProps<Card>> = locked ? lock : {};
      return (
        <KanbanBoard
          label="Production board"
          getItemLabel={(card) => card.title}
          renderCard={(card) => <strong>{card.title}</strong>}
          onColumnsChange={(next, move) => {
            onMove(next, move);
            setColumns(next);
          }}
          {...lockedProps}
          columns={lockedProps.columns ?? columns}
        />
      );
    };
    const { rerender } = render(<Locking locked={false} />);
    const handle = screen.getByRole("button", { name: "Drag Write brief" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Write brief"));
    await act(async () => {
      fireEvent.keyDown(document, { code: "ArrowRight", key: "ArrowRight" });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    rerender(<Locking locked />);
    await act(async () => {
      fireEvent.keyDown(document, { code: "Space", key: " " });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(cardsIn("To do")).toEqual(["Write brief", "Book shoot"]);
  });

  it("renders custom empty content, headers and footers", () => {
    render(
      <Harness
        headingLevel={2}
        columnEmpty={(entry) => `Nothing in ${entry.label ?? String(entry.title)}`}
        renderColumnFooter={(entry) => <button type="button">Add to {String(entry.title)}</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Done" })).toBeInTheDocument();
    expect(screen.getByText("Nothing in Done")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to Doing" })).toBeInTheDocument();
  });

  it("validates ids across the whole board", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const clash = [board[0]!, { id: "doing", title: "Doing", items: [{ id: "c1", title: "Copy" }] }];
    expect(() => render(<Harness columns={clash} />)).toThrow(/KanbanBoard found the duplicate id "c1"/);
    expect(() => render(<Harness columns={[board[0]!, board[0]!]} />)).toThrow(/KanbanBoard columns found the duplicate id "todo"/);
    const reserved = [{ ...board[0]!, items: [{ id: "\u0000kanban-column:done", title: "Spoof" }] }, board[2]!];
    expect(() => render(<Harness columns={reserved} />)).toThrow(/reserved/);
  });
});
