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
