# CONTRIBUTE — modify the app

For changing the code. This builds on [BUILD.md](BUILD.md) (how to run it) and the **Concepts**
section of [README.md](README.md#concepts--journey-data-model-and-lifecycle) (the data model the
code implements). Read both before changing behavior.

## Tech stack

- Plain HTML + ES modules — **no bundler, no framework**
- Tailwind CSS via CDN
- marked.js for markdown rendering
- GitHub Projects v2 GraphQL API + REST API

Static SPA, no backend (rationale in [ADR.md](ADR.md)). The PAT lives in localStorage; every
load hits the GitHub API directly (rate limits apply per user).

## Project structure

```
index.html          — single-page app entry point
js/
  api.js            — GitHub GraphQL/REST calls (project items, issues, labels)
  app.js            — app init, config UI, state management
  config.js         — localStorage-based config (owner, project number, PAT)
  detail.js         — detail panel for individual journeys
  drag.js           — drag-and-drop reordering
  markdown.js       — markdown rendering + dependency/doc parsing
  pipeline.js       — main pipeline table rendering (label vocab: TYPE_DEFS, DRIVER_DEFS)
  teams.js          — repo-to-team display name mapping
css/                — stylesheets
scripts/            — maintenance scripts (e.g. strip-doc-link.mjs)
tests/              — node:test suite + fixtures
```

## Tests and lint

```sh
npm test     # node:test runner, zero dependencies
npm run lint # eslint over js/ and tests/
```

Tests cover issue-body parsing, lifecycle status computation, label reconciliation, drag
gating, config, rendering, and drivers. They consume the *shape* of GitHub API responses (issue
bodies, PR refs) — never the network. CI runs `npm test` on every push and PR. Requires Node ≥ 20.

When changing behavior, update or add a test in `tests/` (fixtures in `tests/fixtures/`). The
`#31` precedence regression has a dedicated fixture (`tests/fixtures/issue-31.md`) — keep it green.

## Specs and decisions

| File                              | What it is                                                              |
|-----------------------------------|------------------------------------------------------------------------|
| [SPEC.md](SPEC.md)                | Behavior spec — source of truth for *what* the app does (per feature)  |
| [tests/SPEC.md](tests/SPEC.md)    | Spec for the test suite itself                                         |
| [ADR.md](ADR.md)                  | Architecture Decision Records (the *why* behind the design)           |
| [FURPS.md](FURPS.md)              | Functionality / Usability / Reliability / Performance / Supportability |
| `specs/`                          | Feature-specific specs (e.g. `specs/drag-handle-fix.md`)               |
| `docs/ideas/`                     | Ideation one-pagers, kept as historical context                       |
| `tasks/plan.md`, `tasks/todo.md`  | Current in-flight task plan and checklist                              |

**Before a non-trivial change:** read the relevant [SPEC.md](SPEC.md) section, then the file(s)
in `js/` it names. `SPEC.md` is the source of truth for behavior; `js/` is the source of truth
for *how*.

## Knowledge graph

A graphify knowledge graph lives in `graphify-out/` (gitignored). Use it to navigate before
non-trivial changes:

- `graph.html` — interactive view (open in any browser, no server needed)
- `graph.json` — raw data for `/graphify query "…"`, `/graphify path "A" "B"`, `/graphify explain "X"`
- `GRAPH_REPORT.md` — god nodes, surprising connections, suggested questions

Rebuild after architectural changes with `/graphify .` (or `/graphify . --update` for an
incremental refresh).

## Branding

Sandy/parchment light theme. Forest `#0E2618` text, warmgray `#DDDED8` body bg, coral `#E46962`
accent, teal `#0C2B2D` header. Lambda (λ) brand mark.

## Deploy

Pushes to `main`/`master` auto-deploy via GitHub Actions → GitHub Pages. Before the first
deploy, enable Pages under **Settings → Pages → Source: GitHub Actions**.
