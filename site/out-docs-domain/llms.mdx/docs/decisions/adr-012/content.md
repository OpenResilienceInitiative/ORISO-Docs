# ADR-012: Self-Help Group Chat — extend the existing Group Chat (don't rebuild), Megolm-first, future-timeline instead of a Lobby (/decisions/adr-012)



* **Status:** Accepted — 2026-07-09; reconciled with live GitHub/code 2026-07-10
* **Date:** 2026-07-09
* **Deciders:** Frank (product + frontend) + AI (backend/architecture)
* **Related:** `ADR-004-chat-keep-custom-ui-adopt-matrix-sdk-megolm.md` (hard prerequisite — real Megolm), `ADR-005-matrix-federation-off-dns-server-name.md` (clean homeserver rebuild before Megolm), WP-06 Activity Timeline (ADR-AT-01/02/03), `ORISO-Frontend/CONTEXT.md` (`Self-Help Group Chat & Lobby` glossary)
* **Reference material:** `/Volumes/Netzwerkordner/001 - Archive/Step 1.png`, `Step 2.png`, `Step 4.png`, `Step 5.png`, `Step 6.png`, and `Step 7Main problem -_ repeated chats must be deleted manually.png`
* **Implementation tracker:** `OpenResilienceInitiative/ORISO-Frontend#396`

## Implementation status — 2026-07-11 [#implementation-status--2026-07-11]

* Core implementation is merged into `pre-dev`: Frontend #402/#407, UserService #376/#381, and TenantService #72.
* Real-browser PreDev PASS covers Megolm text/reload, a finite weekly rollover, planned close, numeric invite/registration/assignment/join, encrypted asker messaging, dedicated two-party audio, and two-party video.
* `dev` promotion remains under human review in Frontend #406 and UserService #380.
* Additional intervals, exception edits, complex role transitions, Future Timeline variants, and the complete notification/translation matrix have unit/contract coverage but are not all independently certified by the focused E2E run. Do not collapse implemented, unit-tested, and real-browser-proven into one status.
* Reachable Email remains deliberately separate and is not implemented by this lane.
* [ADR-006](/decisions/adr-006) #410 now owns the cross-modality persistence and regression gate before promotion.

***

## Current verified boundary (2026-07-10) [#current-verified-boundary-2026-07-10]

* Frontend PR #359 and UserService PR #281 are merged: runtime chat transport is Matrix-only.
* SDK Megolm is not active. Frontend issues #332 and #346 remain open, and current `origin/dev` / `origin/pre-dev` contain no `initRustCrypto` call.
* [ADR-005](/decisions/adr-005) remains incomplete: federation hardening was partially hot-applied on Pre-Dev, but the homeserver still uses the bare-IP `server_name`; the clean rebuild remains an ops-owned blocker.
* Matrix identity is environment-specific: Pre-Dev, the source of truth for this initiative, must use `matrix.oriso-dev.site`; Dev may use `matrix.oriso.org`. ORISO-Helm PR #32 and UserService PR #370 already provide green configurable-name/MXID regression guards; do not duplicate them. The Pre-Dev value/overlay, DNS/TLS, clean install, and runtime verification remain open.
* Frontend PR #389 was closed without merge and intentionally removed the encryption boundary; it is not a basis for this feature. Frontend PR #397 has a small Matrix-client-construction overlap for SDK logging which must be preserved when crypto initialization is added.
* All work is restricted to `pre-dev` and `dev`; repositories without either eligible branch remain untouched. No work targets `main`.
* The workspace has no root `Makefile`. The design-session phrase `make verify` is intent for a real integration gate, not a currently executable command.

## Context [#context]

The Self-Help Group Chat is not greenfield. It extends the existing Caritas Group Chat feature:

* **UserService:** `Chat` with topic, dates, duration, recurrence, participant limit, owner, tenant-scoping agencies, `hintMessage`, and Matrix room ID; `GroupChatParticipant`; `ChatReCreator`; `DeactivateGroupChatService`.
* **Frontend:** `components/groupChat/`, `useJoinGroupChat`, the `?gcid=` login/deep-link path, `WaitingRoom`, `SessionToolbarChipFilter`, and the ElementCall group-call path.
* **Tenant/Admin:** `featureGroupChatV2Enabled` and TenantService `TranslationFacade` already exist.
* **Appointments:** UserService already integrates an external AppointmentService and stores/query-projects future appointments; the Future Timeline should use that boundary instead of inventing another local service.

The code still has important legacy model debt. `Chat.ChatInterval` is `WEEKLY` only; `GroupChatParticipant.chat_id` currently stores a **Session ID**, not `Chat.id`, and has no DB foreign key or role; stale-chat close uses `updateDate` plus duration/deactivation period rather than the planned `startDate + duration`; legacy `rc*` names remain in wire/database contracts even though the runtime path is Matrix-only.

## Decision [#decision]

1. **Extend the existing Group Chat feature and refactor only the touched radius.** Do not rebuild it. Remove or rename remaining Rocket.Chat-era code/contracts only where a coordinated slice owns both ends.
2. **Megolm-first.** Do not build group E2EE on the removed legacy `crypto-js` mechanism or on the inert `useE2EE` compatibility hook. Complete [ADR-005](/decisions/adr-005), then initialize SDK/Rust crypto, then build group-chat E2EE.
3. **Participant identity uses real Matrix accounts.** Default is the existing disposable `anon_` account; an optional persistent pseudonym supports returning participants. There is no credential-less session.
4. **Recurrence uses a Series rule with virtual Occurrences and finite `repeatCount`.** Intervals are `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY`, and `YEARLY`. A Matrix room is materialized only for the imminent/active occurrence. Single-date changes use an EXDATE-style skip plus a standalone one-off Series; no “this and following” split.
5. **The first implementation slice is an explicit Series with `repeatCount=1`.** It is finite, text-only, and non-recurring from the user's perspective: create → list → pseudonymous deep-link join → E2EE text → planned-end close.
6. **No separate Lobby list.** Group chats stay in Gespräche/Chats. A future extension of the same list shows upcoming group occurrences and appointments, with a draggable “now” divider plus a keyboard/toggle equivalent, bounded pagination, and existing chip filters.
7. **Modality is a Series property:** `TEXT`, `AUDIO`, or `VIDEO`. A Matrix text room always exists; audio/video additionally use ElementCall and are opened by a counsellor.
8. **Membership is explicit.** Roles are Owner, Co-Moderator, and Participant. The data model must define add/remove/transfer semantics before implementation; “multiple owners” and “transfer ownership” must not remain ambiguous.
9. **Outbound communication is confidentiality-neutral.** Calendar and teaser email content carries no topic, no provider branding, and no sensitive category. Translation is limited to author-written configuration text, never chat content or PII.
10. **Reachable email is a separate identity-layer work package.** It is global and cross-feature, not a small Group Chat UI subtask; it may be linked from the epic but should have its own owner and acceptance boundary.

## Considered options (rejected) [#considered-options-rejected]

* Rebuild the Group Chat from scratch.
* Ship group E2EE on a custom crypto layer and migrate later.
* Put a Lobby into the enquiry/request flow.
* Materialize an unbounded row per future occurrence.
* Support “this and following” recurrence splitting in the first release.

## Consequences [#consequences]

**Positive:** Reuses working chat, join, call, tenant, translation, and appointment paths; fixes infinite recurrence structurally; keeps the custom accessible UI; makes real Matrix E2EE a prerequisite instead of future debt.

**Cost / risk:** The feature is blocked on ops and crypto work; the existing Series/Session/participant schema needs an explicit migration contract; the future list combines two sources; role transitions and key rotation interact; current integration-test wording references a nonexistent command and must be replaced by a real harness.

## Required sequencing [#required-sequencing]

1. [ADR-005](/decisions/adr-005) clean homeserver rebuild with stable DNS `server_name`.
2. SDK/Rust Megolm initialization, encrypted-room creation, key backup/recovery, and multi-device verification.
3. Contract/model slice: Series/Occurrence/Exception schema, role semantics, planned-end close, and an executable integration gate.
4. First vertical slice (`repeatCount=1`, text only).
5. Recurrence and occurrence edits.
6. Explicit roles/invites and modality.
7. Future Timeline and Activity Timeline integration.
8. Waiting Area, multilingual author config, calendar, and notification polish.
9. Separate reachable-email work package.

Each slice follows red-green TDD, relevant repository integration tests, the frontend unit/lint/build hard gate, Playwright/real-browser verification, mobile and desktop checks, fresh-user proof, and Pre-Dev validation when deployment is in scope.
