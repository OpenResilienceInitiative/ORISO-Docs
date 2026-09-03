# ADR-020: Scheduled calls, secure invitations, and a unified contact calendar

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

### 3. Use one entry composition for QR, copied links, registered users, and guests

An invitation URL or QR code opens a call-entry route that:

1. validates the invitation and tenant policy server-side;
2. offers login when the invitee already has an account;
3. offers the one-time identity flow only when tenant policy permits it;
4. shows the existing waiting-area countdown when the scheduled start is in the future;
5. joins the restricted Element Call room when the session is open.

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
