# ADR-016: Team-Besprechung — separate side room per open enquiry, hard close at acceptance

- **Status:** Accepted — Frank, 2026-07-18 (grill-with-docs session)
- **Date:** 2026-07-18
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** ADR-002 (silent membership / access curtain), ADR-008 (supervision side-channel = separate room), `CONTEXT-conversation-types.md` (Team-Besprechung overlay), `ORISO-Frontend/CONTEXT.md` (full glossary entry), memory `oriso-team-besprechung-design`

---

## Context

Counsellor teams want to coordinate on an incoming enquiry ("who takes this, what do you think?") before anyone accepts it — invisible to the advice seeker — and then continue the normal 1:1. The tempting implementation is "hidden messages / a team thread inside the client's conversation", but Matrix delivers every event to every room member's device: in-room hiding was exactly the U25 safeguarding leak ADR-008 removed. Verified on `origin/pre-dev`: the ADR-008 side-room primitive is alive (per-session Matrix room the client is never invited to, leak-abort on the send path), but it attaches at *acceptance* and assumes an assigned consultant; the old Caritas Feedback-Chat was physically removed (changeset 0046).

## Decision

1. **Team-Besprechung = a separate Matrix room attached to one open Agency-Counselling enquiry**, generalizing the ADR-008 side-room principle to the pre-assignment phase. Guardrail (hard rule): **team coordination never happens in the client's room — not even "hidden".**
2. **Hard close at acceptance.** The moment the enquiry is accepted, the Besprechung is archived — it is *not* carried into the active case. Post-acceptance coordination uses the existing mechanisms: **Supervision** (read-only accompaniment) or **Case Handover** (co-access/takeover). This keeps three cleanly separated coordination tools instead of one blurry one.
3. **Archive re-access is read-only** (hard rule); access rules stay loose for now (team members may look without a co-access ceremony); retention rides the existing archive auto-deletion — no new TTL mechanism.
4. **Participation right = enquiry visibility right.** Exactly the counsellors who can see (and could accept) the enquiry may discuss; no new permission layer. A tenant-level feature toggle guards the whole feature.
5. **The discussion is flat** — the side room is already scoped to one enquiry, so it *is* the one "thread on the enquiry"; no thread machinery inside it. Scope: Agency Counselling only (Live Chat is anonymous/ephemeral and excluded per ADR-002; the other modalities have no request area).
6. UI: a panel/tab on the enquiry in the request area, with a post-count badge and a permanent "team-only — invisible to the advice seeker" marker, so a counsellor is never unsure which side they are writing on.

## Considered options

- **Thread in the client's room, hidden client-side.** Rejected: impossible to hide on Matrix; re-opens the ADR-008 leak class.
- **Carry the side room into the active case.** Rejected by product decision: post-accept coordination belongs to Supervision/Case Handover; a room that lives on blurs that boundary. Context continuity is served by read-only archive access instead ("frozen, on demand" rather than "open forever").
- **Wait for Megolm per-recipient subsets (one room, cryptographic hiding).** Deferred in ADR-008 already; unrealistic before go-live 2026-10-01.

## Consequences

**Positive:** reuses a shipped, leak-guarded primitive; no new permission model; clean lifecycle boundary matching the existing mechanism taxonomy. **Cost:** room provisioning at enquiry time (pre-assignment operator handling — today's facade assumes an assigned consultant); notification recipient fan-out must be built (current message producers hardcode user+consultant); archived-room re-access UI.

---

## Addendum 2026-09-05: §3 was wrong — there is no archive auto-deletion; a dedicated purge job is decided

Code archaeology on `origin/dev` (2026-09-05) checked the retention claim in decision 3 above and found it does not hold. **The "existing archive auto-deletion" this ADR relies on does not exist anywhere in the platform.** `TeamDiscussionFacade.archiveDiscussion` only sets a status and drops the Matrix power levels so the room becomes read-only; the `team_discussion` repository has no delete operation at all, and nothing time-based ever touches the table or the room. An archived Team-Besprechung — and the plain-text discussion about the advice seeker inside its Matrix room — therefore lives forever today. Changeset `0070_team_discussion` carries no foreign key to `session` either, so a session deletion leaves the row and the room orphaned rather than removing them (tracked separately as the bug below).

**Decisions:**

1. **§3 of this ADR is corrected.** The sentence "retention rides the existing archive auto-deletion — no new TTL mechanism" is void. A **new, dedicated deletion run is required**, and is hereby decided. The rest of §3 (archive re-access is read-only; access rules stay loose for now) is unchanged.
2. **Period: 90 days from archiving**, measured from `archive_date`. A discussion that was never archived and is still `OPEN` is measured from `create_date` and falls under the same period, so an abandoned discussion cannot outlive an archived one.
3. **Full purge, not anonymisation.** Unlike the case-handover audit log — where the row is kept and only its free text is cleared, because the handover history has an audit purpose — a Team-Besprechung has no audit purpose that survives the case. The Matrix room is purged via the Synapse admin API (`MatrixSynapseService.purgeRoom`, already in production use), and the `team_discussion` row plus its participant records are deleted.
4. **Configurable, with an environment override.** `team-discussion.archive.retention.days` (default 90), following the existing `team-discussion.*` property prefix and the platform's `<prefix>.retention.<x>.days` / `.cron` / `.claim.duration` convention, wired through Helm. A value of `0` or less disables the run. **90 days is a default pending the data protection officer's sign-off** — there is no statutory figure for team coordination rooms; the value follows the Caritas professional position that process data should not outlive the client relationship, and the DPIA lists it as planned but not yet implemented. It is configurable precisely so the number can be corrected without a release.

**Tickets:** ORISO-UserService#1116 (the deletion run and its configuration, sub-issue of the KDG retention epic #1010) and ORISO-UserService#1118 (bug: session deletion leaves the `team_discussion` row and its Matrix room behind — pulled forward, independent of the retention work).
