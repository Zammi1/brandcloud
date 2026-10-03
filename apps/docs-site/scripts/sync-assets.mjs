// Copies the anti-AI example pairs (HTML and screenshots) from packages/antipatterns into public/pairs,
// so the anti-AI guide and the AI-look score page can show and load them. Run before dev and build.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const from = fileURLToPath(new URL("../../../packages/antipatterns/patterns/", import.meta.url));
const to = fileURLToPath(new URL("../public/pairs/", import.meta.url));
if (!existsSync(from)) throw new Error(`sync-assets: ${from} not found`);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
let count = 0;
for (const entry of readdirSync(from, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  cpSync(join(from, entry.name), join(to, entry.name), { recursive: true });
  count++;
}
console.log(`sync-assets: copied ${count} pattern folders to public/pairs`);
