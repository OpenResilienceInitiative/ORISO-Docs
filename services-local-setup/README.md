# Services Local Setup

This folder contains local-development runbooks and scripts for ORISO service work.

## Status

This local runner is **work in progress**. It is useful for local development, but it is not finished or fully validated for every developer machine yet.

Current expectation for peers:

- Use it as the shared starting point for local setup.
- Run the script from the ORISO workspace root.
- Keep fixes in this folder when a missing env var, tool, port, schema patch, or service dependency is discovered.
- Do not treat the script as final production documentation yet.

## Documents

- [ORISO Local Development Runbook](./ORISO-local-development-runbook.md)

## Copied Reference Guides

These guides were copied from `Deployment/guides` because they are directly relevant to local setup and troubleshooting:

- [Keycloak Setup and Operations Guide](./guides/keycloak/KEYCLOAK_SETUP_AND_OPERATIONS_GUIDE.md)
- [Tenant and Multitenancy Guide](./guides/tenant/TENANT_AND_MULTITENANCY_GUIDE.md)

## Workspace Layout

Create one parent workspace folder and clone the ORISO repos inside it as sibling folders:

```text
ORISO/
  ORISO-Docs/
  ORISO-Admin/
  ORISO-Frontend/
  ORISO-UserService/
  ORISO-TenantService/
  ORISO-AgencyService/
  ORISO-ConsultingTypeService/
  ORISO-Database/
  ORISO-Keycloak/
  Deployment/
```

The script expects this sibling-folder layout.

## Required Tools

Install before running:

- Git
- Docker Desktop with Docker Compose
- Node.js and npm
- Java 11
- Java 17
- SDKMAN, recommended for switching Java versions
- curl

Recommended Java installs:

```bash
sdk install java 11.0.24-tem
sdk install java 17.0.12-tem
```

First run also needs internet access for Docker images, Maven dependencies, and npm packages.

## Clone Order

Start with docs, then infrastructure/schema repos, then backend services, then UI repos:

```bash
mkdir ORISO
cd ORISO

git clone https://github.com/OpenResilienceInitiative/ORISO-Docs.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Database.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Keycloak.git

git clone https://github.com/OpenResilienceInitiative/ORISO-UserService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-TenantService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-AgencyService.git
git clone https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService.git

git clone https://github.com/OpenResilienceInitiative/ORISO-Admin.git
git clone https://github.com/OpenResilienceInitiative/ORISO-Frontend.git
```

The local runner also expects:

```text
Deployment/local/docker-compose.local.generated.yml
```

If `Deployment` is not available from the organization yet, copy or create the local deployment folder used by the team before running the script.

## Important Repos

Required for the current local runner:

- `ORISO-Docs`: this runbook and script
- `Deployment`: local Docker Compose and local gateway config target
- `ORISO-Database`: MariaDB schema imports
- `ORISO-Keycloak`: local realm import source
- `ORISO-UserService`: user/admin APIs
- `ORISO-TenantService`: tenant/unit APIs
- `ORISO-AgencyService`: agency/place APIs
- `ORISO-ConsultingTypeService`: settings and consulting type APIs
- `ORISO-Admin`: Admin Panel UI
- `ORISO-Frontend`: public/client frontend UI

Optional for deeper chat/call/runtime work:

- `ORISO-Matrix`
- `ORISO-Livekit`
- `ORISO-Element`
- `ORISO-ElementCall`
- `ORISO-Redis`
- `ORISO-Status`
- `ORISO-HealthDashboard`
- `ORISO-SignOZ`

## Local Script

- [run-oriso-local.sh](./run-oriso-local.sh)

Quick commands:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh check
./ORISO-Docs/services-local-setup/run-oriso-local.sh branches
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh status
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs -f userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop
```

Run ORISO-Frontend locally:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui frontend
```

Open:

```text
http://localhost:9002
```

Run both Admin and ORISO-Frontend:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui both
```

The script starts Docker infra, initializes local DBs when missing, applies required local schema patches, runs a local API gateway, and starts selected ORISO services in the background. Logs and PID files are written under `ORISO-Docs/services-local-setup/.local-runtime/`.

## Scope

Use the ORISO runbook for general local development. The runner always uses whichever branch is currently checked out in each local repo.
