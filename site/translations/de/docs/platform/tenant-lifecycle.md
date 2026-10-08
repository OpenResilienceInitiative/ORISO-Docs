---
title: "Mandantenlebenszyklus"
description: "Erweiterte Beschreibung des Mandantenlebenszyklus über Admin, TenantService, Keycloak, Datenbank und abhängige Services hinweg."
---

# Mandantenlebenszyklus
- [Repository-Übersicht](./repository-map.md)
- [Architektur](./architecture.md)
- [Authentifizierung und Keycloak](./authentication-and-keycloak.md)
- [Datenbank und Datenmodell](./database-and-data-model.md)
- [Kubernetes-Deployment](./kubernetes-deployment.md)
- [Frontend-/Admin-Überblick](./frontend-admin-overview.md)
- [Backend-Services](./backend-services.md)
- [Mandantenlebenszyklus](./tenant-lifecycle.md)
- [Ablauf der Benutzerverwaltung](./user-management-flow.md)
- [Lokale Entwicklung](./local-development.md)
- [Einstiegsleitfaden](./onboarding-guide.md)
- [Fehlersuche](./troubleshooting.md)
- [Bericht zur Graph-Prüfung](./graph-validation-report.md)
- [Diagramme](./diagrams.md)

Diagramm: [tenant-lifecycle.mmd](./diagrams/tenant-lifecycle.mmd)

## Ablauf

1. Der Admin-Benutzer meldet sich über Keycloak an.
2. Die Mandantenseiten von ORISO-Admin rufen TenantService-Endpunkte auf.
3. TenantService prüft die Rolle und die eingegebenen Mandantendaten.
4. TenantService speichert Mandantendaten in tenantservice.tenant.
5. TenantService koordiniert abhängige Anwendungs-, Beratungs- und Benutzerverwaltungseinstellungen über konfigurierte Clients.
6. Frontend/Admin und Backend-Services ermitteln den Mandantenkontext je nach Servicecode über Subdomain, Cookie/Header oder Token.

## Quellverweise

Admin-Oberfläche und API für Mandanten:

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

TenantService-Module:

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

Datenbank:

- ORISO-Database/mariadb/tenantservice/schema.sql

## Noch zu prüfen

- Die genaue Zuordnung für den Keycloak-Claim tenantId.
- Ob die aktuelle Serviceimplementierung Mandanten endgültig löscht, als gelöscht markiert oder keine Löschung unterstützt.
- Seiteneffekte in abhängigen Services beim Anlegen und Aktualisieren.
