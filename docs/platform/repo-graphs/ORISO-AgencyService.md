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

Agency catalog and administration service for public agency lookup, agency admin, postcode ranges, tenant-aware agency data, topic enrichment, and Matrix agency provisioning.

## Main Technologies

- Stack: Spring Boot, Spring Security OAuth2 Resource Server, Spring Data JPA, OpenAPI Generator, Liquibase, Ehcache, MariaDB
- Selected Maven dependencies: org.springframework.boot:spring-boot-starter-data-jpa, org.springframework.boot:spring-boot-starter-security, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-cache, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-validation, org.springframework.boot:spring-boot-starter-oauth2-resource-server, org.springframework.boot:spring-boot-starter-freemarker, org.springframework.boot:spring-boot-starter-actuator, org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.swagger.core.v3:swagger-annotations, org.springdoc:springdoc-openapi-starter-webmvc-ui, org.keycloak:keycloak-admin-client, org.liquibase:liquibase-maven-plugin, org.liquibase:liquibase-core, org.springframework.boot:spring-boot-starter-liquibase, net.sf.ehcache:ehcache, org.mariadb.jdbc:mariadb-java-client, org.springframework.boot:spring-boot-starter-test, org.springframework.security:spring-security-test, com.c4-soft.springaddons:spring-security-oauth2-test-webmvc-addons

## Important Files and Modules

- pom.xml
- api/agencyadminservice.yaml
- api/agencyservice.yaml
- services/applicationsettingsservice.yml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml
- services/useradminservice.yaml
- src/main/java/de/caritas/cob/agencyservice/api/admin/controller/AgencyAdminController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/AgencyController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/CustomSwaggerUIController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/VersionController.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TechnicalUserTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContextProvider.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- src/main/java/de/caritas/cob/agencyservice/config/AppConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/AuthenticatedUserConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/agencyservice/config/CustomSwaggerUIPathWebMvcConfigurer.java
- src/main/java/de/caritas/cob/agencyservice/config/FreeMarkerConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantAwareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantUnawareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencypostcoderange/AgencyPostcodeRangeRepository.java

## Architecture Summary

The service follows an OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes, security/authority mapping, tenant-resolution support where present, and outbound service clients under services/ or apiclient configuration.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/agencyadminservice.yaml | /agencyadmin<br>/agencyadmin/agencies<br>/agencyadmin/agencies/{agencyId}<br>/agencyadmin/agencies/tenant/{tenantId}<br>/agencyadmin/agencies/{agencyId}/changetype<br>/agencyadmin/postcoderanges/{agencyId} |
| api/agencyservice.yaml | /agencies<br>/agencies/by-tenant<br>/agencies/topics<br>/agencies/{agencyIds}<br>/agencies/consultingtype/{consultingTypeId} |

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
- src/main/java/de/caritas/cob/agencyservice/api/admin/service/agencypostcoderange/AgencyPostcodeRangeAdminService.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/AgencyDataProtectionValidationService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/AgencyService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/ApplicationSettingsService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/AppointmentService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/CentralDataProtectionTemplateService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/ConsultingTypeService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/LogService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TenantService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TopicEnrichmentService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/TopicService.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixProvisioningService.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- src/main/java/de/caritas/cob/agencyservice/api/workflow/DeleteAgencyService.java
- src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java

Repositories:

- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantAwareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantUnawareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencypostcoderange/AgencyPostcodeRangeRepository.java

Entities/models:

- src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/model/ValidateAgencyDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/model/AgencyMatrixCredentialsDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/DataProtectionResponsibleEntity.java

Security, tenant, and config modules:

- src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TechnicalUserTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContextProvider.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- src/main/java/de/caritas/cob/agencyservice/config/AppConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/AuthenticatedUserConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/agencyservice/config/CustomSwaggerUIPathWebMvcConfigurer.java
- src/main/java/de/caritas/cob/agencyservice/config/FreeMarkerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SpringFoxConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverter.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverterProperties.java
- src/main/java/de/caritas/cob/agencyservice/filter/HttpTenantFilter.java

Adapters and generated clients:

- src/main/java/de/caritas/cob/agencyservice/api/exception/KeycloakException.java
- src/main/java/de/caritas/cob/agencyservice/api/model/AgencyMatrixCredentialsDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixProvisioningService.java
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

Application config keys inspected:

- server.port
- logging.level.root
- logging.level.org.springframework.web
- logging.level.org.hibernate
- logging.level.org.springframework.web.servlet.mvc.method.annotation
- keycloak.auth-server-url
- keycloak.realm
- keycloak.bearer-only
- keycloak.resource
- keycloak.principal-attribute
- keycloak.cors
- keycloak.use-resource-role-mappings
- keycloak.config.admin-username
- keycloak.config.admin-password
- keycloak.config.admin-client-id
- keycloak.config.app-client-id
- spring.security.oauth2.resourceserver.jwt.issuer-uri
- spring.security.oauth2.resourceserver.jwt.jwk-set-uri
- spring.datasource.url
- spring.datasource.username
- spring.datasource.password
- spring.datasource.driver-class-name
- spring.datasource.hikari.maximum-pool-size
- spring.datasource.hikari.minimum-idle
- spring.datasource.hikari.idle-timeout
- spring.datasource.hikari.maxLifetime
- spring.jpa.properties.hibernate.dialect
- spring.jpa.show-sql
- spring.jpa.properties.hibernate.format_sql
- spring.jpa.hibernate.ddl-auto
- spring.liquibase.enabled
- app.base.url
- multitenancy.enabled
- tenant.service.api.url
- matrix.api-url
- matrix.registration-shared-secret
- matrix.server-name
- matrix.admin-username
- matrix.admin-password
- appointments.delete-job-cron
- appointments.delete-job-enabled
- appointments.lifespan-in-hours
- feature.topics.enabled
- feature.demographics.enabled
- feature.appointment.enabled
- feature.multitenancy.with.single.domain.enabled
- agency.deleteworkflow.cron
- rocket-chat.base-url
- rocket-chat.mongo-url
- rocket.technical.username
- rocket.technical.password
- rocket-chat.credential-cron
- user.admin.service.api.url
- cache.consulting.type.configuration.maxEntriesLocalHeap
- cache.consulting.type.configuration.eternal
- cache.consulting.type.configuration.timeToIdleSeconds
- cache.consulting.type.configuration.timeToLiveSeconds
- cache.tenant.configuration.maxEntriesLocalHeap
- cache.tenant.configuration.eternal
- cache.tenant.configuration.timeToIdleSeconds
- cache.tenant.configuration.timeToLiveSeconds
- cache.topic.configuration.maxEntriesLocalHeap
- cache.topic.configuration.eternal
- cache.topic.configuration.timeToIdleSeconds
- cache.topic.configuration.timeToLiveSeconds
- cache.applicationsettings.configuration.maxEntriesLocalHeap
- cache.applicationsettings.configuration.eternal
- cache.applicationsettings.configuration.timeToIdleSeconds
- cache.applicationsettings.configuration.timeToLiveSeconds
- keycloak.ssl-required
- spring.application.name
- spring.profiles.active
- spring.main.allow-bean-definition-overriding
- spring.jpa.open-in-view
- spring.data.jpa.repositories.bootstrap-mode
- spring.main.banner-mode
- spring.autoconfigure.exclude
- server.host
- registration.cors.allowed.origins
- registration.cors.allowed.paths

Migration/changelog files found:

- src/main/resources/db/changelog/agencyservice-dev-master.xml
- src/main/resources/db/changelog/agencyservice-local-master.xml
- src/main/resources/db/changelog/agencyservice-prod-master.xml
- src/main/resources/db/changelog/agencyservice-staging-master.xml
- src/main/resources/db/changelog/agencyservice-testing-master.xml
- src/main/resources/db/changelog/changeset/0001_initsql/initSql.xml
- src/main/resources/db/changelog/changeset/0001_initsql/initTables.sql
- src/main/resources/db/changelog/changeset/0001_initsql/initTrigger.sql
- src/main/resources/db/changelog/changeset/0002_agency_id_old_null/0002_changeSet.xml
- src/main/resources/db/changelog/changeset/0002_agency_id_old_null/agenyIdOldNull-rollback.sql
- src/main/resources/db/changelog/changeset/0002_agency_id_old_null/agenyIdOldNull.sql
- src/main/resources/db/changelog/changeset/0003_agency_consulting_type/0003_changeSet.xml
- src/main/resources/db/changelog/changeset/0003_agency_consulting_type/agencyConsultingType-rollback.sql
- src/main/resources/db/changelog/changeset/0003_agency_consulting_type/agencyConsultingType.sql
- src/main/resources/db/changelog/changeset/0004_agency_offline/0004_changeSet.xml
- src/main/resources/db/changelog/changeset/0004_agency_offline/agencyOffline-rollback.sql
- src/main/resources/db/changelog/changeset/0004_agency_offline/agencyOffline.sql
- src/main/resources/db/changelog/changeset/0005_agency_delete_flag/0005_changeSet.xml
- src/main/resources/db/changelog/changeset/0005_agency_delete_flag/agencyDeleteFlag-rollback.sql
- src/main/resources/db/changelog/changeset/0005_agency_delete_flag/agencyDeleteFlag.sql
- src/main/resources/db/changelog/changeset/0006_agency_url_and_external_flag/0006_changeSet.xml
- src/main/resources/db/changelog/changeset/0006_agency_url_and_external_flag/agencyUrlAndExternalFlag-rollback.sql
- src/main/resources/db/changelog/changeset/0006_agency_url_and_external_flag/agencyUrlAndExternalFlag.sql
- src/main/resources/db/changelog/changeset/0007_tenant_id/0007_changeSet.xml
- src/main/resources/db/changelog/changeset/0007_tenant_id/tenant_id-rollback.sql
- src/main/resources/db/changelog/changeset/0007_tenant_id/tenant_id.sql
- src/main/resources/db/changelog/changeset/0008_tenant_id_remove/0008_changeSet.xml
- src/main/resources/db/changelog/changeset/0008_tenant_id_remove/tenant_id.sql
- src/main/resources/db/changelog/changeset/0009_agency_topic/0009_changeSet.xml
- src/main/resources/db/changelog/changeset/0009_agency_topic/agencyTopic-rollback.sql
- src/main/resources/db/changelog/changeset/0009_agency_topic/agencyTopic.sql
- src/main/resources/db/changelog/changeset/0009_agency_topic/agencyTopicTrigger-rollback.sql
- src/main/resources/db/changelog/changeset/0009_agency_topic/agencyTopicTrigger.sql
- src/main/resources/db/changelog/changeset/0010_agency_demographics/0010_changeSet.xml
- src/main/resources/db/changelog/changeset/0010_agency_demographics/agencyDemographics-rollback.sql
- src/main/resources/db/changelog/changeset/0010_agency_demographics/agencyDemographics.sql
- src/main/resources/db/changelog/changeset/0011_agency_demographics_gender_column_change/0011_changeSet.xml
- src/main/resources/db/changelog/changeset/0011_agency_demographics_gender_column_change/genderColumn-rename-rollback.sql
- src/main/resources/db/changelog/changeset/0011_agency_demographics_gender_column_change/genderColumn-rename.sql
- src/main/resources/db/changelog/changeset/0012_agency_counseling_relations/0012_changeSet.xml
- src/main/resources/db/changelog/changeset/0012_agency_counseling_relations/agencyCounselingRelations-rollback.sql
- src/main/resources/db/changelog/changeset/0012_agency_counseling_relations/agencyCounselingRelations.sql
- src/main/resources/db/changelog/changeset/0013_make_diocese_nullable/0013_changeSet.xml
- src/main/resources/db/changelog/changeset/0013_make_diocese_nullable/makeDioceseNullable-rollback.sql
- src/main/resources/db/changelog/changeset/0013_make_diocese_nullable/makeDioceseNullable.sql
- src/main/resources/db/changelog/changeset/0014_drop_diocese/0014_changeSet.xml
- src/main/resources/db/changelog/changeset/0014_drop_diocese/dropDiocese-rollback.sql
- src/main/resources/db/changelog/changeset/0014_drop_diocese/dropDiocese.sql
- src/main/resources/db/changelog/changeset/0015_change_consultingtype_column_type/0015_changeSet.xml
- src/main/resources/db/changelog/changeset/0015_change_consultingtype_column_type/changeConsultingtypeColumnType-rollback.sql
- src/main/resources/db/changelog/changeset/0015_change_consultingtype_column_type/changeConsultingtypeColumnType.sql
- src/main/resources/db/changelog/changeset/0016_add_data_protection_attributes/0016_changeSet.xml
- src/main/resources/db/changelog/changeset/0016_add_data_protection_attributes/addDataProtectionAttributes-rollback.sql
- src/main/resources/db/changelog/changeset/0016_add_data_protection_attributes/addDataProtectionAttributes.sql
- src/main/resources/db/changelog/changeset/0017_add_agency_logo/0017_changeSet.xml
- src/main/resources/db/changelog/changeset/0017_add_agency_logo/addAgencyLogo-rollback.sql
- src/main/resources/db/changelog/changeset/0017_add_agency_logo/addAgencyLogo.sql
- src/main/resources/db/changelog/changeset/0018_agency_matrix_credentials/0018_changeSet.xml
- src/main/resources/liquibase.properties

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. Outbound contracts/configs found:

- services/applicationsettingsservice.yml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml
- services/useradminservice.yaml

## Local Development Notes

- ./mvnw spring-boot:run with a local profile
- Requires MariaDB agencyservice schema, Keycloak, TenantService, ConsultingType/Topic/ApplicationSettings/UserAdmin peer APIs as configured.

## Deployment Notes

- Dockerfile and ORISO-Kubernetes helm/charts/agencyservice.

## Risks and Gaps

- Verify that runtime database schemas match ORISO-Database exports; service repos still include Liquibase/changelog references but platform docs indicate schemas are centrally managed.
- Config files contain environment-specific Keycloak, peer-service, cache, Matrix/Rocket.Chat, and database settings. Do not hardcode those in source.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Exact active Spring profile and whether Liquibase is disabled in the target environment.
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Current Matrix vs Rocket.Chat operational boundary where both references exist.
