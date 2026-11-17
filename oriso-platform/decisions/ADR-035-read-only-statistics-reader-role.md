# ADR-035: Statistik-Leser — a read-only statistics role

- **Status:** Accepted by the product owner — 2026-11-17 (Frank; four product questions answered). Technical review pending in the delivery PRs.
- **Date:** 2026-11-17
- **Decision owner:** Frank Gerhardt (product owner)
- **Related:** ADR-013 (2FA via the vendored OTP config SPI), ADR-027 (restricted task identities, native Keycloak boundaries), ADR-023 (platform and Träger governance)
- **Issue:** [ORISO-UserService#1666](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1666)

## In plain words

Some people only need to read the platform statistics: a funder, the head office, an evaluator. Until now the only way to show them the numbers was to make them platform admins, and a platform admin can change everything. This record adds a separate account type, the **Statistik-Leser**. Only a platform admin can create one, directly in the Admin. The person sees the platform statistics panel, can drill into a Träger and its Beratungsstellen, and can download the CSV. They see nothing else and cannot change anything. Every other page and every other request is refused by the server, not just hidden in the Admin. 2FA is mandatory before any number is shown.

## Context

The platform statistics panel is served by `GET /useradmin/statistics/dashboard` (and `/tutorials`) in UserService. The CSV is generated in the browser from the same data, so there is no export endpoint to protect separately. Names of Träger and Beratungsstellen come from admin lookups in TenantService and AgencyService that also return much more than names.

A "reduced platform admin" (platform admin roles minus some permissions) was rejected: platform-admin checks across services key on `tenant-admin` + `agency-admin` on tenant 0, and every new feature would have to remember to exclude the reduced variant. A missing exclusion would silently grant write access.

## Decision

1. **Own role, own type.** Keycloak realm role `statistics-reader` (plain, never composite, never part of the default roles). UserService maps it to exactly one authority, `AUTHORIZATION_STATISTICS_READER`, and stores the account as admin type `STATISTICS`, always on the platform tenant 0. It never holds `user-admin`, `tenant-admin`, `agency-admin` or any other role.
2. **Created only by platform admins**, directly in the Admin (`/useradmin/statisticsreaders`, platform-admin check). There is no invitation, no self-registration and no path for Träger or Beratungsstelle admins.
3. **Allow-list, not deny-list.** The reader may call: the dashboard and tutorial statistics (only with tenant 0 and an active OTP credential), its own `/users/data`, password change, 2FA setup, and the names-only lookups below. Every other endpoint stays denied by the existing `denyAll` fallbacks. Routes that only require "authenticated" are checked one by one: handshakes and support rooms now refuse a token that carries nothing but the reader authority; the account-inactivity heartbeat stays open because the Admin needs it. New endpoints are denied to the reader unless they name the authority explicitly.
4. **Same view as a platform admin inside the panel**, including the Träger and Beratungsstelle drill-down and the tutorial numbers. Small-cell suppression applies unchanged. Not included: the statistics settings card and its protocol.
5. **2FA is mandatory and enforced on the server.** The statistics endpoints answer 403 while the reader has no active OTP credential; an unreadable OTP state counts as "not active". No configuration property can switch OTP off for this role.
6. **Names only.** TenantService and AgencyService each get a names-only endpoint (`id`, `name`, and `tenantId` for agencies) for the reader and platform admins. The admin search endpoints stay closed to the reader.
7. **Password.** The account is created with a random password nobody sees; the person receives the existing admin "set password" e-mail.

## Consequences

- Every new statistics feature decides explicitly whether the reader may see it. The default is no.
- A platform admin can delete a reader at once; deletion is logged as `STATISTICS_READER` in the deletion log.
- `admin.type` is widened from `VARCHAR(6)` to `VARCHAR(16)`; the old width could not hold `SUPPORT` either.
- The "set password" e-mail is the reset template, not a welcome text. A dedicated welcome text is a possible follow-up.
- A Statistik-Leser cannot be turned into a counsellor through the "grant counsellor identity" action; that action refuses admin type `STATISTICS`.
- Running Keycloak realms need `scripts/keycloak-apply-statistics-reader-role.sh` (ORISO-Keycloak) before the first reader is created; without the role, creation fails with `ROLE_NOT_FOUND` and is rolled back.

## Accepted risks

A security review of the four backend branches (17 Nov 2026) found no critical or high issue. These smaller points are accepted on purpose:

- **The names lookups are not behind the 2FA check.** A reader without 2FA can read the list of Träger and Beratungsstelle names. These names are public on the ORISO start page anyway; the numbers stay behind 2FA.
- **The 2FA check looks at the account, not at the login.** The server checks that the reader has an active 2FA app, not that this particular login used it. Keycloak asks for the code at every login once the app is set up, so the gap only matters if Keycloak's login flow is changed.
- **The Keycloak account page stays open to the reader**, as it is for every ORISO account (own name, password, 2FA). It gives no access to statistics or other accounts.
- **The tenant names list includes inactive Träger**, so older statistics rows keep a name.
- **The setup e-mail is the password-reset text.** A proper welcome text is a follow-up.

**For developers — enforcement points (skip if you only need the decision):**

```text
UserService  SecurityConfig: /useradmin/statisticsreaders/** -> isPlatformAdmin
             dashboard/tutorials -> existing admin authorities OR (authority + realm role + tenantId 0)
             StatisticsReaderSecondFactorGate: OTP setup == true, fail closed
             IdentityConfig.isOtpAllowed: statistics-reader always true
             handshakes/**, support-rooms/** -> authenticated but not reader-only
             GrantConsultantIdentityService: refuses AdminType.STATISTICS
Admin        ADMIN_PORTAL_ROLES, MANDATORY_TWO_FACTOR_ROLES, Statistic.read only, all other routes -> /admin/statistic
Keycloak     realm.json role + idempotent kcadm script; tests: not composite, not default
Tenant/Agency  names-only endpoints; admin search unchanged
```
