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
