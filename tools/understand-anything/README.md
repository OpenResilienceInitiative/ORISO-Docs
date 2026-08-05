# Understand-Anything Tooling

Deterministic pipeline that builds and maintains the ORISO code-knowledge graphs
served by `understand.oriso.org` (server `oriso-understand-dev-1`,
`/opt/oriso-understand/`). Committed here so the tooling can never be lost again
(the original June 2026 generators were machine-local and disappeared —
see ORISO-Docs#61).

## Components

| Script | Purpose |
|---|---|
| `ua-nightly-full.sh` | **The nightly driver (02:00 cron).** Full deterministic rebuild: advances every repo clone to its origin tip, regenerates all 12 per-repo graphs (generate + enrich), installs them, and rebuilds the super-graph. ~90 s total. Replaces the overlay/baseline approach, which could silently freeze on a stale base. |
| `ua-generate.mjs` | Per-repo deterministic graph generator. Walks tracked files, runs the understand-anything-plugin core (tree-sitter for code, built-in parsers for yaml/md/sql/sh/…), builds nodes/edges (contains/imports/calls), heuristic layers + tour, fingerprints, meta. ~3s per repo, no LLM. |
| `ua-enrich-merge.mjs` | Merges a coarse enrichment JSON (concept/flow nodes + related-edges, authored per repo) into a staging graph; adds a "Domain Concepts" layer; validates (unresolved refs are reported and must be fixed). |
| `enrichments/*.json` | The per-repo enrichment content (concepts/flows grounded in READMEs + class inventories). 12 repos covered since 2026-08-05 (added helm, e2e, infra, database). |
| `ua-build-supergraph.mjs` | Builds the cross-repo super-graph: prefixes node ids (`<Repo>::<id>`), adds `repo:*` root nodes + containment edges, per-repo layers, an overview tour, and **deterministic cross-repo `depends_on` edges** (service-keyword evidence, count ≥ 2). `--install` deploys into `ORISO-Docs/.understand-anything/` and writes a `meta.json` for freshness checks. |
| `refresh-understand-ultralite-local.sh` | RETIRED 2026-08-05 (kept for reference). The old nightly overlay refresh; superseded by `ua-nightly-full.sh`. |

## Indexed repos & branches

Since 2026-08-05 the board tracks the **pre-dev integration branches** where they
exist, and 13 dashboards run on ports 5173–5185:

| Repo | Branch | Dashboard |
|---|---|---|
| ORISO-Frontend, ORISO-Admin, ORISO-UserService, ORISO-AgencyService, ORISO-ConsultingTypeService, ORISO-TenantService | `pre-dev` | per-service |
| ORISO-Database, ORISO-Kubernetes (legacy, analysis only) | `dev` | per-repo |
| ORISO-Keycloak | `feature/understand-anything-graph` | per-repo |
| ORISO-Helm, ORISO-E2E, ORISO-Infra | `main` | per-repo (added 2026-08-05) |
| ORISO-Docs | `main` | hosts the super-graph (`/docs/`) |

## Nightly operation (server)

```
0 2 * * *   ua-nightly-full.sh          # full rebuild of everything
30 2 * * *  prune daily .bak-* > 7 days
35 2 * * *  prune .bak-prerebuild-* > 30 days
```

Dashboards read the graph JSON from disk per request — no container restarts
are needed after a rebuild.

## Manual rebuild (server)

```bash
/opt/oriso-understand/_rebuild/ua-nightly-full.sh
```

Or a single repo:

```bash
cd /opt/oriso-understand/_rebuild
node ua-generate.mjs /opt/oriso-understand/<Repo> <Repo> ./<Repo>   # deterministic base
node ua-enrich-merge.mjs ./<Repo> enrich-<repo>.json                # coarse semantics
cp ./<Repo>/{knowledge-graph.json,meta.json,fingerprints.json} /opt/oriso-understand/<Repo>/.understand-anything/
node ua-build-supergraph.mjs --install                              # refresh super-graph
```

The nightly pipeline writes daily `.bak-<timestamp>` copies (pruned after
7 days). `.bak-prerebuild-*` files are manual rollback snapshots taken before
risky rebuilds (e.g. the 2026-08-05 pre-dev switch); the 02:35 cron prunes
them after 30 days.

## Notes

- The plugin core lives at
  `/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/`
  (v2.7.x). All scripts import its public API — no LLM calls anywhere in this pipeline.
- Server access: key-auth only (`ssh oriso-understand-root`); private repos
  (E2E, Infra) are fetched via the same credential-store pattern as the pre-dev
  deploy server.
- Enrichment `related` refs must point at files the generator parses into nodes
  (code, yaml, md, sql, sh). Lock files, dotfiles, `.ftl`/`.properties`, `.txt`,
  and anything under `.github/` do not resolve.
- ORISO-Kubernetes is archived upstream (Neusta-owned): analysis only, never push.
- Full context: rebuild EPIC ORISO-Docs#61 and the plan in the workspace
  (`0 - Docs/plans/2026-07-15-understand-anything-semantic-rebuild.md`).
