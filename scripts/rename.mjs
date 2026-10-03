#!/usr/bin/env node
/**
 * Renames the project in one pass. The working name lives only in project.json; package names,
 * imports and docs follow it. Run, review the diff, then `pnpm install` to refresh the lockfile.
 *
 *   node scripts/rename.mjs --product "New Name" --scope @newscope --pro-scope @newscope-pro [--dry-run]
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const project = JSON.parse(readFileSync(path.join(root, "project.json"), "utf8"));
const next = { product: opt("--product") ?? project.product, scope: opt("--scope") ?? project.scope, proScope: opt("--pro-scope") ?? project.proScope };
if (!/^@[a-z0-9-]+$/.test(next.scope) || !/^@[a-z0-9-]+$/.test(next.proScope)) throw new Error("Scopes look like @name");
const dry = args.includes("--dry-run");
const skip = new Set(["node_modules", "dist", ".astro", ".git", "pnpm-lock.yaml"]);
const text = /\.(?:[cm]?[jt]sx?|json|css|astro|md|mdx|html|ya?ml|svg)$/;

const pairs = [
  [project.proScope + "/", next.proScope + "/"],
  [project.scope + "/", next.scope + "/"],
  [project.product, next.product],
];
let changed = 0;
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (text.test(name)) yield full;
  }
}
for (const file of walk(root)) {
  if (file.endsWith("project.json")) continue;
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [from, to] of pairs) if (from !== to) after = after.split(from).join(to);
  if (after !== before) { changed++; if (!dry) writeFileSync(file, after); else console.log("would change", path.relative(root, file)); }
}
if (!dry) writeFileSync(path.join(root, "project.json"), JSON.stringify({ ...project, ...next }, null, 2) + "\n");
console.log(`${dry ? "Would rename" : "Renamed"} ${project.product} (${project.scope}) to ${next.product} (${next.scope}) in ${changed} files.`);
