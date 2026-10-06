---
title: "Mandantenlebenszyklus"
description: "Erweiterte Beschreibung des Mandantenlebenszyklus über Admin, TenantService, Keycloak, Datenbank und abhängige Services hinweg."
source: "docs/platform/tenant-lifecycle.md"
---

- [Repository-Übersicht](/de/plattform/flows-und-reference/repository-map)
- [Architektur](/de/plattform/start-here/architecture)
- [Authentifizierung und Keycloak](/de/plattform/core-systems/authentication-and-keycloak)
- [Datenbank und Datenmodell](/de/plattform/core-systems/database-and-data-model)
- [Kubernetes-Deployment](/de/plattform/core-systems/kubernetes-deployment)
- [Frontend-/Admin-Überblick](/de/plattform/core-systems/frontend-admin-overview)
- [Backend-Services](/de/plattform/core-systems/backend-services)
- [Mandantenlebenszyklus](/de/plattform/flows-und-reference/tenant-lifecycle)
- [Ablauf der Benutzerverwaltung](/de/plattform/archive/user-management-flow)
- [Lokale Entwicklung](/de/plattform/platform-flows/local-development)
- [Einstiegsleitfaden](/de/plattform/archive/onboarding-guide)
- [Fehlersuche](/de/plattform/flows-und-reference/troubleshooting)
- [Bericht zur Graph-Prüfung](/de/plattform/archive/graph-validation-report)
- [Diagramme](/de/plattform/flows-und-reference/diagrams)

Diagramm: [tenant-lifecycle.mmd](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/docs/platform/diagrams/tenant-lifecycle.mmd)

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
