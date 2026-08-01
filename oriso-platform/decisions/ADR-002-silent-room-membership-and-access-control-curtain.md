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
