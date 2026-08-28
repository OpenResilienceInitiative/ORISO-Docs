# ADR-007: Live-chat liveness — the indicator reads backend Availability, never mirrors or infers it

- **Status:** Accepted — 2026-06-28 (grill-with-docs session). Root causes verified; fix scheduled.
- **Date:** 2026-06-28
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `CONTEXT-conversation-types.md` (Availability / Waiting room terms), `ADR-005-matrix-federation-off-dns-server-name` (the badge-gating trade-off touches this), `ADR-006` (the modality field). Findings from the 2026-06-28 liveness verification workflow.

---

## Context

The recurring complaint "the live chat keeps showing people as *live* when nobody is" is **not** an architecture gap, contrary to a first reading. Verification established that the backend **Availability** model is sound and already implements exactly the product intent (an explicit "go live" toggle, auto-off on logout, TTL-bounded):

- `ConsultantActivityRegistry` (in-memory) holds the currently-available counsellors; `CONSULTANT_AVAILABILITY_ACTIVE_WINDOW_MS = 120000` (120s TTL); `ConsultantActivityInterceptor.refreshIfAvailable` heartbeats on every authenticated counsellor request; logout calls `apiSetLiveChatAvailability(false)`.
- This is **deliberately decoupled from Matrix/RC presence**, because Matrix presence is unreliable for live chat (noted in `TopicConsultantRoutingService`).

The bug is that the **visible** liveness has **three independent wrong sources**, none of which read that authoritative model:

1. **Nav green pill** — driven entirely by a `localStorage` flag (`caritas_liveChatAvailability`, `liveChatToggle.ts`), a *write-only mirror* that re-asserts FE→BE but never reads BE→FE. When the 120s TTL drops the counsellor, the pill stays lit indefinitely (`NavigationBar.tsx`).
2. **Per-session "live" badge** — derived from chat **type** (`isAnonymousChat ? 'live' : 'nearby'`, `SessionHeaderComponent.tsx:742`), so *every* Live Chat session shows "live" regardless of presence.
3. **Persisted `Session.status = ACTIVE`** — never reset when a live chat is abandoned; the reaper (`DeactivateAnonymousUserService`) only sweeps after a 6h window (`deactivateworkflow.periodMinutes=360`), so a dead session reads live for hours.

Separately, the Live-Chat queue uses `ORDER BY s.createDate DESC` in three `SessionRepository` queries (lines 211/229/248) — newest-first — while the ratsuchende's "people ahead of me" position counts oldest-first, so list order and position disagree (a FIFO bug).

## Decision

1. **Availability stays backend-authoritative; the indicator becomes a READ of it, never a mirror.** Add `GET /conversations/consultants/availability` (self) returning `{available}` from `ConsultantActivityRegistry.filterActive()`; the nav polls it (interval < 120s TTL, e.g. 30–45s) and drives the pill from the result. Make the `localStorage` store TTL-aware (expiry stamp; treat as OFF on an unavailable/empty poll). The FE→BE re-assert must not silently re-mark a counsellor available without intent.
2. **The per-session badge stops keying on chat type.** Gate "live" on Availability / active-session state (and never show "live" for `DONE`), **not** on `isAnonymousChat`.
3. **Abandoned live sessions get a prompt, live-chat-specific teardown** — transition the owned `IN_PROGRESS` session to `DONE` on counsellor logout/toggle-off (reuse `DeactivateSessionActionCommand`), and apply a live-chat-specific timeout in minutes, separate from the 6h anonymous-user deactivation window.
4. **Queue is true FIFO** — change the three `ORDER BY createDate DESC` to `ASC` so list order matches the position count.
5. **Keep the waiting room decoupled** — the ratsuchende continues to see only FIFO position, never counsellor Availability (see CONTEXT). None of this needs a schema change, so it does not touch the Liquibase-off hazard.

## Considered options (badge gating)

- **Gate the per-session badge on real-time RC/Matrix presence.** Most "honest", but couples the fix to the unreliable presence layer and the ADR-005 Matrix rebuild. **Rejected for now.**
- **Gate it on Availability / active-session state (chosen).** Transport-agnostic, ships immediately, consistent with the deliberate decoupling from Matrix/RC presence.

## Consequences

**Positive:** the green pill and per-session badge finally reflect reality; the whole fix ships now, independent of the Matrix SDK rebuild; FIFO order and position agree. **Negative / cost:** a poll adds light traffic (bounded by the TTL); on a backend restart the in-memory registry empties, so all counsellors read unavailable until they re-toggle — which is the *correct* behaviour and must not be "fixed" by auto-re-asserting from the stale FE flag.

## Resolved product questions (Frank, 2026-06-28)

1. **Time-to-DONE** for an abandoned `IN_PROGRESS` live session → **10 minutes** (a live-chat-specific window, separate from the 6h anonymous-user deactivation sweep).
2. **Idle-but-toggled-on** → keep the existing **~2.5h inactivity auto-logout**; the per-request heartbeat keeps an actively-working counsellor available, so the availability poll should not flip a working counsellor OFF on its own. **New feature spun off** (separate task / mini-spec): a **pre-logout warning ~5 min before** auto-logout, delivered as a notification (optionally with a distinct "logged-out" sound), offering **extend** buttons (+1h / +3h / max 6h). To be located in the existing auto-logout code, then built or at minimum documented.
3. **Badge gating** → **option (b)**: gate the per-session "live" badge on Availability / active-session state, not real RC/Matrix presence — keeps the whole fix transport-agnostic and independent of ADR-005.
4. **After a backend restart** → **force counsellors to re-toggle**; do not auto-re-assert availability from the stale FE flag (that resurrects stuck-live).

> The exact auto-logout mechanism (≈2.5h) is being located in code so the warning/extend feature attaches to the real implementation.

## Status & progress (2026-06-30)

- **Slice 1 of 4 built locally (additive, green):** the self-availability READ — `GET /conversations/consultants/availability` returning `{available}` from `ConsultantActivityRegistry.filterActive()` — is implemented on the existing `ConsultantLiveAvailabilityController` (**no SecurityConfig change** — the `/conversations/consultants/**` rule already covers the GET) with a 3-case `WebMvcTest` (active / inactive / non-consultant), red→green. Worktree `feature/adr007-consultant-availability-read` off `origin/dev`, **not pushed**.
- **Held (collide with open PRs, queued):** the per-session badge gating (`SessionHeaderComponent` — collision-safe, next up), the nav-pill read (`NavigationBar` — HOLD behind #126), and the FIFO `ASC` + 10-min live-chat teardown (`SessionRepository` — HOLD behind case-handover #186). Build after those merge / rebase.
