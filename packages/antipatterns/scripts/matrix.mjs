// Quick matrix: which rules fire on each bad/good page. Usage: node scripts/matrix.mjs [width] [IDs...]
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch, analyse, fired, ROOT } from '../lib/engine.mjs';
const [w = '1440', ...only] = process.argv.slice(2);
const ids = readdirSync(resolve(ROOT, 'patterns')).filter((d) => /^AP-/.test(d) && (!only.length || only.includes(d))).sort();
const b = await launch();
let bad = 0, good = 0;
for (const id of ids) for (const k of ['bad', 'good']) {
  const r = await analyse(b, resolve(ROOT, 'patterns', id, k + '.html'), { width: +w, height: +w < 600 ? 844 : 900 });
  const f = fired(r).map((x) => x.id);
  const ok = k === 'bad' ? f.includes(id) : f.length === 0;
  if (!ok) k === 'bad' ? bad++ : good++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(12)} ${k.padEnd(4)} ${String(r.score).padStart(3)}  ${f.join(' ')}${!ok && k === 'good' ? '\n        ' + fired(r).map((x) => x.id + ': ' + r.findings[x.id].evidence.slice(0, 2).join(' | ')).join('\n        ') : ''}${r.errors.length ? ' !' + r.errors.join(';') : ''}`);
}
await b.close();
console.log(`bad misses: ${bad}, good false positives: ${good}`);
