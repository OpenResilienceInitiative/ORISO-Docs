# ADR-025: UserService rendert Benachrichtigungsmails selbst; Upstream-MailService weder geforkt noch mit Vorlagen eingebunden

- **Status:** Angenommen — Frank, 2026-09-15
- **Implementierung:** nicht auf `dev`, nur Branch `email-v2.1`, siehe Stand
- **Datum:** 2026-09-15 (auf `dev` neu gemessen 2026-09-22)
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-024` (Matrix), `ADR-026` (Branding); EPIC `ORISO-Frontend#828`; `ORISO-Frontend#861` (Entscheidung), `#869`, `#870`, `#859` (Vorlagendialekte je Engine)
- **Umfang:** Gerenderte ORISO-Mail im Benachrichtigungspfad zum Empfänger. Inhalt, Branding, Schalter separat.

---

## Kontext

UserService sendete historisch an Online-Beratung-Mailservice `http://mailservice.<namespace>:8080/mails/send`, der eigene Thymeleaf-Vorlagen im Image rendert. `OpenResilienceInitiative` hat kein Repository dafür; falls vorhanden läuft Service unverändert.

Epic nannte zwei Optionen:

- **Fork in Organisation:** volle Vorlagen-/Modellkontrolle, dauerhaft Upstream-Merges pflegen.
- **Überschreibendes `templates/`-Verzeichnis einhängen:** kein Fork, aber abhängig von Upstream-Modellvariablen und stillen Vorlagenbrüchen bei Änderungen.

Keine vollständige Auswahl; Fork oder Einhängen ist überholt.

UserService rendert Katalogmails **bereits**. `OrisoEmailRenderer` liest `src/main/resources/emails/catalogue.json` und eingecheckte Tonvarianten; `OrisoEmailDispatcher` versendet SMTP. Passwortzurücksetzung, Magic-Link und Begrüßung laufen heute auf `dev` so. Zweiter fremder Renderer nur für Benachrichtigungsserie war letzter Grund für Upstream-Service im Pfad.

## Entscheidung

**UserService rendert Benachrichtigungen selbst, ruft dafür Upstream nicht mehr auf.** Weder Fork noch Einhängen.

1. `NotificationEmailService` nimmt vorhandenes `MailsDTO` aus `EmailNotificationFacade` und ordnet Vorlagen Katalog zu:

   | Upstream-Name | Kataloganlass |
   |---|---|
   | `enquiry-notification-consultant` | `neue-anfrage` |
   | `direct-enquiry-notification-consultant` | `direkte-anfrage` |
   | `assign-enquiry-notification` | `anfrage-zugewiesen` |
   | `daily-enquiry-notification` | `tagesuebersicht` |
   | `free-text`, `reassign-request-notification`, `reassign-confirmation-notification` | `mitteilung`, aus verfasstem Inhalt |

2. `MailService.sendEmailNotification` ruft diesen statt `MailsControllerApi.sendMails`. `EmailNotificationFacade` unverändert, alle Aufrufer/Auslöser funktionieren weiter.
3. **Zustellung braucht Quittung statt Statuscode.** Serie löst SMTP einmal über gemeinsamen `GlobalSmtpSettingsResolver` wie Einladung auf, dann je Empfänger `OrisoEmailDispatcher.sendOrThrow`. Einzelner Fehler stoppt Serie nicht; zählen und in einer `SmtpSendException` zusammenfassen.
4. **SMTP-Antworten nie protokollieren**, enthalten Empfängeradressen. Nur Kette von Ausnahmeklassennamen.
5. **Upstream für nicht migrierte Funktionen erreichbar lassen:** `sendErrorMail` des Löschablaufs weiter dort. Abschalten eigene Entscheidung.

## Implementierungsstand (auf `dev` gemessen, 2026-09-22)

Entscheidung gültig, **nicht auf `dev` implementiert**.

| Teil | Stand |
|---|---|
| `NotificationEmailService`, `GlobalSmtpSettingsResolver`, Punkte 1/3 | Nur ORISO-UserService `origin/email-v2.1`, letzter Commit 2026-09-15. Kein offener PR, nicht `dev`. |
| `MailService.sendEmailNotification`, Punkt 2 | Auf `dev` weiterhin `MailsControllerApi.sendMails`, Upstream. |
| Ziel | ORISO-Helm `templates/userservice/userservice-configmap-env.yaml`: `MAIL_SERVICE_API_URL` = `http://mailservice.<namespace>:8080`. Kein Chart stellt Mailservice bereit, kein Organisationsrepository baut ihn. Nur mit ORISO-Helm installierte Umgebung hat daher keinen Renderer für `neue-anfrage`, `direkte-anfrage`, `anfrage-zugewiesen`, `tagesuebersicht`, `mitteilung`. Aus Repositories gelesen, kein Cluster untersucht. |
| Katalog außerhalb Benachrichtigungen | Lokal auf `dev` durch `OrisoEmailRenderer`, `OrisoEmailDispatcher`, wie Kontext. |
| Frontend `src/emails/dist/mailservice/` | Auf `dev` weiter durch `src/emails/scripts/buildMailServiceTemplates.mts` erzeugt. README nennt Überschreibung statt Fork und **ADR-020**, hier abgelehnte Einhängoption mit Nummer geplanter Anrufe. |

Bis Branch landet nur alter Pfad. Offene Arbeit `ORISO-Frontend#869` / `#870` und UserService-Gegenstück.

## Folgen

- **Kein Mailservice-Helm-Chart bauen, nichts einhängen.** `ORISO-Frontend#869` fragt jetzt, ob Thymeleaf-Ausgabe `src/emails/dist/mailservice/` entfällt oder als Rückfall für Umgebungen mit Upstream bleibt.
- **`ORISO-Frontend#870` nicht mehr drei fremde Vorlagen austauschen.** `anfrage-zugewiesen` und Beraterseite `neue-nachricht` durch Zuordnung abgedeckt. Ratsuchenden-`neue-nachricht` ohne Sender neue Arbeit.
- Vier Anlässe bekommen Sender: `neue-anfrage`, `direkte-anfrage`, `anfrage-zugewiesen`, `tagesuebersicht`; zusätzlich `mitteilung` für verfasste operative Inhalte.
- Upstream-Thymeleaf-Modell begrenzt Vorlagen nicht mehr. Eigene Platzhalter einziger Vertrag.
- **Bewusst akzeptiertes Risiko:** UserService verantwortet SMTP-Zustellung/Fehler selbst statt Delegation. Quittung nach Versand und Empfängerisolation machen Verantwortung sichtbar.
- Dialekte `#859` weiter wichtig: FreeMarker für Keycloak-Theme unverändert. Thymeleaf-Bedarf Frage `#869` oben.
- Code zitiert **ADR-020** in UserService `OrisoEmailRenderer`, `InviteFrameMailRenderer`; Frontend `src/emails/dist/mailservice/README.md`, `buildMailServiceTemplates.mts`. Richtig ADR-025.
