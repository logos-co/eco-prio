# journeys

Static SPA that displays a prioritized pipeline of Logos ecosystem journeys, sourced from GitHub Projects v2.

## Tech Stack

- Plain HTML + ES modules (no bundler, no framework)
- Tailwind CSS via CDN
- marked.js for markdown rendering
- GitHub Projects v2 GraphQL API + REST API

## Project Structure

```
index.html          — Single-page app entry point
js/
  api.js            — GitHub GraphQL/REST API calls (project items, issues, labels)
  app.js            — App initialization, config UI, state management
  config.js         — localStorage-based config (owner, project number, PAT)
  detail.js         — Detail panel for individual journeys
  drag.js           — Drag-and-drop reordering
  markdown.js       — Markdown rendering + dependency/doc parsing
  pipeline.js       — Main pipeline table rendering
  teams.js          — Repo-to-team display name mapping
css/                — Stylesheets
```

## Data Model

Journeys are GitHub issues in the connected project board. Each issue has:

- **Labels** for journey type: `gui user`, `developer`, `node operator`
- **Labels** for target release: `testnet v0.1`, `testnet v0.2`, etc. (regex: `/^testnet\b/i`)
- **Labels** for blocked status: `blocked:teamname` (regex: `/^blocked:/i`)
- **Issue body** with structured sections:
  - `## Dependencies` — lines like `- team: URL [Completed] [DDMMMYY]`. URL can be a GitHub issue (auto-tracked) or any reference link. Value can also be `TODO`, `Completed`, or empty. Examples: `- team: https://github.com/o/r/issues/1`, `- team: Completed`, `- team: TODO 15Mar26`, `- team: https://example.com Completed 30Jun26`
  - `## Documentation` — bare URL to docs

## GitHub Repos

- `logos-co/ecosystem` — Journey issues live here
- `logos-co/logos-docs` — Documentation, linked from dependency sections
- `logos-blockchain/logos-execution-zone` — LEZ team issues

## Creating Journey Issues

To create a new journey via `gh`:

```bash
gh issue create --repo logos-co/ecosystem \
  --title "Journey title" \
  --label "developer" \
  --body '## Dependencies
- lez: TODO
- docs: TODO
- red team: TODO'
```

After creating, add the issue to the GitHub Project board for it to appear in the app.

Journey type label colors: gui user=`D94F45`, developer=`3B7CB8`, node operator=`C4912C`.

## Branding

Sandy/parchment light theme. Forest `#0E2618` text, warmgray `#DDDED8` body bg, coral `#E46962` accent, teal `#0C2B2D` header. Lambda (λ) brand mark.
