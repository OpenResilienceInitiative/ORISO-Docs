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

Prüfe den [öffentlichen HTTPS-Issuer](/oriso-platform/configure-keycloak) und gleiche Realm, Client, Redirect-URI, Backend-Issuer und Rollenzuordnung mit der gewählten Bereitstellung ab. Halte Tokens und Cookies aus Diagnoseprotokollen heraus.

## API-Routing-Probleme

Gleiche die Laufzeit-API-URLs von Frontend und Admin mit dem Ingress im [gewählten Helm-Release](/docs/platform/kubernetes-deployment) und den OpenAPI-Pfaden des zuständigen Dienstes ab. Prüfe den öffentlichen Hostnamen und die `/service`-Routen der betroffenen Bereitstellung.

## Datenbankprobleme

Prüfe den gerenderten Datenbank-Service und die effektiven Verbindungseinstellungen der Anwendung. Der [Leitfaden zur Datenbankeinrichtung](/oriso-platform/setup-databases) nennt das zuständige Changelog. Gleiche die erwarteten Changesets mit der Migrationshistorie der Bereitstellung ab.

## Mandantenprobleme

Prüfe die Admin-API-Clients für Mandanten, TenantController/TenantResolverService in TenantService, das Schema tenantservice.tenant und die Annahmen zum Mandanten-Claim in Keycloak.

## Kubernetes-Probleme

Prüfe die Chart-Werte für Image-Tags, Pull-Richtlinien, Ressourcen, Probes, sensible Werte, hostNetwork, Namespace und die Namen der Ingress-Backend-Services.
