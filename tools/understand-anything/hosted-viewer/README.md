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
