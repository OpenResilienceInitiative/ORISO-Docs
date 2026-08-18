---
title: ORISO-TenantService Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-TenantService.
---

# ORISO-TenantService Enriched Graph Summary

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

Tenant registry, tenant settings and platform permission controls, legal content, tenant resolution (subdomain/cookie/token), and tenant-dependent peer-service setup. Since mid-2026 the service additionally owns four substantial subsystems: the DPA (Auftragsverarbeitungsvertrag / data processing agreement) signature and status module, the authoritative tenant-ID allocation ledger, tenant-owned media blob storage, and LLM-backed machine translation of legal texts.

## Main Technologies

- Stack: Spring Boot 4.0.1 (Java 21), Spring Security OAuth2 Resource Server, Keycloak, Spring Data JPA, Liquibase, OpenAPI Generator, FreeMarker, Ehcache, MariaDB
- Observability: spring-boot-micrometer-tracing + OpenTelemetry OTLP tracing/metrics export, JSON structured logging (logback-spring.xml), correlation-id filter. Sentry SDK removed (OBS-P5).
- Machine translation: pluggable OpenAI-compatible chat providers (OpenRouter, Mistral) with per-tenant API keys.
- CI: GitHub Actions (feature/PR/main pipelines, OpenAPI contract gate, release-image workflow), CodeRabbit auto-review, Trivy scan script.

## Important Files and Modules

- pom.xml
- api/tenantservice.yaml
- services/agencyadminservice.yaml
- services/applicationsettingsservice.yml
- services/consultingtypeservice.yaml
- services/useradminservice.yaml
- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/TenantMediaController.java
- src/main/java/com/vi/tenantservice/api/controller/TenantDtoMapper.java
- src/main/java/com/vi/tenantservice/api/controller/ExceptionHandlerAdvice.java
- src/main/java/com/vi/tenantservice/api/facade/TenantServiceFacade.java
- src/main/java/com/vi/tenantservice/api/facade/TenantDpaFacade.java
- src/main/java/com/vi/tenantservice/api/facade/TranslationFacade.java
- src/main/java/com/vi/tenantservice/api/service/GoverningDpaResolver.java
- src/main/java/com/vi/tenantservice/api/service/TenantDpaStatusService.java
- src/main/java/com/vi/tenantservice/api/service/TenantIdAllocationService.java
- src/main/java/com/vi/tenantservice/api/service/TenantMediaService.java
- src/main/java/com/vi/tenantservice/api/converter/EffectivePermissionSettingsApplier.java
- src/main/java/com/vi/tenantservice/api/validation/InputSanitizer.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java
- src/main/resources/db/changelog/tenantservice-master.xml
- documentation/translation-meta.md
- tests/contracts/test_openapi_contract_gate.py

## Architecture Summary

OpenAPI-first Spring boundary: `api/tenantservice.yaml` is generated into API interfaces implemented by `TenantController` (plus `TenantMediaController`), which apply endpoint authorization. Facades orchestrate domain services: `TenantServiceFacade` for tenant CRUD/search with change detection, dependent-settings override, and downstream peer-service sync; `TenantDpaFacade` as the authorization-guarded (IDOR-safe) entry point to the DPA services; `TranslationFacade` for machine translation. Repositories persist to MariaDB. Security maps Keycloak JWTs to local authorities; tenant context is resolved from access token, cookie, or subdomain. The DPA module resolves the governing document for every read/sign/forward path through the single `GoverningDpaResolver` (own published DPA or the operator DPA, `app.dpa.operator-tenant-id`). Tenant IDs are allocated through a reservation ledger whose primary key guarantees exactly-once assignment.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/tenantservice.yaml | /tenantadmin<br>/tenantadmin/search<br>/tenantadmin/controls<br>/tenantadmin/{id}<br>/tenantadmin/tenant-ids/{id}/availability<br>/tenantadmin/tenant-ids/next-free<br>/tenantadmin/tenant-ids/reservations<br>/tenantadmin/tenant-ids/reservations/{id}<br>/tenantadmin/{id}/dpa<br>/tenantadmin/{id}/dpa/status<br>/tenantadmin/{id}/dpa/versions<br>/tenantadmin/{id}/dpa/sign<br>/tenantadmin/{id}/dpa/signatures<br>/tenantadmin/{id}/dpa/invite<br>/tenantadmin/{id}/dpa/gate<br>/tenant/public/dpa/confirm/{token}<br>/tenantadmin/translation/keys<br>/tenantadmin/translation/keys/{provider}<br>/tenantadmin/translate<br>/tenant/translate/group-chat-author-content<br>/tenantadmin/media<br>/media/{mediaId}<br>/tenant<br>/tenant/{id}<br>/tenant/access<br>/tenant/public/{subdomain}<br>/tenant/public/id/{tenantId}<br>/tenant/public/ids<br>/tenant/public/single<br>/tenant/public/ |

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/TenantMediaController.java
- src/main/java/com/vi/tenantservice/api/controller/VersionController.java
- src/main/java/com/vi/tenantservice/api/controller/ExceptionHandlerAdvice.java (controller advice)
- src/main/java/com/vi/tenantservice/api/controller/interceptor/CorrelationIdFilter.java

Facades and services:

- src/main/java/com/vi/tenantservice/api/facade/TenantServiceFacade.java
- src/main/java/com/vi/tenantservice/api/facade/TenantDpaFacade.java
- src/main/java/com/vi/tenantservice/api/facade/TranslationFacade.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeChangeDetectionService.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeDependentSettingsOverrideService.java
- src/main/java/com/vi/tenantservice/api/service/TenantService.java
- src/main/java/com/vi/tenantservice/api/service/GoverningDpaResolver.java
- src/main/java/com/vi/tenantservice/api/service/TenantDpaService.java
- src/main/java/com/vi/tenantservice/api/service/TenantDpaStatusService.java
- src/main/java/com/vi/tenantservice/api/service/TenantDpaRetentionService.java
- src/main/java/com/vi/tenantservice/api/service/TenantIdAllocationService.java
- src/main/java/com/vi/tenantservice/api/service/TenantMediaService.java
- src/main/java/com/vi/tenantservice/api/service/TenantAdminControlsService.java
- src/main/java/com/vi/tenantservice/api/service/SingleDomainTenantOverrideService.java
- src/main/java/com/vi/tenantservice/api/service/TemplateService.java
- src/main/java/com/vi/tenantservice/api/service/TranslationService.java
- src/main/java/com/vi/tenantservice/api/service/translation/OpenRouterClient.java
- src/main/java/com/vi/tenantservice/api/service/translation/MistralClient.java
- src/main/java/com/vi/tenantservice/api/service/translation/OpenAiCompatibleChatClient.java
- src/main/java/com/vi/tenantservice/api/service/translation/ApiKeyMasker.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/ApplicationSettingsService.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/ConsultingTypeService.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/UserAdminService.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/security/AuthorisationService.java

Repositories:

- src/main/java/com/vi/tenantservice/api/repository/TenantRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantAdminControlsRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantDpaSignatureRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantDpaAdminSignatureRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantDpaVersionRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantIdReservationRepository.java
- src/main/java/com/vi/tenantservice/api/repository/TenantMediaRepository.java

Entities/models:

- src/main/java/com/vi/tenantservice/api/model/TenantEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantSettings.java (feature flags incl. media flag families, featureTeamDiscussionEnabled, emailVisible/emailRequired, featureDisplayNameEditable, featureAskerEmailEnabled)
- src/main/java/com/vi/tenantservice/api/model/TenantSetting.java
- src/main/java/com/vi/tenantservice/api/model/TenantContent.java
- src/main/java/com/vi/tenantservice/api/model/TenantSmtpSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminControlsEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminControlsSettings.java (incl. per-tenant translationApiKeys)
- src/main/java/com/vi/tenantservice/api/model/TenantAdminAllowedPermissionTogglesSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantDpaSignatureEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantDpaAdminSignatureEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantDpaVersionEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantDpaStatus.java / DpaSignatureStatus.java
- src/main/java/com/vi/tenantservice/api/model/TenantIdReservationEntity.java / TenantIdReservationStatus.java / TenantIdAllocationStatus.java
- src/main/java/com/vi/tenantservice/api/model/TenantMediaEntity.java
- src/main/java/com/vi/tenantservice/api/model/DataProtectionPlaceHolderType.java
- src/main/java/com/vi/tenantservice/api/model/AssignedOrSequenceIdGenerator.java

Security, tenant, and config modules:

- src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- src/main/java/com/vi/tenantservice/api/config/CorsConfig.java
- src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestrictedPublicTenantJacksonConfig.java
- src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- src/main/java/com/vi/tenantservice/api/converter/EffectivePermissionSettingsApplier.java
- src/main/java/com/vi/tenantservice/api/validation/InputSanitizer.java
- src/main/java/com/vi/tenantservice/api/validation/TenantInputSanitizer.java
- src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverter.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverterProperties.java
- src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java
- src/main/java/com/vi/tenantservice/config/security/KeycloakLogoutHandler.java

Adapters and generated clients:

- src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiClient.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiControllerFactory.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/ConsultingTypeServiceApiControllerFactory.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/UserAdminServiceApiControllerFactory.java

## Config and Database

Application config keys inspected (application.properties plus per-profile files for local/dev/staging/prod/testing):

- spring.application.name, server.port, server.shutdown, spring.lifecycle.timeout-per-shutdown-phase
- keycloak.* (bearer-only, resource, principal-attribute, cors, disable-trust-manager), spring.security.oauth2.resourceserver.jwt.issuer-uri / jwk-set-uri
- spring.datasource.* (MariaDB driver, Hikari pool), spring.jpa.properties.hibernate.dialect
- spring.liquibase.enabled=${SPRING_LIQUIBASE_ENABLED:false}, spring.liquibase.change-log=classpath:db/changelog/tenantservice-master.xml, spring.liquibase.contexts=${SPRING_LIQUIBASE_CONTEXTS:prod} — Liquibase now has a single default master changelog with env-var gating (the per-environment master files were removed); the testing profile keeps it disabled
- feature.multitenancy.with.single.domain.enabled
- tenant.cors.enabled / tenant.cors.allowed.origins / tenant.cors.allowed.paths
- consulting.type.service.api.url, user.service.api.url
- csrf.header.property, csrf.cookie.property, csrf.whitelist.adminUris
- default.consulting.types.json.path, default.tenant.settings.json.path
- template.use.custom.resources.path, template.custom.resources.path
- translation.openrouter.base-url / model, translation.mistral.base-url / model, translation.connect-timeout-ms / read-timeout-ms (provider API keys are per-tenant data, not config)
- app.dpa.operator-tenant-id (governing operator DPA holder, default 1), dpa.denied-retention-days (default 365)
- management.tracing.sampling.probability, management.opentelemetry.tracing.export.otlp.endpoint, management.otlp.metrics.export.url / enabled
- management.endpoint.health.*, management.endpoints.web.exposure.include, spring.cache.jcache.config
- springfox.docu* (Swagger UI metadata), app.base.url

Migration/changelog files: single master `src/main/resources/db/changelog/tenantservice-master.xml` referencing changesets 0001-0027 under `src/main/resources/db/changelog/changeset/`. Notable recent changesets:

- 0013 tenant admin controls, 0014 tenant address/description
- 0015-0021 DPA: tenant DPA columns, signature table, signature token, version table, signature audit fields, lowercase sequence-name fixes for case-sensitive MariaDB, signer-is-member type fix
- 0022 widen tenant settings column
- 0023 tenant media table (DB-blob storage)
- 0024 tenant_id_reservation ledger
- 0025-0026 DPA admin signature table + sequence-name case fix
- 0027 theming light accent and signal colour

A schema-drift IT (`src/test/java/com/vi/tenantservice/api/LiquibaseSchemaDriftIT.java`) guards changelog-vs-JPA-model divergence.

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services (the tenant-invite/onboarding flow consumes the tenant-ID reservation endpoints; Admin consumes controls, DPA, translation and media endpoints; Frontend consumes restricted public metadata incl. the batch lookup and the asker permission keys #602). Outbound contracts/configs found:

- services/agencyadminservice.yaml
- services/applicationsettingsservice.yml
- services/consultingtypeservice.yaml
- services/useradminservice.yaml

Provider/consumer compatibility is enforced by an OpenAPI contract gate in CI (`tests/contracts/test_openapi_contract_gate.py`, `scripts/contracts/*.sh`, `.github/workflows/openapi-contracts.yml`); `tests/ci/test_required_ci_contract.py` pins the required pre-dev CI conclusions.

## Local Development Notes

- ./mvnw spring-boot:run with a local profile (Java 21 required; Spring Boot 4.0.1)
- Requires MariaDB tenantservice schema, Keycloak, and configured ConsultingType/ApplicationSettings/UserAdmin/AgencyAdmin APIs.
- documentation/local-development.md and run-local-remote-db.sh.example cover running against a remote DB; documentation/translation-meta.md documents the translation metadata format.

## Deployment Notes

- Dockerfile and ORISO-Helm tenantservice chart; images built by GitHub Actions (per-image build cache scope, pre-dev branch mirror pipeline, release-image workflow for release branches).
- Liquibase only runs where SPRING_LIQUIBASE_ENABLED=true is set for the deployment; contexts default to prod.

## Risks and Gaps

- README.md still says "Java 17 Spring Boot 3" while pom.xml is Spring Boot 4.0.1 / Java 21 — stale doc.
- spring.liquibase.enabled defaults to false: a fresh environment without SPRING_LIQUIBASE_ENABLED=true silently skips migrations 0013-0027 and then fails at runtime with unknown columns/tables.
- DPA services (TenantDpaService, TenantDpaStatusService, GoverningDpaResolver) take raw tenant ids by design; the IDOR guard lives solely in TenantDpaFacade/TenantFacadeAuthorisationService. Any new endpoint wiring these services directly would expose signer PII.
- Per-tenant machine-translation API keys are stored in TenantAdminControlsSettings (DB JSON); they are masked in responses/logs via ApiKeyMasker but rest unencrypted in the tenant database.
- Tenant media is stored as MariaDB blobs (2 MB cap per object, no quota per tenant found) — DB growth is unbounded by count.
- Branding assets are validated as URLs / allowlisted image data URLs (no SVG); legal-content HTML sanitization and the Admin editor allowlist must stay aligned or tenant logos/legal anchors regress again (this exact regression happened once).
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Which environments currently set SPRING_LIQUIBASE_ENABLED=true (pre-dev vs dev vs prod) and which still apply schema exports manually.
- Whether the operator DPA tenant (`app.dpa.operator-tenant-id`, default 1) is correctly configured per environment.
- Exact API gateway/ingress path prefixes for the new /tenantadmin/tenant-ids, /tenantadmin/{id}/dpa, /tenantadmin/media and /media paths.
- Whether legacy per-tenant DPA authoring (tenants with their own published DPA measured against themselves) is scheduled for retirement — GoverningDpaResolver keeps it deliberately additive pending a product decision.
