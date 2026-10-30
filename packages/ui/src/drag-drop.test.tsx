import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InteractiveSafePointerSensor,
  SortableList,
  isInteractiveDragTarget,
  moveItem,
  validateSortableIds,
  type SortableListProps,
  type SortableMove,
} from "./drag-drop";

if (typeof window.PointerEvent !== "function") {
  Object.defineProperty(window, "PointerEvent", {
    configurable: true,
    writable: true,
    value: class PointerEventForTests extends MouseEvent {
      pointerId = 1;
      pointerType = "mouse";
      isPrimary = true;
    },
  });
}

interface Task {
  id: string;
  name: string;
}

const tasks: Task[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
];

function Harness(
  props: Partial<SortableListProps<Task>> & { initial?: Task[]; onMove?: (items: Task[], move: SortableMove) => void },
) {
  const { initial = tasks, onMove, ...rest } = props;
  const [items, setItems] = useState(initial);
  return (
    <SortableList
      label="Tasks"
      items={items}
      getItemLabel={(task) => task.name}
      renderItem={(task) => <span>{task.name}</span>}
      onItemsChange={(next, move) => {
        onMove?.(next, move);
        setItems(next);
      }}
      {...rest}
    />
  );
}

const announcer = () => document.querySelector("[data-drag-announcer]") as HTMLElement;
const order = () => screen.getAllByRole("listitem").map((item) => item.textContent);

/** Gives each list item a real-looking rectangle so dnd-kit can measure and collide in jsdom. */
function mockRowRects(height = 40) {
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const item = this.closest("li");
    const index = item ? Array.from(item.parentElement?.children ?? []).indexOf(item) : 0;
    const top = index * height;
    return { x: 0, y: top, top, left: 0, width: 300, height, right: 300, bottom: top + height, toJSON: () => ({}) } as DOMRect;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drag and drop helpers", () => {
  it("moveItem returns a new array and ignores out-of-range moves", () => {
    const source = ["a", "b", "c", "d"];
    expect(moveItem(source, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(source, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(source, 1, 9)).toEqual(source);
    expect(moveItem(source, 0, 2)).not.toBe(source);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });

  it("validateSortableIds rejects empty, missing and duplicate ids", () => {
    expect(() => validateSortableIds(["a", "b"])).not.toThrow();
    expect(() => validateSortableIds(["a", ""], "Thing")).toThrow(/Thing needs a non-empty string `id`.*index 1/);
    expect(() => validateSortableIds(["a", undefined])).toThrow(/non-empty/);
    expect(() => validateSortableIds(["a", "b", "a"])).toThrow(/duplicate id "a"/);
  });

  it("treats fields, buttons, links and [data-no-drag] as interactive, but never the handle", () => {
    const host = document.createElement("div");
    host.innerHTML = `
      <div id="plain"><span id="text">Card</span></div>
      <input id="field" />
      <a id="link" href="/x">Link</a>
      <div data-no-drag><span id="opt-out">Chart</span></div>
      <button data-drag-handle><svg><circle id="grip" /></svg></button>`;
    document.body.append(host);
    const get = (id: string) => host.querySelector(`#${id}`);
    expect(isInteractiveDragTarget(get("text"))).toBe(false);
    expect(isInteractiveDragTarget(get("field"))).toBe(true);
    expect(isInteractiveDragTarget(get("link"))).toBe(true);
    expect(isInteractiveDragTarget(get("opt-out"))).toBe(true);
    expect(isInteractiveDragTarget(get("grip"))).toBe(false);
    expect(isInteractiveDragTarget(null)).toBe(false);
    host.remove();
  });

  it("the pointer sensor refuses interactive targets and leaves non-handle touches to the touch sensor", () => {
    const activate = InteractiveSafePointerSensor.activators[0]!.handler;
    const input = document.createElement("input");
    const plain = document.createElement("div");
    const handle = document.createElement("button");
    handle.setAttribute("data-drag-handle", "");
    const event = (target: Element, pointerType = "mouse") =>
      ({ nativeEvent: { isPrimary: true, button: 0, pointerType, target } }) as never;
    expect(activate(event(input), {})).toBe(false);
    expect(activate(event(plain), {})).toBe(true);
    expect(activate(event(plain, "touch"), {})).toBe(false);
    expect(activate(event(handle, "touch"), {})).toBe(true);
  });
});

describe("SortableList", () => {
  it("renders a labelled ordered list with one labelled handle per item", () => {
    render(<Harness />);
    const list = screen.getByRole("list", { name: "Tasks" });
    expect(list.tagName).toBe("OL");
    expect(order()).toEqual(["Alpha", "Bravo", "Charlie"]);
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    expect(handle).toHaveAttribute("aria-roledescription", "drag handle");
    const instructions = document.getElementById(handle.getAttribute("aria-describedby") ?? "");
    expect(instructions?.textContent).toMatch(/press Space or Enter/);
  });

  it("moves with Alt+Arrow, reports the move, announces it and keeps focus on the handle", async () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowDown", altKey: true });

    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]?.[1]).toEqual({ id: "a", fromIndex: 0, toIndex: 1 });
    expect(order()).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(announcer()).toHaveTextContent("Alpha moved to position 2 of 3.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Reorder Alpha" })).toHaveFocus());
  });

  it("does not move past the ends but still tells the user where the item is", () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Alpha" }), { key: "ArrowUp", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
    expect(announcer()).toHaveTextContent("Alpha moved to position 1 of 3.");
  });

  it("exposes moveBackward/moveForward so items can render their own move buttons", () => {
    const onMove = vi.fn();
    render(
      <Harness
        onMove={onMove}
        renderItem={(task, state) => (
          <>
            {task.name}
            <button type="button" disabled={!state.moveForward} onClick={state.moveForward}>
              Down {task.name}
            </button>
          </>
        )}
      />,
    );
    expect(screen.getByRole("button", { name: "Down Charlie" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Down Bravo" }));
    expect(onMove.mock.calls[0]?.[1]).toEqual({ id: "b", fromIndex: 1, toIndex: 2 });
  });

  it("is fully controlled: nothing moves unless the consumer applies the change", () => {
    const onItemsChange = vi.fn();
    render(
      <SortableList
        label="Tasks"
        items={tasks}
        getItemLabel={(task) => task.name}
        renderItem={(task) => task.name}
        onItemsChange={onItemsChange}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Alpha" }), { key: "ArrowDown", altKey: true });
    expect(onItemsChange).toHaveBeenCalledWith(
      [tasks[1], tasks[0], tasks[2]],
      { id: "a", fromIndex: 0, toIndex: 1 },
    );
    expect(order()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("honours disabled lists and disabled items", () => {
    const onMove = vi.fn();
    const { rerender } = render(<Harness onMove={onMove} disabled />);
    for (const handle of screen.getAllByRole("button")) expect(handle).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Alpha" }), { key: "ArrowDown", altKey: true });
    expect(onMove).not.toHaveBeenCalled();

    rerender(<Harness onMove={onMove} isItemDisabled={(task) => task.id === "b"} />);
    expect(screen.getByRole("button", { name: "Reorder Bravo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reorder Alpha" })).toBeEnabled();
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute("data-disabled", "true");
  });

  it("shows the empty state instead of an empty list", () => {
    render(<Harness initial={[]} empty={<p>No tasks yet</p>} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("throws on duplicate ids instead of silently moving the wrong record", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Harness initial={[tasks[0]!, { id: "a", name: "Again" }]} />)).toThrow(/duplicate id "a"/);
  });

  it("supports a keyboard drag: Space picks up, arrows move, Space drops", async () => {
    mockRowRects();
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    handle.focus();

    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Alpha. Position 1 of 3."));
    await act(async () => {
      fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    await act(async () => {
      fireEvent.keyDown(document, { code: "Space", key: " " });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]?.[1]).toEqual({ id: "a", fromIndex: 0, toIndex: 1 });
    expect(order()).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(announcer()).toHaveTextContent("Dropped Alpha at position 2 of 3.");
  });

  it.each([
    ["the list", { disabled: true }],
    ["the item", { isItemDisabled: (task: Task) => task.id === "a" }],
  ] as const)("refuses a drop when %s is disabled during the drag", async (_, lock) => {
    mockRowRects();
    const onMove = vi.fn();
    const { rerender } = render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Reorder Alpha" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Alpha"));
    await act(async () => {
      fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    rerender(<Harness onMove={onMove} {...lock} />);
    await act(async () => {
      fireEvent.keyDown(document, { code: "Space", key: " " });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(order()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(announcer()).not.toHaveTextContent("Dropped");
  });

  it("Escape cancels a keyboard drag without calling onItemsChange", async () => {
    mockRowRects();
    const onMove = vi.fn();
    const onDragCancel = vi.fn();
    render(<Harness onMove={onMove} onDragCancel={onDragCancel} />);
    const handle = screen.getByRole("button", { name: "Reorder Bravo" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Enter", key: "Enter" });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Bravo"));
    await act(async () => {
      fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });

    await waitFor(() => expect(onDragCancel).toHaveBeenCalledWith("b"));
    expect(onMove).not.toHaveBeenCalled();
    expect(order()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(announcer()).toHaveTextContent("Move cancelled. Bravo is back at position 2 of 3.");
  });

  it("with dragFrom=item, a pointer press on a field inside the item never starts a drag", async () => {
    mockRowRects();
    const onDragStart = vi.fn();
    render(
      <Harness
        dragFrom="item"
        onDragStart={onDragStart}
        renderItem={(task) => (
          <label>
            {task.name} note <input aria-label={`${task.name} note`} />
          </label>
        )}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Alpha note" });
    fireEvent.pointerDown(field, { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(document, { clientX: 10, clientY: 60 });
    fireEvent.pointerUp(document);
    expect(onDragStart).not.toHaveBeenCalled();

    // Typing Space in the field must not pick the item up either.
    fireEvent.keyDown(field, { code: "Space", key: " " });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onDragStart).not.toHaveBeenCalled();
  });
});
