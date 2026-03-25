# Logos Journeys

Website to track priorities of journeys for Logos Eco Dev, on Logos R&D.

Pre-configured for [logos-co / project 12](https://github.com/orgs/logos-co/projects/12/views/1?layout_template=board).

## Usage

1. **Filter by action needed** — use the filter bar at the top to show only journeys where your team has an open action (`action:rnd`, `action:docs`, or `action:red-team`).
2. **Expand a journey** — click any row to open the detail panel. It shows the full workflow state for R&D, Doc Packet, Documentation, and Red Team.
3. **Enable editing** — click the **Edit** button in the header (requires a token with `project` + `public_repo` scopes — [generate one here](https://github.com/settings/tokens/new?scopes=project,public_repo&description=Priority+Pipeline)). Once active, the button shows **Editing** in coral.
4. **Fill in missing information** — with editing enabled, each workflow section shows an input field. Paste the relevant URL or value and press Enter (or click ✓) to save directly to the GitHub issue.
5. **Reorder journeys** — drag rows up or down to reprioritise. The new order is written back to the GitHub project board.

> **Settings** (gear icon): change the owner, project number, or token at any time.

## How a journey progresses

Each journey moves through three stakeholder stages. R&D and Docs run sequentially; Docs and Red Team overlap during the review phase:

| Stage        | States                                                                   |
|--------------|--------------------------------------------------------------------------|
| **R&D**      | `to-be-confirmed` → `confirmed` → `in-progress` → `doc-packet-delivered` |
| **Docs**     | `waiting` → `in-progress` → `ready-for-review` → `merged`                |
| **Red Team** | `waiting` → `in-progress` → `done`                                       |

```mermaid
flowchart TD
    start([journey created]) -->|"+ action:rnd"| r1

    subgraph RND["R&D"]
        direction LR
        r1[to-be-confirmed] --> r2[confirmed] --> r3[in-progress] --> r4[doc-packet-delivered]
    end

    r4 -->|"- action:rnd  + action:docs"| d1

    subgraph DOCS["Docs"]
        direction LR
        d1[waiting] --> d2[in-progress] --> d3[ready-for-review]
        d4[approved & merged]
    end

    subgraph RT["Red Team"]
        direction LR
        t1[waiting] --> t2[in-progress] --> t3[done]
    end

    d3 -->|"+ action:red-team"| t1
    d3 -->|"+ action:rnd"| sme[R&D SME review]
    t3 -->|"- action:red-team"| d4
    sme -->|"- action:rnd"| d4
    d4 -->|"- action:docs"| fin([journey complete])
```

1. **R&D** fills in their team, a roadmap milestone link, and an estimated date. Once the feature implementation is complete, they [open an issue using the doc packet template](https://github.com/logos-co/logos-docs/issues/new?template=doc-packet.yml), fill it in (including appointing a Subject-Matter Expert (SME) from their team), then paste the issue URL into the `- link:` field in the `## Doc Packet` section. This signals hand-off to Docs.
2. **Docs** opens two items in the logos-docs board:
   - A tracking issue assigned to the R&D SME, back-linked to the journey.
   - A PR assigned to the writer and linked to the issue. This is where the writing happens. The document progresses through `stub → unverified draft → verified by SME → verified by Red Team` on this PR, with the R&D SME and Red Team reviewing directly on it.

   When the PR is approved, Docs merges it, which automatically closes the linked issue.
3. **Red Team** gets the `action:red-team` label as soon as the doc PR is ready for review. They dogfood the journey and review the docs PR at the same time; once dogfooding is done, so is the PR review. They close their tracking issue when done.

The app tracks these states automatically by reading the issue body and checking GitHub issue/PR states. The `action:rnd`, `action:docs`, and `action:red-team` labels are kept in sync automatically; they tell each team at a glance when it's their turn. A ⚠ badge on a row means the labels are stale and will be corrected the next time the issue is opened in edit mode.

## Run locally

```sh
npx serve .
```

Then open http://localhost:3000.

> The app uses ES modules and must be served over HTTP; opening `index.html` directly as a `file://` URL will not work.

## Licence

Licensed under either of [MIT](LICENSE-MIT) or [Apache 2.0](LICENSE-APACHE) at your option.

## Deploy

Pushes to `main`/`master` auto-deploy via GitHub Actions → GitHub Pages.

Enable Pages in the repo settings under **Settings → Pages → Source: GitHub Actions** before the first deploy.
