# [KDG] Epic: client-side storage & session hardening

**Target repo:** ORISO-Frontend (cross-links: ORISO-UserService, ORISO-Admin)
**Source:** DSFA inventory 2026-08-13 (`dsfa-inventar-frontend-infra.md`, `dsfa-deepdive-voice-e2ee.md`), re-verified against the current codebase on 2026-08-14.

## Why

ORISO counselling agencies routinely use **shared PCs**: several counsellors — and in walk-in settings, advice seekers — use the same browser profile. Anything the app leaves behind in `localStorage`, cookies, or IndexedDB after logout is readable by the next person at that machine. The DSFA inventory found four gaps that turn this from a theoretical risk into a concrete KDG/GDPR finding: leftover plaintext counselling drafts, E2EE key material surviving logout, JS-readable auth tokens stored twice, and a media-permission gate that agencies cannot scope. This epic closes the client-storage part of the DSFA action list.

## Verified current state (code evidence)

1. **Drafts are already server-side and E2EE-aware.** `useDraftMessage` (`src/components/messageSubmitInterface/useDraftMessage.tsx`) autosaves (1.5 s debounce, plus on pre-logout) via `apiUpsertUserDraft` → UserService `PATCH /users/drafts` (`DraftMessageController`, `draft_message` table, tenant-filtered). Drafts for encrypted rooms are encrypted with the room key (`encryptText`) before upload. The feared "plaintext drafts in localStorage" writer is **dead code**: `saveDraftEntry` in `src/services/draftStore.ts` has no callers — but the module still exists, and **legacy plaintext drafts under `oriso.chatDrafts.v1` are never cleaned up** on devices that ran older builds. Logout (`src/components/logout/logout.ts`) removes only Matrix keys, token expiries, and cookies — no draft cleanup, no `localStorage.clear()`.
2. **E2EE crypto store survives logout.** `matrixClientService.logout()` (`src/services/matrixClientService.ts:625`) calls `client.logout()` but never deletes the IndexedDB crypto stores (`oriso-matrix-<user>-<device>`): device keys, Olm/Megolm sessions and cached secrets stay on the shared machine.
3. **Keycloak tokens live twice, both JS-readable.** `setValueInCookie` (`src/components/sessionCookie/accessSessionCookie.ts:52-59`) mirrors every token cookie write into `localStorage` (`auth.keycloak`, `auth.refreshToken`); cookies are `SameSite=Strict; secure` but cannot be HttpOnly (frontend-written, known FE-H01/AD-H04). The UI-version toggle additionally writes the **Matrix access token into `SameSite=Lax`, non-HttpOnly cookies** (`src/components/uiVersionToggle/UIVersionToggle.tsx:69-72`).
4. **Composer media gate is tenant-only.** `isVoiceMessageEnabledForCurrentChat` / `hasUploadFunctionality` (`messageSubmitInterfaceComponent.tsx:1990-2006`) read exclusively `tenant?.settings` (`TenantDataInterface.ts:40-44,76-80`); no agency-level media/voice flags exist anywhere in the frontend data model, so an agency cannot be stricter than its Träger.
5. **No idle timeout exists** — nothing in the frontend logs out an abandoned session on a shared PC.

## Tasks (ordered)

- [ ] **1. Remove the legacy local draft store and wipe leftovers.** Delete the dead write/read paths in `src/services/draftStore.ts` (keep `DRAFTS_UPDATED_EVENT` / `REMOTE_DRAFT_INDEX_SCOPE`, still imported by `SessionsList.tsx` and `DraftsCenter.tsx`), and add a one-time startup cleanup that removes `oriso.chatDrafts.v1` from `localStorage`. *AC:* no code path writes drafts to Web Storage; on first load after deploy the key is gone; unit test covers the cleanup. **(S)**
- [ ] **2. Remove the unused legacy draft API client.** `src/api/apiDraftMessages.ts` (`apiPostDraftMessage`/`apiGetDraftMessage`, matrixRoomId-header endpoint) has no callers. *AC:* file and endpoint entry removed; build and tests green. **(S)**
- [ ] **3. Sweep residual storage on logout.** Extend `invalidateCookies()` in `src/components/logout/logout.ts` to remove all `oriso.*` app keys (drafts leftovers, circle defaults, notification settings, availability flags) and `sessionStorage`, after the pre-logout draft flush. *AC:* after logout on a shared machine, Web Storage contains no user-scoped keys; E2E asserts this. **(M)**
- [ ] **4. Wipe the Matrix crypto store on explicit logout (per ADR-XXX-B).** In `matrixClientService.logout()`, delete the IndexedDB stores (`client.clearStores()` / crypto-store deletion) after `client.logout()`, for explicit user logout only — not on token refresh or client re-init. Must be coordinated with #551 (lost-crypto-store wedge) and relies on server key backup (#437) / device dehydration (#439) for history recovery. *AC:* after logout, no `oriso-matrix-*` IndexedDB database remains; re-login on the same device recovers history via key backup; E2E covers logout→login→read-old-message. **(L)**
- [ ] **5. Drop the localStorage token mirror.** Remove `setAuthStorageValue`/`getAuthStorageValue` for `auth.keycloak`/`auth.refreshToken` in `accessSessionCookie.ts` (or gate to the documented cookie-unavailable fallback only), so tokens exist in the cookie alone. *AC:* normal operation stores no token in Web Storage; login/refresh/logout E2E green. **(M)**
- [ ] **6. Harden the `matrix_sso_*` handoff cookies.** In `UIVersionToggle.tsx`: set an explicit short `Max-Age` (seconds), and delete the four cookies on logout and after the Element UI has consumed them. Evaluate `SameSite=Strict` (handoff is same-site navigation). *AC:* cookies absent a minute after toggle and always absent after logout. **(S)**
- [ ] **7. Idle timeout for shared devices.** Add a configurable inactivity logout (default proposal: 30 min, tenant-overridable), aligned with the Keycloak realm SSO idle lifetime (values live in the neusta realm — export first). *AC:* an abandoned session logs out and lands on the login page; timer resets on activity; setting documented for operators. **(M)**
- [ ] **8. Agency-level media/voice permission flags.** Cross-repo (AgencyService/TenantService + Admin + Frontend): allow an agency to restrict media upload/voice below its tenant's setting; composer gate evaluates tenant AND agency flags (most restrictive wins). Depends on decision D3; relates to media EPIC Admin#366 (on hold). *AC:* agency with media disabled shows no upload/voice controls even when the tenant allows them. **(L)**
- [ ] **9. UserService: purge legacy plaintext-era and empty draft rows.** Extend the cleanup already scoped in UserService#983 to also identify draft rows for encrypted rooms whose `text` predates room-key encryption. *AC:* migration/cleanup documented and executed on pre-dev. **(M — lives in ORISO-UserService)**

## Existing issues to link (do not duplicate)

- ORISO-Frontend#196 — [FE-H01] Matrix token in localStorage / JS-readable cookies → tasks 5, 6 close parts of it
- ORISO-Admin#148 — [AD-H04] Keycloak tokens in JS-readable cookies (Admin twin of task 5)
- ORISO-Docs#72 — [SEC-CLOSE] security-audit closure epic (this epic feeds its client-storage findings)
- ORISO-UserService#983 — empty draft rows cleanup → task 9
- ORISO-Frontend#976 — stuck draft badge (context for 983)
- ORISO-Frontend#478 — draft.created timeline writer: notes drafts as "client-only", now outdated — update after this epic
- ORISO-Frontend#53 — [Question] draft encryption — answer and close via ADR-XXX-A
- ORISO-Frontend#551 — lost crypto store wedges encrypted sends — must be fixed before/with task 4
- ORISO-Frontend#225 — [FE-H10] Matrix client lifecycle/teardown — adjacent to task 4
- ORISO-Admin#366 — media upload EPIC (agency-level flags, task 8)

## Decisions needed

- **D1 (ADR-XXX-A):** ratify server-persisted, room-key-encrypted drafts as the target model (vs. session-only or wipe-on-logout). Plaintext drafts for *unencrypted* rooms are stored server-side — accept and document, or encrypt those too?
- **D2 (ADR-XXX-B):** crypto-store wipe on logout — wipe always vs. keep for faster re-login. Prerequisite: key backup (#437) enrolment rate; interaction with silent key backup setup (ADR-019) and #551.
- **D3:** is agency-level media governance a KDG requirement or a nice-to-have? Determines whether task 8 is in this epic or deferred to Admin#366.
- **D4:** idle-timeout duration and whether it must match the Keycloak realm SSO idle lifetime (needs realm export from the neusta branch).

## Appendix: ADR sketches (numbers pending registry cleanup)

**ADR-XXX-A — Message draft persistence**
Context: drafts contain counselling content (potentially health data); shared-PC deployments make client persistence risky. A server draft store (`draft_message`, `/users/drafts`) with room-key encryption for E2EE rooms is already live; a legacy plaintext localStorage store is dead code with residues in the field.
Options: (1) server-persisted, room-key-encrypted [status quo]; (2) sessionStorage only; (3) encrypted localStorage derived from the Matrix crypto store; (4) no persistence, wipe on logout.
Recommendation: **(1)** — survives device switches, inherits the room's E2EE, nothing readable at the shared PC once legacy keys are wiped (task 1/3). Accept server-side plaintext for unencrypted rooms (equivalent to the messages themselves) and document it in the DSFA.

**ADR-XXX-B — Logout semantics for the E2EE crypto store**
Context: `oriso-matrix-*` IndexedDB (device keys, Megolm sessions) currently survives logout; on shared devices this leaves decryption-capable key material behind. Keeping it makes re-login fast; server key backup (#437) + silent backup setup (ADR-019) + dehydrated devices (#439) already exist as the recovery path.
Options: (1) always wipe on explicit logout; (2) keep (status quo); (3) user choice ("trusted device" checkbox).
Recommendation: **(1)** for a counselling platform — shared-device protection outranks re-login convenience; recovery is covered by key backup. Revisit (3) only if backup enrolment proves unreliable. Do not wipe on token refresh/re-init (would recreate #551).
