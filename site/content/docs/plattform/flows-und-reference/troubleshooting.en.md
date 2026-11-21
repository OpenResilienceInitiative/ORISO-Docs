---
title: "ORISO Troubleshooting"
description: "Practical troubleshooting paths from enriched source/config inspection."
source: "docs/platform/troubleshooting.md"
---

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

## Auth Problems

Verify the [public HTTPS issuer](/en/betrieb/deployment/configure-keycloak) and compare the realm, client, redirect URI, backend issuer and role mapping with the selected deployment. Keep tokens and cookies out of diagnostic records.

## API Routing Problems

Compare the frontend and Admin runtime API URLs with the Ingress in the [selected Helm release](/en/plattform/core-systems/kubernetes-deployment) and the owning service’s OpenAPI paths. Check the public hostname and `/service` routes for the affected deployment.

## Database Problems

Check the rendered database Service and the application’s resolved connection settings. Use the [database setup guide](/en/betrieb/deployment/setup-databases) to find the owning changelog, then compare the expected changesets with the deployed schema history.

## Tenant Problems

Check Admin tenant API clients, TenantService TenantController/TenantResolverService, tenantservice.tenant schema, and Keycloak tenant claim assumptions.

## Kubernetes Problems

Check chart values for image tags, pull policies, resources, probes, secret-like values, hostNetwork, namespace and ingress backend service names.
