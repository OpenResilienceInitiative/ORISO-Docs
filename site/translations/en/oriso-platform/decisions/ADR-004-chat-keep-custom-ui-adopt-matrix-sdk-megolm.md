# ADR-004: Keep the custom chat UI; adopt matrix-js-sdk Megolm under it (don't embed Element Web)

- **Status:** Accepted — 2026-06-26 (grill-with-docs session). June-30 scope and the crypto sequencing are fixed; the SDK-Megolm migration itself is scheduled, not yet built.
- **Date:** 2026-06-26
- **Deciders:** Frank (product + frontend) + AI (backend)
- **Related:** [[1 Analysis/ADRS/ADR-005-matrix-federation-off-dns-server-name]] (hard prerequisite — SDK crypto binds device keys to MXIDs), `ORISO-Frontend/CONTEXT.md` ("labelled-encrypted vs Megolm-encrypted" flag), findings US-H01 (RC teardown), FE-H11 (1.5s polling), FE-H07 (message-preview leak), US-M04 (queue persistence); `ORISO-Element` (the unused element-web v1.11.55 distribution)

## Implementation amendment — 2026-07-11

- `pre-dev` now initializes SDK/Rust crypto before `startClient()` and creates/uses Megolm-encrypted rooms. Real-browser proof covers two users, reload persistence, encrypted advice-seeker membership/messages, and shared two-party Element Calls.
- This is deliberately a **disposable PreDev implementation proof** on the existing bare-IP MXID namespace. It does not revoke ADR-005's durable identity decision. The clean DNS-identity rebuild still precedes real carrier onboarding, and crypto/device/recovery proof must be repeated after it.
- `dev` does not yet contain this implementation; promotion is under review in Frontend #406. Issue #332 is partially delivered by this slice but remains open for key backup/recovery, cross-signing, and durable multi-device verification. Issue #346 remains open because `matrix-js-sdk` is still 38.4.

## Implementation amendment — 2026-07-19 (crypto is now DURABLE, not a disposable proof)

The ADR-005 clean DNS-identity homeserver rebuild is **done**, so the SDK/Rust crypto is no longer the "disposable PreDev implementation proof" of the 2026-07-11 amendment — it is the **durable, accepted runtime state**. Verified in `origin/pre-dev` code:

- `src/services/matrixClientService.ts` calls `initRustCrypto(...)` **unconditionally** on every client init (IndexedDB store, per-user/device prefix). There is no "crypto off" path anymore.
- Landed beyond what the 07-11 amendment listed as open under #332: key backup (`matrixKeyBackupService.ts`), device isolation / MSC4153 "invisible crypto" (`matrixDeviceIsolation.ts`, #438), and the `EncryptionSettings` profile panel.
- Rooms carry `m.room.encryption` (Helm `MATRIX_ENCRYPTION_ENABLED=true`), so `sendEvent` Megolm-encrypts automatically. Decryption failures are observed live in `utdTracker.ts` via `MatrixEventEvent.Decrypted` / `event.isDecryptionFailure()`.

**Superseded as historical** — the following described the pre-crypto state and are no longer true: Context ¶2 ("matrix-js-sdk crypto is **dormant** … no `initRustCrypto`"), the Consequences "no native room encryption" line, and "Status & progress (verified 2026-07-10)" bullet 3 ("no `initRustCrypto` call on current `origin/dev` or `origin/pre-dev`"). Residual multi-device-recovery hardening and the `matrix-js-sdk` 38.4 bump may still track under #332/#346; the crypto **activation** decision is fully realised.

The stale in-code comment in `messageSubmitInterfaceComponent.tsx` ("Matrix messages go through the SDK path unencrypted (ADR-004)") is corrected in a separate change — its `isEncrypted = false` is the removed **legacy Rocket.Chat** flag, not the Matrix crypto switch.

---

## Context

The chat is **not** an Element fork. At decision time, `ORISO-Frontend` was the old Caritas/online-beratung Rocket.Chat-based UI with Matrix bolted on alongside. Since Frontend PR #359 and UserService PR #281, the runtime path is Matrix-only; remaining `rc*` names are compatibility wire/database contracts, not an active Rocket.Chat transport. A complete `ORISO-Element` distribution remains an unused reference implementation next to the hand-built frontend.

The keystone problem remains that **matrix-js-sdk crypto is dormant**: current `origin/dev` and `origin/pre-dev` have no `initRustCrypto()` call, so Olm/Megolm never initializes. PR #359 removed the runtime `crypto-js` dependency and left `useE2EE` as an inert compatibility hook; that removed the old custom encryption path but did **not** add Matrix room encryption. Real Megolm, key backup, cross-signing, and device verification are still missing.

Constraints shaping the decision: a hard **June 30** feature deadline (live chat ~90–95% done); a user population with strong **accessibility** needs; and an explicit goal of not reinventing battle-tested logic, while avoiding the "spend 3 days half-rebuilding, then 10 more days repairing" trap.

## Decision drivers

- Full control of UX, theming and **accessibility** (font scaling, contrast, focus, keyboard, screen-reader) for vulnerable users.
- Hit June 30 without a half-finished rebuild reaching the demo.
- Stop reinventing what the SDK gives for free — but adopt it safely, not in the deadline week.
- The chat carries the platform's domain model (agency/Träger, topic, queue/waiting-room, anonymous sessions) that a generic messenger does not.

## Decision

1. **Keep the hand-built UI as the product surface. Do NOT embed Element Web.** A generic Element timeline does not carry the agency/topic/queue/anonymous model and would cost the accessibility control we want.
2. **Adopt matrix-js-sdk Megolm crypto under the existing UI** (replace the `crypto-js` scheme), but **only after** the clean homeserver rebuild in [[1 Analysis/ADRS/ADR-005-matrix-federation-off-dns-server-name]] — device keys and key backup bind to MXIDs, and today's MXIDs are built on a bare IP that will change.
3. **Reuse, don't rebuild, where liftable.** Lift ElementCall's settings store, device picker and a11y primitives (font scaling, reduced-motion, keyboard shortcuts) into our shell rather than authoring them.
4. **Use the landed `ChatTransport` facade** as the seam under the custom UI. PR #359 completed the Matrix-only runtime cutover; SDK crypto must be added behind this seam rather than by rebuilding the interface.
5. **Keep transport migration and crypto activation as separate verified steps.** The transport cutover is complete. Crypto activation stays blocked until ADR-005 provides stable DNS-based MXIDs, after which encrypted-room creation and device/key recovery must be proven end to end.

## Considered options

- **Embed Element Web behind the proven ElementCall iframe seam.** Cheapest path to reactions/edits/search/proper crypto ("days not weeks" of host-side wrapper). **Rejected** for the product surface: Element is a generic messenger with no agency/topic/queue/anonymous model, and embedding forfeits the accessibility control that motivates the whole effort. Kept on the table only as a possible future spike, not the chosen direction.
- **Keep the custom UI and keep crypto-js indefinitely.** No crypto migration. **Rejected:** leaves us permanently reinventing pagination/reactions/edits/search and without key backup or device verification, and keeps the "labelled-but-not-encrypted" hazard.
- **Adopt SDK Megolm now (in the deadline week).** **Rejected:** blocked by the bare-IP `server_name` (ADR-005); enabling crypto first means redoing it after the homeserver rebuild, and touching crypto under deadline pressure risks a plaintext leak.

## Consequences

**Positive:** full UX/accessibility control; the Matrix-vs-RC branch collapses once the facade lands, so Rocket.Chat becomes deletable; over time the SDK delivers pagination/reactions/edits/redactions/read-receipts/key-backup for "free"; the June-30 path cannot half-break the demo (strangler flag).

**Negative / cost:** we keep maintaining the timeline shell ourselves; the SDK-Megolm migration is a real project that touches login, room creation, device identity, backup, and recovery and **must** be sequenced after ADR-005. Until then the Matrix-only runtime has no native room encryption.

## Sequencing

- **Completed:** Matrix-only runtime cutover via Frontend #359 and UserService #281; old custom crypto removed from the runtime; remaining `rc*` names are coordinated-contract cleanup.
- **Next, after ADR-005:** upgrade/adapt the SDK as needed, call `initRustCrypto`, create truly encrypted rooms, add key backup/cross-signing/device verification, and prove multi-user/multi-device recovery before dependent group-E2EE features.

## Status & progress (verified 2026-07-10)

- Frontend #359 merged 2026-07-04: Matrix-only `ChatTransport`, Matrix receipts/timeline, Rocket.Chat frontend/runtime removal, inert `useE2EE` compatibility API, no SDK crypto.
- UserService #281 merged 2026-07-03: `rocket-chat.enabled=false` by default and Matrix-only group/session provisioning; legacy DB/DTO names remain.
- Frontend #332 and #346 are open. `matrix-js-sdk` is still 38.4 and there is no `initRustCrypto` call on current `origin/dev` or `origin/pre-dev`.
- ADR-005 is only partially applied. Federation hardening reached Pre-Dev, but the homeserver still uses the bare-IP `server_name`; the clean rebuild remains the hard blocker.
- ORISO-Helm PR #32 and UserService PR #370 were opened on 2026-07-09 and are green. They lock configurable DNS-based Matrix identity and MXID invariants, but they do not provide the required Pre-Dev `matrix.oriso-dev.site` overlay, perform the clean DNS/TLS-backed homeserver install, or initialize crypto.
- Frontend PR #389 was closed without merge. Its removal of encrypted-room guards and `matrixRoomEncryption` is the opposite of this accepted ADR and must not be reused. The current `pre-dev` code still retains the encryption helper.
- Frontend PR #397 targets `pre-dev` and changes Matrix client construction for logging. The Megolm implementation must preserve its logger injection or resolve that small overlap after it lands; it must not duplicate the logging work.

The former `feat/chat-transport-facade` worktree note below is historical. Its
behavior was subsumed by merged PR #359; it is not an active implementation
branch. New crypto work uses isolated worktrees from `origin/pre-dev` and never
uses `main`.

**Historical first slice (later subsumed by merged PR #359):**
- **#303 — `ChatTransport` seam DONE.** New `src/services/chatTransport/`:
  `ChatTransport` interface + `MatrixChatTransport` adapter (pure delegation to
  `MatrixClientService`) + `getChatTransport()` bound to the client registry,
  with 8 contract tests. Nothing routes through it yet (that is #304).
- **#307 — ci-main now gates on `npm run test:unit`** (previously build-only) and
  four dead call-widget duplicates removed.
- **#306 — FE-H07 regression test added.** The leak is already closed on `dev`
  (`apiSendMessage` forwards no `messagePreview` on the Matrix path); the test
  locks that boundary so the twice-seen re-leak now fails CI.

**Survey corrections to the original sequencing (2026-06-28):**
- **FE-M08 is already on `dev`** (`src/utils/matrixRoomUtils.ts` centralises
  `isMatrixRoom`) — no work needed; the original plan over-counted it.
- **Component re-routing (#304) and the polling fix (#305) are HELD.** Open PRs
  #126 (focus-ring) and #275 (case-handover) edit
  `matrixClientService`/`messageSubmitInterfaceComponent`/`SessionStream`; routing
  through them now would collide. Build after they merge, then rebase.
- **The in-flight modernization has landed: react-router v5→v7 (PR #329 MERGED)**
  on top of React 19.2.3. The chat branch (based on pre-v7 `dev`, now ~30 commits
  behind) must be **rebased onto current `dev` and re-tested under router v7**
  before it is pushed — this is the "re-test against the modernization" step.

Net: the keystone seam exists and is safe; the risky component surgery is
deliberately deferred behind the collision holds + the router-v7 rebase.
