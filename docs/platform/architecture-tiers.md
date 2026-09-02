---
title: "Architecture tiers"
description: "Generated platform tiers and cross-repo depends_on."
generated: true
generatedFrom: .understand-anything/docs-export
generatedAt: 2026-09-02T04:01:19.859Z
---

> This page is **generated** from the nightly Understand-Anything export. Do not edit — changes will be overwritten. Editorial docs live outside the regenerate allowlist.


# Architecture tiers

Last export: `2026-09-02T04:01:19.859Z`

Commit tips: _(no meta.json commits — export used repo-node metadata)_

| Tier | Repositories | Source |
| --- | --- | --- |
| User Interfaces | ORISO-Frontend, ORISO-Admin, ORISO-ElementCall, ORISO-Status, ORISO-HealthDashboard | curated-default |
| Backend Microservices | ORISO-UserService, ORISO-AgencyService, ORISO-TenantService, ORISO-ConsultingTypeService | curated-default |
| Identity & Data | ORISO-Keycloak, ORISO-Database | curated-default |
| Communication & Media | ORISO-Livekit | curated-default |
| Operations & Deployment | ORISO-Helm, ORISO-Kubernetes, ORISO-Infra, ORISO-Docs | curated-default |
| Observability & Quality | ORISO-SigNoz, ORISO-E2E | curated-default |

## Cross-repo `depends_on` (aggregated)

| From | To | Weight |
| --- | --- | --- |
| ORISO-ConsultingTypeService | ORISO-Database | 123 |
| ORISO-AgencyService | ORISO-UserService | 58 |
| ORISO-Database | ORISO-UserService | 55 |
| ORISO-Kubernetes | ORISO-Database | 51 |
| ORISO-UserService | ORISO-Keycloak | 50 |
| ORISO-UserService | ORISO-AgencyService | 45 |
| ORISO-TenantService | ORISO-UserService | 41 |
| ORISO-AgencyService | ORISO-ConsultingTypeService | 36 |
| ORISO-UserService | ORISO-ConsultingTypeService | 31 |
| ORISO-TenantService | ORISO-ConsultingTypeService | 27 |
| ORISO-Kubernetes | ORISO-UserService | 23 |
| ORISO-UserService | ORISO-TenantService | 22 |
| ORISO-ConsultingTypeService | ORISO-TenantService | 21 |
| ORISO-Kubernetes | ORISO-AgencyService | 21 |
| ORISO-Kubernetes | ORISO-ConsultingTypeService | 21 |
| ORISO-AgencyService | ORISO-TenantService | 20 |
| ORISO-Kubernetes | ORISO-TenantService | 20 |
| ORISO-Database | ORISO-ConsultingTypeService | 19 |
| ORISO-Database | ORISO-AgencyService | 17 |
| ORISO-Kubernetes | ORISO-Keycloak | 15 |
| ORISO-TenantService | ORISO-AgencyService | 13 |
| ORISO-Database | ORISO-Kubernetes | 12 |
| ORISO-ConsultingTypeService | ORISO-Keycloak | 11 |
| ORISO-Frontend | ORISO-Keycloak | 11 |
| ORISO-Database | ORISO-TenantService | 9 |
| ORISO-TenantService | ORISO-Keycloak | 8 |
| ORISO-Frontend | ORISO-UserService | 7 |
| ORISO-Keycloak | ORISO-Kubernetes | 7 |
| ORISO-AgencyService | ORISO-Keycloak | 5 |
| ORISO-UserService | ORISO-Database | 5 |
| ORISO-Admin | ORISO-Keycloak | 4 |
| ORISO-AgencyService | ORISO-Database | 4 |
| ORISO-Frontend | ORISO-Kubernetes | 4 |
| ORISO-TenantService | ORISO-Database | 2 |
| ORISO-Admin | ORISO-Kubernetes | 1 |
| ORISO-Frontend | ORISO-AgencyService | 1 |
| ORISO-Keycloak | ORISO-TenantService | 1 |
| ORISO-TenantService | ORISO-Kubernetes | 1 |

Live graphs: [understand.oriso.org](https://understand.oriso.org/docs/).
