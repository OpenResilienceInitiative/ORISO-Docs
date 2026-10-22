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
`board.json`) are merged into the same object when present.

Regenerate the data from the measured intermediate files (code counts, tests,
stories, graph links):

    node map/build-map-data.mjs --inputs DIR --out map/data

`DIR` holds `agg`, `rel`, `drill`, `epics`, `zoom`, `planned`, `desc`, `live`
and `car15` as `.json` files (see `test/fixtures/map-inputs/`). Output is
deterministic. `test/map-render.test.mjs` renders the page from
`test/fixtures/map-data/` in a browser under a strict CSP; it needs Playwright
(`UA_PLAYWRIGHT=/path/to/playwright/index.mjs`) and is skipped without it.

### Deep links

Every capability, folder and file in the map links to its Understand node (`?node=<id>` on the viewer; ids `capability:<slug>`, `<repo>::folder:<dir>`, `<repo>::file:<path>`). The viewer links back with `/map/#node=<id>`: the map zooms to that capability, folder or file, and an unknown id shows a "not found" notice above the controls (`.map-notfound`).
