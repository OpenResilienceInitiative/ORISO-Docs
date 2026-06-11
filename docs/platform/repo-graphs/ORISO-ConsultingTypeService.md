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

Consulting type, topic, topic group, application settings, and tenant-aware taxonomy service.

## Main Technologies

- Stack: Spring Boot, Spring Security, Spring Data MongoDB, Spring Data JPA, OpenAPI Generator, Liquibase, Ehcache, MariaDB, MongoDB
- Selected Maven dependencies: org.springframework.cloud:spring-cloud-dependencies, org.springframework.boot:spring-boot-starter-data-jpa, org.springframework.boot:spring-boot-starter-data-mongodb, org.springframework.boot:spring-boot-starter-security, org.springframework.boot:spring-boot-starter-validation, org.springframework.boot:spring-boot-starter-oauth2-resource-server, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-cache, net.sf.ehcache:ehcache, org.springframework.boot:spring-boot-starter-actuator, org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.swagger.core.v3:swagger-annotations, org.springdoc:springdoc-openapi-starter-webmvc-ui, org.keycloak:keycloak-admin-client, org.springframework.boot:spring-boot-starter-test, org.springframework.security:spring-security-test, de.flapdoodle.embed:de.flapdoodle.embed.mongo, net.javacrumbs.json-unit:json-unit-spring, org.liquibase:liquibase-maven-plugin, org.liquibase:liquibase-core, org.springframework.boot:spring-boot-starter-liquibase, org.mariadb.jdbc:mariadb-java-client

## Important Files and Modules

- pom.xml
- api/applicationsettingsservice.yml
- api/consultingtypeadminservice.yml
- api/consultingtypeservice.yml
- api/topicservice.yml
- services/tenantservice.yaml
- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ApplicationSettingsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ConsultingTypeController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicGroupsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/VersionController.java
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
- src/main/java/de/caritas/cob/consultingtypeservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeTenantAwareRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/ApplicationSettingsRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicRepository.java

## Architecture Summary

The service follows an OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes, security/authority mapping, tenant-resolution support where present, and outbound service clients under services/ or apiclient configuration.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/applicationsettingsservice.yml | /settings<br>/settingsadmin |
| api/consultingtypeadminservice.yml | /consultingtypeadmin<br>/consultingtypeadmin/consultingtypes |
| api/consultingtypeservice.yml | /consultingtypes/basic<br>/consultingtypes/{consultingTypeId}/basic<br>/consultingtypes/{consultingTypeId}/extended<br>/consultingtypes/{consultingTypeId}/full<br>/consultingtypes/byslug/{slug}/full<br>/consultingtypes/bytenant/{tenantId}/full<br>/consultingtypes/groups<br>/consultingtypes<br>/consultingtypes/{id} |
| api/topicservice.yml | /topic-groups<br>/topic<br>/topic/{id}<br>/topic/public<br>/topicadmin<br>/topicadmin/{id} |

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ApplicationSettingsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ConsultingTypeController.java
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
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/LogService.java
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
- src/main/java/de/caritas/cob/consultingtypeservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java

Adapters and generated clients:

- src/main/java/de/caritas/cob/consultingtypeservice/api/exception/KeycloakException.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/apiclient/TenantServiceApiClient.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/apiclient/TenantServiceApiControllerFactory.java

## Config and Database

Application config keys inspected:

- logging.level.root
- logging.level.org.springframework.web
- logging.level.org.hibernate
- logging.level.org.hibernate.SQL
- logging.level.org.hibernate.type.descriptor.sql.BasicBinder
- keycloak.auth-server-url
- keycloak.realm
- keycloak.bearer-only
- keycloak.resource
- keycloak.principal-attribute
- keycloak.cors
- keycloak.config.admin-username
- keycloak.config.admin-password
- keycloak.config.admin-client-id
- keycloak.config.app-client-id
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
- spring.data.mongodb.uri
- spring.liquibase.enabled
- server.port
- app.base.url
- multitenancy.enabled
- tenant.service.api.url
- feature.multitenancy.with.single.domain.enabled
- setting.main.tenant.subdomain.for.single.domain.multitenancy
- debug
- consulting.types.json.path
- keycloak.ssl-required
- spring.application.name
- spring.profiles.active
- spring.jpa.hibernate.ddl-auto
- spring.main.allow-bean-definition-overriding
- spring.jpa.open-in-view
- spring.data.jpa.repositories.bootstrap-mode
- spring.jpa.properties.hibernate.ejb.interceptor
- spring.web.locale
- spring.jackson.time-zone
- spring.mustache.enable
- spring.mustache.cache
- spring.mustache.check-template-location
- logging.file.name
- springfox.docuTitle
- springfox.docuDescription
- springfox.docuVersion
- springfox.docuLicense
- springfox.docuLicenseUrl
- springfox.docuPath
- springdoc.swagger-ui.path
- springdoc.api-docs.path
- consulting.types.json.schema.file
- csrf.header.property
- csrf.cookie.property
- cache.tenant.configuration.maxEntriesLocalHeap
- cache.tenant.configuration.eternal
- cache.tenant.configuration.timeToIdleSeconds
- cache.tenant.configuration.timeToLiveSeconds
- cache.groups.configuration.maxEntriesLocalHeap
- cache.groups.configuration.eternal
- cache.groups.configuration.timeToIdleSeconds
- cache.groups.configuration.timeToLiveSeconds
- spring.security.oauth2.resourceserver.jwt.issuer-uri
- management.endpoint.health.enabled
- management.endpoint.health.show-details
- management.endpoints.web.exposure.include
- management.endpoint.health.probes.enabled
- management.tracing.enabled
- management.tracing.sampling.probability
- management.zipkin.tracing.endpoint

Migration/changelog files found:

- src/main/resources/db/changelog/changeset/0001_initsql/initSql.xml
- src/main/resources/db/changelog/changeset/0001_initsql/initTables.sql
- src/main/resources/db/changelog/changeset/0002_topic_internal_identifier/topic_internal_identifier_column.sql
- src/main/resources/db/changelog/changeset/0002_topic_internal_identifier/topic_internal_identifier_column.xml
- src/main/resources/db/changelog/changeset/0003_migrate_topic_to_multilingual_structure/0003-changeSet.xml
- src/main/resources/db/changelog/changeset/0003_migrate_topic_to_multilingual_structure/migrateToMultilingualTopic.sql
- src/main/resources/db/changelog/changeset/0004_topic_groups/0004-changeSet.xml
- src/main/resources/db/changelog/changeset/0004_topic_groups/topicGroups-rollback.sql
- src/main/resources/db/changelog/changeset/0004_topic_groups/topicGroups.sql
- src/main/resources/db/changelog/changeset/0005_topic_fallback_agency_id/topic_fallback_agency_id-rollback.sql
- src/main/resources/db/changelog/changeset/0005_topic_fallback_agency_id/topic_fallback_agency_id.sql
- src/main/resources/db/changelog/changeset/0005_topic_fallback_agency_id/topic_fallback_agency_id.xml
- src/main/resources/db/changelog/changeset/0006_topic_fallback_url/topic_fallback_url-rollback.sql
- src/main/resources/db/changelog/changeset/0006_topic_fallback_url/topic_fallback_url.sql
- src/main/resources/db/changelog/changeset/0006_topic_fallback_url/topic_fallback_url.xml
- src/main/resources/db/changelog/changeset/0007_topic_welcome_message/topic_welcome_message-rollback.sql
- src/main/resources/db/changelog/changeset/0007_topic_welcome_message/topic_welcome_message.sql
- src/main/resources/db/changelog/changeset/0007_topic_welcome_message/topic_welcome_message.xml
- src/main/resources/db/changelog/changeset/0008_topic_send_next_step_message/topic_send_next_step_message-rollback.sql
- src/main/resources/db/changelog/changeset/0008_topic_send_next_step_message/topic_send_next_step_message.sql
- src/main/resources/db/changelog/changeset/0008_topic_send_next_step_message/topic_send_next_step_message.xml
- src/main/resources/db/changelog/changeset/0009_topic_add_titles_and_extend_internal_identifier/0009_topic_add_titles_and_extend_internal_identifier.xml
- src/main/resources/db/changelog/changeset/0009_topic_add_titles_and_extend_internal_identifier/topic_add_titles_and_extend_internal_identifier-rollback.sql
- src/main/resources/db/changelog/changeset/0009_topic_add_titles_and_extend_internal_identifier/topic_add_titles_and_extend_internal_identifier.sql
- src/main/resources/db/changelog/changeset/0010_change_topic_and_topic_groups_to_be_i18n_aware/0010_change_topic_and_topic_groups_to_be_i18n_aware-rollback.sql
- src/main/resources/db/changelog/changeset/0010_change_topic_and_topic_groups_to_be_i18n_aware/0010_change_topic_and_topic_groups_to_be_i18n_aware.sql
- src/main/resources/db/changelog/changeset/0010_change_topic_and_topic_groups_to_be_i18n_aware/0010_change_topic_and_topic_groups_to_be_i18n_aware.xml
- src/main/resources/db/changelog/consultingtypeservice-dev-master.xml
- src/main/resources/db/changelog/consultingtypeservice-local-master.xml
- src/main/resources/db/changelog/consultingtypeservice-prod-master.xml
- src/main/resources/db/changelog/consultingtypeservice-staging-master.xml
- src/main/resources/db/changelog/consultingtypeservice-testing-master.xml
- src/main/resources/liquibase.properties

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. Outbound contracts/configs found:

- services/tenantservice.yaml

## Local Development Notes

- ./mvnw spring-boot:run with a local profile
- Requires MongoDB consulting/application collections, MariaDB consultingtypeservice schema, Keycloak, and TenantService URL.

## Deployment Notes

- Dockerfile and ORISO-Kubernetes helm/charts/consultingtypeservice.

## Risks and Gaps

- Verify that runtime database schemas match ORISO-Database exports; service repos still include Liquibase/changelog references but platform docs indicate schemas are centrally managed.
- Config files contain environment-specific Keycloak, peer-service, cache, Matrix/Rocket.Chat, and database settings. Do not hardcode those in source.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Exact active Spring profile and whether Liquibase is disabled in the target environment.
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Current Matrix vs Rocket.Chat operational boundary where both references exist.
