# Cutover plan: `understand.oriso.org` on `oriso-understand-dev-1`

Prepared for ORISO-Docs#258. **Nothing in this file has been applied.** It lists what an operator and the release owners must decide and set so that a platform release updates the public Understand site by itself. Read `PRODUCTION.md` first; this file only fills in the values for this host.

## Why the site shows the 2026-09-21 state
Measured 2026-11-07. Both release-triggered runs of `ua-public-site.yml` (2026-11-04 06:42 UTC and the manual run 21:59 UTC) failed in job `binding` with `Missing Understand installation binding`, so job `consume` never ran. The graph itself was built (`ua-graph-latest`, 2026-11-04 22:07 UTC). The host still serves the hand-built layout (`/var/www/understand`, `status.json` installed 2026-09-21).

## What exists on the host (measured, read-only)
- Runner: service `actions.runner.OpenResilienceInitiative.oriso-understand-dev-1-docs`, active, pool `oriso-docs-production`. Variable `DOCS_PUBLICATION_RUNNER_LABELS` is `["self-hosted","oriso-docs-production"]`.
- nginx `understand.oriso.org`: `root /var/www/understand`, 16 viewer paths proxied to Vite dev servers on `127.0.0.1:5173-5190` with strip-prefix rewrites, plus `/legal/`, `/dokumentation/`, `/api/dpia`, and `403` for the private `e2e` and `infra` viewers.
- Compose `/opt/oriso-understand/docker-compose.yml`: 18 services on `node:22-bookworm`, no `platform` and no `supergraph` service.

## Proposed values (operator to confirm)
| Name | Kind | Proposed value | Why |
|---|---|---|---|
| `UNDERSTAND_RUNNER_LABELS` | variable | `["self-hosted","oriso-docs-production"]` | the runner already on this host |
| `UNDERSTAND_COMPOSE_FILE` | variable | `/opt/oriso-understand/docker-compose.yml` | existing file, backed up by the transaction |
| `UNDERSTAND_HUB_ROOT` | variable | `/var/www/understand-hub` | must not be the existing directory `/var/www/understand` (see migration) |
| `UNDERSTAND_HUB_CURRENT` | variable | `/var/www/understand-hub/current` | symlink target for nginx |
| `UNDERSTAND_STATIC_ROOT` | variable | `/opt/oriso-understand/static` | immutable viewer artifacts |
| `UNDERSTAND_RUNTIME_ROOT` | variable | `/opt/oriso-understand/runtime` | locked tooling install |
| `UNDERSTAND_SOURCE_ROOT` | variable | `/opt/oriso-understand/source` | exact released checkouts; do not reuse the existing `ORISO-*` folders in `/opt/oriso-understand` |
| `UNDERSTAND_ATTEMPT_RECEIPT` | variable | `/var/www/understand-receipt/refresh-attempt.json` | served separately by nginx, never from a hub release directory |
| `UNDERSTAND_VIEWER_BINDINGS` | variable | JSON below | one binding per repository |
| `UNDERSTAND_VIEWER_READBACK_TOKENS` | **secret** | created by the operator | one token per binding; never by an agent, never in the repository |

All paths must exist and be writable by the runner user `oriso-docs-runner` before the first run.

## Viewer bindings
```text
[
  {
    "service": "platform",
    "repository": "ORISO-Platform",
    "origin": "https://understand.oriso.org/platform/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "supergraph",
    "repository": "ORISO-Supergraph",
    "origin": "https://understand.oriso.org/supergraph/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "docs",
    "repository": "ORISO-Docs",
    "origin": "https://understand.oriso.org/docs/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "admin-service",
    "repository": "ORISO-Admin",
    "origin": "https://understand.oriso.org/admin-service/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "frontend",
    "repository": "ORISO-Frontend",
    "origin": "https://understand.oriso.org/frontend/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "user-service",
    "repository": "ORISO-UserService",
    "origin": "https://understand.oriso.org/user-service/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "agency-service",
    "repository": "ORISO-AgencyService",
    "origin": "https://understand.oriso.org/agency-service/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "tenant-service",
    "repository": "ORISO-TenantService",
    "origin": "https://understand.oriso.org/tenant-service/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "consulting-type-service",
    "repository": "ORISO-ConsultingTypeService",
    "origin": "https://understand.oriso.org/consulting-type-service/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "database",
    "repository": "ORISO-Database",
    "origin": "https://understand.oriso.org/database/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "keycloak",
    "repository": "ORISO-Keycloak",
    "origin": "https://understand.oriso.org/keycloak/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "helm",
    "repository": "ORISO-Helm",
    "origin": "https://understand.oriso.org/helm/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "kubernetes",
    "repository": "ORISO-Kubernetes",
    "origin": "https://understand.oriso.org/kubernetes/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "element-call",
    "repository": "ORISO-ElementCall",
    "origin": "https://understand.oriso.org/element-call/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "livekit",
    "repository": "ORISO-Livekit",
    "origin": "https://understand.oriso.org/livekit/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "health-dashboard",
    "repository": "ORISO-HealthDashboard",
    "origin": "https://understand.oriso.org/health-dashboard/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "status",
    "repository": "ORISO-Status",
    "origin": "https://understand.oriso.org/status/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  },
  {
    "service": "signoz",
    "repository": "ORISO-SigNoz",
    "origin": "https://understand.oriso.org/signoz/",
    "workspaceTarget": "/plugin",
    "graphTarget": "/graph"
  }
]
```

| Repository | Route | Compose service | Existing host port |
|---|---|---|---|
| `ORISO-Platform` | `/platform/` | `platform` | **none yet** |
| `ORISO-Supergraph` | `/supergraph/` | `supergraph` | **none yet** |
| `ORISO-Docs` | `/docs/` | `docs` | 5182 |
| `ORISO-Admin` | `/admin-service/` | `admin-service` | 5174 |
| `ORISO-Frontend` | `/frontend/` | `frontend` | 5173 |
| `ORISO-UserService` | `/user-service/` | `user-service` | 5175 |
| `ORISO-AgencyService` | `/agency-service/` | `agency-service` | 5176 |
| `ORISO-TenantService` | `/tenant-service/` | `tenant-service` | 5178 |
| `ORISO-ConsultingTypeService` | `/consulting-type-service/` | `consulting-type-service` | 5177 |
| `ORISO-Database` | `/database/` | `database` | 5179 |
| `ORISO-Keycloak` | `/keycloak/` | `keycloak` | 5180 |
| `ORISO-Helm` | `/helm/` | `helm` | 5183 |
| `ORISO-Kubernetes` | `/kubernetes/` | `kubernetes` | 5181 |
| `ORISO-ElementCall` | `/element-call/` | `element-call` | 5186 |
| `ORISO-Livekit` | `/livekit/` | `livekit` | 5187 |
| `ORISO-HealthDashboard` | `/health-dashboard/` | `health-dashboard` | 5188 |
| `ORISO-Status` | `/status/` | `status` | 5189 |
| `ORISO-SigNoz` | `/signoz/` | `signoz` | 5190 |

Open point: `platform` and `supergraph` have no service and no port yet. The docs forbid inferring one, so the operator must approve two new loopback ports (proposal: `5191` and `5192`) and add the two services to the compose file. `e2e` and `infra` stay private; they are not in `viewer-routes.json` and keep their `403` routes.

## Migration steps (operator, in this order)
1. Release owners approve a published platform release and its full 16-repository tag and SHA vector; its Docs revision must contain these viewers (`PRODUCTION.md`).
2. Back up `/etc/nginx/sites-enabled/understand.oriso.org`, `/opt/oriso-understand/docker-compose.yml` and `/var/www/understand`.
3. Create the directories above, owned by `oriso-docs-runner`.
4. Edit the nginx site: for each of the 16 viewers replace the `file-content.json` rewrites and the `knowledge-graph|meta|config|...` rewrites by `location ^~ /<route>/ { proxy_pass http://127.0.0.1:<port>; }` (no trailing URI, no strip-prefix rewrite). Point `/` and assets at `UNDERSTAND_HUB_CURRENT`, serve `/refresh-attempt.json` from the receipt path with caching off. Keep `/legal/`, `/dokumentation/`, `/api/dpia` and the `403` blocks. Run `nginx -t` before any reload.
5. Add the `platform` and `supergraph` services and ports to the compose file.
6. Create the readback tokens and store them as the secret; set the variables above.
7. Dispatch `ua-public-site.yml` with the approved release manifest. The transaction restores the previous pointers and compose on failure.

## Rollback
The activation journal and snapshots restore the four links and the compose bytes on failure. To undo by hand: restore the nginx backup, `nginx -t`, reload; `docker compose up -d` from the saved compose file; point `/var/www/understand` back (it is untouched until the nginx edit).

## Catching up
The 2026-11-04 graph generation exists but is not tied to an approved release vector. Use the approved release's manifest for the first run; the 04.11. asset alone does not satisfy the "published release" rule.

## Proof
- [ ] `binding` and `consume` green for the release run.
- [ ] https://understand.oriso.org/status.json (or the hub status) shows the release date, not 2026-09-21.
- [ ] Each of the 16 viewer routes answers 200 and shows the new generation.
- [ ] `https://understand.oriso.org/refresh-attempt.json` answers without a cached copy.
