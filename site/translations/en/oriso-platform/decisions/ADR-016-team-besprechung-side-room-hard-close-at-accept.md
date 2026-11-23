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

---

## Addendum 2026-11-23: configured and switched like Supervision

**Trigger.** Frank, 2026-11-23 (P0, v2.0.18): the team chat on an enquiry "muss in Funktionszugriff genau so gesteuert werden, granular wie Supervision, auch mit der gleichen UI-Logik". Before this addendum §4's "tenant-level feature toggle" was the only control: one Träger value, no platform preset, no Beratungsstelle value, and no way to switch a running team chat off for one enquiry. Tracked in ORISO-Frontend#2491.

**Decision.**

1. **Configuration = the Supervision policy model.** `featureTeamDiscussionEnabled` becomes a permission policy like `featureSupervisionEnabled`: platform preset or requirement, Träger own value or requirement, Beratungsstelle own value unless required. The team chat's own chat features (calls, voice messages, threads, media) are policies too, configured in the same "Konfigurieren" dialog as the supervision chat features. An existing Träger value keeps its effect as that Träger's own value. This replaces the single tenant toggle of §4; the participation rule of §4 stands.
2. **Effective value = Träger AND Beratungsstelle**, enforced by UserService exactly like Supervision (`ConversationFeatureGate`): unset counts as on, an unreadable setting refuses (403), an outage answers 503.
3. **Per-enquiry on/off.** A counsellor who may see the enquiry switches the team chat on (the room is created or reopened) and off again from the case's "Weitere Funktionen", the same place Supervision lives; while it is on, the enquiry header shows a team-chat chip. Switching off sets the new status `CLOSED`: the room becomes read-only for everyone (same power-level mechanism as the archive), nothing is deleted, and it can be switched on again while the enquiry is open.
4. **Close at acceptance becomes a setting (amends §2).** A second policy, `featureTeamDiscussionAfterAcceptEnabled` (default off, same three levels, effective only when the team chat itself is on), decides what acceptance does. *Off* (default, today's behaviour): accepting archives the discussion whether it is `OPEN` or `CLOSED`; it stays attached to the case and is never deleted by acceptance; the accepting counsellor and the earlier participants can open it read-only from "Weitere Funktionen" — nobody can write in it. *On*: the discussion is not archived at acceptance and continues as the case's team side chat with the same on/off semantics, so the team keeps one attachment to the case instead of moving notes around. Switching it on in Funktionszugriff first asks for a data-protection confirmation, like Supervision (Frank, 2026-11-23).
5. **No standalone button.** The team chat is reached only through "Weitere Funktionen" and shown by the header chip while active; the separate button beside "Annehmen" goes (Frank, 2026-11-23).
6. **Retention: the purge run is unchanged, and continuing team chats are an open decision.** Only `ARCHIVED` discussions are eligible for the purge run (addendum 2026-09-05). A `CLOSED` or `OPEN` discussion is not purged by it. On a still-open enquiry that is covered by session deletion if the enquiry is abandoned (UserService #1118). With `featureTeamDiscussionAfterAcceptEnabled` on, however, `OPEN` and `CLOSED` discussions live on accepted and finished cases, and today they end only when the session itself is deleted. Whether that is the right retention, or whether continuing team chats need their own period, is **open for the data protection officer and Frank**. No rule is set here.
7. **Known limitation: a case moved to another Beratungsstelle after acceptance.** With the after-accept setting on, the team chat keeps the members it had. Counsellors of the new Beratungsstelle who join it see the old Beratungsstelle's internal history. Whether that is acceptable, or whether a move should archive the team chat, is a product decision asked of Frank (2026-11-23). The behaviour is unchanged until he decides.

**Consequences.** TenantService, AgencyService, UserService, Admin (Funktionszugriff tile on all three levels, built on the tiles of ORISO-Admin#1551/#1577) and Frontend (settings read through `useConversationFeatureSettings` like supervision; menu entry and header chip) change together. The advice seeker still never sees any of it.
