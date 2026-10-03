#!/usr/bin/env node
/**
 * Open-core boundary check. The free packages must stand on their own:
 *  - no package in packages/ may import, depend on or mention a Pro package (the pro scope),
 *  - no package or app may import a Pro package,
 *  - copywriting frameworks and the chatbot are not part of this repository at all.
 * Pro builds on the public APIs of these packages; the reverse direction is never allowed.
 *
 *   node scripts/check-boundaries.mjs            exits 1 on any finding
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = JSON.parse(readFileSync(path.join(root, "project.json"), "utf8"));
const scope = project.scope;
const proScope = project.proScope;
const skipDirs = new Set(["node_modules", "dist", ".astro", ".git", "coverage", "shots", ".changeset"]);
const textFile = /\.(?:[cm]?[jt]sx?|json|css|astro|md|mdx|html|ya?ml)$/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (textFile.test(name)) yield full;
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Rules for the publishable packages: never reference Pro or the excluded products.
const packageRules = [
  { id: "pro-scope", re: new RegExp(esc(proScope) + "(?![\\w-])", "g"), why: `free packages must not reference ${proScope}` },
  { id: "copy-package", re: new RegExp(esc(scope) + "\\/copy\\b|\\bbrand-copy\\b|packages\\/copy\\b", "g"), why: "copywriting frameworks are a Pro package" },
  { id: "chatbot", re: /chatbot/gi, why: "the chatbot is a separate product and is not part of this repository" },
];
// Rules for everything else (apps, examples, scripts): imports only. Prose on the docs site may name Pro.
const importRules = [
  { id: "pro-import", re: new RegExp(`(?:from\\s+|import\\s*\\(?\\s*|require\\(\\s*)["'](${esc(proScope)}\\/[^"']+|${esc(scope)}\\/(?:copy|chatbot)[^"']*)["']`, "g"), why: "public code must not import Pro, copy or chatbot packages" },
  { id: "pro-dependency", re: new RegExp(`"(${esc(proScope)}\\/[a-z-]+|${esc(scope)}\\/(?:copy|chatbot))"\\s*:`, "g"), why: "public manifests must not depend on Pro, copy or chatbot packages" },
];

const findings = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (rel === "scripts/check-boundaries.mjs" || rel === "scripts/check-boundaries.test.mjs") continue;
  const text = readFileSync(file, "utf8");
  const rules = rel.startsWith("packages/") ? [...packageRules, ...importRules] : importRules;
  for (const rule of rules) {
    for (const m of text.matchAll(rule.re)) {
      findings.push(`${rel}:${text.slice(0, m.index).split("\n").length}  ${rule.id}  "${m[0].slice(0, 60)}"  (${rule.why})`);
    }
  }
}
for (const dir of readdirSync(path.join(root, "packages"))) {
  if (/^(copy|chatbot)$/.test(dir)) findings.push(`packages/${dir}  forbidden-package  (not part of the free core)`);
}

if (findings.length) {
  console.error(`Boundary check failed: ${findings.length} finding(s)\n` + findings.join("\n"));
  process.exit(1);
}
console.log(`Boundary check passed: free packages never reference ${proScope}, copy or chatbot; no public code imports them.`);
