# SPEC — Multi-select Release Filter

> Retrospective specification for the testnet release filter added to the journeys pipeline.

## 1. Objective

Let R&D leads narrow the pipeline view to one or more target testnet releases simultaneously.

**Problem.** Journeys carry a `testnet vX.Y` label (or `testnet unscheduled`) but the pipeline showed all releases together. With dozens of journeys spanning three or more releases, a lead checking "what is in flight for v0.1 and v0.2 right now?" had no way to focus the view.

**Target users.** Logos R&D leads, docs team, red team — anyone using the pipeline to triage work for a specific upcoming testnet cut. Read-only viewers benefit equally; the filter requires no write PAT.

**Success.** A user can pick any subset of the releases present on the board and immediately see only matching journeys. The selection survives page reload via the URL.

## 2. Commands

The app is a static SPA with no build step.

| Command | Purpose |
|---|---|
| `npm run serve` | Serve the app locally on `http://localhost:3000` (wraps `npx serve .`) |
| `npm test` | Run the `node:test` suite in `tests/*.test.mjs` |
| `npm run lint` | Run ESLint over `js/` and `tests/` |
| `node --check js/pipeline.js` | Quick syntax-check after edits, no test run |
| `gh pr create` | Open a PR (standard repo workflow) |

Automated tests (`node:test`, no JSDOM) cover render output and pure logic. UI behavior that depends on real DOM/event flow is still verified manually in a browser per the smoke checklist below.

## 3. Project Structure

All filter logic lives in a single file:

```
js/pipeline.js
  ├─ Module state         activeReleaseFilter (Set<string>)
  ├─ Palette + helpers    RELEASE_PALETTE, releaseSlug(), releaseColor()
  ├─ renderPipeline()     URL → state restore, pill activation
  ├─ renderFilterBar()    Renders "Release:" pill row
  ├─ renderPipelineRow()  Emits data-releases="<slug …>" on wrapper
  ├─ applyFilter()        Matches wrapper.dataset.releases against the set
  ├─ syncFiltersToUrl()   Set → ?release=slug1,slug2
  ├─ attachFilterHandlers() Click handler toggles set membership
  └─ releasePill{Reset,Activate}()  Visual states
```

No other files were touched. The filter row composes into the existing `#filter-bar` container between the persona/team rows and the blocked-by row.

## 4. Code Style

Follow the conventions already present in `js/pipeline.js`:

- Plain ES modules, no framework, no bundler.
- Inline styles via template literals; Tailwind utility classes for layout.
- Slugs are kebab-case (`testnet v0.1` → `testnet-v0-1`) and used for both URL params and `data-*` attributes.
- Color tokens declared once at module scope (`RELEASE_PALETTE`), reused in pill render and reset/activate helpers.
- Pill activation pattern mirrors the existing `typePillActivate` / `typePillReset` pair — same opacity stops (`18`, `33`, `66`, `cc`) so all pill rows feel consistent.
- No comments unless the *why* is non-obvious.

## 5. Testing Strategy

Two layers: `node:test` covers render output and pure helpers (see `tests/render.test.mjs`, `tests/drag-gating.test.mjs`); manual browser smoke covers DOM/event flow. New test files must be added to the `test` script in `package.json` — it lists files explicitly because `node --test` does not glob across `tests/*` from a bash invocation.

**Smoke checklist** (run `npm run serve` and open `http://localhost:3000`):

1. "Release:" row appears with one pill per release label present on the board, including `testnet unscheduled` when journeys carry it.
2. Click a release pill → only matching journeys remain; URL gains `?release=<slug>`.
3. Click a second pill → both releases visible (OR within the row); URL becomes `?release=<slug1>,<slug2>`.
4. Deselect one pill → URL shrinks; the other release remains active.
5. Combine with a Persona or Team pill → intersection (AND across rows).
6. Reload the page → release pills restore from the URL.
7. With any release pill active, row drag is disabled (matches other filter rows).
8. Deselect all release pills → `release=` param drops from URL; full list returns.
9. URL with an unknown release slug (e.g. typo) is silently ignored on restore.

**Pre-commit gate.** Run `npm test` and `npm run lint`. Both must pass.

## 6. Boundaries

**Always do**

- Keep all filter state in `pipeline.js` module scope. Filters are an SPA concern, never persisted server-side.
- Encode multi-select state as comma-separated slugs in the URL so links are shareable.
- Validate restored URL slugs against labels actually present on the board — drop unknowns silently.
- Disable drag whenever any filter (including release) is active, matching the existing pattern.

**Ask first**

- Adding more multi-select filter rows. The current design has one multi-select (release) and three single-select (persona, team, blocked-by); flipping more rows to multi-select changes the mental model.
- Persisting filter state anywhere other than the URL (e.g. localStorage). Today only PAT and config live in localStorage; filters are intentionally URL-only.
- Changing the OR-within / AND-across semantics.

**Never do**

- Do not introduce a build step, framework, or bundler for this feature.
- Do not couple the filter to GitHub Projects field state — the source of truth is the issue labels (`/^testnet\b/i`).
- Do not hard-code a fixed list of releases. The pill row is derived from labels present on open items, so new testnets appear automatically.
- Do not reintroduce a second release-color table. `RELEASE_PALETTE` at module scope is the sole source for both filter pills and row chips.
