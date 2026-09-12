---
title: Tenant Lifecycle
description: Enriched tenant lifecycle across Admin, TenantService, Keycloak, database and dependent services.
---
- [Repository map](/plattform/flows-und-reference/repository-map)
- [Architecture](/plattform/start-here/architecture)
- [Authentication and Keycloak](/plattform/core-systems/authentication-and-keycloak)
- [Database and data model](/plattform/core-systems/database-and-data-model)
- [Kubernetes deployment](/plattform/core-systems/kubernetes-deployment)
- [Frontend/Admin overview](/plattform/core-systems/frontend-admin-overview)
- [Backend services](/plattform/core-systems/backend-services)
- [Tenant lifecycle](/plattform/flows-und-reference/tenant-lifecycle)
- [User management flow](/plattform/archive/user-management-flow)
- [Local development](/plattform/archive/local-development)
- [Onboarding guide](/plattform/archive/onboarding-guide)
- [Troubleshooting](/plattform/flows-und-reference/troubleshooting)
- [Graph validation report](/plattform/archive/graph-validation-report)
- [Diagrams](/plattform/flows-und-reference/diagrams)

Diagram: [tenant-lifecycle.mmd](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/docs/platform/diagrams/tenant-lifecycle.mmd)

## Flow

1. Admin user authenticates through Keycloak.
2. ORISO-Admin tenant pages call TenantService endpoints.
3. TenantService validates role and tenant input.
4. TenantService persists tenant data in tenantservice.tenant.
5. TenantService coordinates dependent application/consulting/user-admin settings through configured clients.
6. Frontend/Admin and backend services resolve tenant context by subdomain, cookie/header, or token depending on service code.

## Source References

Admin tenant UI/API:

- src/api/agency/getAgencyByTenantData.ts
- src/api/consultingtype/getConsultingType4Tenant.ts
- src/api/tenant/addTenantData.ts
- src/api/tenant/deleteTenantData.ts
- src/api/tenant/editFAKETenantData.ts
- src/api/tenant/editTenantData.ts
- src/api/tenant/getFAKETenantData.ts
- src/api/tenant/getFakeMultipleTenants.ts
- src/api/tenant/getPublicTenantData.ts
- src/api/tenant/getSingleTenantData.ts
- src/api/tenant/getTenantData.ts
- src/api/tenant/searchTenantData.ts
- src/api/topic/getTopicByTenantData.ts

TenantService modules:

- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/VersionController.java
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
- src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- src/main/java/com/vi/tenantservice/api/config/CustomSwaggerPathWebMvcConfigurer.java
- src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- src/main/java/com/vi/tenantservice/api/service/ConfigurationFileLoader.java
- src/main/java/com/vi/tenantservice/api/service/httpheader/SecurityHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/HttpUrlUtils.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolver.java
- src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverter.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverterProperties.java
- src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java

Database:

- ORISO-Database/mariadb/tenantservice/schema.sql

## Needs Verification

- Exact tenantId Keycloak claim mapper.
- Whether tenant delete is hard delete, soft delete, or unsupported in the current service implementation.
- Side effects in dependent services during create/update.
