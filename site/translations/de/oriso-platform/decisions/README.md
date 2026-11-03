# Plattform-ADRs

Dieses Verzeichnis enthält die Architekturentscheidungsprotokolle (ADRs) auf Plattformebene, importiert aus einem zuvor nicht von Git erfassten lokalen Ordner (`/Users/frankgerhardt/ORISO/0 - Docs/`, ausschließlich `ADR-*.md`-Dateien, ohne den Unterordner `_artifacts/`). Die Reihe wurde am 2026-08-17 erneut aus demselben lokalen Ordner synchronisiert (23 Dateien, ADR-001 bis ADR-023, eine je Nummer), damit die veröffentlichte Dokumentationswebsite den aktuellen Text anzeigt.

## Nach dem Import verfasste Entscheidungen

- `ADR-020-scheduled-calls-secure-invitations-and-unified-contact-calendar.md` — angenommen am 2026-08-12; regelt sichere Anrufeinladungen, geplante Audio-/Videokontakte, Verfügbarkeit, den gemeinsamen Kontaktkalender und die Zukunftszeitleiste.
- `ADR-021`, `ADR-022`, `ADR-023` — angenommen am 2026-08-16 (Hierarchie und Versionierung von Rechtstexten, Einwilligungsschranken und erneute Einwilligung, Plattformdienstleistungsvertrag und Träger-Governance).
- `ADR-024`, `ADR-025`, `ADR-026` — angenommen am 2026-09-15, am 2026-09-22 in diese Reihe aufgenommen; die Entscheidungen zu Transaktions-E-Mails aus EPIC `ORISO-Frontend#828` (Benachrichtigungsmatrix als zwei Listen, UserService rendert Benachrichtigungs-E-Mails statt des Upstream-MailService, Vertrag für Mandantenbranding in E-Mails). Jede enthält eine Tabelle zum Implementierungsstand, gemessen auf `dev` am 2026-09-22; ADR-025 ist auf `dev` nicht implementiert, ADR-024 und ADR-026 teilweise.

  Hinweis für Leser des ausgelieferten Codes: Dort werden diese drei Entscheidungen als `ADR-019`, `ADR-020` und `ADR-021` zitiert. In dieser Reihe stehen diese Nummern für Medienprüfung, geplante Anrufe und Rechtstexthierarchie. Die E-Mail-Entscheidungen haben die Nummern 024–026; die Codeverweise müssen noch korrigiert werden (in jedem ADR aufgeführt).

- `ADR-014-amendment-2026-09-25-one-topic-per-agency-policy.md` — am 2026-09-26 vom Produktverantwortlichen angenommen (ORISO-UserService#1264): ein globaler, standardmäßig ausgeschalteter Plattformschalter, der jede Beratungsstelle auf ein Thema beschränkt; das Datenmodell bleibt mehrthemig.

- `ADR-028-capability-map-stays-in-hub-health-in-viewer-node-panel.md` — vorgeschlagen am 2026-10-24 (Docs#224): Die Fähigkeitskarte bleibt im Hub; ein Gesundheitsabschnitt kommt über einen begrenzten Patch in das Knotenpanel des Viewers, sobald das Schema für Laufprotokolle existiert; ein Fork ist vorerst verworfen.

- `ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md` — am 2026-10-27 vom Produktverantwortlichen angenommen (Epic ORISO-Frontend#974): dauerhafte Direktlinks im Modell AgencyInviteLink, Einlass nach Anklopfen bei Anrufen, temporäre Konten immer mit Benutzername und Passwort, von der Plattform festgelegte Lebensdauern und Nachrichtenaufbewahrung. Ändert ADR-020 §2, §3, §7. Geändert am 2026-10-28 (ORISO-Docs#231): Die Berechtigung „Direkteinladung erlauben“ ersetzt die Anrufrichtlinie des Trägers, und ein Einlass gilt pro Gespräch. ADR-020 bekam am selben Tag eine passende Änderung: zuerst anklopfen, und ein Anrufgast tritt nur dem Anrufraum bei (der Beitrittsweg des Gasts steht dort).

- `ADR-030-activity-timeline-read-state-filters-and-preview.md` — vorgeschlagen am 2026-09-05 (ORISO-Frontend#1200), nummeriert und aktualisiert am 2026-10-28: Massenhaftes Als-gelesen-Markieren betrifft nur Aktivitätsereignisse, datengetriebene Familien-Chips ohne „Alle“-Chip und eine funktionierende Timeline-Vorschau, die nie eine aktive Ansicht registriert (Produktentscheidung 2026-10-21, ORISO-Frontend#1824). Braucht noch die Freigabe durch das Produkt.

Neue Entscheidungen in diesem Abschnitt gehören zum Repository und sind kein Teil des oben beschriebenen unveränderten Imports von 19 Dateien.

## Bekannte Probleme

- **Doppelte Nummer ADR-014 — am 2026-08-08 behoben (ORISO-Docs#73):** Die Entscheidung zur Medienprüfung (angenommen am 2026-07-18) wurde in `ADR-019` umnummeriert. `ADR-014` steht jetzt eindeutig für gemeinsame Rechtstextobjekte und Themenwahl vor der Einwilligung. Beide Dateien enthalten einen Hinweis zur Änderung.
- **Die in Gesprächen verwendeten Nummern stimmen nicht immer mit diesen Nummern überein (geprüft am 2026-09-05, nicht korrigiert — Umnummerierung würde bestehende Zitate brechen):** Die Zuordnung „ADR-003 = AVV/Legal, ADR-014/015 = Virenscanner, ADR-019 = stille Schlüsselsicherung“ aus Chats und Notizen stimmt **nicht** mit den Dateien hier überein (014 = Rechtstextobjekte, 015 = Medienflags je Chattyp, 019 = Medienprüfung). Im Zweifel sind der Dateiname und der H1-Titel der Datei in diesem Verzeichnis maßgeblich; sie stimmen bei allen 26 Einträgen überein. Siehe auch `../dsfa-analysis/dsfa-alt-neu-vergleich.md` §3.
- **Für die Entscheidung zur stillen Schlüsselsicherung / Schlüsselwiederherstellung gibt es keine ADR-Datei.** Projektnotizen nennen sie „ADR-019“, doch diese Nummer gehört zur Medienprüfung. Ein Protokoll muss noch geschrieben werden; es muss die nächste freie Nummer erhalten, nicht 019.
- **`ADR-SECURITY-02-unified-crypto-boundary.md` liegt in `ORISO-UserService/documentation/`** und gehört nicht zu dieser Nummerierung. Es gehört in die maßgebliche Reihe, wurde aber noch nicht hierher verschoben.

## Andere lokale ADR-Sammlungen, die NICHT hier importiert wurden

Zwei weitere lokale ADR-Sammlungen wurden bewusst ausgeschlossen, weil sie zuerst manuell abgeglichen werden müssen:

- `0 - Docs M4_Frank/ADR-001..004.md` — eine ältere, möglicherweise ersetzte Kopie von ADR-001–004.
- `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — eine vollständig andere, unabhängige ADR-Reihe, die dieselben Nummern verwendet.

Beide müssen von einem Menschen mit der hier importierten Reihe abgeglichen werden, bevor sie aufgenommen werden können.

- `ADR-027-restricted-task-identities-and-keycloak-commands.md` — vorgeschlagen am 2026-10-07 im Rahmen von ORISO-Helm#367; zusätzlicher begrenzter Provider für Konto- und SMTP-Befehle sowie getrennte Zugangsdaten je technischer Aufgabe. Die technische Freigabe durch einen Menschen steht noch aus. Gemeinsamer Vertrag: `../contracts/technical-task-identities.md`.
