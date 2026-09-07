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

## Addendum 2026-09-05: §3 was wrong — there is no archive auto-deletion; a dedicated purge run replaces it

**Correction.** §3 says retention "rides the existing archive auto-deletion — no new TTL mechanism". That claim was never true. Verified against `ORISO-UserService` (`dev`, September 2026): archiving a Team-Besprechung (`TeamDiscussionFacade.archiveDiscussion`) only flips `team_discussion.discussion_status` to `ARCHIVED`, stamps `archive_date` and raises the room's `events_default` power level so nobody can post. Nothing is ever deleted — the repository had no delete operation, and the Matrix room kept everything the team wrote about the advice seeker, in plain text, for as long as the homeserver existed. The DPIA lists the retention period for these rooms as "planned, not yet implemented".

**Decision.** A dedicated, scheduled purge run is the retention mechanism for Team-Besprechung rooms (ORISO-UserService #1116, parent KDG epic #1010):

- **Full purge, not a status change.** After the retention period the Matrix room is purged through the Synapse admin API, then the `team_discussion` row and its `team_discussion_participant` records are deleted in one transaction.
- **Start of the period:** `archive_date`, and only `ARCHIVED` discussions are eligible. An `OPEN` discussion is never purged by this run: `team_discussion` carries no activity signal, so "open" means "not archived", not "abandoned", and purging by creation date would delete a room still in use (review on UserService #1122). A truly abandoned enquiry is covered from the other side — when its session is deleted, the deletion workflow purges the discussion and its room (UserService #1118). Should an explicit abandonment rule be wanted later, it is an additive `last_activity_date` signal, not a change to this one.
- **Purge before row delete.** The purge is the Synapse admin Delete Room API, `DELETE /_synapse/admin/v2/rooms/{roomId}` with body `{"purge": true}` and **no** `block` parameter, so an unknown room answers `404` rather than being blocked. Only that documented room-not-found result, or a `2xx`, releases the row. Every other outcome — timeout, authentication failure, `5xx`, any ambiguous error — keeps the row and its participants, and the next run retries. The pointer to a room that may still exist is never lost.
- **One replica, all tenants, nightly.** The run is leased through the scheduled-task claim (claim key `team-discussion-archive-retention`) and executes under the technical tenant context, offset from the other retention jobs (`0 45 3 * * ?`).
- **Configurable without a release:** `team-discussion.archive.retention.days` (`TEAM_DISCUSSION_ARCHIVE_RETENTION_DAYS`), wired through ORISO-Helm as `userService.teamDiscussion.archiveRetentionDays`. A value of `0` or less switches the job off.
- **Rollout gate: off until the data protection officer signs off.** The Helm chart ships the value as `0` and also falls back to `0` when the key is absent, so no ORISO deployment purges anything until an operator sets the approved period in the environment overlay. The application-level default of 90 only applies to a service started outside the chart without the environment variable.

**Effective period, for the DPIA.** Proposed: **90 days after archiving**. There is no statutory figure for team coordination rooms; the Caritas professional position is that process data goes once the client relationship has ended. 90 days is the DPIA proposal and remains **pending the data protection officer's sign-off**; until then the deployed value is `0` (job off). It is deliberately a deployment value so the number can be set, and later corrected, without a code change.

**What this does not change.** Hard close at acceptance (§2), read-only re-access during the retention period (§3, first clause) and the participation rule (§4) stand. Related, independent bug: session deletion left the discussion row and room behind (ORISO-UserService #1118) — fixed separately, not by this run.
