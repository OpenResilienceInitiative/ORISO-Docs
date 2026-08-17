---
title: ORISO-ConsultingTypeService Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-ConsultingTypeService.
---

# ORISO-ConsultingTypeService Enriched Graph Summary

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

Consulting type, topic, topic group, application settings, and tenant-aware taxonomy service. Since July 2026 it additionally owns the platform's global SMTP settings send path and dispatches DPA (AVV) signing emails for the legal/DPA module.

## Main Technologies

- Stack: Spring Boot 4.0.1 (Java 21), Spring Security (OAuth2 resource server), Spring Data MongoDB, Spring Data JPA, OpenAPI Generator, Liquibase (re-enabled, single master changelog), Ehcache, MariaDB, MongoDB, Jakarta Mail, OTLP/SigNoz observability
- Selected Maven dependencies: org.springframework.boot:spring-boot-starter-parent 4.0.1, org.springframework.cloud:spring-cloud-dependencies, org.springframework.boot:spring-boot-starter-data-jpa, org.springframework.boot:spring-boot-starter-data-mongodb, org.springframework.boot:spring-boot-starter-security, org.springframework.boot:spring-boot-starter-validation, org.springframework.boot:spring-boot-starter-oauth2-resource-server, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-cache, net.sf.ehcache:ehcache, org.springframework.boot:spring-boot-starter-actuator, org.springframework.boot:spring-boot-starter-liquibase (explicit — SB4 no longer pulls Liquibase in transitively), org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.swagger.core.v3:swagger-annotations, org.springdoc:springdoc-openapi-starter-webmvc-ui, org.keycloak:keycloak-admin-client, org.liquibase:liquibase-core, org.mariadb.jdbc:mariadb-java-client, de.flapdoodle.embed:de.flapdoodle.embed.mongo (test), net.javacrumbs.json-unit:json-unit-spring (test)
- The Sentry SDK was removed (OBS-P5); tracing/metrics ship via OTLP to SigNoz.

## Important Files and Modules

- pom.xml
- api/applicationsettingsservice.yml
- api/consultingtypeadminservice.yml
- api/consultingtypeservice.yml
- api/topicservice.yml
- services/tenantservice.yaml
- contracts/topic-format-correction-96.md
- scripts/contracts/publish-provider-contracts.sh
- scripts/contracts/verify-provider-compatibility.sh
- scripts/contracts/verify-consumer-contract.sh
- scripts/ci/run-required-integration-tests.sh
- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ApplicationSettingsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ConsultingTypeController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/DpaSigningEmailController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicGroupsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/VersionController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/Authority.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/DpaSigningEmailService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/JakartaDpaMailTransport.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/SmtpPasswordEncryptionService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/AppConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/TrailingSlashFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/CorrelationIdFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeTenantAwareRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/ApplicationSettingsRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicRepository.java

## Architecture Summary

The service follows an OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes (MongoDB for consulting types and application settings, MariaDB/JPA for topics and topic groups), security/authority mapping, tenant-resolution support, and outbound service clients under services/ and config/apiclient. Two cross-cutting servlet filters were added in July 2026: CorrelationIdFilter (X-Correlation-ID into the MDC for SigNoz cross-service correlation) and TrailingSlashFilter (restores trailing-slash request matching that Spring Boot 4 removed). The DPA signing email subsystem (controller → service → Jakarta Mail transport) reuses the encrypted global SMTP settings stored in application settings.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/applicationsettingsservice.yml | /settings<br>/settingsadmin |
| api/consultingtypeadminservice.yml | /consultingtypeadmin<br>/consultingtypeadmin/consultingtypes |
| api/consultingtypeservice.yml | /consultingtypes/basic<br>/consultingtypes/{consultingTypeId}/basic<br>/consultingtypes/{consultingTypeId}/extended<br>/consultingtypes/{consultingTypeId}/full<br>/consultingtypes/byslug/{slug}/full<br>/consultingtypes/bytenant/{tenantId}/full<br>/consultingtypes/groups<br>/consultingtypes<br>/consultingtypes/{id} |
| api/topicservice.yml | /topic-groups<br>/topic<br>/topic/{id}<br>/topic/public<br>/topicadmin<br>/topicadmin/{id} |

Not in any OpenAPI spec (documented drift, TEN-INV-U5): `POST /settingsadmin/dpa-signing-emails` (DpaSigningEmailController) — requires `AUTHORIZATION_PATCH_APPLICATION_SETTINGS`; response `{status, recipientEmail, sentAt}`, 502 on SMTP failure, 400 on unparseable recipient. UserService codes against this shape; the endpoint should be added to api/applicationsettingsservice.yml with a consumer contract.

Contract governance: CI publishes provider bundles and runs an oasdiff breaking-change gate (scripts/contracts/, .github/workflows/openapi-contracts.yml) with a reviewed one-time allowlist in contracts/topic-format-correction-96.md (topic `welcomeMessage`/`fallbackUrl` are plain strings; ids are integer/int64 — invalid `type: long` and `format: url`/`int32` scalars were corrected).

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ApplicationSettingsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ConsultingTypeController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/DpaSigningEmailController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicGroupsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/VersionController.java

Services:

- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/service/ConsultingTypeAdminService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeMongoRepositoryService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeMongoTenantAwareRepositoryService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeRepositoryService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/ApplicationSettingsService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/ConsultingTypeGroupService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/ConsultingTypeService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/DefaultApplicationSettingsInitializer.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/DpaSigningEmailService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/JakartaDpaMailTransport.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/LogService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/SmtpPasswordEncryptionService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TenantService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicGroupService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TranslationService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/validation/TopicValidationService.java

Repositories:

- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeTenantAwareRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/ApplicationSettingsRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicRepository.java

Entities/models:

- src/main/java/de/caritas/cob/consultingtypeservice/api/model/ApplicationSettingsEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/ConsultingTypeEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicGroupEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicStatus.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/DpaMailSendReceipt.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/DpaMailSettings.java

Security, tenant, and config modules:

- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/Authority.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/AppConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/CustomSwaggerUIPathWebMvcConfigurer.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/TrailingSlashFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/CorrelationIdFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/StatelessCsrfFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/SubdomainExtractor.java

Adapters and generated clients:

- src/main/java/de/caritas/cob/consultingtypeservice/api/exception/KeycloakException.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/exception/SmtpSendException.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/apiclient/TenantServiceApiClient.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/apiclient/TenantServiceApiControllerFactory.java

## Config and Database

Application config keys inspected (application.properties at the pinned commit):

- logging: logback-spring.xml provides JSON structured logs; management.logging.export.otlp.enabled=false (the OTel starter's own log exporter is off — logs ship via the collector pipeline)
- keycloak.auth-server-url / keycloak.realm / keycloak.bearer-only / keycloak.resource / keycloak.principal-attribute / keycloak.cors
- spring.security.oauth2.resourceserver.jwt.issuer-uri
- spring.datasource.url / username / password / driver-class-name / hikari.*
- spring.jpa.hibernate.ddl-auto / spring.jpa.open-in-view / spring.jpa.properties.hibernate.dialect / spring.jpa.properties.hibernate.ejb.interceptor
- spring.mongodb.uri (Spring Boot 4 rename — `spring.data.mongodb.uri` is NO longer bound; env var is still SPRING_DATA_MONGODB_URI)
- spring.liquibase.enabled (${SPRING_LIQUIBASE_ENABLED:true}) / spring.liquibase.change-log=classpath:db/changelog/consultingtypeservice-master.xml / spring.liquibase.contexts (${SPRING_LIQUIBASE_CONTEXTS:prod})
- server.port / server.shutdown / spring.lifecycle.timeout-per-shutdown-phase
- app.base.url / multitenancy.enabled / feature.multitenancy.with.single.domain.enabled / setting.main.tenant.subdomain.for.single.domain.multitenancy / tenant.service.api.url
- consulting.types.json.path / consulting.types.json.schema.file
- consulting.type.cors.enabled / consulting.type.cors.allowed.origins / consulting.type.cors.allowed.paths
- csrf.header.property / csrf.cookie.property
- cache.tenant.configuration.* / cache.groups.configuration.* (Ehcache)
- settings.smtp.password.encryption.secret (AES-256-GCM key for SMTP passwords at rest; warns and disables encryption when unset)
- dpa.sign.frontend.base-url (${...:https://app.oriso.org} — permitted origin for DPA sign links)
- management.endpoint.health.* / management.endpoints.web.exposure.include / management.info.build.enabled
- management.opentelemetry.tracing.export.otlp.endpoint / management.tracing.export.otlp.enabled / management.tracing.sampling.probability (pinned 1.0 on Pre-Dev) / management.otlp.metrics.export.url / management.otlp.metrics.export.enabled
- springfox.docu* (legacy doc metadata) / springdoc paths via CustomSwaggerUIPathWebMvcConfigurer

Migration/changelog files (single master, contexts select environments; the per-environment master files and liquibase.properties were removed):

- src/main/resources/db/changelog/consultingtypeservice-master.xml
- src/main/resources/db/changelog/changeset/0001_initsql/ (initSql.xml, initTables.sql)
- src/main/resources/db/changelog/changeset/0002_topic_internal_identifier/
- src/main/resources/db/changelog/changeset/0003_migrate_topic_to_multilingual_structure/
- src/main/resources/db/changelog/changeset/0004_topic_groups/
- src/main/resources/db/changelog/changeset/0005_topic_fallback_agency_id/
- src/main/resources/db/changelog/changeset/0006_topic_fallback_url/
- src/main/resources/db/changelog/changeset/0007_topic_welcome_message/
- src/main/resources/db/changelog/changeset/0008_topic_send_next_step_message/
- src/main/resources/db/changelog/changeset/0009_topic_add_titles_and_extend_internal_identifier/
- src/main/resources/db/changelog/changeset/0010_change_topic_and_topic_groups_to_be_i18n_aware/
- src/main/resources/db/changelog/changeset/0011_add_english_topic_names/

Guard tests (LiquibaseAutoConfigurationPresenceTest, twice: root and config package) fail the build if the Liquibase auto-configuration drops off the classpath again — Spring Boot 4 requires the explicit spring-boot-starter-liquibase dependency.

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. ORISO-UserService is the consumer of the DPA signing email endpoint (TEN-INV-U6 wiring) and of the topic service contract (verified via the consumer-contract script). Outbound contracts/configs found:

- services/tenantservice.yaml (regenerated July 2026 against the much larger current TenantService API)

## Local Development Notes

- ./mvnw spring-boot:run with a local profile (Java 21 required)
- Requires MongoDB consulting/application collections, MariaDB consultingtypeservice schema, Keycloak, and TenantService URL.
- Liquibase runs on startup by default (SPRING_LIQUIBASE_ENABLED, SPRING_LIQUIBASE_CONTEXTS to override); the testing profile honors the same switches and has a parseable Mongo URI default.

## Deployment Notes

- Dockerfile and ORISO-Kubernetes helm/charts/consultingtypeservice; ORISO-Helm is the canonical infra repo.
- CI: ci-pull-request runs unit + required integration tests (scripts/ci/run-required-integration-tests.sh) and the OpenAPI contract gate (openapi-contracts.yml, oasdiff); ci-main builds/pushes images with per-image GHA cache scopes; release-image.yml builds images from release branches; pre-dev branch mirrors the dev pipeline.
- Pre-Dev overrides the Liquibase context via SPRING_LIQUIBASE_CONTEXTS (#112).

## Risks and Gaps

- `POST /settingsadmin/dpa-signing-emails` is absent from every OpenAPI spec while its /settingsadmin siblings are specced — the contract gate cannot protect UserService's TEN-INV-U6 consumer; the endpoint should be added to api/applicationsettingsservice.yml.
- SMTP password encryption silently degrades to plaintext-at-rest when settings.smtp.password.encryption.secret is unset (startup warning only).
- Tenant resolution now rejects a tenantId header that contradicts the request subdomain; internal service-to-service calls without a subdomain still rely on the trusted header — keep aligned with peer services and ingress behavior.
- Config files contain environment-specific Keycloak, peer-service, cache, and database settings. Do not hardcode those in source.
- The legacy springfox.* property block survives although springdoc is the active documentation stack.

## Needs Verification

- Whether the DPA signing email endpoint has been added to api/applicationsettingsservice.yml (and a UserService consumer contract published) since this pin — the U6 wiring chunk was expected to do so.
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Runtime values of SPRING_LIQUIBASE_CONTEXTS/ENABLED per environment (Pre-Dev override vs prod default).
- Whether the OTLP tracing/metrics exporters are enabled outside Pre-Dev (both default to disabled without env vars).
