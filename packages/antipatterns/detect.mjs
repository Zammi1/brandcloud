#!/usr/bin/env node
// Usage: node detect.mjs <url | file.html | file.md | file.txt> [more targets] [options]
//   --json            machine-readable output
//   --width N         viewport width (default 1440); --mobile is shorthand for 390x844
//   --rules A,B       only run these rule ids
//   --max-score N     exit 1 if any target scores above N (CI gate)
//   --fail-on high    exit 1 if any rule of that severity (or worse) fires
// .md and .txt files run copy rules only (no browser). This package ships none: load a copy rules
// pack with AP_EXTRA_RULES=<file.json> (same shape as rules.json).
import { readFileSync } from 'node:fs';
import { analyse, launch, formatReport, runCopyRules, score, RULES, fired } from './lib/engine.mjs';

const args = process.argv.slice(2);
const opt = { json: false, width: 1440, height: 900, only: null, maxScore: null, failOn: null };
const targets = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json') opt.json = true;
  else if (a === '--mobile') { opt.width = 390; opt.height = 844; }
  else if (a === '--width') opt.width = +args[++i];
  else if (a === '--height') opt.height = +args[++i];
  else if (a === '--rules') opt.only = new Set(args[++i].split(',').map((s) => s.trim()));
  else if (a === '--max-score') opt.maxScore = +args[++i];
  else if (a === '--fail-on') opt.failOn = args[++i];
  else if (a === '-h' || a === '--help') { console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 9).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
  else targets.push(a);
}
if (!targets.length) { console.error('usage: node detect.mjs <url|file.html|file.md> [--json] [--mobile] [--rules ids] [--max-score N] [--fail-on high|medium|low]'); process.exit(2); }

const results = [];
let browser = null;
try {
  for (const t of targets) {
    if (/\.(md|txt)$/i.test(t)) {
      const rules = RULES.copyRules.filter((r) => !opt.only || opt.only.has(r.id));
      if (!RULES.copyRules.length) console.error(`${t}: no copy rules loaded, so nothing to check. Set AP_EXTRA_RULES to a copy rules pack.`);
      const findings = runCopyRules(readFileSync(t, 'utf8'), rules);
      results.push({ target: t, url: t, title: '', viewport: { width: 0, height: 0 }, findings, ...score(findings), errors: [], copyOnly: true });
      continue;
    }
    browser ||= await launch();
    results.push(await analyse(browser, t, opt));
  }
} finally {
  if (browser) await browser.close();
}

if (opt.json) {
  console.log(JSON.stringify(results.map((r) => ({ ...r, fired: fired(r).map((x) => ({ id: x.id, severity: x.severity, title: x.title, hits: r.findings[x.id].hits, evidence: r.findings[x.id].evidence, fix: x.fix })) })), null, 2));
} else {
  console.log(results.map(formatReport).join('\n\n'));
}

const rank = { low: 1, medium: 2, high: 3 };
let fail = false;
for (const r of results) {
  if (opt.maxScore !== null && r.score > opt.maxScore) fail = true;
  if (opt.failOn && fired(r).some((x) => rank[x.severity] >= rank[opt.failOn])) fail = true;
}
process.exit(fail ? 1 : 0);
