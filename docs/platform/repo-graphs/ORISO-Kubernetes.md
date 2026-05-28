---
title: ORISO-Kubernetes Enriched Graph Summary
description: Direct chart/ingress inspection and graph-backed summary for ORISO-Kubernetes.
---

# ORISO-Kubernetes Enriched Graph Summary

## Platform Navigation

- [Overview](../overview.md)
- [Repository map](../repository-map.md)
- [Architecture](../architecture.md)
- [Authentication and Keycloak](../authentication-and-keycloak.md)
- [Database and data model](../database-and-data-model.md)
- [Kubernetes deployment](../kubernetes-deployment.md)
- [Frontend/Admin overview](../frontend-admin-overview.md)
- [Backend services](../backend-services.md)
- [Tenant lifecycle](../tenant-lifecycle.md)
- [User management flow](../user-management-flow.md)
- [Local development](../local-development.md)
- [Onboarding guide](../onboarding-guide.md)
- [Troubleshooting](../troubleshooting.md)
- [Graph validation report](../graph-validation-report.md)
- [Diagrams](../diagrams.md)

## Repository Purpose

Kubernetes infrastructure repository for Helm charts, ingress routing, service networking, storage, observability, and ORISO runtime topology.

## Main Technologies

Kubernetes, Helm 3, Nginx Ingress, cert-manager, MariaDB, MongoDB, Redis, RabbitMQ, Keycloak, Matrix, LiveKit, SigNoZ, OpenTelemetry

## Important Files and Modules

- helm/oriso-platform/Chart.yaml
- helm/oriso-platform/values.yaml
- helm/oriso-platform/values-local-macos.example.yaml
- helm/values.yaml
- ingress/ingress-values.yaml
- ingress/apply-ingress.sh
- README.md
- docs/MULTITENANCY_MODULE_SPECIFICATION.md
- docs/redis-commander-hardening-and-validation.md
- helm/README.md
- helm/charts/agencyservice/README.md
- helm/oriso-platform/README.md
- ingress/README.md

## Helm Charts

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

| Ingress file | Hosts | Backend services |
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

## Resource, Probe, and Secret Scan

| Chart | resources key | resources status | liveness key | probe status | pullPolicy Never | latest tag | secret-like values | hostNetwork |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| admin | yes | configured/unknown | yes | configured/unknown | no | yes | no | no |
| agencyservice | yes | configured/unknown | yes | configured/unknown | yes | yes | yes | no |
| clickhouse | yes | configured/unknown | no | configured/unknown | no | no | yes | no |
| consultingtypeservice | yes | empty/partial | no | empty/partial | yes | yes | yes | no |
| element | no | empty/partial | no | configured/unknown | yes | yes | no | no |
| element-call | yes | configured/unknown | yes | configured/unknown | yes | yes | no | no |
| frontend | yes | configured/unknown | yes | configured/unknown | yes | yes | no | no |
| health-dashboard | no | empty/partial | no | configured/unknown | yes | yes | no | no |
| keycloak | no | empty/partial | no | configured/unknown | no | no | yes | yes |
| livekit | no | empty/partial | no | configured/unknown | yes | yes | no | no |
| mariadb | yes | configured/unknown | yes | configured/unknown | no | no | yes | no |
| matrix-synapse | yes | configured/unknown | yes | configured/unknown | no | yes | no | no |
| mongodb | yes | configured/unknown | no | configured/unknown | no | no | no | no |
| otel-collector | yes | configured/unknown | no | configured/unknown | no | no | no | no |
| rabbitmq | yes | configured/unknown | no | configured/unknown | no | no | yes | no |
| redis | yes | configured/unknown | yes | configured/unknown | no | no | yes | no |
| redis-commander | yes | configured/unknown | yes | configured/unknown | no | yes | yes | no |
| redis-exporter | yes | configured/unknown | no | configured/unknown | no | yes | yes | no |
| service-health-exporter | yes | configured/unknown | no | configured/unknown | no | no | no | no |
| signoz | yes | configured/unknown | yes | configured/unknown | no | no | yes | no |
| status-page | no | empty/partial | no | configured/unknown | yes | no | no | no |
| storybook | yes | configured/unknown | yes | configured/unknown | yes | yes | no | no |
| tenantservice | yes | empty/partial | no | empty/partial | yes | yes | yes | no |
| userservice | yes | empty/partial | no | empty/partial | yes | yes | yes | no |

## Architecture Summary

The deployment topology is chart-based. Infrastructure charts provide MariaDB, MongoDB, Redis, RabbitMQ, Matrix and observability. IAM is Keycloak. Backend charts deploy TenantService, UserService, AgencyService and ConsultingTypeService. Frontend/Admin charts expose browser UIs. ingress/*.yaml maps public hostnames to service backends.

## Local Development Notes

- Use helm/oriso-platform/values-local-macos.example.yaml for local overrides.
- Deploy dependencies before backend and UI charts.

## Deployment Notes

- helm/oriso-platform umbrella chart plus ingress/*.yaml routing.

## Risks and Gaps

- HPA manifests found: no.
- NetworkPolicy manifests found: no.
- PodDisruptionBudget manifests found: no.
- Several charts use latest tags or pullPolicy Never.
- Keycloak chart values indicate hostNetwork true.
- Secret-like values appear in values files and need production secret handling.
- UploadService and Rocket.Chat ingress backends are present, but their repositories are not in this analysis set.

## Needs Verification

- Active staging/production values and rendered manifests.
- CI/CD deployment process because no pipeline ownership is represented here.
- Whether local-path storage is acceptable outside local environments.
