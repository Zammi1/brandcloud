/**
 * Browser-only persistence for the drag and drop examples. Everything stays in this browser's
 * localStorage under one prefix; nothing is sent anywhere. Reads are validated so a stale or
 * hand-edited value falls back to the seed data instead of breaking the example.
 */
const PREFIX = "brandcloud:drag-drop:";

export type Saved<T> = { items: T; savedAt: string };

export function loadSaved<T>(key: string, isValid: (value: unknown) => value is T): Saved<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: unknown; savedAt?: unknown };
    if (typeof parsed.savedAt !== "string" || !Number.isFinite(Date.parse(parsed.savedAt)) || !isValid(parsed.items)) return null;
    return { items: parsed.items, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

/** Returns the save time, or null when storage is unavailable (private mode, quota, blocked). */
export function save<T>(key: string, items: T): string | null {
  const savedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ items, savedAt }));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearSaved(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* Storage blocked: nothing to clear. */
  }
}

export function savedLabel(savedAt: string) {
  return new Date(savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Stable, non-empty unique IDs, including across Kanban lanes when passed as one collection. */
export function hasUniqueIds(value: unknown): value is { id: string }[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  return value.every((row) => {
    if (typeof row !== "object" || row === null || typeof row.id !== "string" || !row.id.length || row.id.startsWith("\u0000kanban-column:") || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/** Valid record fields and IDs; malformed saved state falls back to the example seed. */
export function isRecordList<T extends { id: string }>(fields: string[]) {
  return (value: unknown): value is T[] =>
    hasUniqueIds(value) &&
    value.every(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as { id?: unknown }).id === "string" &&
        fields.every((f) => typeof (row as unknown as Record<string, unknown>)[f] === "string"),
    );
}
