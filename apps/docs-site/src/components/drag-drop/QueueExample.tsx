/**
 * SortableList with a custom handle: a support queue where each row also has Move up and Move down
 * buttons from the render state, so nobody has to drag to change the order.
 */
import { useState } from "react";
import { Button } from "@brandcloud/ui/button";
import { SortableList } from "@brandcloud/ui/drag-drop";
import { AddForm } from "./AddForm";
import { ExampleBar } from "./ExampleBar";
import { isRecordList } from "./storage";
import { newId, useSavedState } from "./useSavedState";

type Ticket = { id: string; title: string; customer: string };

const seed: Ticket[] = [
  { id: "q-brakes", title: "Brakes squeal after service", customer: "Hollins Road" },
  { id: "q-invoice", title: "Invoice needs a company name", customer: "Merewick Couriers" },
  { id: "q-booking", title: "Move Saturday booking to Monday", customer: "A. Patel" },
  { id: "q-quote", title: "Quote for a fleet of six", customer: "Cliffside Hotel" },
];
const isTickets = isRecordList<Ticket>(["title", "customer"]);

export default function QueueExample() {
  const state = useSavedState("queue", seed, isTickets);
  const [lastMove, setLastMove] = useState("");
  const tickets = state.value;

  return (
    <div className="ddg-example">
      <ExampleBar state={state} />
      <SortableList
        label="Support queue, first is handled next"
        className="ddg-queue"
        items={tickets}
        getItemLabel={(t) => t.title}
        handlePlacement="custom"
        onItemsChange={(next, move) => {
          state.update(next);
          setLastMove(`Last move: ${next[move.toIndex]?.title ?? "ticket"}, place ${move.fromIndex + 1} to ${move.toIndex + 1}.`);
        }}
        empty={<p>The queue is clear. Add a ticket below or reset the example.</p>}
        renderItem={(ticket, s) => (
          <div className="ddg-ticket">
            {s.handle}
            <span className="ddg-num" aria-hidden="true">
              {s.index + 1}
            </span>
            <span className="ddg-ticket__text">
              <span className="ddg-ticket__title">{ticket.title}</span>
              <span className="ddg-ticket__meta">{ticket.customer}</span>
            </span>
            <span className="ddg-row-actions">
              <Button size="sm" tone="neutral" appearance="ghost" aria-label={`Move ${ticket.title} up`} disabled={!s.moveBackward} onClick={s.moveBackward}>
                Up
              </Button>
              <Button size="sm" tone="neutral" appearance="ghost" aria-label={`Move ${ticket.title} down`} disabled={!s.moveForward} onClick={s.moveForward}>
                Down
              </Button>
              <Button
                size="sm"
                tone="neutral"
                appearance="ghost"
                aria-label={`Mark ${ticket.title} done`}
                onClick={() => {
                  state.update(tickets.filter((t) => t.id !== ticket.id));
                  state.setStatus(`${ticket.title} marked done and removed from the queue. Not saved yet.`);
                }}
              >
                Done
              </Button>
            </span>
          </div>
        )}
      />
      {lastMove && <p className="ddg-note">{lastMove}</p>}
      <AddForm
        label="New ticket"
        placeholder="Lights flicker on rough roads"
        action="Add ticket"
        onAdd={(text) => {
          state.update([...tickets, { id: newId("q"), title: text, customer: "Walk-in" }]);
          state.setStatus(`Added ${text} to the end of the queue. Not saved yet.`);
        }}
      />
    </div>
  );
}
