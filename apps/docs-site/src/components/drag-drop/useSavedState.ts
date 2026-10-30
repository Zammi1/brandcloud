/**
 * Controlled state for one example: the current value, whether it differs from what this browser
 * saved, and save/reset actions. Saved data is read after mount so the server render and the first
 * client render match.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { clearSaved, loadSaved, save, savedLabel } from "./storage";

export type SavedState<T> = {
  value: T;
  /** Replace the value and mark it as unsaved. */
  update: (next: T) => void;
  /** Save `next` (or the current value) in this browser. Returns false when storage is blocked. */
  saveNow: (next?: T) => boolean;
  reset: () => void;
  dirty: boolean;
  savedAt: string | null;
  status: string;
  setStatus: (message: string) => void;
};

export function useSavedState<T>(key: string, seed: T, isValid: (value: unknown) => value is T): SavedState<T> {
  const [value, setValue] = useState<T>(seed);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const saved = loadSaved(key, isValid);
    if (!saved) return;
    setValue(saved.items);
    setSavedAt(saved.savedAt);
    setStatus(`Loaded the version saved in this browser at ${savedLabel(saved.savedAt)}.`);
    // Only on mount: the key and validator are fixed per example.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((next: T) => {
    setValue(next);
    setDirty(true);
  }, []);

  const saveNow = useCallback(
    (next?: T) => {
      const at = save(key, next ?? latest.current);
      if (!at) {
        setStatus("This browser blocked local storage, so nothing was saved. Your changes last until you leave the page.");
        return false;
      }
      setSavedAt(at);
      setDirty(false);
      setStatus(`Saved in this browser at ${savedLabel(at)}.`);
      return true;
    },
    [key],
  );

  const reset = useCallback(() => {
    setValue(seed);
    clearSaved(key);
    setSavedAt(null);
    setDirty(false);
    setStatus("Back to the example data. Anything this browser had saved for this example is cleared.");
  }, [key, seed]);

  return { value, update, saveNow, reset, dirty, savedAt, status, setStatus };
}

/** A short id for rows and cards added in the examples. Not cryptographic; unique enough per page. */
export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
