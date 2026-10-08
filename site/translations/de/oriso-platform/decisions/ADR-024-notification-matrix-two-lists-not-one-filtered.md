# ADR-024: Ratsuchende und Berater erhalten zwei Benachrichtigungslisten statt einer gefilterten Liste

- **Status:** Angenommen — Frank, 2026-09-15
- **Implementierung:** auf ORISO-Frontend `dev`, Einstellungsroute aber ausgeschaltet, siehe Stand
- **Datum:** 2026-09-15 (am 2026-09-22 auf `dev` neu gemessen)
- **Entscheider:** Frank (Produkt) und KI (Engineering)
- **Verwandt:** `ADR-025` (gerenderte Nachricht zum Empfänger), `ADR-026` (Mandantenbranding), EPIC `ORISO-Frontend#828`; `ORISO-Frontend#860` (Entscheidung), `#871` (Einstellungen), `#872` (Abmeldelink), `ORISO-Frontend#1415` (Ansicht auf `dev` einbinden)
- **Umfang:** Anlass, Empfänger, Kanal und Abschaltberechtigung. Transport, Branding, Vorlagenmechanik separat.

---

## Kontext

Drei Listen passten nicht zusammen:

1. **Versand:** 22 Anlässe im Katalog `ORISO-Frontend src/emails/dist/catalogue.json`, je `audience` und `class`.
2. **In-App:** UserService `event_notification`, Kategorien `SYSTEM`, `MESSAGE`, eigene Begriffe `inquiryAccepted`, `supervisorAdded`, `newClientRequest`, `threadReply`, Gruppe `opened`/`reminder`/`cancelled`.
3. **Abschaltbar:** `NotificationsSettingsDTO` und Berater-`EmailType`, nochmals anderes Vokabular.

Jede ORISO-Mail trägt „Benachrichtigungen abbestellen“. Zielliste ohne gerade erhaltene Mail schlechter als kein Link.

Eine nach Rolle gefilterte Liste erzeugte `appointmentNotificationEnabled`: Schalter für alle ohne Funktion, da niemand Liste verantwortete.

Zielgruppen keine Varianten voneinander. Ratsuchende selten und unfreiwillig, oft gemeinsames Gerät oder fremd lesbarer Sperrbildschirm. Berater täglich mit operativem Nachrichtenstrom.

## Entscheidung

1. **Zwei getrennt gepflegte Listen:** `ADVICE_SEEKER_SWITCHES`, `CONSULTANT_SWITCHES` in `ORISO-Frontend src/components/profile/EmailNotifications/notificationMatrix.ts`, kein Array mit Rollenbedingung. Anlass kann in beiden Unterschiedliches bedeuten: `neue-nachricht`, je Rolle sogar anders gespeichert.

   **Ratsuchende — bewusst drei Schalter.**

   | Schalter | Backend-Feld | Anlässe |
   |---|---|---|
   | Neue Nachricht | `newChatMessageNotificationEnabled` | `neue-nachricht` |
   | Termin | `appointmentNotificationEnabled` | `termin` |
   | Systemhinweis | `serviceNoticeNotificationEnabled` | `systemhinweis` |

   **Berater — sieben operative Schalter.**

   | Schalter | Quelle | Anlässe |
   |---|---|---|
   | Neue Anfrage | `initialEnquiryNotificationEnabled` | `neue-anfrage`, `direkte-anfrage` |
   | Tagesübersicht | `EmailType.DAILY_ENQUIRY` | `tagesuebersicht` |
   | Neue Nachricht | `EmailType.NEW_CHAT_MESSAGE_FROM_ADVICE_SEEKER` | `neue-nachricht` |
   | Zuweisung | `assignmentNotificationEnabled` | `anfrage-zugewiesen` |
   | Übergabe | `reassignmentNotificationEnabled` | `uebergabe-angefragt`, `uebergabe-bestaetigt` |
   | Rückmeldung | `feedbackNotificationEnabled` | `rueckmeldung` |
   | Systemhinweis | `serviceNoticeNotificationEnabled` | `systemhinweis` |

2. **Zwei Speichermechanismen hinter einer Liste akzeptiert.** Acht Schalter im Benutzer-JSON `notificationsSettings`, zwei Beraterspalten über `emailToggles`. Vereinheitlichen wäre Migration, gemeinsame Anzeige nicht. Union `NotificationSource` bindet Feldnamen an generierten API-Typ. Sonst könnte Tippfehler fehlerfrei speichern, ohne Persistenz.
3. **Drei Klassen niemals abschaltbar, ausdrücklich benannt:** `security` für Kontozugriff, `legal`, Ausfallhinweise. `emailIsUnsubscribable` false für `security`/`legal`, dort keine Abmeldelinks. Ansicht benennt Kategorien, damit etwa Passwortzurücksetzungsempfänger nicht vergeblich Schalter suchen.
4. **Mail an Ratsuchende nennt weder Berater noch Fall**, auch bei anderem Beraterwortlaut zum gleichen Ereignis.
5. **Anlass ohne Schalter ist Entscheidung, kein Versehen.** Zwölf von 22 heute ohne: `security`/`legal` oder noch kein Sender. Neuer Sender braucht Matrixzeile oder dokumentierten Grund dagegen.
6. **Abmeldelink führt zum konkreten Schalter.** Fußzeile `?mail=<occasion>`, Auflösung durch `switchForOccasion`, Zeile hervorgehoben. Allgemeiner Einstellungslink reicht nicht.

## Implementierungsstand (auf `dev` gemessen, 2026-09-22)

| Teil | Stand auf `dev` |
|---|---|
| Beide Listen, Punkte 1/2 | **Implementiert** in ORISO-Frontend `src/components/profile/EmailNotifications/notificationMatrix.ts`: `ADVICE_SEEKER_SWITCHES` drei, `CONSULTANT_SWITCHES` sieben, Anzahl durch `notificationMatrix.test.ts` gesichert. |
| `?mail=<occasion>`, Punkt 6 | **Implementiert**: `EmailNotifications/index.tsx` liest `mail`, ruft `switchForOccasion`. |
| Für Benutzer erreichbar | **Noch nicht:** `src/components/profile/profile.routes.ts` enthält `condition: () => false`, Route verborgen. `ORISO-Frontend#1415`, offen mit Basis `dev`, bindet unter `/profile/einstellungen/email` hinter `enableNewNotifications` ein. Bis Merge kein Ziel für Abmeldelink. |
| Codezitat | Nennt **ADR-019** in `notificationMatrix.ts`, `notificationMatrix.test.ts`, `EmailNotifications/index.tsx`, Stories, `src/emails/content/emailCatalogue.ts`, `src/emails/content/de-sie.ts`; UserService `NotificationSettings.java`, `OrisoEmailRenderer.java`, `WelcomeEmailService.java`, `SupervisorAddedEmailNotificationService.java`. Hier ADR-019 Medienprüfung, richtig ADR-024. |

## Folgen

- Matrix Vertrag zwischen Katalog/Ansicht. Neuer Anlass ohne `notificationMatrix.ts` hinterlässt nicht abschaltbare Mail.
- `appointmentNotificationEnabled` hat Zeile und Vorlage `termin`, aber keinen Sender. Sichtbar behalten; Sender in `ORISO-Frontend#874`.
- In-App-`event_notification` hier **nicht** abgeglichen. `ORISO-Frontend#947` schlägt gemeinsamen Katalog für E-Mail/In-App/Browser-Push vor. E-Mail zuerst, nicht auf alle blockieren.
- Zwei Zielgruppen, zwei Prüfbereiche. Zusammenlegung als vermeintliche Vereinfachung ist Regression.

## Gewöhnlicher interner Beraterchat — Implementierungsergänzung vom 2026-10-07

Frank hat Benachrichtigungsmails für Nachrichten zwischen Beraterinnen und Beratern in gewöhnlichen
internen Gruppen angefordert und die vorgeschlagene P1-Implementierung für v2.0.11 freigegeben.
Das separat prüfbare Arbeitspaket ist [UserService #1375](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1375).
Damit wird ein ausdrücklicher Vertrag für den Auslöser ergänzt. Gewöhnliche Gruppen werden dadurch
nicht zu geschützten Supervisionsrückmeldungen. Die historischen Implementierungsmessungen oben
behalten ihr ursprüngliches Datum.

| Anlass | Empfänger | Unabhängige Mail-Einstellung | Darstellung |
|---|---|---|---|
| Nachricht in einer gewöhnlichen internen Gruppe | Andere aktive und aktuell berechtigte Beraterinnen und Berater derselben Gruppe und desselben Trägers | `internalChatNotificationEnabled` | Neutrale Vorlage für Beraternachrichten; eigener Abmeldeselektor `interne-nachricht` |

Die Einstellung folgt dem bisherigen Standard für Arbeitsabläufe: Sie ist eingeschaltet, solange der
Empfänger sie nicht ausschaltet. Die allgemeine Mail-Einstellung des Empfängers und der Schalter des
Trägers für Benachrichtigungsmails gelten weiterhin. Der Absender, Ratsuchende, ausgeschiedene oder
unbeteiligte Gruppenmitglieder und andere Träger erhalten diese Mail nicht. Mitgliedschaft und Ursprung
des Ereignisses müssen bei der Zustellungsprüfung aktuell sein. Wiederholte Ereignisse dürfen keine
doppelten Benachrichtigungen erzeugen.

Der Auslöser verwendet die bestehende Vorlage `neue-nachricht-beratung`, weil sie nur neutral zur
Rückkehr in ORISO auffordert. Die gemeinsame Darstellung bedeutet keine gemeinsame Einstellung für
Nachrichten von Ratsuchenden: Der Link im Mail-Fuß führt zum neuen Schalter für den internen Chat.
Dies dokumentiert die in Entscheidung 5 verlangte Ausnahme für gemeinsam verwendete Vorlagen.
Entschlüsselter Nachrichteninhalt wird nicht verwendet.

Browser-Einstellungen bleiben unabhängig. Diese Mail-Ergänzung beinhaltet keinen neuen Auslöser für
Browser-Ereignisse, keine zugesicherte Web-Push-Zustellung im Hintergrund und keine Änderung am
Aufbewahren des In-App-Verlaufs. Die offenen Fragen zur Aufbewahrung von Benachrichtigungen bleiben
im bestehenden Datenschutz-Arbeitspaket.


## Erforderliche persönliche Zustimmung zur Fallübergabe — Entscheidung vom 2026-10-08

Eine Bitte um persönliche Zustimmung muss die Person erreichen, die entscheiden soll. Für die
Bestätigung einer bereits erlaubten Weitergabe braucht es keine zusätzliche E-Mail. Frank hat
diesen Unterschied am 8. Oktober 2026 bestätigt. Er ist von der optionalen Übergabemail an die
übernehmende Beratungsperson getrennt.

| Situation | E-Mail an die ratsuchende Person | Sichtbarer Inhalt |
|---|---|---|
| Die persönliche Zustimmung ist erforderlich und noch offen; eine nutzbare aktuelle E-Mail-Adresse ist hinterlegt | Neutrale Bitte um Zustimmung unter den bestehenden Versandregeln des Trägers und Zugriffsregeln des Empfängers senden | Hinweis auf die benötigte Zustimmung und geschützter Link zur Entscheidung |
| Die Weitergabe ist bereits erlaubt, einschließlich der Kenntnisnahme beim Opt-out-Verfahren | Keine zusätzliche E-Mail mit einer Zustimmungsanfrage senden | Die bestehenden Regeln für Kenntnisnahme und Zustimmung gelten weiter |
| Keine nutzbare aktuelle E-Mail-Adresse oder Zustimmung nicht mehr offen | Keine veraltete Zustimmungsanfrage senden | Der aktuelle Antrag bleibt in der Anwendung prüfbar |

Die Anfrage nennt weder Beratungsperson noch Fall, Nachrichteninhalt oder andere persönliche
Informationen. Der Link öffnet den geschützten aktuellen Antrag. Beim Versand muss dieselbe
Person weiterhin zum Antrag gehören und noch entscheiden müssen. Eine wartende Mail darf nicht
an eine geänderte Adresse umgeleitet werden oder einen erledigten beziehungsweise widerrufenen
Antrag überleben.

Für diese erforderliche Handlung gibt es keinen zusätzlichen Übergabe-Schalter für Ratsuchende.
Die Mail darf keinen Abmeldelink zu einer nicht vorhandenen Einstellung anbieten. Im Fuß bleiben
der normale Hinweis auf eine automatische Nachricht sowie Datenschutz- und Impressumslinks.
Die optionale Bestätigung an die übernehmende Beratungsperson behält ihre bisherige Einstellung
und ihren Abmeldelink.

**Für Entwickler — Vertrag für Verfahren und Darstellung:**

```text
OPT_IN + PENDING_CLIENT_CONSENT: erforderliche persönliche Zustimmungsanfrage.
OPT_OUT / NONE: keine zusätzliche E-Mail mit Zustimmungsanfrage.
Kanonischer Anlass: uebergabe-angefragt; Katalogklasse: consent.
emailIsUnsubscribable(consent): false; keine settingsUrl/unsubscribeUrl im Fuß.
Diesen Anlass nicht als Sicherheitsmail zum Kontozugriff klassifizieren.
Versandweg, Benachrichtigungsmail-Konfiguration und OWN-Einrichtung des Trägers
sowie aktueller Empfängerzugriff werden weiterhin getrennt geprüft.
Diese Entscheidung erlaubt keine pauschale Umgehung der Trägereinstellungen.
Optionaler Anlass für die übernehmende Beratungsperson: uebergabe-bestaetigt.
```

Diese datierte Ergänzung präzisiert die Entscheidungen 1, 3, 5 und 6 für erforderliche persönliche
Zustimmung. Die historischen Messungen oben behalten ihre ursprünglichen Daten. Die Umsetzung
wird in [Frontend #1666](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/1666) und
[UserService #1376](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1376) geprüft.
Quellcode-Prüfungen, Deployment und tatsächlicher Mail-Empfang bleiben getrennte Nachweise.


## Gewöhnliche eingegangene Beratungsanfrage ablehnen — Entscheidung vom 2026-10-08

Eine Beratungsperson darf eine gewöhnliche eingegangene Anfrage ihrer Beratungsstelle ablehnen,
bevor jemand sie annimmt. Frank hat diese Umsetzung am 8. Oktober 2026 freigegeben. Sie ist von
der Ablehnung einer Fallübergabe getrennt. Die ratsuchende Person erhält einen neutralen Eintrag
in den Aktivitäten und kann den bisherigen Gesprächsverlauf lesen. Das abgelehnte Gespräch bleibt
für neue Nachrichten und Anrufe geschlossen.

| Situation | Ergebnis |
|---|---|
| Eine aktuell berechtigte Beratungsperson der Beratungsstelle bestätigt die Ablehnung | Entscheidung festhalten und Anfrage sowie Team-Besprechung für neue Beiträge schließen |
| Die ursprüngliche ratsuchende Person öffnet den Aktivitätseintrag | Abgelehnte Anfrage und lesbaren bisherigen Verlauf ohne Nachrichteneditor anzeigen |
| Dieselbe Beratungsperson wiederholt eine bereits abgeschlossene Anfrage | Abschluss ohne weitere Entscheidung oder weiteren Aktivitätseintrag bestätigen |
| Die Anfrage wurde inzwischen angenommen oder von jemand anderem abgelehnt | Aktuellen Stand laden und anzeigen, dass diese Aktion nicht abgeschlossen werden kann |
| Das Schließen des zugrunde liegenden Gesprächs scheitert | Entscheidung behalten, unvollständigen Vorgang melden und Schließen erneut versuchen; keinen Erfolg behaupten |

Die Bestätigung verlangt keine schriftliche Begründung. Weder Aktivitätseintrag noch Vorschau
nennen Beratungsperson, Fall oder Nachrichteninhalt. Es entsteht keine zusätzliche Ablehnungsmail
und kein neuer E-Mail-Schalter. Archivieren, Annehmen oder Zuweisen darf eine abgelehnte Anfrage
nicht stillschweigend wieder öffnen.

**Für Entwickler — Vertrag für Status, Zustellung und Protokoll:**

```text
POST /users/sessions/{sessionId}/rejection; operationId rejectEnquiry; ohne Request-Body.
Nur eingegangene registrierte NEW/nicht zugewiesene gewöhnliche Beratungsanfragen.
Aktuelle nicht gelöschte aktive Beratungsperson + aktuelle Träger-/Stellenberechtigung.
Status REJECTED=5 ergänzen; bestehende numerische Werte0–4 beibehalten.
TX1: Anfrage sperren, endgültige Entscheidung und unveränderliche offene Audit-Bindung speichern.
Außerhalb TX: primären und Team-Matrix-Raum als schreibgeschützt verifizieren,
einschließlich m.room.encrypted / m.room.message; Mitgliedschaften und Verlauf erhalten.
TX2: dieselbe Entscheidung bestätigen und genau einen request.denied-Eintrag atomar
für die ursprüngliche aktuell berechtigte ratsuchende Person speichern; Signal nach Commit.
204 erst nach bestätigtem Schließen. Fehler bleiben dauerhaft für begrenzte Reparatur
vorgemerkt, ohne bestätigenden Feed-Eintrag; Neustart/Instanzwechsel müssen überlebt werden.
403 unberechtigter aktueller Akteur;404 nicht verfügbare Anfrage;409 geänderter/konfliktärer Status.
Aktionspfad /sessions/user/session/{sessionId}; kein neuer Mail-Anlass oder Freitextgrund.
```

Dies ist ein freigegebener Umsetzungsvertrag. Der Quellcode wird in
[Frontend #1666](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/1666) und
[UserService #1376](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1376) umgesetzt.
Er belegt weder abgeschlossene Umsetzung noch Deployment oder tatsächliche Produktabnahme.
