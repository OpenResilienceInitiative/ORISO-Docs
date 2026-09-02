---
title: "Backend services"
description: "Generated backend service inventory from the nightly graph."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# Backend services



## ORISO-UserService

- Commit: `—`
- Nodes: 2295
- Endpoints: 182
- Depends on: ORISO-Keycloak (50), ORISO-AgencyService (45), ORISO-ConsultingTypeService (31), ORISO-TenantService (22), ORISO-Database (5)

## ORISO-AgencyService

- Commit: `—`
- Nodes: 623
- Endpoints: 86
- Depends on: ORISO-UserService (58), ORISO-ConsultingTypeService (36), ORISO-TenantService (20), ORISO-Keycloak (5), ORISO-Database (4)

## ORISO-ConsultingTypeService

- Commit: `—`
- Nodes: 470
- Endpoints: 32
- Depends on: ORISO-Database (123), ORISO-TenantService (21), ORISO-Keycloak (11)

## ORISO-TenantService

- Commit: `—`
- Nodes: 380
- Endpoints: 66
- Depends on: ORISO-UserService (41), ORISO-ConsultingTypeService (27), ORISO-AgencyService (13), ORISO-Keycloak (8), ORISO-Database (2), ORISO-Kubernetes (1)

