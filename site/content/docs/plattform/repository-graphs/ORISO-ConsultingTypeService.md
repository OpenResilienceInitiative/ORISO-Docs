---
title: "ORISO-ConsultingTypeService"
description: "Generated graph summary for ORISO-ConsultingTypeService."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# ORISO-ConsultingTypeService

| Field | Value |
| --- | --- |
| Commit | `—` |
| Tier | Backend Microservices |
| Nodes | 470 |
| Endpoints | 32 |
| Dashboard | [understand.oriso.org](https://understand.oriso.org/) |

## Purpose

Spring Boot service that owns consulting type settings, topics, topic groups, application settings, tenant-aware access, and OpenAPI contracts for the ORISO platform.


## Depends on

- ORISO-Database (weight 123)
- ORISO-TenantService (weight 21)
- ORISO-Keycloak (weight 11)

## Depended on by

- ORISO-AgencyService (weight 36)
- ORISO-UserService (weight 31)
- ORISO-TenantService (weight 27)
- ORISO-Kubernetes (weight 21)
- ORISO-Database (weight 19)

## Endpoints

| Method | Path / operation |
| --- | --- |
| GET | `/settings` |
| PATCH | `/settingsadmin` |
| GET | `/consultingtypeadmin` |
| GET | `/consultingtypeadmin/consultingtypes` |
| GET | `/consultingtypes/basic` |
| GET | `/consultingtypes/{consultingTypeId}/basic` |
| GET | `/consultingtypes/{consultingTypeId}/extended` |
| GET | `/consultingtypes/{consultingTypeId}/full` |
| GET | `/consultingtypes/byslug/{slug}/full` |
| GET | `/consultingtypes/bytenant/{tenantId}/full` |
| GET | `/consultingtypes/groups` |
| POST | `/consultingtypes` |
| PATCH | `/consultingtypes/{id}` |
| GET | `/topic-groups` |
| GET | `/topic` |
| GET | `/topic/{id}` |
| GET | `/topic/public` |
| POST | `/topicadmin` |
| GET | `/topicadmin` |
| GET | `/topicadmin/{id}` |
| PUT | `/topicadmin/{id}` |
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
| GET | `/tenant/access` |
