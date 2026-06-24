---
title: ORISO Troubleshooting
description: Practical troubleshooting paths from enriched source/config inspection.
---

# ORISO Troubleshooting

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
