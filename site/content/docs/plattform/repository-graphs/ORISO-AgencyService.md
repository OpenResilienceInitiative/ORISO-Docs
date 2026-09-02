---
title: "ORISO-AgencyService"
description: "Generated graph summary for ORISO-AgencyService."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# ORISO-AgencyService

| Field | Value |
| --- | --- |
| Commit | `—` |
| Tier | Backend Microservices |
| Nodes | 623 |
| Endpoints | 86 |
| Dashboard | [understand.oriso.org](https://understand.oriso.org/) |

## Purpose

Spring Boot backend for public agency lookup, agency administration, postcode ranges, topic/demographic enrichment, Matrix agency accounts, and ORISO peer-service integration.


## Depends on

- ORISO-UserService (weight 58)
- ORISO-ConsultingTypeService (weight 36)
- ORISO-TenantService (weight 20)
- ORISO-Keycloak (weight 5)
- ORISO-Database (weight 4)

## Depended on by

- ORISO-UserService (weight 45)
- ORISO-Kubernetes (weight 21)
- ORISO-Database (weight 17)
- ORISO-TenantService (weight 13)
- ORISO-Frontend (weight 1)

## Endpoints (first 80 of 86)

| Method | Path / operation |
| --- | --- |
| GET | `/agencies` |
| GET | `/agencies/by-tenant` |
| GET | `/agencies/topics` |
| GET | `/agencies/{agencyIds}` |
| GET | `/agencies/consultingtype/{consultingTypeId}` |
| GET | `/agencyadmin` |
| GET | `/agencyadmin/agencies` |
| POST | `/agencyadmin/agencies` |
| GET | `/agencyadmin/agencies/{agencyId}` |
| DELETE | `/agencyadmin/agencies/{agencyId}` |
| PUT | `/agencyadmin/agencies/{agencyId}` |
| GET | `/agencyadmin/agencies/tenant/{tenantId}` |
| POST | `/agencyadmin/agencies/{agencyId}/changetype` |
| GET | `/agencyadmin/postcoderanges/{agencyId}` |
| POST | `/agencyadmin/postcoderanges/{agencyId}` |
| PUT | `/agencyadmin/postcoderanges/{agencyId}` |
| DELETE | `/agencyadmin/postcoderanges/{agencyId}` |
| GET | `/useradmin` |
| GET | `/useradmin/sessions` |
| GET | `/useradmin/consultants` |
| POST | `/useradmin/consultants` |
| GET | `/useradmin/consultants/{consultantId}` |
| PUT | `/useradmin/consultants/{consultantId}` |
| DELETE | `/useradmin/consultants/{consultantId}` |
| GET | `/useradmin/askers/{askerId}` |
| DELETE | `/useradmin/askers/{askerId}` |
| GET | `/useradmin/report` |
| GET | `/useradmin/agencies/{agencyId}/consultants` |
| GET | `/useradmin/consultants/{consultantId}/agencies` |
| POST | `/useradmin/consultants/{consultantId}/agencies` |
| PUT | `/useradmin/consultants/{consultantId}/agencies` |
| DELETE | `/useradmin/consultants/{consultantId}/agencies/{agencyId}` |
| POST | `/useradmin/agency/{agencyId}/changetype` |
| GET | `/useradmin/agencyadmins` |
| POST | `/useradmin/agencyadmins` |
| GET | `/useradmin/agencyadmins/{adminId}` |
| PUT | `/useradmin/agencyadmins/{adminId}` |
| DELETE | `/useradmin/agencyadmins/{adminId}` |
| GET | `/useradmin/agencyadmins/{adminId}/agencies` |
| POST | `/useradmin/agencyadmins/{adminId}/agencies` |
| PUT | `/useradmin/agencyadmins/{adminId}/agencies` |
| DELETE | `/useradmin/agencyadmins/{adminId}/agencies/{agencyId}` |
| GET | `/consultingtypes/basic` |
| GET | `/consultingtypes/{consultingTypeId}/basic` |
| GET | `/consultingtypes/{consultingTypeId}/extended` |
| GET | `/consultingtypes/{consultingTypeId}/full` |
| GET | `/consultingtypes/byslug/{slug}/full` |
| GET | `/consultingtypes/bytenant/{tenantId}/full` |
| GET | `/consultingtypes/groups` |
| POST | `/consultingtypes` |
| PATCH | `/consultingtypes/{id}` |
| POST | `/tenantadmin` |
| GET | `/tenantadmin` |
| GET | `/tenantadmin/search` |
| PUT | `/tenantadmin/{id}` |
| GET | `/tenantadmin/{id}` |
| GET | `/tenant` |
| GET | `/tenant/{id}` |
| GET | `/tenant/public/{subdomain}` |
| GET | `/tenant/public/id/{tenantId}` |
| GET | `/tenant/public/single` |
| GET | `/tenant/public/` |
| GET | `/tenant/access` |
| POST | `/topic` |
| GET | `/topic` |
| GET | `/topic/{id}` |
| PUT | `/topic/{id}` |
| GET | `/settings` |
| PATCH | `/settingsadmin` |
| GET | `/consultants/{consultantId}/eventTypes` |
| POST | `/consultants/{consultantId}/eventTypes` |
| GET | `/consultants/{consultantId}/bookings` |
| GET | `/consultants/{consultantId}/meetingSlug` |
| POST | `/agencies/agencyConsultantsSync` |
| POST | `/agencies/agencyMasterDataSync` |
| POST | `/agencies` |
| PUT | `/agencies/{agencyId}` |
| DELETE | `/agencies/{agencyId}` |
| GET | `/agencies/{agencyId}/eventTypes` |
| POST | `/agencies/{agencyId}/eventTypes` |
