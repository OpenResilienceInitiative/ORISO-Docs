# DSFA ORISO — Analyseunterlagen

Stand: 2026-08-21 · Sprache: Deutsch · Status: Arbeitsunterlagen, keine freigegebenen Rechtstexte

Hier liegen die Untersuchungen, aus denen die Kapiteltexte in `../dsfa-text/` entstanden sind.
Die Kapiteltexte sind das Ergebnis, dieses Verzeichnis ist die Herleitung: Wo eine Aussage der
DSFA herkommt, welche Datei sie belegt und welche Alternative verworfen wurde.

Erhebungszeitraum 13.–14.08.2026, Nachträge einzeln datiert.

## Inhalt

| Datei | Was drinsteht |
|---|---|
| `dsfa-analyse-dokument.md` | Lektüre der DCV-DSFA vom 29.01.2026: Aufbau, Kapitelnummerierung, Stil, was sie abdeckt und was nicht. Grundlage für die Gliederung unserer Fassung. |
| `dsfa-alt-neu-vergleich.md` | Caritas 1.0 ↔ ORISO, Dienst für Dienst. Was ersetzt wurde (Rocket.Chat → Matrix, serverseitige AES → E2EE, Jitsi → LiveKit) und was ersatzlos entfiel. |
| `dsfa-onlineberatung-aktivitaet.md` | Entwicklungsstand der Caritas-Plattform, erhoben über die GitHub-Organisationen. **Abschnitt 6 korrigiert die ursprüngliche Erhebung** — der Betreiber-Fork wird aktiv weiterentwickelt, nur der öffentliche Upstream ruht. |
| `dsfa-gematik-referenzen.md` | Anschlussfähige Normen und Referenzarchitekturen aus dem Gesundheitswesen. |
| `dsfa-deepdive-case-handover.md` | Fallübergabe: Datenkategorien, Einwilligungslage, Freitextfelder. |
| `dsfa-deepdive-media-scanning.md` | Medien-Uploads und Schadsoftwareprüfung; Soll/Ist gegen ADR-019. |
| `dsfa-deepdive-notification-center.md` | Zeitstrahl/Benachrichtigungen: was `event_notification` speichert, Aufbewahrung, geplante Abhilfe. |
| `dsfa-deepdive-voice-e2ee.md` | Sprachnachrichten und Verschlüsselung in Sprach-/Videoverbindungen. |
| `kdg-epic-privacy-data.md` | Umsetzungsschnitt Aufbewahrung und Löschung. |
| `kdg-epic-synapse-ops.md` | Umsetzungsschnitt Matrix-/Synapse-Betrieb. |
| `kdg-epic-client-storage.md` | Umsetzungsschnitt clientseitige Speicherung. |
| `kdg-epic-media-scanner.md` | Umsetzungsschnitt Medien-Scanner. |

## Was hier bewusst NICHT liegt

Dieses Repository ist öffentlich. Analysen, die noch offene Schwachstellen im Detail beschreiben
— mit Datei, Zeile und Ausnutzungsweg —, gehören nicht hierher, solange sie offen sind. Sie
bleiben in der internen Ablage; veröffentlicht wird die Behebung, nicht die Lücke.

Das betrifft auch Untersuchungen zum Altsystem: der Betreiber-Fork der Caritas-Plattform ist in
Betrieb (siehe `dsfa-onlineberatung-aktivitaet.md`, Abschnitt 6), Schwachstellenbeschreibungen
dazu wären eine Offenlegung über ein fremdes Produktivsystem.

## Verhältnis zu den anderen Verzeichnissen

- `../dsfa-text/` — die Kapiteltexte selbst, plus `evidence-map.yaml` (Beleg → Datei/Zeilenbereich)
- `../decisions/` — die ADRs, auf die die Kapitel verweisen
- Veröffentlichte Fassung: <https://understand.oriso.org/legal/dsfa/>
