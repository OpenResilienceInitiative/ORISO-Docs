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
