# ADR-027 — Scenario C task identities and native permission boundaries

**Status:** Proposed; technical approval and production cutover remain open. **Updated:** 2026-10-28.
**Accountable delivery owner:** Frank Gerhardt (Storypapst). **Technical reviewers:** Hassan Saeed and Shazia Kausar.
**Scope:** Keycloak, UserService, TenantService, AgencyService, ConsultingTypeService and Helm.
**Delivery:** [Helm367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367), [C coordination423](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/423), [Docs175](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/175).

## Current decision: scenario C

Hassan and Shazia selected scenario C on9 October2026: five grouped automatic identities, ORISO receiver checks and native Keycloak account permissions where the spike proves the required limits. The earlier fourteen-identity account-provider proposal below is superseded as the implementation target. All38 story IDs and their history remain in the delivery record. C amends the credential-isolation clauses of US17 and US21 as recorded below; account ownership, recovery, tenant/target/human boundaries, invitation/reservation checks and mail acceptance remain required.

The Config Wizard still runs through an invitation before the invited person's completed account exists. Its backend operations belong to the setup identity. The eventual human role comes from the invitation; a grouped automatic identity is not a new administrator role for the person completing setup.

| Automatic identity | Responsibilities |
| --- | --- |
| Setup | Config Wizard, invitation reservation allocation/cleanup, controlled consultant import and bounded SMTP configuration |
| Account creation | Initial ordinary account provisioning and its own unfinished attempts |
| Account administration | Authorized existing-account maintenance, second-factor administration, explicitly preserved session compatibility |
| Mail | Delivery, notification dispatch and minimal notification preference reads |
| Runtime | Policy reads, Matrix operations, appointment synchronization and participant cleanup |

Five credential bindings do not mean five generic permission checks. The operation purposes remain explicit, with the same originating human, tenant, target, invitation and reservation checks. Effective roles, audiences, client, service-account subject and forbidden inherited grants must be checked at each receiver. Identical credentials are valid only for purposes mapped to the same actor; collisions between actors fail startup.

## C amendments to credential isolation

The selected grouping changes what a credential can do. A purpose claim and an operation-specific receiver check do not create another credential or isolate code holding the shared credential.

| Original story | C amendment | Retained guarantees and open proof |
| --- | --- | --- |
| US17: the second-factor credential has no general account administration power | OTP shares ACCOUNT_ADMIN with permitted maintenance/deletion and session compatibility. The literal OTP-only credential isolation is superseded; it must not be reported as a passed C guarantee. | SETUP, ACCOUNT_CREATE, MAIL and RUNTIME remain denied OTP/account-administration powers outside their declared responsibilities. Permitted account, human and target checks remain required. Exact OTP receiver-purpose/target proof and native maintenance limits are OPEN. |
| US21: the preference reader receives no sending rights | Preference reads and delivery share MAIL. The MAIL credential intentionally holds both capabilities; the literal read-only credential isolation is superseded. | Preference projections stay minimal, tenant/recipient/target checks remain, and preference-read authority alone is not a delivery authorization. Operation-purpose enforcement and the coordinated MAIL caller/receiver proof are OPEN. |

All38 IDs remain traceable; these two amended clauses do not waive the other security or workflow outcomes. Under US22, SMTP configuration now belongs to SETUP; MAIL cannot configure SMTP, including with a valid common-key proof. This separates the credentials. UserService currently holds all five credentials and the shared context key, so compromise of that process is not isolated by this split. Final coordinated application proof, technical approval and source-to-live acceptance remain separate gates. No sixth actor or second context key is introduced.

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

The composed Keycloak source includes the bounded SMTP receiver. It accepts only the installed SETUP client and native service-account subject, their exact current role/audience sets and the existing purpose-bound proof for the complete SMTP payload and revision. MAIL is denied even when its caller knows the common proof key. No routine actor receives native realm management. The delivery path uses the current saved transport revision; a delivery bearer cannot acknowledge or reconfigure that revision.

The isolated [Mail and activation proof](https://github.com/OpenResilienceInitiative/ORISO-Helm/actions/runs/40640537535) exercises the real User/CTS/Keycloak seam. It is evidence for its recorded source tuple, not approval to cut over production or a substitute for the final application tuple. Old SMTP credentials remain unchanged until a separately authorized deployment and consumer review establishes that retirement is safe.

## Bounded account receiving layer

The composed image includes the lifecycle, OTP and SMTP modules. Native groups constrain account kinds; the lifecycle receiving layer additionally binds the original human or configured import, complete command, account incarnation, tenant and workflow. It supplies the ownership and retry guarantees that native management permission alone cannot express. This remains the selected five-actor design, rather than a return to fourteen credentials.

Administrator removal from an Administrator+Consultant account removes only the Administrator identity and its local administrative relations. Consultant data, native UUID, credentials, profile and enabled state must be preserved. Pure Administrator deletion requires proof that no Consultant identity or data belongs to the target. Original creation/adoption and authenticated lineage remain pinned across a protected-to-ordinary transition; a recreated UUID is not the same account.

An unknown response retains the original action and exact command. Only an authenticated, matching terminal receipt may retire that action. Local SQL changes use the actual owning transaction manager, entity manager and data source, with no remote request inside their transaction. The current source and hosted evidence are recorded by [Parent367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367); final caller, servlet, database and browser acceptance remains required.

## Origin context and residual trust

C uses one managed context key for cross-service proofs, with explicit purpose, operation, actor, tenant, target and full-payload binding. Same-process Java authorization may use typed originating context after domain checks; unsigned HTTP claims between services cannot replace receiver proof. The former four-key design is historical.

One process holding several actor credentials and the context key does not gain process isolation from role names. A compromised process can invoke the powers it legitimately holds. This residual trust and context replay/idempotence limits require explicit technical review; they are not closed by green unit tests.

The accepted [ADR-013 OTP decision](ADR-013-2fa-via-vendored-otp-config-spi.md) remains in force. Native credential deletion tests do not prove the existing custom OTP setup/verification endpoints are target-scoped. Session exchange retains its separately recorded compatibility limitation; no new session issuer or impersonation permission is introduced by C.

## Activation gates and migration order

1. Review the composed receiving layer, five actor bindings and complete account caller/recovery behavior on one recorded source tuple.
2. Establish and migrate exact human groups on a realm copy; verify fresh/existing/twice behavior.
3. Load and reconcile the native policy with compatible receivers; prove real-token allowed and denied operations.
4. Wire the five callers only after their contracts are ready; verify actual deployed revisions and every retained user journey.
5. Retire old grants/secrets only after external consumer and open-reservation proof. Keep an unidentified external mail/appointment dependency and its existing caller unchanged; an unknown owner blocks its affected change or retirement. Keep source, review, merge, deployment, browser and received-mail evidence separate.

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
