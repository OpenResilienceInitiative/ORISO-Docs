# Legacy page triage (issue #90 / #106)

Verdicts: **adopt** (keep editorial; never auto-overwrite), **regenerate** (replace from nightly docs-export), **retire** (remove from nav; redirect).

Reviewed as the Phase-1 deliverable for [ORISO-Docs#106](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/106). Ports of **adopt** pages onto Fumadocs continue to use `site/scripts/sync-content.mjs` on `pre-dev`; this PR does not copy the 430-file `site/` tree onto `main`.

## `product/` (20 pages)

| Page | Verdict | Notes |
| --- | --- | --- |
| `product/overview.mdx` | adopt | Product intro |
| `product/summary.mdx` | adopt | |
| `product/architecture.mdx` | adopt | Product-facing; numbers belong on generated `architecture-tiers` |
| `product/roles-permissions.mdx` | adopt | |
| `product/features/index.mdx` | adopt | |
| `product/features/live-chat.mdx` | adopt | |
| `product/features/group-chats.mdx` | adopt | |
| `product/features/ai-tools.mdx` | adopt | |
| `product/features/handover.mdx` | adopt | Reconciled in #76 |
| `product/features/notifications.mdx` | adopt | |
| `product/features/pincode-chat.mdx` | adopt | |
| `product/features/session-management.mdx` | adopt | |
| `product/features/transcription.mdx` | adopt | |
| `product/user-flows.mdx` | adopt | |
| `product/internal-functionality.mdx` | adopt | |
| `product/data-model.mdx` | adopt | Cross-check against generated backend pages if counts appear |
| `product/ui-ux.mdx` | adopt | |
| `product/edge-cases.mdx` | adopt | Recovery gap documented in #76 |
| `product/figma-analysis-2026-05.mdx` | retire | Dated snapshot; removed from `docs.json`; redirect to `product/ui-ux` |
| `product/assumptions.mdx` | retire | Snapshot assumptions; removed from `docs.json`; redirect to `product/overview` |

## `docs/platform/` (32 pages + diagrams)

| Page | Verdict | Notes |
| --- | --- | --- |
| `overview.md` | adopt | Hub |
| `authentication-and-keycloak.md` | adopt | |
| `database-and-data-model.md` | adopt | |
| `kubernetes-deployment.md` | adopt | |
| `frontend-admin-overview.md` | adopt | |
| `local-development.md` | adopt | |
| `onboarding-guide.md` | adopt | |
| `troubleshooting.md` | adopt | |
| `tenant-lifecycle.md` | adopt | |
| `diagrams.md` + `diagrams/*.mmd` | adopt | Mermaid sources stay editorial |
| `architecture.md` | adopt | Editorial; generated counts live on `architecture-tiers` |
| `repository-map.md` | regenerate | Stale table (9-repo dump) |
| `backend-services.md` | regenerate | Structure inventory |
| `repo-graphs/ORISO-*.md` (9) | regenerate | Hand-written dumps, counts stale |
| `super-graph-index.md` | regenerate | Redirect stub → `architecture-tiers` |
| `super-graph-explorer.md` | regenerate | Redirect stub |
| `super-graph-detailed.md` | regenerate | Redirect stub |
| `understand-anything-inventory.md` | regenerate | Redirect stub → `truth-chain-status` |
| `graph-validation-report.md` | regenerate | High-level counts from export |
| `user-management-flow.md` | retire | Rocket.Chat-era drift; removed from `docs.json`; redirect to `authentication-and-keycloak` |
| `reports/archived-repos-2026-07-22.md` | retire | Point-in-time hygiene report; not in live nav |

## Fumadocs `site/content/docs/plattform/` (`pre-dev` / written by generator)

| Page | Verdict | Notes |
| --- | --- | --- |
| `repository-graphs/ORISO-*.md` (12) | regenerate | Nightly from docs-export; `generated: true` |
| `graphs-und-diagrams/*.md` (6) | regenerate | Retired stubs that redirect; old URLs stay alive |
| `architecture-hub/repository-map.md` | regenerate | |
| `core-systems/backend-services.md` | regenerate | |
| Other `architecture-hub/`, `core-systems/`, `platform-flows/`, `operations/` | adopt | Synced from editorial Mintlify sources |

## New generated pages (this PR)

| Page | Verdict |
| --- | --- |
| `docs/platform/architecture-tiers.md` | regenerate |
| `docs/platform/endpoint-inventory.md` | regenerate |
| `docs/platform/truth-chain-status.md` | regenerate |

## Redirects

See `site/redirects.json` (Fumadocs / nginx) and the generated stubs above (Mintlify-safe).
