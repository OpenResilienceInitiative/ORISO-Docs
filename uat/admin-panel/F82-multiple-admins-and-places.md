# UAT — Multiple Admins & Places (Admin Panel · ADM-01..05)

Source feature: F82 "refactor panel so multiple persons can be Platform and Tenant".
Status: ready · grounded against the live code graph. PO decisions resolved 2026-06-03.

> **Tasks:** ADM-01 (backend tenant multi-admin · ORISO-TenantService#6), ADM-02 (frontend mgmt · ORISO-Admin#29),
> ADM-03 (Places nav · ORISO-Admin#30), ADM-04 (naming cleanup · ORISO-Admin#31), ADM-05 (platform admins · ORISO-TenantService#7).

## Terminology (settled)
- **Tenant-Unit** = the *place* that is the existing **Tenant** entity (Träger). Same entity, named "Tenant-Unit"
  in the Places context so it is not confused with **Tenant-Admins** (the people).
- **Agency** = the counseling-center place (Beratungsstelle).
- Places has two tabs: **Tenant-Unit** and **Agency**.

---

## Part A — Business

### The Problem
Today the panel allows only one platform admin and one tenant admin, so real teams share a single login to
co-administer a unit. That breaks accountability, blocks hand-over during absence, and is inconsistent with
counsellors (already many-per-agency). Under KDG, shared admin credentials make "who did what" unprovable.

### High-level steps
1. An administrator opens **Places** and picks **Tenant-Unit** or **Agency**.
2. They open a place and add one or more individual admin accounts to it.
3. Each new admin receives their own login (no shared password).
4. The same admin can be attached to several places in one step.
5. Removing one admin from a place leaves the place and its other admins working.

### Business value
Accountable, hand-over-safe administration that scales to real organisations, reusing the proven agency
model so the change is low-risk and familiar to existing admins.

### Cleaned-up user stories
- Assign several individual admins to one administrative unit, no shared password.
- See users and units under a consistent Users / Places structure with split-tab lists.
- Grant one admin rights over one or many places in a single action.

### Simplified solution
Generalise the existing agency multi-admin assignment (an admin already holds an array of agencies, each
with a role) up to the Tenant-Unit level, and surface every administrable unit under one Places navigation
with two list tabs. Same many-to-many "admin to unit" relationship, applied consistently.

---

## Part B — Developer (grounded)

### What already exists (verified in code) — reuse these
- Many-to-many admin to scope, with role: `putAgenciesForAgencyAdmin(adminId, agencyIds[])` PUTs an array of
  `{agencyId, role:'ADMIN_DEFAULT'}` to `/agencyadmin/{adminId}/agencies`
  (`ORISO-Admin/src/api/agency/putAgenciesForAdmin.ts`, read live).
- Backend admin assignment endpoints already model the relation as a collection:
  `GET/DELETE /useradmin/agencyadmins/{adminId}/agencies`, `GET /useradmin/agencyadmins`
  (`ORISO-AgencyService/services/useradminservice.yaml`). Tenant side: `/tenantadmin*` (`services/tenantservice.yaml`).
- Admin panel section/tab framework: `UserSectionPills` + `userTableConfigs.ts` (`canReadSection`,
  `getVisibleColumns`), `UserManagementTable`, `TenantsManagementTable` (`ORISO-Admin/src/pages/users/management/`).
- CRUD hooks/pages to copy: `useAddOrUpdateConsultantOrAgencyAdmin`, `TenantAdminEditOrAdd`, `useTenantUserAdminsData`.
- Keycloak realm `online-beratung` roles: `tenant-admin`, `single-tenant-admin`, `agency-admin`, `user-admin`.

### What this epic adds (the gap)
1. Tenant-Unit admin becomes many-per-unit (no tenant-admin assignment API exists today; backend change).
2. Multiple platform admins via a Platform ID set at platform creation (simple — no assignment UI).
3. Unified "Places" navigation: Tenant-Unit + Agency tabs, reusing the existing list pattern.
4. Multi-select assign-to-places in the admin create/edit flow.

### Acceptance criteria (scenarios)
- A: a unit with one admin gets a second individual account -> both sign in independently, no shared pw.
- B: an admin on three places removed from one -> the other two unchanged.
- C: create-admin with several places selected -> one save attaches the admin to all.
- D (KDG): two admins act -> each action attributable to an individual account.
- E: last-admin removal applies the agreed last-admin rule.
- F (platform): Platform ID set at creation; a second platform-admin with that ID -> both sign in and appear
  in the user list, no shared password.

### Edge cases
- Removing the last admin of a place (forbid or allow orphan?).
- An admin on several places loses one -> others intact.
- Removing your own last admin right.
- Re-adding an existing admin (idempotent).
- `single-tenant-admin` legacy accounts during migration.

### PO decisions (resolved 2026-06-03)
- Platform admins: yes, multiple — but simple (Platform ID at creation; accounts carry it; visible in user list). No role tiers.
- The place is the existing Tenant entity; working term "Tenant-Unit". Cleanup task ADM-04 aligns naming.
- `/tenantadmin` does not allow N admins today -> backend collection assignment required (ADM-01).
- Role tiers (Owner/Contributor) per segment: later iteration.

### Source evidence
- Live read: `ORISO-Admin/src/api/agency/putAgenciesForAdmin.ts`.
- Endpoints (graph): `/useradmin/agencyadmins/{adminId}/agencies`, `/tenantadmin*`.
- UI (graph): `ORISO-Admin/src/pages/users/management/*`, `TenantAdminEdit/index.tsx`.
- Roles (graph): `tenant-admin`, `single-tenant-admin`, `agency-admin`, `user-admin`.
