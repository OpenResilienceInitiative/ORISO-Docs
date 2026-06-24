---
title: Database and Data Model
description: Enriched persistence architecture, schema ownership and data risks.
---

# Database and Data Model

## Platform Navigation

- [Overview](./overview.md)
- [Repository map](./repository-map.md)
- [Architecture](./architecture.md)
- [Authentication and Keycloak](./authentication-and-keycloak.md)
- [Database and data model](./database-and-data-model.md)
- [Kubernetes deployment](./kubernetes-deployment.md)
- [Frontend/Admin overview](./frontend-admin-overview.md)
- [Backend services](./backend-services.md)
- [Tenant lifecycle](./tenant-lifecycle.md)
- [User management flow](./user-management-flow.md)
- [Local development](./local-development.md)
- [Onboarding guide](./onboarding-guide.md)
- [Troubleshooting](./troubleshooting.md)
- [Graph validation report](./graph-validation-report.md)
- [Diagrams](./diagrams.md)

Diagram: [data-ownership.mmd](./diagrams/data-ownership.mmd)

## Data Stores

| Schema | File | Table count | Main tables | Index count |
| --- | --- | --- | --- | --- |
| agencyservice | mariadb/agencyservice/schema.sql | 6 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, agency, agency_postcode_range, agency_topic, diocese | 2 |
| caritas | mariadb/caritas/schema.sql | 0 |  | 0 |
| consultingtypeservice | mariadb/consultingtypeservice/schema.sql | 5 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, topic, topic_group, topic_group_x_topic | 3 |
| tenantservice | mariadb/tenantservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, tenant | 0 |
| uploadservice | mariadb/uploadservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, uploadbyuser | 0 |
| userservice | mariadb/userservice/schema.sql | 26 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, admin, admin_agency, agency_invite_link, appointment, chat, chat_agency, consultant, consultant_agency, consultant_mobile_token, counselor_rename_audit_log, draft_message, event_notification, group_chat_participant, identity_tombstone, inactive_account_notification_audit_log, language, session, session_data, session_supervisor, session_topic, user, user_agency, user_chat, user_mobile_token | 40 |
| videoservice | mariadb/videoservice/schema.sql | 3 | DATABASECHANGELOG, DATABASECHANGELOGLOCK, videoroom | 1 |

## Ownership Rules

- TenantService owns tenantservice.tenant.
- UserService owns userservice user/session/chat/appointment/notification tables.
- AgencyService owns agencyservice agency/postcode/topic/diocese tables.
- ConsultingTypeService owns consultingtypeservice topic tables and MongoDB consulting/application documents.
- Matrix owns Matrix PostgreSQL state.
- UploadService and VideoService schemas exist but their repos were not included.

## Initialization and Migration References

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

## Risks

- Cross-service IDs are not always protected by database-level foreign keys.
- Index coverage should be checked before tenant-heavy or user/session-heavy scale testing.
- Dump/backup files may contain sensitive data.
- Liquibase tables exist in schema exports, but the actual migration ownership model needs environment verification.
