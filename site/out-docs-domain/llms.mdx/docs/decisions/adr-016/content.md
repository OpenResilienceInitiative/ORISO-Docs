# ADR-016: Team-Besprechung — separate side room per open enquiry, hard close at acceptance (/decisions/adr-016)



* **Status:** Accepted — Frank, 2026-07-18 (grill-with-docs session)
* **Date:** 2026-07-18
* **Deciders:** Frank (product) + AI (engineering)
* **Related:** [ADR-002](/decisions/adr-002) (silent membership / access curtain), [ADR-008](/decisions/adr-008) (supervision side-channel = separate room), `CONTEXT-conversation-types.md` (Team-Besprechung overlay), `ORISO-Frontend/CONTEXT.md` (full glossary entry), memory `oriso-team-besprechung-design`

***

## Context [#context]

Counsellor teams want to coordinate on an incoming enquiry ("who takes this, what do you think?") before anyone accepts it — invisible to the advice seeker — and then continue the normal 1:1. The tempting implementation is "hidden messages / a team thread inside the client's conversation", but Matrix delivers every event to every room member's device: in-room hiding was exactly the U25 safeguarding leak [ADR-008](/decisions/adr-008) removed. Verified on `origin/pre-dev`: the [ADR-008](/decisions/adr-008) side-room primitive is alive (per-session Matrix room the client is never invited to, leak-abort on the send path), but it attaches at *acceptance* and assumes an assigned consultant; the old Caritas Feedback-Chat was physically removed (changeset 0046).

## Decision [#decision]

1. **Team-Besprechung = a separate Matrix room attached to one open Agency-Counselling enquiry**, generalizing the [ADR-008](/decisions/adr-008) side-room principle to the pre-assignment phase. Guardrail (hard rule): &#x2A;*team coordination never happens in the client's room — not even "hidden".**
2. **Hard close at acceptance.** The moment the enquiry is accepted, the Besprechung is archived — it is *not* carried into the active case. Post-acceptance coordination uses the existing mechanisms: **Supervision** (read-only accompaniment) or **Case Handover** (co-access/takeover). This keeps three cleanly separated coordination tools instead of one blurry one.
3. **Archive re-access is read-only** (hard rule); access rules stay loose for now (team members may look without a co-access ceremony); retention rides the existing archive auto-deletion — no new TTL mechanism.
4. **Participation right = enquiry visibility right.** Exactly the counsellors who can see (and could accept) the enquiry may discuss; no new permission layer. A tenant-level feature toggle guards the whole feature.
5. **The discussion is flat** — the side room is already scoped to one enquiry, so it *is* the one "thread on the enquiry"; no thread machinery inside it. Scope: Agency Counselling only (Live Chat is anonymous/ephemeral and excluded per [ADR-002](/decisions/adr-002); the other modalities have no request area).
6. UI: a panel/tab on the enquiry in the request area, with a post-count badge and a permanent "team-only — invisible to the advice seeker" marker, so a counsellor is never unsure which side they are writing on.

## Considered options [#considered-options]

* **Thread in the client's room, hidden client-side.** Rejected: impossible to hide on Matrix; re-opens the [ADR-008](/decisions/adr-008) leak class.
* **Carry the side room into the active case.** Rejected by product decision: post-accept coordination belongs to Supervision/Case Handover; a room that lives on blurs that boundary. Context continuity is served by read-only archive access instead ("frozen, on demand" rather than "open forever").
* **Wait for Megolm per-recipient subsets (one room, cryptographic hiding).** Deferred in [ADR-008](/decisions/adr-008) already; unrealistic before go-live 2026-10-01.

## Consequences [#consequences]

**Positive:** reuses a shipped, leak-guarded primitive; no new permission model; clean lifecycle boundary matching the existing mechanism taxonomy. &#x2A;*Cost:** room provisioning at enquiry time (pre-assignment operator handling — today's facade assumes an assigned consultant); notification recipient fan-out must be built (current message producers hardcode user+consultant); archived-room re-access UI.
