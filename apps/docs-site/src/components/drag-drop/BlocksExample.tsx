/**
 * SortableList as a page outline: reorder the sections of a landing page and watch the preview
 * follow. The consumer owns persistence: onItemsChange saves to this browser on every move while
 * autosave is on, which is the pattern to copy when the save target is your own API.
 */
import { useState } from "react";
import { Checkbox } from "@brandcloud/ui/checkbox";
import { SortableList, type SortableMove } from "@brandcloud/ui/drag-drop";
import { ExampleBar } from "./ExampleBar";
import { isRecordList, savedLabel } from "./storage";
import { useSavedState } from "./useSavedState";

type Block = { id: string; kind: string; heading: string; shown: boolean };

const seed: Block[] = [
  { id: "b-hero", kind: "Hero", heading: "Bikes serviced while you work", shown: true },
  { id: "b-steps", kind: "Steps", heading: "How a service works", shown: true },
  { id: "b-trust", kind: "TrustStrip", heading: "Fixed prices, twelve-month warranty", shown: true },
  { id: "b-faq", kind: "Faq", heading: "Questions we hear", shown: true },
  { id: "b-cta", kind: "CtaBand", heading: "Book before the winter rush", shown: true },
];
function isBlocks(value: unknown): value is Block[] {
  return (
    isRecordList<Block>(["kind", "heading"])(value) &&
    value.every((block) => typeof block.shown === "boolean")
  );
}

type LogLine = { id: number; text: string };

export default function BlocksExample() {
  const state = useSavedState("blocks", seed, isBlocks);
  const [autosave, setAutosave] = useState(true);
  const [log, setLog] = useState<LogLine[]>([]);
  const blocks = state.value;

  /** The persistence callback: what a consumer would pass to onItemsChange. */
  function persist(next: Block[], description: string) {
    state.update(next);
    let result = "not saved, autosave is off";
    if (autosave) result = state.saveNow(next) ? `saved in this browser at ${savedLabel(new Date().toISOString())}` : "storage blocked, not saved";
    setLog((lines) => [{ id: Date.now(), text: `${description}: ${result}` }, ...lines].slice(0, 4));
  }
  const describeMove = (next: Block[], move: SortableMove) => `${next[move.toIndex]?.kind ?? "Block"} moved ${move.fromIndex + 1} to ${move.toIndex + 1}`;

  return (
    <div className="ddg-example">
      <ExampleBar state={state} autosave={autosave}>
        <Checkbox
          label="Autosave every change"
          checked={autosave}
          onCheckedChange={(on) => {
            setAutosave(on);
            if (on && state.dirty) state.saveNow();
          }}
        />
      </ExampleBar>
      <div className="ddg-blocks">
        <SortableList
          label="Page sections, top to bottom"
          className="ddg-outline"
          items={blocks}
          getItemLabel={(b) => `${b.kind} section`}
          onItemsChange={(next, move) => persist(next, describeMove(next, move))}
          renderItem={(block, s) => (
            <div className="ddg-block" data-hidden={!block.shown || undefined}>
              <span className="ddg-block__text">
                <span className="ddg-block__kind">
                  {s.index + 1}. {block.kind}
                </span>
                <span className="ddg-block__heading">{block.heading}</span>
              </span>
              <Checkbox
                label="Show"
                aria-label={`Show the ${block.kind} section`}
                checked={block.shown}
                onCheckedChange={(on) =>
                  persist(
                    blocks.map((b) => (b.id === block.id ? { ...b, shown: on } : b)),
                    `${block.kind} ${on ? "shown" : "hidden"}`,
                  )
                }
              />
            </div>
          )}
        />
        <figure className="ddg-preview">
          <figcaption>Preview of the page, in this order</figcaption>
          <ol className="ddg-preview__page">
            {blocks
              .filter((b) => b.shown)
              .map((b) => (
                <li key={b.id} className="ddg-preview__block" data-kind={b.kind}>
                  <span className="ddg-preview__kind">{b.kind}</span>
                  <span>{b.heading}</span>
                </li>
              ))}
          </ol>
          {blocks.every((b) => !b.shown) && <p className="ddg-note">Every section is hidden. Tick Show on one to bring it back.</p>}
        </figure>
      </div>
      <div className="ddg-log">
        <p className="ddg-log__title">onItemsChange calls</p>
        {log.length ? (
          <ol>
            {log.map((line) => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ol>
        ) : (
          <p className="ddg-note">Move a section to see the callback run.</p>
        )}
      </div>
    </div>
  );
}
