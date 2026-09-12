---
title: ORISO Troubleshooting
description: Practical troubleshooting paths from enriched source/config inspection.
---
- [Repository map](/plattform/flows-und-reference/repository-map)
- [Architecture](/plattform/start-here/architecture)
- [Authentication and Keycloak](/plattform/core-systems/authentication-and-keycloak)
- [Database and data model](/plattform/core-systems/database-and-data-model)
- [Kubernetes deployment](/plattform/core-systems/kubernetes-deployment)
- [Frontend/Admin overview](/plattform/core-systems/frontend-admin-overview)
- [Backend services](/plattform/core-systems/backend-services)
- [Tenant lifecycle](/plattform/flows-und-reference/tenant-lifecycle)
- [User management flow](/plattform/archive/user-management-flow)
- [Local development](/plattform/archive/local-development)
- [Onboarding guide](/plattform/archive/onboarding-guide)
- [Troubleshooting](/plattform/flows-und-reference/troubleshooting)
- [Graph validation report](/plattform/archive/graph-validation-report)
- [Diagrams](/plattform/flows-und-reference/diagrams)

## Auth Problems

Check Keycloak realm/client config, browser token cookies/local storage, backend issuer/JWK config, role mappers, and tenant claim behavior.

## API Routing Problems

Check frontend/admin runtime API URL, ORISO-Kubernetes ingress host/path rules, and backend OpenAPI paths. API host routes are concentrated under api.oriso-dev.site in inspected ingress files.

## Database Problems

Check ORISO-Database schema exports, service application*.properties DB keys, and Kubernetes values for DB host/password/secret handling. Verify live schema before changing service code.

## Tenant Problems

Check Admin tenant API clients, TenantService TenantController/TenantResolverService, tenantservice.tenant schema, and Keycloak tenant claim assumptions.

## Kubernetes Problems

Check chart values for image tags, pull policies, resources, probes, secret-like values, hostNetwork, namespace and ingress backend service names.
