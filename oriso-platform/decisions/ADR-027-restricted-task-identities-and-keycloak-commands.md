# ADR-027 — Scenario C task identities and native permission boundaries

**Status:** Proposed; technical approval and production cutover remain open. **Updated:** 2026-10-14.
**Accountable delivery owner:** Frank Gerhardt (Storypapst). **Technical reviewers:** Hassan Saeed and Shazia Kausar.
**Scope:** Keycloak, UserService, TenantService, AgencyService, ConsultingTypeService and Helm.
**Delivery:** [Helm367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367), [C coordination423](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/423), [Docs175](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/175).

## Current decision: scenario C

Hassan and Shazia selected scenario C on9 October2026: five grouped automatic identities, ORISO receiver checks and native Keycloak account permissions where the spike proves the required limits. The earlier fourteen-identity account-provider proposal below is superseded as the implementation target. All38 user-story outcomes remain required; choosing C does not remove account ownership, recovery, tenant boundaries or mail acceptance.

The Config Wizard still runs through an invitation before the invited person's completed account exists. Its backend operations belong to the setup identity. The eventual human role comes from the invitation; a grouped automatic identity is not a new administrator role for the person completing setup.

| Automatic identity | Responsibilities |
| --- | --- |
| Setup | Config Wizard, invitation reservation allocation/cleanup, controlled consultant import |
| Account creation | Initial ordinary account provisioning and its own unfinished attempts |
| Account administration | Authorized existing-account maintenance, second-factor administration, explicitly preserved session compatibility |
| Mail | Delivery, notification dispatch and a proved bounded SMTP control operation |
| Runtime | Policy reads, Matrix operations, appointment synchronization and participant cleanup |

Five credential bindings do not mean five generic permission checks. The operation purposes remain explicit, with the same originating human, tenant, target, invitation and reservation checks. Effective roles, audiences, client, service-account subject and forbidden inherited grants must be checked at each receiver. Identical credentials are valid only for purposes mapped to the same actor; collisions between actors fail startup.

## Native account policy and human groups

The native spike shows ordinary account creation and maintenance can be limited through role groups. Direct role mapping is not a substitute: the spike demonstrated that role-mapping power reaches protected users. Native management shortcuts bypass the group model.

Existing human roles must migrate to one explicitly reviewed combined group per exact account kind, preserving effective realm and client roles. Unknown combinations and technical principals are reported and left untouched. Ordinary counselling-centre-admin combinations may use ordinary human-role groups as specified in424. Platform and Traeger administrators remain protected. Group migration and policy enablement are separate changes; an opt-in migration tool never turns on native enforcement.

**For developers — native group and grant contract:**
```text
/pending-provisioning
/human-roles/<explicit combined kind>
/protected-admins/<explicit protected kind>
Groups-only FGAP; no global Users/Roles permission shortcut.
Runtime actors: no manage-users, view-users, realm-admin or manage-realm.
Creation commit via group join; pending cleanup belongs to account-admin.
Unknown mappings: report, do not guess. Dry-run: no receiver mutation.
```

The six native-spike guarantees are isolated receiver evidence, not full production lifecycle proof. Native group join removes the creation actor's access. Disabled pending-account activation, uncertain HTTP outcomes, durable attempt fencing and retries after an independent administrator disables the account must be proved before replacing the creation journal adapter. Protected platform/Traeger invitation provisioning also needs an explicit privileged owner and flow; ordinary actors must not gain protected-role assignment merely to complete setup.

## SMTP native gap and bounded alternative

The new [native SMTP proof](https://github.com/OpenResilienceInitiative/ORISO-Helm/pull/430) shows native realm management accepts SMTP plus unrelated settings. With native fine-grained administration enabled, that same permission can edit the permission store and grant itself user-management access. Ordinary mail callers must not receive it.

**For developers — actual isolated Keycloak26.6.3 evidence:**
```text
Six methods, zero skips; tests/keycloak_native_smtp_permissions_test.py.
SMTP, unrelated and mixed realm updates:204 with manage-realm.
FGAP self-grant:policy201 + Users/manage permission201, user update204.
Ordinary mail and foreign realm administration:403.
Realms/SMTP fine-grained permission resource types:400.
These passing characterization tests prove a blocking native capability gap.
```

A small standalone SMTP-only receiver is being prepared as an unactivated proposal under57/53. It would validate only the bounded SMTP representation, exact mail actor and purpose-bound context; ordinary mail bearer alone would not authorize the control operation. It adds no account provider. Its positive receiving-boundary tests and explicit technical approval are required before production packaging or credential grouping.

Keeping the current isolated SMTP control credential is the safe existing state. It is an explicit temporary exception to exactly five actors, not a hidden accepted sixth actor. The team must choose a proved bounded boundary or record an accepted exception before mail cutover.

## Origin context and residual trust

C uses one managed context key for cross-service proofs, with explicit purpose, operation, actor, tenant, target and full-payload binding. Same-process Java authorization may use typed originating context after domain checks; unsigned HTTP claims between services cannot replace receiver proof. The former four-key design is historical.

One process holding several actor credentials and the context key does not gain process isolation from role names. A compromised process can invoke the powers it legitimately holds. This residual trust and context replay/idempotence limits require explicit technical review; they are not closed by green unit tests.

The accepted [ADR-013 OTP decision](ADR-013-2fa-via-vendored-otp-config-spi.md) remains in force. Native credential deletion tests do not prove the existing custom OTP setup/verification endpoints are target-scoped. Session exchange retains its separately recorded compatibility limitation; no new session issuer or impersonation permission is introduced by C.

## Activation gates and migration order

1. Accept the native account conditions and resolve SMTP, protected-admin provisioning and native recovery.
2. Establish and migrate exact human groups on a realm copy; verify fresh/existing/twice behavior.
3. Load and reconcile the native policy with compatible receivers; prove real-token allowed and denied operations.
4. Wire the five callers only after their contracts are ready; verify actual deployed revisions and every retained user journey.
5. Retire old grants/secrets only after external consumer and open-reservation proof; keep source, review, merge, deployment, browser and received-mail evidence separate.

This ADR remains Proposed until Hassan and Shazia record technical approval. Source preparation and a draft PR neither approve the new conditions nor enable production permissions.

## Historical option D record — superseded implementation target

The following original record is preserved for traceability. Its fourteen actors, account command provider, four keys and wire endpoints do not control scenario C. Its security and recovery outcomes still identify retained requirements where C has not yet proved an equivalent.

# ADR-027 — Restricted task identities and Keycloak commands

**Status:** Proposed, pending human technical review. **Date:** 2026-10-07.
**Accountable delivery owner:** Frank Gerhardt (Storypapst). Technical approval is requested from the active backend/deployment reviewers; this document does not claim their approval.
**Scope:** Keycloak, UserService, TenantService, AgencyService, ConsultingTypeService and Helm.
**Delivery:** [Helm #367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367), [Docs #175](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/175).

## Context

The invitation Config Wizard runs before the invited person's account exists. Its backend setup calls use the same technical credentials as unrelated automatic tasks. Human Wizard access stays invitation based; assigning the operator a new personal administrator role would not authorize these existing automatic calls.

The user requested a dedicated Config Wizard role and separate automatic identities for other duties. The accepted responsibility split includes account provisioning, maintenance/deletion and second-factor administration. Each duty needs an enforceable boundary at its receiving operation.

On source-pinned Keycloak 26.6.3, the usual native user-creation path checks the global manage permission, with a separate group-member creation exception. Native user update and deletion check manage permission for the target user. Fine-grained administration also exposes separate reset-password, role-mapping and group-membership permissions; it is not equivalent to assigning the broad manage-users role to every account identity.

No complete native fine-grained policy has been demonstrated against this specification's combined requirements: initial field and role limits, original creation ownership, disabled-until-commit activation, mutually exclusive commit and compensation, crash recovery, originating domain authorization and SMTP-only revision updates. Assigning manage-users alone does not provide those guarantees. The command provider below is the proposed enforcement boundary; this investigation does not establish that every native or hybrid alternative is impossible.

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

- Native management roles and fine-grained policies: assigning manage-users alone leaves broad update/deletion authority. A narrower native or hybrid design remains a technical-review alternative if its complete policy is demonstrated against the same required guarantees; no such fit has been proved here.
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
