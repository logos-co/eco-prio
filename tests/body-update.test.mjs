// Unit tests for the body-mutation helpers in js/markdown.js.
// These are pure functions: input body string → mutated body string.
// SPEC.md §H names them as the persistence path for detail-panel saves —
// extractors round-trip what these helpers write.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  setRnDField, setRnDMilestones,
  setDocPacketLink, setDocTracking, setDocPr,
  setRedTeamTracking,
  newIssueBody,
  extractRnD, extractDocPacket, extractDocumentation, extractRedTeam,
} from '../js/markdown.js';

const minimalRnD = '## R&D\n- team:\n- milestone:\n- date:\n';

// ─── setRnDField ─────────────────────────────────────────────────────────────

test('setRnDField: updates existing team field in place', () => {
  const updated = setRnDField(minimalRnD, 'team', 'core');
  assert.equal(extractRnD(updated).team, 'core');
});

test('setRnDField: updates existing date field', () => {
  const updated = setRnDField(minimalRnD, 'date', '15Mar26');
  assert.equal(extractRnD(updated).date, '15Mar26');
});

test('setRnDField: clearing a field (empty string) leaves the line but null value', () => {
  const populated = '## R&D\n- team: zones\n- milestone:\n- date: 15Mar26\n';
  const cleared = setRnDField(populated, 'date', '');
  assert.equal(extractRnD(cleared).date, null);
  assert.equal(extractRnD(cleared).team, 'zones', 'other fields preserved');
});

test('setRnDField: clearing a field with null behaves like empty string', () => {
  const populated = '## R&D\n- team: zones\n- milestone:\n- date: 15Mar26\n';
  const cleared = setRnDField(populated, 'team', null);
  assert.equal(extractRnD(cleared).team, null);
  assert.equal(extractRnD(cleared).date, '15Mar26');
});

test('setRnDField: no ## R&D section + non-empty value → creates section', () => {
  const result = setRnDField('', 'team', 'core');
  assert.equal(extractRnD(result).team, 'core');
});

test('setRnDField: no ## R&D section + empty value → leaves body unchanged', () => {
  const result = setRnDField('description only', 'team', '');
  assert.equal(result, 'description only');
});

test('setRnDField: idempotent — writing the same value twice produces identical output', () => {
  const once = setRnDField(minimalRnD, 'team', 'core');
  const twice = setRnDField(once, 'team', 'core');
  assert.equal(once, twice);
});

test('setRnDField: only touches the named section, leaves Doc Packet untouched', () => {
  const body = '## R&D\n- team: zones\n\n## Doc Packet\n- link: https://x\n';
  const updated = setRnDField(body, 'team', 'core');
  assert.equal(extractDocPacket(updated), 'https://x');
});

// ─── setRnDMilestones ────────────────────────────────────────────────────────

test('setRnDMilestones: writes multiple milestone lines in order', () => {
  const updated = setRnDMilestones(minimalRnD, ['https://a', 'https://b', 'https://c']);
  assert.deepEqual(extractRnD(updated).milestones, ['https://a', 'https://b', 'https://c']);
});

test('setRnDMilestones: replaces existing milestones entirely', () => {
  const body = '## R&D\n- team: zones\n- milestone: https://old1\n- milestone: https://old2\n- date:\n';
  const updated = setRnDMilestones(body, ['https://new']);
  assert.deepEqual(extractRnD(updated).milestones, ['https://new']);
});

test('setRnDMilestones: empty array clears all milestones', () => {
  const body = '## R&D\n- team: zones\n- milestone: https://x\n- milestone: https://y\n- date:\n';
  const updated = setRnDMilestones(body, []);
  assert.deepEqual(extractRnD(updated).milestones, []);
});

test('setRnDMilestones: preserves team and date around the milestone lines', () => {
  const body = '## R&D\n- team: blockchain\n- milestone: https://x\n- date: 15Mar26\n';
  const updated = setRnDMilestones(body, ['https://a', 'https://b']);
  const rnd = extractRnD(updated);
  assert.equal(rnd.team, 'blockchain');
  assert.equal(rnd.date, '15Mar26');
  assert.deepEqual(rnd.milestones, ['https://a', 'https://b']);
});

test('setRnDMilestones: no ## R&D section → creates the section with milestones', () => {
  const updated = setRnDMilestones('description only', ['https://x']);
  assert.deepEqual(extractRnD(updated).milestones, ['https://x']);
});

// ─── setDocPacketLink ────────────────────────────────────────────────────────

test('setDocPacketLink: writes the link in an existing section', () => {
  const body = '## Doc Packet\n- link:\n';
  const updated = setDocPacketLink(body, 'https://github.com/logos-co/logos-docs/issues/1');
  assert.equal(extractDocPacket(updated), 'https://github.com/logos-co/logos-docs/issues/1');
});

test('setDocPacketLink: clearing returns extractDocPacket → null', () => {
  const body = '## Doc Packet\n- link: https://x\n';
  const updated = setDocPacketLink(body, '');
  assert.equal(extractDocPacket(updated), null);
});

test('setDocPacketLink: missing section + non-empty link → creates section', () => {
  const updated = setDocPacketLink('preamble', 'https://x');
  assert.equal(extractDocPacket(updated), 'https://x');
});

// ─── setDocTracking / setDocPr ───────────────────────────────────────────────

test('setDocTracking: writes the tracking URL in an existing Documentation section', () => {
  const body = '## Documentation\n- tracking:\n- pr:\n';
  const updated = setDocTracking(body, 'https://github.com/logos-co/logos-docs/issues/1');
  assert.equal(extractDocumentation(updated).tracking, 'https://github.com/logos-co/logos-docs/issues/1');
});

test('setDocPr: writing the PR URL does not disturb tracking', () => {
  const body = '## Documentation\n- tracking: https://github.com/logos-co/logos-docs/issues/1\n- pr:\n';
  const updated = setDocPr(body, 'https://github.com/logos-co/logos-docs/pull/9');
  const docs = extractDocumentation(updated);
  assert.equal(docs.tracking, 'https://github.com/logos-co/logos-docs/issues/1');
  assert.equal(docs.pr, 'https://github.com/logos-co/logos-docs/pull/9');
});

test('setDocPr: clearing leaves tracking intact', () => {
  const body = '## Documentation\n- tracking: https://github.com/logos-co/logos-docs/issues/1\n- pr: https://github.com/logos-co/logos-docs/pull/9\n';
  const updated = setDocPr(body, '');
  assert.equal(extractDocumentation(updated).tracking, 'https://github.com/logos-co/logos-docs/issues/1');
  assert.equal(extractDocumentation(updated).pr, null);
});

// ─── setRedTeamTracking ──────────────────────────────────────────────────────

test('setRedTeamTracking: writes URL in existing section', () => {
  const body = '## Red Team\n- tracking:\n';
  const updated = setRedTeamTracking(body, 'https://github.com/logos-co/ecosystem/issues/5');
  assert.equal(extractRedTeam(updated).tracking, 'https://github.com/logos-co/ecosystem/issues/5');
});

test('setRedTeamTracking: clearing returns extractRedTeam → null', () => {
  const updated = setRedTeamTracking('## Red Team\n- tracking: https://x\n', '');
  assert.equal(extractRedTeam(updated).tracking, null);
});

// ─── newIssueBody ────────────────────────────────────────────────────────────

test('newIssueBody: contains all four ## sections', () => {
  const body = newIssueBody();
  assert.match(body, /^## R&D$/m);
  assert.match(body, /^## Doc Packet$/m);
  assert.match(body, /^## Documentation$/m);
  assert.match(body, /^## Red Team$/m);
});

test('newIssueBody: all fields parse as null/empty when no team passed', () => {
  const body = newIssueBody();
  const rnd = extractRnD(body);
  assert.equal(rnd.team, null);
  assert.deepEqual(rnd.milestones, []);
  assert.equal(rnd.date, null);
  assert.equal(extractDocPacket(body), null);
  assert.deepEqual(extractDocumentation(body), { tracking: null, pr: null });
  assert.deepEqual(extractRedTeam(body), { tracking: null });
});

test('newIssueBody: pre-fills team when provided', () => {
  const body = newIssueBody('zones');
  assert.equal(extractRnD(body).team, 'zones');
});

// ─── End-to-end roundtrip: detail-panel save → re-render parse ──────────────

test('roundtrip: write all fields via setters, read back with extractors', () => {
  let body = newIssueBody();
  body = setRnDField(body, 'team', 'core');
  body = setRnDMilestones(body, ['https://roadmap.logos.co/x/y', 'https://roadmap.logos.co/x/z']);
  body = setRnDField(body, 'date', '15Mar26');
  body = setDocPacketLink(body, 'https://github.com/logos-co/logos-docs/issues/1');
  body = setDocTracking(body, 'https://github.com/logos-co/logos-docs/issues/2');
  body = setDocPr(body, 'https://github.com/logos-co/logos-docs/pull/3');
  body = setRedTeamTracking(body, 'https://github.com/logos-co/ecosystem/issues/5');

  const rnd = extractRnD(body);
  assert.equal(rnd.team, 'core');
  assert.deepEqual(rnd.milestones, ['https://roadmap.logos.co/x/y', 'https://roadmap.logos.co/x/z']);
  assert.equal(rnd.date, '15Mar26');
  assert.equal(extractDocPacket(body), 'https://github.com/logos-co/logos-docs/issues/1');
  assert.deepEqual(extractDocumentation(body), {
    tracking: 'https://github.com/logos-co/logos-docs/issues/2',
    pr:       'https://github.com/logos-co/logos-docs/pull/3',
  });
  assert.deepEqual(extractRedTeam(body), { tracking: 'https://github.com/logos-co/ecosystem/issues/5' });
});
