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
