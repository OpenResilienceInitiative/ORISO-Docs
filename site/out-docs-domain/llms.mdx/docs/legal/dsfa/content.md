# DSFA — Entwicklerteil (/legal/dsfa)



Stand: 2026-08-17 · Sprache: Deutsch · Stil: sachlich-juristisches Präsens/Passiv nach der
Stilanalyse in `dsfa-analyse-dokument.md`, Abschnitt 3.

Dieses Verzeichnis enthält die Kapitel der Datenschutz-Folgenabschätzung (DSFA), die **wir als
Entwicklungsteam verantworten können**, weil sie aus Quellcode, Konfiguration und
Architekturentscheidungen ableitbar sind. Die organisatorischen und juristischen Kapitel des
Betreibers sind nicht ausformuliert, sondern als vorausgefüllte Entwürfe beigelegt.

Kapitelnummerierung folgt dem Original (DCV-DSFA vom 29.01.2026), damit Querverweise und
Zitierfähigkeit erhalten bleiben.

## Was hier liegt [#was-hier-liegt]

| Datei                                                                     | Inhalt                                                                                                                                                                                                                                                             | Zuständigkeit          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| [`kap-02-schwellwertanalyse.md`](/legal/dsfa/02-schwellwertanalyse)       | Herleitung der DSFA-Pflicht nach § 35 KDG: zwei Vorfragen, zehn Prüffragen, Ergebnisabsatz                                                                                                                                                                         | wir                    |
| [`kap-06-verfahren-und-technik.md`](/legal/dsfa/06-verfahren-und-technik) | Der große Block: Zweck, Beratungsarten, Registrierung/Anonymität, IAM/2FA, IP-Behandlung, Cookies, Endgeräte, E2EE-Schlüsselkonzept, Video, Sprachnachrichten, Medien, Fallkoordination, Benachrichtigungen, Statistik, Mandantentrennung, Observability, Löschung | wir                    |
| [`kap-07-rechtsgrundlagen.md`](/legal/dsfa/07-rechtsgrundlagen)           | Rechtsgrundlage je Verarbeitungsschritt, KDG mit DSGVO-Pendant in Klammern (preset-fähig)                                                                                                                                                                          | wir                    |
| [`kap-08-betroffenenrechte.md`](/legal/dsfa/08-betroffenenrechte)         | 8.4–8.10: „technisch möglich / technisch unmöglich" je Recht, inkl. Zusammenfassungstabelle                                                                                                                                                                        | wir                    |
| [`kap-10-ergebnis.md`](/legal/dsfa/10-ergebnis)                           | Ergebnis unter Vorbehalt der Anlagen, mit acht benannten Bedingungen                                                                                                                                                                                               | wir                    |
| [`vorlagen-betreiber.md`](/legal/dsfa/vorlagen-betreiber)                 | Vorausgefüllte Entwürfe für Kap. 4, 5, 8.1, 8.3, 8.11, 9.1–9.4, Ergebnisabsatz Kap. 2 und Anlagenverzeichnis                                                                                                                                                       | Betreiber überschreibt |
| `dsfa-editor-defaults.ts`                                                 | Dieselben Entwürfe als TipTap-HTML, geschlüsselt nach `DPIA_SECTIONS` — Startinhalt für den DSFA-Editor im Admin-Panel                                                                                                                                             | Einbau ins Admin-Repo  |
| `evidence-map.yaml`                                                       | Je code-gestützter Aussage: Slug, Repository, Pfad, Zeilenbereich, erwartete Bezeichner — Grundlage für Verfall-Detektor und Evidenz-Dialoge                                                                                                                       | Werkzeug               |

## Was hier bewusst NICHT liegt [#was-hier-bewusst-nicht-liegt]

Kapitel 1 (Stammdaten), 3 (Kennzahlen), 4 (Akteure/Governance), 5 (Verantwortlichkeit),
8.1 (Identitätsprüfung), 8.2 (anonyme Nutzung), 8.3 (Informationswege), 8.11 (Eskalationskette),
9 (Verhältnismäßigkeit) sowie die Anlagen 1 (Risikoanalyse) und 2 (Löschkonzept). Kapitel 1 und 3
kommen aus den Global Settings bzw. aus aggregierten Statistiken; die übrigen sind
betreiberspezifisch — für sechs von ihnen liegen Entwürfe in [`vorlagen-betreiber.md`](/legal/dsfa/vorlagen-betreiber).

## Drei Regeln, nach denen diese Texte geschrieben sind [#drei-regeln-nach-denen-diese-texte-geschrieben-sind]

1. **Was nicht live ist, wird nicht als vorhanden beschrieben.** Der Medien-Prüf-Proxy ist
   Zielarchitektur, kein Ist-Zustand. Die Terminverwaltung ist eine Architekturentscheidung, kein
   Feature. Statistik-Ereignisse, Push-Benachrichtigungen und das geparkte Gerät sind im
   Auslieferungsstand abgeschaltet. Der `status`-Schlüssel in `evidence-map.yaml` trägt diese
   Unterscheidung maschinenlesbar.
2. **Risiko benennen, Kompensation sofort nachschieben.** Jede offen benannte Schwäche steht
   zusammen mit der vorhandenen Gegenmaßnahme oder mit der Feststellung, dass eine solche fehlt
   und als Maßnahme geführt wird.
3. **Grenzen ehrlich benennen.** Die Formulierungen „beinahe unmöglich", „nicht haltbar", „darf
   nicht behauptet werden" sind Absicht, kein Versehen. Eine DSFA, die eine unvollständige
   Löschung als vollständig beschreibt oder ein bedingtes Verschlüsselungsversprechen als
   unbedingtes, verliert ihren Zweck.

## Quellenzuordnung — welcher Abschnitt stützt sich worauf [#quellenzuordnung--welcher-abschnitt-stützt-sich-worauf]

Alle Quellen liegen in `0 - Docs/artifacts/dsfa-2026-08-13/`.

| Abschnitt                                        | Primärquelle                                                                                  | Ergänzend                                                                                                                                                                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1–2.2 Vorfragen und Prüffragen                 | `dsfa-analyse-dokument.md` §§ 1, 5 (Struktur und Normen-Mapping)                              | `dsfa-inventar-backend.md` Kap. 1, 9 (besondere Kategorien, `sessionDataInitializing`)                                                                                                                                              |
| 2.2 zu Frage 3 (keine systematische Überwachung) | `dsfa-inventar-frontend-infra.md` Kap. 4 (keine Telemetrie)                                   | `dsfa-deepdive-notification-center.md` § 1.4 (`read_date`), `dsfa-inventar-frontend-infra.md` Kap. 3 (Presence)                                                                                                                     |
| 6.2 Beratungsarten                               | `dsfa-alt-neu-vergleich.md` § 1                                                               | `dsfa-inventar-backend.md` Kap. 1 (`Chat`, `Session`)                                                                                                                                                                               |
| 6.2.6 Terminverwaltung                           | `dsfa-alt-neu-vergleich.md` § 2.4 + § 4.1                                                     | `dsfa-oriso-luecken.md` § 4 ([ADR-020](/decisions/adr-020) nicht umgesetzt), `dsfa-inventar-backend.md` Kap. 1 (`appointment`, default disabled)                                                                                    |
| 6.3 Registrierung und Anonymität                 | `dsfa-alt-neu-vergleich.md` § 2.2                                                             | `dsfa-oriso-luecken.md` § 4 (Namensgenerator, Pseudonym ist kein anonymes Datum), `dsfa-inventar-backend.md` Kap. 1 (`session.referer`)                                                                                             |
| 6.4 Einladungsverfahren                          | `dsfa-inventar-backend.md` Kap. 1 (`account_invite`, `invite_email_delivery`)                 | `dsfa-inventar-frontend-infra.md` Kap. 6 (CSV-Import → Art.-14-Pflicht)                                                                                                                                                             |
| 6.5 IAM, Rollen, 2FA                             | `dsfa-inventar-backend.md` Kap. 10 (Keycloak-Quellenlage)                                     | `dsfa-oriso-luecken.md` § 2 (Rollen, Komposit-Bündel); Code-Nachprüfung `CreateAdminService`, `AccountInviteService`, `platformAdminTwoFactorGate.ts` (siehe `evidence-map.yaml`)                                                   |
| 6.6 IP-Behandlung                                | `dsfa-inventar-backend.md` Kap. 5 (`IpPrivacyHeaderFilter`, Keycloak-Login-Events)            | `dsfa-inventar-frontend-infra.md` Kap. 5 (Ingress-Logs, Admin-nginx ohne IP), Kap. 4 (Google-STUN)                                                                                                                                  |
| 6.7 Cookies                                      | `dsfa-inventar-frontend-infra.md` Kap. 2 (vollständige Cookie-Tabelle)                        | Kap. 1 (localStorage-Spiegel, FE-H01)                                                                                                                                                                                               |
| 6.8 Endgeräte                                    | `dsfa-inventar-frontend-infra.md` Kap. 1 (`oriso.chatDrafts.v1`, IndexedDB-Crypto-Store)      | —                                                                                                                                                                                                                                   |
| 6.9 E2EE-Schlüsselkonzept                        | `dsfa-inventar-frontend-infra.md` Kap. 3 (Crypto-Store, Key-Backup, Dehydration, Metadaten)   | `dsfa-deepdive-case-handover.md` C5 (Räume verpflichtend verschlüsselt, [ADR-002](/decisions/adr-002)-Vorhang), `dsfa-inventar-backend.md` Kap. 4 (Synapse-Admin-Impersonation), `dsfa-krypto-tiefenbohrung-alt.md` (Alt-Vergleich) |
| 6.10 Video                                       | `dsfa-inventar-frontend-infra.md` Kap. 4, 5 (LiveKit, Element Call, kein Egress, Google-STUN) | `dsfa-krypto-tiefenbohrung-alt.md` (Jitsi-Vergleich), `dsfa-alt-neu-vergleich.md` § 2.5                                                                                                                                             |
| 6.11 Sprachnachrichten                           | `dsfa-deepdive-voice-e2ee.md` §§ 1–5 (Textbaustein übernommen und eingepasst)                 | —                                                                                                                                                                                                                                   |
| 6.12 Medien                                      | `dsfa-deepdive-media-scanning.md` § 5 (ehrliche Ist-Formulierung übernommen) + §§ 1–2         | `dsfa-inventar-frontend-infra.md` Kap. 5 (`enable_authenticated_media`)                                                                                                                                                             |
| 6.13 Team-Besprechung und Fallübergabe           | `dsfa-deepdive-case-handover.md` § 3 (Textbaustein 1–5 übernommen)                            | § 1 (Claim-Verifikation), § 2 (Gaps G1–G5), § 4 (Supervision-Abgrenzung), `dsfa-oriso-luecken.md` § 4 (Schattendokumentation)                                                                                                       |
| 6.14 Benachrichtigungen                          | `dsfa-deepdive-notification-center.md` § 4 (Textbaustein) + §§ 1–3                            | `dsfa-inventar-backend.md` Kap. 4 (E-Mail-Wege), Kap. 8 (SMTP-Secrets)                                                                                                                                                              |
| 6.15 Statistik                                   | `dsfa-inventar-backend.md` Kap. 2 (Events, Small-Cell-Suppression, HMAC)                      | `dsfa-oriso-luecken.md` § 4 (Re-Identifikation über `source_session_id`)                                                                                                                                                            |
| 6.16 Mandantentrennung                           | `dsfa-oriso-luecken.md` §§ 1–3 (SMTP-Klartext, Rollenlücke, Break-Glass-Skizze)               | `dsfa-alt-neu-vergleich.md` § 2.8, `dsfa-inventar-frontend-infra.md` Kap. 6                                                                                                                                                         |
| 6.17 Observability und Betrieb                   | `dsfa-inventar-backend.md` Kap. 5 (Logs), Kap. 4 (Übersetzungs-API, Firebase)                 | `dsfa-inventar-frontend-infra.md` Kap. 5 (GitHub-Backup-Sync, fehlende DB-Backups, Synapse-Härtung), `dsfa-alt-neu-vergleich.md` § 2.10                                                                                             |
| 6.18 Löschung                                    | `dsfa-inventar-backend.md` Kap. 3 (Scheduler) + „Überraschungen" 5–9                          | `dsfa-inventar-frontend-infra.md` Kap. 5 (Backup-Fristen), `dsfa-deepdive-notification-center.md` § 1.4                                                                                                                             |
| 7.1–7.6 Rechtsgrundlagen                         | `dsfa-analyse-dokument.md` § 5 (Normen-Mapping KDG↔DSGVO) und § 6 (Alt-Rechtsgrundlagen)      | Verarbeitungsschritte aus Kapitel 6                                                                                                                                                                                                 |
| 8.4–8.10 Betroffenenrechte                       | `dsfa-analyse-dokument.md` § 1 (Struktur 8.4–8.10)                                            | `dsfa-inventar-backend.md` Kap. 3 (Löschketten), `dsfa-deepdive-case-handover.md` (Team-Besprechung ↔ Auskunft), `dsfa-oriso-luecken.md` § 4 (Onboarding-Consent-Nachweis)                                                          |
| 10 Ergebnis                                      | `dsfa-analyse-dokument.md` § 1 Kap. 10 (Vorbehalt der Anlagen)                                | offene Punkte aus allen vier Inventaren/Tiefenbohrungen                                                                                                                                                                             |
| Vorlagen Betreiber                               | `dsfa-analyse-dokument.md` §§ 2.3, 3 (organisatorische Inhalte, Stil)                         | `dpiaSections.ts` (Slot-Kennungen), `dsfa-analyse-dokument.md` § 7 (Anlagen)                                                                                                                                                        |

## Bewusst nicht geschriebene Aussagen [#bewusst-nicht-geschriebene-aussagen]

Diese Behauptungen ließen sich aus der Faktenbasis **nicht** belegen und wurden deshalb weggelassen
oder ausdrücklich als offen markiert:

* **Passwort-Hashverfahren und Passwortrichtlinie.** Das Original nannte BCrypt und eine
  Mindestlänge von neun Zeichen. Für ORISO ist beides aus den Repositorien nicht belegbar; die
  Realm-Dateien sind nachweislich nicht autoritativ. Formuliert wurde nur „gesalzene Hashwerte"
  plus ausdrücklicher Nachweisvorbehalt.
* **Rate-Limiting am Anmeldevorgang.** Nicht behauptet — der versionierte Realm-Stand zeigt
  deaktivierten Brute-Force-Schutz.
* **„IP-Adressen werden zu keiner Zeit mitgeschrieben".** Diese Aussage des Originals ist für
  ORISO nachweislich unzutreffend und wird nicht übernommen (Abschnitt 6.6).
* **Externes Audit der Krypto-Implementierung.** Kursiert in älteren Entwürfen; in der
  Faktenbasis nicht belegt, daher gestrichen.
* **Konkrete Kennzahlen** (Anzahl Ratsuchender, Beratungsstellen, Beratende, E-Mail-Opt-in-Quote)
  — betreiberseitig aus aggregierten Statistiken zu ergänzen, Kapitel 3.
* **Konkrete Löschfristen je Datenkategorie** — gehören ins Löschkonzept (Anlage 2), das noch
  nicht existiert. Kapitel 6 und 8 verweisen darauf, statt Fristen zu erfinden.
* **Datenschutzklassen I–III.** Das Klassifikationsschema des Originals wurde nicht übernommen,
  weil seine Herkunft und Definition in der Faktenbasis nicht dokumentiert sind.
* **Antwortfristen (SLA) für Erstanfragen.** Betreiber- bzw. trägerspezifisch, nicht technisch.

## Offene Punkte für die juristische Prüfung [#offene-punkte-für-die-juristische-prüfung]

Vier Einordnungen sollten von der Datenschutzbeauftragung bestätigt oder korrigiert werden, bevor
das Dokument freigegeben wird:

1. **Rechtsgrundlage der Team-Besprechung** (Abschnitt 7.1 Nr. 8): Hier wird über eine ratsuchende
   Person gesprochen, ohne dass sie es erfährt und ohne Widerspruchsmöglichkeit. Der Entwurf
   stützt das auf berechtigtes Interesse — vertretbar, aber begründungsbedürftig, weil
   Beratungsinhalte betroffen sein können.
2. **Anonyme Nutzung und Anwendungsbereich** (Abschnitt 7.2 Absatz 5): Die Übernahme der
   Original-Argumentation („Anwendungsbereich nicht eröffnet") setzt voraus, dass wirklich keine
   personenbezogenen Daten anfallen. Metadaten wie Sitzungsdauer und Zeitpunkt fallen jedoch an.
3. **Beschäftigtendatenschutz** (Abschnitt 7.3): Nachrichtenzähler und der Übergabegrund
   „Fachkraft erkrankt" berühren Leistungs- und Gesundheitsdaten Beschäftigter; die
   Mitbestimmungspflicht ist zu klären.
4. **Statistikereignisse mit Quasi-Identifikator-Set** (Abschnitt 6.15): Die Bewertung „im
   Auslieferungsstand abgeschaltet, daher nicht Ist-Zustand" ist technisch korrekt; ob das
   ausreicht oder ob der Code-Pfad zu entfernen ist, ist eine juristische Bewertung.
