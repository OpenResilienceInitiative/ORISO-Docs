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

Prüfe den [öffentlichen HTTPS-Issuer](/de/betrieb/deployment/configure-keycloak) und gleiche Realm, Client, Redirect-URI, Backend-Issuer und Rollenzuordnung mit der gewählten Bereitstellung ab. Halte Tokens und Cookies aus Diagnoseprotokollen heraus.

## API-Routing-Probleme

Gleiche die Laufzeit-API-URLs von Frontend und Admin mit dem Ingress im [gewählten Helm-Release](/de/plattform/core-systems/kubernetes-deployment) und den OpenAPI-Pfaden des zuständigen Dienstes ab. Prüfe den öffentlichen Hostnamen und die `/service`-Routen der betroffenen Bereitstellung.

## Datenbankprobleme

Prüfe den gerenderten Datenbank-Service und die effektiven Verbindungseinstellungen der Anwendung. Der [Leitfaden zur Datenbankeinrichtung](/de/betrieb/deployment/setup-databases) nennt das zuständige Changelog. Gleiche die erwarteten Changesets mit der Migrationshistorie der Bereitstellung ab.

## Mandantenprobleme

Prüfe die Admin-API-Clients für Mandanten, TenantController/TenantResolverService in TenantService, das Schema tenantservice.tenant und die Annahmen zum Mandanten-Claim in Keycloak.

## Kubernetes-Probleme

Prüfe die Chart-Werte für Image-Tags, Pull-Richtlinien, Ressourcen, Probes, sensible Werte, hostNetwork, Namespace und die Namen der Ingress-Backend-Services.
