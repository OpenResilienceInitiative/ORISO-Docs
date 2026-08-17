---
title: ORISO-AgencyService Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-AgencyService.
---

# ORISO-AgencyService Enriched Graph Summary

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

Agency catalog and administration service: public agency lookup and matching for registration, agency admin lifecycle, postcode ranges, tenant-aware agency data, topic enrichment, department (Fachbereich = agency x topic) legal texts per ADR-003/ADR-014, collision-free agency ID allocation (TEN-INV-U2), effective permission settings applied to the public agency response (ADR-013 P4), and Matrix agency provisioning with encrypted credentials. Rocket.Chat support is fully removed; the service is Matrix-only.

## Main Technologies

- Stack: Spring Boot, Spring Security OAuth2 Resource Server, Spring Data JPA, OpenAPI Generator, Liquibase, Ehcache, MariaDB, Micrometer/OpenTelemetry tracing (OTLP export)
- Selected Maven dependencies: org.springframework.boot:spring-boot-starter-data-jpa, org.springframework.boot:spring-boot-starter-security, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-cache, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-validation, org.springframework.boot:spring-boot-starter-oauth2-resource-server, org.springframework.boot:spring-boot-starter-freemarker, org.springframework.boot:spring-boot-starter-actuator, org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.swagger.core.v3:swagger-annotations, org.springdoc:springdoc-openapi-starter-webmvc-ui, org.keycloak:keycloak-admin-client, org.liquibase:liquibase-core, net.sf.ehcache:ehcache, org.mariadb.jdbc:mariadb-java-client, org.springframework.boot:spring-boot-starter-test, org.springframework.security:spring-security-test

## Important Files and Modules

- pom.xml
- api/agencyadminservice.yaml
- api/agencyservice.yaml
- api/components/agency-settings.yaml
- services/applicationsettingsservice.yml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml
- services/useradminservice.yaml
- src/main/java/de/caritas/cob/agencyservice/api/admin/controller/AgencyAdminController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/AgencyController.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/allocation/AgencyIdAllocationService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/LegalTextAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/LegalContentSanitizer.java
- src/main/java/de/caritas/cob/agencyservice/api/service/DepartmentLegalService.java
- src/main/java/de/caritas/cob/agencyservice/api/converter/AgencyEffectivePermissionSettingsApplier.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/legaltext/LegalText.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencyidreservation/AgencyIdReservation.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencytopic/AgencyTopic.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixProvisioningService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/AgencyMatrixPasswordCipher.java
- src/main/java/de/caritas/cob/agencyservice/api/workflow/DeleteAgencyService.java
- src/main/java/de/caritas/cob/agencyservice/api/workflow/AgencyPurgeTransaction.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java (plus AccessToken/CustomHeader/Subdomain/TechnicalUser resolvers, TenantAspect, TenantContext)
- src/main/java/de/caritas/cob/agencyservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SortParameterBindingConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/TracingConfig.java
- src/main/java/de/caritas/cob/agencyservice/filter/CorrelationIdFilter.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyRepository.java (topic reachability filter)
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantAwareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantUnawareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencypostcoderange/AgencyPostcodeRangeRepository.java

## Architecture Summary

OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes, security/authority mapping, tenant resolution (Hibernate tenant filter via TenantAspect), and outbound service clients under services/ and config/apiclient. Cross-Träger isolation is the default; deliberate escape hatches (tenant-unaware repository, native-SQL assignment checks in agency ID allocation) exist where global uniqueness matters. Effective permission settings are computed server-side so admin controls never leak into the public agency response.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/agencyadminservice.yaml | /agencyadmin<br>/agencyadmin/agencies<br>/agencyadmin/agencies/{agencyId}<br>/agencyadmin/agencies/tenant/{tenantId}<br>/agencyadmin/agencyids/{agencyId}/availability<br>/agencyadmin/agencyids/next-free<br>/agencyadmin/agencyids/reservations<br>/agencyadmin/agencyids/reservations/{agencyId}<br>/agencyadmin/agencies/{agencyId}/changetype<br>/agencyadmin/agencies/{agencyId}/topics/{topicId}/dpp<br>/agencyadmin/agencies/{agencyId}/topics/{topicId}/imprint<br>/agencyadmin/agencies/{agencyId}/topics/{topicId}/legaltext-assignment<br>/agencyadmin/legaltexts<br>/agencyadmin/legaltexts/{legalTextId}<br>/agencyadmin/controls<br>/agencyadmin/postcoderanges/{agencyId} |
| api/agencyservice.yaml | /agencies<br>/agencies/by-tenant<br>/agencies/topics<br>/agencies/{agencyIds}<br>/agencies/{agencyId}/topics/{topicId}/legal<br>/agencies/consultingtype/{consultingTypeId} |

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/de/caritas/cob/agencyservice/api/admin/controller/AgencyAdminController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/AgencyController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/CustomSwaggerUIController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/VersionController.java

Services:

- src/main/java/de/caritas/cob/agencyservice/api/admin/service/AgencyAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/AgencyTopicMergeService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/UserAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agency/AgencyAdminSearchService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agency/AgencyAdminSearchTenantSupportService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agency/AgencyTopicEnrichmentService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agency/AgencySettingsService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agencypostcoderange/AgencyPostcodeRangeAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/allocation/AgencyIdAllocationService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/LegalTextAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/DepartmentDataProtectionService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/DepartmentImprintService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/legal/LegalContentSanitizer.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/AgencyDataProtectionValidationService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/AgencyService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/DepartmentLegalService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/ApplicationSettingsService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/AppointmentService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/CentralDataProtectionTemplateService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/ConsultingTypeService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TenantService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TopicEnrichmentService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TopicService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixProvisioningService.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- src/main/java/de/caritas/cob/agencyservice/api/workflow/DeleteAgencyService.java
- src/main/java/de/caritas/cob/agencyservice/api/workflow/AgencyPurgeTransaction.java
- src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java

Repositories:

- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantAwareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantUnawareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencypostcoderange/AgencyPostcodeRangeRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencytopic/AgencyTopicRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/legaltext/LegalTextRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencyidreservation/AgencyIdReservationRepository.java

Entities/models:

- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/Agency.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencytopic/AgencyTopic.java (department = agency x topic; inline legal content, LegalText references, PublicationStatus)
- src/main/java/de/caritas/cob/agencyservice/api/repository/legaltext/LegalText.java (with LegalTextKind)
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencyidreservation/AgencyIdReservation.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/DataProtectionResponsibleEntity.java
- src/main/java/de/caritas/cob/agencyservice/api/model/AgencyMatrixCredentialsDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/model/ValidateAgencyDTO.java

Security, tenant, and config modules:

- src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/agencyservice/api/converter/AgencyEffectivePermissionSettingsApplier.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/AgencyMatrixPasswordCipher.java
- src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TechnicalUserTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContextProvider.java
- src/main/java/de/caritas/cob/agencyservice/config/AppConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/AuthenticatedUserConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/agencyservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SortParameterBindingConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/TracingConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverter.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverterProperties.java
- src/main/java/de/caritas/cob/agencyservice/filter/HttpTenantFilter.java
- src/main/java/de/caritas/cob/agencyservice/filter/CorrelationIdFilter.java

Adapters and generated clients:

- src/main/java/de/caritas/cob/agencyservice/config/apiclient/ApplicationSettingsApiClient.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/ApplicationSettingsApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/AppointmentServiceAgencyApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/ConsultingTypeServiceApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/TenantServiceApiClient.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/TenantServiceApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/TopicServiceApiClient.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/TopicServiceApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/UserAdminApiClient.java
- src/main/java/de/caritas/cob/agencyservice/config/apiclient/UserAdminServiceApiControllerFactory.java
- src/main/java/de/caritas/cob/agencyservice/config/security/KeycloakLogoutHandler.java

## Config and Database

Notable application config areas (application.properties plus per-env dev/prod/staging/testing overlays):

- Keycloak/OAuth2 resource server (issuer, JWK set, admin client; keycloak.ssl-required is enforced for prod/staging since AS-H05)
- `spring.datasource.*` (MariaDB, Hikari), `spring.jpa.*`
- spring.liquibase.change-log=classpath:db/changelog/agencyservice-master.xml with spring.liquibase.enabled=${SPRING_LIQUIBASE_ENABLED:true}; per-environment changeset selection now runs via spring.liquibase.contexts (env-specific master changelogs were consolidated into one master)
- multitenancy.enabled, feature.topics/demographics/appointment/multitenancy.with.single.domain flags
- matrix.api-url / registration-shared-secret / server-name / admin-username / admin-password (Synapse admin API)
- service.encryption.appkey — AES key for AgencyMatrixPasswordCipher (agency Matrix passwords encrypted at rest, AS-C01)
- management.opentelemetry.tracing.export.otlp.endpoint / management.tracing.export.otlp.enabled (SigNoz/OTLP tracing) plus logback-spring.xml with correlation-id support
- appointments.delete-job-* and agency.deleteworkflow.cron
- registration.cors.allowed.origins/paths, tenant/topic/consultingtype/applicationsettings cache tuning
- All `rocket-chat.*` / `rocket.*` keys are REMOVED (Rocket.Chat retirement, #191)

Database changelog: single master src/main/resources/db/changelog/agencyservice-master.xml with changesets 0001–0028. Additions since July 2026:

- 0019_agency_admin_control, 0020_agency_settings, 0021_agency_topic_legal, 0022_agency_address_contact, 0023_agency_topic_department, 0024_agency_dpo_contact_nullable
- 0025_demo_baseline (demo-baseline agency visibility sync)
- 0026_legal_text (legal_text table, agency_topic legal-text references, backfill from inline content — ADR-014)
- 0027_agency_legal_text (agency-level legal text columns)
- 0028_agency_id_reservation (agency_id_reservation table, PK-arbitrated — TEN-INV-U2)

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend (registration/agency lookup), ORISO-Admin (agency admin, legal texts, ID reservations), and peer backend services (UserService consumes agency data and the internal Matrix credentials endpoint). Outbound contracts/configs found:

- services/applicationsettingsservice.yml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml
- services/useradminservice.yaml

Consumer-driven contract compatibility with UserService (AgencyLinks provider) and the admin OpenAPI spec are gated in CI (tests/contracts, OpenAPI contract gate #187); breaking schema changes (e.g. adding minimum: 1 to agencyId) are treated as provider contract breaks.

## Local Development Notes

- ./mvnw spring-boot:run with a local profile
- Requires MariaDB agencyservice schema, Keycloak, TenantService, ConsultingType/Topic/ApplicationSettings/UserAdmin peer APIs as configured; Matrix/Synapse only needed for provisioning paths.
- Testing profile runs against H2 and honors the Liquibase enablement flag; integration tests rely on committed SQL fixtures (src/test/resources/database).

## Deployment Notes

- Dockerfile with pinned runtime base image; ORISO-Helm chart for agencyservice.
- CI: per-image GHA build cache scoping, Trivy image scanning (fixable HIGH/CRITICAL bumped), Matrix-only image attestation, deterministic integration checks with an honestly-declared test quarantine and deadline, and executed (not just compiled) contract gate tests.
- Liquibase context can be overridden via environment (pre-dev context env override, #233).

## Risks and Gaps

- The Hibernate tenant filter is the primary cross-Träger isolation mechanism; any new native query or tenant-unaware repository use must consciously re-establish isolation (the ID allocation service documents why it bypasses the filter on purpose).
- Legal-text inheritance is partially delivered: department-level assignment and agency-level texts exist, but the tenant-level fallback is future work (ADR-014 / #136).
- Config files reference environment-specific Keycloak, peer-service, cache, Matrix, and database settings. Do not hardcode those in source; service.encryption.appkey must be provisioned or Matrix credential encryption fails closed.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.
- Verify that runtime database schemas match central expectations; Liquibase is now enabled by default but environments may still override SPRING_LIQUIBASE_ENABLED.

## Needs Verification

- Exact active Spring profile and Liquibase context per target environment (pre-dev vs dev vs prod).
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Whether the tenant-level legal-text fallback (ADR-014 #136) has landed anywhere else in the platform or is still open.
- Operational state of OTLP tracing export (endpoint configured per environment vs disabled).
