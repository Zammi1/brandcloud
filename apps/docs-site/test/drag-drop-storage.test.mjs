import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { hasUniqueIds, isRecordList, loadSaved } from '../src/components/drag-drop/storage.ts';
const originalWindow = globalThis.window;
afterEach(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
const valid = isRecordList(['title']);
const savedAt = '2026-10-08T12:00:00.000Z';
function stored(value) { globalThis.window = {localStorage: {getItem: () => JSON.stringify(value)}}; }
test('valid ordered rows load without losing the saved order', () => {
  const items = [{id: 'review', title: 'Review'}, {id: 'brief', title: 'Brief'}];
  stored({items, savedAt});
  assert.deepEqual(loadSaved('table', valid), {items, savedAt});
});
test('corrupt saved IDs fall back instead of reaching the sortable component', () => {
  for (const items of [[{id: '', title: 'Blank'}], [{id: 'same', title: 'One'}, {id: 'same', title: 'Two'}], [{id: '\u0000kanban-column:ideas', title: 'Reserved'}]]) {
    stored({items, savedAt});
    assert.equal(loadSaved('table', valid), null);
  }
});
test('IDs are unique across a flattened board, not only within each lane', () => {
  assert.equal(hasUniqueIds([{id: 'card'}, {id: 'card'}]), false);
  assert.equal(hasUniqueIds([{id: 'one'}, {id: 'two'}]), true);
});
test('wrong fields and invalid save timestamps are rejected', () => {
  stored({items: [{id: 'one', title: 4}], savedAt});
  assert.equal(loadSaved('table', valid), null);
  stored({items: [{id: 'one', title: 'One'}], savedAt: 'invalid'});
  assert.equal(loadSaved('table', valid), null);
});
test('blocked storage and malformed JSON keep the example usable', () => {
  globalThis.window = {localStorage: {getItem: () => {throw new Error('Blocked');}}};
  assert.equal(loadSaved('table', valid), null);
  globalThis.window = {localStorage: {getItem: () => '{broken'}};
  assert.equal(loadSaved('table', valid), null);
});
