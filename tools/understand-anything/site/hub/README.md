# Source-bound bilingual hub publication

`publication.mjs` validates ten canonical product source hashes and revisions,
matching current translation bindings and localized titles/descriptions, and exact
DE/EN/index renderer output. Drift fails before a hub artifact is written.
It validates the actual public graph bundle, binds its generation ID and source
refs, derives release/ref/date/count status and writes only allowlisted hub
HTML/CSS/JS/status files plus a byte manifest. Legal files are excluded.

The installer consumes that manifest into an immutable hash-named release and
atomically changes an explicitly configured hub current-link. It retains the
previous release pointer and refuses an existing ordinary directory. Every
artifact byte is verified at the configured canonical origin after installation.
Historical legal aliases/trees require the operator's unchanged nginx routing;
they are not part of this artifact or its filesystem operations.

The separate UA public-site workflow activates only explicitly supplied actual
platform-release inputs and uses
hosted preflight before its configured self-hosted consumer. It installs the
same pinned patched viewer, exact public source generation, explicit per-viewer
Compose bindings and source readbacks. It does not assume a server or nginx
current-link, and was not activated in this implementation session.

Public build passes `--release-manifest PATH` alongside the exact `--revision`.
The graph generation must carry the same verified release lock hash and complete
source vector. Without the lock, output has `state: preview` and cannot install
or pass public readback. Installation and readback validate `releaseBinding`;
readback also fetches the complete public manifest byte-for-byte. Age alone does
not make a release stale. See [release inputs](../../bundle/RELEASE-INPUTS.md) for
the source verification contract.

## Shared vocabulary and immutable graph projection

The hub now consumes the maintained `glossary/catalog.json` beside the producer.
The glossary gate requires complete DE/EN content, exact hashes of all reviewed ADR
and input-snapshot bytes from the selected Docs commit, and byte-for-byte equality
with `renderGlossary(data)`. An unchanged ADR in a later selected commit retains its
original reviewed revision; changed or missing authority bytes fail before output.
The original code audit stays historical and never becomes current from a path match.

`ua-glossary-project.mjs --generation STAGE --sources PINNED_SOURCE_CHECKOUTS
--authored-root PINNED_DOCS_CHECKOUT` runs after repository enrichment and before
aggregation/sealing. It reads the catalogue from the pinned Docs checkout, checks
its authoritative source bindings, adds bilingual preferred terms and legacy aliases
to the viewer's real searchable tags, and updates only explicit curated business
concept names. File names, node IDs, source summaries and semantic claims remain
unchanged. Shared labels must agree; missing, ambiguous and wrong-type nodes have
explicit unavailable outcomes. Different audited/selected revisions stay historical;
no existing DPA concept is relabelled as the entire Platform Services Agreement.

The generation manifest binds `glossary/catalog.json` and `glossary/bindings.json`
to its complete selected source vector and Docs revision. Coverage and semantic
binding checks reject omitted authority/mapping records or rewritten selected
revisions, even if a caller recomputes the general byte inventory.

Hub artifacts explicitly allow the glossary page, client script, canonical catalogue,
binding outcomes and the three original input snapshots. All bytes enter the hub
manifest and immutable installation/public readback checks. Build checks actual
mapped nodes against the generation before adding links to existing viewer routes.
The installed viewer has no confirmed selected-node query contract: links say
"Open graph" and expose the exact node ID; Docs IDs use the existing Supergraph
prefix. Historical, stale and unavailable targets receive no current graph link.
A preview carries these same source checks but remains non-activatable.

Run the producer's full test command in the repository checkout (`npm ci && npm test`
from `tools/understand-anything`) with `UA_CORE` pointing to the installed pinned
patched consumer. Source-bound hub tests need both tracked ADR bytes and Git history;
a copied installed tooling directory alone does not provide that context.

## Shared state colours

`assets/tokens.json` is the single source for state colours (code origin ramp, test
hatch, deleted, planned, board status), light and dark. `node build-tokens.mjs`
regenerates `assets/tokens.css` from it; `test/colour-tokens.test.mjs` checks WCAG
contrast of text on fills and the lightness steps per ramp, also under deuteranopia
and protanopia simulation. The hub documents the scheme in the "Colour scheme" section.

## Capability map (`/map/`)

`map/` is the hub's "Fähigkeiten-Karte" page: `index.html` (shell), `map.css`,
`map.js` and generated data in `map/data/` (`counts.json`, `drill.json`,
`zoom.json`, `epics.json`, `descriptions.json`, `links.json`). The page has no
inline script, style or style attribute and loads the data with same-origin
`fetch`. `map.js` merges every data file into one `MEAS` object; files named in
`links.json` under `optional` (allowed names: `OPTIONAL_DATA` in `map.js`, today
`board.json`) are loaded when present and kept whole under their file name
(`board.json` -> `MEAS.board`, shape: `tools/planning-map/board.schema.json`).

Status bars (#205): `map/board-agg.js` (classic script, also run by
`test/board-agg.test.mjs`) maps every issue of `MEAS.board` to a capability through
the epics of this map (the epic itself, its sub-issue list, or the `parent` link),
counts issues per Status, Urgent/High and Readiness (average of scored issues, raw
scale, board-wide maximum, count of unscored). Colours come from `assets/tokens.css`
(`--ua-status-*`); widths are set through `data-css` + CSSOM, never style attributes.
Without `board.json` the page shows no bars. `map/data/board.json` is produced by
Epic side view (#206): clicking an epic opens its sub-issues by board status (`BoardAgg.epicView`, same epic links as above) with a stacked bar and the filters accepted (Done), developed on Dev (QA internal), on Staging (QA external) and open. Side panel on desktop, bottom sheet on phones (Esc or swipe down closes). Private sub-issues appear only as the epic's `hid` count.
`tools/planning-map/export-board.mjs` and is not committed.

Regenerate the data from the measured intermediate files (code counts, tests,
stories, graph links):

    node map/build-map-data.mjs --inputs DIR --out map/data

`DIR` holds `agg`, `rel`, `drill`, `epics`, `zoom`, `planned`, `desc`, `live`
and `car15` as `.json` files (see `test/fixtures/map-inputs/`). Output is
deterministic. `test/map-render.test.mjs` renders the page from
`test/fixtures/map-data/` in a browser under a strict CSP; it needs Playwright
(`UA_PLAYWRIGHT=/path/to/playwright/index.mjs`) and is skipped without it.

### Planning board on the map (`board.json`, ORISO-Docs#208)

`.github/workflows/planning-board-sync.yml` exports the ORISO Roadmap project hourly and on
"Run workflow". The map footer shows "Stand <syncedAt>" and a "Jetzt synchronisieren" link to that
workflow's page; no token reaches the browser.

How `board.json` reaches the page, and why:

- The sync workflow stores `board.json` as the workflow artifact `planning-board` (7 days). It is
  never committed, so no board data lands in Git history.
- `publication.mjs --board FILE` validates it against the v1 schema, refuses items of private
  repositories, writes `map/data/board.json` and adds it to `links.json` `optional`. The
  `produce` job of `ua-public-site.yml` downloads the newest artifact before building and passes
  `--board` when one exists; without one the map simply has no board data.
- Chosen over a data branch (needs a write token and puts board data into Git) and over writing
  to the live hub (the hub is installed as an immutable, hash-checked generation; changing a file
  in place would break that contract). The cost: the map's "Stand" moves when the hub is next
  published, not at the end of each sync run. Closing that gap needs an operator-side step that
  re-installs the hub, which this change deliberately does not add.
- Without the secret `ORISO_BOARD_READ_TOKEN` the workflow runs on the recorded fixture and
  publishes nothing. Exit code 2 of the export (drift) fails the run.

### Milestones and releases panel (ORISO-Docs#209)

Left side panel of the map: reviewed milestones (`tools/planning-map/milestones.json`, validated by
`lib/milestones.mjs`) with their Platform releases. Each release shows counts by status and priority and
the summed effort (S = 2, M = 4, L = 8 person-days; issues without effort are counted apart, not guessed).
Picking a release highlights the capabilities it touches (overview level). Aggregation lives in `map/board-agg.js`
(`releases`, `milestones`, `releaseCapabilities`). The config ships as optional `map/data/milestones.json`
(`publication.mjs` `milestonesAsset`). Releases on the board but not in the config appear under "Not assigned".
Docked at 1561 px and wider; below that it is a drawer opened by the "Releases" button.

### Planning moves (#210)

`map/plan-ui.js` (classic script, run by `test/plan-move.test.mjs`) holds the planning intents. A capability block (overview level) or an epic card can be dragged onto a release in the left panel, or moved with the button "Move to release…" in the epic view (and "Move all epics…" in a block's epic list). Both open one dialog: release and "move sub-issues too". The move shows on the map at once (optimistic). The static hub has no backend, so the page writes only through an optional `window.PlanningTransport = {assignRelease(intent), setGate(intent)}` returning `{ok:true}` or `{ok:false, error:{code,message}, applied?:[...]}`. On failure the move is rolled back and the reason shown in the log above the map (`#planlog`). Without a transport the log shows the exact `tools/planning-map/plan.mjs` command (dry run, or with `--apply`) and an Undo button. On narrow screens the release drawer opens while dragging; touch users use the button.

### Gate step indicator and filter (#211)

`BoardAgg.GATES` (same eight gates as `tools/planning-map/gate-options.json`, compared by `test/gate-agg.test.mjs`). `BoardAgg.epicView(..., filter, gate)` adds `gate`/`gateStep` per sub-issue, `gateCounts` and `gateAvailable`; `gate` is `all`, `none` or a gate name and combines with the status filter. The epic view shows a step indicator per gated sub-issue (`role="img"`, spoken label "Gate R3 Human review, step 7 of 8", criteria as tooltip), a gate select and a collapsible list of the criteria. Nothing is shown while no issue has a gate (the field is created by a project admin).
