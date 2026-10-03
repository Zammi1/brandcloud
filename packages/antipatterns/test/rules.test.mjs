// Static checks on rules.json (no browser). Copy rules are an optional extra rule pack, tested where they live.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, allRules, addRules, runCopyRules } from '../lib/engine.mjs';

test('rules.json is well formed', () => {
  const ids = allRules().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const r of allRules()) {
    for (const k of ['id', 'slug', 'category', 'title', 'description', 'whyAI', 'severity', 'detect', 'fix', 'pair']) assert.ok(r[k], `${r.id} missing ${k}`);
    assert.match(r.id, /^AP-(GRAD|LAY|TYPE|COMP|IMG|MOT|COPY|TRUST)-\d\d$/);
    assert.ok(RULES.categories[r.category], `${r.id} unknown category`);
    assert.ok(['high', 'medium', 'low'].includes(r.severity));
    assert.ok(!/[—–]/.test(JSON.stringify(r)), `${r.id} contains an em or en dash`);
  }
  assert.equal((RULES.copyRules ?? []).length, 0, 'the public rules ship no copy rules');
});

test('addRules accepts an external copy rule pack and runCopyRules uses it', () => {
  const pack = { copyRules: [{ id: 'X-COPY-01', slug: 'x', category: 'X', title: 'x', description: 'x', whyAI: 'x', severity: 'low', fix: 'x', pair: 'none', detect: { kind: 'regex', patterns: [{ source: '\\bsynergy\\b', flags: 'i' }] } }] };
  const before = RULES.copyRules.length;
  addRules(pack);
  assert.equal(runCopyRules('Pure synergy.', pack.copyRules)['X-COPY-01'].hits, 1);
  RULES.copyRules.splice(before);
});
