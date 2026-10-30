/** KanbanBoard: a content board with a work-in-progress limit, a lockable column and editable cards. */
import { useState } from "react";
import { Button } from "@brandcloud/ui/button";
import { Checkbox } from "@brandcloud/ui/checkbox";
import { KanbanBoard, type KanbanColumn, type KanbanMove } from "@brandcloud/ui/kanban";
import { AddForm, RenameField, focusLater } from "./AddForm";
import { ExampleBar } from "./ExampleBar";
import { newId, useSavedState } from "./useSavedState";
import { hasUniqueIds, isRecordList } from "./storage";

type Card = { id: string; title: string; tag: string };
/** What is saved: card order per column. Titles and rules stay in code. */
type Lanes = Record<string, Card[]>;

const COLUMNS = [
  { id: "ideas", title: "Ideas" },
  { id: "writing", title: "Writing" },
  { id: "review", title: "Review", description: "Two cards at most" },
  { id: "published", title: "Published" },
] as const;
const REVIEW_LIMIT = 2;

const seed: Lanes = {
  ideas: [
    { id: "c-winter", title: "Winter service checklist", tag: "Guide" },
    { id: "c-tyres", title: "Tyre pressure by rider weight", tag: "Table" },
  ],
  writing: [{ id: "c-prices", title: "Price list explained", tag: "Page" }],
  review: [{ id: "c-faq", title: "Ten questions we hear", tag: "FAQ" }],
  published: [{ id: "c-about", title: "Meet the workshop", tag: "Page" }],
};

function isLanes(value: unknown): value is Lanes {
  if (typeof value !== "object" || value === null) return false;
  const lanes = value as Record<string, unknown>;
  const isCards = isRecordList<Card>(["title", "tag"]);
  return COLUMNS.every((column) => isCards(lanes[column.id])) &&
    hasUniqueIds(COLUMNS.flatMap((column) => lanes[column.id] as Card[]));
}

export default function KanbanExample() {
  const state = useSavedState("kanban", seed, isLanes);
  const [lockPublished, setLockPublished] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const stopEditing = (id: string) => {
    setEditing(null);
    focusLater(`[data-rename="${id}"]`);
  };
  const [lastMove, setLastMove] = useState("");
  const lanes = state.value;
  const columns: KanbanColumn<Card>[] = COLUMNS.map((c) => ({
    id: c.id,
    title: c.title,
    description: "description" in c ? c.description : undefined,
    items: lanes[c.id] ?? [],
    disabled: c.id === "published" && lockPublished,
  }));
  const titleOf = (id: string) => COLUMNS.find((c) => c.id === id)?.title ?? id;
  const editCard = (id: string, change: (card: Card) => Card | null) => {
    const next: Lanes = {};
    for (const c of COLUMNS) next[c.id] = (lanes[c.id] ?? []).flatMap((card) => (card.id === id ? (change(card) ?? []) : [card]));
    state.update(next);
  };

  return (
    <div className="ddg-example">
      <ExampleBar state={state}>
        <Checkbox label="Lock Published" checked={lockPublished} onCheckedChange={setLockPublished} />
      </ExampleBar>
      <p className="ddg-note ddg-narrow">Four columns: scroll the board sideways to see them all.</p>
      <div className="ddg-board">
        <KanbanBoard
          label="Content board"
          columns={columns}
          getItemLabel={(card) => card.title}
          canMove={(move: KanbanMove) =>
            move.toColumnId !== "review" || move.fromColumnId === "review" || (lanes.review?.length ?? 0) < REVIEW_LIMIT
          }
          onColumnsChange={(next, move) => {
            state.update(Object.fromEntries(next.map((c) => [c.id, [...c.items]])));
            const card = next.find((c) => c.id === move.toColumnId)?.items[move.toIndex];
            setLastMove(
              move.fromColumnId === move.toColumnId
                ? `Last move: ${card?.title ?? "card"}, place ${move.fromIndex + 1} to ${move.toIndex + 1} in ${titleOf(move.toColumnId)}.`
                : `Last move: ${card?.title ?? "card"}, ${titleOf(move.fromColumnId)} to ${titleOf(move.toColumnId)}.`,
            );
          }}
          renderCard={(card) =>
            editing === card.id ? (
              <RenameField
                label={`Rename ${card.title}`}
                initial={card.title}
                onSave={(text) => {
                  editCard(card.id, (c) => ({ ...c, title: text }));
                  stopEditing(card.id);
                  state.setStatus(`Renamed to ${text}. Not saved yet.`);
                }}
                onCancel={() => stopEditing(card.id)}
              />
            ) : (
              <div className="ddg-card">
                <p className="ddg-card__title">{card.title}</p>
                <p className="ddg-card__tag">{card.tag}</p>
                <span className="ddg-card__tools">
                  <Button size="sm" tone="neutral" appearance="ghost" aria-label={`Rename ${card.title}`} data-rename={card.id} onClick={() => setEditing(card.id)}>
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    tone="neutral"
                    appearance="ghost"
                    aria-label={`Remove ${card.title}`}
                    onClick={() => {
                      editCard(card.id, () => null);
                      state.setStatus(`Removed ${card.title}. Not saved yet.`);
                    }}
                  >
                    Remove
                  </Button>
                </span>
              </div>
            )
          }
          renderColumnFooter={(column) =>
            column.id === "ideas" ? (
              <AddForm
                label="New idea"
                placeholder="Chain wear explained"
                action="Add idea"
                onAdd={(text) => {
                  state.update({ ...lanes, ideas: [...(lanes.ideas ?? []), { id: newId("c"), title: text, tag: "Idea" }] });
                  state.setStatus(`Added ${text} to Ideas. Not saved yet.`);
                }}
              />
            ) : null
          }
        />
      </div>
      {lastMove && <p className="ddg-note">{lastMove}</p>}
    </div>
  );
}
