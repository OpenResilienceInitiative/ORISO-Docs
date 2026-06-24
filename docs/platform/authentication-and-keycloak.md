---
title: Authentication and Keycloak
description: Enriched auth flow, Keycloak realm, clients, roles and backend validation notes.
---

# Authentication and Keycloak

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

Diagram: [auth-flow.mmd](./diagrams/auth-flow.mmd)

## Realm

- Realm: online-beratung
- SSL required: external
- Groups: None configured
- Identity providers: None configured

## Clients

| Client | Public | Standard flow | Direct grant | Redirects | Web origins |
| --- | --- | --- | --- | --- | --- |
| account | true | true | false | 1 | 0 |
| account-console | true | true | false | 1 | 0 |
| admin-cli | true | false | true | 0 | 0 |
| app | true | true | true | 3 | 2 |
| broker | false | true | false | 0 | 0 |
| realm-management | false | true | false | 0 | 0 |
| security-admin-console | true | true | false | 1 | 1 |

## Roles

- TECHNICAL_DEFAULT
- USER_ADMIN
- agency-admin
- consultant
- default-roles-online-beratung
- offline_access
- single-tenant-admin
- technical
- tenant-admin
- topic-admin
- uma_authorization
- user
- user-admin

## Browser Token Flow

Frontend and Admin store Keycloak access/refresh tokens through auth/session-cookie helpers and attach bearer tokens in fetch wrappers:

- ORISO-Frontend/src/components/auth/auth.ts
- ORISO-Frontend/src/components/sessionCookie/refreshKeycloakAccessToken.ts
- ORISO-Frontend/src/api/fetchData.ts
- ORISO-Admin/src/api/auth/auth.ts
- ORISO-Admin/src/api/auth/refreshKeycloakAccessToken.ts
- ORISO-Admin/src/api/fetchData.ts
- ORISO-Admin/src/router/ProtectedRoute.tsx

## Backend Validation

Backend security/config references:

- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakCustomConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/interceptor/HttpTenantFilter.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantAdminService.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantService.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/CsrfSecurityProperties.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/GlobalMethodSecurityConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/auth/Authority.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/auth/IdentityConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/auth/RoleAuthorizationAuthorityMapper.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/auth/SecurityConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/config/auth/TechnicalUserConfig.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/service/httpheader/SecurityHeaderSupplier.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/AccessTokenTenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/CustomHeaderTenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/SubdomainTenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TechnicalOrSuperAdminUserTenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantAspect.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantContext.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantContextProvider.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantData.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantResolver.java
- ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/tenant/TenantResolverService.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/SubdomainTenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TechnicalUserTenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantAspect.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContext.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContextProvider.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolver.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/config/AuthenticatedUserConfig.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/config/SecurityConfig.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverter.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverterProperties.java
- ORISO-AgencyService/src/main/java/de/caritas/cob/agencyservice/filter/HttpTenantFilter.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/auth/Authority.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/service/securityheader/SecurityHeaderSupplier.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantAspect.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantContext.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantResolver.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/config/KeycloakConfig.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/config/SecurityConfig.java
- ORISO-ConsultingTypeService/src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/config/CustomSwaggerPathWebMvcConfigurer.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/service/ConfigurationFileLoader.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/service/httpheader/SecurityHeaderSupplier.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/HttpUrlUtils.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/TenantResolver.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/config/security/AuthorisationService.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/config/security/JwtAuthConverter.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/config/security/JwtAuthConverterProperties.java
- ORISO-TenantService/src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java

## Security Concerns

- Direct grant is enabled on the app client in realm.json.
- No groups or identity providers are configured in the inspected realm export.
- Tenant claim generation needs verification.
- Keycloak host/issuer must match browser-visible and backend-visible URLs.
- Secret and admin credential handling must be externalized for production.
