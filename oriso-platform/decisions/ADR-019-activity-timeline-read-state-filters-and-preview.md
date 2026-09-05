# ADR-019: Activity Timeline — bulk read state, data-driven family filters, read-only detail preview

- **Status:** Proposed — draft from ORISO-Frontend #1200 (analysis job), 2026-09-05. Needs product sign-off (Frank) before it is treated as canonical.
- **Date:** 2026-09-05
- **Deciders:** Frank (product) + AI (engineering) — pending
- **Related:** `ORISO-Frontend/CONTEXT.md` (Activity Timeline glossary), ADR-012 (Future Timeline / Activity Timeline sequencing), ADR-018 (one Activity Timeline entry per Erstantwort; exception to the system-notification filter), ADR-004/ADR-005 (Matrix + Megolm), the referenced-but-unpublished ADR-AT-01 "Storage & E2EE Boundary" (OrisoPlan WP-06), ORISO-Frontend issues #1200, #847, #845
- **Trigger:** The MVP showstopper report (2026-08, "Timeline view") asked three functionality questions — what the double-check button does, what status the chat embedded in the detail pane represents, and where the extended filter-button bar is — and required answers "according to the ADRs". No ADR covered them: ADR-AT-01/02/03 are cited by `CONTEXT.md` and ADR-012 but exist only in OrisoPlan, not in this repository. This ADR records the decisions the code already embodies so the questions have a citable home.

---

## Context

The Activity Timeline (aliases: Zeitstrahl, Aktivität, Notifications Center, Activity Feed) is the one central surface listing every **activity event** of the signed-in user, with a detail pane (`ORISO-Frontend/CONTEXT.md`). Events are rows in UserService `event_notification`, which is **append-only** with a single mutation, `markAsRead`; the server stores no display text and never the plaintext of a chat message (ADR-AT-01 boundary, restated in `CONTEXT.md` "Source of truth for previews"). Chat content lives in Matrix and is E2EE (ADR-004).

Verified on `OpenResilienceInitiative/ORISO-Frontend@dev` (2026-09-05):

1. The double-check button in the filter row (`notifications.center.markAllRead`, "Mark all as read") calls `PATCH /service/users/event-notifications/read-all` and then sets `readAt` on every loaded item and the unread counter to zero (`NotificationsProvider.markAllNotificationsAsRead`). It never sends Matrix read receipts.
2. The detail pane has two modes. **Details** shows the selected event's icon, client-rendered title/text, its timestamp (waiting-room events phrase it as "waiting since", #845) and, for handover consent requests, the approve/deny actions. **Conversation preview** (`ConversationPreview`, #847) renders the last 50 messages of the linked Matrix room from the app's own, already-decrypting Matrix client. It registers no active view and sends no read receipts, so viewing it changes no state anywhere. It replaced an iframe that booted a second SPA and suppressed the very `message.new` events the timeline exists to show.
3. The filter row renders one chip per **event family present in the loaded feed** (`getFamiliesInFeed`, canonical order requests → messages → drafts → handover → calls → system → appointments), an **Unread** toggle that composes with chip and search, and the bulk-read button. A dedicated "Alle" chip was removed on design feedback 2026-07-12: no selection means everything. With a sparse feed only "Requests" appears — which is exactly what the report shows and misread as a missing "extended" bar.

## Decision

1. **Bulk read is an activity-event operation only.** "Mark all as read" sets `read_at` on all of the user's `event_notification` rows via UserService `read-all`. It MUST NOT touch Matrix read receipts, chat unread badges or session state; those belong to the Matrix room timeline, which is a different thing (`CONTEXT.md` "Timeline collision"). The affordance is offered only while at least one loaded event is unread; otherwise it is disabled rather than a silent no-op (#1200). Label stays "Mark all as read"; if the overload of "notification" causes confusion, the fix is copy ("Mark all activity as read"), decided by product, not a behaviour change.
2. **The detail pane's embedded chat is a read-only preview, not the conversation.** It is hydrated client-side from the user's own Matrix sync (ADR-AT-01), shows at most the last 50 messages, never registers an active view, never sends read receipts and never changes the global **active item**. The "status" it represents is therefore: *the selected activity event's own state* (event type, read/unread, timestamp) plus *a snapshot of the room as the client currently sees it*. Acting on the conversation (reply, mark read, join a call) always goes through the event's **action target** button, which navigates to the room.
3. **Family chips are data-driven and there is no "Alle" chip.** The complete filter set is the seven event families of the descriptor registry plus the orthogonal Unread toggle and the client-side search. Chips render only for families present in the loaded feed; the empty selection is "everything". Adding a family means adding event types to the descriptor registry, not editing the toolbar. ADR-018's requirement — an exception for the Erstantwort in the filter that drops system notifications from the feed — is unaffected by this ADR.

## Consequences

- The three report questions have a citable answer; `ORISO-Frontend/CONTEXT.md` (Event family paragraph) is aligned with this ADR.
- Reviewers can test: press the button with unread activity → all cards lose their unread state, chat badges do not change; open a notification and toggle the preview → no read receipt appears in the room, the timeline card stays as it was; load a feed with only request events → a single "Requests" chip plus Unread.
- Open (deliberately not decided here): whether ADR-AT-01/02/03 are published into this repository; whether the timeline's Drafts family replaces `DraftsCenter` (`CONTEXT.md`); a server-side cross-device read-state sync beyond `read-all`.

## Alternatives considered

- **Always render all seven chips.** Rejected: five permanently inert chips on a typical feed, and "appointments" has no event types yet.
- **Make the preview interactive (send, read receipts).** Rejected: it would duplicate the conversation view, register an active view and suppress the timeline's own events (#847), and blur the active-item invariant.
- **Let "Mark all as read" also clear chat unread badges.** Rejected: crosses the Matrix boundary; read receipts are per-room facts owned by the room timeline.
