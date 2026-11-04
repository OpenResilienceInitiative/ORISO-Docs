---
title: "ORISO Onboarding Guide"
description: "Five-day onboarding plan using enriched repository summaries."
source: "docs/platform/onboarding-guide.md"
---

> **Superseded as an entry point.** The reading order for a new developer is now [Platform overview](/de/plattform/start-here/overview) → [Install and run locally](/de/plattform/start-here/install-and-run-locally) → [Architecture](/de/plattform/start-here/architecture). This five-day plan is kept as one possible schedule.
- [Repository map](/de/plattform/flows-und-reference/repository-map)
- [Architecture](/de/plattform/start-here/architecture)
- [Authentication and Keycloak](/de/plattform/core-systems/authentication-and-keycloak)
- [Database and data model](/de/plattform/core-systems/database-and-data-model)
- [Kubernetes deployment](/de/plattform/core-systems/kubernetes-deployment)
- [Frontend/Admin overview](/de/plattform/core-systems/frontend-admin-overview)
- [Backend services](/de/plattform/core-systems/backend-services)
- [Tenant lifecycle](/de/plattform/flows-und-reference/tenant-lifecycle)
- [User management flow](/de/plattform/archive/user-management-flow)
- [Local development](/de/plattform/platform-flows/local-development)
- [Onboarding guide](/de/plattform/archive/onboarding-guide)
- [Troubleshooting](/de/plattform/flows-und-reference/troubleshooting)
- [Graph validation report](/de/plattform/archive/graph-validation-report)
- [Diagrams](/de/plattform/flows-und-reference/diagrams)

## Day 1: Product and Map

Read overview, repository map, architecture, and repo summaries for Keycloak and Database.

## Day 2: UI

Read Frontend/Admin overview and the ORISO-Frontend / ORISO-Admin enriched summaries. Trace route files and API clients.

## Day 3: Backend

Read Backend Services and the four backend repo summaries. Start from OpenAPI contracts, then controllers, then services, then repositories.

## Day 4: Auth and Data

Read Authentication and Keycloak, Database and Data Model, Tenant Lifecycle, and User Management Flow.

## Day 5: Deployment

Read Kubernetes Deployment, Troubleshooting, and ORISO-Kubernetes repo summary. Inspect Helm values and ingress manifests before changing runtime behavior.
