# ORISO Keycloak Setup and Operations Guide

This is a living runbook for ORISO Keycloak setup, role mapping, and admin operations.
Update this document whenever auth configuration, roles, clients, or troubleshooting steps change.

## 1) Purpose

- Document what has already been done.
- Document the correct Keycloak setup for ORISO.
- Provide clear actions for admins/operators.
- Keep a continuous update log for future handover.

---

## 2) Current Status (Done So Far)

- Realm in use: `online-beratung`.
- Realm roles confirmed present:
  - `technical`
  - `agency-admin`
  - `tenant-admin`
  - `user-admin`
  - `single-tenant-admin`
  - `topic-admin`
  - `consultant`
  - `user`
  - `TECHNICAL_DEFAULT`
  - `USER_ADMIN`
- User `technical` has role mappings assigned successfully (including `agency-admin` and `technical`).
- Keycloak UI issue "There are no realm roles to assign" was identified as filter/realm context issue.

---

## 3) Keycloak Admin Checklist

### 3.1 Realm

- Active realm must be `online-beratung` (not `master`).

### 3.2 Mandatory Realm Roles

Ensure the following realm roles exist:

- `technical`
- `agency-admin`
- `tenant-admin`
- `user-admin`
- `single-tenant-admin`
- `topic-admin`
- `consultant`
- `user`

### 3.3 Recommended User Types

- `technical` user: service/integration operations, not preferred for daily admin UI usage.
- Dedicated admin UI user: use for portal operations (create users, supervisors, settings updates).

### 3.4 Required Attributes for Auth Compatibility

For users accessing ORISO admin/backend flows, set user attributes if missing:

- `userId` (string UUID-like value)
- `username` (username string)

These claims are expected by services and can cause backend `500` errors if missing.

### 3.5 Token Fields to Verify

After login, token payload must contain:

- `realm_access.roles` (with expected roles)
- `userId`
- `username`
- `tenantId` (required by tenant-aware flows)

---

## 4) Role-to-UI Behavior (Admin Portal)

The ORISO admin frontend grants screens/actions by role-derived permissions.

- `tenant-admin`
  - enables tenant/settings/legal/permissions related capabilities
- `user-admin`
  - enables consultant/admin user management (create/update/delete)
- `agency-admin`
  - enables agency management scope

If "Settings", "Can add as supervisor", or user creation actions are missing, verify:

1. Roles are assigned in Keycloak.
2. User logged out and logged in again (token refresh).
3. Token actually includes expected roles and claims.

---

## 5) Step-by-Step: Assign Roles Correctly

1. Open Keycloak admin and select realm `online-beratung`.
2. Go to `Users` -> select target user.
3. Open `Role mapping` -> `Assign role`.
4. In assign popup:
   - switch to realm roles (not client-only filter), or clear client filter.
5. Select roles and click `Assign`.

If popup still shows no roles:

1. Go to `Realm roles`.
2. Open role (example: `agency-admin`).
3. Open `Users in role`.
4. Click `Add users` and select user.

---

## 6) Step-by-Step: Create an Admin User (Recommended)

1. Create user in `Users`.
2. Set permanent password in `Credentials`.
3. Add attributes:
   - `userId`: unique id (UUID format recommended)
   - `username`: same as login username
4. Assign realm roles:
   - `tenant-admin`
   - `user-admin`
   - `agency-admin`
5. Log out and log in to admin portal.
6. Verify menu visibility:
   - `Settings`
   - `Users`
   - `Agency`
   - tenant-related tabs as expected.

---

## 7) Known Errors and Fixes

### Error: "There are no realm roles to assign"

Possible causes:

- wrong realm selected
- popup filtered by client roles only
- roles not created in current realm

Fix:

- switch to `online-beratung`
- assign from realm roles filter
- or use `Realm roles` -> `Users in role` fallback method

### Error: frontend `CATCH_ALL` with backend `500`

Common cause in this stack:

- missing JWT claims/attributes (`userId`, `username`)
- missing required role for endpoint

Fix:

- add missing user attributes in Keycloak
- assign required roles
- relogin and retest

### Browser warning: `ResizeObserver loop completed with undelivered notifications`

- Usually a UI warning/noise and not the root auth/backend failure.
- Prioritize HTTP status errors (401/403/500) and backend logs.

---

## 8) Environment Notes

- ORISO Kubernetes values currently reference domains under `*.oriso-dev.site`.
- Recovery and security docs flag this domain as sensitive/legacy-risk in parts of the repository.
- Keep domain ownership/security review aligned with platform/security runbooks.

---

## 9) Operations Checklist (Every Change)

- [ ] Confirm realm is `online-beratung`
- [ ] Confirm required roles exist
- [ ] Confirm target user has required roles
- [ ] Confirm required attributes (`userId`, `username`, `tenantId`) are present
- [ ] Re-login after role/attribute changes
- [ ] Verify token claims in browser or API gateway
- [ ] Verify affected admin screens and flows
- [ ] Document update in section 10

---

## 10) Update Log (Living)

| Date (YYYY-MM-DD) | Owner | Change | Why | Verified |
|---|---|---|---|---|
| 2026-05-04 | Platform/Auth | Initial version created. Captured role mapping fixes and Keycloak action flow. | Standardize setup and troubleshooting. | Yes |

---

## 11) Next Updates To Add

- Add exact client definitions used per app (`app`, admin client, service clients).
- Add standard role bundles by persona (super admin, agency admin, tenant admin, technical).
- Add screenshots for role assignment popup variants (new/old Keycloak UI).
- Add production-safe secrets rotation and password policy steps.
