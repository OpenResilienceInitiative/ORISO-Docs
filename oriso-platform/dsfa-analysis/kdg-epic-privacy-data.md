# EPIC DRAFT — Privacy data-household cleanup (KDG/GDPR) · target repo: **ORISO-UserService**

> **Planning draft only — nothing has been posted to GitHub.**
> Prepared 2026-08-14 from the DSFA backend inventory (`dsfa-inventar-backend.md`) and the
> notification-center deep-dive (`dsfa-deepdive-notification-center.md`), verified against the
> current code and Helm state.

**Proposed title:** `EPIC: Privacy data-household cleanup — plaintext minimisation, retention, and deletion-workflow completeness (KDG/GDPR)`

---

## Draft epic body (English, client-facing)

```markdown
## Why

The data-protection impact assessment (DSFA, August 2026) confirmed that counselling **content**
is well protected: chat is end-to-end encrypted, notification previews are hard-disabled
(`NONE` on every level), and admin statistics use small-cell suppression. What remains is a set
of *data-household* gaps — plaintext metadata that outlives its purpose, tables without any
retention, and rows that survive account deletion. None of these is an active leak of
counselling content, with one exception (case-handover free-text, task 1); all of them are
findings a KDG/GDPR audit would raise. This epic closes them as one coherent package.

Design principle throughout: **not storing plaintext beats encrypting it**
(data minimisation, Art. 5(1)(c) GDPR / § 7 KDG).

## Scope — ordered task checklist

### 1. `event_notification`: finish the params-only migration (M, ~3–4 d)
The notification feed already renders from client-side i18n templates; the stored English
`title`/`text` columns are a legacy bridge. One real content leak remains: the case-handover
"explanation" free-text (written by counsellors, can reference case content) is persisted
verbatim into `text`, indefinitely.
- [ ] **1a** Convert the 4 legacy producers to `params` and **remove `explanation` from
      notifications entirely** — it stays available on-demand via the handover-request API
      (`caseHandoverRequestId` is already in `action_path`).
      File: `api/service/CaseHandoverService.java` (`notifyGranted`, `notifyPendingConsent`,
      `notifyConsentDeclined`) + `SendFinishedAnonymousConversationEventActionCommand.java`.
      *Accept:* no `event_notification` row contains counsellor free-text; params carry
      `requesterName`, `reasonCode`, `sessionId`. (S–M)
- [ ] **1b** Frontend: pass parsed `params` as interpolation into `renderEventStrings`
      (`ORISO-Frontend/src/components/notificationsCenter/NotificationsCenter.tsx:112–115`)
      and verify the i18n keys per locale.
      *Accept:* `{{senderDisplayName}}`-style templates render with real values. (S)
- [ ] **1c** Server stops writing/serving `title`/`text` (deploy after 1b).
      File: `api/service/notification/EventNotificationService.java` (`buildEvent`, `toItem`).
      *Accept:* new rows have empty display-text columns; feed responses render correctly from
      params alone. (S)
- [ ] **1d** Backfill: one-off `UPDATE event_notification SET title='', text=NULL` (Liquibase;
      pre-dev may need manual execution), column drop as a later follow-up.
      *Accept:* no historical plaintext remains. (S)
- [ ] **1e** Hardening (near-free): remove the `FULL`/`MASKED` preview modes from the code so a
      config flip can never persist message previews, and ignore/reject the `messagePreview` /
      `threadParentPreview` fields in `POST /users/event-notifications/message-events`.
      Files: `EventNotificationService.java` (preview logic), `EventNotificationController.java`.
      *Accept:* no configuration or client input can place message content in the table. (S)

### 2. `event_notification`: retention + deletion workflow (S–M, ~1.5–2 d)
Today: no retention job, and account deletion does **not** remove a user's notification rows
(Keycloak UUID, session IDs, timestamps, third-party names persist indefinitely; `read_date` is
a per-notification second-precision read receipt = activity profile).
- [ ] **2a** Scheduled retention job (pattern: `InactiveAccountNotificationScheduler`): delete
      read notifications after N days, all after M days (defaults proposed: 90/365 —
      see Decisions). *Accept:* rows age out automatically; covered by tests. (S)
- [ ] **2b** Hook `deleteByRecipientUserId` (exists already, used by user-facing `clearFeed`)
      into `workflow/delete/service/DeleteUserAccountService`.
      *Accept:* after account deletion, zero `event_notification` rows for that user. (S)
- [ ] **2c** Reduce `read_date` to day granularity or an `is_read` boolean (the `unreadCount`
      query is unaffected). *Accept:* no per-second read profile reconstructable. (S)

### 3. Invite emails: Art. 14 information duty (M)
Admins invite counsellors via CSV import; invitees are data subjects whose personal data
(email, first/last name → `account_invite`) was obtained from a third party, which triggers the
Art. 14 GDPR / § 15 KDG information duty. Today the invite mail is an admin-authored template
(`invite_email_template`) rendered into the branded layout; the footer shows imprint/privacy
links **only if** the tenant branding provides them (`BrandedEmailLayoutRenderer.java:157–170`)
— nothing guarantees a privacy notice reaches the invitee.
- [ ] **3a** Make the privacy-policy link a guaranteed, non-removable part of every invite mail
      (fallback chain when tenant branding has no URL; block send or use platform default —
      see Decisions). Files: `api/service/email/layout/BrandedEmailLayoutRenderer.java`,
      `api/service/accountinvite/mail/InviteMailDispatchService.java`.
      *Accept:* every invite mail contains a working privacy-notice link regardless of template
      content or tenant configuration. (M)
- [ ] **3b** Add a fixed Art.-14 short-notice block (controller, purpose, data source =
      "your organisation provided your contact data", rights, link to full notice) to the invite
      layout, outside admin-editable template text; wording supplied by legal (see Decisions).
      *Accept:* block present in all invite kinds incl. CSV bulk import; visible in the Admin
      preview endpoint / Storybook email previews. (M)

### 4. `invite_email_delivery`: stop archiving full mail bodies forever (S)
The delivery log snapshots subject, recipient, and the **complete rendered mail body**
(LONGTEXT) per send, with no expiry (`api/model/InviteEmailDelivery.java`).
- [ ] **4a** Retention job: after N days, null out `body_snapshot` (and optionally
      `subject_snapshot`), keeping status/failure metadata for support; delete rows entirely
      after M days. *Accept:* no mail body older than N days exists in the table. (S)

### 5. Deletion-workflow completeness: `draft_message` (+ consistency check) (S)
The account-deletion workflow (`workflow/delete/service/DeleteUserAccountService.java:72–106`)
erases Keycloak, Matrix (erase+purge), sessions, and the user row — but leaves
`draft_message` (plaintext draft text — the only place counselling content sits unencrypted
server-side), `event_notification` (task 2b), `consultant_message_stat` (task 6), and
`invite_email_delivery` behind.
- [ ] **5a** Delete `draft_message` rows in both asker and consultant deletion chains.
      *Accept:* post-deletion, zero draft rows for the deleted account; workflow tests extended. (S)
- [ ] **5b** Add a regression test asserting the full set of user-keyed tables touched by the
      deletion workflow, so future tables cannot silently opt out. (S)

### 6. `consultant_message_stat`: retention + `source_session_id` (S–M)
One row per counsellor message: HMAC-pseudonymised consultant ID, but `source_session_id` in
plaintext next to it re-identifies via a join against `session`; no retention, no deletion on
consultant or session deletion (`api/model/ConsultantMessageStat.java`,
`service/statistics/ConsultantMessageStatService.java`).
- [ ] **6a** Retention: aggregate or delete rows older than the statistics reporting horizon
      (proposal: keep 24 months, see Decisions). (S)
- [ ] **6b** Decide + implement `source_session_id` handling: drop the column, or null it after
      a short window once session-level drill-down is no longer needed.
      *Accept:* stored stats can no longer be joined back to individual sessions beyond the
      agreed window. (S–M)
- [ ] **6c** Hook into consultant-deletion workflow (delete or fully de-link rows). (S)

### 7. Statistics events without a known consumer + RabbitMQ transport (M)
**Verified 2026-08-14:** `UserService` publishes to RabbitMQ exchange `statistics.topic`
(REGISTRATION carries plaintext `userId` + age + gender + postalCode + topic + referer —
a quasi-identifier set), and ORISO-Helm sets `statisticsEnabled: "true"` in
`values.yaml.default` → `STATISTICS_ENABLED=true` in deployed environments, **but no consumer
exists anywhere**: no `@RabbitListener` in any of the six repos, no statistics-service
deployment in any Helm template. The events are published into the void — pure risk, zero
benefit. RabbitMQ runs plaintext AMQP on 5672 (no TLS). There is also no "forget" event on
account deletion (DELETE_ACCOUNT itself carries the userId).
- [ ] **7a** Confirm with the operator (Neusta) that no out-of-cluster consumer exists, then
      **disable publishing** (`statisticsEnabled: "false"` in ORISO-Helm values) until a real
      consumer with a DSFA chapter exists. (S)
- [ ] **7b** If/when statistics resume: minimise the REGISTRATION payload (pseudonymous ID
      instead of Keycloak userId; drop referer; coarsen postcode/age) and define consumer-side
      retention before re-enabling. (M, gated on decision)
- [ ] **7c** Enable TLS for RabbitMQ (AMQPS 5671) in ORISO-Helm, or document the compensating
      control (cluster-internal network policy) in the DSFA. (S–M)

## Out of scope
- At-rest column encryption for `event_notification` — rejected in the deep-dive in favour of
  minimisation (this epic) + ops-level disk/TDE encryption (operator topic).
- The ~180 missing de i18n keys (existing separate topic) — task 1b only verifies the
  notification keys it touches.
- Downstream StatisticsService implementation — no such service exists; task 7 removes the
  dangling producer instead.

## Existing issues to link (found via org-wide search, 2026-08-14)
- ORISO-Frontend#251 (WP-06 timeline foundations — descriptor registry this epic builds on)
- ORISO-Frontend#924 (Activity Timeline: dynamic E2EE previews — client-side rendering line, task 1b adjacency)
- ORISO-UserService#961 (activity events: opaque Matrix event ID — same subsystem, coordinate)
- ORISO-Frontend#478 (draft.created client-only decision — related to `draft_message`, task 5)
- ORISO-UserService#983 (clean up empty draft rows — task 5 adjacency)
- ORISO-UserService#859 (asker hard delete leaves user row behind — same deletion workflow, task 5)
- ORISO-UserService#134 (US-C05 debug Redis mirror plaintext — related plaintext finding, separate fix)
- ORISO-UserService#890 ([TEN-INV-U6] SENT only after confirmed delivery — touches `invite_email_delivery`, task 4)
- ORISO-Admin#585 (Storybook email preview for invite templates — surface for task 3b acceptance)
- ORISO-UserService#527 (tutorial statistics small-cell decision — statistics governance context, task 7)
- ORISO-Frontend#860 (ADR: notification matrix — channel governance context for tasks 1–2)

No existing issue covers any of tasks 1–7 directly; this epic is not a duplicate.

## Decisions needed (before implementation)
1. **Retention periods** — proposal: `event_notification` 90 d read / 365 d absolute;
   `invite_email_delivery` bodies 30 d, rows 12 months; `consultant_message_stat` 24 months.
   Needs sign-off from the client / data-protection officer.
2. **Statistics events (task 7a)** — switch off entirely (recommended: no consumer exists) vs.
   keep publishing minimised events for a future statistics service. Requires operator
   confirmation that nothing outside the six repos consumes `statistics.topic`.
3. **Art.-14 wording (task 3b)** — legal text must come from the client/DPO; engineering ships
   the mechanism. Fallback behaviour when a tenant has no privacy URL: block invite sending vs.
   platform-default notice.
4. **`read_date` (task 2c)** — day granularity vs. boolean; any product need for exact read
   times in the timeline UI?
5. **`source_session_id` (task 6b)** — drop vs. time-boxed nulling; does any statistics
   requirement need session-level drill-down?
6. **RabbitMQ TLS (task 7c)** — in-cluster AMQPS vs. documented network-policy compensating
   control; align with operator (Neusta) responsibility split.

## Effort summary
Tasks 1+2 ≈ 5–6 d · task 3 ≈ 2–3 d · task 4 ≈ 1 d · task 5 ≈ 1 d · task 6 ≈ 1–2 d ·
task 7 ≈ 1–2 d (excl. gated 7b). **Total ≈ 11–15 person-days**, independently shippable slices
in the order listed (1a/1e first: they remove the only content-bearing plaintext).

## Affected repos
ORISO-UserService (primary), ORISO-Frontend (task 1b), ORISO-Helm (tasks 7a/7c),
ORISO-Admin (task 3 preview surfaces)
```
