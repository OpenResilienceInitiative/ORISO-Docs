# ADR-002: Silent room membership with an access-control confidentiality curtain (not E2EE)

- **Status:** Accepted — Frank, 2026-06-25 (team ratification pending)
- **Date:** 2026-06-25
- **Deciders:** Frank + backend/Matrix/frontend leads
- **Related:** ADR-001 (modalities as modules); `ORISO-UserService/CONTEXT.md`; `ORISO-Frontend/CONTEXT.md` (Handover); UserService `UnauthorizedMembersProvider`, `AgencyPreAssignmentRoomService`, `AssignEnquiryFacade`, `MatrixRoomClient`, `SessionSupervisorFacade`

---

## Context

A client conversation is a Matrix room. Two things are broken / unsettled today:

1. **The Rocket.Chat-era membership model is "invite the whole agency, then the
   accepting counsellor kicks everyone else"** (`UnauthorizedMembersProvider`). The
   Matrix migration never settled a replacement — the Matrix path instead creates an
   agency-service-account "holding room" with only the client, then invites a single
   consultant on accept. A counsellor who steps in later (e.g. covering for a sick
   colleague) therefore **joins late**.
2. **There is no confidentiality boundary at all.** Verified on Pre-Dev: Synapse runs
   with no encryption config (rooms unencrypted, message content plaintext in
   `homeserver.db`) and no `history_visibility` override (`private_chat` preset →
   `shared`), so **any member who joins reads the full prior history**. The frontend's
   E2EE is still the Rocket.Chat scheme, which skips Matrix rooms entirely.

Product need: every counsellor in a department should be reachable to *cover* a case,
including taking over a sick colleague's active case **with its history** — but an
off-case counsellor must not casually see cases they aren't handling.

Given "real members from creation," at most two of these three can hold: a
**cryptographic** curtain, **reveal-grants-history**, and **no key-redistribution
event**. We must pick.

## Decision

**Scope:** this applies to the **one-to-one (nearby / proximity) counselling** chat type only.
Live chat (ephemeral, single counsellor, no look-in) and internal chat are out of scope.

**1. Real members from room creation (no invite-then-kick, no late join).**
When a conversation is created, the relevant department's counsellors are *genuinely*
joined to the room as **silent members** (building on the existing team-session
mechanism). The handling counsellor is the **active counsellor**; the rest remain
silent. "Reveal" is a visibility/permission flip on an existing membership — nobody
ever joins late, so there is no re-key / history-replay problem.

**2. The curtain is access-control / UX, not cryptographic (relax the crypto property).**
Silent members technically *can* read (rooms stay effectively unencrypted, or keys
flow to all members); "silent" means the client app **hides** the conversation and
**mutes** notifications. Real confidentiality is enforced by:
- **department-scoped search** — a counsellor can only discover clients/conversations/
  counsellors within their own department(s), never outside their scope;
- the **apply-to-reveal gate** — making a hidden conversation visible is a deliberate act;
- an **audit log of every reveal** — who revealed which case, when, on what basis.

**Reveal grants full prior history** (continuity of care for takeover). Plaintext-at-rest
is mitigated by **disk/volume encryption**, not message E2EE.

## Consequences

**Positive:** sick-colleague takeover "just works" (the colleague was already a member);
no late-join key/history breakage; the half-finished Matrix migration gets a definite
target model; replaces the brittle invite-then-kick.

**Negative / cost:** there is **no cryptographic confidentiality between counsellors of
the same agency** — a determined same-agency counsellor's client could read a case they
haven't revealed. Security now **rests entirely on scoped search + the reveal gate +
audit**, so those become load-bearing controls that must be correct and tamper-evident.
Message content remains plaintext server-side until disk encryption is in place.

## Alternatives considered

- **Real Matrix E2EE + share historical keys on reveal** (relax "no key event"): a true
  boundary against colleagues *and* continuity, but a substantial build (replace the dead
  Rocket.Chat E2EE) and reintroduces a key-distribution event at reveal time.
- **Real E2EE, forward-only reveal** (relax "history on reveal"): true boundary + cheap,
  but the covering colleague cannot read what the client already said — breaks the core
  scenario.
- **Shadow membership, reveal = real join** (reject Option A): reproduces exactly the
  late-join history/re-key bug this ADR removes.

## Relationship to the in-flight Case Handover work (cross-checked 2026-06-25)

This ADR is the same decision the **Case Handover (Fallübergabe) KDG-compliant** epic
(`CAR-CHO-01`) reached independently: separate **technical eligibility** from
**justified visibility**, discard key-escrow. Built so far (PRs UserService #186,
Frontend #275, Admin #208, Database #13 merged): the **policy-gate + reason +
explanation + client-consent + audit + admin-config + content-locked gate** slice.

**Not yet built / divergent from this ADR:**
- **Technical eligibility is assumed, not implemented** — `CaseHandoverService.requestAccess`
  grants via `session.setConsultant(requester)` and never establishes Matrix room
  membership; it only works because rooms are currently unencrypted. ADR-002's "real
  members from creation" has no implementation. **Decided 2026-06-25 (Frank): build this
  membership layer now as the next slice (department joins each conversation at creation),
  not defer it to the future spike.**
- **Grant = single-owner transfer for every reason** (even "asked for advice"), rather
  than optionally adding a co-active counsellor.
- **`case_handover_reason_policy` is global** (PK `code`, no `tenant_id`) and only models
  `client_consent_required` + `access_allowed` — so platform-default → tenant-override →
  read-only pass-down, and the Client/Counsellor/Supervisor/Law-Enforcement approval
  matrix, are not representable yet.
- **Scope is agency + non-team-sessions**, not Department (agency × topic) + team sessions.

## Reveal lifecycle (decided 2026-06-25)

Governing invariant: **membership ≠ visibility** — the whole department are silent members
(technical eligibility) but see nothing; only a small, deliberately revealed, time-boxed,
logged set watches a case. Two reveal flavours over one primitive, chosen by the reason's
**access outcome**:
- **Co-access** (advice/consult): read-only, time-boxed peek that **auto-expires** (re-lock +
  audit entry); original keeps full visibility; no ownership change. Reuses the **Supervision**
  primitive + a new auto-expiry timer + self-service gate.
- **Takeover** (absence reasons): cover gains full visibility and ownership; original is
  re-hidden but keeps membership and can **reclaim**; no auto-expiry (until reclaim/return).
- **Reclaim**: reverse of takeover; permanent reasons ("left") have no reclaim.

TTL: a per-reason `max_access_duration` (co-access default ~3h, tenant-configurable; takeover =
`null` = until reclaim). **Audit scope: per-agency, visible to the tenant (agency/tenant admins +
DPO), not the platform owner.** The merged `case_handover_request` table already carries
`tenant_id`; only `case_handover_reason_policy` still lacks it.

## Resolved (design session 2026-06-25)

- **Reveal gate** = a configurable per-reason **handover policy** (Admin); two **access
  outcomes** — *co-access* (read-only, time-boxed, auto-expiry; original keeps sight) and
  *takeover* (full + ownership, original re-hidden but keeps membership, **reclaimable**;
  "left" = no reclaim). An **absent** colleague's case is taken over via the away-reason itself
  (no consent from the absent person); reclaim on return.
- **Department (agency × topic)** is first-class and carries imprint/DPP — see **ADR-003**.
- **Contractual basis** binds at conversation creation (nearby → its Department; live → the
  invite-link Department), snapshotted + immutable; draft/unpublished basis = record-only.
- **Policy storage** = config owned in **TenantService** (platform defaults + tenant overrides +
  read-only pass-down), **cached + enforced in UserService** (Option B). The merged
  `case_handover_reason_policy` becomes the UserService enforcement cache and needs `tenant_id` +
  the richer approval/outcome/duration fields.
- **Client visibility** = the client sees only the active counsellor; silent members are
  filtered from the client view and pseudonymous; disclosure rides the Department DPP.

## Implementation notes (added 2026-07-30, after #905 made §1 live)

- **The 1:1 client view derives participants from session data, never from Matrix room
  membership.** Verified on `pre-dev`: the asker's header resolves from the session `contact`,
  and `useMatrixRoomUsers` is consumed only by group-chat views and mention resolution. Any
  future 1:1 view that renders the member list (participant list, read-receipt avatars,
  membership-derived typing indicator) breaks the curtain — treat that as the invariant.
- **Pseudonymity has to hold at the homeserver, not only in the UI.** The advice seeker is a
  member of the same room, so their own client can read every member's `displayname` from
  `/joined_members`. Counsellor accounts are therefore provisioned through
  `ConsultantDisplayNameResolver`, which never uses the real name (US#929).
- **Reveal never adds or removes a member.** A takeover keeps the previous counsellor joined so
  they can reclaim; a grant tolerates the requester already being a member. Removing a member
  makes their history unrecoverable under Megolm, and inviting an already-joined member fails
  with `403 M_FORBIDDEN` — both were live faults in `CaseHandoverService` until US#929.
- **"Hidden" is enforced server-side and already was:** the consultant session list is
  database-driven (`consultant IS NULL` for enquiries, `findByConsultant…` once assigned), so an
  accepted case leaves every other counsellor's list without any Matrix action.

## Addendum 2026-09-05 — case handover gains a push direction; no third consent gate; no room clearing

- **Status:** Accepted — Frank, 2026-09-05. The decisions above are unchanged; this addendum only
  extends the reveal lifecycle by a second entry direction and records two things that were
  deliberately *not* built.
- **Related:** ADR-016 (Team-Besprechung, hard close at acceptance), ADR-022 (exactly two consent
  gates), UserService #200 (takeover without evicting the previous counsellor), #1111
  (`teamSession` / `INTERNAL_GROUP` stamping).

**1. Push direction: offer → acceptance by the recipient → the same grant path.**
Until now a reveal could only be *pulled*: a counsellor asks for access to somebody else's case.
The owning counsellor can now also *push* — offer their own case to a colleague of the same
Beratungsstelle. The offer is one record of the existing `case_handover_request` (a `direction`
of `PULL` or `PUSH`, plus the target counsellor and an expiry), it needs the recipient's
acceptance (`PENDING_RECIPIENT_ACCEPT` → `RECIPIENT_DECLINED` / `WITHDRAWN` / `EXPIRED`), and on
acceptance it runs **the same grant path as a pull**: the reason's policy gate, the client-consent
step where the policy demands it, the Matrix system message, the standing-supervisor attach. One
open offer per case; an unanswered offer expires (72 h) and the case stays where it was.

There is deliberately **one** handover path: the inherited Rocket.Chat-era alias message
`REASSIGN_CONSULTANT`, in which the *client* confirmed a reassignment in the chat, is removed
rather than kept in parallel. Two paths with different consent behaviour would be an audit gap.

**2. The recipient's acceptance is not a consent gate — ADR-022 stands.**
ADR-022 fixes **exactly two** consent gates (waiting room, and the room before the first message).
A push introduces **no third gate**. The recipient accepting is a staffing step between
professionals, not a data-protection consent. Whether the client has to agree is decided, exactly
as for a pull, by the reason's `client_consent_required` policy — same field, same dialogue, same
audit entry.

**3. Reason codes carry no health reference (Art. 9 GDPR).**
The reason taxonomy becomes `PLANNED_ABSENCE`, `UNPLANNED_ABSENCE`, `ASSIGNMENT_ENDED` and
`ADVICE_REQUESTED`; the old codes (`COUNSELLOR_ON_HOLIDAY`, `COUNSELLOR_IS_ILL`,
`OTHER_EMERGENCY`, `COUNSELLOR_LEFT`, `COUNSELLOR_ASKED_FOR_ADVICE`) are disabled and existing
rows are migrated. The reason is that the code and its label do not stay in one place: they are
written into `case_handover_request`, into the admin audit log, into the notification parameters
and — as the derived client text — into the client's Matrix room. "Your counsellor is unfortunately
ill" is **health data about the counsellor**, published to a client and stored in several systems.
The client-facing text now names neither cause nor duration: the previous counsellor is
unavailable, a named colleague continues the counselling.

Room events already posted cannot be migrated (Matrix events are immutable). Only dev and pre-dev
are affected today; this has to be fixed before go-live, not after.

**4. Clearing the room at acceptance is deliberately NOT implemented.**
The idea — when a counsellor accepts an enquiry or a handover, remove everyone else from the room —
was examined and rejected:

- It contradicts decision §1 above ("real members from room creation, no invite-then-kick") and the
  2026-07-30 implementation note "reveal never adds or removes a member". Removing a member makes
  their history unrecoverable under Megolm, and re-inviting them later fails on an existing
  membership.
- It would break the pull handover, which is the whole reason the silent-membership model exists:
  taking over an absent colleague's case works *because* the covering counsellor is already a
  member. Clearing the room turns every takeover back into a late join with re-key and
  history-replay — precisely the brittle model this ADR replaced.
- It contradicts the product decision in UserService #200 (takeover **without** evicting the
  previous counsellor, so they can reclaim).
- Silent membership reconciliation would fight it: the agency membership services re-add
  counsellors on every sync.

The hard eviction people remember is a different, existing mechanism: **ADR-016 decision 2, the
hard close of the Team-Besprechung side room at acceptance.** The *side room* is archived and set
read-only; the *client's room* is untouched. Team coordination and case access stay separate tools.
If the eviction is ever wanted, it is a revision of §1 of this ADR plus a re-key design plus a
tenant policy flag — not an implementation detail, and it presupposes the `teamSession` /
`INTERNAL_GROUP` stamping fix (#1111), or it would empty real group chats.

**5. Vocabulary (used in the UI and in the public documentation).**
"Fallzugriff" is the umbrella; **Einsichtnahme** = co-access (read-only, time-boxed, owner keeps
the case); **Übernahme** = takeover (ownership moves, previous counsellor keeps membership and can
reclaim); **Fall holen** = pull; **Fall abgeben** = push.
