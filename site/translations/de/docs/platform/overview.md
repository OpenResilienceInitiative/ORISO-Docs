---
title: "Plattformüberblick"
description: "Der Einstieg für Entwickler: installieren, die Architektur verstehen, den zuständigen Service finden und den Code öffnen."
---

# Plattformüberblick

Entwicklerdokumentation für die ORISO-Plattform: siebzehn Repositories, zwei React-Anwendungen, vier Spring-Boot-Services, Keycloak, Matrix und ein Helm-Chart.

Diese Seiten beziehen sich auf den Code auf `dev`. Jede genannte Datei ist mit der passenden Stelle im Repository verlinkt. Der Link öffnet einen neuen Tab und zeigt den Pfad sowie, wo nötig, die Zeilen, die die Aussage belegen.

## Der Weg durch diesen Abschnitt

1. **[Installieren und lokal starten](./install-and-run-locally.md)** — Voraussetzungen, Repositories und der erste Befehl, der etwas startet. Drei Wege: Frontend, Admin und Backend.
2. **[Architektur](./architecture.md)** — die Services, ihre Aufrufe untereinander und eine Tabelle: „Ich möchte X ändern, also öffne ich Y“.
3. **Zuständigkeit finden** — [Backend-Services](./backend-services.md) für die APIs,
   [Frontend und Admin](./frontend-admin-overview.md) für die Oberflächen,
   [Datenbank und Datenmodell](./database-and-data-model.md) für die Tabellen.
4. **Code öffnen** — jeder Service-Abschnitt verlinkt direkt auf `dev`.

## Kernsysteme

| Seite | Lesen, bevor du … |
| --- | --- |
| [Authentifizierung und Keycloak](./authentication-and-keycloak.md) | Anmeldung, Rollen, Tokens oder die Mandantenauflösung änderst |
| [Datenbank und Datenmodell](./database-and-data-model.md) | Persistenz änderst oder eine Spalte hinzufügst |
| [Backend-Services](./backend-services.md) | einen Endpunkt oder seinen Vertrag änderst |
| [Frontend und Admin](./frontend-admin-overview.md) | eine Ansicht oder einen API-Client änderst |
| [Kubernetes-Deployment](./kubernetes-deployment.md) | Routing, Hostnamen, Secrets oder Ressourcen änderst |

## Abläufe

| Seite | Inhalt |
| --- | --- |
| [Mandantenlebenszyklus](./tenant-lifecycle.md) | wie ein Mandant angelegt und ermittelt wird |
| [Repository-Übersicht](./repository-map.md) | welches Repository für welchen Bereich zuständig ist |
| [Fehlersuche](./troubleshooting.md) | wo du je nach Symptom zuerst nachsiehst |

## Wie diese Seiten verlässlich bleiben

Die zugrunde liegende Struktur ist ein Wissensgraph, der aus dem Code neu erstellt wird. Vor der Veröffentlichung wird jeder Link dieser Website offline gegen die ausgecheckten Repositories geprüft.
[Wie wir die Dokumentation verlässlich halten](./understand-anything.md) erklärt das Verfahren und die öffentlichen Dashboards auf [understand.oriso.org](https://understand.oriso.org/).

Entscheidungen werden getrennt von Fakten in den
[Architekturentscheidungsprotokollen](/decisions) festgehalten. Wenn eine Seite beschreibt, wie etwas ist, erklärt der ADR den Grund.

## Umfang

Diese Seiten beschreiben, was **implementiert** ist: Repositories, Services, Verträge, Routing und Datenzuständigkeiten. Deployment und Betrieb einer selbst gehosteten Installation beginnen beim
[Überblick zur Plattformeinrichtung](../../oriso-platform/overview.mdx); das Produktverhalten beschreibt der [Produktüberblick](../../product/overview.mdx).
