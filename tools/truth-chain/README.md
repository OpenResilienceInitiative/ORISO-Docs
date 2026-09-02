# Daily truth chain

Nightly glue for [ORISO-Docs#106](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/106).

```
graph rebuild (ua-nightly-full.sh)
        → ua-export-docs.mjs          # small JSON contract
        → evidence-decay-check.mjs    # DPIA evidence-map + canary
        → ua-generate-docs-pages.mjs  # generated MD only
        → optional site build/rsync   # only if site/package.json exists
```

## Commands (local)

```bash
# from ORISO-Docs root
node tools/understand-anything/ua-export-docs.mjs
node tools/evidence-decay-check.mjs \
  --map tools/truth-chain/fixtures/evidence-map.yaml \
  --repos-root tools/truth-chain/fixtures/clones \
  --expect-broken
node tools/understand-anything/ua-generate-docs-pages.mjs

node --test tools/truth-chain/test/*.test.mjs
```

Sibling service clones are optional. If `--repos-root` does not contain a cited repo, that claim is **`unverified`**, not `broken`.

## Do not overwrite editorial pages

`ua-generate-docs-pages.mjs` writes only the regenerate allowlist in `lib/generate-pages.mjs`. A hand-written file outside that list is skipped unless it already contains `generated: true`.

## DPIA

`oriso-platform/dsfa-text/evidence-map.yaml` is the claim registry (#83). The detector never rewrites chapter Markdown. Status lands in `.understand-anything/docs-export/evidence-status.json` and on `docs/platform/truth-chain-status.md`.
