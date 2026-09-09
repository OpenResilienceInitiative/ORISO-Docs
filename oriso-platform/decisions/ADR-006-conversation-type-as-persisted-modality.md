# ADR-006: `conversation_type` as a persisted modality field, rolled out selector-first

- **Status:** Accepted — 2026-06-28 (grill-with-docs session). Decision made; implementation scheduled.
- **Date:** 2026-06-28
- **Deciders:** Frank (product + frontend) + AI (backend)
- **Related:** `CONTEXT-conversation-types.md` (the glossary this enforces), `ADR-001-counselling-modalities-as-modules.md` (registration-side view of the same axes), the chat-transport work (`ADR-004`/`ADR-005`), memories `oriso-dev-cluster-liquibase-disabled-configmap`, `oriso-tenantservice-liquibase-disabled`, `oriso-predev-deploy-and-ci-model`. `ADR-009` (2026-07-01) adds admin-editable/translatable **display labels** for the four values below — the enum and its per-value code paths are unchanged, not reopened by that decision.

## Superseding rollout note — 2026-07-11

- Frontend PR #340 merged the `getModality()` selector, but production components still do not use it; the selector call-site sweep remains open in Frontend #409.
- UserService does not yet persist `conversation_type`; UserService #382 owns the enum, Liquibase migration/backfill, creation-path stamping, and DTO projection.
- The Liquibase-off premise below is historical. On current PreDev, all four backend deployments expose `SPRING_LIQUIBASE_ENABLED=true`; UserService, TenantService, and AgencyService log clean changelog runs. ADR-006 therefore uses a registered boot-time UserService changeset, not a manual per-environment `ALTER`.
- Preserve the safety invariant behind the old wording: schema migration must complete before Hibernate validates the new entity fields. PreDev must prove the new changeset ran and the pod became ready.
- Frontend #410 is the current epic; #408 is the four-modality real-browser gate. Reachable Email is outside this ADR.

---

## Context

The platform has four conversation **modalities** — Agency Counselling, Live Chat, Internal Group Chat, Self-Help Group — but **no field anywhere stores which one a conversation is**. The kind is re-derived from scattered booleans (`registrationType`, `postcode`, `Anonymous-` username prefix, `teamSession`, `repetitive`, `consultant`-mismatch, presence of `matrixRoomId`) at ~90 frontend call sites and in backend queries. This is the verified root cause of the recurring "every time we touch the live chat, the chat goes fuzzy" failures: modality, lifecycle status, and structural shape are conflated (e.g. `getSessionType()` returns `enquiry | archived | group | session`, mixing three axes), so a change in one bleeds into the others.

Verification (5-agent workflow, 2026-06-28) established two facts that shape the decision:

1. **The entity split is not clean.** Agency Counselling and Live Chat are `Session` rows; Self-Help is a `Chat` row; **Internal Group Chat is dual-stored** — `createSimplifiedGroupChat` writes both a `Session` (`teamSession=true`, `registrationType=REGISTERED`) and a `Chat` row, and its `Session` shape differs from Agency Counselling **only by the `teamSession` flag**. So `teamSession` must be evaluated before `registrationType`, and the new column must exist on **both** `session` and `chat`.
2. **The naive "just add the column" path is the signature ORISO crash, and worse than a 500.** The dev cluster's `oriso-userservice-config` ConfigMap forces `SPRING_LIQUIBASE_ENABLED=false`, overriding the image's `application-dev.properties`; `spring.jpa.hibernate.ddl-auto=validate` is active in every environment. A mapped `@Column` with no matching DB column fails at `SessionFactory` initialisation → **pod CrashLoopBackOff at boot** (the whole UserService won't start), not a per-request error. The same holds for pre-dev/staging/prod (validate + Liquibase off everywhere).

## Decision

1. **Introduce an explicit `conversationType` modality** as the single source of truth, values `AGENCY_COUNSELLING · LIVE_CHAT · INTERNAL_GROUP · SELF_HELP`. **Modality (what kind) and lifecycle status (what stage) are two separate fields and must never be merged into one "type" again.**
2. **Persist it** as a nullable `conversation_type` column on both `session` and `chat` (backend is the eventual source of truth), but **roll it out selector-first** so the field can land without a half-migration crash:
   - **Step 1 — frontend read-contract first.** A single pure selector `getModality(conversation): Modality` becomes the *only* place modality is decided. It prefers `dto.conversationType` when present and **falls back** to the existing heuristic when null. The ~90 call sites collapse to this one function immediately — risk-free, no backend dependency, unit-tested with vitest. Fallback order (verified): `chat` present → (`repetitive`+WEEKLY ? `SELF_HELP` : `INTERNAL_GROUP`); else `teamSession` → `INTERNAL_GROUP`; else `registrationType===ANONYMOUS` → `LIVE_CHAT`; else `AGENCY_COUNSELLING`.
   - **Step 2 — the column, Liquibase-before-Hibernate.** Add nullable `@Column` mappings plus one registered UserService changeset for `session` and `chat`, with deterministic legacy backfill and idempotent preconditions. Boot-time Liquibase is now the schema source of truth; verify its execution before accepting Hibernate readiness. Manual ALTER is emergency fallback only, not the normal rollout.
   - **Step 3 — stamp at creation.** Default `conversationType` at the two choke-points `SessionService.saveSession` and `ChatService.saveChat`, plus explicit stamping in `createSimplifiedGroupChat` (both rows), `AnonymousConversationCreatorService` (`LIVE_CHAT`), and the easy-to-miss `AskerImportService` and `ChatReCreator` (carry-forward) paths.
3. **Backfill is trivial and disposable.** With no production users, existing rows get a one-time `UPDATE` from the heuristic, or are wiped and recreated. The heuristic in `getModality()` stays only as a null-fallback and is deleted once the column is confirmed populated everywhere.

## Considered options

- **Direct backend field, deploy immediately (Frank's first instinct).** Cleanest end state, no "two truths" window. **Rejected as the *sequence*, kept as the *target*:** deploying a mapped column before the DB has it = CrashLoopBackOff given validate + Liquibase-off. The selector-first sequence reaches the same end state safely.
- **Frontend-derived selector only, no column ever.** Cheapest, no migration. **Rejected:** leaves the source of truth as a heuristic forever; backend queries (e.g. the live-chat queue) still can't filter cleanly by modality, and the `postcode='00000'` conflation recurs server-side.
- **Keep deriving per call site.** **Rejected:** this is the status quo that produces the recurring fuzziness.

## Consequences

**Positive:** one source of truth for modality; the ~90 heuristic sites collapse to one tested function on day one; modality and status stop colliding; new modalities (Self-Help, future video) become an additive enum value; the live-chat queue can filter by `conversation_type` instead of `postcode='00000'`.

**Negative / cost:** current live Liquibase activation still drifts from the unfinished Helm defaults (#10/#11), so migration logs and permissions must be checked during rollout; `INTERNAL_GROUP` must be stamped on two rows; ambiguous historical `SELF_HELP` rows must remain nullable or be explicitly audited rather than guessed.

## Rollout runbook (for the hardening devs)

1. Merge `getModality()` selector + vitest; confirm the ~90 sites read only the selector.
2. Add nullable `@Column` mappings + registered changeset/backfill and test an empty/current MariaDB schema locally.
3. Merge to `pre-dev`; deploy the regular image and verify Liquibase executes the new changeset before Hibernate validation and health becomes green.
4. Verify Agency Counselling, Live Chat, Internal Group, and Self-Help creation end to end on PreDev.
5. Confirm no `NULL` `conversation_type` after creating one of each modality; then drop the heuristic fallback.

## Status & progress (2026-06-30)

- **Step 1 built locally (additive, green):** a pure `getModality(item): Modality` selector + `Modality` enum (`AGENCY_COUNSELLING · LIVE_CHAT · INTERNAL_GROUP · SELF_HELP`) in `src/components/session/getModality.ts`, with the verified fallback order and an explicit-`conversationType`-wins path, 8 vitest cases (red→green), `tsc --noEmit` clean. Worktree `feature/adr006-getmodality-selector` off `origin/dev`, **not pushed**.
- The ~90-site sweep (routing existing call sites through the selector) is **intentionally deferred** — it collides with open PRs #126/#275 on the hot files. Only the selector + tests landed; Steps 2–3 (the `conversation_type` column, manual ALTER-before-deploy) remain backend work for the post-collision window.

## Addendum 2026-09-04: `teamSession` is a visibility flag, not a modality

Prompted by UserService#1111 / Frontend#1299: a counsellor in a **team** advice centre accepts an ordinary 1:1 case and the server stores it as `INTERNAL_GROUP`. The frontend then shows the "Interna" label, renders the client's first structured reply as raw JSON, and Case Handover treats the case as a team session.

**Where this ADR was wrong.** The body above treats `teamSession` as sufficient evidence of a group chat: the Step-1 fallback order reads "else `teamSession` → `INTERNAL_GROUP`", and Step 3 applies the same rule when stamping at `SessionService.saveSession`. The Context section reasoned that an Internal Group Chat's `Session` "differs from Agency Counselling **only by the `teamSession` flag**", and concluded the flag must therefore be evaluated first. The premise was right and the conclusion was not — the flag carries two unrelated meanings:

1. **An internal group chat**, written by `CreateChatFacade.createSimplifiedGroupChat`, which writes both a `Session` and a `Chat` row (as this ADR describes).
2. **A "Team-Beratungsstelle" 1:1 case** — ordinary counselling in an agency where every counsellor of that agency may see the case. Nothing about it is a group chat.

Only the first is a modality. The second is visibility.

**Decision.** `teamSession` is never sufficient to derive a modality.

1. **`SessionService.saveSession` no longer derives `INTERNAL_GROUP`.** Its default is registration type alone: `ANONYMOUS → LIVE_CHAT`, otherwise `AGENCY_COUNSELLING`. This is safe because `CreateChatFacade` is the only producer of `INTERNAL_GROUP`/`SELF_HELP` sessions and stamps the modality explicitly before saving; anything reaching the default is a 1:1 case.
2. **Liquibase changeset `0091` re-stamps the rows the old rule mislabelled**, by registration type, exactly as `saveSession` now defaults them. Real group chats are recognised by what only the group-chat path produces, and any one of three signals is enough to exclude a row: a `group_chat_participant` row for the session (that column is named `chat_id` for historical reasons but stores the **session** id — see the entity javadoc); a `chat` row sharing the session's Matrix room id; or the tenant system user `group-chat-system[-<tenant>]` as the session's user. All three exclusions fail **safe** — an ambiguous row keeps its old label rather than risking a real group chat being relabelled. `SELF_HELP` rows are never touched. The migration is data-only and idempotent, and its rollback is deliberately a no-op because the previous `INTERNAL_GROUP` label was the defect: there is nothing correct to restore.

**Consequence for the selector.** `getModality()` resolves an explicit backend `conversationType` first, so it is correct for every stamped row. Its null-fallback is not: it keeps this ADR's original `teamSession → INTERNAL_GROUP` branch (`getModality.ts`), and `getModality.test.ts` pins that as intended behaviour ("classifies a team session as INTERNAL_GROUP even when registered"). After `0091` the fallback should be unreachable for existing rows, but the wrong rule is still encoded in both the selector and its test.

**Not yet done:** correct the `teamSession` branch in `getModality()` and the test that pins it — or delete the heuristic fallback entirely once `conversation_type` is confirmed non-null everywhere, which step 5 of the rollout runbook above already calls for.
