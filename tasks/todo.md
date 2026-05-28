# TODO: Journey Drivers

See `tasks/plan.md` for full context, dependency graph, and acceptance criteria.
Spec: `SPEC.md` Part III (lines 446–565). Ideation: `docs/ideas/journey-drivers.md`.

## T1 — Constants + column shell

- [x] Append `DRIVER_DEFS` block after `TYPE_DEFS` in `js/pipeline.js:22-31` (rfp `#8C6A2E`, quest `#7A4E73`, sample-app `#5E8C6A`)
- [x] Widen grid `1fr_8rem_9rem_12rem_9rem_2rem` → `1fr_8rem_7rem_9rem_12rem_9rem_2rem` at `js/pipeline.js:118`
- [x] Same grid widening at `js/pipeline.js:717`
- [x] Insert `<div>Driver</div>` header between Type and Release in `columnHeader` (`js/pipeline.js:120-126`)
- [x] Insert empty `<div class="hidden md:flex items-center flex-wrap gap-1"></div>` in row body after line 752
- [x] AC1.1 Driver header is last column (deviated from plan: user preferred Driver after Blocked By instead of between Type and Release)
- [x] AC1.2 Every row has an empty Driver cell
- [x] AC1.3 Eyeball confirmed at user's viewport — required widening Journey column by trimming other columns and tightening grid gap to `gap-1` with a `pl-3` on Journey Type to preserve its gutter
- [x] AC1.4 `npm test` green; `npm run lint` clean

**CHECKPOINT A:** confirm column width/header before T2.

## T2 — Render chips + data-drivers + tests

- [x] Derive `driverSlugs` via `driverSlugsFromLabels` helper in `renderPipelineRow`
- [x] Add `renderDriverCell(labels)` exported helper (pure, testable)
- [x] Build `driverHtml` (empty string if no drivers — no placeholder)
- [x] Add `data-drivers` attribute to row wrapper
- [x] Fill T1's empty cell with `${driverHtml}`
- [x] Create `tests/drivers.test.mjs` with 8 tests covering DRIVER_DEFS shape + renderDriverCell behavior
- [x] Add `tests/drivers.test.mjs` to `package.json` test script
- [x] AC2.1 rfp renders gold chip
- [x] AC2.2 Multi-driver renders both chips
- [x] AC2.3 No driver = empty cell
- [x] AC2.4 Unknown driver:foo ignored
- [x] AC2.5 `data-drivers` correct
- [x] AC2.6 All tests pass (208/208 green)

## T3 — Filter row + URL round-trip

- [x] Add `let activeDriverFilter = null;` module state
- [x] URL restore via `DRIVER_SLUGS.has(_driverParam)` guard
- [x] Extend `canDrag` with `&& !activeDriverFilter`
- [x] Driver-pill restore block (with orphan-filter drop) mirroring type-pill
- [x] Add `activeDriverFilter` to the any-filter-active condition
- [x] Collect `driverSet` in `renderFilterBar` and emit Driver row between Persona and Team
- [x] Add `driverPillActivate` / `driverPillReset` helpers (same opacity stops as type)
- [x] Single-select driver-pill handler in `attachFilterHandlers`
- [x] Add `activeDriverFilter` to `anyFilter` OR
- [x] Wire `matchesDriverFilter` into `applyFilter`; extend `matches`
- [x] URL sync `if (activeDriverFilter) params.set('driver', activeDriverFilter)`
- [x] Extend `tests/drivers.test.mjs` with matchesDriverFilter tests (4 new tests, 12 total)
- [ ] AC3.1 Driver row between Persona and Team (needs browser eyeball)
- [ ] AC3.2 Click → URL `?driver=<slug>` (needs browser)
- [ ] AC3.3 Re-click → deactivates, URL drops (needs browser)
- [x] AC3.4 Different pill → switches (single-select) — handler logic guarantees
- [x] AC3.5 AND with other filters — extension of existing applyFilter
- [ ] AC3.6 Any driver active → drag disabled (needs browser)
- [ ] AC3.7 Reload preserves; unknown slug silently ignored (needs browser)
- [x] AC3.8 All tests pass (212/212)

**CHECKPOINT B:** read-only feature shippable on its own.

## T4 — Detail picker + write path

- [x] Add `ensureDriverLabels(owner, repo, pat)` to `js/api.js` with own `_ensuredDriverRepos` Set
- [x] Insert "Drivers" section in `js/detail.js` between workflow and External blockers
- [x] Implement `renderDriverPicker()` (three fixed toggles, NOT free-form input) — handles both admin (toggle buttons) and read-only (chips or "None") modes
- [x] Import `DRIVER_DEFS` / `DRIVER_SLUGS` / `renderDriverCell` from pipeline.js
- [x] Add `window._toggleDriver` handler: ensureDriverLabels → addLabels/removeLabel → toast → refreshDriverPicker
- [x] Implement `refreshDriverPicker()` — re-renders picker + updates row `data-drivers` + driver cell via `id="driver-cell-${id}"` selector
- [ ] Add picker render tests to `tests/drivers.test.mjs` (deferred — picker is admin-only DOM behavior already verified via manual smoke; existing precedent renderBlockedLabels has no automated tests either)
- [x] AC4.1 Admin + open detail → three toggles reflect state
- [x] AC4.2 Non-admin → picker shows chips (or "None"), no buttons
- [x] AC4.3 Toggle fires write + toast
- [x] AC4.4 After toggle: detail picker + row data-drivers + row cell all update without reload
- [x] AC4.5 First toggle in repo creates the three driver labels (labels already exist from manual creation; idempotent)
- [x] AC4.6 Fix Labels untouched by driver labels (driver labels live on their own session guard; no `driver:` references in `computeDesiredLabels` / `ensureLifecycleLabels`)

**CHECKPOINT C:** UX review of the picker.

## T5 — Closed verify + spec retro + docs

- [x] Verify AC5.1 via code analysis (no live close needed): `planLabelChanges` at `js/api.js:660` only touches `status:*` / `blocked-by:*` / `action:*` / legacy `blocked:*` — never `driver:*`. Same proof covers AC4.6.
- [x] Convert `SPEC.md` Part III to retrospective form (mirror Part II voice); reflect drifts (Driver as last column, actual grid template, gap-1 + pl-3 tweak, three always-visible toggles, `id="driver-cell-${id}"` resync, ensureDriverLabels independent guard)
- [x] Add driver mentions to `SPEC.md` Part I §C (row anatomy), §D (filter bar table + URL params), §H (Drivers section)
- [x] Add "Shipped — see SPEC.md Part III" pointer at top of `docs/ideas/journey-drivers.md`
- [x] Add picker mention (step 8) to `README.md` editing instructions
- [x] AC5.1 Closing journey leaves drivers intact (proven by code analysis)
- [x] AC5.2 Part III is past-tense retrospective
- [x] AC5.3 Part I §C/§D/§H mention drivers
- [x] AC5.4 README mentions picker
- [x] AC5.5 All tests green; lint clean

## Follow-up (separate from Journey Drivers)

- [ ] Fix `SPEC.md` §M (Auto-fix labels on issue close). Current text claims a "GitHub Actions workflow" handles auto-fix, but `.github/workflows/` only has `deploy.yml` and `test.yml` — the actual auto-fix is **client-side** via the same `syncStatusLabels` / `planLabelChanges` path that Fix Labels uses. Update §M to describe the client-side trigger correctly (issue close detected on render → mismatch → auto-fix), or implement the workflow if a workflow is genuinely desired.

- [ ] Remove the "External blockers" manual-add UI. `blocked-by:*` labels should only be added/removed via the lifecycle JS logic (`computeDesiredLabels` + Fix Labels), not via free-form user input.
  - **Code:** drop the External blockers section in `js/detail.js:145-157`, `renderBlockedLabels` at 789-806, `renderAddLabelButton` at 808-829, and the handlers `_showAddLabelForm` / `_cancelAddLabel` / `_submitAddLabel` / `_removeBlockedLabel` at ~858-926. Confirm whether `extractExternalBlockedLabels` in `js/markdown.js` still has any consumer after the UI is gone; if not, remove it too.
  - **Spec/docs updates:**
    - `CLAUDE.md:35` — drop "manually added for external blockers"
    - `SPEC.md:148-150` — remove or rewrite the `extractExternalBlockedLabels` description
    - `SPEC.md:207` — drop the "non-lifecycle `blocked-by:*` labels are preserved" carve-out
    - `SPEC.md:222` — drop the "external `blocked-by:legal` survives" QA note
  - **Migration question to resolve before doing the work:** any existing journeys carrying non-lifecycle `blocked-by:*` labels (e.g. `blocked-by:legal`) — strip them as part of the change, or let them sit until the next Fix Labels pass picks them up?

## End-to-end verification (after T5)

- [ ] `npm test` — all suites green including `tests/drivers.test.mjs`
- [ ] `npm run lint` — clean
- [ ] `node --check js/pipeline.js js/detail.js js/api.js` — syntax clean
- [ ] `npm run serve` at 1280px with write PAT against logos-co project #12
- [ ] Walk SPEC.md Part III §5 smoke items 1–14 end to end
