# Hosted graph source previews

Compatibility repair for the audited custom viewer on understand.oriso.org.
Refs OpenResilienceInitiative/ORISO-Docs#114. This is not an upstream plugin upgrade.

The source viewer now sends the exact graph node ID. The server derives the
repository from that node and resolves the indexed file within an explicit
read-only repository map. Private unpublished repositories remain unavailable.
Same-name files cannot silently resolve in ORISO-Docs, and symlink/path escapes
are rejected. Optional unpublished views and unsupported source previews have
neutral explanations; real loading failures remain errors.

## Apply and rollback

`python3 apply.py /path/to/understand-anything-plugin --check` verifies the
three audited file hashes and dry-runs the patch. Omit `--check` to apply.
`--rollback` reverses this patch only when its output files remain unchanged.
Unexpected upstream/local changes fail instead of being overwritten. Preserve
the pre-existing ORISO customization when upgrading the underlying plugin.

On the hosted server, `fix-data-routes.py` repairs the two nginx data-route
rewrites, then run `nginx -t` before reloading nginx. The script retains the
previous config beside it. `configure-source-mounts.py` updates only the Docs
service, retaining a mode-0600 compose backup; it mounts the 14 public source
repositories read-only and provides ORISO_SOURCE_REPOS. Neither script prints
configuration secrets. Recreate the Docs container to activate mount/env changes.
Explicitly restart viewer containers when changing vite.config.ts; Vite did not
reliably reload that file during this repair. Existing URL access tokens remain
in the runtime configuration and must never be copied into this repository.

Rollback configuration using the retained nginx and compose copies, validating
nginx and recreating Docs afterward. Do not overwrite changes made since this
repair; compare the targeted sections first.

## Verification

`node --test source-location.test.mjs`: matching filenames across repositories,
exact node/path binding, unpublished repositories, traversal/symlink escape,
single-repository membership and missing files.

The isolated UI TypeScript check and production build passed. Live Playwright
verified optional 404 states; route-mocked 500/schema errors remain distinct.
The disclosure fits at 320px. The exact reported Helm file opens through the
Supergraph. Source content was not logged; the evidence image masks it because
seed scripts may contain test credentials. Browser mocks prove presentation,
not the existence of corresponding live errors.

## Explicit operator bindings

The retained scripts are reviewed compatibility tools, not deployment proof.
`configure-source-mounts.py` now requires `--compose`, `--source-root`, and
`--repositories` and rejects any repository outside the verified public policy.
`fix-data-routes.py` requires `--config`. No host path or service activation is
inferred. Inspect the selected files first; the pinned patch refuses an unknown
viewer baseline. These scripts were not executed against any server.

## Pinned source-preview integration

The current installer uses `patches/oriso-public-source-preview-v1.patch` after
`oriso-schema-viewer-v1.patch` on the exact locked upstream commit. It verifies
both patch checksums and the resolver/type-module checksums, copies those modules,
and builds core and dashboard before activating its immutable runtime release.
The older `apply.py`/`viewer.patch`/manifest are historical compatibility tooling
for their recorded baseline; do not apply them blindly to the current pinned tree.

`runtime-test.mjs --upstream <installed-upstream>` starts and closes an isolated
Vite fixture. It verifies actual public source bytes, private-unavailable and
node/path mismatch responses, plus the separate repository viewer source root.
It proves the built route with synthetic fixtures, not the live server.

`ua-public-site.yml` produces a fresh validated public generation and hub artifact
from approved Dev. The hosted binding job requires an approved JSON list of every
viewer (`service`, `repository`, `origin`, `workspaceTarget`, `graphTarget`), existing
per-service token bindings, and explicit host roots/Compose/current-link bindings.
All generation public repositories need their own declared viewer. Missing
coverage fails by repository name; no source graph is replaced with Supergraph.
The consumer clones exact public source commits into immutable generation trees,
keeps each viewer's selected graph, mounts code read-only, rebuilds the pinned
viewer and reads back each selected public source hash. Credentials and source
bodies are never printed. Existing legal services/trees are untouched.

The host operator still must supply the actual approved viewer list, tokens,
Compose path/container targets, runner registration and nginx hub current-link
migration. The actual Understand root is a directory, so no existing current-link
is inferred. Missing bindings fail; these tools were not run on the host.
