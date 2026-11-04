---
title: "ORISO Onboarding Guide"
description: "Five-day onboarding plan using enriched repository summaries."
source: "docs/platform/onboarding-guide.md"
---

> **Superseded as an entry point.** The reading order for a new developer is now [Platform overview](/en/plattform/start-here/overview) → [Install and run locally](/en/plattform/start-here/install-and-run-locally) → [Architecture](/en/plattform/start-here/architecture). This five-day plan is kept as one possible schedule.
- [Repository map](/en/plattform/flows-und-reference/repository-map)
- [Architecture](/en/plattform/start-here/architecture)
- [Authentication and Keycloak](/en/plattform/core-systems/authentication-and-keycloak)
- [Database and data model](/en/plattform/core-systems/database-and-data-model)
- [Kubernetes deployment](/en/plattform/core-systems/kubernetes-deployment)
- [Frontend/Admin overview](/en/plattform/core-systems/frontend-admin-overview)
- [Backend services](/en/plattform/core-systems/backend-services)
- [Tenant lifecycle](/en/plattform/flows-und-reference/tenant-lifecycle)
- [User management flow](/en/plattform/archive/user-management-flow)
- [Local development](/en/plattform/platform-flows/local-development)
- [Onboarding guide](/en/plattform/archive/onboarding-guide)
- [Troubleshooting](/en/plattform/flows-und-reference/troubleshooting)
- [Graph validation report](/en/plattform/archive/graph-validation-report)
- [Diagrams](/en/plattform/flows-und-reference/diagrams)

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
