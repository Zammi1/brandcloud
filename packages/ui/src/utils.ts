// Internal module: not part of the public API. Do not export from index.ts or package.json.
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
