# Exact released source inputs

Public graph and hub publication follows an actual stable platform release, not a daily schedule or moving `dev`/`main` tips. A lock records source evidence; it does not establish runtime completion, deployment, or legal approval.

Pass a retained JSON payload (schema `release-inputs.schema.json`) with `schemaVersion: oriso.platform-release/v1`, an exact stable `version`, canonical GitHub `releaseUrl`, full 40-character `documentationRevision`, and `sources` entries with `repository`, immutable `ref` (`refs/tags/...` or full SHA), and full `sourceSHA`. Include every supported public producer repository from `pipeline.REPOS`, excluding the two private repositories. The release-origin repository must be included. The Docs source SHA must equal the documentation revision. A payload supplied outside the checked-out commit avoids commit self-reference.

The source preparation CLI verifies public GitHub visibility, the actual non-draft/non-prerelease published release, and peeled tag SHA agreement before cloning. Supply `GITHUB_TOKEN` for authenticated read-only API requests; it is not printed or used as a private graph credential. Each source checkout fetches the exact ref and checks the locked SHA. The producer rechecks refs before sealing, so a retargeted tag fails closed.

```sh
python3 .github/scripts/ua_sources.py --tooling "$TOOLING" --base "$SOURCES" \
  --inventory "$INVENTORY" --repo-args "$REPO_ARGS" \
  --require-release --release-manifest "$LOCK" --documentation-revision "$DOCS_SHA"
# repo-args includes these release options and exact --repo inputs.
python3 -m bundle refresh --base "$SOURCES" --tools "$TOOLING" \
  --require-release --release-manifest "$LOCK" --documentation-revision "$DOCS_SHA"
python3 -m bundle refresh verify --base "$SOURCES" --tools "$TOOLING" \
  --require-release --release-manifest "$LOCK" --documentation-revision "$DOCS_SHA"
```

Released generations carry `manifest.release` with the retained `lock`, canonical sorted-JSON SHA-256 (`sha256`, no newline), GitHub `publishedAt`/`releaseId`, and `evidenceScope: published-github-release-and-source-refs`. Generation validation checks that hash and the complete exact source vector. Generation freshness still checks newly produced analysis; source code may legitimately belong to an older release.

Branch refresh without a lock remains available for non-activatable previews. Direct public viewer installation rejects generations without release evidence. Hub build accepts `--release-manifest "$LOCK"`: it crosschecks the generation marker and source vector, then emits `releaseBinding`. Without a lock it emits `state: preview`; installation and readback refuse it. The UI displays the release and publication time; elapsed age alone does not declare a release stale.

Operator runner, destination, current-link and viewer/token mappings remain explicit independent requirements. No server configuration or release readiness is inferred from this payload.
