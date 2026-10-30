/** A one-field "add" form. Empty submissions show an error instead of adding a blank row. */
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Button } from "@brandcloud/ui/button";
import { FormField } from "@brandcloud/ui/form-field";
import { Input } from "@brandcloud/ui/input";

export function AddForm({ label, placeholder, action, onAdd }: { label: string; placeholder: string; action: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      setError(`Type something first, then choose ${action}.`);
      return;
    }
    onAdd(value.slice(0, 80));
    setText("");
    setError("");
  }
  return (
    <form className="ddg-add" onSubmit={submit} noValidate>
      <FormField label={label} error={error || undefined}>
        <Input value={text} maxLength={80} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      </FormField>
      <Button type="submit" size="sm">
        {action}
      </Button>
    </form>
  );
}

/** Moves focus to the element matching `selector` after React has re-rendered (e.g. back to a Rename button). */
export function focusLater(selector: string) {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

/**
 * Inline rename: a text field with Save and Cancel. Enter saves, Escape cancels. The field takes
 * focus when it opens because the user just asked to rename; callers return focus afterwards.
 */
export function RenameField({ label, initial, onSave, onCancel }: { label: string; initial: string; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);
  const commit = () => {
    const value = text.trim();
    if (value) onSave(value.slice(0, 80));
    else onCancel();
  };
  return (
    <span className="ddg-rename">
      <Input
        aria-label={label}
        value={text}
        maxLength={80}
        ref={field}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <span className="ddg-rename__actions">
        <Button size="sm" onClick={commit}>
          Save
        </Button>
        <Button size="sm" tone="neutral" appearance="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </span>
    </span>
  );
}
