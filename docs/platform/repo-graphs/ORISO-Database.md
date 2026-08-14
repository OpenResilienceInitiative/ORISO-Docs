---
title: ORISO-Database Enriched Graph Summary
description: Direct schema/script inspection and graph-backed summary for ORISO-Database (archived legacy repository).
---

# ORISO-Database Enriched Graph Summary

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

**ARCHIVED / LEGACY.** This repository is archived upstream and frozen at commit `c9630a9` (2026-06-25). It served as the interim central schema store during the phase when all backend services ran with Liquibase disabled. That model is retired: canonical schema management has moved back to per-service Liquibase changelogs inside each service repository (Liquibase re-enablement plan), and deployment/infrastructure is owned by ORISO-Helm. Use this repo only as a point-in-time reference of the June 2026 database state — schemas, init scripts, incident documentation — never as a deployment source.

Contents: service-owned MariaDB `schema.sql` exports, MongoDB BSON dumps, a Matrix PostgreSQL status note, Redis/RabbitMQ operational docs, database initialization and system-user Kubernetes jobs, and the DB-C03 incident remediation docs.

## Main Technologies

MariaDB 10.11 (mysqldump exports), MongoDB (mongodump BSON), PostgreSQL (Matrix Synapse, status doc only), Redis, RabbitMQ, Kubernetes jobs (kubectl + heredoc SQL), kustomize (mariadb-client)

## Important Files and Modules

- README.md — repository overview and the (historical) "Liquibase disabled" operating model
- mariadb/&lt;service&gt;/schema.sql — per-service schema exports (7 databases)
- mongodb/consulting_types/ and mongodb/consultingtypeservice/ — duplicated BSON dumps of `consultingTypes` and `application_settings`
- postgresql/matrix/STATUS.md — Matrix Synapse PostgreSQL was never reachable; schema never exported
- scripts/database-initialize.yaml — database provisioning job
- scripts/system-users-job.yaml — system-user creation job (credentials via `system-users-credentials` Secret)
- docs/incident-2026-02/db-c03-remediation.md and docs/secret-management.md — credential-exposure remediation and Secret contract
- tests/test-sql-escaping.sh — SQL quote-escaping test for the system-users job
- k8s/mariadb-client/ — kustomize-deployed in-cluster admin client

## Architecture Summary

The repository is a frozen operations snapshot of platform persistence. Each MariaDB database has a full mysqldump export (including Liquibase `DATABASECHANGELOG` bookkeeping tables, evidence that schemas originated from per-service Liquibase before central management). MongoDB consulting-type documents are tracked as BSON dumps. Kubernetes jobs encode the historical bootstrap order: provision databases → apply schemas → create system users. After the February 2026 DB-C03 incident, all plaintext credentials were externalized into the `system-users-credentials` Secret.

## MariaDB Schemas and Tables

Snapshot at `c9630a9` (June 2026). Index count = secondary `KEY`/`UNIQUE KEY` lines in the dump.

| Schema | File | Table count | Tables | Index count |
| --- | --- | --- | --- | --- |
| agencyservice | mariadb/agencyservice/schema.sql | 6 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, agency, agency_postcode_range, agency_topic, diocese | 3 |
| caritas | mariadb/caritas/schema.sql | 0 | (empty shared database) | 0 |
| consultingtypeservice | mariadb/consultingtypeservice/schema.sql | 5 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, topic, topic_group, topic_group_x_topic | 3 |
| tenantservice | mariadb/tenantservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, tenant (incl. address/description columns added 2026-06) | 0 |
| uploadservice | mariadb/uploadservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, uploadbyuser | 0 |
| userservice | mariadb/userservice/schema.sql | 27 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, admin, admin_agency, agency_invite_link, appointment, case_handover_reason_policy, case_handover_request, chat, chat_agency, consultant, consultant_agency, consultant_mobile_token, counselor_rename_audit_log, draft_message, event_notification, group_chat_participant, identity_tombstone, inactive_account_notification_audit_log, language, session, session_data, session_supervisor, session_topic, user, user_agency, user_chat, user_mobile_token | 51 |
| videoservice | mariadb/videoservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, videoroom | 1 |

Notable in the userservice snapshot:

- **Case handover** (CAR-CHO-01): `case_handover_request` (FKs to session and consultant, tenant/status indexes) and `case_handover_reason_policy` — added 2026-06-25, the last functional change before archival.
- **Matrix migration mid-state**: user, consultant, session, and chat tables carry BOTH legacy RocketChat columns (`rc_user_id`, `rc_group_id`) AND Matrix columns (`matrix_user_id`, `matrix_room_id`, `matrix_password`). The live platform has since completed the Matrix-only migration; the dual columns here document the transitional shape only.
- Notification/timeline (`event_notification`), appointments (`appointment`), drafts (`draft_message`), and deletion tombstones (`identity_tombstone`) already existed at snapshot time; anything newer (statistics subsystem, legal/DPA module, media scanning, onboarding wizard, 2FA/OTP schema changes) lives only in the per-service Liquibase changelogs, not here.

## MongoDB, Scripts, and K8s Helpers

Mongo dumps (duplicated under two directory names, `consulting_types/` and `consultingtypeservice/`):

- collections.txt, dump/application_settings.bson (+ metadata.json), dump/consulting_types.bson (+ metadata.json), dump/prelude.json

Scripts:

- scripts/database-initialize.yaml — creates the 7 MariaDB databases
- scripts/system-users-job.yaml — creates Caritas admin, ORISO Call admin, and group-chat system users; reads all passwords and the Matrix registration secret from the `system-users-credentials` Secret and fails if any are missing; writes Matrix credentials into userservice rows

Kubernetes helpers:

- k8s/mariadb-client/ — configmap.yaml, deployment.yaml, ingress.yaml, kustomization.yaml, service.yaml (kustomize admin client)

Tests:

- tests/test-sql-escaping.sh — validates single-quote escaping for values interpolated into the system-users SQL heredoc

## Service Ownership

- tenantservice schema belongs to ORISO-TenantService.
- userservice schema belongs to ORISO-UserService.
- agencyservice schema belongs to ORISO-AgencyService.
- consultingtypeservice relational tables and MongoDB consulting/application documents belong to ORISO-ConsultingTypeService.
- Matrix PostgreSQL belongs to Matrix Synapse and self-manages its schema; it was never exported here (postgresql/matrix/STATUS.md).
- uploadservice and videoservice schemas are snapshots of retired/legacy services.
- Going forward, each owning service repository manages its schema via its own Liquibase changelog; ORISO-Helm owns database deployment and init.

## Local Development Notes

- Do not bootstrap new environments from this repo. Use ORISO-Helm charts and per-service Liquibase instead.
- The schema.sql files remain useful for offline inspection of the June 2026 table shapes (e.g. diffing against current Liquibase-generated schemas).
- mariadb/README.md and mongodb/README.md describe the historical export/restore procedures.

## Deployment Notes

- **None — repository is archived.** The init jobs (database-initialize.yaml, system-users-job.yaml) and the mariadb-client kustomization are retained for historical reference; current deployment is via ORISO-Helm.
- Hardcoded ClusterIPs in the README (MariaDB 10.43.123.72, MongoDB 10.43.61.124, PostgreSQL 10.43.140.77, Redis 10.43.113.3) describe the old cluster and are not authoritative.

## Risks and Gaps

- The repo still presents itself (README) as the "single source of truth" with "Liquibase DISABLED" — stale guidance that contradicts the current per-service Liquibase model; a reader who misses the archived flag could re-apply June 2026 schemas over newer ones.
- system-users-job.yaml falls back to a default root password (`root`) if the `mariadb-secrets` Secret is absent — acceptable only because the job is retired, but a bad pattern to copy.
- The userservice dump stores `matrix_password` in plaintext columns; any restored copy of this data is credential-bearing.
- MongoDB dumps are duplicated under two directory names with no marker for which is authoritative.
- Matrix Synapse PostgreSQL schema was never captured; postgresql/ contains only a status note.

## Needs Verification

- Whether any environment still consumes these init jobs (assumed none — repo archived, ORISO-Helm canonical).
- Drift between these June 2026 snapshots and the current per-service Liquibase-managed schemas (statistics, legal/DPA, media, onboarding, 2FA tables are known to be absent here).
- Whether the DB-C03 rotation follow-ups (Matrix registration secret, admin passwords) were completed and evidenced.
