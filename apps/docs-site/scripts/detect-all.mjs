// Runs the anti-AI detector on every built page at 1440 and 390 wide, over a short-lived local server
// (pages use absolute asset paths, so file:// would load them without CSS). Prints a Markdown table.
// Usage: node scripts/detect-all.mjs [--json out.json]
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";
import { analyse, launch, fired } from "../../../packages/antipatterns/lib/engine.mjs";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "_astro" && name !== "pairs") walk(p); }
    else if (name === "index.html") pages.push("/" + relative(dist, dir).split("\\").join("/") + (dir === dist.replace(/\/$/, "") ? "" : "/"));
  }
};
walk(dist.replace(/\/$/, ""));
pages.sort();
const server = await serve(dist.replace(/\/$/, ""));
const browser = await launch();
const rows = [];
let worst = 0;
try {
  for (const path of pages) {
    const url = server.url + path.replace(/\/\/$/, "/");
    const desk = await analyse(browser, url, { width: 1440, height: 900 });
    const mob = await analyse(browser, url, { width: 390, height: 844 });
    const fmt = (r) => fired(r).map((x) => `${x.id} (${x.severity})`).join(", ") || "none";
    rows.push({ path, desktop: desk.score, mobile: mob.score, desktopRules: fmt(desk), mobileRules: fmt(mob), desktopBand: desk.band, mobileBand: mob.band,
      evidence: [...fired(desk).map((x) => `1440 ${x.id}: ${desk.findings[x.id].evidence.slice(0, 2).join(" | ")}`), ...fired(mob).map((x) => `390 ${x.id}: ${mob.findings[x.id].evidence.slice(0, 2).join(" | ")}`)],
      high: [...fired(desk), ...fired(mob)].some((x) => x.severity === "high"), errors: [...desk.errors, ...mob.errors] });
    worst = Math.max(worst, desk.score, mob.score);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log("| Page | 1440 | 390 | Rules fired |\n|---|---|---|---|");
for (const r of rows) console.log(`| \`${r.path}\` | ${r.desktop} | ${r.mobile} | ${r.desktopRules === r.mobileRules ? r.desktopRules : `1440: ${r.desktopRules}; 390: ${r.mobileRules}`} |`);
for (const r of rows) for (const e of r.evidence) console.error(`${r.path} ${e}`);
for (const r of rows) for (const e of r.errors) console.error(`${r.path} ERROR ${e}`);
const out = process.argv.indexOf("--json");
if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify(rows, null, 2));
console.log(`\n${pages.length} pages, worst score ${worst}, high-severity rules: ${rows.filter((r) => r.high).length}`);
process.exit(worst > 9 || rows.some((r) => r.high) ? 1 : 0);
