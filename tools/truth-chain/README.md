# Source-bound documentation generation

The public publication workflow uses the existing pinned Understand-Anything installer and producer. It clones the producer's declared public source inventory, rebuilds and verifies a complete generation, exports public aggregates, checks source-bound evidence decay, and generates bilingual technical graph pages for catalog ingestion.

```text
pinned installer + public source clones
→ bundle refresh + bundle refresh verify
→ prepare-documentation.mjs
→ docs/generated/** + marked page-catalog.json
→ site sync --full-current + root build
→ publication hash manifest + immutable artifact
→ configured host activation + every-byte public readback
```

The pipeline does not treat the September 21 public status snapshot, a successful HTTP response, or a generated timestamp as fresh released-main evidence. Each generated page displays the exact generation ID, repository source ref and full source SHA. Mixed Dev/main inputs are labeled as declared source refs, separate from release, deployment and legal approval.

## Prepare a validated generation

Use the pinned installer/producer entrypoints documented in `tools/understand-anything/README.md`. Both manual and CI consumers validate the complete generation schema, age, source-SHA consistency, file inventory and hashes using the same bundle contract. Unknown/private source repositories fail closed against the GitHub-verified public repository list.

```bash
node tools/truth-chain/prepare-documentation.mjs \
  --generation "$GENERATION_DIRECTORY" \
  --tooling "$PINNED_TOOLING_DIRECTORY" \
  --repos-root "$SOURCE_CLONES_DIRECTORY"

node --test tools/truth-chain/test/*.test.mjs
```

The existing `ua-export-docs.mjs` and `ua-generate-docs-pages.mjs` entrypoints now require `--generation`; an arbitrary old checkout graph or unvalidated export file is not publication evidence. No transport endpoint or credentials are guessed. The workflow produces its own validated public generation using the existing producer, avoiding a dependency on an unconfigured source-publication transport.

## Generated-directory and catalog contract

Only `docs/generated/**` is written. Existing Markdown requires explicit `generated: true` frontmatter; a filename or a prose mention does not authorize overwriting editorial content. Existing registries require `generated: true`. Protection is checked before page output is written.

```text
docs/generated/<page>.md                  canonical generated EN
docs/generated/locales/de/<page>.md       deterministic DE template
docs/generated/locales/en/<page>.md       deterministic EN template
docs/generated/page-catalog.json          marked registry

registry: version=1, generated=true, generationId, pages[]
page: id, source, route, aliases, owner, lifecycle, translations, graphSource
translation: path, sourceHash, reviewedAt
graphSource: generationId, generatedAt, scope=declared-source-refs,
             sources[{repository,ref,sourceSHA}]
```

Templates localize full fixed prose and preserve identifiers, links, source refs, SHAs and original-source quotations. Repository descriptions appear as explicitly labeled original-language source evidence in both locales. The parent site generator ingests the marked registry; the truth-chain producer never copies or edits curated site articles.

## Evidence and deployment boundaries

DPIA chapters are never rewritten. Raw evidence-map paths and findings stay under nonpublic `.understand-anything/docs-export/`; generated pages show public aggregate counts. A missing clone or inspected clone with another HEAD SHA produces `unverified`, not a successful source check.

Activation consumes the immutable artifact only after its exact source revision was approved on `dev`. A hosted preflight requires explicit `DOCS_PUBLICATION_RUNNER_LABELS` and `DOCS_PUBLICATION_ROOT` before any self-hosted activation can be queued. The owner must bind the existing Docs nginx root to that configured release root's `current` directory. The repository's historic manual rsync instruction does not prove that host binding exists. Browser acceptance and legal approval remain separate from public hash readback.
