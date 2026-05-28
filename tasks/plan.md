# Plan: Journey Drivers

## Context

`SPEC.md` Part III (lines 446–565) describes a new Journey Drivers feature: `driver:*` labels (fixed allowlist `rfp`, `quest`, `sample-app`) rendered as a dedicated "Driver" column in the pipeline, with a single-select filter pill and an admin-mode picker in the detail panel. Drivers are *informational* — they make the *why* behind each journey's priority legible to leadership and R&D leads, but they do not gate anything (no sort, no status transitions, no Fix Labels involvement).

Today the board shows *what* (persona, release) and *where* (status, blocked-by) but not *why this work earned its slot*. The driver column is the visible justification.

Ideation one-pager: `docs/ideas/journey-drivers.md`. The previous `tasks/plan.md` / `tasks/todo.md` content (testnet-filter consolidation) is replaced here — that work shipped in commits `42907d5` and `98adbdf` (verified: `RELEASE_COLORS` map is gone from `renderPipelineRow`).

Intended outcome: drivers are visible on the board, filterable, editable in-app by admins, and SPEC.md Part III is converted to retrospective form.

---

## Pre-plan decisions (resolving spec §7 open questions)

**Chip colors.** Three earth/muted hues, disjoint from every existing palette:

- `driver:rfp` → `#8C6A2E` muted gold
- `driver:quest` → `#7A4E73` plum (no other label uses purple)
- `driver:sample-app` → `#5E8C6A` cool sage (distinct from `#6AAE7B` blocked-by:docs green)

**Column width.** `7rem`. Longest chip text `sample-app` (~9 chars) fits. Verify at 1280px during Task 1 — if title squeezed, drop to `6rem`.

**Label creation timing.** `ensureDriverLabels(owner, repo, pat)` in `js/api.js`, called lazily inside `window._toggleDriver` before the first `addLabels`. Mirrors the existing pattern (`ensureLifecycleLabels` is also write-path-only, called only at `pipeline.js:1095`).

**Detail panel placement.** New "Drivers" section between workflow div (`js/detail.js:143`) and External blockers (`js/detail.js:145`). Drivers (*why*) before blockers (*what's stopping it*).

**Closed-section parity.** Same rendering as open. `columnHeader` is shared (lines 185 and 205 in `pipeline.js`).

---

## Dependency graph

```
[Task 1: constants + grid widening + empty Driver column]
                       │
                       ▼  CHECKPOINT A — eyeball at 1280px
[Task 2: render driver chips + data-drivers attr + render tests]
                       │
                       ▼
[Task 3: filter row + URL round-trip + filter tests]
                       │
                       ▼  CHECKPOINT B — read-only feature complete
[Task 4: detail picker + ensureDriverLabels + write path]
                       │
                       ▼  CHECKPOINT C — UX review of picker
[Task 5: closed-section verify + SPEC.md retro conversion + README]
```

Strictly linear. Tasks 1–3 = read-only feature; Task 4 = write path; Task 5 = paperwork.

---

## Task slices

### T1 — Constants + column shell

Add `DRIVER_DEFS` and lookup helpers; widen the grid 6→7 columns; render an empty "Driver" column cell.

**Files**
- `js/pipeline.js:22-31` — append `DRIVER_DEFS`, `DRIVER_SLUG_TO_LABEL`, `DRIVER_SLUGS`, `DRIVER_COLOR` after `TYPE_DEFS`.
- `js/pipeline.js:118` and `js/pipeline.js:717` — grid template `1fr_8rem_9rem_12rem_9rem_2rem` → `1fr_8rem_7rem_9rem_12rem_9rem_2rem` (both occurrences).
- `js/pipeline.js:120-126` — insert `<div>Driver</div>` between Type (121) and Release (122).
- `js/pipeline.js` row body (after line 752) — empty `<div class="hidden md:flex items-center flex-wrap gap-1"></div>` for the new column slot.

**Acceptance**
- AC1.1 Driver header appears between Type and Release in both open and closed sections.
- AC1.2 Every row has an empty Driver cell (no `—`, no hint).
- AC1.3 At 1280px viewport, the title column is not visibly squeezed.
- AC1.4 `npm test` green; `npm run lint` clean.

**Verification.** `npm run serve`, eyeball at 1280px. Run existing test suite.

**Checkpoint A:** confirm column width/header placement before more code lands.

---

### T2 — Render driver chips + `data-drivers` + tests

Read `driver:*` labels, render chips, expose `data-drivers` for filter consumption.

**Files**
- `js/pipeline.js` after line 682 — derive `driverLabels` and `driverSlugs` (filter through `DRIVER_SLUGS`; unknown `driver:foo` silently dropped).
- `js/pipeline.js` ~line 695 — `driverPill(slug, label)` helper using `DRIVER_COLOR(slug)`; styling matches `labelPill` (opacity stops `18` bg, `50` border).
- `js/pipeline.js` after line 700 — `driverHtml = driverLabels.length ? driverLabels.map(driverPill).join(' ') : '';` (empty string, no placeholder).
- `js/pipeline.js:709` — add `data-drivers="${escapeHtml(driverSlugs.join(' '))}"` to wrapper.
- `js/pipeline.js` — fill Task 1's empty cell with `${driverHtml}`.
- `tests/drivers.test.mjs` (NEW) — extract pure helper `renderDriverCell(labels)` and test SPEC.md Part III §5 tests 1–4.
- `package.json:8` — append `tests/drivers.test.mjs` to the `test` script.

**Acceptance**
- AC2.1 Journey with `driver:rfp` shows gold chip in column.
- AC2.2 Multi-driver journey shows both chips.
- AC2.3 No-driver journey has empty cell.
- AC2.4 Unknown `driver:foo` ignored; no crash.
- AC2.5 `data-drivers` attribute correct.
- AC2.6 All new tests pass.

**Verification.** New test file + smoke against a real repo with one `driver:rfp`-labeled issue (create manually via GitHub UI).

---

### T3 — Filter row + URL round-trip

Single-select Driver pill row; integrates into `applyFilter`; URL sync and restore.

**Files**
- `js/pipeline.js:19` — `let activeDriverFilter = null;`
- `js/pipeline.js` ~line 93 — URL restore using `DRIVER_SLUGS.has(_driverParam)` guard.
- `js/pipeline.js:109` — extend `canDrag` with `&& !activeDriverFilter`.
- `js/pipeline.js:228-238` — copy type-pill restore block including orphan-filter-drop pattern.
- `js/pipeline.js:244` — add `activeDriverFilter` to the any-filter-active condition.
- `js/pipeline.js` inside `renderFilterBar` ~line 321 — collect `driverSet` from open items; emit Driver row between Persona and Team. Final order: Persona → Driver → Team → Release → Blocked-by.
- `js/pipeline.js` — add `driverPillActivate` / `driverPillReset` (same `18`/`33`/`66`/`cc` opacity stops as type).
- `js/pipeline.js` `attachFilterHandlers()` after line 656 — single-select toggle.
- `js/pipeline.js:446` — add `activeDriverFilter` to `anyFilter` OR.
- `js/pipeline.js` after line 502 — `matchesDriver` block reading `wrapper.dataset.drivers`; extend `matches` at line 504.
- `js/pipeline.js:515` area — `if (activeDriverFilter) params.set('driver', activeDriverFilter);`
- `tests/drivers.test.mjs` — extend with filter, URL round-trip, and unknown-slug-ignored tests.

**Acceptance**
- AC3.1 "Driver:" pill row between Persona and Team rows (one pill per driver present on open items).
- AC3.2 Click pill → filters to that driver; URL gains `?driver=<slug>`.
- AC3.3 Click same pill → deactivates; URL drops param.
- AC3.4 Click different pill → switches (single-select).
- AC3.5 Composes with other filters (AND across rows).
- AC3.6 Any driver active → drag disabled.
- AC3.7 Reload preserves; `?driver=unknown` silently ignored.
- AC3.8 All tests green.

**Verification.** Smoke 1, 3–9 from SPEC.md Part III §5.

**Checkpoint B:** read-only feature complete and shippable on its own.

---

### T4 — Detail panel picker + write path

Allowlist-scoped driver multi-select in admin-mode detail panel; lazy label creation; row+panel resync after toggle.

**Files**
- `js/api.js` after line 621 — `ensureDriverLabels(owner, repo, pat)` with own `_ensuredDriverRepos = new Set()`, calling `createLabel` for each of `{rfp:8C6A2E, quest:7A4E73, sample-app:5E8C6A}` (6-char hex, no `#`).
- `js/detail.js` between lines 143 and 145 — new "Drivers" section: heading, chip row, admin-only **three fixed toggle buttons** over `DRIVER_DEFS` (NOT free-form input per spec §6).
- `js/detail.js` — helpers `renderDriverChips(driverLabels, item, canWrite)`, `renderDriverPicker(item, currentSlugs)`. Import `DRIVER_DEFS` from `pipeline.js` (or factor a tiny shared module if circular imports surface).
- `js/detail.js` `registerLabelHandlers()` after line 926 — `window._toggleDriver = async (itemId, slug, currentlyOn) => { ... }`:
  1. Get write PAT.
  2. `await ensureDriverLabels(owner, repo, pat)`.
  3. `addLabels` or `removeLabel` for `driver:<slug>`.
  4. Toast on success/failure.
  5. Refresh the detail-panel chip row.
  6. **Update the pipeline row's `data-drivers` AND re-render the row's Driver cell.** Without this the filter would lie until full re-render.
- `js/detail.js` — `refreshDriverChips(itemId, owner, repo, issueNumber, pat)` mirroring `refreshBlockedLabels` at line 1128.
- `tests/drivers.test.mjs` — picker render tests (admin sees three toggles, non-admin sees nothing; unknown driver labels don't appear as toggles).

**Acceptance**
- AC4.1 Admin + open detail → driver section with three toggles reflecting current state.
- AC4.2 Non-admin → picker hidden; chips visible.
- AC4.3 Toggling fires correct label write; toast appears.
- AC4.4 After toggle, both detail-panel chips AND pipeline-row chip cell + `data-drivers` update without reload.
- AC4.5 First-ever toggle in a repo silently creates the three driver labels.
- AC4.6 Fix Labels does NOT touch `driver:*` labels (grep `STATUS_LABEL_NAMES`, `LIFECYCLE_BLOCKED_BY`, `computeDesiredLabels` — no `driver:` references should exist).

**Verification.** Smoke 10–13 from SPEC.md Part III §5.

**Checkpoint C:** UX review of picker — does the toggle interaction feel right?

---

### T5 — Closed-section verify + spec retro + docs

Verify closed parity; convert SPEC.md Part III to retrospective; update Part I cross-references.

**Files**
- `SPEC.md` lines 446–565 — convert Part III to retrospective, mirror Part II's voice.
- `SPEC.md` Part I §C, §D, §H — add driver mentions.
- `docs/ideas/journey-drivers.md` — add "Shipped — see SPEC.md Part III" pointer at top. Do not delete.
- `README.md` — one-line picker mention in editing instructions.
- Code: none expected. If smoke §12 reveals closing strips drivers, file a follow-up rather than coupling.

**Acceptance**
- AC5.1 Smoke §12: closing a journey leaves `driver:*` labels intact.
- AC5.2 SPEC.md Part III is past-tense retrospective.
- AC5.3 Part I §C/§D/§H mention drivers.
- AC5.4 README mentions the picker.
- AC5.5 All previous tests still green; `npm run lint` clean.

**Verification.** Full smoke §1–14 from SPEC.md Part III.

---

## Critical files

| File | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| `js/pipeline.js` | constants, grid×2, header, empty cell | chip render, data-attr | state, filter row, applyFilter, URL | — | — |
| `js/detail.js` | — | — | — | section, picker, handlers, refresh | — |
| `js/api.js` | — | — | — | `ensureDriverLabels` | — |
| `tests/drivers.test.mjs` | — | create | extend | extend | — |
| `package.json` | — | add test file | — | — | — |
| `SPEC.md` | — | — | — | — | retro convert + Part I updates |
| `docs/ideas/journey-drivers.md` | — | — | — | — | shipped pointer |
| `README.md` | — | — | — | — | picker mention |

`index.html`, `css/app.css`: no changes expected. Styling is inline per repo convention.

---

## Reused code (do not reinvent)

- `js/pipeline.js:22-31` `TYPE_DEFS` block — template for `DRIVER_DEFS`.
- `js/pipeline.js:228-243` type-pill restore + orphan-filter drop — template for driver-pill restore.
- `js/pipeline.js:362-374` `typePill` + persona row emission — template for `driverPill` + driver row.
- `js/pipeline.js:444-509` `applyFilter` composition — extend with `matchesDriver`.
- `js/pipeline.js:641-656` type-pill single-select click handler — template for driver-pill handler.
- `js/pipeline.js:686-695` `labelPill` chip shape — template for `driverPill` row chip.
- `js/api.js:339-370` `createLabel` (idempotent, swallows 422) — call from `ensureDriverLabels`.
- `js/api.js:582-621` `ensureLifecycleLabels` shape — template for `ensureDriverLabels`.
- `js/detail.js:789-806` `renderBlockedLabels` chip + remove-button shape — template for `renderDriverChips`.
- `js/detail.js:1128-1143` `refreshBlockedLabels` — template for `refreshDriverChips`.

---

## Risks & mitigations

1. **Grid squeeze at 1280px.** A 7th column may compress the title. **Mitigation:** Task 1 = explicit eyeball checkpoint. If squeezed, narrow Driver to `6rem`; if still tight, drop Release to `8rem`.
2. **Detail-panel write desyncs `data-drivers`.** Toggling without refreshing the row attr breaks the filter until full re-render. **Mitigation:** AC4.4 explicitly requires both surfaces; smoke step "toggle in detail, activate driver filter, confirm row visibility matches."
3. **First write fails because labels don't exist.** Lazy `ensureDriverLabels` runs before first `addLabels`; if PAT lacks `repo` scope it silently no-ops and subsequent `addLabels` 404s. **Mitigation:** `addLabels` already surfaces errors via `showToast`. Accept the existing pattern's behavior for v1; document deferred improvement in the retro.

---

## Out of scope

- Drag-sort changes.
- Fix Labels / `computeDesiredLabels` / `ensureLifecycleLabels` integration.
- Multi-select driver filter (spec §6 "Ask first").
- Body-field link to driver artifact (spec §6 "Ask first").
- Projects v2 custom field migration.
- Driver-aware status transitions.
- Per-row tinting, title badges, or any driver surface outside the column + pill + picker.
- Mobile layout changes — driver column is `hidden md:flex` like Type and Release.
- A generic in-app label editor.
- Adding a 4th driver type.
- Touching `docs/ideas/journey-drivers.md` beyond the "shipped" pointer.

---

## Verification (end-to-end after T5)

1. `npm test` — all suites green, including `tests/drivers.test.mjs`.
2. `npm run lint` — clean.
3. `node --check js/pipeline.js js/detail.js js/api.js` — syntax clean.
4. `npm run serve`, open at 1280px viewport with a write PAT against logos-co project #12.
5. Walk SPEC.md Part III §5 smoke checklist items 1–14 end to end.
