---
title: Kubernetes Deployment
description: Enriched Kubernetes deployment, ingress, chart and operations summary.
---

# Kubernetes Deployment

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

Diagram: [deployment-flow.mmd](./diagrams/deployment-flow.mmd)

## Charts

- admin
- agencyservice
- clickhouse
- consultingtypeservice
- element
- element-call
- frontend
- health-dashboard
- keycloak
- livekit
- mariadb
- matrix-synapse
- mongodb
- otel-collector
- rabbitmq
- redis
- redis-commander
- redis-exporter
- service-health-exporter
- signoz
- status-page
- storybook
- tenantservice
- userservice

## Ingress Routing

| File | Hosts | Services |
| --- | --- | --- |
| ingress/00-keycloak-auth-domain-ingress.yaml | auth.oriso-dev.site | oriso-platform-keycloak |
| ingress/01-keycloak-ingress.yaml | api.oriso-dev.site | oriso-platform-keycloak |
| ingress/02-userservice-ingress.yaml | api.oriso-dev.site | oriso-platform-userservice |
| ingress/03-agencyservice-ingress.yaml | api.oriso-dev.site | oriso-platform-agencyservice |
| ingress/04-consultingtypeservice-ingress.yaml | api.oriso-dev.site | oriso-platform-consultingtypeservice |
| ingress/05-tenantservice-ingress.yaml | api.oriso-dev.site | oriso-platform-tenantservice |
| ingress/06-matrix-ingress.yaml | api.oriso-dev.site | oriso-platform-matrix-synapse |
| ingress/08-uploadservice-ingress.yaml | api.oriso-dev.site | oriso-platform-uploadservice |
| ingress/10-health-ingress.yaml | api.oriso-dev.site | oriso-platform-health-dashboard |
| ingress/11-rocketchat-ingress.yaml | api.oriso-dev.site | rocketchat |
| ingress/12-matrix-domain-ingress.yaml | matrix.oriso-dev.site | oriso-platform-matrix-synapse |
| ingress/13-frontend-ingress.yaml | app.oriso-dev.site | oriso-platform-frontend |
| ingress/14-admin-ingress.yaml | admin.oriso-dev.site | oriso-platform-admin |
| ingress/15-health-dashboard-ingress.yaml | health.oriso-dev.site | oriso-platform-health-dashboard |
| ingress/16-element-ingress.yaml | element.oriso-dev.site | oriso-platform-element |
| ingress/17-element-call-ingress.yaml | call.oriso-dev.site | oriso-platform-element-call |
| ingress/18-livekit-ingress.yaml | livekit.oriso-dev.site | oriso-platform-livekit-token-service, oriso-platform-livekit |
| ingress/19-redis-commander-ingress.yaml | redis.oriso-dev.site | oriso-platform-redis-commander |
| ingress/20-signoz-ingress.yaml | signoz.oriso-dev.site | oriso-platform-signoz |
| ingress/21-status-page-ingress.yaml | status.oriso-dev.site | oriso-platform-status-page |
| ingress/22-storybook-ingress.yaml | storybook.oriso-dev.site | oriso-platform-storybook |
| ingress/ingress-values.yaml | - | - |

## Operations Findings

- HPA manifests found: no.
- NetworkPolicy manifests found: no.
- PDB manifests found: no.
- Charts with pullPolicy Never: agencyservice, consultingtypeservice, element, element-call, frontend, health-dashboard, livekit, status-page, storybook, tenantservice, userservice.
- Charts with latest tag: admin, agencyservice, consultingtypeservice, element, element-call, frontend, health-dashboard, livekit, matrix-synapse, redis-commander, redis-exporter, storybook, tenantservice, userservice.
- Charts with empty resources/probes: consultingtypeservice, element, health-dashboard, keycloak, livekit, status-page, tenantservice, userservice.

## Deployment Order

1. Database/cache/queue: MariaDB, MongoDB, Redis, RabbitMQ, Matrix PostgreSQL where needed.
2. Keycloak realm and auth ingress.
3. Matrix/Element/Element Call/LiveKit communication stack.
4. TenantService, ConsultingTypeService, AgencyService, UserService.
5. Frontend/Admin.
6. Ingress, DNS/TLS and observability.
