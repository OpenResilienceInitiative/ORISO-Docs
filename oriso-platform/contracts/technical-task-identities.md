# Technical task identities — implementation contract

**Status:** Coordinated implementation proposal, not deployment proof. Parent specification: [Helm #367](https://github.com/OpenResilienceInitiative/ORISO-Helm/issues/367). Decision: [ADR-027](../decisions/ADR-027-restricted-task-identities-and-keycloak-commands.md).

This contract is maintained beside the code-owned architecture record. The issue body remains the live delivery record. Each actual automatic responsibility has distinct client credentials; reusable read capabilities do not require unused reader accounts.

## Identity ownership

| Task | Client | Minimum receiving responsibilities |
| --- | --- | --- |
| Config Wizard | backend-config-wizard | Reserved tenant/agency creation, correct agency relationship, operator DPA versions, forwarded initial consulting-type bootstrap |
| Invitation reservation allocation/cleanup | backend-invite-reservations | Agency reservation allocation/availability and proof-owned unconsumed release; tenant availability/release only; normal human allocation keeps its token |
| Notification dispatch | backend-notification-dispatch | Contact details, branding/mail context, signature/preferences context, intended tenant email invocation |
| System email delivery | backend-system-email-delivery | Native platform transport SMTP snapshot, no SMTP configuration writes |
| Runtime policy evaluation | backend-runtime-policy | Minimal DPA-gate and case-handover permission policy reads |
| Matrix agency identity | backend-matrix-agency | Distinct credential read and provisioning capabilities, separate from contacts |
| Appointment synchronization | backend-appointment-sync | Proven agency/consultant synchronization operation |
| Appointment participant cleanup | backend-appointment-cleanup | Downstream participant removal, not ORISO account deletion |
| Account provisioning | backend-account-provisioning | Complete bounded creation, own-attempt commit/compensation and necessary bounded reads |
| Account maintenance | backend-account-maintenance | Authorized existing-account maintenance/deactivation/lifecycle deletion and necessary bounded reads |
| Second factor | backend-account-otp | Direct otp-config-admin with exact bound identity; no account management |
| Session compatibility | backend-session-exchange | Separate compatibility identity, preserving existing unsupported native exchange limitation |
| SMTP synchronization | backend-smtp-sync | Current SMTP snapshot plus SMTP-only Keycloak command |
| Consultant CSV import | backend-consultant-import | Start only the configured server CSV import; verified file/row provenance, no direct provider or administrator access |

GET /settings is already public and needs no runtime reader identity. Existing notifications-technical is a preference-read permission, not sending power. Appointment external ownership/authentication and external legacy mail fallback contracts must be proven before their affected credential retirement.

### Exact role and audience registry

| Task key | Realm roles | Token audiences |
| --- | --- | --- |
| CONFIG_WIZARD | config-wizard | tenantservice, agencyservice, consultingtypeservice |
| INVITE_RESERVATIONS | invitation-reservations | tenantservice, agencyservice |
| NOTIFICATION_DISPATCH | notification-dispatch, notifications-technical | tenantservice, agencyservice, userservice |
| SYSTEM_EMAIL_DELIVERY | system-email-delivery | consultingtypeservice |
| RUNTIME_POLICY | runtime-policy | tenantservice |
| MATRIX_AGENCY | matrix-agency, matrix-agency-provision | agencyservice |
| APPOINTMENT_SYNC | appointment-sync | appointmentservice |
| APPOINTMENT_CLEANUP | appointment-participant-cleanup | appointmentservice |
| ACCOUNT_PROVISIONING | account-provisioning, account-read | oriso-task-commands |
| ACCOUNT_MAINTENANCE | account-maintenance, account-read | oriso-task-commands |
| OTP | otp-config-admin | oriso-task-commands |
| SESSION_EXCHANGE | session-exchange | none (unsupported native exchange baseline) |
| SMTP_SYNC | smtp-sync | oriso-task-commands, consultingtypeservice |
| CONSULTANT_IMPORT | consultant-import | userservice |

## Credential and token configuration

Client IDs use IDENTITY_<TASK>_CLIENT_ID, secrets KEYCLOAK_<TASK>_CLIENT_SECRET, receiver/caller service-account bindings IDENTITY_<TASK>_SERVICE_SUBJECT. Task keys include CONFIG_WIZARD, INVITE_RESERVATIONS, NOTIFICATION_DISPATCH, SYSTEM_EMAIL_DELIVERY, RUNTIME_POLICY, MATRIX_AGENCY, APPOINTMENT_SYNC, APPOINTMENT_CLEANUP, ACCOUNT_PROVISIONING, ACCOUNT_MAINTENANCE, OTP, SESSION_EXCHANGE, SMTP_SYNC and CONSULTANT_IMPORT.

Provider client IDs are configured explicitly; the provider resolves the actual service account from its client model and checks the token subject and azp. No username-based trust or arbitrary subject override. Task command audience is oriso-task-commands; service operation audiences are explicitly configured for the receiver. Effective groups, composite roles and scopes must not introduce extra permissions.

## Account and SMTP wire contract

### Account command contract v1
Base /realms/{realm}/oriso-commands/v1. Content-Type application/json.
Authorization: Bearer <task access token>; aud must contain oriso-task-commands.
Task IDs backend-account-provisioning / backend-account-maintenance /
backend-account-otp / backend-smtp-sync; roles account-provisioning /
account-maintenance / otp-config-admin / smtp-sync. Narrow read role account-read
on actual provisioning/maintenance tasks. Env IDENTITY_<TASK>_CLIENT_ID,
IDENTITY_<TASK>_SERVICE_SUBJECT caller-side. Provider derives subject from client.

Account requests additionally X-ORISO-Origin-Authorization: compact JWT HS256.
Managed keys ORISO_PROVISIONING_ORIGIN_KEY and ORISO_MAINTENANCE_ORIGIN_KEY are
standard Base64 encoded >=32 random bytes, distinct from each other/client secrets.
JWT header {alg:HS256,typ:JWT}; claim fields EXACTLY iss,aud,iat,exp,jti,purpose,
operation,taskClient,taskSubject,originKind,originAction,target,tenantId,roles,
payloadDigest. iss=oriso-userservice; aud=oriso-task-commands;
purpose=oriso-command; exp>now, exp>iat, exp-iat<=60, now-60<=iat<=now+5; unique jti UUID.
originKind INVITATION|REGISTRATION|ANONYMOUS|HUMAN_ADMIN|SELF_SERVICE|LIFECYCLE|IMPORT|ONBOARDING|PASSWORD_RESET.
originAction must equal operation. target=attempt UUID for create/commit/compensate,
account ID for account operations; exact query value for email/username search.
tenantId string or null; roles array of allowed human realm-role names.
payloadDigest = base64url(no padding)(HMAC-SHA256(key,
UTF8('payload\n'+canonicalJson(command)))). Canonical JSON recursively sorts object
keys, compact encoding, arrays preserve order, only strings/booleans/null/integer
values, no floating values. Include every field sent; no proof field in body.
Receipt = base64url HMAC-SHA256(provisioning key,
UTF8('receipt\n'+realmId+'\n'+attemptId+'\n'+ownerSubject+'\n'+accountId)).
JWT signature standard base64url header+'.'+base64url payload with same origin key.
Keys purpose-separated by input prefix; compare constant-time. No secrets in logs.

| Operation claim | HTTP | Command body / projection |
|---|---|---|
| account.create | PUT /account-creations/{attemptId} | {username,email,firstName,lastName,preferredLanguage,tenantId,password,passwordTemporary,roles:[...],registrationKind} |
| account.commit | POST /account-creations/{attemptId}/commit | {accountId,creationProof} |
| account.compensate | POST /account-creations/{attemptId}/compensations | {accountId,creationProof} |
| account.read | GET /accounts/{id} | proof digest over {} |
| account.search | GET /accounts/search?username=exact OR email=exact | proof digest over {username:exact} OR {email:exact} |
| account.profile | PATCH /accounts/{id}/profile | {username,email,firstName,lastName,tenantId,preferredLanguage} (only sent fields change) |
| account.password | PUT /accounts/{id}/password | {password,passwordTemporary} |
| account.roles | PUT /accounts/{id}/roles | {roles:[...]} |
| account.deactivate | POST /accounts/{id}/deactivation | {} |
| account.delete | DELETE /accounts/{id} | proof digest over {} |
| account.inventory | POST /account-inventory | {cutoff:ISO-8601 Instant,first:int>=0,max:int1..1000} |
| account.lifecycle-status | GET /accounts/{id}/lifecycle-status | proof digest over {} |
| account.suspend | POST /accounts/{id}/suspension | {} |
| account.restore | POST /accounts/{id}/access-restoration | {enabled:boolean} |
| SMTP no origin header | PUT /smtp | {revision,globalSmtpEnabled,globalFeatureSystemNotificationEmailsEnabled,globalSmtpHost,globalSmtpPort,globalSmtpFrom,globalSmtpUsername,globalSmtpPassword,globalSmtpSecure} |

Create returns HTTP201 {attemptId,accountId,creationProof,status:OPEN}, replay200 same
receipt; commit204; compensate204 repeated legitimate tombstone remains204;
committed compensation409; foreign/forged403; changed attempt payload409.
Projection HTTP200 {id,username,email,firstName,lastName,tenantId,preferredLanguage,
enabled,emailVerified,roles:[...],passwordChangeRequired:boolean}; absent404.
Search returns array [] or bounded matching projections (exact matches only), no
wildcards, arbitrary attrs, credentials or capability/receipt leakage.
Maintenance204, delete absent204, SMTP200 {revision,status}; status APPLIED or DISABLED_OR_INCOMPLETE.

registrationKind ASKER|ANONYMOUS|CONSULTANT|AGENCY_ADMIN|CONSULTANT_AGENCY_ADMIN|TENANT_ADMIN.
Creator sets userId=created ID, username/userName decoded username, locale=language,
optional tenantId; enabled=true,emailVerified=true matches current behavior.
Kinds require respectively: user; user; consultant; restricted-agency-admin+user-admin;
consultant+restricted-agency-admin+user-admin; user-admin+agency-admin+tenant-admin.
Optional group-chat-consultant for consultant kinds and topic-admin for TENANT_ADMIN
only, as limited by signed origin role authority. CONSULTANT_AGENCY_ADMIN accepts
INVITATION or HUMAN_ADMIN origin only. ASKER/ANONYMOUS have no anonymous realm role.
Signed roles limit DTO roles; no task actor inherits these human roles.
SELF_SERVICE authorizes only read/profile/password for its verified own target and cannot change tenant; HUMAN_ADMIN
limited signed tenant/role permissions; LIFECYCLE only read/search/deactivate/delete/dummy-email profile and the bounded inactivity inventory/status/suspend/restore actions below, never create/roles/password.
IMPORT permits CONSULTANT creation and own-attempt commit/compensation after the receiving exact importer identity and actual configured file/validated row authorize target tenant, agencies, fields and consultant-only roles. A new-account relation finalizer uses its persisted OPEN creation receipt, initial roles and authorized agency IDs; it does not reread or modify native roles. Existing-row import can read its actual persisted consultant target and add only consultant/group-chat-consultant roles through maintenance-key authorization bound to the captured row and target tenant/agencies. All unrelated preexisting roles must remain; human admin role additions/removals and protected platform targets are denied. IMPORT has no profile/password/tenant/deactivation/delete authority and cannot create other account kinds or read arbitrary accounts.
ONBOARDING permits only read/password after verified held/consumed one-time setup authority and persisted target/tenant. PASSWORD_RESET permits only read/password after consumed verified reset proof and existing OTP/MFA guards, with the persisted subject/tenant as target. Neither kind changes roles/profile/tenant or deletes accounts.
Protected platform accounts allow their existing own-account read/profile/password only through authenticated own-target SELF_SERVICE; existing one-time password recovery uses the separate PASSWORD_RESET read/password authority. Protected tenant0 targets are detected through actual effective tenant-admin roles, including composite/group inheritance. Read-only LIFECYCLE inventory/status can retain their existing enrollment and diagnostics; HUMAN_ADMIN/LIFECYCLE mutations, IMPORT and ONBOARDING cannot manage protected platform targets.
OTP paths unchanged; the normal guard binds backend-account-otp + otp-config-admin with no stock management permission. Migration-only legacy OTP opt-in is documented below. Magic Link exchange remains baseline unsupported.


## Requirement coverage and acceptance

| User stories in parent | Implementation packages | Required evidence |
| --- | --- | --- |
| 1–7 | Keycloak, UserService, TenantService, AgencyService, Helm | Pre-account invitation flow, reserved-target and own-reservation denial tests |
| 8–14 | Keycloak, UserService, Helm | Native validation/atomic setup; persistent attempt ownership/replay/commit-compensation tests; maintenance/deletion lifecycle |
| 15–17 | Keycloak, UserService, Helm | OTP setup/verify/reset and denied account/stock-admin calls |
| 18–24 | TenantService, UserService, ConsultingTypeService, Keycloak, Helm | Correct SMTP ownership, secret-read/sending/configuration separation; actual controlled recipient receipt on Dev |
| 25–29 | TenantService, AgencyService, UserService, CTS, Helm | Narrow policies/reads, actual human authorization, contact-vs-Matrix and appointment duty denial |
| 30–35 | Keycloak, Helm, UserService, all receivers | Fresh/existing realm repeated reconciliation, actual effective mappings, credential separation and real-token operation matrix |
| 36–38 | Keycloak, UserService, Helm, Docs | Isolated exchange compatibility limitation; verified legacy consumer contracts; distinct source/local/CI/deploy/receipt evidence |

## Safe migration order

1. Add bounded receiving commands/authorities and compatible caller contracts.
2. Prepare confidential task clients, exact roles/scopes/audiences and distinct credential bindings before upgraded receiver pods start. The reconciler is a pre-upgrade hook, so Helm --wait cannot deadlock on startup task-token validation. Fresh installs import the task registry and run the reconciler post-install. Hook credential Secret and script ConfigMap run pre-install/pre-upgrade with earlier weights and remain available after successful hooks; validate configuration before changes.
3. Switch explicit task callers after their receiving contract is available, without privileged fallback.
4. Verify intended and denied real-token operations and fresh/existing-realm repeat reconciliation.
5. Retire corresponding old mappings/secrets only after deployed consumer readback proves they are unused; reviewed dev deployment then browser and received-mail acceptance.

The native requested-subject exchange baseline remains rejected (400/403). No new session issuer or broad impersonation shortcut belongs to this change. Ordinary public settings, human roles and Wizard UI behavior retain their existing contracts.

## Receiving operations and ownership proofs

Roles absent/incorrect client binding deny; legacy support remains only until proved migrated.

Each receiving service expects TASK_IDENTITY_AUDIENCE: tenantservice, agencyservice, or consultingtypeservice respectively. Realm provisioning must add those audience strings to intended task tokens. Task token must have matching audience, role, and exact configured sub+azp. Signature/issuer/expiration remain enforced by OAuth resource-server JWT decoder.

Receiver binding env (no secrets): IDENTITY_<TASK>_CLIENT_ID + IDENTITY_<TASK>_SERVICE_SUBJECT. Caller secrets retain KEYCLOAK_<TASK>_CLIENT_SECRET. Keys:
CONFIG_WIZARD -> backend-config-wizard / config-wizard
INVITE_RESERVATIONS -> backend-invite-reservations / invitation-reservations
NOTIFICATION_DISPATCH -> backend-notification-dispatch / notification-dispatch
SYSTEM_EMAIL_DELIVERY -> backend-system-email-delivery / system-email-delivery
MATRIX_AGENCY -> backend-matrix-agency / matrix-agency
SMTP_SYNC -> backend-smtp-sync / smtp-sync
RUNTIME_POLICY -> backend-runtime-policy / runtime-policy

Receiver scoped routes:
TenantService CONFIG_WIZARD: POST /tenantadmin (reserved+matchingtoken only); GET /tenantadmin/{id}/dpa/versions (configured operator tenant only).
TenantService INVITE_RESERVATIONS: GET /tenantadmin/tenant-ids/{id}/availability; DELETE /tenantadmin/tenant-ids/reservations/{id}?reservationToken=<original-token> (atomic exact id+token+RESERVED only). No tenant reserve or next-free grant.
TenantService NOTIFICATION_DISPATCH: GET /tenantadmin/{id}/dpa/signatures; GET /internal/tenants/{id}/system-email-context; POST /tenant/{id}/internal/system-email-deliveries. Existing TS SYSTEM_EMAIL_DELIVERY_SERVICE_* env remains legacy-only, new calls use NOTIFICATION_DISPATCH exact binding.
TenantService RUNTIME_POLICY: GET /tenantadmin/{id}/dpa/gate; GET /tenantadmin/{id}/permission-policies. No writes.
AgencyService CONFIG_WIZARD: POST /agencyadmin/agencies (AgencyDTO.reservedAgencyId + tenantId + reservationToken exact atomic owned reservation only); GET /agencyadmin/agencies/{numericid} (existing invitation agency recheck; no search/subresources).
AgencyService INVITE_RESERVATIONS: GET /agencyadmin/agencyids/{id}/availability; POST /agencyadmin/agencyids/reservations returns agencyId + fresh opaque token; DELETE /agencyadmin/agencyids/reservations/{id}?reservationToken=<original-token> (atomic exact id+token+unconsumed only). Actual queue release reserves agency after tenant appears: UnitQueue.claim -> ReservationLedger.reserveAgencyOnRelease. No next-free grant.
AgencyService NOTIFICATION_DISPATCH: GET /internal/agencies/{id}/contact-details?tenantId=... only; never Matrix credentials.
AgencyService MATRIX_AGENCY: GET /internal/agencies/{id}/matrix-service-account requires matrix-agency; POST additionally requires matrix-agency-provision. Same exact backend-matrix-agency subject/client/audience, never dispatch; current response contains identity only, no password.
CTS CONFIG_WIZARD: POST /consultingtypes only initial default for an empty tenant with signed TS creation context; TenantService forwards Wizard token during verified reserved-tenant bootstrap. No patch.
CTS SYSTEM_EMAIL_DELIVERY, SMTP_SYNC: GET /settingsadmin/smtp-credentials only; superadmin humans preserved. Public GET /settings stays public, no reader actor.

Projection implemented as Java record. Wire output preserves used JSON structure: {id,subdomain,name,legalName,address:string,contactEmail,contactPhone,settings:{featureSystemNotificationEmailsEnabled,smtpMode,smtp:{enabled,emailThemeColor,configured}}}. Receiver deliberately excludes SMTP credentials/server/user and administrative fields. Caller route service should consume smtp.configured Boolean instead of credential-transport metadata.

Ownership and bootstrap proof extension:
- Optional reservationToken query added in both receiver OpenAPI DELETE methods; mandatory for new task caller, human and still-documented legacy paths retain existing permissions. Missing or incorrect proof denies. Agency new reservation row/response now stores/returns random 32-byte Base64URL token; AgencyDTO.reservationToken is writeOnly. Old rows remain NULL; no guessed proof or backfill.
- CTS header X-ORISO-Tenant-Creation-Context is base64url(canonical sorted JSON).base64url(HMAC-SHA256(encodedPayload)). Key ORISO_TENANT_CREATION_CONTEXT_KEY is Base64 decoded >=32 bytes, managed only by TS and CTS.
- Context sorted keys: aud=consultingtypeservice, azp=caller client, exp=iat+60, iat=epoch second, iss=tenantservice, nonce=UUID, sub=caller subject, tenantId=actual created reserved tenant, tokenIssuer=validated caller JWT issuer, v=1. CTS verifies signature then exact token binding, 60-second maximum lifetime and 5-second skew, matching target and initial emptytenant. TS issues/forwards only after atomic reservation consumption and actual tenant create. Failure rolls back existing bootstrap saga.
- Operator DPA target property IDENTITY_CONFIG_WIZARD_OPERATOR_DPA_TENANT_ID defaults 1; GET versions on any other tenant denies Wizard actor.

Production required-binding lists (Helm must set TASK_IDENTITY_REQUIRED_TASKS):
- TS: CONFIG_WIZARD,INVITE_RESERVATIONS,NOTIFICATION_DISPATCH,RUNTIME_POLICY
- AS: CONFIG_WIZARD,INVITE_RESERVATIONS,NOTIFICATION_DISPATCH,MATRIX_AGENCY
- CTS: CONFIG_WIZARD,SYSTEM_EMAIL_DELIVERY,SMTP_SYNC
Missing named binding/audience fails startup; required Wizard bootstrap also requires valid Base64 creation key >=32 decoded bytes. Empty legacy TECHNICAL_SERVICE_SUBJECT disables legacy identity and does not block fresh installation.
CTS initial task bootstrap uses a tenant_bootstrap_claims Mongo document with tenant ID as unique _id. Atomic insert precedes initial consulting-type creation across instances; only the inserting attempt can remove its own claim after failure, and a successful claim remains. Human normal creation bypasses this initial-task-only claim; Mongo _id uniqueness needs no SQL migration.

CTS SmtpReconcileClient now uses SMTP_SYNC binding+secret and validates smtp-sync role, exact sub/azp, expiry, both oriso-task-commands + consultingtypeservice audiences and absence of broad grants before helper request. No shared-technical fallback.
JWT converters remove all generic/human/legacy authorities for recognized task roles or configured task subjects/clients; exact task capability checks remain separate. CTS raw-role superadmin helper also rejects task tokens, closing mixed-grant human OR branches.

## Helm installation and legacy retirement

The root chart registry `files/task-identities.json` defines the 14 exact task client IDs, roles and audiences. The realm default scope is only native `basic`, with no optional defaults. Each existing human client retains its explicit scopes. Task clients explicitly use `basic` only; its native subject and auth-time mappers have no role grants and are audited before changes. The hook removes every other attached default/optional scope through native DELETE endpoints because client PUT alone does not remove them. The older export migration automatically supplies `basic`; removing it without a subject mapper would invalidate caller binding. Task subjects are deterministic UUIDs based on realm+client ID for a fresh import. Existing task service accounts require their actual UUID overrides; reconciliation refuses to overwrite a colliding human or service account.

Managed task credentials live under `global.taskIdentitySecrets`. Provisioning, maintenance, tenant-creation and Wizard-policy keys live under `global.commandOriginKeys` as independent Base64 keys of at least 32 decoded bytes. Receivers use `TASK_IDENTITY_REQUIRED_TASKS` plus their nonsecret client/subject bindings; the CSV importer is a receiving-only UserService binding; its credential is never mounted into that runtime. UserService holds only the task credentials it consumes, CTS and the SMTP helper only SMTP_SYNC. Keycloak and UserService alone receive the account-origin keys; TenantService and CTS alone receive the creation-context key.

The rendered realm import contains client credentials and is mounted from a Kubernetes Secret, never a ConfigMap.

Fresh imports do not activate the legacy technical/backend-admin actors. Installer administration exists only in installer hooks. Optional `global.keycloak.serviceTechUserId` continues an explicitly configured legacy receiver binding; blank disables that binding.

For existing realms, `global.taskIdentities.retireLegacy=false` retains old actors while consumer ownership is checked. Setting it true is an operator action only after live consumer readback, with all four verified `legacySubjects` entries (`TECHNICAL_PASSWORD`, `SERVICE_ADMIN_PASSWORD`, `TECHNICAL_CLIENT`, `ADMIN_CLIENT`). The hook checks the exact configured UUID+username and client linkage before mutation, protects installation/task subjects, disables only those actors, removes direct/group grants and removes the unused exported `TECHNICAL_DEFAULT` role. No old password/admin credential remains a runtime fallback.

Existing caller cutover also needs an OTP bridge: `global.taskIdentities.legacyOtpCompatibility` defaults false. During the explicitly reviewed transition, it enables only the verified backend-admin service account for existing OTP operations via `ORISO_LEGACY_OTP_COMPATIBILITY` and `ORISO_LEGACY_OTP_CLIENT_ID`; its exact sub/azp, direct plus token otp-config-admin and realm-management audience are checked against the resolved client service-account owner. The allowed native management baseline is manage-users/view-users/query-users/view-realm plus the verified Keycloak 26.6.3 query-groups closure; other management/human roles are rejected. This bridge applies only to existing OTP operations, never account/SMTP commands, and new OTP/task actors always take the strict branch. The only harmless native default-role closure allowed on that legacy actor is offline_access, uma_authorization and account.manage-account/view-profile/manage-account-links; no arbitrary extra direct/effective/group/client grants are accepted. Issued realm roles remain exactly otp-config-admin and token audience only realm-management. Disable this option immediately after migrated UserService readback, before setting `retireLegacy=true`. The chart rejects enabling both at once. No password-user fallback or extra native permission is granted.

## Verified Wizard account-policy context

Wizard account creation reads only `{id,allowedNumberOfUsers}` at `GET /internal/tenants/{id}/account-provisioning-policy`. The receiver requires its normal exact Wizard role/sub/client/audience plus `X-ORISO-Wizard-Policy-Context`; a claimed tenant header alone proves no permission.

The independent Base64 key `ORISO_WIZARD_POLICY_CONTEXT_KEY` is managed by `global.commandOriginKeys.wizardPolicy`, supplied only to UserService and TenantService. The header reuses the sorted JSON Base64URL payload plus HMAC-SHA256 encoded-payload signature. Claims are exactly `{aud:tenantservice,azp,exp:iat+60,iat,iss:oriso-userservice,nonce:UUID,operation:wizard.account-policy.read,sub,tenantId,tokenIssuer:<actual Wizard token issuer>,v:1}`. UserService signs only after typed invitation/registration/human or verified configured import-file/row origin checks; TenantService verifies signature, time, actual task binding and target. It gives no general TenantDTO or SMTP secret access.

Initial placeholder email uses the server-managed common suffix `global.identityDummyEmailSuffix` (`IDENTITY_EMAIL_DUMMY_SUFFIX` in UserService and `ORISO_IDENTITY_DUMMY_EMAIL_SUFFIX` in Keycloak), defaulting to the existing `@beratungcaritas.de`. The creation provider derives missing email from its own newly created account ID within the atomic creation transaction. This is not a caller-controlled arbitrary account update.


### Bounded inactivity inventory

The existing startup/nightly orphan inventory uses ACCOUNT_MAINTENANCE through a separate read-only `POST /account-inventory`. The typed signed LIFECYCLE authority comes from the actual immutable `account_inactivity_rollout` row under its existing database lock, and binds the cutoff, page and exact payload digest. This authority never authorizes any account mutation.

For implementers — the provider derives classification from real account state:

```text
body {cutoff:Instant,first:integer>=0,max:integer1..1000}
origin target cutoff:<cutoff>/first:<first>/max:<max>, tenantId=null, roles=[]
minimal response accounts[id,tenantId,createdTimestamp,eligibleHuman], hasMore
No native role list, email, names, credentials or arbitrary realm/filter is exposed.
Service accounts and pure technical identities are ineligible. Existing human
platform accounts and mixed technical/human-role accounts retain their enrollment
and missing-snapshot diagnostics; protected-target mutation guards remain separate.
```

Bounded inactivity effects preserve the existing deletion and restoration workflow.

For implementers — state and effects are separately authorized:

```text
GET lifecycle-status returns {enabled,sessionCount,roles:[ASKER|CONSULTANT|OTHER|UNKNOWN]}.
The provider derives coarse roles from actual effective realm/client/group roles;
it skips only known default/account infrastructure, preserving privilege guards.
POST suspension disables the native identity, invalidates not-before and performs
native backchannel logout, then confirms disabled/no active sessions.
POST access-restoration restores only the durable original enabled state.
All three operations require maintenance-key LIFECYCLE authorization, exact target,
tenant and full-body digest, with roles=[]. The issuer reads persisted workflow:
SUSPENDING/DELETING authorizes suspension; REACTIVATING plus the actual durable
original-access record authorizes restoration. DELETING + deletion_authorized can
authorize normal downstream orphan/retry deletion without an unsaved user marker.
Inventory/status proof grants no mutation authority; platform/service mutations deny.
No arbitrary request-body enabled flag, profile, role or provisioning power is added.
```
