# Understand-Anything Tooling

Deterministic pipeline that builds and maintains the ORISO code-knowledge graphs
served by `understand.oriso.org` (server `oriso-understand-dev-1`,
`/opt/oriso-understand/`). Committed here so the tooling can never be lost again
(the original June 2026 generators were machine-local and disappeared —
see ORISO-Docs#61).

## Components

| Script | Purpose |
|---|---|
| `ua-nightly-full.sh` | **The nightly driver (02:00 cron).** Full deterministic rebuild: advances every repo clone to its origin tip, regenerates all 17 per-repo graphs (generate + enrich), installs them, and rebuilds the super-graph. ~90 s total. Replaces the overlay/baseline approach, which could silently freeze on a stale base. |
| `ua-generate.mjs` | Per-repo deterministic graph generator. Walks tracked files, runs the understand-anything-plugin core (tree-sitter for code, built-in parsers for yaml/md/sql/sh/…), builds nodes/edges (contains/imports/calls), heuristic layers + tour, fingerprints, meta. Since 2026-08-27 it also **extracts OpenAPI endpoints** (own indentation scanner — the generic YAML parser claims specs but yields none; 547 endpoint nodes platform-wide, method-level) into an "API Endpoints" layer, and sorts layers architecture-first (`LAYER_ORDER`). ~3s per repo, no LLM. |
| `ua-enrich-merge.mjs` | Merges a coarse enrichment JSON (concept/flow nodes + related-edges, authored per repo) into a staging graph; adds a "Domain Concepts" layer, then re-applies the `LAYER_ORDER` sort; validates (unresolved refs are reported and must be fixed). |
| `enrichments/*.json` | The per-repo enrichment content (concepts/flows grounded in READMEs + class inventories). **All 17 repos covered since 2026-08-27** (added elementcall, livekit, healthdashboard, status, signoz). |
| `ua-build-supergraph.mjs` | **v3 (2026-08-27):** builds the cross-repo super-graph as a **microservice architecture map** — curated role descriptions per repo, tier layers (User Interfaces / Backend Microservices / Identity & Data / Communication & Media / Operations & Deployment / Observability & Quality), per-repo layers ordered architecture-first, and a tour that walks the platform tier by tier. Prefixes node ids (`<Repo>::<id>`), adds `repo:*` root nodes + containment edges and **deterministic cross-repo `depends_on` edges** (service-keyword evidence, count ≥ 2 — keywords now include elementcall/livekit/signoz). `--install` deploys into `ORISO-Docs/.understand-anything/` and writes a `meta.json` for freshness checks. |
| `refresh-understand-ultralite-local.sh` | RETIRED 2026-08-05 (kept for reference). The old nightly overlay refresh; superseded by `ua-nightly-full.sh`. |

## Indexed repos & branches

Since 2026-08-05 the board tracks the **pre-dev integration branches** where they
exist, and 16 dashboards run on ports 5173–5190 (two are stopped, see below):

| Repo | Branch | Dashboard |
|---|---|---|
| ORISO-Frontend, ORISO-Admin, ORISO-UserService, ORISO-AgencyService, ORISO-ConsultingTypeService, ORISO-TenantService | `pre-dev` | per-service |
| ORISO-Database, ORISO-Kubernetes (legacy, analysis only) | `dev` | per-repo |
| ORISO-Keycloak | `feature/understand-anything-graph` | per-repo |
| ORISO-Helm, ORISO-E2E, ORISO-Infra | `main` | per-repo (added 2026-08-05) |
| ORISO-Docs | `main` | hosts the super-graph (`/docs/`) |

Added 2026-08-26 — the five repos that had no graph at all:

| Repo | Branch | Dashboard | Nodes/edges |
|---|---|---|---|
| ORISO-ElementCall | `pre-dev` | `/element-call/` (5186) | 789 / 713 |
| ORISO-Livekit | `pre-dev` | `/livekit/` (5187) | 81 / 68 |
| ORISO-HealthDashboard | `pre-dev` | `/health-dashboard/` (5188) | 49 / 37 |
| ORISO-Status | `pre-dev` | `/status/` (5189) | 35 / 16 |
| ORISO-SigNoz | `main` | `/signoz/` (5190) | 18 / 3 |

Two of those five cannot receive their graph in the branch yet:

- **ORISO-SigNoz** has only `main`. A `pre-dev` branch is being created so the graph
  can land there like everywhere else; until then the graph exists only on the server.
  Tracked in ORISO-Docs#102.
- **ORISO-Status** is archived on GitHub — no PR is possible at all. Its graph is
  server-side only, and stays that way unless the repo is unarchived.

**RAM situation (updated 2026-08-28).** The host has 3.8 GB and no swap. On
2026-08-26 the OOM killer twice took the `docs` dashboard while dashboards were
being added (the 34 MB Docs graph is the largest consumer); `status`/`signoz`
were temporarily stopped as mitigation. Since 2026-08-27 **all 18 dashboards run
again** (operator decision, see the `bak-enable-livekit-health-*` nginx backups)
and the nightly passes with ~1 GB available — but the machine has no headroom
reserve and no swap, so a memory-hungry change can OOM again. Peak of
`ua-build-supergraph.mjs`: 487 MB RSS. The `/kubernetes/` dashboard was removed
from nginx on 2026-08-27 (repo deprecated); the graph is still built for
super-graph analysis.

**Incident 2026-08-27/28:** the root crontab was found EMPTY on 2026-08-28
(wiped 2026-08-27 07:14 UTC, probably collateral of a manual server session) —
the 2026-08-28 02:00 rebuild did not fire. All three entries were restored on
2026-08-28 and `crontab.orig.txt` in `_rebuild/` now holds the current crontab
as reference. If graphs ever look one day stale, check `crontab -l` first.

Note (2026-08-14 rebuild): the committed snapshot artifacts in this repo were
rebuilt from `pre-dev` for **ORISO-E2E** (its `main` is ~75 commits behind) and
**ORISO-Keycloak** (instead of the stale `feature/understand-anything-graph`).
The server clones still track the branches in the table above — switching them
(`git checkout pre-dev` in `/opt/oriso-understand/ORISO-E2E` and `…/ORISO-Keycloak`)
is a pending server-side follow-up. The `.mjs` scripts now honor `UA_CORE` /
`UA_BASE` env overrides so the pipeline can also run off-server (defaults unchanged).

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
