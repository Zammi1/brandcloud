/** Save and reset controls shared by every example, with an honest note on where data goes. */
import type { ReactNode } from "react";
import { Button } from "@brandcloud/ui/button";
import { savedLabel } from "./storage";
import type { SavedState } from "./useSavedState";

export function ExampleBar<T>({ state, autosave, children }: { state: SavedState<T>; autosave?: boolean; children?: ReactNode }) {
  const badge = state.dirty
    ? "Unsaved changes"
    : state.savedAt
      ? `Saved in this browser at ${savedLabel(state.savedAt)}`
      : "Example data, not saved";
  return (
    <div className="ddg-bar">
      <p className="ddg-bar__state" data-state={state.dirty ? "dirty" : state.savedAt ? "saved" : "seed"}>
        {badge}
      </p>
      <div className="ddg-bar__actions">
        {children}
        {!autosave && (
          <Button size="sm" disabled={!state.dirty} onClick={() => state.saveNow()}>
            Save in this browser
          </Button>
        )}
        <Button size="sm" tone="neutral" appearance="outline" onClick={state.reset}>
          Reset example
        </Button>
      </div>
      <p className="ddg-bar__status" role="status">
        {state.status}
      </p>
    </div>
  );
}
