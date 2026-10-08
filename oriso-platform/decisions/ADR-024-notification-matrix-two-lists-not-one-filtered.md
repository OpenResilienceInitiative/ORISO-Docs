# ADR-024: Advice seekers and counsellors get two notification lists, not one filtered list

- **Status:** Accepted — Frank, 2026-09-15
- **Implementation:** on ORISO-Frontend `dev`, but the settings route is switched off (see Implementation status)
- **Date:** 2026-09-15 (implementation status re-measured on `dev` 2026-09-22)
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-025` (how a rendered notification mail reaches the recipient); `ADR-026`
  (tenant branding contract for e-mail); EPIC `ORISO-Frontend#828`; `ORISO-Frontend#860` (this
  decision), `#871` (the settings screen), `#872` (the unsubscribe link), `ORISO-Frontend#1415`
  (mounts the screen on `dev`)
- **Scope:** which occasion reaches which recipient over which channel, and who may switch it off.
  Transport, branding and template mechanics are not in this ADR.

---

## Context

Three lists existed and none of them lined up.

1. **What is sent.** 22 occasions in the e-mail catalogue
   (`ORISO-Frontend src/emails/dist/catalogue.json`), each with an `audience` and a `class`.
2. **What is notified in-app.** The `event_notification` subsystem in UserService, categories
   `SYSTEM` and `MESSAGE`, with its own vocabulary: `inquiryAccepted`, `supervisorAdded`,
   `newClientRequest`, `threadReply`, group-chat `opened`/`reminder`/`cancelled`.
3. **What a user may switch off.** `NotificationsSettingsDTO` plus the consultant `EmailType`
   toggles — a fourth vocabulary again.

Every ORISO mail carries a "Benachrichtigungen abbestellen" link. A link that leads to a list
which does not contain the mail the reader just received is worse than no link.

The obvious move — one list, filtered by role — is what produced `appointmentNotificationEnabled`:
a switch shipped to every user with nothing behind it, because the list was owned by nobody in
particular.

The two audiences are not variants of one another. An advice seeker uses ORISO a handful of times,
in a situation they did not choose, often on a shared device, sometimes on a lock screen another
person can read. A counsellor works in it daily and needs the operational stream.

## Decision

1. **Two lists, maintained separately.** `ADVICE_SEEKER_SWITCHES` and `CONSULTANT_SWITCHES` in
   `ORISO-Frontend src/components/profile/EmailNotifications/notificationMatrix.ts`. Not one array
   with a role predicate. An occasion may appear in both and mean different things — `neue-nachricht`
   does, and it is even stored in two different places per role.

   **Advice seekers — three switches. Deliberately short.**

   | Switch | Backend field | Occasions |
   |---|---|---|
   | New message | `newChatMessageNotificationEnabled` | `neue-nachricht` |
   | Appointment | `appointmentNotificationEnabled` | `termin` |
   | Service notice | `serviceNoticeNotificationEnabled` | `systemhinweis` |

   **Counsellors — seven switches. The operational stream.**

   | Switch | Source | Occasions |
   |---|---|---|
   | New enquiry | `initialEnquiryNotificationEnabled` | `neue-anfrage`, `direkte-anfrage` |
   | Daily digest | `EmailType.DAILY_ENQUIRY` | `tagesuebersicht` |
   | New message | `EmailType.NEW_CHAT_MESSAGE_FROM_ADVICE_SEEKER` | `neue-nachricht` |
   | Assignment | `assignmentNotificationEnabled` | `anfrage-zugewiesen` |
   | Handover | `reassignmentNotificationEnabled` | `uebergabe-angefragt`, `uebergabe-bestaetigt` |
   | Feedback | `feedbackNotificationEnabled` | `rueckmeldung` |
   | Service notice | `serviceNoticeNotificationEnabled` | `systemhinweis` |

2. **Two storage mechanisms are accepted, and hidden behind one list.** Eight switches live in the
   `notificationsSettings` JSON on the user; two live as columns on the consultant, reached through
   `emailToggles`. Unifying them is a migration; presenting one coherent list over both is not.
   The `NotificationSource` union keys the field name to the generated API type on purpose — a typo
   would otherwise render a switch that saves without error and never persists.

3. **Three classes are never switchable, and the screen says so.** `security` (account access),
   `legal`, and outage notices. The catalogue enforces this: `emailIsUnsubscribable` returns false
   for `security` and `legal`, and those mails carry no unsubscribe link at all. The settings screen
   names the three categories rather than omitting them, so a reader arriving from a password-reset
   mail learns that there is no switch instead of hunting for one.

4. **A mail to an advice seeker names no counsellor and no case.** This overrides the wording of any
   equivalent counsellor mail. The counsellor's copy of the same event may be specific.

5. **An occasion without a switch is a decision, not an omission.** Twelve of the 22 occasions have
   none today. Each is either in class `security`/`legal` (never switchable) or has no sender yet.
   When a sender is built, it arrives with its row in this matrix or with a recorded reason why not.

6. **The unsubscribe link resolves to the switch for the mail it appeared in.** The footer carries
   `?mail=<occasion>`; the screen resolves it through `switchForOccasion` and highlights that row.
   A generic link to a settings page does not satisfy this ADR.

## Implementation status (measured on `dev`, 2026-09-22)

| Part | State on `dev` |
|---|---|
| Both lists (decisions 1 and 2) | **Implemented** in ORISO-Frontend `src/components/profile/EmailNotifications/notificationMatrix.ts`: `ADVICE_SEEKER_SWITCHES` (3 entries) and `CONSULTANT_SWITCHES` (7 entries), with `notificationMatrix.test.ts` pinning the counts. |
| `?mail=<occasion>` resolution (decision 6) | **Implemented** in the screen (`EmailNotifications/index.tsx` reads `mail` and calls `switchForOccasion`). |
| The screen reachable by a user | **Not yet.** The notifications entry in `src/components/profile/profile.routes.ts` carries `condition: () => false`, so the route is hidden. `ORISO-Frontend#1415` (open, base `dev`) mounts the panel under `/profile/einstellungen/email` behind the `enableNewNotifications` flag. Until it merges, an unsubscribe link has nowhere to land. |
| Citation in code | The shipped code cites this decision as **"ADR-019"** (`notificationMatrix.ts`, `notificationMatrix.test.ts`, `EmailNotifications/index.tsx`, the stories, `src/emails/content/emailCatalogue.ts`, `src/emails/content/de-sie.ts`; in UserService `NotificationSettings.java`, `OrisoEmailRenderer.java`, `WelcomeEmailService.java`, `SupervisorAddedEmailNotificationService.java`). In this series ADR-019 is media scanning. The correct reference is ADR-024. |

## Consequences

- The matrix is the contract between the catalogue and the settings screen. Adding an occasion
  without touching `notificationMatrix.ts` leaves a mail nobody can switch off.
- `appointmentNotificationEnabled` now has a row and a designed mail (`termin`) — but still no
  sender. The switch stays visible; building the sender is `ORISO-Frontend#874`.
- The in-app `event_notification` vocabulary is **not** reconciled here. Doing that is
  `ORISO-Frontend#947`, which proposes the catalogue as the shared source for e-mail, in-app and
  browser push. This ADR deliberately settles e-mail first rather than blocking on all three.
- Two audiences means two review surfaces. A change that "simplifies" them back into one list is a
  regression, and reviewers should treat it as one.

## Ordinary internal counsellor chat — implementation addendum, 2026-10-07

Frank requested notification mail when one counsellor writes to another in an ordinary internal
group, then authorized the proposed P1 implementation for v2.0.11. The independently reviewable
delivery is [UserService #1375](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1375).
This adds an explicit producer contract; it does not reclassify ordinary groups as protected
supervision feedback. The historical implementation measurements above retain their original date.

| Occasion | Recipient | Independent mail preference | Rendering |
|---|---|---|---|
| Ordinary internal-group message | Other active, currently authorized counsellor participants in the same group and tenant | `internalChatNotificationEnabled` | Neutral counsellor message template; dedicated unsubscribe selector `interne-nachricht` |

The preference follows the existing operational default: enabled unless the recipient switches it
off. The recipient's general mail preference and the tenant's notification-mail switch still gate
delivery. The sender, advice seekers, departed or unrelated group members and other tenants never
receive this mail. Membership and event origin must be current when delivery is resolved, and
replayed events must not duplicate the notification.

The producer shares the existing `neue-nachricht-beratung` template because it contains only a neutral
return-to-ORISO prompt. Sharing its rendering does not share the existing advice-seeker-message
preference: the footer resolves to the new internal-chat switch. This is the recorded shared-template
exception required by decision5. No decrypted message content is used.

Browser choices remain independent. This mail addition does not imply a new browser-event producer,
guaranteed background web push, or a change to retained in-app history. The notification-retention
governance questions remain in their existing privacy workstream.


## Required personal consent for case handover — decision addendum, 2026-10-08

A request for personal consent must reach the person who needs to decide. An acknowledgement of
an already permitted transfer does not need another email. Frank confirmed this distinction on
8 October 2026; it is separate from the counsellor's optional handover notification.

| Situation | Advice-seeker email | What the person sees |
|---|---|---|
| Personal consent is required and still pending; a usable current email address exists | Send a neutral consent request, subject to the existing tenant delivery and recipient access gates | A statement that consent is needed and a protected link to decide |
| Sharing is already permitted, including the opt-out acknowledgement mode | Do not send an additional consent-request email | The existing acknowledgement and consent rules continue to apply |
| No usable current email address, or consent is no longer pending | Do not send a stale consent request | The application remains the place to check the current request |

The request names no counsellor, case, message content or other personal information. The link
opens the protected current request. Delivery must check that the same person still owns the
request and still needs to decide; a queued message must not redirect to a changed address or
outlive a completed or revoked request.

This required-action email has no separate advice-seeker handover switch. It must not offer an
unsubscribe link leading to a control that does not exist. Its footer retains the ordinary
automated-message note and privacy/imprint links. Optional confirmation email to the receiving
counsellor keeps its existing preference and unsubscribe link.

**For developers — the mode and rendering contract:**

```text
OPT_IN + PENDING_CLIENT_CONSENT: required personal-consent request.
OPT_OUT / NONE: no additional consent-request email.
Canonical occasion: uebergabe-angefragt; catalogue class: consent.
emailIsUnsubscribable(consent): false; no settingsUrl/unsubscribeUrl in its footer.
Do not reclassify this occasion as an account-access security message.
Tenant route, notification-mail configuration, OWN setup and current recipient access
remain separately validated. This decision does not authorize tenant-wide bypasses.
Optional receiving-counsellor occasion: uebergabe-bestaetigt.
```

This dated addendum qualifies decisions 1, 3, 5 and 6 for required personal consent. The historical
measurements above keep their original dates. The implementation is being reviewed in
[Frontend #1666](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/1666) and
[UserService #1376](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1376).
Source checks, deployment and actual mail receipt remain separate evidence gates.


## Rejecting an ordinary incoming enquiry — decision addendum, 2026-10-08

A counsellor may reject an ordinary submitted agency enquiry before anyone accepts it. Frank
approved implementing this action on 8 October 2026. It is separate from refusing a case handover.
The advice seeker receives a neutral activity entry and can open the existing conversation to
read its history. The rejected conversation stays closed for new messages and calls.

| Situation | Result |
|---|---|
| A currently authorized counsellor of the enquiry's agency confirms rejection | Record the decision and close the enquiry and its team discussion for writing |
| The original advice seeker opens the activity entry | Show the rejected enquiry and existing readable history without a message composer |
| The same counsellor repeats a completed request | Confirm completion without another decision or activity entry |
| Someone already accepted the enquiry, or another counsellor rejected it | Refresh the current state and show that the requested action cannot be completed |
| Closing the underlying conversation fails | Keep the recorded decision, report the incomplete operation and retry closure; do not claim success |

The confirmation asks for no written reason. Neither the activity entry nor its preview names a
counsellor, case or message content. This decision adds no rejection email or new email switch.
Archiving, accepting or assigning the case must not silently reopen a rejected enquiry.

**For developers — state, delivery and protocol contract:**

```text
POST /users/sessions/{sessionId}/rejection; operationId rejectEnquiry; no request body.
Scope: submitted registered NEW/unassigned ordinary agency counselling enquiries.
Current nondeleted active agency counsellor + current tenant/agency authority required.
Append status REJECTED=5; preserve the existing numeric values0–4.
TX1: lock session and commit terminal decision plus immutable pending audit/bindings.
Outside TX: verify primary and team Matrix rooms are read-only, including explicit
m.room.encrypted / m.room.message overrides; retain memberships/readable history.
TX2: confirm the same immutable decision and persist one request.denied feed entry
for the original current advice seeker atomically; send a content-free nudge after commit.
204 only after confirmed closure; failures remain durable pending repair without an
affirmative feed entry. Bounded reconciliation must survive process/instance failure.
403 unauthorized current actor;404 unavailable case;409 conflicting or changed state.
Action path /sessions/user/session/{sessionId}; no new email occasion or free-text reason.
```

This is an approved implementation contract. Its source is being implemented in
[Frontend #1666](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/1666) and
[UserService #1376](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1376).
It does not establish completed implementation, deployment or actual product acceptance.
