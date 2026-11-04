# DSFA-Tiefenbohrung 3: Notification-Center / `event_notification` (UserService)

Stand: 2026-08-14 · Repos: ORISO-UserService, ORISO-Frontend, ORISO-Kubernetes · Alle Zeilenangaben aus dem aktuellen Arbeitsstand.

## 0. Kernbefund in einem Satz

Die Tabelle `event_notification` speichert **keinen Chat-/Beratungsinhalt** (Preview-Modus ist auf allen Ebenen fest `NONE`), wohl aber ein **vollständiges Kommunikations-Metadatenprofil in Klartext** (wer, mit wem, wann, zu welchem Thema, gelesen wann) — und in genau einer Event-Familie (**Case Handover**) fließt **berater-verfasster Freitext** („Explanation") in die Klartextspalte `text`, was der einzige echte Inhalts-Leak ist.

---

## 1. Vollinventar

### 1.1 Tabelle (Schema)

`ORISO-UserService/src/main/resources/db/changelog/changeset/0048_add_event_notifications/addEventNotificationTable.sql` (+ `0054` params, `0063` deduplication_key):

| Spalte | Typ | DSFA-Relevanz |
|---|---|---|
| `recipient_user_id` | VARCHAR(64) | Keycloak-UUID des Empfängers (Ratsuchende UND Berater) |
| `event_type` | VARCHAR(100) | z. B. `message.new`, `case.handover.granted` |
| `title`, `text` | VARCHAR(255) / TEXT | **Klartext**, serverseitig formatiert, engl. Anzeigetexte |
| `params` | TEXT (JSON) | strukturierte Metadaten (ADR-AT-01), nullable |
| `action_path` | VARCHAR(512) | Deep-Link inkl. **Matrix-Raum-ID + Session-ID** |
| `source_session_id` | BIGINT | Verknüpfung zur Beratungssession |
| `read_date` | DATETIME | **Lese-Zeitstempel pro Notification = Aktivitätsprofil** |
| `create_date` | DATETIME | Kommunikationszeitpunkt |
| `tenant_id` | BIGINT | Mandant (Hibernate-Tenant-Filter, `EventNotification.java:38–43`) |

Entity: `src/main/java/de/caritas/cob/userservice/api/model/EventNotification.java:60–94`. Die Tabelle liegt in derselben MariaDB wie die übrigen UserService-Daten — direkt „neben" dem E2EE-Chat (dessen Inhalte in Synapse/Matrix verschlüsselt liegen).

### 1.2 Event-Typen und was konkret drinsteht (Code-Belege)

Alle Produzenten laufen durch `EventNotificationService` (`service/notification/EventNotificationService.java`). Zentraler Builder: `buildEvent(...)` Z. 674–699.

| Event-Typ | Produzent (Flow) | `title` / `text` (wörtlich aus dem Code) | `params` | Inhalt oder Metadaten? |
|---|---|---|---|---|
| `inquiry.accepted` | `AssignEnquiryFacade.java:97,115` → `createInquiryAcceptedNotification` (Svc Z. 63–81) | „Inquiry accepted" / `"Your request was accepted by %s. Chat is now active."` (**Beratername**) | `sessionId`, `consultantName` | Metadaten + Personenname |
| `message.new` | Matrix-Sync `MatrixEventListenerService.java:529–534` + Client-POST `EventNotificationController.java:71–119` | „New message" / bei Modus NONE: `"%s sent a new message."` (Svc Z. 784–803) — **kein Nachrichteninhalt** | `sessionId`, `senderName`, `contentClass` (IMAGE/FILE/…), `recipientRole` (Svc Z. 271–281: „NEVER the message preview/body") | Metadaten |
| `thread.reply.new` | dito (Svc Z. 440–502) | „New thread reply" / NONE: `"%s replied in a thread."` | + `threadRootId` | Metadaten |
| `team.discussion.new` | `TeamDiscussionNotificationService.java:122–133`, Text Z. 209–213 | „Team discussion" / `"%s posted in the team discussion"` | `sessionId`, `roomId`, `senderDisplayName`, `mentioned` (Z. 215–223) | Metadaten |
| `request.new` | `CreateEnquiryMessageFacade.java:194` → Svc Z. 182–214 | „New client request" / statisch `"A new client request is waiting."` | `sessionId`, `agencyId`, **`topicId` (= Beratungsthema!)**, `consultingTypeId` (Svc Z. 259–269) | Metadaten, aber Themen-ID ist ein **inhaltlicher Kategorienhinweis** (z. B. Sucht, Schwangerschaft) |
| `waiting_room.client.joined` | `AnonymousConversationCreatorService.java:137` → Svc Z. 224–257 | statisch „A client is waiting in the live chat." | wie `request.new` | Metadaten (+ topicId) |
| `supervisor.added/.assigned/.removed` | `SessionSupervisorController.java:131,148,189` → Svc Z. 83–144 | z. B. `"%s was added as a consultant supervisor to your chat #%s."` (Supervisorname) | `sessionId`, `supervisorName` | Metadaten + Personenname |
| `counselor.renamed` | `ConsultantUpdateService.java:251` → Svc Z. 146–170 | `"Your counselor display name changed from \"%s\" to \"%s\" at %s UTC."` | `sessionId`, `oldName`, `newName` | Metadaten + Namen |
| `group_chat.opened/.reminder/.cancelled` | `GroupChatLifecycleNotificationService.java:117` (Enum Z. 187–193) | statische Texte („A group chat is now available.") | `seriesId`, `occurrenceIndex`, `occurrenceStart`, `roomRef`, `callRoomId`, `isVideo`; idempotent via `deduplication_key` | Metadaten |
| `conversation.finished` | `SendFinishedAnonymousConversationEventActionCommand.java:39–47` | statisch „The anonymous conversation has ended." | **keine (params=null, Legacy)** | Metadaten |
| `case.handover.granted` | `CaseHandoverService.java` `notifyGranted` (~Z. 714–751) | `"%s took over your case. Reason: %s. Explanation: %s"` — **`request.getExplanation()` = Freitext des anfragenden Beraters** | **keine (8-arg-`createEvent`, Legacy)** | ⚠️ **potentiell Beratungsinhalt** |
| `case.handover.consent.requested` | dito `notifyPendingConsent` (~Z. 800–822) | `"%s requested access to your case. Reason: %s. Explanation: %s"` — **Freitext-Explanation** | **keine (Legacy)** | ⚠️ **potentiell Beratungsinhalt** |
| `case.handover.consent.declined` | dito `notifyConsentDeclined` (~Z. 824–843) | `"Client consent was declined for case #%s. Reason: %s"` (nur ReasonLabel) | **keine (Legacy)** | Metadaten |

Call-Events (`m.call.invite/answer/hangup`, `MatrixEventListenerService.java:738–790`) werden **nur geloggt**, es entstehen keine `event_notification`-Zeilen (die i18n-Keys `callStarted` etc. sind vorgeseedet, Writer fehlt).

### 1.3 Enthält es Beratungs-Inhalte?

- **Chat-Nachrichten: Nein.** Der Preview-Modus (`privacy.notificationPreviewMode`, Svc Z. 59–60, Modi NONE/MASKED/FULL Z. 1005–1009) steht überall auf NONE: Default `application.properties:359` (`${PRIVACY_NOTIFICATION_PREVIEW_MODE:NONE}`), Deployment `ORISO-Kubernetes/helm/charts/userservice/values.yaml:68` (`notificationPreviewMode: "NONE"`). Bei NONE wird der Preview-Parameter komplett ignoriert (Z. 788–790).
- **E2EE-Pfad kann gar nicht leaken:** `m.room.encrypted`-Events haben kein `body`; der Listener verarbeitet nur Sender + Event-ID (`MatrixEventListenerService.java:431–435`, Kommentar: „the payload is opaque … metadata-only notification pipeline"). Das Frontend sendet bei Matrix-Räumen explizit `messagePreview: ''` (`ORISO-Frontend/src/api/apiPostMessageEventNotification.ts:41–46`, `canIncludePlaintextPreview = matrixRoom === false`).
- **Aber zwei latente Kanäle existieren:**
  1. `POST /users/event-notifications/message-events` akzeptiert `messagePreview`/`threadParentPreview` vom Client (`EventNotificationController.java:175–248`); der Legacy-Pfad (Nicht-Matrix-Raum) schickt bis zu 100 Zeichen Klartext. Nach der Matrix-Only-Migration praktisch tot, aber der Code-Pfad lebt.
  2. Eine einzige Env-Variable (`PRIVACY_NOTIFICATION_PREVIEW_MODE=FULL`) würde künftig übermittelte Previews persistieren (Z. 794–796). Kein Code-Deploy nötig — reiner Config-Flip.
- **Echter Ist-Leak: Case-Handover-`Explanation`** (Freitext, vom Berater geschrieben, kann Fallinhalt referenzieren: „Klientin X wechselt wegen …") landet in `text` — Klartext, unbefristet.

### 1.4 Wer liest? Löschung/Retention?

Endpunkte (`EventNotificationController.java`, Basis `/users/event-notifications`): `GET` Feed (Z. 35–41), `PATCH {id}/read` (43), `PATCH read-all` (49), `DELETE` (55, löscht den eigenen Feed via `clearFeed` → `deleteByRecipientUserId`, Svc Z. 552–555), `PATCH active-view` (61), `POST message-events` (71), `PATCH conversation-level` (125). **Alles strikt self-scoped** über `authenticatedUser.getUserId()` — es gibt keinen Admin-/Fremdzugriff-Endpunkt. Der Feed liefert `title`, `text`, `params`, `readAt`, `createdAt` 1:1 aus (Svc `toItem`, Z. 701–720).

**Retention: keine.**
- Kein Purge-/Aufbewahrungsjob (Repo `EventNotificationRepository.java` hat nur die 6 Self-Scope-Queries; keine `deleteByCreateDateBefore`-Methode existiert).
- Die **Account-Löschworkflows** (`workflow/delete/service/*`: `DeleteUserAccountService`, `DeleteSessionService`, …) **fassen `event_notification` nicht an** — `deleteByRecipientUserId` wird ausschließlich vom nutzergetriebenen `clearFeed` aufgerufen. Nach Kontolöschung bleiben die Zeilen (mit Keycloak-UUID, Session-IDs, Zeitstempeln, Namen Dritter im Text) **unbegrenzt** stehen.
- `read_date` ist ein sekundengenauer Lese-Zeitstempel je Notification → rekonstruierbares Aktivitäts-/Anwesenheitsprofil des Ratsuchenden. (Die Active-View-Heartbeats selbst sind nur in-memory, TTL 30 s, Svc Z. 47, 55, 890–917 — unproblematisch.)

---

## 2. Stand der params-Migration ({{key}} / clientseitiges i18n-Rendering)

**Backend (Dual-Write):** Seit WP-06/ADR-AT-01 schreiben fast alle Produzenten `params` **zusätzlich** zu `title`/`text` (Entity-Kommentar `EventNotification.java:67–72`: „Additive for now … until the frontend renders purely from params and the display-text columns are dropped"). Die Spalte kam additiv mit `0054_event_notification_params/addEventNotificationParams.sql`.

- **params-befüllt (10 Typen):** `inquiry.accepted`, `message.new`, `thread.reply.new`, `team.discussion.new`, `request.new`, `waiting_room.client.joined`, `supervisor.added/.assigned/.removed`, `counselor.renamed`, `group_chat.opened/.reminder/.cancelled`.
- **Legacy ohne params (4 Typen):** `case.handover.granted`, `case.handover.consent.requested`, `case.handover.consent.declined` (alle `CaseHandoverService`), `conversation.finished` — sie nutzen die 8-Argument-`createEvent`-Überladung (Svc Z. 577–597, setzt `params=null`).

**Frontend (weit fortgeschritten):** Die Registry (`ORISO-Frontend/src/components/notificationsCenter/eventDescriptors/registry.ts`) seedet **alle** Typen inkl. der 4 Legacy-Typen mit i18n-Templates (`notifications.events.<key>.title/.text`); `de/common.json` enthält alle 32 Key-Familien (geprüft: `messageNew`, `caseHandoverGranted`, `teamDiscussionNew`, …). Das Rendering (`renderEventStrings.ts:39–54`) nutzt den Server-Text **nur noch als i18n-`defaultValue`-Fallback** („Migration bridge: … When the server stops sending text, the templates become the sole source"). Ein deutschsprachiger Nutzer sieht also heute schon die deutschen i18n-Texte, nicht die gespeicherten englischen Server-Strings — der Server-Klartext ist funktional fast tot.

**Restlücken:**
1. `NotificationsCenter.tsx:112–115` übergibt **keine Interpolation aus `params`** an `renderEventStrings` — Templates mit `{{senderDisplayName}}` (z. B. `teamDiscussionNew` in `de/common.json`) rendern derzeit ohne Namen bzw. mit rohem Platzhalter. Die {{key}}-Interpolation ist verdrahtet vorbereitet, aber nicht angeschlossen.
2. Die 4 Legacy-Typen haben serverseitig keine params (Case Handover bräuchte `requesterName`, `reasonCode`; die mehrsprachigen Templates existieren teils schon serverseitig als `client_notification_templates` JSON auf `case_handover_reason_policy`, Changeset `0069`, mit `{{newAdvisor}}`-Syntax — aber nur für die Chat-Systemnachricht, nicht für die event_notification).
3. Der Server schreibt und liefert `title`/`text` weiterhin; die Spalten sind nicht abgeschaltet, nicht geleert, nicht gedroppt.

---

## 3. Optionen: Bewertung + Aufwand

### (a) params-only-Migration abschließen — **empfohlen, primärer Fix**

Klartext gar nicht erst speichern schlägt jede Verschlüsselung (Datenminimierung Art. 5 Abs. 1 lit. c DSGVO). Konkreter Restaufwand:

1. **Case-Handover-Producer umbauen** (`CaseHandoverService`): params (`requesterName`, `reasonCode`, `sessionId`) statt formatiertem Text; **`explanation` komplett aus der Notification entfernen** — sie ist über den bestehenden Handover-Request-API-Abruf (`caseHandoverRequestId` steckt schon im `action_path`) on-demand verfügbar. ~0,5–1 PT inkl. Tests.
2. `conversation.finished` auf params-Überladung heben (trivial, params `{sessionId}`). ~0,1 PT.
3. **Frontend-Interpolation anschließen** (`NotificationsCenter.tsx`: geparste `params` als `interpolation` an `renderEventStrings` geben) + fehlende i18n-Keys je Locale prüfen (bekanntes ~180-de-Keys-Thema separat). ~0,5–1 PT.
4. **Server hört auf, `title`/`text` zu befüllen** (Feature-Flag oder direkt: `buildEvent` schreibt `NULL`/leer; `toItem` liefert sie nicht mehr) — erst nach 3. deployen. ~0,5 PT.
5. **Bestandsdaten bereinigen:** einmaliges `UPDATE event_notification SET title='', text=NULL` (Liquibase-Changeset, `runOnChange`-Falle beachten; auf Pre-Dev ggf. per Hand wegen deaktiviertem Liquibase), später Spalten-Drop. ~0,5 PT.

**Summe: ~3–4 PT.** Danach steht in der DB nur noch: Empfänger, Typ, params-Metadaten, Pfad, Zeitstempel.

### (b) At-rest-Verschlüsselung der Spalten — nachrangig

Technisch einfach (JPA-`AttributeConverter` mit AES-GCM auf `title`/`text`/`params`; Key als K8s-Secret; **Suchbarkeit unkritisch**, da kein Repository-Query je auf diese Spalten filtert — nur auf `recipient_user_id`/`read_date`/`deduplication_key`). Aufwand ~2–3 PT + Key-Rotation-Konzept. **Aber:** Sie schützt nur gegen DB-Dump/Backup-Zugriff; App-Prozess, API-Response und Logs sehen weiterhin Klartext, und die eigentlich problematischen Daten (Metadatenprofil) blieben erhalten. Als Ersatz für (a) ungeeignet; als Defense-in-Depth ist Volume-/TDE-Verschlüsselung der gesamten MariaDB (Ops-Thema, Neusta) der sinnvollere Hebel als Spaltenkrypto.

### (c) Datenminimierung read_date + Retention — **empfohlen, zweiter Fix**

1. **Retention-Job** (Spring `@Scheduled`, analog `InactiveAccountNotificationScheduler`): löschen gelesener Notifications nach z. B. 90 Tagen, aller nach 365 Tagen (`deleteByReadDateBefore` / `deleteByCreateDateBefore`). ~0,5 PT.
2. **Löschworkflow-Anschluss:** `DeleteUserAccountService`/`DeleteSessionService` rufen `deleteByRecipientUserId` (existiert schon) — schließt die DSGVO-Art.-17-Lücke. ~0,5 PT.
3. Optional: `read_date` auf Tagesgranularität kappen oder durch `is_read`-Boolean ersetzen (Aktivitätsprofil entschärfen; `unreadCount`-Query bleibt funktionsgleich). ~0,5–1 PT.

**Summe: ~1,5–2 PT.**

### Empfehlung

**(a) + (c) umsetzen (zusammen ~5–6 PT), (b) nicht als Spaltenkrypto, sondern als Ops-seitige Plattenverschlüsselung adressieren.** Zusätzlich zwei Härtungen quasi gratis: den `FULL`/`MASKED`-Preview-Modus aus dem Code entfernen (der Config-Flip-Kanal verschwindet, ~0,5 PT) und das `messagePreview`-Feld im `POST message-events`-DTO serverseitig ignorieren/ablehnen.

---

## 4. DSFA-Formulierungsvorschlag (Ist-Zustand)

> **Verarbeitung: In-App-Benachrichtigungen („Zeitstrahl"/Notification-Center).**
> Der UserService persistiert je Benachrichtigungsereignis einen Datensatz in der Tabelle `event_notification` (MariaDB, mandantengetrennt per Tenant-Filter). Gespeichert werden: Empfänger-Pseudonym (Keycloak-UUID), Ereignistyp, Erstell- und Lesezeitpunkt, Session-Referenz, ein Deep-Link (inkl. Matrix-Raum-Kennung) sowie serverseitig formatierte Anzeigetexte (`title`, `text`) und strukturierte Metadaten (`params`) im Klartext.
> **Inhalte der Beratungskommunikation werden nicht gespeichert:** Nachrichtentexte aus der Ende-zu-Ende-verschlüsselten Chat-Kommunikation erreichen die Benachrichtigungspipeline konstruktionsbedingt nicht (verschlüsselte Matrix-Events tragen keinen Nachrichtenkörper); der konfigurierbare Vorschau-Modus ist in allen Umgebungen fest auf „NONE" gesetzt, sodass auch clientseitig übermittelte Vorschautexte verworfen werden. Gespeichert werden jedoch **Kommunikations-Metadaten** (wer hat wem wann in welcher Session geschrieben, Inhaltstyp der Nachricht, Anzeigenamen von Beratenden, bei neuen Anfragen die Themen-Kategorie der Beratung) sowie bei Fallübergaben derzeit auch ein **von Beratenden verfasster Freitext zur Begründung**, der im Einzelfall Rückschlüsse auf Beratungsinhalte zulassen kann.
> Der Zugriff ist auf den jeweiligen Empfänger beschränkt (kein administrativer Lesezugriff über die API). Betroffene können ihren Feed selbst vollständig löschen. **Eine automatische Lösch-/Aufbewahrungsfrist besteht derzeit nicht; die Datensätze werden bei Kontolöschung nicht mitgelöscht.** Der Lesezeitpunkt wird sekundengenau je Benachrichtigung gespeichert und ermöglicht ein Nutzungs-/Anwesenheitsprofil.
> **Geplante Abhilfemaßnahmen:** (1) Abschluss der laufenden Migration auf rein clientseitig gerenderte Benachrichtigungstexte (i18n-Templates), wodurch die Klartext-Anzeigetexte einschließlich des Fallübergabe-Freitexts serverseitig vollständig entfallen; (2) Einführung einer Regel-Aufbewahrungsfrist mit automatischem Löschlauf und Anbindung an den Konto-Löschworkflow; (3) Reduktion des Lesezeitstempels auf ein Gelesen-Kennzeichen.

---

## Anhang: zentrale Fundstellen

- Entity: `ORISO-UserService/src/main/java/de/caritas/cob/userservice/api/model/EventNotification.java:60–94`
- Service (alle Producer-Helfer, Preview-Modi, Feed): `…/api/service/notification/EventNotificationService.java` (Preview-Logik 784–858, params-Doku 271–281, buildEvent 674–699, clearFeed 552–555)
- Matrix-Listener (E2EE-metadata-only): `…/api/service/matrix/MatrixEventListenerService.java:430–437, 518–543`
- Controller (self-scoped, Client-Preview-DTO): `…/api/adapters/web/controller/EventNotificationController.java:35–119, 175–248`
- Case-Handover-Leak: `…/api/service/CaseHandoverService.java` (`notifyGranted`, `notifyPendingConsent`)
- Config: `application.properties:353–359`; `ORISO-Kubernetes/helm/charts/userservice/values.yaml:68`; Redis-Debug-Mirror default aus (`application.properties:353`)
- Frontend: `ORISO-Frontend/src/api/apiPostMessageEventNotification.ts:41–56`; `src/components/notificationsCenter/eventDescriptors/{registry.ts,renderEventStrings.ts}`; `NotificationsCenter.tsx:107–117`; i18n `src/resources/i18n/de/common.json` → `notifications.events.*` (32 Familien vollständig)
- Migrations: `db/changelog/changeset/0048…/addEventNotificationTable.sql`, `0054…/addEventNotificationParams.sql`, `0063…/addEventNotificationDeduplication.sql`
