// Tests for the deterministic color/team helpers in js/app.js + js/teams.js.
// SPEC.md §E asserts:
//   - same team name → same color across rows / page reloads
//   - "red team" and "anon-comms" use fixed override hues
//   - "+30" hue shift skips muddy yellow-green (we lock the actual range here:
//     hue ∈ [170, 330) for non-override names)
//   - repoToTeam maps known repos and falls back to the repo basename
import { test } from 'node:test';
import assert from 'node:assert/strict';

// app.js touches localStorage / window at import time.
const _store = new Map();
globalThis.localStorage = {
  getItem:    (k) => _store.has(k) ? _store.get(k) : null,
  setItem:    (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear:      () => _store.clear(),
};
globalThis.window = globalThis;

const { teamColor, teamBgClass } = await import('../js/app.js');
const { repoToTeam, REPO_TEAMS } = await import('../js/teams.js');

// ─── teamColor: determinism ──────────────────────────────────────────────────

test('teamColor: same name → same color (deterministic)', () => {
  assert.equal(teamColor('blockchain'), teamColor('blockchain'));
});

test('teamColor: different names → likely different colors (smoke)', () => {
  // Not a strict guarantee but covers basic hashing — these two names happen
  // to land on different hues.
  assert.notEqual(teamColor('blockchain'), teamColor('storage'));
});

test('teamColor: alpha threads through into the hsla string', () => {
  const c = teamColor('blockchain', 0.15);
  assert.match(c, /hsla\(\d+, \d+%, \d+%, 0\.15\)/);
});

test('teamColor: different alpha for same name produces different output but same hue', () => {
  const full = teamColor('blockchain', 1);
  const tinted = teamColor('blockchain', 0.15);
  const hue = (s) => Number(s.match(/hsla\((\d+),/)[1]);
  assert.equal(hue(full), hue(tinted), 'hue must match across alpha values');
  assert.notEqual(full, tinted);
});

test('teamColor: null/empty team name uses the neutral grey-blue', () => {
  assert.match(teamColor(null), /^hsla\(220, 15%, 40%,/);
  assert.match(teamColor(''),   /^hsla\(220, 15%, 40%,/);
});

// ─── teamColor: fixed overrides ──────────────────────────────────────────────

test('teamColor: "red team" pins to red hue (0)', () => {
  assert.match(teamColor('red team'), /^hsla\(0, 70%, 55%,/);
});

test('teamColor: override is case-insensitive', () => {
  assert.equal(teamColor('red team'), teamColor('RED TEAM'));
  assert.equal(teamColor('anon-comms'), teamColor('ANON-COMMS'));
});

test('teamColor: "anon-comms" pins to blue hue (220)', () => {
  assert.match(teamColor('anon-comms'), /^hsla\(220, 60%, 50%,/);
});

// ─── teamColor: hue range for hashed names ──────────────────────────────────

test('teamColor: hashed hue lands in [170, 330) — skips yellow-green band', () => {
  const names = ['core', 'storage', 'zones', 'messaging', 'smart-contract', 'devkit', 'blockchain'];
  for (const n of names) {
    const c = teamColor(n);
    const h = Number(c.match(/hsla\((\d+),/)[1]);
    assert.ok(h >= 170 && h < 330, `${n} produced hue ${h} outside [170, 330)`);
  }
});

// ─── teamBgClass: thin wrapper around teamColor(name, 0.15) ─────────────────

test('teamBgClass: equals teamColor(name, 0.15)', () => {
  assert.equal(teamBgClass('blockchain'), teamColor('blockchain', 0.15));
});

// ─── repoToTeam ──────────────────────────────────────────────────────────────

test('repoToTeam: known mappings resolve to display name', () => {
  assert.equal(repoToTeam('logos-co/ecosystem'),                    'dogfooding');
  assert.equal(repoToTeam('logos-co/logos-docs'),                   'docs');
  assert.equal(repoToTeam('logos-blockchain/logos-execution-zone'), 'zones');
});

test('repoToTeam: unknown repo falls back to the basename', () => {
  assert.equal(repoToTeam('acme/widgets'), 'widgets');
  assert.equal(repoToTeam('foo/bar-baz'),  'bar-baz');
});

test('REPO_TEAMS: every value is a non-empty string', () => {
  for (const [k, v] of Object.entries(REPO_TEAMS)) {
    assert.ok(k.includes('/'),  `key "${k}" should be an owner/repo string`);
    assert.ok(typeof v === 'string' && v.length > 0, `value for ${k} is invalid`);
  }
});
