---
title: "Plattformüberblick"
description: "Der Einstieg für Entwickler: installieren, die Architektur verstehen, den zuständigen Service finden und den Code öffnen."
source: "docs/platform/overview.md"
---

Entwicklerdokumentation für die ORISO-Plattform: siebzehn Repositories, zwei React-Anwendungen, vier Spring-Boot-Services, Keycloak, Matrix und ein Helm-Chart.

Diese Seiten beziehen sich auf den Code auf `dev`. Jede genannte Datei ist mit der passenden Stelle im Repository verlinkt. Der Link öffnet einen neuen Tab und zeigt den Pfad sowie, wo nötig, die Zeilen, die die Aussage belegen.

## Der Weg durch diesen Abschnitt

1. **[Installieren und lokal starten](/de/plattform/start-here/install-and-run-locally)** — Voraussetzungen, Repositories und der erste Befehl, der etwas startet. Drei Wege: Frontend, Admin und Backend.
2. **[Architektur](/de/plattform/start-here/architecture)** — die Services, ihre Aufrufe untereinander und eine Tabelle: „Ich möchte X ändern, also öffne ich Y“.
3. **Zuständigkeit finden** — [Backend-Services](/de/plattform/core-systems/backend-services) für die APIs,
   [Frontend und Admin](/de/plattform/core-systems/frontend-admin-overview) für die Oberflächen,
   [Datenbank und Datenmodell](/de/plattform/core-systems/database-and-data-model) für die Tabellen.
4. **Code öffnen** — jeder Service-Abschnitt verlinkt direkt auf `dev`.

## Kernsysteme

| Seite | Lesen, bevor du … |
| --- | --- |
| [Authentifizierung und Keycloak](/de/plattform/core-systems/authentication-and-keycloak) | Anmeldung, Rollen, Tokens oder die Mandantenauflösung änderst |
| [Datenbank und Datenmodell](/de/plattform/core-systems/database-and-data-model) | Persistenz änderst oder eine Spalte hinzufügst |
| [Backend-Services](/de/plattform/core-systems/backend-services) | einen Endpunkt oder seinen Vertrag änderst |
| [Frontend und Admin](/de/plattform/core-systems/frontend-admin-overview) | eine Ansicht oder einen API-Client änderst |
| [Kubernetes-Deployment](/de/plattform/core-systems/kubernetes-deployment) | Routing, Hostnamen, Secrets oder Ressourcen änderst |

## Abläufe

| Seite | Inhalt |
| --- | --- |
| [Mandantenlebenszyklus](/de/plattform/flows-und-reference/tenant-lifecycle) | wie ein Mandant angelegt und ermittelt wird |
| [Repository-Übersicht](/de/plattform/flows-und-reference/repository-map) | welches Repository für welchen Bereich zuständig ist |
| [Fehlersuche](/de/plattform/flows-und-reference/troubleshooting) | wo du je nach Symptom zuerst nachsiehst |

## Wie diese Seiten verlässlich bleiben

Die zugrunde liegende Struktur ist ein Wissensgraph, der aus dem Code neu erstellt wird. Vor der Veröffentlichung wird jeder Link dieser Website offline gegen die ausgecheckten Repositories geprüft.
[Wie wir die Dokumentation verlässlich halten](/de/plattform/knowledge-graphs/understand-anything) erklärt das Verfahren und die öffentlichen Dashboards auf [understand.oriso.org](https://understand.oriso.org/).

Entscheidungen werden getrennt von Fakten in den
[Architekturentscheidungsprotokollen](/de/decisions) festgehalten. Wenn eine Seite beschreibt, wie etwas ist, erklärt der ADR den Grund.

## Umfang

Diese Seiten beschreiben, was **implementiert** ist: Repositories, Services, Verträge, Routing und Datenzuständigkeiten. Deployment und Betrieb einer selbst gehosteten Installation beginnen beim
[Überblick zur Plattformeinrichtung](/de/betrieb/getting-started/overview); das Produktverhalten beschreibt der [Produktüberblick](/de/produkt/overview/overview).
