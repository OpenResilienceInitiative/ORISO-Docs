# Admin Panel — Multiple Admins & Places (read me first)

One place to read what we planned for the **multi tenant/platform admin** work (feature F82, delivery epic
**Multi-Tenant RBAC / MT-04**). Full spec: [UAT](./F82-multiple-admins-and-places.md).

## In one paragraph
Today the panel effectively allows one platform admin and one tenant admin, which forces password sharing.
We want **N equal-rights admins** per **Tenant-Unit** (= the existing Tenant entity) and for the **platform**,
each with their own login, all visible in the user list. Role tiers (Owner/Contributor) are a later iteration.

## User stories
- **MTUS1** As an org running a counselling unit, I want several individual admins on one Tenant-Unit, so we
  administer it without sharing a password.
- **MTUS2** As an admin, I want users and units under a consistent **Users / Places** view (Places = **Tenant-Unit**
  + **Agency** tabs), so managing who-administers-what is the same everywhere.
- **MTUS3** As an admin, I want to assign one admin to one or several places in a single step.

## Terminology (settled)
- **Tenant-Unit** = the Tenant entity shown as a place (distinct from **Tenant-Admins**, the people).
- **Agency** = counseling center (Beratungsstelle).

## Tasks (MT-04, continues MT-04-07)
| Task | What | Repo | Issue |
|---|---|---|---|
| MT-04-08 | Allow N equal admins per Tenant-Unit (backend) | **ORISO-UserService** | #22 |
| MT-04-09 | Manage Tenant-Unit admins in the panel (frontend) | ORISO-Admin | #29 |
| MT-04-10 | "Places" nav: Tenant-Unit + Agency tabs | ORISO-Admin | #30 |
| MT-04-11 | Straighten Tenant-Unit / Tenant / Träger naming (cleanup) | ORISO-Admin | #31 |
| MT-04-12 | Multiple platform admins via a Platform ID (simple) | ORISO-TenantService | #7 |

## Backend: what already exists vs the gap (answers the current questions)
- **Backend lives in ORISO-UserService**, not TenantService. The tenant-admin API already exists:
  `/useradmin/tenantadmins` (get/create), `/useradmin/tenantadmins/search`,
  `/useradmin/tenantadmins/{adminId}` (get/update/delete) + `api/admin/service/tenant/TenantAdminService.java`.
- So **MT-04-08 is the ORISO-UserService ticket (#22)** — yes, work there.
- **The gap** (verify, then close): (1) confirm N tenant admins per unit are allowed end-to-end; (2) retire the
  `single-tenant-admin` Keycloak constraint where it forces one; (3) search/sort parity with the Admin frontend,
  incl. the `UPDATE_DATE` "Last Updated" sort (the frontend sends it; being added in branch
  `feature/tenant-admin-update-date-sort`).
- Related in-flight: ORISO-Admin branch `feature/all-user-flow-updated` (user-management / tenant-admin flow).

## Grounding evidence
Live-read `ORISO-Admin/src/api/agency/putAgenciesForAdmin.ts` (the multi-scope assign pattern);
`ORISO-UserService/api/useradminservice.yaml` (the `/useradmin/tenantadmins*` endpoints);
Keycloak realm `online-beratung` roles `tenant-admin` / `single-tenant-admin`.
