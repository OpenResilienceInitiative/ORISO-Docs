# ADR-027 — Restricted task identities and Keycloak commands

**Status:** Proposed, pending human technical review. **Date:** 2026-10-07.
**Accountable delivery owner:** Frank Gerhardt (Storypapst). Technical approval is requested from the active backend/deployment reviewers; this document does not claim their approval.
**Scope:** Keycloak, UserService, TenantService, AgencyService, ConsultingTypeService and Helm.
**Delivery:** [Helm #367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367), [Docs #175](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/175).

## Context

The invitation Config Wizard runs before the invited person's account exists. Its backend setup calls use the same technical credentials as unrelated automatic tasks. Human Wizard access stays invitation based; assigning the operator a new personal administrator role would not authorize these existing automatic calls.

The user requested a dedicated Config Wizard role and separate automatic identities for other duties. The accepted responsibility split includes account provisioning, maintenance/deletion and second-factor administration. Each duty needs an enforceable boundary at its receiving operation.

On source-pinned Keycloak 26.6.3, native user creation, update and deletion all use the manage permission. Native fine-grained target scopes cannot provide the required action separation. Assigning manage-users to each new account identity therefore preserves the broad power this change intends to remove.

The existing accepted [OTP provider decision](ADR-013-2fa-via-vendored-otp-config-spi.md) establishes the custom Keycloak image and bounded OTP API. It does not approve these additional account and SMTP commands. This ADR records that additional proposal explicitly.

## Proposed decision

Use distinct confidential client-credentials accounts for actual automatic responsibilities. Disable interactive/password grants and full scopes. Give each only its explicit operation capabilities, audiences and caller bindings. Runtime actors receive neither catch-all technical nor stock user/realm administration as shortcuts. Deployment administration stays separate.

Add a small command provider in the existing custom Keycloak build, separate from the OTP module. It exposes complete atomic account provisioning, limited maintenance/read commands and SMTP-only synchronization. A shared authentication boundary verifies token validity, expected audience, exact configured client and its actual service-account subject, and the directly assigned operation role. OTP uses only its own bound identity.

The provisioning identity cannot maintain/delete existing accounts. It may compensate only its own unfinished creation attempt, using a durable account/attempt/owner binding and cryptographic receipt. Commit and compensation are mutually exclusive transactional transitions; completed and compensated attempts retain tombstones, so retries cannot claim or delete another account.

Provisional accounts remain disabled until the first valid owned commit. Retrying a completed commit cannot reactivate an account disabled later. A durable recovery claim gives the original provisioner only its lost receipt and fences the previous active caller; if no creation committed, an abandonment tombstone prevents delayed creation. Recovery checks the original account kind, tenant, initial roles and authorization origin. It adds no general lookup or deletion power. UserService uses its durable creation journal and execution fencing to finish local recovery automatically after a crash; the provider does not infer domain completion.

UserService owns invitation, human permission and lifecycle authorization. Its explicit ports issue short-lived signed capabilities only after those existing checks. Account commands additionally require that capability, bound to operation, target, tenant, permitted roles, task caller and the entire bounded payload. A task bearer plus an unsigned claimed actor or tenant never proves originating authorization.

Use separate managed origin-signing keys for provisioning and maintenance, distinct from task client secrets. Keys are mandatory, persistent across restart and absent from logs/artifacts. Provider policies constrain supported origin kinds, fields, roles and target types. Human-triggered policy writes continue forwarding the actual human token where that is the receiving contract.

The shared API and migration matrix live in [the task identity contract](../contracts/technical-task-identities.md). Changes to that contract must remain coordinated across provider, caller and chart; it is not a generic Admin API tunnel.

## Alternatives considered

- Native management roles: rejected because they do not separate creation from update/deletion.
- Independent general broker: not selected by this specification; it introduces another runtime and credential boundary.
- Provider which accepts arbitrary Admin API representations: rejected because it recreates general administration under a different route.
- Human Wizard role: does not fit existing pre-account invitation setup.

## Consequences and verification

We own another small provider and its storage migration. Keycloak upgrades must preserve native validation, credentials, events and transactions, and rerun the real-token HTTP permission matrix. Receipt/key rotation must retain valid open-attempt recovery or first drain those attempts; rotating keys without that operational step is unsafe.

One process may legitimately hold several task credentials. The role split restricts what each credential can do, but does not establish process isolation. Per-operation caller, tenant, invitation, reservation and account checks remain necessary.

Installation and existing-realm upgrade reconciliation must converge to exact client/role/scope mappings repeatedly. Broad old mappings are removed only after the corresponding caller has migrated and effective deployed mappings/remaining consumers are verified. Unknown legacy mail consumers block their affected retirement; they do not justify extending generic technical permissions. A default-off, explicitly configured legacy OTP service-account bridge preserves the old OTP caller only during coordinated receiver/client/caller rollout. It checks exact client ownership and the existing restricted OTP contract, grants no additional native administration, and must be disabled before legacy retirement.

Source tests, CI, review, merge, image deployment, browser acceptance and received-mail evidence are separate gates. This proposed ADR and an open PR do not represent deployment or acceptance.

## Lifecycle and approval

The implementation is a reviewable proposal under the published specification. Change status to Accepted only when the technical reviewers approve the additional provider decision and record the approving review. ADR-013 remains accepted for OTP; this document does not supersede it.

## Source evidence

Investigation used fresh dev sources on 2026-10-07 and the exact upstream [UsersResource](https://github.com/keycloak/keycloak/blob/26.6.3/services/src/main/java/org/keycloak/services/resources/admin/UsersResource.java), [UserResource](https://github.com/keycloak/keycloak/blob/26.6.3/services/src/main/java/org/keycloak/services/resources/admin/UserResource.java) and [UserPermissionsV2](https://github.com/keycloak/keycloak/blob/26.6.3/services/src/main/java/org/keycloak/services/resources/admin/fgap/UserPermissionsV2.java). The online graph from September main was orientation only. Current runtime behavior requires its own verification.
