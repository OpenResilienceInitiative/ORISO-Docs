---
title: ORISO-Database Enriched Graph Summary
description: Direct schema/script inspection and graph-backed summary for ORISO-Database.
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

Persistence operations repository containing service-owned MariaDB schemas, MongoDB dumps, Matrix PostgreSQL notes, Redis/RabbitMQ docs, backup artifacts, and initialization jobs.

## Main Technologies

MariaDB 10.11, MongoDB, PostgreSQL, Redis, RabbitMQ, Kubernetes jobs, phpMyAdmin/mariadb-client utilities

## Important Files and Modules

- README.md
- k8s/mariadb-client/README.md
- mariadb/README.md
- mongodb/README.md
- postgresql/README.md
- rabbitmq/README.md
- redis/README.md
- scripts/README.md
- scripts/database-initialize.yaml
- scripts/system-users-job.yaml
- k8s/mariadb-client/configmap.yaml
- k8s/mariadb-client/deployment.yaml
- k8s/mariadb-client/ingress.yaml
- k8s/mariadb-client/kustomization.yaml
- k8s/mariadb-client/service.yaml
- mongodb/consulting_types/collections.txt
- mongodb/consulting_types/dump/application_settings.bson
- mongodb/consulting_types/dump/application_settings.metadata.json
- mongodb/consulting_types/dump/consulting_types.bson
- mongodb/consulting_types/dump/consulting_types.metadata.json
- mongodb/consulting_types/dump/prelude.json
- mongodb/consultingtypeservice/collections.txt
- mongodb/consultingtypeservice/dump/application_settings.bson
- mongodb/consultingtypeservice/dump/application_settings.metadata.json
- mongodb/consultingtypeservice/dump/consulting_types.bson
- mongodb/consultingtypeservice/dump/consulting_types.metadata.json
- mongodb/consultingtypeservice/dump/prelude.json

## Architecture Summary

The repository is an operations source of truth for persistence. It contains SQL schema exports per service, MongoDB dumps for consulting/application documents, notes for Matrix PostgreSQL, Redis and RabbitMQ operational docs, and Kubernetes jobs for database initialization/system users.

## MariaDB Schemas and Tables

| Schema | File | Table count | Tables | Index count |
| --- | --- | --- | --- | --- |
| agencyservice | mariadb/agencyservice/schema.sql | 6 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, agency, agency_postcode_range, agency_topic, diocese | 2 |
| caritas | mariadb/caritas/schema.sql | 0 |  | 0 |
| consultingtypeservice | mariadb/consultingtypeservice/schema.sql | 5 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, topic, topic_group, topic_group_x_topic | 3 |
| tenantservice | mariadb/tenantservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, tenant | 0 |
| uploadservice | mariadb/uploadservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, uploadbyuser | 0 |
| userservice | mariadb/userservice/schema.sql | 26 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, admin, admin_agency, agency_invite_link, appointment, chat, chat_agency, consultant, consultant_agency, consultant_mobile_token, counselor_rename_audit_log, draft_message, event_notification, group_chat_participant, identity_tombstone, inactive_account_notification_audit_log, language, session, session_data, session_supervisor, session_topic, user, user_agency, user_chat, user_mobile_token | 40 |
| videoservice | mariadb/videoservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, videoroom | 1 |

## MongoDB, Scripts, and K8s Helpers

Mongo files:

- mongodb/README.md
- mongodb/consulting_types/collections.txt
- mongodb/consulting_types/dump/application_settings.bson
- mongodb/consulting_types/dump/application_settings.metadata.json
- mongodb/consulting_types/dump/consulting_types.bson
- mongodb/consulting_types/dump/consulting_types.metadata.json
- mongodb/consulting_types/dump/prelude.json
- mongodb/consultingtypeservice/collections.txt
- mongodb/consultingtypeservice/dump/application_settings.bson
- mongodb/consultingtypeservice/dump/application_settings.metadata.json
- mongodb/consultingtypeservice/dump/consulting_types.bson
- mongodb/consultingtypeservice/dump/consulting_types.metadata.json
- mongodb/consultingtypeservice/dump/prelude.json

Scripts:

- scripts/README.md
- scripts/database-initialize.yaml
- scripts/system-users-job.yaml

Kubernetes helpers:

- k8s/mariadb-client/README.md
- k8s/mariadb-client/configmap.yaml
- k8s/mariadb-client/deployment.yaml
- k8s/mariadb-client/ingress.yaml
- k8s/mariadb-client/kustomization.yaml
- k8s/mariadb-client/service.yaml

## Service Ownership

- tenantservice schema belongs to ORISO-TenantService.
- userservice schema belongs to ORISO-UserService.
- agencyservice schema belongs to ORISO-AgencyService.
- consultingtypeservice relational tables and MongoDB consulting/application documents belong to ORISO-ConsultingTypeService.
- Matrix PostgreSQL belongs to Matrix Synapse, not ORISO business services.
- uploadservice and videoservice schemas exist, but their service repositories are not included in this analysis.

## Local Development Notes

- Read mariadb/README.md and mongodb/README.md.
- Use scripts/database-initialize.yaml and scripts/system-users-job.yaml for cluster initialization patterns.

## Deployment Notes

- Used by ORISO-Kubernetes database charts and jobs; services assume schemas are already present.

## Risks and Gaps

- Several schemas contain DATABASECHANGELOG tables, but the operational model still needs verification because platform docs indicate manual/central schema management.
- Some service-owned IDs are cross-service references without full FK enforcement.
- Missing or weak tenant/id indexes should be reviewed before scale testing.
- Backup SQL and dump files may contain sensitive data and should be audited before committing.

## Needs Verification

- Current live schema vs exported schema.sql files.
- Exact restore/init commands and whether scripts are safe for existing databases.
