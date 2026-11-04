---
title: "ORISO-Fehlersuche"
description: "Praktische Wege zur Fehlersuche anhand einer erweiterten Prüfung von Quellcode und Konfiguration."
source: "docs/platform/troubleshooting.md"
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
