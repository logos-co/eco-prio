// Regression test for the drag-handle bug: after filter→edit→unfilter, rows
// must become draggable again. The original `applyFilter` only re-enabled rows
// it had previously disabled; rows that rendered non-draggable (e.g. because a
// filter was already active when edit mode was entered) stayed permanently
// stuck at draggable="false".
//
// This test exercises the extracted pure helper `applyDragGating` against a
// hand-rolled element stub, matching the no-JSDOM style used in render.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Same shim pattern as render.test.mjs — pipeline.js touches localStorage/window at load.
const _store = new Map();
globalThis.localStorage = {
  getItem:  (k) => _store.has(k) ? _store.get(k) : null,
  setItem:  (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear:    () => _store.clear(),
};
globalThis.window = globalThis;

const { applyDragGating } = await import('../js/pipeline.js');

// Minimal element stub — just enough for applyDragGating's reads/writes.
function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add:      (...c) => c.forEach(x => set.add(x)),
    remove:   (...c) => c.forEach(x => set.delete(x)),
    contains: (c) => set.has(c),
    toString: () => [...set].join(' '),
  };
}
function makeEl({ tag = 'div', classes = [], children = [] } = {}) {
  const attrs = {};
  return {
    tagName: tag.toUpperCase(),
    classList: makeClassList(classes),
    dataset: {},
    children,
    setAttribute: (k, v) => { attrs[k] = v; },
    getAttribute: (k) => attrs[k] ?? null,
    querySelector: (sel) => children.find(c => c.classList.contains(sel.replace('.', ''))) ?? null,
  };
}
function makeRow({ withHandle = true, withRank = true } = {}) {
  const children = [];
  if (withHandle) children.push(makeEl({ tag: 'span', classes: ['drag-handle'] }));
  if (withRank)   children.push(makeEl({ tag: 'span', classes: ['rank-number'] }));
  return makeEl({ classes: ['pipeline-row'], children });
}

test('applyDragGating: write PAT + no filter → draggable, handle visible', () => {
  const row = makeRow();
  applyDragGating(row, { canWrite: true, anyFilter: false });
  assert.equal(row.getAttribute('draggable'), 'true');
  assert.ok(row.classList.contains('draggable-row'));
  assert.equal(row.dataset.dragDisabled, undefined);
  assert.ok(!row.children[0].classList.contains('hidden'),  'handle should be visible');
  assert.ok(row.children[1].classList.contains('hidden'),    'rank should be hidden');
});

test('applyDragGating: filter active → not draggable, handle hidden', () => {
  const row = makeRow();
  applyDragGating(row, { canWrite: true, anyFilter: true });
  assert.equal(row.getAttribute('draggable'), 'false');
  assert.ok(!row.classList.contains('draggable-row'));
  assert.equal(row.dataset.dragDisabled, 'true');
  assert.ok(row.children[0].classList.contains('hidden'), 'handle should be hidden');
  assert.ok(!row.children[1].classList.contains('hidden'),'rank should be visible');
});

test('applyDragGating: no write PAT → not draggable regardless of filter', () => {
  const row = makeRow();
  applyDragGating(row, { canWrite: false, anyFilter: false });
  assert.equal(row.getAttribute('draggable'), 'false');
  assert.ok(!row.classList.contains('draggable-row'));
  // No filter active, so we don't tag dragDisabled.
  assert.equal(row.dataset.dragDisabled, undefined);
});

// ─── The actual regression: filter → edit → unfilter sequence ───────────────

test('regression: row rendered non-draggable (no PAT, filter active) becomes draggable after edit mode + filter cleared', () => {
  const row = makeRow();

  // Step 1: read mode, filter active. Row is non-draggable.
  applyDragGating(row, { canWrite: false, anyFilter: true });
  assert.equal(row.getAttribute('draggable'), 'false');

  // Step 2: user enables edit mode. Re-render happens; row still renders
  // non-draggable because the filter is still active.
  applyDragGating(row, { canWrite: true, anyFilter: true });
  assert.equal(row.getAttribute('draggable'), 'false');
  assert.equal(row.dataset.dragDisabled, 'true', 'should be tagged so the OLD code path was at least correct here');

  // Step 3: user clears the filter. With the OLD code this stayed
  // draggable=false because dragDisabled wasn't set by step 1 (which is when
  // it would've mattered). With the FIX, gating is unconditional.
  applyDragGating(row, { canWrite: true, anyFilter: false });
  assert.equal(row.getAttribute('draggable'), 'true',  'BUG: drag should be re-enabled when filter cleared');
  assert.ok(row.classList.contains('draggable-row'),    'BUG: draggable-row class should be back');
  assert.equal(row.dataset.dragDisabled, undefined,     'dragDisabled flag should be cleared');
  assert.ok(!row.children[0].classList.contains('hidden'), 'handle should be visible again');
});

test('applyDragGating tolerates rows missing handle/rank children', () => {
  const row = makeRow({ withHandle: false, withRank: false });
  // Should not throw.
  applyDragGating(row, { canWrite: true, anyFilter: false });
  assert.equal(row.getAttribute('draggable'), 'true');
});
