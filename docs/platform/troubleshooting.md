---
title: ORISO Troubleshooting
description: Practical troubleshooting paths from enriched source/config inspection.
---

# ORISO Troubleshooting
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

Verify the [public HTTPS issuer](/oriso-platform/configure-keycloak) and compare the realm, client, redirect URI, backend issuer and role mapping with the selected deployment. Keep tokens and cookies out of diagnostic records.

## API Routing Problems

Compare the frontend and Admin runtime API URLs with the Ingress in the [selected Helm release](/docs/platform/kubernetes-deployment) and the owning service’s OpenAPI paths. Check the public hostname and `/service` routes for the affected deployment.

## Database Problems

Check the rendered database Service and the application’s resolved connection settings. Use the [database setup guide](/oriso-platform/setup-databases) to find the owning changelog, then compare the expected changesets with the deployed schema history.

## Tenant Problems

Check Admin tenant API clients, TenantService TenantController/TenantResolverService, tenantservice.tenant schema, and Keycloak tenant claim assumptions.

## Kubernetes Problems

Check chart values for image tags, pull policies, resources, probes, secret-like values, hostNetwork, namespace and ingress backend service names.
