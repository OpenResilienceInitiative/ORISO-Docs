# ADR-019 — Medienprüfung über matrix-content-scanner: im Fehlerfall gesperrt, austauschbare KI-Prüfung

**Status:** Angenommen · **Datum:** 2026-07-18

> **Am 2026-08-08 von ADR-014 umnummeriert (ORISO-Docs#73).** Zwei angenommene ADRs trugen beide die Nummer 014, weshalb jeder Querverweis auf „ADR-014“ mehrdeutig war. Der spätere der beiden — dieser, angenommen am 2026-07-18 — erhielt die neue Nummer. `ADR-014-shared-legal-text-objects-…` (angenommen am 2026-07-16) behält 014. Eingehende Verweise in `0 - Docs` wurden entsprechend angepasst.

**Kontextdokumente:** `PLAN-media-upload-security-2026-07-18.md`

## Kontext

ORISO ergänzt Bild-Uploads in beiden TipTap-Editoren und erlaubt bereits Anhänge in Chats. Dazu gehören **Live-Chats ohne Registrierung**, in denen anonyme Gäste im U25-Kontext, auch Minderjährige, Dateien an Berater senden können. Dateien dürfen erst nach einer Prüfung auf Viren und schädliche Inhalte wie Nacktheit oder Missbrauchsdarstellungen geöffnet werden. Anforderungen aus der Planungssitzung:

- Eine noch nicht erfolgreich geprüfte Datei muss liegen bleiben und darf nicht geöffnet werden. Die Durchsetzung darf nicht vom Verhalten des Clients abhängen.
- Bis zur Prüfung unscharfe Vorschaubilder, gesteuert durch einen abfragbaren Status (*ungeprüft / sicher / gesperrt*).
- Kurzfristig ein Machbarkeitsnachweis mit einer KI-API; langfristig muss der Austausch gegen ein selbst gehostetes Bildmodell möglich bleiben.
- Die gesamte Funktion muss über die ORISO-Einstellungskaskade schaltbar sein.

Die Matrix-Verschlüsselung ist derzeit aus, bei dauerhaft aktiver Fassade. Der Server kann daher Medieninhalte sehen; serverseitige Prüfung ist heute möglich.

## Optionen

**A — matrix-content-scanner (gewählt).** Das offizielle Element-Projekt leitet Mediendownloads als Proxy weiter: Der Client erhält eine Datei erst, nachdem der Scanner sie freigegeben hat. Die eigentliche Prüfung ist ein austauschbares Skript. Unser Skript verbindet ClamAV für Viren mit einer Mistral-Bildprüfung für Nacktheit und schädliche Inhalte. Die Sperre greift im Downloadpfad, sodass ungeprüfte oder durchgefallene Dateien unabhängig vom Clientverhalten serverseitig unzugänglich sind. Unterstützt verschlüsselte Medien durch Schlüsselweitergabe, falls die Verschlüsselung später aktiviert wird (Epic zum Chat-Neuaufbau).

**B — eigener Prüfservice.** Eigener Microservice mit Upload-Benachrichtigung, Statustabelle und Statusendpunkt. Jeder Client müsste den Status selbst beachten. Mehr Code und schwächere Durchsetzung: Wer die mxc-URL kennt, umgeht sie.

## Entscheidung

**matrix-content-scanner** als eigenen Service in ORISO-Helm bereitstellen, mit eigenem Prüfsystem: zuerst ClamAV, danach die KI-Prüfung. Für den Machbarkeitsnachweis wird die Mistral-API verwendet — EU-Anbieter, keine Aufbewahrung, als Unterauftragsverarbeiter in der KDG-/AVV-Dokumentation erfasst.

Zwei verbindliche Eigenschaften:

1. **Bei Fehler gesperrt.** Ist eine Prüfung nicht erreichbar, fehlerhaft oder unsicher, bleibt die Datei in Quarantäne. Im Zweifel wird nichts freigegeben.
2. **Das Prüfsystem ist die Austauschstelle.** Ein späterer Wechsel von Mistral zu einem selbst gehosteten Bildmodell ändert ausschließlich das Skript, keinen anderen Teil der Pipeline.

Die unscharfe Darstellung im Client folgt den Scannerergebnissen: *noch nicht geprüft* → unscharf, *sauber* → sichtbar, *durchgefallen* → gesperrte Kachel. Vor Bereitstellung der Pipeline sind Gastbilder unscharf; Berater können sie per Klick anzeigen. Es ist dasselbe Zustandsmodell mit menschlicher Bewertung.

## Folgen

- Serverseitig erzwungene Quarantäne ohne unterschiedliche Durchsetzung je Client.
- Prüfung beim Download verzögert das erste Öffnen; frühes Prüfen und zwischengespeicherte Ergebnisse verringern dies (Scannerverhalten).
- Mistral wird bis zur eigenen Bereitstellung ein in KDG/AVV dokumentierter Unterauftragsverarbeiter.
- Wird Matrix-Ende-zu-Ende-Verschlüsselung später aktiviert, müssen die Clients die Unterstützung verschlüsselter Medien des Scanners durch Schlüsselweitergabe einbinden. Dies wird im Epic zum Chat-Neuaufbau verfolgt, nicht hier.
