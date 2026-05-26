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

const { DRIVER_DEFS, DRIVER_SLUGS, DRIVER_COLOR, renderDriverCell } = await import('../js/pipeline.js');

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
