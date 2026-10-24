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

Every data file carries the run manifest of the unified run (`run`, see `tools/planning-map/README.md`). The footer shows one "Stand" and the commit per repo, and warns when files come from different runs or are unstamped. `build-map-data.mjs --run run.json` stamps the files.

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

### Views: State | Health | Plan (`map/views.js`, ORISO-Docs#214)

One switch above the layer toggles. The three views share the same squares, zoom path and selection; only the layer on top differs.
`State` is the map as before. `Health` colours the squares by the overall score of the latest run record and shows the run panel plus the criteria box (#218 and #217, below). `Plan` is the idea canvas (#223, below).

The URL hash carries the view and the node: `#view=health&node=<node id>`. The node id is the one of the deep links (#199) and stands
for the deepest open capability, folder or file, so switching views keeps the same area open. `#node=<id>` without a view is the State view,
so all existing links keep working; State links are written in exactly that form. Switching a view adds a history entry, zooming only replaces it.

Add a layer by filling in your view in `MapViews.VIEWS` (classic script `map/views.js`, tested by `test/map-views.test.mjs`); `map.js` needs no change:

    VIEWS[view] = {
      title:  {de, en},          // label on the switch
      legend: function (lang),   // plain text under the map; '' keeps the default State legend
      colour: function (block),  // token name from assets/tokens.css / map.css (without "--") that fills the squares of this block; null = State layers
      panel:  function (block, lang, node, ctx) // HTML added on top of the block detail (escape your own text); '' = nothing; node = "capability:<id>" of the block or null; ctx = {hcheck} (#220), forward it when wrapping
      mark:   function (block),  // true: the square gets the idea frame (class vmark)
      badge:  function (block),  // optional {band, text}: small score badge on a top-level square (data-hband, data-hs)
      tools:  function (lang, labelOf) // optional HTML for the tool row above the map (#viewTools)
    }

Health criteria box (#217): `views.js` renders `map/data/criteria.json`, an optional asset announced in `links.json` and handed over with
`MapViews.setCriteria`. It is built by `publication.mjs` (`criteriaAsset`) from `platform/capabilities/health/*.md` (format and resolver:
`platform/lib/health-criteria.mjs`, metric names: `platform/lib/health-metrics.mjs`). The box shows the effective criteria of the capability, the file
each key comes from, the reviewer instruction (escaped) and an "Edit" link to the GitHub web editor on branch `dev` for every file involved. Only
`https://github.com/OpenResilienceInitiative/ORISO-Docs/edit/dev/<path>` is ever rendered. Criteria that apply only to a path inside the capability
(for example CRAP for the frontend repositories) are listed as narrower rules. Without `criteria.json` the panel says so. Up to 980 px the box is
in the bottom sheet that the Details button opens. Tests: `test/map-criteria.test.mjs` (panel, escaping, guard), `test/map-criteria-render.test.mjs` (Playwright).

Health run records (#218): `views.js` renders `map/data/health.json`, an optional asset (`{schemaVersion: 1, records: [...]}`, the latest run record per scope),
handed over with `MapViews.setHealth(doc, slugFn)`. `publication.mjs` (`healthAsset`) builds it from `health/runs/` at the repository root after validating every
record (schema, scores, file path; one invalid file stops the build). Format, layout, scoring and the metric runner: `health/README.md`.
A square shows its capability's newest run for the whole capability (folder runs are listed in the panel, they do not colour the square). Colour bands
of the overall score, tokens `--ua-health-*` in `assets/tokens.json` (light and dark, contrast and colour-vision tests in `test/colour-tokens.test.mjs`):
good from 80, fair from 60, weak from 40, otherwise critical. Grey (`--neutral`) means "no data": no record, or a record whose criteria could not be scored
(`overall: null`). The score also stands as a number in the square (`data-hs`, CSS `attr()`), so colour never carries the meaning alone.
The panel shows date, model, commit (7 characters, full id in the title), criteria version, run id, every metric with value against threshold, its state
and its source, the model verdict with reasons, the GitHub source link (only a tree URL of the organisation is rendered) and the graph node id.
**No invented data:** every number sits in an element with `data-from="<path in the record>"`; `test/health-view.test.mjs` checks that each equals that
record field and that no digit is left outside such elements; the page computes nothing but the band. Record texts are untrusted and rendered as text.
Tests: `test/health-view.test.mjs` (colours, panel, tracing), `test/health-publication.test.mjs`, `test/map-health-render.test.mjs` (Playwright, 320/390/1440 px, light and dark, DE and EN).
Steering section (#221): the Health panel appends a "Steering" section after the criteria box (`withSteering()` wraps `VIEWS.health.panel`, so the
box and the colouring of #218 are untouched). It renders `map/data/steering.json` (optional asset, `MapViews.setSteering`): member comments newest first
with author and date, escaped, plus the link "Add a comment on GitHub" to the capability's steering issue (https links to
`OpenResilienceInitiative/ORISO-Docs/issues/<n>` only). The view repeats the export's member check. An area without a steering issue shows the exact command
`node tools/planning-map/steering.mjs ensure --capability <id> --apply`. Producer and format: tools/planning-map README, "Human steering". Tests:
`test/map-steering.test.mjs`, `test/map-steering-render.test.mjs` (Playwright, XSS payload), `test/steering-publication.test.mjs`.
History section (#219): `withHistory()` appends a "History" section after the criteria box (before Steering). `health.json` carries, next to `records`, a
`history` list (`[{scope, total, runs}]`, `historyCap: 50`): per scope the newest 50 runs, oldest first, each compact: `file` (path of the full record in the docs
repository, `health/runs/...`), `startedAt`, `model`, `commit`, `criteriaVersion`, `overall`, `metrics[{name,value,threshold,better,score}]`, `verdict[{criterion,score}]`.
Reasons and details stay in the full record; `total` says how many runs exist, the panel then reads "last 50 of N runs". Built by `buildHealthDoc` in
`platform/lib/health-run.mjs`. The section shows a trend line (an SVG built with DOM APIs in `trendSvg()`, time on x, overall 0 to 100 on y, a run without a score is a
gap; colours only through the classes `hh-*` and `--ua-health-*` tokens), the list of runs newest first with date, model, commit and overall, and under every earlier run
a "Compare with latest" `<details>`. The comparison is `MapViews.compareRuns(earlier, later)` (pure, language free): per metric and per model criterion the delta and a
direction `better | worse | same | unknown` (metrics by their `better` of `platform/lib/health-metrics.mjs`, criteria and overall higher is better), reason codes
(`into-threshold`, `out-of-threshold`, `threshold-changed`, `not-measured-before`, `only-in-later`, ...) and the reason texts of the records. It never computes a delta
against a metric that could not be measured. A changed `criteriaVersion` is flagged. Each run links to its Understand node through `MapViews.setNodeLink` (map.js hands
over its `uaNodeHref` deep-link helper; only `https://understand.oriso.org/` links are rendered) and to `github.com/OpenResilienceInitiative/<repo>/tree/<commit>` (https
guard on the whole URL). Tests: `test/health-compare.test.mjs`, `test/health-history-view.test.mjs`, `test/map-history-render.test.mjs` (Playwright, strict CSP, 320/390/1440 px,
light and dark, DE and EN), `platform/test/health-history.test.mjs`.

"Send health check" section (#220): a separate function `MapViews.healthCheck(scopes, lang)` in `views.js`, placed by `map.js` (`hcheckScopes`, `hcheckHTML`) in the Health view only:
after the criteria and steering boxes of a capability, and right after the title of a folder or file view. It shows the exact command
`node tools/planning-map/plan.mjs health-check --capability <id> --repo <name> [--path <folder>]` (a dry run) with "Copy command" and "Copy with --apply", the same pattern as the
release move without a transport (`plan-ui.js`). A capability gets one command per repository it has code in; a file is checked as its folder and the section says so.
A scope that is not a plain capability id, repository name and relative folder gets no command. Tests: `test/health-check-view.test.mjs`, `test/map-health-check-render.test.mjs` (Playwright).

`map.js` sets the fill through the CSSOM (`--view-fill` on each square), never through a `style` attribute. Colours need a light and a dark value.
Render tests: `test/map-views-render.test.mjs` (Playwright, strict CSP, 320/390/1440 px).

#### Plan canvas and idea pages (ORISO-Docs#223)

An idea is a bilingual page in the feature-page structure: `product/ideas/<slug>.mdx` (English, canonical) with the German page at
`site/translations/de/product/ideas/<slug>.mdx`, a `site/page-catalog.json` entry and a `docs.json` entry in the group "Ideas", so it is
published like a feature page. Start from `product/ideas/idea-template.mdx` (`template: true` keeps it off the canvas). Front matter:

    status: idea | discussed | specified | epic   # flow shown on the idea
    capabilities: [case-handover, notifications]   # ids of capability-rules.json; an unknown id fails the build
    epic: OpenResilienceInitiative/ORISO-Frontend#42   # optional (required for "epic"); public repositories only
    draftItems: 3                                  # optional, a count, never titles

`tools/planning-map/lib/ideas.mjs` validates all of it, and that the German page carries the same status, capabilities and epic.
`publication.mjs` (`ideasAsset`) emits `map/data/ideas.json` (optional data, announced in `links.json`; tests: `test/ideas-publication.test.mjs`,
`tools/planning-map/test/ideas.test.mjs`). The Plan view lists the ideas; picking one frames the squares it touches (overview level), shows the
flow idea > discussed > specified > epic and the links to the German and English page and to the epic (https links to `docs.oriso.org` and
`github.com` only). In State and Health ideas are hidden; the toggle "Show ideas" frames the touched squares with a dashed outline.
Selection and toggle are page state, not part of the URL. Render tests: `test/ideas-render.test.mjs`, pure model: `test/ideas-view.test.mjs`.

### Planning board on the map (`board.json`, ORISO-Docs#208)

`.github/workflows/planning-board-sync.yml` exports the ORISO Roadmap project hourly and on
"Run workflow". The map footer shows "Board synchronisiert <syncedAt>" and a "Jetzt synchronisieren" link to that
workflow's page; no token reaches the browser. The page's one "Stand" comes from the run manifest (#201).

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

### Deep links

Every capability, folder and file in the map links to its Understand node (`?node=<id>` on the viewer; ids `capability:<slug>`, `<repo>::folder:<dir>`, `<repo>::file:<path>`). The viewer links back with `/map/#node=<id>`: the map zooms to that capability, folder or file, and an unknown id shows a "not found" notice above the controls (`.map-notfound`).

### Agent jobs on the map (`map/jobs.js`, ORISO-Docs#216)

`map/jobs.js` (classic script, run by `test/jobs-agg.test.mjs`, rendered by `test/map-jobs-render.test.mjs`) reads `items[].job` and the finding `job-stale` from `board.json` (written by `tools/planning-map`, see its README, "Agent jobs"). It adds, without touching the branch logic:

- a job badge next to the branch badge on epic cards, in the epic header and on every task in the epic view (`Job: running · stale`, epics sum `Jobs: 3 running · 1 stale · 1 waiting for a human`); both badges open `#workdlg` through the same `data-work` ref, also for a job without any branch;
- a job block at the top of the pop-up: state, where (runner, machine label), started and updated (UTC), model, next step, report link (https only, anything else stays text), branches and PRs as the agent reported them, and the stale reason;
- a Jobs filter in the epic view (all, running, stopped, waiting for a human, stale), combined with the status and gate filters; `running` includes stale ones, `stale` is only the stale ones. It is hidden when no issue of the epic has a job.

`map.js` only calls it (`JOBS`, `badges()`, `applyFilter`/`filterHTML` in `epicBoardHTML`, the pop-up, the `job-stale` finding text, the `data-jfilter` click). No job content exists for private repositories, drafts or redacted items: the export never writes it.
