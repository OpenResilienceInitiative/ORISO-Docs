---
title: ORISO-Helm Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-Helm.
---

# ORISO-Helm Enriched Graph Summary

## Platform Navigation

- [Overview](../overview.md)
- [Repository map](../repository-map.md)
- [Architecture](../architecture.md)
- [Authentication and Keycloak](../authentication-and-keycloak.md)
- [Database and data model](../database-and-data-model.md)
- [Kubernetes deployment](../kubernetes-deployment.md)
- [Frontend/Admin overview](../frontend-admin-overview.md)
- [Backend services](../backend-services.md)
- [Tenant lifecycle](../tenant-lifecycle.md)
- [User management flow](../user-management-flow.md)
- [Local development](../local-development.md)
- [Onboarding guide](../onboarding-guide.md)
- [Troubleshooting](../troubleshooting.md)
- [Graph validation report](../graph-validation-report.md)
- [Diagrams](../diagrams.md)

## Repository Purpose

Canonical infrastructure repository for the ORISO platform. A single umbrella Helm chart (`online-counseling`, version 2.0.2 at the pinned commit) deploys the full stack on Kubernetes: Keycloak (custom ORISO image + theme), MariaDB (with the canonical per-service SQL schema mirrors), MongoDB, RabbitMQ, Redis, Matrix/Synapse with a dedicated Postgres, LiveKit + MatrixRTC authorization, Element Call, the nginx ingress controller with single-domain routing, an optional SigNoz observability stack, the health dashboard, and all ORISO backend/frontend services. It also owns the operational layer around deployment: runbooks, bootstrap/seed jobs, the demo baseline gate, the SOPS+age test-credential store, and the digest-pinned cutover release preflight.

## Main Technologies

- Helm 3 umbrella chart with vendored, unpacked infra subcharts under `charts/` (`file://` dependencies in `Chart.yaml`) and service workloads rendered directly from `templates/<service>/`
- Kubernetes primitives: Deployments, StatefulSets (MariaDB, MongoDB, Matrix Postgres), install-only hook Jobs, PodDisruptionBudgets, NetworkPolicies, ingress-nginx, cert-manager (Let's Encrypt)
- Images: Synapse `matrixdotorg/synapse:v1.158.0`, `livekit/livekit-server:v1.13.5`, ORISO-built ghcr images (`oriso-keycloak`, `oriso-userservice`, `oriso-frontend`, `element-call`, `matrixrtc-auth-policy-gateway`, `matrixrtc-authorization-service`, `health-dashboard`, ...) pinned at 2.0.2 tags/digests
- SigNoz 0.135.1 (remote dependency, condition `signoz.enabled`) with vendored ClickHouse/Zookeeper/Postgres/Redpanda charts
- Python/bash render-guard test suite under `tests/` (helm template–based invariant tests) plus SOPS + age for the encrypted test-user store
- GitHub Actions release workflow publishing the chart as an OCI artifact to `ghcr.io/openresilienceinitiative/charts`

## Important Files and Modules

- Chart.yaml — umbrella chart, subchart dependencies, version 2.0.2
- README.md — full setup, secrets contract, cutover procedure, overlays, SigNoz
- values.yaml.default — prod-safe baseline values (tracked template for gitignored values.yaml)
- secrets.yaml.default — credentials template (every `changeme` must be replaced)
- templates/_helpers.tpl — image/pull-policy/observability helper templates
- templates/matrix/ — Synapse deployment, homeserver config (ADR-005 non-federation), Postgres statefulset with PITR backup scripts
- templates/livekit/ — LiveKit SFU, MatrixRTC auth deployments (gateway + upstream), token bootstrap job, NetworkPolicies, PDBs
- templates/element-call/ — Element Call widget deployment
- templates/nginx/ — ingress controller + ~25 ingress objects (single-domain routing)
- templates/userservice/ (and per-service siblings) — service Deployment/ConfigMap/Secret/PDB/Service, including ADR-018 support-access and OTP/statistics flags
- templates/health-dashboard/ — backend health dashboard mini-chart
- charts/keycloak/ — realm.json, custom theme (login + OTP email), theme configmaps
- charts/mariadb/sql-schemas/ — canonical MariaDB schema mirrors (ORISO-Database is archived)
- charts/mongodb/, charts/rabbitmq/, charts/redis/ — remaining infra subcharts
- scripts/cutover-release-preflight.py — fail-closed release manifest validator producing the digest overlay
- scripts/demo-baseline-gate.sh + demo-baseline/ — one-command customer demo readiness gate
- scripts/seed-keycloak-users.sh + test-data/ — SOPS+age test-credential store and Keycloak seeding
- runbooks/ — support-access enablement (ADR-018), LiveKit single-node rollout, password-reset runtime config, Pre-Dev AVV/Legal ALTER runbook
- docs/matrixrtc-cutover-runbook.md — release contract for the Matrix-only/Element Call cutover
- tests/ — render-guard suite (see below)

## Architecture Summary

One `helm upgrade --install` provisions the entire platform. Configuration is split into a tracked prod-safe baseline (`values.yaml.default`) plus gitignored local `values.yaml`/`secrets.yaml` and untracked per-environment overlays (`values-dev.yaml`, `values-prod.yaml`); production is operated by the hoster via ArgoCD. Several secrets are fail-closed at render time (AgencyService encryption appkey, UserService statistics HMAC secret) and password-reset/invite URLs fail closed at runtime.

The messaging stack is Matrix-only: Synapse is deliberately non-federated (ADR-005, empty `federation_domain_whitelist`), backed by its own Postgres statefulset with WAL-archive/PITR tooling, and render guards prevent Rocket.Chat or embedded-Jitsi remnants from ever re-entering the chart. Calls run on LiveKit behind a MatrixRTC authorization pair (upstream auth service + ORISO policy gateway); a bootstrap Job provisions a non-admin membership-reader Matrix user and patches its token into `matrixrtc-auth-secrets`, and every call/reconnect is authorized fail-closed against UserService via the dedicated `callPolicyToken`. Element Call is the widget UI with its own ingresses.

All traffic is routed under a single public domain by the in-chart ingress-nginx controller: `/service/*` to backends, tenant public/admin rewrites, unauthenticated `GET /media/{id}` to TenantService for legal-text images (epic Admin#366 WP-3a), Matrix client API, LiveKit SFU/JWT, Element Call, ACME, and `/signoz`. Install-only bootstrap Jobs seed tenants, topics, Keycloak users, and Mongo users idempotently. Releases for the coordinated cutover are digest-pinned and validated by a fail-closed preflight script.

## Chart Layout and Subcharts

| Component | Location | Notes |
| --- | --- | --- |
| Keycloak | charts/keycloak | ORISO `oriso-keycloak` image (OTP), realm.json first-start import, custom theme + OTP email templates, safe re-import on restart |
| MariaDB | charts/mariadb | StatefulSet + canonical sql-schemas mirrors for 5 services |
| MongoDB | charts/mongodb | StatefulSet, replica key secret, user-creation Job |
| RabbitMQ / Redis | charts/rabbitmq, charts/redis | Simple deployments; Redis also backs MatrixRTC auth and consultant availability |
| SigNoz | charts/signoz (vendored) + remote dep | Optional (`signoz.enabled`), auto-wires OTLP for services |
| Matrix/Synapse | templates/matrix | Non-federated homeserver, dedicated Postgres with PITR scripts |
| LiveKit + MatrixRTC auth | templates/livekit | hostNetwork SFU, Recreate strategy, token bootstrap Job, NetworkPolicies |
| Element Call | templates/element-call | Widget UI, 2.0.2 ghcr image |
| Backend services | templates/{agencyservice,consultingtypeservice,tenantservice,userservice} | ConfigMap/Secret/Deployment/PDB/Service per service |
| Frontend + Admin | templates/frontend, templates/admin | Nginx-served SPAs |
| Ingress | templates/nginx | Controller + all ingress objects |
| Health dashboard | templates/health-dashboard | Cluster health UI with RBAC |

## Jobs, Bootstrap, and Operational Tooling

- Tenant and topic bootstrap Jobs (`files/tenant-bootstrap.sql`, `files/topic-bootstrap.sql`) run after Liquibase/schema provisioning; hooks are install-only, configmaps namespaced, sequences advanced with valid setval calls.
- `templates/keycloak-bootstrap-users-job.yaml` seeds Keycloak users; `charts/mongodb/templates/mongodb-job-create-users.yaml` provisions Mongo users with bounded hook runtime.
- `scripts/demo-baseline-gate.sh` + `demo-baseline/` give a one-command pre-demo gate (sync SQL, check SQL, manifest).
- `scripts/seed-keycloak-users.sh` + `test-data/` implement the SOPS+age encrypted test-credential store; seeded users get no `CONFIGURE_TOTP` action so automation can log in despite the 2FA posture.
- `scripts/cleanup-oriso-call-devices.sh` cleans up stale call devices.
- Runbooks cover ADR-018 support-access enablement, LiveKit single-node rollout, password-reset runtime configuration per environment, and the Pre-Dev AVV/Legal manual ALTER procedure.

## Render Guard Tests

`tests/` is a helm-template-based invariant suite (Python + bash), not unit tests of app code:

- ADR-005: `render_adr005_test.py`, `check-no-bare-ip-servername.sh`, `guardrail_selftest.sh` (proves the scanner can fail)
- Legacy chat ban: `render_no_chat_legacy_test.py` (Rocket.Chat/Jitsi terms are stop-ship)
- MatrixRTC/LiveKit: `render_matrixrtc_auth_test.py`, `render_livekit_rollout_test.py`, `render_matrix_call_cutover_security_test.py`
- Fail-closed secrets/URLs: `render_agency_encryption_appkey_test.py`, `render_statistics_hmac_secret_test.py`, `render_password_reset_urls_test.py`, `render_account_invite_urls_test.py`
- Upgrade safety: `render_storage_class_test.py`, `render_bootstrap_hooks_install_only_test.py`, `render_bootstrap_configmap_namespace_test.py`, `render_bootstrap_sequence_setval_test.py`, `render_image_pull_policy_test.py`, `render_liquibase_changelog_compat_test.py`
- Feature gates: `render_livechat_runtime_gate_test.py` (Redis availability + Matrix room encryption), `render_tenantservice_single_domain_test.py`, `test_keycloak_otp_admin_client.py`, `test_otp_email_theme.py`
- Tooling: `test_cutover_release_preflight.py`, `test_demo_baseline.py`, `test_seed_keycloak_users.py`

## ORISO Dependencies

- Deploys images built by ORISO-Frontend, ORISO-Admin, ORISO-UserService, ORISO-AgencyService, ORISO-ConsultingTypeService, ORISO-TenantService, ORISO-Keycloak (fork branch), Element Call fork, and the MatrixRTC auth services.
- `charts/mariadb/sql-schemas/` replaced the archived ORISO-Database repo as the canonical schema mirror; the Pre-Dev AVV/Legal runbook keeps mirrors and forced-Liquibase-off environments in sync.
- The MatrixRTC policy gateway calls UserService for fresh tenant call policy (shared `matrixrtcAuth.callPolicyToken`); UserService and Frontend are one compatibility unit for the `rcGroupId`→`matrixRoomId` / `rcUserId`→`matrixUserId` API change.
- ADR-018 support access requires a realm role script from ORISO-Keycloak and UserService migrations 0073–0076.
- The cutover release contract consumes the cross-repo ORISO-Matryoshka release manifest.

## Local Development Notes

- `cp values.yaml.default values.yaml`, `cp secrets.yaml.default secrets.yaml`, replace every `changeme`, then `helm upgrade --install caritas ./ -n caritas --create-namespace --wait-for-jobs --timeout 15m -f values.yaml -f values-dev.yaml -f secrets.yaml`.
- The dev overlay turns on dummy-data seeding and dev Spring profiles; the baseline is prod-safe (no seeding, `springProfilesActive: prod`). Encryption is never toggleable in any environment.
- Run the render guards with plain `python3 tests/render_*.py` / `bash tests/*.sh` (they build throwaway minimal charts and call `helm template`).
- `helm dependency build .` is required when enabling SigNoz.

## Deployment Notes

- Chart releases are published manually via the `release-helm-chart.yml` workflow (workflow_dispatch from `main`, tags + OCI push to `ghcr.io/openresilienceinitiative/charts`); environment overlay values are excluded from the release package.
- Cutover releases are digest-only for Frontend, Element Call, UserService, AgencyService, Synapse, and both MatrixRTC images; `scripts/cutover-release-preflight.py` validates the manifest fail-closed and emits the overlay applied between environment values and secrets.
- Production is deployed by the hoster via ArgoCD with `values-prod.yaml`; developer-driven deploys target dev/Pre-Dev.
- LiveKit runs hostNetwork with strategy Recreate on single-node topologies; the chart refuses unsafe RollingUpdate/grace-period combinations.
- SigNoz UI is exposed at `/signoz` on the main domain when enabled; OTLP export and the KDG pseudonymization flag both default to off for prod.

## Risks and Gaps

- `secrets.yaml.default` ships only `changeme` placeholders (good), but the number of required secrets is large and several are fail-closed only at runtime (password-reset URLs) rather than render time — a missing overlay key silently disables mail flows until the startup warning is noticed.
- README references `docs/infrastructure-report-2026-07.md` and `docs/observability-prod-pseudonymization.md`, but only `docs/matrixrtc-cutover-runbook.md` is tracked — the referenced documents live outside this repo or were never committed.
- `values-dev.yaml` / `values-prod.yaml` overlays are documented and release-excluded but not tracked in the repo, so the effective per-environment configuration is not reviewable here.
- No media/content-scanning component (e.g. matrix-content-scanner or ClamAV) exists in the chart; media handling is limited to the unauthenticated TenantService `GET /media/{id}` ingress (legal-text images) and `synapseEnableAuthenticatedMedia` defaulting to `"false"`. The media-upload security epic (Admin#366, ADR-014/015) is not yet reflected at the infrastructure layer.
- Synapse's rendered `homeserver.yaml` declares `database: sqlite3` while the chart also ships a Matrix Postgres statefulset with backup/PITR tooling — the wiring between the two needs care when editing matrix-configmaps.
- The old `restore-keycloak-settings.sh` helper referenced by earlier docs is gone; Keycloak drift after redeploys is now handled via safe realm re-import and dedicated scripts in ORISO-Keycloak.

## Needs Verification

- Which cluster(s) currently run this chart end-to-end (Pre-Dev vs dev) and whether the legacy ORISO-Kubernetes chart is fully retired everywhere.
- Whether Synapse actually runs against the in-chart Postgres statefulset or SQLite in each environment (rendered `homeserver.yaml` vs statefulset presence).
- Whether the SigNoz stack and OTLP export are enabled on any live environment, and the sign-off status of the telemetry pseudonymization flag.
- The current location and status of `values-dev.yaml`/`values-prod.yaml` and the hoster's ArgoCD configuration.
- Whether `synapseEnableAuthenticatedMedia` is intentionally still `"false"` given the pending media-security epic.
