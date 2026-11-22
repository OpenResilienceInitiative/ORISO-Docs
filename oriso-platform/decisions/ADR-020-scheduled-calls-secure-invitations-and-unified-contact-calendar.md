# ADR-020: Scheduled calls, secure invitations, and a unified contact calendar

> **Amended by ADR-029** (`ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md`, 2026-10-27): §2 admission and one-time-guest identity, §3 step 3, §7.
>
> **Amended 2026-10-28** (see [Amendment 2026-10-28](#amendment-2026-10-28--knock-first-and-the-call-guest-join-path) at the end): a valid link no longer enters directly — every link knocks first; the tenant call policy in §2 is replaced by the permission "Direkteinladung erlauben"; a call guest joins the call room only. Not to be confused with **ADR-020 in ORISO-Frontend**, which is about e-mail templates.
>
> **Amended 2026-11-17** (two amendments at the end): [only counsellors start calls](#amendment-2026-11-17--only-counsellors-start-calls), enforced in the call policy, and joining needs a live counsellor ([ORISO-Frontend#2287](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2287)); [self-booking in Sprechstunden](#amendment-2026-11-17--self-booking-in-sprechstunden) with per-counsellor auto-accept, notice days and slot length replaces the Auto-confirmation Lead Time in §4.

- **Status:** Accepted — 2026-08-12
- **Date:** 2026-08-12
- **Deciders:** Frank (product) + architecture refinement session
- **Related:** ADR-006 (persisted conversation modality), ADR-012 (group occurrences and Future Timeline), ADR-018 in ORISO-Frontend (Element Call Matryoshka integration), ORISO-Frontend#974
- **Implementation tracker:** `OpenResilienceInitiative/ORISO-Frontend#974`

## Context

ORISO can already create appointments, export group occurrences to calendars, show a waiting-area countdown, and start encrypted Element Call rooms. These capabilities are not yet one coherent product:

- audio and video conversations cannot consistently be offered as scheduled contacts;
- the current appointment overview is a list rather than a useful calendar;
- future appointments and group occurrences are projected in a basic expandable panel instead of a navigable future timeline;
- the missing share action in an active call cannot safely be implemented as a plain room URL because call rooms are restricted and guest access is forbidden;
- registration, login, QR entry, participant selection, and waiting-room components exist, but are not composed into one call-entry flow;
- availability currently has only a coarse absence flag, so scheduled work needs real time ranges and deterministic conflict handling.

The design must support multiple contact types instead of creating a video-only calendar. It must also preserve the Matrix-only, encrypted Element Call architecture and avoid granting a call participant access to the source counselling conversation.

## Decision

### 1. Separate Appointment, Call Session, and Call Invitation

An **Appointment** is the scheduled contact and its lifecycle. A **Call Session** is the runtime audio/video room materialized when a counsellor starts a planned or spontaneous call. A **Call Invitation** grants one identity access to exactly one Call Session.

Planned and spontaneous calls use the same Call Session and invitation model. Scheduling does not pre-create a long-lived Matrix room. The appointment references its source conversation and intended participants; the restricted encrypted call room is created at call start.

### 2. Make call access a tenant policy enforced by the backend

Each tenant selects one of two policies in ORISO Admin:

- `REGISTERED_ONLY` — every participant must authenticate as a registered ORISO user;
- `REGISTERED_OR_ONE_TIME_GUEST` — registered users are preferred, while a counsellor may also issue a one-time guest invitation.

`REGISTERED_ONLY` is the secure default. The backend authorizes invitation creation and redemption; hiding a frontend action is not enforcement.

A registered participant is selected through a compact reusable user picker. The participant receives membership only in the dedicated call room, never in the source case or chat room.

A one-time guest passes through a modular pre-call identity screen derived from the existing registration/login flow. The resulting short-lived identity is bound to one invitation and one Call Session. It may reconnect during that call, expires when the call ends, and can be revoked by an authorized counsellor. Tokens are stored hashed and audit data never contains the usable secret.

All entry and exit events remain visible to participants. There is no per-person waiting-room approval in this first decision: a valid authenticated or one-time identity enters directly.

> **Superseded 2026-10-28:** a valid identity no longer enters directly. Every link knocks first and the counsellor lets each person in (ADR-029 §2 and its amendment). The two tenant policies above are replaced by the permission "Direkteinladung erlauben" (ADR-029 §6 and its amendment). See the amendment at the end of this record.

### 3. Use one entry composition for QR, copied links, registered users, and guests

An invitation URL or QR code opens a call-entry route that:

1. validates the invitation and tenant policy server-side;
2. offers login when the invitee already has an account;
3. offers the one-time identity flow only when tenant policy permits it;
4. shows the existing waiting-area countdown when the scheduled start is in the future;
5. joins the restricted Element Call room when the session is open.

> **Amended 2026-10-28:** step 3 now reads "offers a temporary account (ADR-029 §3) only when the effective permission 'Direkteinladung erlauben' allows it", and a knock step comes before step 5: the person waits until the counsellor lets them in. See the amendment at the end of this record.

The entry UI is a modular overlay or preceding screen, not a second registration implementation.

### 4. Provide one contact calendar across modalities

The existing **Termine/Bookings** area becomes ORISO's unified **Contact Calendar**. It projects:

- ordinary appointments;
- planned audio calls;
- planned video calls;
- recurring and one-off group occurrences.

Counsellors always have the calendar navigation entry. An advice seeker sees it only when at least one relevant appointment exists; self-booking starts inside the relevant conversation.

Counsellors may create or propose appointments. Advice seekers may select a free slot from the conversation. A personal **Auto-confirmation Lead Time** controls approval:

- a request made at least the configured duration before its start is confirmed automatically;
- a request inside that window requires counsellor approval;
- an already confirmed appointment never becomes approval-required merely because time passes.

The calendar is backed by a server-owned read projection rather than frontend joins between unrelated APIs. Each item exposes a stable identifier, time range, modality, status, source reference, permitted actions, and confidentiality-safe display data.

### 5. Model availability blockers and conflict deadlines explicitly

Counsellors can create **Availability Blockers** as date/time ranges or all-day absences. Saving a blocker that overlaps confirmed appointments is allowed after a warning and creates explicit conflicts.

The counsellor resolves affected appointments by the earlier of:

- blocker creation time plus the personal **Conflict Resolution Deadline**; or
- appointment start minus 15 minutes.

The personal deadline is configured under **Profile → Appointment Settings**, defaults to one week, and cannot be shorter than 15 minutes. The first conflicting blocker may prompt the counsellor to confirm or change that setting. Unresolved conflicts are automatically cancelled at the effective deadline, with normal participant notification and an auditable reason.

### 6. Turn the conversation projection into a real Future Timeline

The conversation list remains anchored at **Now** / the latest past event. A draggable divider reveals future events below it; the header shows the selected date or distance from today. Keyboard and explicit-button alternatives provide the same function without dragging.

Appointments and group occurrences use one typed future-event card/session primitive. Existing bounded loading from ADR-012 remains: the client must not materialize an unbounded future. Appointment-only users must see the projection even when no group series exists.

### 7. Distinguish persistent entry links from live-call invitations

ORISO supports three persistent link purposes:

- **Conversation Link** — starts or opens a conversation;
- **Video Appointment Link** — opens video-appointment booking;
- **Smart Link** — offers conversation or audio/video appointment according to tenant and counsellor settings.

A persistent link never grants direct access to a live room. Direct live-call invitations are created only for a running Call Session and follow the identity-bound, revocable invitation rules above.

> **Amended 2026-10-28:** persistent call links now exist (ADR-029 §1). The sentence "a persistent link never grants direct access to a live room" still holds, but for a new reason: every link knocks first, and only the counsellor's admission grants a seat in the call room. See the amendment at the end of this record.

### 8. Use versioned call-timing presets

ORISO ships code-defined **Call Timing Presets**. A preset is a versioned sequence of actions relative to the scheduled end, for example a visual notice, an audible escalation, and an optional hard end. Presets may include a hard-end offset before or at the scheduled end; the product default is selected separately and is not implied by this ADR.

The counsellor selects a personal default under **Profile → Appointment Settings**. A running Element Call exposes a **Reminder** menu that may override the default for that Call Session. Tenants may restrict the offered preset set, but do not author arbitrary timing scripts.

### 9. Preserve confidentiality in external calendar data

ICS, Google Calendar, Outlook, email, and push projections contain no counselling topic, sensitive category, case text, or unnecessary provider branding. They use neutral appointment wording and an authenticated ORISO entry target.

## Bounded-context ownership

| Concern | Owner |
|---|---|
| Appointment lifecycle, availability, blockers, conflicts, unified calendar projection | ORISO-UserService at the ORISO boundary, integrating AppointmentService where required |
| Tenant call-access policy and allowed timing presets | ORISO-TenantService |
| Policy management UI | ORISO-Admin |
| Calendar, Future Timeline, modular entry flow, participant picker, Element Call reminder UI | ORISO-Frontend |
| Restricted room membership and short-lived Matrix identity orchestration | ORISO-UserService with Matrix/Keycloak adapters |

No frontend-only flag may decide access to a call.

## Considered options (rejected)

- Make the existing restricted Matrix room link shareable as-is.
- Create a public call room or enable unrestricted Matrix guests.
- Add a video-only calendar beside existing appointments.
- Pre-create a permanent call room for every future appointment.
- Add one bespoke registration form inside Element Call.
- Let the frontend aggregate appointments, group occurrences, absences, and permissions as the canonical model.
- Model absences only as a boolean or silently delete conflicting appointments.
- Give tenants a free-form rules engine for call-ending behavior.

## Consequences

**Positive:** One model covers spontaneous and planned calls, registered and permitted guest participants, all contact modalities, and both calendar surfaces. Existing registration, picker, waiting-area, timer, group-occurrence, and Element Call components can be reused. Security is stronger than a copied room URL and is centrally enforceable.

**Cost / risk:** The work spans four repositories and the external AppointmentService boundary. Short-lived identities require cleanup and audit behavior. Calendar projection, conflict deadlines, notifications, and hard call termination need idempotent server jobs. Accessibility and mobile interaction for the draggable timeline require explicit alternatives and real-device validation.

## Required implementation slices

1. Contracts and migrations: access policy, link purposes, appointments/modalities, availability blockers, conflict deadlines, timing preset identifiers, and the calendar read model.
2. Backend authorization: registered invitations, one-time identity issuance/redemption/revocation, room-scoped membership, expiry, audit, and cleanup.
3. Admin policy: secure defaults, tenant policy selection, preset allowlist, validation, and audit visibility.
4. Frontend primitives in Storybook: responsive Contact Calendar, event card, participant picker dialog, modular pre-call identity screen, waiting/countdown states, reminder menu, and accessible Future Timeline divider.
5. Appointment creation and self-booking: counsellor proposal, conversation-scoped booking, lead-time approval, availability blockers, conflict resolution, and notifications.
6. Element Call integration: scheduled and spontaneous session start, direct entry, reconnect, revoke, entry/exit notices, timing escalation, and optional hard end.
7. Persistent link purposes and Smart Link landing route.
8. Real-browser acceptance on mobile and desktop, including two-party bidirectional audio/video, registered-only denial, permitted one-time guest entry, room isolation, calendar visibility, timeline navigation, reconnect/revoke, and deadline jobs.

Each slice is independently reviewable and follows red-green tests, repository quality gates, contract/integration coverage, Storybook visual review, and Playwright verification. A green UI test or pre-created room is not media proof; call acceptance requires bidirectional remote audio/video.

## Amendment 2026-10-28 — knock first, and the call guest join path

- **Status:** Accepted by the product owner — Frank, 2026-10-28. Technical backend review (Keycloak/Matrix feasibility) open.
- **Changes:** §2 (admission, tenant policy), §3 step 3 and the step before step 5, §7, implementation slices 2, 3, 6 and 8. The rest of this record is unchanged.
- **Issues:** [ORISO-Docs#231](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/231), [ORISO-UserService#1477](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1477), [ORISO-Frontend#1794](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1794), [ORISO-Frontend#1387](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1387), epic [ORISO-Frontend#974](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/974)
- **Name clash:** this is the **platform** ADR-020 (calls). ORISO-Frontend has its own ADR-020 about e-mail templates; it is not affected.

### A. Knock first (decided in ADR-029)

§2, §3 and §7 are read with these changes. The decisions themselves live in [ADR-029](ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md) (§2, §3, §6 and its Amendment 2026-10-28); they are only linked here.

- **§2 admission.** "A valid authenticated or one-time identity enters directly" no longer applies. Every person who arrives through a link knocks and waits until the counsellor lets them in; an admission then holds for that conversation.
- **§2 policy.** `REGISTERED_ONLY` / `REGISTERED_OR_ONE_TIME_GUEST` are replaced by the permission "Direkteinladung erlauben". A "one-time guest" is a temporary account with username and password.
- **§3.** Step 3 offers a temporary account only when the effective permission allows it. Between steps 4 and 5 the person knocks and waits until admitted; step 5 joins only after admission.
- **§7.** A persistent link still never grants direct access to a live room — now because the admission, not the link, grants the seat.
- **Implementation slices.** Slice 2 "one-time identity issuance" means temporary accounts (ADR-029 §3); slice 3 "tenant policy selection" means the permission "Direkteinladung erlauben"; slice 6 "direct entry" means entry after admission; slice 8 "permitted one-time guest entry" means a temporary account entering after admission.

### B. The call guest joins the call room only (decided here)

This record is the one place for this decision; ADR-029 and the issues link here.

1. **Call room only.** A guest who is let into a call is invited into the dedicated call room of that Call Session, and into nothing else. They never become a member of the counsellor's source chat room, the case, or any other room. This extends the rule §2 already set for registered participants to everyone who arrives through a link.
2. **The admission is the invitation.** Letting the guest in is what creates their call-room membership. The call room's `restricted` join rule cannot admit them by itself, because its allow-list is the source room and the guest is not a member of it. Option A of [ORISO-Frontend#1387](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1387) (lead the guest into the source room first) is therefore ruled out. The backend checks the permission and the admission; hiding a button is not enforcement.
3. **Rights end with the call.** When the Call Session ends, the guest loses access to the call room and can neither rejoin nor read it afterwards. A temporary account is then deleted on the schedule in ADR-029 §4.
4. **A separate guest join path.** Today's join path refuses anyone who is not a member of the source room and hands the call-room seat back (raised on [ORISO-Frontend#1794](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1794)). That protection stays for normal participants. Guests get a second, explicit path.

**Proposed mechanism** — as implemented in [ORISO-UserService#1485](https://github.com/OpenResilienceInitiative/ORISO-UserService/pull/1485) ([ORISO-UserService#1477](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1477)), pending the backend review. This is option B of ORISO-Frontend#1387:

- On "let in", UserService invites the guest into the restricted call room only, acting as the admitting counsellor (login-as token). No new service account.
- Each admission is recorded per call (table `matrix_call_guest`).
- The call policy and the call-state read treat an unrevoked guest of the running call as authorised without source-room membership. The check is bound to that call, not only to the source room.
- At call end UserService removes the guest from the call room and clears their power-level entry. A failed removal is retried by a sweep.
- Guests do not count toward the call's start or end.

**Why here and not in an ADR-018.** Platform ADR-018 is about the Erstantwort and has nothing to do with calls. ORISO-Frontend's ADR-018 is about embedding Element Call as a widget; it says the host joins the call room before mounting the widget, but not who may become a member. Room membership for calls is a Call Session rule, and that is this record.

> **Extended by ADR-032** (2026-11-13): how the Contact Calendar is built (FullCalendar MIT core, own team view) and synced (neutral ICS feed out, busy-time import in).

## Amendment 2026-11-17 — only counsellors start calls

- **Status:** Accepted by the product owner — Frank, 2026-11-17.
- **Changes:** §1 (who may start a Call Session is now an enforced rule, not a UI convention) and the bounded-context table (the call policy owns the start rule). Amendment 2026-10-28 §B is unchanged: admitted guests still join the call room only.
- **Issues:** [ORISO-Frontend#2287](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2287), related [ORISO-Frontend#1050](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1050)

### Context

§1 says a Call Session is materialised "when a counsellor starts" a call, and ADR-012 §7 says group calls are "opened by a counsellor". Neither was enforced: the backend call policy admitted any member of the source room, so the rule held only because the advice seeker's client hid the call buttons. An advice seeker in a 1:1 conversation therefore saw no call buttons at all and could not tell whether a call was planned or how to get one.

### Decision

- **Only counsellors start calls**, in 1:1 conversations and in groups. The backend call policy refuses a start by anyone else (advice seeker, admitted guest, plain group member) with a dedicated reason. Hiding a button is not enforcement.
- **Joining needs a live counsellor.** An advice seeker or an admitted guest may join a call only while it is running **and** a counsellor is live in it. If that cannot be checked, the join is refused (fail closed).
- An advice seeker let in through a link **answers** the counsellor's call; their client waits for the counsellor instead of starting a call itself.
- **Advice seeker call buttons in a 1:1 conversation** are shown, but a click never starts a call. It opens a dialog with the next appointment (date, time, video or phone), or, without one, the self-booking of [Amendment 2026-11-17 — self-booking in Sprechstunden](#amendment-2026-11-17--self-booking-in-sprechstunden).
- **Groups:** advice seekers get no call buttons, as before.

### Consequences

**Positive:** The rule in §1 and ADR-012 §7 is now true on the server, not only in the UI. An advice seeker can see and book a call instead of facing a missing button.

**Cost / risk:** The call policy must read live call state (who is in the call right now); a Matrix outage refuses non-counsellor joins. An advice seeker who opens the call a moment before the counsellor gets a short "the call has not started yet" notice. Group calls started by members before this change get no guest link ([ADR-029 Amendment 2026-11-17](ADR-029-direct-links-knock-first-admission-and-temporary-accounts.md#amendment-2026-11-17--guest-account-modes-keep-account-group-call-links)).

| Concern | Owner |
|---|---|
| Start and join rule in the MatrixRTC call policy | ORISO-UserService; the LiveKit gateway passes the refusal reason through |
| Asker call buttons, appointment dialog, "not started yet" notice | ORISO-Frontend, ORISO-ElementCall |

## Amendment 2026-11-17 — self-booking in Sprechstunden

- **Status:** Accepted by the product owner — Frank, 2026-11-17.
- **Changes:** §4, the paragraph on self-booking and the **Auto-confirmation Lead Time**. Everything else in §4 and §5 is unchanged. [ADR-032](ADR-032-counsellor-calendar-module-and-external-calendar-sync.md) gets a matching amendment for the calendar settings and views.
- **Issues:** [ORISO-Frontend#2287](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/2287), [ORISO-Frontend#1050](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1050)

### Context

§4 lets an advice seeker select a free slot from the conversation and uses one personal lead time to decide between automatic confirmation and counsellor approval. It does not say **which** times are free. Without that, any gap in a counsellor's calendar would be bookable, including times the counsellor never meant to offer.

### Decision

- **Sprechstunden.** Each counsellor defines Sprechstunden (consultation hours) in their calendar settings: weekly time windows that advice seekers can book. They are separate from working hours and from availability blockers; blockers and imported busy times (ADR-032 §5) still take slots out.
- **No Sprechstunden, no free times.** A counsellor without Sprechstunden offers nothing to book; a registered advice seeker gets the hint to write in the chat instead.
- **Auto-accept, per counsellor, on or off.** On: a booking in a Sprechstunde is confirmed at once. Off: every booking is a **request** the counsellor confirms or declines.
- **Notice period in days, per counsellor** (default 1 day). Inside the notice period before a date, auto-accepted Sprechstunden slots are no longer offered; an advice seeker can still send a request that needs confirmation. This replaces the Auto-confirmation Lead Time of §4. The rule that a confirmed appointment never becomes approval-required because time passes stays.
- **Slot length, per counsellor:** 30 or 60 minutes.
- **No double booking.** The server re-checks a slot when it is booked; two advice seekers cannot hold the same slot.
- The counsellor is notified of every booking and every request.

### Consequences

**Positive:** Counsellors decide exactly which times are bookable and whether they want to approve each booking. The notice period protects short-notice planning without blocking urgent requests.

**Cost / risk:** Four new per-counsellor settings, a request/confirm/decline flow with notifications, and race-safe slot booking in ORISO-UserService. The current build's limits (a 14-day booking horizon, one upcoming appointment per conversation) are implementation defaults, not decisions of this amendment.
