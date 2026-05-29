# BUILD — run the app locally

For using the app against the live GitHub data. No code changes. (To change the code, see
[CONTRIBUTE.md](CONTRIBUTE.md) instead.)

## Run it

```sh
npx serve .          # or: npm run serve
```

Then open <http://localhost:3000>.

> The app uses ES modules and must be served over HTTP. Opening `index.html` directly as a
> `file://` URL will not work.

On first load, follow the prompt to enter a GitHub **PAT** (stored client-side in localStorage;
you control your own credentials). A read PAT is enough to browse; a write PAT is needed for
editing and reordering.

## Using the app (R&D leads)

1. Go to <https://journeys.logos.co> or run locally as above.
2. Enter your GitHub PAT when prompted.
3. **Filter by team**: click your team in the "Team:" line.
4. **Filter by who's blocking**: use the "Blocked by" bar (e.g. `R&D` for all rnd teams, or a
   specific team like `zones`).
5. **Expand a journey**: click any row to open the detail panel (R&D inputs, doc packet link,
   documentation tracking + PR, red team tracking).
6. **Enable editing**: click **Edit** in the header (it shows **Editing** in coral when active).
7. **Fill in missing info**: with editing on, paste the relevant URL/value into a section's
   input and press Enter (or click ✓) to save directly to the GitHub issue.
8. **Tag the driver**: in the "Drivers" section toggle `rfp` / `quest` / `sample-app` to record
   why the journey is prioritized. Filter via the "Driver:" pill row in the header.
9. **Sync labels**: if the ⚠ **Fix Labels** button appears, click it to reconcile labels with
   the issue body.

> **Settings** (gear icon): change owner, project number, or token at any time.

**First steps for an R&D lead:** verify your journeys exist with the right target release; add
any missing ones via **+ New Journey** in Editing mode; then expand each (top-down) and fill in
the **Doc Packet** if software is delivered, or start with the **R&D** section (milestone, then
date) if it isn't. The full flow is the lifecycle in
[README.md](README.md#the-lifecycle).
