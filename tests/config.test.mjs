// Unit tests for js/config.js — localStorage-backed config + in-memory admin mode.
// Covers SPEC.md §A:
//   - defaults when keys are absent
//   - save trims and persists; absent fields untouched
//   - clear wipes the ppd_* keys
//   - legacy ppd_pat_write / ppd_pat_read migration (one-shot)
//   - admin mode never persists; hasWritePAT gates writes
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Install a localStorage shim BEFORE importing config.js. We re-use the same
// pattern as render.test.mjs / drag-gating.test.mjs.
const _store = new Map();
globalThis.localStorage = {
  getItem:    (k) => _store.has(k) ? _store.get(k) : null,
  setItem:    (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear:      () => _store.clear(),
};

const {
  getConfig, saveConfig, clearConfig,
  isConfigured, hasPAT, hasWritePAT,
  isAdminMode, toggleAdminMode,
  getReadPAT, getWritePAT,
} = await import('../js/config.js');

// Ensure each test starts from a clean slate. Admin mode is module-scope; we
// drive it back to false explicitly when a test flipped it.
beforeEach(() => {
  _store.clear();
  // toggle until admin mode is false
  while (isAdminMode()) toggleAdminMode();
});

// ─── Defaults ────────────────────────────────────────────────────────────────

test('getConfig: empty store → defaults (logos-co / 12) and empty PAT', () => {
  const cfg = getConfig();
  assert.equal(cfg.owner, 'logos-co');
  assert.equal(cfg.projectNumber, 12);
  assert.equal(cfg.pat, '');
});

test('getConfig: explicit owner overrides default', () => {
  localStorage.setItem('ppd_owner', 'acme');
  assert.equal(getConfig().owner, 'acme');
});

test('getConfig: invalid projectNumber in storage falls back to default 12', () => {
  localStorage.setItem('ppd_project_number', 'not-a-number');
  assert.equal(getConfig().projectNumber, 12);
});

test('getConfig: numeric projectNumber parsed as integer', () => {
  localStorage.setItem('ppd_project_number', '42');
  assert.equal(getConfig().projectNumber, 42);
});

// ─── isConfigured / hasPAT ───────────────────────────────────────────────────

test('isConfigured: true with defaults (owner + project number both default)', () => {
  // Defaults are non-empty so isConfigured should be true even with empty store.
  assert.equal(isConfigured(), true);
});

test('hasPAT: false when ppd_pat absent', () => {
  assert.equal(hasPAT(), false);
});

test('hasPAT: true when ppd_pat present', () => {
  localStorage.setItem('ppd_pat', 'ghp_abc');
  assert.equal(hasPAT(), true);
});

// ─── saveConfig ──────────────────────────────────────────────────────────────

test('saveConfig: trims owner before persisting', () => {
  saveConfig({ owner: '  acme  ' });
  assert.equal(localStorage.getItem('ppd_owner'), 'acme');
});

test('saveConfig: trims pat before persisting', () => {
  saveConfig({ pat: '  ghp_token  ' });
  assert.equal(localStorage.getItem('ppd_pat'), 'ghp_token');
});

test('saveConfig: stores projectNumber as a string', () => {
  saveConfig({ projectNumber: 99 });
  assert.equal(localStorage.getItem('ppd_project_number'), '99');
  assert.equal(getConfig().projectNumber, 99);
});

test('saveConfig: empty owner removes the key', () => {
  localStorage.setItem('ppd_owner', 'previous');
  saveConfig({ owner: '' });
  assert.equal(localStorage.getItem('ppd_owner'), null);
});

test('saveConfig: empty pat removes the key', () => {
  localStorage.setItem('ppd_pat', 'previous');
  saveConfig({ pat: '' });
  assert.equal(localStorage.getItem('ppd_pat'), null);
});

test('saveConfig: undefined fields are not touched', () => {
  localStorage.setItem('ppd_owner', 'untouched');
  localStorage.setItem('ppd_pat',   'untouched-pat');
  saveConfig({ projectNumber: 5 });
  assert.equal(localStorage.getItem('ppd_owner'), 'untouched');
  assert.equal(localStorage.getItem('ppd_pat'),   'untouched-pat');
  assert.equal(localStorage.getItem('ppd_project_number'), '5');
});

// ─── clearConfig ─────────────────────────────────────────────────────────────

test('clearConfig: wipes owner, project_number and pat', () => {
  localStorage.setItem('ppd_owner', 'acme');
  localStorage.setItem('ppd_project_number', '7');
  localStorage.setItem('ppd_pat', 'ghp_x');
  clearConfig();
  assert.equal(localStorage.getItem('ppd_owner'), null);
  assert.equal(localStorage.getItem('ppd_project_number'), null);
  assert.equal(localStorage.getItem('ppd_pat'), null);
});

// ─── Legacy PAT migration (one-shot per getConfig) ──────────────────────────

test('migrate: ppd_pat_write → ppd_pat when target absent, old key removed', () => {
  localStorage.setItem('ppd_pat_write', 'ghp_write');
  const cfg = getConfig();
  assert.equal(cfg.pat, 'ghp_write');
  assert.equal(localStorage.getItem('ppd_pat'), 'ghp_write');
  assert.equal(localStorage.getItem('ppd_pat_write'), null);
});

test('migrate: ppd_pat_read fallback when no write key', () => {
  localStorage.setItem('ppd_pat_read', 'ghp_read');
  const cfg = getConfig();
  assert.equal(cfg.pat, 'ghp_read');
  assert.equal(localStorage.getItem('ppd_pat_read'), null);
});

test('migrate: write key wins over read key when both present', () => {
  localStorage.setItem('ppd_pat_write', 'ghp_write');
  localStorage.setItem('ppd_pat_read',  'ghp_read');
  assert.equal(getConfig().pat, 'ghp_write');
});

test('migrate: existing ppd_pat is NOT overwritten (legacy keys still cleared)', () => {
  localStorage.setItem('ppd_pat',       'ghp_current');
  localStorage.setItem('ppd_pat_write', 'ghp_old_write');
  const cfg = getConfig();
  assert.equal(cfg.pat, 'ghp_current');
  assert.equal(localStorage.getItem('ppd_pat_write'), null, 'legacy key should still be wiped');
});

// ─── Admin mode — in-memory only ─────────────────────────────────────────────

test('isAdminMode: defaults to false', () => {
  assert.equal(isAdminMode(), false);
});

test('toggleAdminMode: flips state and returns the new value', () => {
  assert.equal(toggleAdminMode(), true);
  assert.equal(isAdminMode(), true);
  assert.equal(toggleAdminMode(), false);
  assert.equal(isAdminMode(), false);
});

test('hasWritePAT: false unless BOTH pat is set AND admin mode is on', () => {
  // no PAT, no admin: false
  assert.equal(hasWritePAT(), false);

  // PAT set but admin off: false
  localStorage.setItem('ppd_pat', 'ghp_x');
  assert.equal(hasWritePAT(), false);

  // PAT set + admin on: true
  toggleAdminMode();
  assert.equal(hasWritePAT(), true);

  // Admin on but PAT removed: false
  localStorage.removeItem('ppd_pat');
  assert.equal(hasWritePAT(), false);
});

test('getReadPAT: returns the stored token regardless of admin mode', () => {
  localStorage.setItem('ppd_pat', 'ghp_read');
  assert.equal(getReadPAT(), 'ghp_read');
  toggleAdminMode();
  assert.equal(getReadPAT(), 'ghp_read');
});

test('getReadPAT: empty string when no token stored', () => {
  assert.equal(getReadPAT(), '');
});

test('getWritePAT: empty string outside admin mode even when PAT stored', () => {
  localStorage.setItem('ppd_pat', 'ghp_x');
  assert.equal(getWritePAT(), '');
});

test('getWritePAT: returns the stored token when admin mode is on', () => {
  localStorage.setItem('ppd_pat', 'ghp_x');
  toggleAdminMode();
  assert.equal(getWritePAT(), 'ghp_x');
});
