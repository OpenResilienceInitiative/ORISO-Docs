---
title: "ORISO-UserService"
description: "Generated graph summary for ORISO-UserService."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# ORISO-UserService

| Field | Value |
| --- | --- |
| Commit | `—` |
| Tier | Backend Microservices |
| Nodes | 2295 |
| Endpoints | 182 |
| Dashboard | [understand.oriso.org](https://understand.oriso.org/) |

## Purpose

Spring Boot backend responsible for user, asker, consultant, session, conversation, chat, admin, notification, deletion, and external messaging lifecycle behavior in the ORISO Online-Beratung platform.


## Depends on

- ORISO-Keycloak (weight 50)
- ORISO-AgencyService (weight 45)
- ORISO-ConsultingTypeService (weight 31)
- ORISO-TenantService (weight 22)
- ORISO-Database (weight 5)

## Depended on by

- ORISO-AgencyService (weight 58)
- ORISO-Database (weight 55)
- ORISO-TenantService (weight 41)
- ORISO-Kubernetes (weight 23)
- ORISO-Frontend (weight 7)

## Endpoints (first 80 of 182)

| Method | Path / operation |
| --- | --- |
| — | `/appointments/booking/{id}` |
| — | `/appointments/{id}` |
| — | `/appointments/{id}` |
| — | `/appointments/{id}` |
| — | `/appointments` |
| — | `/appointments` |
| — | `/appointments/sessions/{sessionId}/enquiry/new` |
| — | `/conversations/consultants/enquiries/registered` |
| — | `/conversations/consultants/enquiries/anonymous` |
| — | `/conversations/consultants/mymessages/archive` |
| — | `/conversations/consultants/teamsessions/archive` |
| — | `/conversations/askers/anonymous/new` |
| — | `/conversations/askers/anonymous/{sessionId}/accept` |
| — | `/conversations/anonymous/{sessionId}/finish` |
| — | `/conversations/anonymous/{sessionId}` |
| — | `/useradmin` |
| — | `/useradmin/sessions` |
| — | `/useradmin/consultants` |
| — | `/useradmin/consultants` |
| — | `/useradmin/consultants/{consultantId}` |
| — | `/useradmin/consultants/{consultantId}` |
| — | `/useradmin/consultants/{consultantId}` |
| — | `/useradmin/askers/{askerId}` |
| — | `/useradmin/askers/{askerId}` |
| — | `/useradmin/report` |
| — | `/useradmin/agencies/{agencyId}/consultants` |
| — | `/useradmin/consultants/{consultantId}/agencies` |
| — | `/useradmin/consultants/{consultantId}/agencies` |
| — | `/useradmin/consultants/{consultantId}/agencies` |
| — | `/useradmin/consultants/{consultantId}/agencies/{agencyId}` |
| — | `/useradmin/agency/{agencyId}/changetype` |
| — | `/useradmin/agencyadmins` |
| — | `/useradmin/agencyadmins` |
| — | `/useradmin/agencyadmins/search` |
| — | `/useradmin/agencyadmins/{adminId}` |
| — | `/useradmin/agencyadmins/{adminId}` |
| — | `/useradmin/agencyadmins/{adminId}` |
| — | `/useradmin/agencyadmins/{adminId}/agencies` |
| — | `/useradmin/agencyadmins/{adminId}/agencies` |
| — | `/useradmin/agencyadmins/{adminId}/agencies` |
| — | `/useradmin/agencyadmins/{adminId}/agencies/{agencyId}` |
| — | `/useradmin/tenantadmins` |
| — | `/useradmin/tenantadmins` |
| — | `/useradmin/tenantadmins/search` |
| — | `/useradmin/tenantadmins/{adminId}` |
| — | `/useradmin/tenantadmins/{adminId}` |
| — | `/useradmin/tenantadmins/{adminId}` |
| — | `/useradmin/data` |
| — | `/users/{username}` |
| — | `/users/askers/new` |
| — | `/users/askers/session/new` |
| — | `/users/askers/consultingType/new` |
| — | `/users/sessions/{sessionId}/enquiry/new` |
| — | `/users/sessions/{sessionId}/data` |
| — | `/users/sessions/new/{sessionId}` |
| — | `/users/sessions/askers` |
| — | `/users/sessions/room` |
| — | `/users/sessions/room/{sessionId}` |
| — | `/users/sessions/rocketChatGroupId` |
| — | `/users/sessions/{sessionId}/archive` |
| — | `/users/sessions/{sessionId}/dearchive` |
| — | `/users/consultants/absences` |
| — | `/users/consultants/languages` |
| — | `/users/data` |
| — | `/users/data` |
| — | `/users/data` |
| — | `/users/notifications` |
| — | `/users/email` |
| — | `/users/email` |
| — | `/users/mobiletoken` |
| — | `/users/mobile/app/token` |
| — | `/users/sessions/consultants` |
| — | `/users/consultants/import` |
| — | `/users/askers/import` |
| — | `/users/askersWithoutSession/import` |
| — | `/users/sessions/teams` |
| — | `/users/mails/messages/new` |
| — | `/users/mails/reassignment` |
| — | `/users/consultants` |
| — | `/users/consultants/{consultantId}` |
