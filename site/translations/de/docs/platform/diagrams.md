---
title: "Diagramme"
description: "Wo die einzelnen Übersichtsdiagramme stehen und wie die Diagramme dieser Website geschrieben und aktuell gehalten werden."
---

# Diagramme

Jedes Diagramm steht auf der Seite, deren Thema es erklärt. So bleibt es im Zusammenhang lesbar und wird zusammen mit dem umgebenden Text aktualisiert.

| Diagramm | Seite |
| --- | --- |
| Services mit Aufrufrichtungen | [Architektur](./architecture.md) |
| Anmeldung und Token-Ablauf von Keycloak zum Service | [Authentifizierung und Keycloak](./authentication-and-keycloak.md) |
| Rückfallfolge der Mandantenauflösung | [Authentifizierung und Keycloak](./authentication-and-keycloak.md) |
| Einstieg in einen Service vom Vertrag zum Repository | [Backend-Services](./backend-services.md) |
| Datenzuständigkeit über die Datenspeicher hinweg | [Datenbank und Datenmodell](./database-and-data-model.md) |
| Deployment-Ablauf vom Pull Request zum Pod | [Kubernetes-Deployment](./kubernetes-deployment.md) |
| Browseranfrage von der Komponente zum Service | [Frontend und Admin](./frontend-admin-overview.md) |
| Erstellung der Codegraphen | [Wie wir die Dokumentation verlässlich halten](./understand-anything.md) |

## Wie sie geschrieben werden

Die Diagramme werden mit Mermaid als eingezäunter ` ```mermaid `-Block direkt in der Markdown-Quelle geschrieben. Es gibt keine separate Diagrammdatei und kein neu zu erzeugendes Bild:

- GitHub rendert den Block direkt; das Diagramm ist dadurch im Pull-Request-Diff sichtbar;
- diese Website rendert denselben Block beim Laden der Seite über `site/components/mermaid.tsx` und die Umwandlung in
  [`site/scripts/sync-content.mjs`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/site/scripts/sync-content.mjs);
- eine Diagrammänderung ist deshalb ein lesbarer Text-Diff und lässt sich wie andere Änderungen prüfen.

Halte die Diagramme übersichtlich. Ein Diagramm mit jeder einzelnen Klasse verliert seinen Nutzen als Karte. Hilfreiche Diagramme zeigen die relevanten Bereiche und die Richtung der Verbindungen.

## Ältere Diagrammquellen

Eine ältere Sammlung eigenständiger Mermaid-Dateien liegt im Repository unter
[`docs/platform/diagrams/`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/docs/platform/diagrams).
Sie wurden aus den Graph-Artefakten vom Mai 2026 erzeugt. Die oben genannten Diagramme innerhalb der Seiten ersetzen sie.
