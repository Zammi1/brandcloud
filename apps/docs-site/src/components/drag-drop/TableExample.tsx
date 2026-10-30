/** SortableTable: a launch checklist whose rows can be reordered, renamed, added and removed. */
import { useState } from "react";
import { Button } from "@brandcloud/ui/button";
import { SortableTable, type SortableTableColumn } from "@brandcloud/ui/sortable-table";
import { AddForm, RenameField, focusLater } from "./AddForm";
import { ExampleBar } from "./ExampleBar";
import { isRecordList } from "./storage";
import { newId, useSavedState } from "./useSavedState";

type Task = { id: string; task: string; owner: string; due: string };

const seed: Task[] = [
  { id: "t-copy", task: "Final copy approved", owner: "Priya", due: "Mon" },
  { id: "t-photos", task: "Workshop photos picked", owner: "Owen", due: "Tue" },
  { id: "t-contrast", task: "Contrast check passed", owner: "Priya", due: "Wed" },
  { id: "t-forms", task: "Enquiry form tested", owner: "Sam", due: "Thu" },
  { id: "t-launch", task: "Domain switched over", owner: "Owen", due: "Fri" },
];
const isTasks = isRecordList<Task>(["task", "owner", "due"]);

export default function TableExample() {
  const state = useSavedState("table", seed, isTasks);
  const [editing, setEditing] = useState<string | null>(null);
  const stopEditing = (id: string) => {
    setEditing(null);
    focusLater(`[data-rename="${id}"]`);
  };
  // The table announces moves itself, so the move note is visible but not a live region.
  const [lastMove, setLastMove] = useState("");
  const rows = state.value;

  const columns: SortableTableColumn<Task>[] = [
    { id: "position", header: "#", width: "3rem", cell: (_row, s) => <span className="ddg-num">{s.index + 1}</span> },
    {
      id: "task",
      header: "Task",
      rowHeader: true,
      cell: (row) =>
        editing === row.id ? (
          <RenameField
            label={`Rename ${row.task}`}
            initial={row.task}
            onSave={(text) => {
              state.update(rows.map((r) => (r.id === row.id ? { ...r, task: text } : r)));
              stopEditing(row.id);
              state.setStatus(`Renamed to ${text}. Not saved yet.`);
            }}
            onCancel={() => stopEditing(row.id)}
          />
        ) : (
          row.task
        ),
    },
    { id: "owner", header: "Owner" },
    { id: "due", header: "Due" },
    {
      id: "actions",
      header: <span className="ddg-hidden">Actions</span>,
      align: "end",
      cell: (row) => (
        <span className="ddg-row-actions">
          <Button size="sm" tone="neutral" appearance="ghost" aria-label={`Rename ${row.task}`} data-rename={row.id} onClick={() => setEditing(row.id)} disabled={editing === row.id}>
            Rename
          </Button>
          <Button
            size="sm"
            tone="neutral"
            appearance="ghost"
            aria-label={`Remove ${row.task}`}
            onClick={() => {
              state.update(rows.filter((r) => r.id !== row.id));
              state.setStatus(`Removed ${row.task}. Not saved yet.`);
            }}
          >
            Remove
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="ddg-example">
      <ExampleBar state={state} />
      <div className="ddg-scroll" role="region" aria-label="Launch checklist, scrolls sideways on small screens" tabIndex={0}>
        <SortableTable
          caption="Launch checklist, in the order the team will do it"
          items={rows}
          columns={columns}
          getItemLabel={(row) => row.task}
          onItemsChange={(next, move) => {
            state.update(next);
            const moved = next[move.toIndex];
            setLastMove(`Last move: ${moved?.task ?? "row"}, row ${move.fromIndex + 1} to row ${move.toIndex + 1}.`);
          }}
          empty="No tasks. Add one below or reset the example."
        />
      </div>
      {lastMove && <p className="ddg-note">{lastMove}</p>}
      <AddForm
        label="New task"
        placeholder="Redirects checked"
        action="Add task"
        onAdd={(text) => {
          state.update([...rows, { id: newId("t"), task: text, owner: "You", due: "Next week" }]);
          state.setStatus(`Added ${text} at the end. Not saved yet.`);
        }}
      />
    </div>
  );
}
