---
title: ORISO Platform Overview
description: Enriched ORISO platform documentation hub from Understand-Anything graphs plus direct source inspection.
---

# ORISO Platform Overview

## Platform Navigation

- [Overview](./overview.md)
- [Repository map](./repository-map.md)
- [Architecture](./architecture.md)
- [Authentication and Keycloak](./authentication-and-keycloak.md)
- [Database and data model](./database-and-data-model.md)
- [Kubernetes deployment](./kubernetes-deployment.md)
- [Frontend/Admin overview](./frontend-admin-overview.md)
- [Backend services](./backend-services.md)
- [Tenant lifecycle](./tenant-lifecycle.md)
- [User management flow](./user-management-flow.md)
- [Local development](./local-development.md)
- [Onboarding guide](./onboarding-guide.md)
- [Troubleshooting](./troubleshooting.md)
- [Graph validation report](./graph-validation-report.md)
- [Diagrams](./diagrams.md)

## What This Hub Is

This hub combines existing Understand-Anything graphs with direct inspection of the actual sibling repositories. The direct pass read package manifests, route files, API clients, Java controllers/services/repositories/entities, OpenAPI contracts, application properties, database schemas, Keycloak realm exports, Kubernetes Helm values and ingress manifests.

Use it to decide which repository to read first, trace service ownership, understand auth/data/deployment boundaries, and find concrete file paths before changing code.

## Platform Boundary

- ORISO-Frontend: public counseling app.
- ORISO-Admin: operational admin dashboard.
- ORISO-Keycloak: realm, clients, roles and token issuance.
- ORISO-TenantService: tenant records, settings and tenant resolution.
- ORISO-UserService: user/session/conversation/chat/appointment lifecycle.
- ORISO-AgencyService: agencies, postcode ranges, agency admin and topic enrichment.
- ORISO-ConsultingTypeService: consulting types, topics, topic groups and application settings.
- ORISO-Database: service-owned schema exports, Mongo dumps, Redis/RabbitMQ/Matrix persistence docs and init jobs.
- ORISO-Kubernetes: Helm charts, ingress, runtime config and deployment topology.

## Read First

1. [Repository map](./repository-map.md) to pick the right owner.
2. [Architecture](./architecture.md) to understand the platform topology.
3. [Authentication and Keycloak](./authentication-and-keycloak.md) before touching login, roles or tokens.
4. [Database and data model](./database-and-data-model.md) before changing persistence.
5. The repo-specific enriched summary under [repo-graphs](./repo-graphs/ORISO-Frontend.md).

## Super Graph

- Dashboard graph: .understand-anything/knowledge-graph.json
- Requested graph: .understand-anything/oriso-super-graph.json
- Summary: .understand-anything/oriso-super-graph-summary.md

## Needs Verification

- Active staging/production values may differ from committed local .env and Helm values.
- Exact tenantId claim generation in Keycloak needs verification.
- UploadService and Rocket.Chat are referenced by ingress/config but their repositories are not included here.
