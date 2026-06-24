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

Tenant registry, tenant settings, legal content, tenant resolution, subdomain/cookie/token tenant discovery, and tenant-dependent peer-service setup.

## Main Technologies

- Stack: Spring Boot 3, Spring Security OAuth2 Resource Server, Keycloak, Spring Data JPA, OpenAPI Generator, FreeMarker, Ehcache, MariaDB
- Selected Maven dependencies: org.springframework.cloud:spring-cloud-dependencies, org.springframework.security:spring-security-web, org.springframework.security:spring-security-config, org.springframework.security:spring-security-core, org.springframework.boot:spring-boot-starter-cache, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-oauth2-resource-server, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-actuator, org.springframework.boot:spring-boot-actuator-autoconfigure, org.springframework.boot:spring-boot-starter-data-jpa, org.liquibase:liquibase-maven-plugin, org.liquibase:liquibase-core, org.mariadb.jdbc:mariadb-java-client, org.springframework.boot:spring-boot-starter-freemarker, org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.swagger.core.v3:swagger-annotations, io.springfox:springfox-boot-starter, io.swagger.parser.v3:swagger-parser, org.springdoc:springdoc-openapi-starter-webmvc-ui, org.keycloak:keycloak-spring-boot-starter, org.springframework.boot:spring-boot-starter-test, org.springframework.security:spring-security-test, com.c4-soft.springaddons:spring-security-oauth2-test-webmvc-addons, org.ehcache:ehcache, org.springframework.boot:spring-boot-properties-migrator

## Important Files and Modules

- pom.xml
- api/tenantservice.yaml
- services/agencyadminservice.yaml
- services/applicationsettingsservice.yml
- services/consultingtypeservice.yaml
- services/useradminservice.yaml
- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/VersionController.java
- src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- src/main/java/com/vi/tenantservice/api/config/CustomSwaggerPathWebMvcConfigurer.java
- src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- src/main/java/com/vi/tenantservice/api/service/ConfigurationFileLoader.java
- src/main/java/com/vi/tenantservice/api/service/httpheader/SecurityHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/HttpUrlUtils.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- src/main/java/com/vi/tenantservice/api/repository/TenantRepository.java

## Architecture Summary

The service follows an OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes, security/authority mapping, tenant-resolution support where present, and outbound service clients under services/ or apiclient configuration.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/tenantservice.yaml | /tenantadmin<br>/tenantadmin/search<br>/tenantadmin/{id}<br>/tenant<br>/tenant/{id}<br>/tenant/public/{subdomain}<br>/tenant/public/id/{tenantId}<br>/tenant/public/single<br>/tenant/public/<br>/tenant/access |

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/VersionController.java

Services:

- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeChangeDetectionService.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeDependentSettingsOverrideService.java
- src/main/java/com/vi/tenantservice/api/service/SingleDomainTenantOverrideService.java
- src/main/java/com/vi/tenantservice/api/service/TemplateService.java
- src/main/java/com/vi/tenantservice/api/service/TenantService.java
- src/main/java/com/vi/tenantservice/api/service/TranslationService.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/ApplicationSettingsService.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/ConsultingTypeService.java
- src/main/java/com/vi/tenantservice/api/service/consultingtype/UserAdminService.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/security/AuthorisationService.java

Repositories:

- src/main/java/com/vi/tenantservice/api/repository/TenantRepository.java

Entities/models:

- src/main/java/com/vi/tenantservice/api/model/DataProtectionPlaceHolderType.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminAllowedPermissionTogglesSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminControlsSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantContent.java
- src/main/java/com/vi/tenantservice/api/model/TenantEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantSetting.java
- src/main/java/com/vi/tenantservice/api/model/TenantSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantSmtpSettings.java

Security, tenant, and config modules:

- src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- src/main/java/com/vi/tenantservice/api/config/CustomSwaggerPathWebMvcConfigurer.java
- src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- src/main/java/com/vi/tenantservice/api/service/ConfigurationFileLoader.java
- src/main/java/com/vi/tenantservice/api/service/httpheader/SecurityHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/HttpUrlUtils.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- src/main/java/com/vi/tenantservice/config/security/AuthorisationService.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverter.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverterProperties.java
- src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java

Adapters and generated clients:

- src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiClient.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/ApplicationSettingsApiControllerFactory.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/ConsultingTypeServiceApiControllerFactory.java
- src/main/java/com/vi/tenantservice/api/config/apiclient/UserAdminServiceApiControllerFactory.java
- src/main/java/com/vi/tenantservice/config/security/KeycloakLogoutHandler.java

## Config and Database

Application config keys inspected:

- logging.level.root
- logging.level.org.springframework.web
- logging.level.org.springframework.security
- logging.level.org.hibernate
- logging.level.org.hibernate.SQL
- logging.level.org.hibernate.type.descriptor.sql.BasicBinder
- logging.level.org.keycloak.adapters
- keycloak.auth-server-url
- keycloak.realm
- keycloak.bearer-only
- spring.security.oauth2.resourceserver.jwt.issuer-uri
- spring.security.oauth2.resourceserver.jwt.jwk-set-uri
- spring.datasource.url
- spring.datasource.username
- spring.datasource.password
- spring.liquibase.enabled
- spring.jpa.show-sql
- spring.jpa.properties.hibernate.format_sql
- server.port
- feature.multitenancy.with.single.domain.enabled
- keycloak.ssl-required
- spring.application.name
- logging.level.com.vi.tenantservice
- logging.level.org.springframework.web.servlet.DispatcherServlet
- spring.main.allow-bean-definition-overriding
- keycloak.disable-trust-manager
- keycloak.resource
- keycloak.principal-attribute
- keycloak.cors
- app.base.url
- springfox.docuTitle
- springfox.docuDescription
- springfox.docuVersion
- springfox.docuTermsUrl
- springfox.docuContactName
- springfox.docuContactUrl
- springfox.docuContactEmail
- springfox.docuLicense
- springfox.docuLicenseUrl
- springfox.docuPath
- springfox.documentation.swagger.v2.path
- spring.datasource.driver-class-name
- spring.datasource.hikari.maximum-pool-size
- spring.datasource.hikari.minimum-idle
- spring.datasource.hikari.idle-timeout
- spring.datasource.hikari.maxLifetime
- spring.jpa.properties.hibernate.dialect
- consulting.type.service.api.url
- csrf.header.property
- csrf.cookie.property
- csrf.whitelist.adminUris
- default.consulting.types.json.path
- default.tenant.settings.json.path
- user.service.api.url
- management.endpoint.health.enabled
- management.endpoint.health.show-details
- management.endpoints.web.exposure.include
- management.endpoint.health.probes.enabled
- spring.cache.jcache.config
- spring.mvc.pathmatch.matching-strategy
- org.springframework.web.servlet.mvc.method.annotation
- template.use.custom.resources.path
- template.custom.resources.path
- logging.pattern.level
- spring.root.level

Migration/changelog files found:

- src/main/resources/db/changelog/changeset/0001_initsql/initSql.xml
- src/main/resources/db/changelog/changeset/0001_initsql/initTables.sql
- src/main/resources/db/changelog/changeset/0002_add_privacy_and_terms_and_conditions/0002-changeSet.xml
- src/main/resources/db/changelog/changeset/0002_add_privacy_and_terms_and_conditions/addPrivacyAndTermsAndConditionsColumns.sql
- src/main/resources/db/changelog/changeset/0003_change_tenant_attributes/0003-changeSet.xml
- src/main/resources/db/changelog/changeset/0003_change_tenant_attributes/changeTenantAttributes.sql
- src/main/resources/db/changelog/changeset/0004_add_tenant_settings/0004-changeSet.xml
- src/main/resources/db/changelog/changeset/0004_add_tenant_settings/addSettingTopicsInRegistrationEnabled.sql
- src/main/resources/db/changelog/changeset/0005_change_tenant_settings_structure/0005-changeSet.xml
- src/main/resources/db/changelog/changeset/0005_change_tenant_settings_structure/migrateToGeneralSettings.sql
- src/main/resources/db/changelog/changeset/0006_migrate_content_to_multilingual_structure/0006-changeSet.xml
- src/main/resources/db/changelog/changeset/0006_migrate_content_to_multilingual_structure/migrateToMultilingualContent.sql
- src/main/resources/db/changelog/changeset/0007_content_activation_dates/0007-changeSet.xml
- src/main/resources/db/changelog/changeset/0007_content_activation_dates/contentActivationDates.sql
- src/main/resources/db/changelog/changeset/0008_drop_unique_constraint_for_subdomain/0008-changeSet.xml
- src/main/resources/db/changelog/changeset/0008_drop_unique_constraint_for_subdomain/dropUniqueConstraintForSubdomain.sql
- src/main/resources/db/changelog/changeset/0009_fix_sequence_start_value/0009-fixSequenceStartValue.xml
- src/main/resources/db/changelog/changeset/0009_fix_sequence_start_value/fixSequenceStartValue.sql
- src/main/resources/db/changelog/changeset/0010_add_association_logo/0010-addAssociationLogo.xml
- src/main/resources/db/changelog/changeset/0010_add_association_logo/addAssociationLogo.sql
- src/main/resources/db/changelog/changeset/0010_tenant_id_default_value/tenantIdDefaultValue.sql
- src/main/resources/db/changelog/changeset/0010_tenant_id_default_value/tenantIdDefaultValue.xml
- src/main/resources/db/changelog/changeset/0011_tenant_add_is_video_call_allowed/tenantAddIsVideoCallAllowed-rollback.sql
- src/main/resources/db/changelog/changeset/0011_tenant_add_is_video_call_allowed/tenantAddIsVideoCallAllowed.sql
- src/main/resources/db/changelog/changeset/0011_tenant_add_is_video_call_allowed/tenantAddIsVideoCallAllowed.xml
- src/main/resources/db/changelog/changeset/0012_tenant_remove_is_video_call_allowed/tenantRemoveIsVideoCallAllowed.sql
- src/main/resources/db/changelog/changeset/0012_tenant_remove_is_video_call_allowed/tenantRemoveIsVideoCallAllowed.xml
- src/main/resources/db/changelog/tenantservice-dev-master.xml
- src/main/resources/db/changelog/tenantservice-local-master.xml
- src/main/resources/db/changelog/tenantservice-prod-master.xml
- src/main/resources/db/changelog/tenantservice-staging-master.xml
- src/main/resources/db/changelog/tenantservice-testing-master.xml
- src/main/resources/liquibase.properties

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. Outbound contracts/configs found:

- services/agencyadminservice.yaml
- services/applicationsettingsservice.yml
- services/consultingtypeservice.yaml
- services/useradminservice.yaml

## Local Development Notes

- ./mvnw spring-boot:run with a local profile
- Requires MariaDB tenantservice schema, Keycloak, and configured ConsultingType/ApplicationSettings/UserAdmin/AgencyAdmin APIs.

## Deployment Notes

- Dockerfile and ORISO-Kubernetes helm/charts/tenantservice.

## Risks and Gaps

- Verify that runtime database schemas match ORISO-Database exports; service repos still include Liquibase/changelog references but platform docs indicate schemas are centrally managed.
- Config files contain environment-specific Keycloak, peer-service, cache, Matrix/Rocket.Chat, and database settings. Do not hardcode those in source.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Exact active Spring profile and whether Liquibase is disabled in the target environment.
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Current Matrix vs Rocket.Chat operational boundary where both references exist.
