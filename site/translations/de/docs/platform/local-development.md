---
title: "Lokale Entwicklung"
description: "Praktische lokale Startreihenfolge anhand der untersuchten Repository-Abhängigkeiten."
---

# Lokale Entwicklung

> **Aktiver Einstieg in die lokale Entwicklung.** Beginne mit [Lokal installieren und starten](./install-and-run-locally.md), um die unterstützten Werkzeuge und den lokalen Runner zu verwenden. Diese Seite erklärt anschließend Repository-Abhängigkeiten und Startreihenfolge. Die Anleitung ist aus Quellen abgeleitet; prüfe den unterstützten Runner, bevor du eine manuelle Einrichtung verwendest.
- [Repository-Übersicht](./repository-map.md)
- [Architektur](./architecture.md)
- [Authentifizierung und Keycloak](./authentication-and-keycloak.md)
- [Datenbank und Datenmodell](./database-and-data-model.md)
- [Kubernetes-Deployment](/docs/platform/kubernetes-deployment)
- [Frontend-/Admin-Überblick](./frontend-admin-overview.md)
- [Backend-Services](./backend-services.md)
- [Mandantenlebenszyklus](./tenant-lifecycle.md)
- [Ablauf der Benutzerverwaltung](./user-management-flow.md)
- [Lokale Entwicklung](./local-development.md)
- [Einstiegsleitfaden](./onboarding-guide.md)
- [Fehlersuche](./troubleshooting.md)
- [Bericht zur Graph-Prüfung](./graph-validation-report.md)
- [Diagramme](./diagrams.md)

## Startreihenfolge

1. Datenspeicher der gewählten lokalen Umgebung. [Datenbanken einrichten](/oriso-platform/setup-databases)
2. Keycloak mit der Realm-Konfiguration der gewählten lokalen Umgebung. [Keycloak konfigurieren](/oriso-platform/configure-keycloak)
3. TenantService.
4. ConsultingTypeService.
5. AgencyService.
6. UserService.
7. ORISO-Frontend und ORISO-Admin.
8. ORISO-Helm für Tests von Chart, Ingress oder Laufzeitverdrahtung. [Kubernetes-Deployment](/docs/platform/kubernetes-deployment)

## Lokale Hinweise je Repository

### ORISO-Frontend

- npm install
- npm run start oder npm run dev
- Verwende .env oder .env.example für API-, Matrix-, Cookie-, LiveKit- und Rechtstext-URLs.

### ORISO-Admin

- npm install --legacy-peer-deps
- npm run start
- Verwende .env oder .env.example für VITE_API_URL, Keycloak-Realm/-Client, Cookies, Matrix und App-URLs.

### ORISO-UserService

- ./mvnw spring-boot:run mit dem vorgesehenen Spring-Profil
- Benötigt das MariaDB-Schema userservice, Keycloak und konfigurierte URLs anderer Services; je nach Profil außerdem Matrix/Redis/RabbitMQ.

### ORISO-AgencyService

- ./mvnw spring-boot:run mit einem lokalen Profil
- Benötigt das MariaDB-Schema agencyservice, Keycloak, TenantService und die konfigurierten APIs von ConsultingType/Topic/ApplicationSettings/UserAdmin.

### ORISO-ConsultingTypeService

- ./mvnw spring-boot:run mit einem lokalen Profil
- Benötigt MongoDB-Collections für Beratung und Anwendung, das MariaDB-Schema consultingtypeservice, Keycloak und die TenantService-URL.

### ORISO-TenantService

- ./mvnw spring-boot:run mit einem lokalen Profil
- Benötigt das MariaDB-Schema tenantservice, Keycloak und konfigurierte ConsultingType/ApplicationSettings/UserAdmin/AgencyAdmin-APIs.

### Datenspeicher, Keycloak und Helm

- Starte Abhängigkeiten in der vorgesehenen lokalen Umgebung vor Backend und Oberfläche. Die Installationsanleitung beschreibt den unterstützten lokalen Prüfpfad. [Lokal installieren und ausführen](/docs/platform/install-and-run-locally)
- Die Datenbankanleitung benennt die SQL-Initialisierung und die zuständigen Service-Migrationen. [Datenbanken einrichten](/oriso-platform/setup-databases)
- Prüfe für Keycloak die Redirect-URIs und den Issuer der gewählten Umgebung. [Keycloak konfigurieren](/oriso-platform/configure-keycloak)
- Verwende für Tests der Kubernetes-Konfiguration das aktuelle Chart in ORISO-Helm. [Kubernetes-Deployment](/docs/platform/kubernetes-deployment)

## Regel

Starte zuerst den kleinsten sinnvollen Teil lokal. Verwende Kubernetes, wenn das Verhalten von Service und Oberfläche bereits klar ist oder der Fehler ausdrücklich Ingress, DNS, Werte, Secrets, Probes oder Clusternetzwerke betrifft.
