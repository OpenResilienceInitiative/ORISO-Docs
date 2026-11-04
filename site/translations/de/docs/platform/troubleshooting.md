---
title: "ORISO-Fehlersuche"
description: "Praktische Wege zur Fehlersuche anhand einer erweiterten Prüfung von Quellcode und Konfiguration."
---

# ORISO-Fehlersuche
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

## Anmelde- und Berechtigungsprobleme

Prüfe die Realm-/Client-Konfiguration von Keycloak, Token-Cookies und Local Storage im Browser, die Issuer-/JWK-Konfiguration im Backend, Rollenzuordnungen und das Verhalten des Mandanten-Claims.

## API-Routing-Probleme

Prüfe die Laufzeit-API-URL von Frontend/Admin, die Ingress-Host-/Pfadregeln in ORISO-Kubernetes und die OpenAPI-Pfade des Backends. In den untersuchten Ingress-Dateien liegen die API-Hostrouten überwiegend unter api.oriso-dev.site.

## Datenbankprobleme

Prüfe die Schema-Exporte in ORISO-Database, die Datenbankeinträge in application*.properties der Services und die Kubernetes-Werte für Datenbankhost, Passwort und Secret-Verarbeitung. Prüfe das laufende Schema vor einer Änderung des Servicecodes.

## Mandantenprobleme

Prüfe die Admin-API-Clients für Mandanten, TenantController/TenantResolverService in TenantService, das Schema tenantservice.tenant und die Annahmen zum Mandanten-Claim in Keycloak.

## Kubernetes-Probleme

Prüfe die Chart-Werte für Image-Tags, Pull-Richtlinien, Ressourcen, Probes, sensible Werte, hostNetwork, Namespace und die Namen der Ingress-Backend-Services.
