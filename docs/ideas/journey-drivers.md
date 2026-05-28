# Journey Drivers

> **Shipped — see `SPEC.md` Part III for the retrospective specification.**
> This file is the original ideation one-pager, kept as historical context.

## Problem Statement
How might we make the *why* behind each journey's priority legible on the board — so prioritization decisions are defensible to ourselves and to R&D leads reading the pipeline?

## Recommended Direction
Add a fixed allowlist of `driver:*` labels (starting with `driver:rfp`, `driver:quest`, `driver:sample-app`) and render them in a dedicated "Driver" column in the pipeline table. Drivers are *informational, not gating* — they sit alongside Type and Status without affecting sort order or lifecycle reconciliation. Add/remove happens primarily in the detail panel via a multi-select picker (Edit mode), with GitHub UI as the always-available fallback.

The label vocabulary lives in `js/pipeline.js` next to `PERSONA_LABELS` (slug → display name + color), making it the single source of truth for color, label name, and display. Adding a new driver type is a one-line change in that table plus a label creation in the repo.

A single-select filter chip in the header bar lets you scope the board to one driver type at a time — mirroring the existing Type filter UX.

## Key Assumptions to Validate
- [ ] **Vocabulary stays small (< ~6 drivers over the next 6 months).** Validation: revisit after two months — if you've wanted to add 3+ new driver types, the allowlist-in-code model is wrong and we should move to a Projects v2 custom field.
- [ ] **A 7th column fits without squeezing the title.** Validation: prototype the grid template (`1fr_8rem_7rem_9rem_12rem_9rem_2rem`) and eyeball at 1280px wide before committing.
- [ ] **Single-select filter is enough.** Validation: after a month of use, check whether you've wished you could "show RFP + Quest." If yes, upgrade to multi-select like Blocked-by.
- [ ] **Drivers are orthogonal to status.** Validation: confirm no `status:*` transition should ever depend on `driver:*`. If it does (e.g. "RFP journeys auto-flag overdue earlier"), the state machine grows and this becomes a bigger change.

## MVP Scope
**In:**
- Three labels in the repo: `driver:rfp`, `driver:quest`, `driver:sample-app` (consistent color palette, distinct from `status:` / `blocked-by:` / persona colors).
- `DRIVER_LABELS` mapping in `js/pipeline.js` (slug → display name + color), used by both the column renderer and the picker.
- New "Driver" column in the pipeline grid (open and closed sections). Empty cell renders blank.
- Single-select filter chip in the header filter bar, behaving like the persona Type filter.
- Detail-panel picker: in Edit mode, show a multi-select control over the allowlist; toggling adds/removes the label via the existing GitHub REST API client.
- README / CLAUDE.md note documenting the `driver:*` convention.

**Out:**
- Drag-sort changes — drivers do not influence ordering.
- Fix Labels integration — drivers are not auto-derived from anything, so there's nothing to reconcile.
- Multi-select filter (revisit if needed).
- Per-driver styling beyond the chip in the column (no row highlights, no badges elsewhere).
- Surfacing drivers in the closed-journey section any differently from open ones.

## Not Doing (and Why)
- **Projects v2 custom field instead of labels** — would add a third source of truth (labels + body + project fields) and break the "labels are the vocabulary" pattern. Revisit only if the allowlist proves too rigid.
- **Body field with a link to the RFP/Quest artifact** — strong signal, but doubles the editing surface for v1. Can be layered on later if "we claimed RFP but never linked it" becomes a real problem.
- **Auto-derivation from any source** — drivers are an editorial judgment, not a derived fact. Keep them human-managed.
- **Showing driver as a badge on the row title** — explicitly rejected; the board's discipline is "labels live in columns."

## Open Questions
- What color palette for the three drivers? Suggest avoiding coral (used by `status:confirm-roadmap` and `gui user`), forest (text), and the blockchain blues. Maybe muted gold / plum / sage to read as a distinct category.
- Should the column header read "Driver", "Why", or something else? "Driver" is consistent with the label name but might read ambiguously next to "Status."
