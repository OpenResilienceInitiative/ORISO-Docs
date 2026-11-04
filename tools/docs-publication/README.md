# Technical documentation publication

This package prepares verifiable technical Docs releases. Understand remains the overview and its `/legal/` publication is canonical. This tooling does not approve a DPIA or rewrite historical legal releases.

It selectively reuses PR107's graph export, evidence decay and generator modules. The old workflow's `main`/`pre-dev` integration and editorial filename overwrite rules are replaced. Generated summaries go only to `docs/generated/`; an existing document is writable only when its frontmatter explicitly says `generated: true`. The site generator owns `site/content/`. Graph export admits repositories in `tools/truth-chain/public-repositories.json`, verified against GitHub visibility; private and unknown repository evidence is omitted, including commits, endpoints and cross-repository relations.

The publication workflow tests on PRs and prepares activatable artifacts only for an explicitly published platform release. Dev pushes and PRs refresh declared source refs only for non-activatable preview artifacts. Release inputs lock every supported public repository to the exact released tag or full SHA, with no fallback to a Dev/main branch tip. It depends on the bilingual catalog/router package in PR117. Missing or stale current translations, unresolved source hashes, missing article outputs and internal output files fail the artifact gate. Every artifact carries the full source revision and the hash of every public file. A preview cannot be used as publication acceptance.

## Operator installation after human review and merge

Download the successful `technical-docs-<run-id>` artifact from the exact platform release run. Use the existing configured Docs nginx root with a `current` release link; do not guess a server directory or change the Understand/legal host. Installation checks the exact approved revision, origin and all artifact bytes. It activates an immutable release with an atomic link change and reports the previous target. It never overwrites an old release.

```bash
node tools/docs-publication/release.mjs \
  --artifact "$DOCS_ARTIFACT_DIRECTORY" \
  --destination "$DOCS_PUBLISH_ROOT" \
  --revision "$RELEASED_DOCS_REVISION" \
  --origin https://docs.oriso.org

node tools/docs-publication/publication.mjs --verify-live \
  --manifest "$DOCS_ARTIFACT_DIRECTORY/publication-manifest.json"
```

The live check requires the public manifest to be byte-identical to the reviewed artifact, then fetches every file and compares its size and SHA256. HTTP200 alone is insufficient. Browser checks of old links, article/section switching, search and Markdown remain required. Publication, live byte verification and browser acceptance are independent evidence records. A failed live check does not invent success or automatically roll back somebody else's deployment.

## Local checks

```bash
node --test tools/truth-chain/test/*.test.mjs tools/docs-publication/test/*.test.mjs
```

The HTTP fixture deliberately serves stale bytes with a successful status to verify detection. Release fixtures verify that activating a new release preserves the previous release byte-for-byte and that an invalid artifact leaves the current link unchanged.

## Existing host binding verified read-only on 2026-09-30

The Docs nginx virtual host serves `/var/www/docs-site`, currently a symlink to `/var/www/docs-releases/20260818-011141`. This is separate from Understand `/var/www/understand` and its legal alias `/var/www/legal/`. No server configuration or release was changed during this check. The repository currently has no publication runner variables; that automated binding still needs an operator.

The existing Docs symlink can be activated directly after review and merge, preserving the August release:

```bash
node tools/docs-publication/release.mjs --artifact "$DOCS_ARTIFACT_DIRECTORY" \
  --destination /var/www/docs-releases --current-link /var/www/docs-site \
  --revision "$RELEASED_DOCS_REVISION" --origin https://docs.oriso.org
```

Install the reviewed locale redirect map in the existing Docs nginx virtual host before testing the exact historical `.md` URL. A source build and a successful local activation are not public acceptance.

## Release policy — user decision 2026-09-30

No time-based publication runs. `.github/workflows/docs-publication.yml`, `ua-public-site.yml` and `ua-graph-refresh.yml` accept `repository_dispatch` of type `platform-release-published`, or an explicit `workflow_dispatch` with the same release manifest JSON. A Dev merge only runs checks and previews. Release validation checks the published release identity and exact repository commits before generation; moving tags, omitted inputs, private inputs and mismatching source vectors fail closed.

The controller supplies `release_manifest` (manual: JSON string; dispatch: client_payload.release_manifest object). The workflow preserves that manifest outside the checkout, then checks out its documentationRevision. The manifest must not be required inside that same commit: a commit cannot contain its own hash. The publication manifest includes the release version, URL, source vector and manifest hash. Exact bytes are still checked publicly after activation.

The old `ua-nightly-full.sh` entry point rejects calls without a release manifest and the explicit release requirement. Operators must retire any remaining server cron/timer and bind the existing platform release coordinator to this event. This source change does not prove that a hosted cron was removed or that a release event was installed. Legal re-verification may create review work at release time; technical, operator and legal approvals remain separate.
