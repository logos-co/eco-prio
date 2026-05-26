// Tests for the Journey Drivers feature (SPEC.md Part III).
// Covers the pure helpers; DOM/event behavior is verified in the smoke checklist.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const _store = new Map();
globalThis.localStorage = {
  getItem:    (k) => _store.has(k) ? _store.get(k) : null,
  setItem:    (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear:      () => _store.clear(),
};
globalThis.window = globalThis;

const { DRIVER_DEFS, DRIVER_SLUGS, DRIVER_COLOR, renderDriverCell, matchesDriverFilter } = await import('../js/pipeline.js');

// ─── DRIVER_DEFS shape ───────────────────────────────────────────────────────

test('DRIVER_DEFS: contains rfp, quest, sample-app', () => {
  const slugs = DRIVER_DEFS.map(d => d.slug);
  assert.deepEqual(slugs, ['rfp', 'quest', 'sample-app']);
});

test('DRIVER_SLUGS: matches DRIVER_DEFS slugs', () => {
  for (const d of DRIVER_DEFS) assert.ok(DRIVER_SLUGS.has(d.slug));
  assert.equal(DRIVER_SLUGS.size, DRIVER_DEFS.length);
});

test('DRIVER_COLOR: returns the defined hex for a known slug', () => {
  assert.equal(DRIVER_COLOR('rfp'), '#8C6A2E');
  assert.equal(DRIVER_COLOR('quest'), '#7A4E73');
  assert.equal(DRIVER_COLOR('sample-app'), '#5E8C6A');
});

// ─── renderDriverCell: render output ─────────────────────────────────────────

test('renderDriverCell: rfp label renders a chip with the rfp color', () => {
  const html = renderDriverCell([{ name: 'driver:rfp' }]);
  assert.match(html, /8C6A2E/i, 'chip should reference the rfp color');
  assert.match(html, />rfp</, 'chip should display the rfp label text');
});

test('renderDriverCell: two drivers render two chips', () => {
  const html = renderDriverCell([{ name: 'driver:rfp' }, { name: 'driver:quest' }]);
  assert.match(html, />rfp</);
  assert.match(html, />quest</);
});

test('renderDriverCell: no driver labels renders empty string (no placeholder)', () => {
  assert.equal(renderDriverCell([]), '');
  assert.equal(renderDriverCell([{ name: 'gui user' }, { name: 'testnet v0.1' }]), '');
});

test('renderDriverCell: unknown driver:foo is ignored (no chip, no crash)', () => {
  const html = renderDriverCell([{ name: 'driver:foo' }]);
  assert.equal(html, '', 'unknown driver slug produces no chip');
});

test('renderDriverCell: mixed known + unknown only renders the known one', () => {
  const html = renderDriverCell([{ name: 'driver:rfp' }, { name: 'driver:foo' }]);
  assert.match(html, />rfp</);
  assert.doesNotMatch(html, />foo</);
});

// ─── matchesDriverFilter: per-row filter logic ───────────────────────────────

test('matchesDriverFilter: no active filter → always matches', () => {
  assert.equal(matchesDriverFilter('rfp', null), true);
  assert.equal(matchesDriverFilter('', null), true);
  assert.equal(matchesDriverFilter('quest sample-app', null), true);
});

test('matchesDriverFilter: row carries the active driver → matches', () => {
  assert.equal(matchesDriverFilter('rfp', 'rfp'), true);
  assert.equal(matchesDriverFilter('rfp quest', 'quest'), true);
});

test('matchesDriverFilter: row does not carry the active driver → does not match', () => {
  assert.equal(matchesDriverFilter('rfp', 'quest'), false);
  assert.equal(matchesDriverFilter('', 'rfp'), false);
});

test('matchesDriverFilter: undefined dataset value coerces to no-match', () => {
  assert.equal(matchesDriverFilter(undefined, 'rfp'), false);
});
