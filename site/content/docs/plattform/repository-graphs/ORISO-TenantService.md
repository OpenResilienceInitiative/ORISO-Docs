---
title: "ORISO-TenantService"
description: "Generated graph summary for ORISO-TenantService."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# ORISO-TenantService

| Field | Value |
| --- | --- |
| Commit | `—` |
| Tier | Backend Microservices |
| Nodes | 380 |
| Endpoints | 66 |
| Dashboard | [understand.oriso.org](https://understand.oriso.org/) |

## Purpose

Spring Boot service that owns ORISO tenant records, tenant settings, legal content, subdomain resolution, and tenant-specific integration with ConsultingType, ApplicationSettings, and UserAdmin services.


## Depends on

- ORISO-UserService (weight 41)
- ORISO-ConsultingTypeService (weight 27)
- ORISO-AgencyService (weight 13)
- ORISO-Keycloak (weight 8)
- ORISO-Database (weight 2)
- ORISO-Kubernetes (weight 1)

## Depended on by

- ORISO-UserService (weight 22)
- ORISO-ConsultingTypeService (weight 21)
- ORISO-AgencyService (weight 20)
- ORISO-Kubernetes (weight 20)
- ORISO-Database (weight 9)
- ORISO-Keycloak (weight 1)

## Endpoints

| Method | Path / operation |
| --- | --- |
| GET | `/tenant/access` |
| POST | `/tenantadmin` |
| GET | `/tenant` |
| GET | `/tenantadmin` |
| GET | `/tenantadmin/{id}` |
| GET | `/tenant/public/single` |
| GET | `/tenant/public/` |
| GET | `/tenant/public/{subdomain}` |
| GET | `/tenant/public/id/{tenantId}` |
| GET | `/tenant/{id}` |
| GET | `/tenantadmin/search` |
| PUT | `/tenantadmin/{id}` |
| POST | `/agencyadmin/agencies` |
| POST | `/agencyadmin/postcoderanges/{agencyId}` |
| DELETE | `/agencyadmin/agencies/{agencyId}` |
| DELETE | `/agencyadmin/postcoderanges/{agencyId}` |
| GET | `/agencyadmin/agencies/tenant/{tenantId}` |
| GET | `/agencyadmin/agencies/{agencyId}` |
| GET | `/agencyadmin/postcoderanges/{agencyId}` |
| GET | `/agencyadmin` |
| GET | `/agencyadmin/agencies` |
| PUT | `/agencyadmin/agencies/{agencyId}` |
| PUT | `/agencyadmin/postcoderanges/{agencyId}` |
| GET | `/settings` |
| PATCH | `/settingsadmin` |
| POST | `/consultingtypes` |
| GET | `/consultingtypes/{consultingTypeId}/basic` |
| GET | `/consultingtypes/basic` |
| GET | `/consultingtypes/groups` |
| GET | `/consultingtypes/{consultingTypeId}/extended` |
| GET | `/consultingtypes/{consultingTypeId}/full` |
| GET | `/consultingtypes/byslug/{slug}/full` |
| GET | `/consultingtypes/bytenant/{tenantId}/full` |
| PATCH | `/consultingtypes/{id}` |
| POST | `/useradmin/agencyadmins/{adminId}/agencies` |
| POST | `/useradmin/agencyadmins` |
| POST | `/useradmin/consultants` |
| POST | `/useradmin/consultants/{consultantId}/agencies` |
| POST | `/useradmin/tenantadmins` |
| DELETE | `/useradmin/agencyadmins/{adminId}/agencies/{agencyId}` |
| DELETE | `/useradmin/agencyadmins/{adminId}` |
| DELETE | `/useradmin/consultants/{consultantId}/agencies/{agencyId}` |
| DELETE | `/useradmin/tenantadmins/{adminId}` |
| GET | `/useradmin/report` |
| GET | `/useradmin/agencyadmins/{adminId}/agencies` |
| GET | `/useradmin/agencyadmins/{adminId}` |
| GET | `/useradmin/agencyadmins` |
| GET | `/useradmin/agencies/{agencyId}/consultants` |
| GET | `/useradmin/askers/{askerId}` |
| GET | `/useradmin/consultants/{consultantId}` |
| GET | `/useradmin/consultants/{consultantId}/agencies` |
| GET | `/useradmin/consultants` |
| GET | `/useradmin` |
| GET | `/useradmin/sessions` |
| GET | `/useradmin/tenantadmins/{adminId}` |
| GET | `/useradmin/tenantadmins` |
| DELETE | `/useradmin/askers/{askerId}` |
| DELETE | `/useradmin/consultants/{consultantId}` |
| PATCH | `/useradmin/data` |
| GET | `/useradmin/agencyadmins/search` |
| GET | `/useradmin/tenantadmins/search` |
| PUT | `/useradmin/agencyadmins/{adminId}/agencies` |
| PUT | `/useradmin/consultants/{consultantId}/agencies` |
| PUT | `/useradmin/agencyadmins/{adminId}` |
| PUT | `/useradmin/consultants/{consultantId}` |
| PUT | `/useradmin/tenantadmins/{adminId}` |
