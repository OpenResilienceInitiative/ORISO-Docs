---
title: Local Development
description: Practical local startup order based on inspected repository dependencies.
---

# Local Development

> **Active local development entry.** Start with [Install and run locally](./install-and-run-locally.md) for supported tooling and the local runner, then use this page for repository dependencies and startup order. These are source-derived instructions; check the supported runner before applying a manual setup.
- [Repository map](./repository-map.md)
- [Architecture](./architecture.md)
- [Authentication and Keycloak](./authentication-and-keycloak.md)
- [Database and data model](./database-and-data-model.md)
- [Kubernetes deployment](/docs/platform/kubernetes-deployment)
- [Frontend/Admin overview](./frontend-admin-overview.md)
- [Backend services](./backend-services.md)
- [Tenant lifecycle](./tenant-lifecycle.md)
- [User management flow](./user-management-flow.md)
- [Local development](./local-development.md)
- [Onboarding guide](./onboarding-guide.md)
- [Troubleshooting](./troubleshooting.md)
- [Graph validation report](./graph-validation-report.md)
- [Diagrams](./diagrams.md)

## Startup Order

1. Data stores for the chosen local environment. [Set up databases](/oriso-platform/setup-databases)
2. Keycloak with the realm configuration for the chosen local environment. [Configure Keycloak](/oriso-platform/configure-keycloak)
3. TenantService.
4. ConsultingTypeService.
5. AgencyService.
6. UserService.
7. ORISO-Frontend and ORISO-Admin.
8. ORISO-Helm when testing chart, ingress or runtime wiring. [Kubernetes deployment](/docs/platform/kubernetes-deployment)

## Repo Local Notes

### ORISO-Frontend

- npm install
- npm run start or npm run dev
- Use .env or .env.example for API, Matrix, cookie, LiveKit and legal URL settings.

### ORISO-Admin

- npm install --legacy-peer-deps
- npm run start
- Use .env or .env.example for VITE_API_URL, Keycloak realm/client, cookie, Matrix and app URLs.

### ORISO-UserService

- ./mvnw spring-boot:run with the intended Spring profile
- Requires MariaDB userservice schema, Keycloak, and configured peer service URLs; Matrix/Redis/RabbitMQ depending on profile.

### ORISO-AgencyService

- ./mvnw spring-boot:run with a local profile
- Requires MariaDB agencyservice schema, Keycloak, TenantService, ConsultingType/Topic/ApplicationSettings/UserAdmin peer APIs as configured.

### ORISO-ConsultingTypeService

- ./mvnw spring-boot:run with a local profile
- Requires MongoDB consulting/application collections, MariaDB consultingtypeservice schema, Keycloak, and TenantService URL.

### ORISO-TenantService

- ./mvnw spring-boot:run with a local profile
- Requires MariaDB tenantservice schema, Keycloak, and configured ConsultingType/ApplicationSettings/UserAdmin/AgencyAdmin APIs.

### Data stores, Keycloak and Helm

- Start dependencies before the backend and UI in the chosen local environment. The installation guide covers the supported local verification path. [Install and run locally](/docs/platform/install-and-run-locally)
- The database guide identifies SQL initialisation and the owning service migrations. [Set up databases](/oriso-platform/setup-databases)
- Check Keycloak’s redirect URIs and the issuer for the chosen environment. [Configure Keycloak](/oriso-platform/configure-keycloak)
- Use the current ORISO-Helm chart when testing Kubernetes configuration. [Kubernetes deployment](/docs/platform/kubernetes-deployment)

## Rule

Run the smallest useful slice locally first. Use Kubernetes after the service and UI behavior is already clear, or when the bug is specifically about ingress, DNS, values, secrets, probes, or cluster networking.
