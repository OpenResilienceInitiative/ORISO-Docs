---
title: ORISO Super Graph Explorer
description: Browsable index for inspecting the detailed merged ORISO platform graph.
---

# ORISO Super Graph Explorer

## What to Open

- Full merged graph: `.understand-anything/oriso-super-graph.json`
- Grouped detailed graph: `.understand-anything/oriso-super-graph-detailed.json`
- Dashboard graph copy: `.understand-anything/knowledge-graph.json`
- Detailed markdown: [super-graph-detailed](./super-graph-detailed.md)
- Artifact inventory: [understand-anything-inventory](./understand-anything-inventory.md)

## By Repository

- [ORISO-Frontend](./super-graph-detailed.md#oriso-frontend) — 1967 nodes, 4204 edges
- [ORISO-Admin](./super-graph-detailed.md#oriso-admin) — 776 nodes, 1547 edges
- [ORISO-UserService](./super-graph-detailed.md#oriso-userservice) — 2295 nodes, 3854 edges
- [ORISO-AgencyService](./super-graph-detailed.md#oriso-agencyservice) — 623 nodes, 835 edges
- [ORISO-ConsultingTypeService](./super-graph-detailed.md#oriso-consultingtypeservice) — 470 nodes, 515 edges
- [ORISO-TenantService](./super-graph-detailed.md#oriso-tenantservice) — 380 nodes, 623 edges
- [ORISO-Database](./super-graph-detailed.md#oriso-database) — 192 nodes, 312 edges
- [ORISO-Keycloak](./super-graph-detailed.md#oriso-keycloak) — 152 nodes, 247 edges
- [ORISO-Kubernetes](./super-graph-detailed.md#oriso-kubernetes) — 339 nodes, 588 edges

## By Architecture Layer

| Layer/node type | Count |
| --- | --- |
| class | 1485 |
| concept | 86 |
| config | 342 |
| document | 63 |
| domain | 20 |
| endpoint | 441 |
| entity | 19 |
| file | 2713 |
| flow | 45 |
| function | 1294 |
| module | 52 |
| pipeline | 15 |
| resource | 116 |
| schema | 155 |
| service | 55 |
| source | 11 |
| step | 136 |
| table | 156 |

## By Backend Service

- ORISO-UserService: config: api/appointmentservice.yaml; config: api/conversationservice.yaml; config: api/useradminservice.yaml; config: api/userservice.yaml; config: api/userstatisticsservice.yaml; file: src/main/java/de/caritas/cob/userservice/api/AccountManager.java; file: src/main/java/de/caritas/cob/userservice/api/IdentityManager.java; file: src/main/java/de/caritas/cob/userservice/api/Messenger.java
- ORISO-AgencyService: schema: agencyadminservice.yaml — api/agencyadminservice.yaml; schema: agencyservice.yaml — api/agencyservice.yaml; file: AgencyServiceApplication.java — src/main/java/de/caritas/cob/agencyservice/AgencyServiceApplication.java; file: AgencyAdminController.java — src/main/java/de/caritas/cob/agencyservice/api/admin/controller/AgencyAdminController.java; file: AgencyLinksBuilder.java — src/main/java/de/caritas/cob/agencyservice/api/admin/hallink/AgencyLinksBuilder.java; file: HalLinkBuilder.java — src/main/java/de/caritas/cob/agencyservice/api/admin/hallink/HalLinkBuilder.java; file: RootDTOBuilder.java — src/main/java/de/caritas/cob/agencyservice/api/admin/hallink/RootDTOBuilder.java; file: SearchResultLinkBuilder.java — src/main/java/de/caritas/cob/agencyservice/api/admin/hallink/SearchResultLinkBuilder.java
- ORISO-ConsultingTypeService: config: applicationsettingsservice.yml — api/applicationsettingsservice.yml; config: consultingtypeadminservice.yml — api/consultingtypeadminservice.yml; config: consultingtypeservice.yml — api/consultingtypeservice.yml; config: topicservice.yml — api/topicservice.yml; file: ConsultingTypeServiceApplication.java — src/main/java/de/caritas/cob/consultingtypeservice/ConsultingTypeServiceApplication.java; file: ApiDefaultResponseEntityExceptionHandler.java — src/main/java/de/caritas/cob/consultingtypeservice/api/ApiDefaultResponseEntityExceptionHandler.java; file: ApiResponseEntityExceptionHandler.java — src/main/java/de/caritas/cob/consultingtypeservice/api/ApiResponseEntityExceptionHandler.java; file: ConsultingTypeAdminController.java — src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- ORISO-TenantService: class: Authority — src/main/java/com/vi/tenantservice/api/authorisation/Authority.java; class: AuthorityValue — src/main/java/com/vi/tenantservice/api/authorisation/Authority.java; class: RoleAuthorizationAuthorityMapper — src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java; class: UserRole — src/main/java/com/vi/tenantservice/api/authorisation/UserRole.java; class: CacheEventLogger — src/main/java/com/vi/tenantservice/api/cache/CacheEventLogger.java; class: ApplicationSettingsApiClient — src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiClient.java; class: ApplicationSettingsApiControllerFactory — src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiControllerFactory.java; class: ConsultingTypeServiceApiControllerFactory — src/main/java/com/vi/tenantservice/api/config/apiclient/ConsultingTypeServiceApiControllerFactory.java

## By Frontend/Admin App

- ORISO-Frontend: inspect file/function nodes under `ORISO-Frontend::`; API client files appear under `src/api/*` graph nodes.
- ORISO-Admin: inspect route/API/auth nodes under `ORISO-Admin::`; admin pages and API clients are represented as file/function nodes.

## By Auth Flow

Look for nodes containing Keycloak, auth, token, role, permission, security, JWT, OAuth, OIDC or realm:

- ORISO-Frontend: file: tokens.cy.ts — cypress/e2e/tokens.cy.ts
- ORISO-Frontend: file: apiLogoutKeycloak.ts — src/api/apiLogoutKeycloak.ts
- ORISO-Frontend: function: apiKeycloakLogout — src/api/apiLogoutKeycloak.ts
- ORISO-Frontend: file: auth.ts — src/components/auth/auth.ts
- ORISO-Frontend: function: RENEW_BEFORE_EXPIRY_IN_MS — src/components/auth/auth.ts
- ORISO-Frontend: function: setTokens — src/components/auth/auth.ts
- ORISO-Frontend: function: handleTokenRefresh — src/components/auth/auth.ts
- ORISO-Frontend: function: setTokenExpiryInLocalStorage — src/components/sessionCookie/accessSessionLocalStorage.ts
- ORISO-Admin: file: post-login.spec.js — cypress/integration/post-login.spec.js
- ORISO-Admin: file: pre-login.spec.js — cypress/integration/pre-login.spec.js
- ORISO-Admin: function: DEFAULT_ROLE — src/api/agency/putAgenciesForAdmin.ts
- ORISO-Admin: function: DEFAULT_ROLE — src/api/agency/putAgenciesForCounselor.ts
- ORISO-Admin: file: accessSessionCookie.ts — src/api/auth/accessSessionCookie.ts
- ORISO-Admin: function: setValueInCookie — src/api/auth/accessSessionCookie.ts
- ORISO-Admin: function: deleteCookieByName — src/api/auth/accessSessionCookie.ts
- ORISO-Admin: function: getValueFromCookie — src/api/auth/accessSessionCookie.ts
- ORISO-UserService: document: documentation/ADR-SECURITY-02-unified-crypto-boundary.md
- ORISO-UserService: config: services/keycloakextension.yaml
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/actions/user/DeactivateKeycloakUserActionCommand.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakClient.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakMapper.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakConfig.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakCustomConfig.java
- ORISO-AgencyService: file: AgencyUpdatePermissionValidator.java — src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/AgencyUpdatePermissionValidator.java
- ORISO-AgencyService: file: Authority.java — src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- ORISO-AgencyService: file: RoleAuthorizationAuthorityMapper.java — src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- ORISO-AgencyService: file: KeycloakException.java — src/main/java/de/caritas/cob/agencyservice/api/exception/KeycloakException.java
- ORISO-AgencyService: file: SecurityHeaderSupplier.java — src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- ORISO-AgencyService: file: AccessTokenTenantResolver.java — src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- ORISO-AgencyService: file: CustomHeaderTenantResolver.java — src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- ORISO-AgencyService: file: MultitenancyWithSingleDomainTenantResolver.java — src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- ORISO-ConsultingTypeService: file: AuthenticatedUser.java — src/main/java/de/caritas/cob/consultingtypeservice/api/auth/AuthenticatedUser.java
- ORISO-ConsultingTypeService: file: Authority.java — src/main/java/de/caritas/cob/consultingtypeservice/api/auth/Authority.java
- ORISO-ConsultingTypeService: file: RoleAuthorizationAuthorityMapper.java — src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- ORISO-ConsultingTypeService: file: UserRole.java — src/main/java/de/caritas/cob/consultingtypeservice/api/auth/UserRole.java
- ORISO-ConsultingTypeService: file: Consultant.java — src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/roles/Consultant.java
- ORISO-ConsultingTypeService: file: TopicController.java — src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- ORISO-ConsultingTypeService: file: KeycloakException.java — src/main/java/de/caritas/cob/consultingtypeservice/api/exception/KeycloakException.java
- ORISO-ConsultingTypeService: file: TopicFeatureAuthorisationService.java — src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- ORISO-TenantService: class: Authority — src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- ORISO-TenantService: class: AuthorityValue — src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- ORISO-TenantService: class: RoleAuthorizationAuthorityMapper — src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- ORISO-TenantService: class: UserRole — src/main/java/com/vi/tenantservice/api/authorisation/UserRole.java
- ORISO-TenantService: class: TenantAuthorisationException — src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- ORISO-TenantService: class: TenantFacadeAuthorisationService — src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- ORISO-TenantService: class: Consultant — src/main/java/com/vi/tenantservice/api/manager/consultingtype/roles/Consultant.java
- ORISO-TenantService: class: TenantAdminAllowedPermissionTogglesSettings — src/main/java/com/vi/tenantservice/api/model/TenantAdminAllowedPermissionTogglesSettings.java
- ORISO-Database: concept: Redis cache and sessions — Redis is used for Spring sessions, cache prefixes, tokens, and temporary/rate-limit data.
- ORISO-Database: concept: phpMyAdmin read-only access — k8s/mariadb-client exposes phpMyAdmin through ingress, basic auth, and a view-only database user.
- ORISO-Database: concept: MongoDB auth and validation gap — MongoDB docs state no authentication and disabled JSON schema validation for consulting types.
- ORISO-Database: concept: Sensitive dumps in repository — The targeted SQL dump contains user, consultant, session, notification, Matrix id, email, and password-like values.
- ORISO-Database: domain: userservice database — Users, consultants, sessions, chats, assignments, mobile tokens, notifications, and audit records.
- ORISO-Database: domain: Redis cache/session store — Schema-less Redis instance for sessions, caches, tokens, and rate limits.
- ORISO-Database: module: Database Risk Map — Risky data dumps, missing indexes, schema ownership gaps, and operational security concerns.
- ORISO-Database: module: UserService Core Data Model — Largest relational schema: users, consultants, sessions, chats, assignments, notifications, audit logs, and mobile tokens.
- ORISO-Keycloak: concept: app-custom scope — The app-custom client scope maps username, tenantId, and userId user attributes into access, ID, and userinfo tokens.
- ORISO-Keycloak: concept: Backend token validation — Backend services validate JWTs through the realm issuer URI and JWK set URI, then read roles and tenant/user claims.
- ORISO-Keycloak: concept: Environment drift — Docs reference direct IPs, Nginx /auth proxy paths, auth.oriso.site ingress, current realm sslRequired=external, and scripts that set sslRequired=NONE
- ORISO-Keycloak: concept: Frontend OIDC login — Frontend/admin clients authenticate through the public app client using browser-based OIDC authorization code flow.
- ORISO-Keycloak: concept: kcadm admin automation — configure-http-access.sh and backup/realm-backup.sh use kcadm inside the running Keycloak pod to change realm settings and export configuration.
- ORISO-Keycloak: concept: Keycloak as central IAM — ORISO-Keycloak is the identity provider for ORISO services, issuing OIDC tokens and centralizing user role management.
- ORISO-Keycloak: concept: No groups configured — realm.json exports an empty groups array; group-based authorization is not currently modeled in this repository.
- ORISO-Keycloak: concept: No external identity providers — identityProviders is empty; SSO is internal to Keycloak, with no Google/Azure/SAML/social broker configured in this realm export.
- ORISO-Kubernetes: concept: Sensitive values in ConfigMaps — Some ConfigMaps render password-like values into non-Secret application.properties blocks.
- ORISO-Kubernetes: concept: Externally exposed utility UIs — Redis Commander, SigNoz, Storybook, Health Dashboard, and Status Page have public ingress definitions.
- ORISO-Kubernetes: concept: Keycloak dev mode — Keycloak starts with start-dev, hostNetwork true, default-style admin values, no probes, and no resources in chart values.
- ORISO-Kubernetes: concept: LoadBalancer plus Ingress exposure — frontend, admin, and status-page values use LoadBalancer while separate ingress resources expose them too.
- ORISO-Kubernetes: concept: No NetworkPolicy manifests — No NetworkPolicy manifests were found; service isolation depends on namespace/default cluster policy.
- ORISO-Kubernetes: concept: oriso-dev.site domains — Dev/staging-like external domains route app, admin, API, auth, Matrix, LiveKit, SigNoz, Redis Commander, Status Page, and Storybook.
- ORISO-Kubernetes: config: Chart.yaml — helm/charts/keycloak/Chart.yaml
- ORISO-Kubernetes: config: values.yaml — helm/charts/keycloak/values.yaml

## By Database/Data Ownership

- ORISO-Frontend: file: EditableData.tsx — src/components/editableData/EditableData.tsx
- ORISO-Frontend: function: EditableData — src/components/editableData/EditableData.tsx
- ORISO-Frontend: file: bookingEventTableColumnAttendee.tsx — src/containers/bookings/components/BookingEventTableColumnAttendee/bookingEventTableColumnAttendee.tsx
- ORISO-Frontend: file: editableData.styles.scss — src/components/editableData/editableData.styles.scss
- ORISO-Admin: file: index.tsx — src/components/CardEditable/components/UnsavedChanges/index.tsx
- ORISO-Admin: function: UnsavedChangesModal — src/components/CardEditable/components/UnsavedChanges/index.tsx
- ORISO-Admin: file: index.tsx — src/components/CardEditable/index.tsx
- ORISO-Admin: function: CardEditable — src/components/CardEditable/index.tsx
- ORISO-Admin: file: styles.module.scss — src/components/CardEditable/styles.module.scss
- ORISO-Admin: file: AddButton.tsx — src/components/EditableTable/AddButton.tsx
- ORISO-Admin: file: EditableTable.tsx — src/components/EditableTable/EditableTable.tsx
- ORISO-Admin: file: EditButtons.tsx — src/components/EditableTable/EditButtons.tsx
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/config/BeanAwareSpringLiquibase.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/config/LiquibaseConfig.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/facade/CreateUserFacade.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/facade/assignsession/AssignSessionFacade.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/service/matrix/RedisMessageMirrorService.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/workflow/delete/action/asker/DeleteDatabaseAskerAction.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/workflow/delete/action/asker/DeleteDatabaseAskerAgencyAction.java
- ORISO-UserService: file: src/main/java/de/caritas/cob/userservice/api/workflow/delete/action/consultant/DeleteDatabaseConsultantAction.java
- ORISO-AgencyService: schema: agencyadminservice.yaml — api/agencyadminservice.yaml
- ORISO-AgencyService: schema: agencyservice.yaml — api/agencyservice.yaml
- ORISO-AgencyService: config: pom.xml
- ORISO-AgencyService: schema: applicationsettingsservice.yml — services/applicationsettingsservice.yml
- ORISO-AgencyService: schema: appointmentService.yaml — services/appointmentService.yaml
- ORISO-AgencyService: schema: consultingtypeservice.yaml — services/consultingtypeservice.yaml
- ORISO-AgencyService: schema: tenantservice.yaml — services/tenantservice.yaml
- ORISO-AgencyService: schema: topicservice.yaml — services/topicservice.yaml
- ORISO-ConsultingTypeService: config: pom.xml
- ORISO-ConsultingTypeService: file: TopicFeatureAssertionAspect.java — src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/TopicFeatureAssertionAspect.java
- ORISO-ConsultingTypeService: file: ConsultingTypeValidator.java — src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeValidator.java
- ORISO-ConsultingTypeService: file: TopicAdminController.java — src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicAdminController.java
- ORISO-ConsultingTypeService: file: TopicController.java — src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- ORISO-ConsultingTypeService: file: TopicGroupsController.java — src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicGroupsController.java
- ORISO-ConsultingTypeService: file: TopicConverter.java — src/main/java/de/caritas/cob/consultingtypeservice/api/converter/TopicConverter.java
- ORISO-ConsultingTypeService: file: TopicGroupConverter.java — src/main/java/de/caritas/cob/consultingtypeservice/api/converter/TopicGroupConverter.java
- ORISO-TenantService: concept: MariaDB and Liquibase persistence — TenantEntity maps to the tenant table and Liquibase changelogs describe historical schema evolution.
- ORISO-TenantService: concept: Runtime configuration validation — ConfigurationValidator fails startup when database, Keycloak, JWT, and service URL settings are missing.
- ORISO-TenantService: concept: Unused contracts and helpers — services/agencyadminservice.yaml is only referenced through useradminservice.yaml schemas, and TenantHeaderSupplier has no active call site in the sca
- ORISO-TenantService: config: liquibase.properties — src/main/resources/liquibase.properties
- ORISO-TenantService: module: Persistence and Migrations — MariaDB tenant table, JPA repository, Liquibase changelogs, and cache configuration.
- ORISO-TenantService: schema: tenantservice.yaml — api/tenantservice.yaml
- ORISO-TenantService: schema: agencyadminservice.yaml — services/agencyadminservice.yaml
- ORISO-TenantService: schema: applicationsettingsservice.yml — services/applicationsettingsservice.yml
- ORISO-Database: concept: Timestamped backup layout — Backups are organized by timestamp with paired MariaDB SQL gz and MongoDB archive gz files.
- ORISO-Database: concept: Redis cache and sessions — Redis is used for Spring sessions, cache prefixes, tokens, and temporary/rate-limit data.
- ORISO-Database: concept: Consulting type MongoDB — MongoDB stores consulting type and application settings documents; JSON/schema validation is documented as disabled.
- ORISO-Database: concept: Cross-service ids without FK enforcement — Many agency_id, user_id, session_id, consulting_type, and tenant_id references cross service/database boundaries and are not enforced by MariaDB const
- ORISO-Database: concept: Database initialize job — database-initialize.yaml restores MariaDB and MongoDB from backup files copied into the job pod.
- ORISO-Database: concept: Liquibase disabled in services — ORISO backend services do not auto-migrate schemas; this repository is the operational source of schema truth.
- ORISO-Database: concept: Manual schema exports — Schema changes are applied manually to running databases, then exported back into mariadb/*/schema.sql.
- ORISO-Database: concept: Matrix-owned PostgreSQL — PostgreSQL is dedicated to Matrix Synapse and is not part of ORISO service schema ownership.
- ORISO-Keycloak: concept: start-dev runtime risk — The Deployment runs Keycloak with start-dev, no external database configuration, no probes, no resource limits, and hostNetwork enabled.
- ORISO-Keycloak: schema: scope:acr — realm.json
- ORISO-Keycloak: schema: scope:address — realm.json
- ORISO-Keycloak: schema: scope:app-custom — realm.json
- ORISO-Keycloak: schema: scope:email — realm.json
- ORISO-Keycloak: schema: scope:microprofile-jwt — realm.json
- ORISO-Keycloak: schema: scope:offline_access — realm.json
- ORISO-Keycloak: schema: scope:phone — realm.json
- ORISO-Kubernetes: concept: Externally exposed utility UIs — Redis Commander, SigNoz, Storybook, Health Dashboard, and Status Page have public ingress definitions.
- ORISO-Kubernetes: concept: oriso-dev.site domains — Dev/staging-like external domains route app, admin, API, auth, Matrix, LiveKit, SigNoz, Redis Commander, Status Page, and Storybook.
- ORISO-Kubernetes: concept: Stateful storage — MariaDB, ClickHouse, and SigNoz use StatefulSets/volumeClaimTemplates; MongoDB/Redis/Matrix mount existing PVCs.
- ORISO-Kubernetes: config: Chart.yaml — helm/charts/mariadb/Chart.yaml
- ORISO-Kubernetes: config: values.yaml — helm/charts/mariadb/values.yaml
- ORISO-Kubernetes: config: Chart.yaml — helm/charts/mongodb/Chart.yaml
- ORISO-Kubernetes: config: values.yaml — helm/charts/mongodb/values.yaml
- ORISO-Kubernetes: config: Chart.yaml — helm/charts/rabbitmq/Chart.yaml

## By Kubernetes/Deployment

- ORISO-Frontend: function: inputValuesFit — src/utils/validateInputValue.ts
- ORISO-Frontend: service: .dockerignore
- ORISO-Frontend: service: Dockerfile
- ORISO-Frontend: pipeline: frontend-deploy.yml — .github/workflows/frontend-deploy.yml
- ORISO-Frontend: service: Dockerfile.storybook
- ORISO-Frontend: document: STORYBOOK_KUBERNETES.md
- ORISO-Frontend: config: deployment-v2.yaml
- ORISO-Frontend: config: https-redirect-middleware.yaml
- ORISO-Admin: service: .dockerignore
- ORISO-Admin: file: deploy-admin.sh
- ORISO-Admin: file: deploy-development.sh
- ORISO-Admin: service: Dockerfile
- ORISO-Admin: config: ingress.yaml
- ORISO-Admin: file: nginx.conf
- ORISO-UserService: pipeline: Dockerfile
- ORISO-UserService: config: api/appointmentservice.yaml
- ORISO-UserService: config: api/conversationservice.yaml
- ORISO-UserService: config: api/useradminservice.yaml
- ORISO-UserService: config: api/userservice.yaml
- ORISO-UserService: config: api/userstatisticsservice.yaml
- ORISO-UserService: pipeline: check-version.sh
- ORISO-UserService: pipeline: deploy-development.sh
- ORISO-AgencyService: schema: agencyadminservice.yaml — api/agencyadminservice.yaml
- ORISO-AgencyService: schema: agencyservice.yaml — api/agencyservice.yaml
- ORISO-AgencyService: file: docker-build.cmd
- ORISO-AgencyService: service: Dockerfile
- ORISO-AgencyService: schema: appointmentService.yaml — services/appointmentService.yaml
- ORISO-AgencyService: schema: consultingtypeservice.yaml — services/consultingtypeservice.yaml
- ORISO-AgencyService: schema: tenantservice.yaml — services/tenantservice.yaml
- ORISO-AgencyService: schema: topicservice.yaml — services/topicservice.yaml
- ORISO-ConsultingTypeService: pipeline: Dockerfile
- ORISO-ConsultingTypeService: file: docker-build.cmd
- ORISO-ConsultingTypeService: config: tenantservice.yaml — services/tenantservice.yaml
- ORISO-ConsultingTypeService: file: RoleAuthorizationAuthorityMapper.java — src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- ORISO-ConsultingTypeService: endpoint: POST /tenantadmin — services/tenantservice.yaml
- ORISO-ConsultingTypeService: endpoint: GET /tenantadmin — services/tenantservice.yaml
- ORISO-ConsultingTypeService: endpoint: GET /tenantadmin/search — services/tenantservice.yaml
- ORISO-ConsultingTypeService: endpoint: PUT /tenantadmin/{id} — services/tenantservice.yaml
- ORISO-TenantService: concept: OpenAPI-first REST boundary — The public TenantService API is described in api/tenantservice.yaml and implemented by TenantController through generated Spring interfaces.
- ORISO-TenantService: concept: Single-domain multitenancy override — Single-domain deployments can override subdomain behavior and selected legal/privacy content from ApplicationSettingsService.
- ORISO-TenantService: concept: Unused contracts and helpers — services/agencyadminservice.yaml is only referenced through useradminservice.yaml schemas, and TenantHeaderSupplier has no active call site in the sca
- ORISO-TenantService: endpoint: GET /tenant/access — api/tenantservice.yaml
- ORISO-TenantService: endpoint: POST /tenantadmin — api/tenantservice.yaml
- ORISO-TenantService: endpoint: GET /tenant — api/tenantservice.yaml
- ORISO-TenantService: endpoint: GET /tenantadmin — api/tenantservice.yaml
- ORISO-TenantService: endpoint: GET /tenantadmin/{id} — api/tenantservice.yaml
- ORISO-Database: concept: Database initialize job — database-initialize.yaml restores MariaDB and MongoDB from backup files copied into the job pod.
- ORISO-Database: concept: phpMyAdmin read-only access — k8s/mariadb-client exposes phpMyAdmin through ingress, basic auth, and a view-only database user.
- ORISO-Database: concept: Sensitive dumps in repository — The targeted SQL dump contains user, consultant, session, notification, Matrix id, email, and password-like values.
- ORISO-Database: concept: Static secrets and default credentials — Docs and YAML include root/default credentials and system user password material; these should be externalized or rotated.
- ORISO-Database: document: README.md — k8s/mariadb-client/README.md
- ORISO-Database: module: Backup and Recovery — Timestamped MariaDB/MongoDB backups and Kubernetes restore job.
- ORISO-Database: module: DevOps Access and Initialization — phpMyAdmin access, database restore job, and system user creation job.
- ORISO-Database: resource: configmap.yaml — k8s/mariadb-client/configmap.yaml
- ORISO-Keycloak: concept: Environment drift — Docs reference direct IPs, Nginx /auth proxy paths, auth.oriso.site ingress, current realm sslRequired=external, and scripts that set sslRequired=NONE
- ORISO-Keycloak: concept: Hardcoded admin credentials — keycloak-deployment.yaml and scripts use admin/admin directly instead of Kubernetes Secrets.
- ORISO-Keycloak: concept: start-dev runtime risk — The Deployment runs Keycloak with start-dev, no external database configuration, no probes, no resource limits, and hostNetwork enabled.
- ORISO-Keycloak: document: DEPLOYMENT.md
- ORISO-Keycloak: flow: docker auth — realm.json
- ORISO-Keycloak: module: Authentication Flows — Browser, direct grant, registration, reset credentials, client, and Docker auth flows exported from the realm.
- ORISO-Keycloak: module: Kubernetes Runtime — Deployment, Service, Ingress, namespace, host networking, hostname, proxy, and TLS configuration.
- ORISO-Keycloak: module: Operations and Admin Scripts — HTTP access setup, realm export/backup, deployment documentation, and status notes.
- ORISO-Kubernetes: concept: cert-manager TLS — Ingress TLS resources use cert-manager cluster issuer letsencrypt-prod.
- ORISO-Kubernetes: concept: Kubernetes service DNS — Internal services use oriso-platform-* names under caritas.svc.cluster.local.
- ORISO-Kubernetes: concept: Sensitive values in ConfigMaps — Some ConfigMaps render password-like values into non-Secret application.properties blocks.
- ORISO-Kubernetes: concept: Environment drift — Values mix prod/local Spring profiles, dev domains, localhost local override, hostNetwork, and missing staging/prod overlays.
- ORISO-Kubernetes: concept: Externally exposed utility UIs — Redis Commander, SigNoz, Storybook, Health Dashboard, and Status Page have public ingress definitions.
- ORISO-Kubernetes: concept: Local Helm dependencies — The umbrella chart depends on local file:// subcharts and packaged chart archives.
- ORISO-Kubernetes: concept: Keycloak dev mode — Keycloak starts with start-dev, hostNetwork true, default-style admin values, no probes, and no resources in chart values.
- ORISO-Kubernetes: concept: latest tags and pullPolicy Never — Several application images use latest tags and pullPolicy Never, which couples deployments to node-local image state.

## By Unresolved Relationships

- ORISO-Database: unmapped-data-reference — matrix data/deployment is referenced but no target repo is included in this merge.
- ORISO-Database: unmapped-data-reference — status data/deployment is referenced but no target repo is included in this merge.
- ORISO-Database: unmapped-data-reference — uploadservice data/deployment is referenced but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — signoz is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — status is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — matrix is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — livekit is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — uploadservice is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — element is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — health-dashboard is referenced in Kubernetes graph but no target repo is included in this merge.
- ORISO-Kubernetes: unmapped-deployment-reference — rocketchat is referenced in Kubernetes graph but no target repo is included in this merge.
