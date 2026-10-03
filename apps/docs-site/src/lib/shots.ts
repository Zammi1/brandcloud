/** Real pixel sizes of the anti-AI pair screenshots, read from the PNG headers at build time. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = join(dirname(createRequire(import.meta.url).resolve("@brandcloud/antipatterns/package.json")), "patterns");
export function shotSize(id: string, kind: "bad" | "good", width: 390 | 1440): { width: number; height: number } {
  const buf = readFileSync(join(root, id, "shots", `${kind}-${width}.png`));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
