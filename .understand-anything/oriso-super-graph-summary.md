# ORISO Super-Graph

Rebuilt 2026-08-27T12:32:07.902Z by ua-build-supergraph.mjs v3 (deterministic, architecture tiers).

## User Interfaces
- **ORISO-Frontend** — User-facing counselling web app (React): registration, enquiries, sessions, chat, calls. (4308 nodes / 4017 edges @ 01e2e2ab)
- **ORISO-Admin** — Admin panel (React/MUI): tenants, agencies, consultants, legal texts, statistics. (2830 nodes / 2427 edges @ c99e168d)

## Backend Microservices
- **ORISO-UserService** — Core backend (Java/Spring Boot): users, consultants, sessions, enquiries, messaging integration. (12157 nodes / 16622 edges @ 285f7582)
- **ORISO-AgencyService** — Backend microservice (Java/Spring Boot): agencies, postcode ranges, agency admin. (2637 nodes / 3127 edges @ f2ca7d69)
- **ORISO-ConsultingTypeService** — Backend microservice (Java/Spring Boot): consulting types, topics, application settings. (1129 nodes / 1153 edges @ 8d9797bc)
- **ORISO-TenantService** — Backend microservice (Java/Spring Boot): tenants, theming, legal/privacy settings, feature flags. (1921 nodes / 2169 edges @ 164d130d)

## Identity & Data
- **ORISO-Keycloak** — Identity provider (Keycloak): realms, OIDC clients, 2FA, custom theme and realm config. (350 nodes / 309 edges @ 494b9a68)
- **ORISO-Database** — Database schemas and baseline seed data (MariaDB/MongoDB). (87 nodes / 63 edges @ c9630a93)

## Communication & Media
- **ORISO-ElementCall** — Video calls (Element Call fork) on the Matrix stack; widget and standalone modes. (797 nodes / 745 edges @ 710281f7)
- **ORISO-Livekit** — Media SFU backend (LiveKit) configuration serving the call stack. (84 nodes / 77 edges @ b05c56a7)

## Operations & Deployment
- **ORISO-Helm** — Canonical Helm charts: deploys every service — ingress, Matrix stack, seeds, config. (540 nodes / 284 edges @ 4da2dfa2)
- **ORISO-Kubernetes** — Legacy Kubernetes manifests (archived upstream; kept for analysis only). (147 nodes / 3 edges @ 10232408)
- **ORISO-Infra** — Infrastructure automation (Hetzner, k3s provisioning). (17 nodes / 16 edges @ 8d3acd2f)

## Observability & Quality
- **ORISO-E2E** — End-to-end Playwright quality gate across app and admin. (198 nodes / 162 edges @ 28c5d919)
- **ORISO-HealthDashboard** — Service health dashboard. (52 nodes / 49 edges @ 5350bff0)
- **ORISO-SigNoz** — Observability stack (SigNoz) configuration. (21 nodes / 15 edges @ 95545269)
- **ORISO-Status** — Public status page (repository archived on GitHub; graph is server-side only). (37 nodes / 23 edges @ 43bdc623)

Cross-repo dependency edges: 52 (keyword inference, evidence-count >= 2).
