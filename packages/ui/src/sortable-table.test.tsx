import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SortableMove } from "./drag-drop";
import { SortableTable, type SortableTableColumn, type SortableTableProps } from "./sortable-table";

interface Lead {
  id: string;
  name: string;
  stage: string;
  value: number;
  owner?: string;
}

const leads: Lead[] = [
  { id: "l1", name: "Acme", stage: "New", value: 1200 },
  { id: "l2", name: "Globex", stage: "Qualified", value: 800 },
  { id: "l3", name: "Initech", stage: "Won", value: 4500 },
];

const columns: Array<SortableTableColumn<Lead>> = [
  { id: "name", header: "Company", rowHeader: true },
  { id: "stage", header: "Stage" },
  { id: "value", header: "Value", align: "end", cell: (lead) => `£${lead.value.toLocaleString("en-GB")}` },
];

function Harness(props: Partial<SortableTableProps<Lead>> & { onMove?: (rows: Lead[], move: SortableMove) => void }) {
  const { onMove, items: initial = leads, ...rest } = props;
  const [rows, setRows] = useState(initial);
  return (
    <SortableTable
      caption="Pipeline priority"
      items={rows}
      columns={columns}
      getItemLabel={(lead) => lead.name}
      onItemsChange={(next, move) => {
        onMove?.(next, move);
        setRows(next);
      }}
      {...rest}
    />
  );
}

const announcer = () => document.querySelector("[data-drag-announcer]") as HTMLElement;
const rowNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryByRole("rowheader")?.textContent);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SortableTable", () => {
  it("renders a real table: caption, column headers, row headers and custom cells", () => {
    render(<Harness />);
    const table = screen.getByRole("table", { name: "Pipeline priority" });
    expect(table.tagName).toBe("TABLE");
    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Reorder", "Company", "Stage", "Value"]);
    expect(within(table).getByRole("rowheader", { name: "Acme" })).toHaveAttribute("scope", "row");
    expect(within(table).getByRole("cell", { name: "£4,500" })).toHaveAttribute("data-align", "end");
    expect(within(table).getByRole("cell", { name: "Qualified" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Reorder Globex" })).toBeInTheDocument();
  });

  it("reorders rows from the keyboard and reports the move", async () => {
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Reorder Initech" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowUp", altKey: true });
    expect(onMove.mock.calls[0]?.[1]).toEqual({ id: "l3", fromIndex: 2, toIndex: 1 });
    expect(rowNames()).toEqual(["Acme", "Initech", "Globex"]);
    expect(announcer()).toHaveTextContent("Initech moved to position 2 of 3.");
    await waitFor(() => expect(screen.getByRole("button", { name: "Reorder Initech" })).toHaveFocus());
  });

  it("supports a keyboard drag of a table row", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const row = this.closest("tr");
      const index = row ? Array.from(row.parentElement?.children ?? []).indexOf(row) : 0;
      const top = index * 40;
      return { x: 0, y: top, top, left: 0, width: 600, height: 40, right: 600, bottom: top + 40, toJSON: () => ({}) } as DOMRect;
    });
    const onMove = vi.fn();
    render(<Harness onMove={onMove} />);
    const handle = screen.getByRole("button", { name: "Reorder Acme" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Acme"));
    for (const code of ["ArrowDown", "ArrowDown", "Space"]) {
      await act(async () => {
        fireEvent.keyDown(document, { code, key: code === "Space" ? " " : code });
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
    await waitFor(() => expect(onMove).toHaveBeenCalledTimes(1));
    expect(onMove.mock.calls[0]?.[1]).toEqual({ id: "l1", fromIndex: 0, toIndex: 2 });
    expect(rowNames()).toEqual(["Globex", "Initech", "Acme"]);
  });

  it("refuses a drop if the row becomes locked while it is being dragged", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const row = this.closest("tr");
      const index = row ? Array.from(row.parentElement?.children ?? []).indexOf(row) : 0;
      const top = index * 40;
      return { x: 0, y: top, top, left: 0, width: 600, height: 40, right: 600, bottom: top + 40, toJSON: () => ({}) } as DOMRect;
    });
    const onMove = vi.fn();
    const onDragCancel = vi.fn();
    const { rerender } = render(<Harness onMove={onMove} onDragCancel={onDragCancel} />);
    const handle = screen.getByRole("button", { name: "Reorder Acme" });
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(announcer()).toHaveTextContent("Picked up Acme"));
    await act(async () => {
      fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    rerender(<Harness onMove={onMove} onDragCancel={onDragCancel} isRowDisabled={(lead) => lead.id === "l1"} />);
    await act(async () => {
      fireEvent.keyDown(document, { code: "Space", key: " " });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(onDragCancel).toHaveBeenCalledWith("l1");
    expect(rowNames()).toEqual(["Acme", "Globex", "Initech"]);
    expect(announcer()).toHaveTextContent("cancelled");
  });

  it("falls back to the raw value when a column has no cell renderer", () => {
    render(
      <Harness
        columns={[
          { id: "name", header: "Company" },
          { id: "owner", header: "Owner" },
        ]}
        items={[{ id: "x", name: "Umbrella", stage: "New", value: 1, owner: "Sam" }]}
      />,
    );
    expect(screen.getByRole("cell", { name: "Sam" })).toBeInTheDocument();
  });

  it("can put the handle at the end or let a column place it", () => {
    const { rerender } = render(<Harness handlePlacement="end" />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers.at(-1)).toBe("Reorder");

    rerender(
      <Harness
        handlePlacement="custom"
        columns={[
          { id: "name", header: "Company", rowHeader: true },
          { id: "move", header: "Move", cell: (_lead, state) => state.handle },
        ]}
      />,
    );
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Company", "Move"]);
    expect(screen.getByRole("button", { name: "Reorder Acme" }).closest("td")).not.toBeNull();
  });

  it("renders the empty state in one full-width cell", () => {
    render(<Harness items={[]} empty="No leads match these filters." />);
    const cell = screen.getByRole("cell", { name: "No leads match these filters." });
    expect(cell).toHaveAttribute("colspan", "4");
  });

  it("locks disabled rows and the whole table when disabled", () => {
    const onMove = vi.fn();
    const { rerender } = render(<Harness onMove={onMove} isRowDisabled={(lead) => lead.stage === "Won"} />);
    expect(screen.getByRole("button", { name: "Reorder Initech" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reorder Acme" })).toBeEnabled();

    rerender(<Harness onMove={onMove} disabled />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Acme" }), { key: "ArrowDown", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
  });

  it("rejects duplicate row or column ids", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Harness items={[leads[0]!, leads[0]!]} />)).toThrow(/SortableTable found the duplicate id "l1"/);
    expect(() =>
      render(
        <Harness
          columns={[
            { id: "name", header: "A" },
            { id: "name", header: "B" },
          ]}
        />,
      ),
    ).toThrow(/column ids must be unique/);
  });
});
