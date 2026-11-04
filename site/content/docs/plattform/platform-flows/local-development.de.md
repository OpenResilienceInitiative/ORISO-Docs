---
title: "Lokale Entwicklung"
description: "Praktische lokale Startreihenfolge anhand der untersuchten Repository-Abhängigkeiten."
source: "docs/platform/local-development.md"
---

> **Aktiver Einstieg in die lokale Entwicklung.** Beginne mit [Lokal installieren und starten](/de/plattform/start-here/install-and-run-locally), um die unterstützten Werkzeuge und den lokalen Runner zu verwenden. Diese Seite erklärt anschließend Repository-Abhängigkeiten und Startreihenfolge. Die Anleitung ist aus Quellen abgeleitet; prüfe den unterstützten Runner, bevor du eine manuelle Einrichtung verwendest.
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

## Startreihenfolge

1. ORISO-Database-Datenspeicher: MariaDB-Schemas, MongoDB-Dokumente, bei Bedarf Redis/RabbitMQ sowie Matrix-PostgreSQL, wenn Matrix läuft.
2. ORISO-Keycloak-Realm.
3. TenantService.
4. ConsultingTypeService.
5. AgencyService.
6. UserService.
7. ORISO-Frontend und ORISO-Admin.
8. ORISO-Kubernetes nur für Tests von Chart, Ingress oder Laufzeitverdrahtung.

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

### ORISO-Database

- Lies mariadb/README.md und mongodb/README.md.
- Verwende scripts/database-initialize.yaml und scripts/system-users-job.yaml als Muster für die Clusterinitialisierung.

### ORISO-Keycloak

- Importiere realm.json in das lokale Keycloak.
- Prüfe die App-/Admin-Weiterleitungs-URLs und die Issuer-/JWK-URLs des Backends für die lokalen Hostnamen.

### ORISO-Kubernetes

- Die früher genannte Datei `helm/oriso-platform/values-local-macos.example.yaml` fehlt im geprüften `dev`-Stand. Verwende diesen Pfad nicht. Nutze die Docker- oder manuellen Wege der lokalen Installationsanleitung; eine lokale Kubernetes-Konfiguration muss gesondert geprüft werden.
- Stelle Abhängigkeiten vor den Backend- und UI-Charts bereit.

## Regel

Starte zuerst den kleinsten sinnvollen Teil lokal. Verwende Kubernetes, wenn das Verhalten von Service und Oberfläche bereits klar ist oder der Fehler ausdrücklich Ingress, DNS, Werte, Secrets, Probes oder Clusternetzwerke betrifft.
