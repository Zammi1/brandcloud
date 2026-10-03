// Writes patterns/<ID>/{good,bad}.html from scripts/pairs/specs-*.mjs.
// The html files are the artefacts agents read; the specs keep each pair's content identical.
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { page, swap } from './pairs/common.mjs';
import { ROOT } from '../lib/engine.mjs';

const specDir = resolve(ROOT, 'scripts/pairs');
const specs = [];
for (const f of readdirSync(specDir).filter((f) => /^specs-.*\.mjs$/.test(f)).sort()) {
  specs.push(...(await import(pathToFileURL(resolve(specDir, f)).href)).default);
}
const only = process.argv.slice(2);
let n = 0;
for (const s of specs) {
  if (only.length && !only.includes(s.id)) continue;
  const dir = resolve(ROOT, 'patterns', s.id);
  mkdirSync(dir, { recursive: true });
  const shared = s.css || '';
  const goodBody = s.good.body;
  const badBody = s.bad.body || (s.bad.swap ? swap(goodBody, s.bad.swap, s.id) : goodBody);
  const common = { id: s.id, title: s.title, biz: s.biz, headExtra: s.headExtra || '' };
  writeFileSync(resolve(dir, 'good.html'), page({ ...common, kind: 'good', note: s.fixNote || 'same content, fixed design', css: shared + '\n' + (s.good.css || ''), body: goodBody, script: s.good.script || '', footerHtml: s.good.footerHtml ?? null }));
  writeFileSync(resolve(dir, 'bad.html'), page({ ...common, kind: 'bad', note: s.note, css: shared + '\n' + (s.bad.css || ''), body: badBody, script: s.bad.script || '', footerHtml: s.bad.footerHtml ?? null }));
  n++;
}
console.log(`wrote ${n} pairs (${n * 2} files)`);
