# Understand-Anything Tooling

Deterministic pipeline that builds and maintains the ORISO code-knowledge graphs
served by `understand.oriso.org` (server `oriso-understand-dev-1`,
`/opt/oriso-understand/`). Committed here so the tooling can never be lost again
(the original June 2026 generators were machine-local and disappeared —
see ORISO-Docs#61).

## Components

| Script | Purpose |
|---|---|
| `ua-generate.mjs` | Per-repo deterministic graph generator. Walks tracked files, runs the understand-anything-plugin core (tree-sitter for code, built-in parsers for yaml/md/sql/sh/…), builds nodes/edges (contains/imports/calls), heuristic layers + tour, fingerprints, meta. ~3s per repo, no LLM. |
| `ua-enrich-merge.mjs` | Merges a coarse enrichment JSON (concept/flow nodes + related-edges, authored per repo) into a staging graph; adds a "Domain Concepts" layer; validates. |
| `enrichments/*.json` | The per-repo enrichment content (concepts/flows grounded in READMEs + class inventories), state of 2026-07-16. |
| `ua-build-supergraph.mjs` | Builds the cross-repo super-graph: prefixes node ids (`<Repo>::<id>`), adds `repo:*` root nodes + containment edges, per-repo layers, an overview tour, and **deterministic cross-repo `depends_on` edges** (service-keyword evidence, count ≥ 2). `--install` deploys into `ORISO-Docs/.understand-anything/`. |
| `refresh-understand-ultralite-local.sh` | Copy of the server's nightly 02:00 cron (patched 2026-07-16): overlay baseline now comes from the graph's `meta.json.gitCommitHash`, and clones advance to `origin/<branch>` nightly (preserving `.understand-anything/`) so file views stay current and the baseline can never freeze again. |

## Rebuild procedure (per repo, on the server)

```bash
cd /opt/oriso-understand/_rebuild
node ua-generate.mjs /opt/oriso-understand/<Repo> <Repo> ./<Repo>   # deterministic base
node ua-enrich-merge.mjs <Repo> enrichments/enrich-<repo>.json      # coarse semantics
# validate output, then install:
cp ./<Repo>/{knowledge-graph.json,meta.json,fingerprints.json} /opt/oriso-understand/<Repo>/.understand-anything/
docker compose up -d --force-recreate <service>
node ua-build-supergraph.mjs --install                              # refresh super-graph
```

Live graphs keep `.bak-prerebuild-*` rollback copies next to them. Daily `.bak-*`
files are pruned after 7 days by a companion cron (02:30).

## Notes

- The plugin core lives at
  `/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/`
  (v2.7.x). All scripts import its public API — no LLM calls anywhere in this pipeline.
- ORISO-Kubernetes is archived upstream (Neusta-owned): analysis only, never push.
- Full context: rebuild EPIC ORISO-Docs#61 and the plan in the workspace
  (`0 - Docs/plans/2026-07-15-understand-anything-semantic-rebuild.md`).
