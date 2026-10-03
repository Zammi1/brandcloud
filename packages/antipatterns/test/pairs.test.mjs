// Every patterns/<ID>/bad.html must fire rule <ID>; every good.html must fire no rule at all.
// Runs at desktop (1440) and mobile (390) widths.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch, analyse, fired, allRules, ROOT } from '../lib/engine.mjs';

const ids = readdirSync(resolve(ROOT, 'patterns')).filter((d) => /^AP-/.test(d)).sort();
const ruleIds = new Set(allRules().map((r) => r.id));
const widths = (process.env.AP_WIDTHS || '1440,390').split(',').map(Number);
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

test('every rule has a pattern pair and every pair has a rule', () => {
  const missing = [...ruleIds].filter((id) => !ids.includes(id));
  const orphan = ids.filter((id) => !ruleIds.has(id));
  assert.deepEqual(missing, [], 'rules without a pair');
  assert.deepEqual(orphan, [], 'pairs without a rule');
});

describe('pairs', { concurrency: 6 }, () => {
for (const id of ids) {
  for (const w of widths) {
    const h = w < 600 ? 844 : 900;
    test(`${id} bad.html fires ${id} @${w}`, async () => {
      const f = resolve(ROOT, 'patterns', id, 'bad.html');
      assert.ok(existsSync(f));
      const r = await analyse(browser, f, { width: w, height: h });
      const ids2 = fired(r).map((x) => x.id);
      assert.ok(ids2.includes(id), `expected ${id}, fired: [${ids2.join(', ')}]`);
    });
    test(`${id} good.html fires nothing @${w}`, async () => {
      const r = await analyse(browser, resolve(ROOT, 'patterns', id, 'good.html'), { width: w, height: h });
      const list = fired(r).map((x) => `${x.id}: ${r.findings[x.id].evidence.slice(0, 2).join(' | ')}`);
      assert.deepEqual(list, [], `good page fired rules`);
      assert.equal(r.score, 0);
    });
  }
}
});
