---
title: "Local Development"
description: "Practical local startup order based on inspected repository dependencies."
source: "docs/platform/local-development.md"
---

> **Active local development entry.** Start with [Install and run locally](/en/plattform/start-here/install-and-run-locally) for supported tooling and the local runner, then use this page for repository dependencies and startup order. These are source-derived instructions; check the supported runner before applying a manual setup.
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

## Startup Order

1. ORISO-Database stores: MariaDB schemas, MongoDB documents, Redis/RabbitMQ if required, Matrix PostgreSQL if running Matrix.
2. ORISO-Keycloak realm.
3. TenantService.
4. ConsultingTypeService.
5. AgencyService.
6. UserService.
7. ORISO-Frontend and ORISO-Admin.
8. ORISO-Kubernetes only when testing chart/ingress/runtime wiring.

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

### ORISO-Database

- Read mariadb/README.md and mongodb/README.md.
- Use scripts/database-initialize.yaml and scripts/system-users-job.yaml for cluster initialization patterns.

### ORISO-Keycloak

- Import realm.json into local Keycloak.
- Verify app/admin redirect URLs and backend issuer/JWK URLs for the local hostnames.

### ORISO-Kubernetes

- The previously referenced `helm/oriso-platform/values-local-macos.example.yaml` is absent from the inspected `dev` tree. Do not use that path. Choose the supported Docker/manual tracks in the local installation guide; a Kubernetes local override needs a separately reviewed configuration.
- Deploy dependencies before backend and UI charts.

## Rule

Run the smallest useful slice locally first. Use Kubernetes after the service and UI behavior is already clear, or when the bug is specifically about ingress, DNS, values, secrets, probes, or cluster networking.
