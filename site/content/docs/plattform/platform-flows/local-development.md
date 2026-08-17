---
title: Local Development
description: Practical local startup order based on inspected repository dependencies.
---

# Local Development

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

- Use helm/oriso-platform/values-local-macos.example.yaml for local overrides.
- Deploy dependencies before backend and UI charts.

## Rule

Run the smallest useful slice locally first. Use Kubernetes after the service and UI behavior is already clear, or when the bug is specifically about ingress, DNS, values, secrets, probes, or cluster networking.
