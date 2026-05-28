# Spec: Restore the row drag handle

## Objective

Restore the ability to reorder pipeline rows via drag-and-drop.

**Current bug.** In edit mode with a write PAT and no filters active, the drag handle (`⠿`) does not appear on any row, so rows cannot be picked up. The reorder feature has been silently broken — we don't know for how long because the project has no automated test coverage of drag.

**User impact.** R&D leads cannot reorder priorities. The pipeline shows whatever order GitHub Projects returns. The "Drag rows to reorder" hint may still appear, advertising a feature that no longer works.

**Success.** A user with a write PAT in edit mode, with no filters active, sees the `⠿` handle on every open row, can drag a row to a new slot, sees a drop indicator during the drag, and on drop the row reorders both locally and on the GitHub project board.

## Assumptions

1. The drag JavaScript in `js/drag.js` is still functionally correct — it was last touched in commit `9a44c2c` and shipped working. The regression is in what the **renderer emits**, not in the drag handlers themselves. (If implementation disproves this, treat `drag.js` as fair game.)
2. The user has confirmed: write PAT configured, edit mode active, no filters. So all gating preconditions are satisfied at the user end.
3. The reorder GitHub API call (`moveProjectItem`) is unchanged and still works server-side. We're not chasing an API regression.
4. Mobile drag is out of scope — HTML5 drag-and-drop is desktop-only here.

→ Correct any of these now or implementation will proceed on them.

## Tech Stack

Same as the rest of the SPA: plain ES modules, no framework, no build step. HTML5 drag-and-drop API. Existing files:

- `js/drag.js` — event handlers, drop indicator, reorder math, GitHub API call
- `js/pipeline.js` — emits `<span class="drag-handle">⠿</span>` and `draggable="${canDrag}"`
- `js/app.js` — `setupDrag()` wires `initDrag` after render; mode toggle re-renders
- `css/app.css` — `.drag-handle`, `.draggable-row`, `.drop-indicator` styles

## Commands

```
Serve:  npx serve .
Syntax: node --check js/pipeline.js && node --check js/drag.js && node --check js/app.js
Verify: see "Success Criteria" — manual browser walkthrough
```

## Project Structure

Bug fix only. No new files. Touch at most: `js/pipeline.js`, `js/drag.js`, `js/app.js`, `css/app.css`. If the fix requires touching more files than that, stop and re-spec.

## Code Style

Match surrounding code. Specifically the existing drag-handle render pattern in `js/pipeline.js`:

```js
${canWrite
  ? `<span class="drag-handle flex-none${canDrag ? '' : ' hidden'}" title="Drag to reorder">⠿</span>
     <span class="rank-number flex-none${canDrag ? ' hidden' : ''}">${rankLabel}</span>`
  : `<span class="rank-number flex-none">${rankLabel}</span>`
}
```

If you change the gating, keep this two-state pattern (handle XOR rank-number) so the layout doesn't shift.

## Testing Strategy

No test runner exists. Verification is manual browser walkthrough plus `node --check` for syntax. **Before declaring fixed**, exercise the full reorder path end-to-end (drag, drop, persist, reload).

## Boundaries

**Always**
- Reproduce the bug in the browser first. Confirm the exact failure mode matches the user's report ("handle not visible") and not something adjacent.
- Diagnose root cause before changing code. Inspect the rendered DOM: is the `<span class="drag-handle">` emitted? Does it have the `hidden` class? Does it have `display: none` from any stylesheet? Is `canWrite` actually `true` when the renderer runs?
- Add a one-line comment at the fix site explaining *why* the change is needed, so the next person doesn't undo it. (This is a load-bearing comment — exception to the no-comments rule.)
- Keep the fix minimal. One root cause → one targeted change.

**Ask first**
- Adding any automated drag test (would require introducing a test harness — bigger project).
- Changing the gating logic (e.g. allowing drag while filters are active — that's a feature change, not a bug fix).
- Refactoring `drag.js` beyond the minimum required to fix the bug.

**Never**
- Don't disable HTML5 drag in favor of a JS-driven sortable library. Adds dependencies, out of repo style.
- Don't paper over by always showing the handle — if `canDrag` is false the handle should stay hidden, and the rank number should show. Preserve the XOR.
- Don't commit without manual browser verification of all five success criteria.

## Success Criteria

A user reproducing the original conditions (write PAT, edit mode, no filters) must observe:

1. **Visible.** `⠿` appears on the left of every open row. Rank numbers are hidden on those rows.
2. **Cursor.** Hovering the row shows `cursor: grab`. Active drag shows `cursor: grabbing`.
3. **Drag start.** Mousedown + drag picks up the row (ghosted via `.drag-source` opacity 0.35).
4. **Drop indicator.** Moving the cursor over other rows shows the coral drop indicator between rows.
5. **Persistence.** Releasing on a new slot reorders the row in-place (no full re-render flash), and a page reload shows the new order — confirming GitHub project board state was updated.

Additional non-regression:
6. **Filter still disables.** Activating any filter (persona / team / blocked-by / release) hides the handle and shows the rank number again.
7. **No write PAT → no handle.** Logging out of edit mode or removing the PAT hides the handle on every row.
8. **`node --check`** passes on every JS file touched.

## Open Questions

- **Q1.** What is the actual root cause? Three plausible candidates — investigation will collapse to one:
  - (a) The `drag-handle` span is emitted but has the `hidden` class because `canDrag` is `false` even when no filters are active.
  - (b) The drag-handle span is never emitted because `canWrite` is `false` at render time (mode toggle didn't propagate, or `hasWritePAT()` returns the wrong value).
  - (c) The span is emitted and visible but a CSS regression elsewhere is hiding it (e.g. a Tailwind utility class collision or an `overflow: hidden` on an ancestor).
- **Q2.** Should the "Drag rows to reorder" hint be removed when drag is broken, or only when no PAT? (Today it's gated on `canDrag` so it follows the handle.)

Resolve Q1 with browser devtools inspection during implementation. Defer Q2 unless implementation makes it relevant.
