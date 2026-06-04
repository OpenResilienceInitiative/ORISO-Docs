# ORISO Local Development Runbook

Last updated: 2026-06-04

This document is the general local-development setup for ORISO. It is not tied to MT-04; use it for any backend or Admin development task that needs the local ORISO stack.

## Current Status

This local-development runner is **not completed yet**. It is being updated as the team discovers missing local-development requirements.

Use it as a shared baseline:

- It should run the local Docker infra, backend services, Admin UI, and optionally ORISO-Frontend.
- It always uses the branch currently checked out in each local repo.
- It does not switch branches and does not pull latest code.
- If a peer finds a missing env var, tool, schema patch, port mapping, or setup step, update this folder so the next developer benefits.

Known current limitations:

- Local Keycloak still needs the `online-beratung` realm imported before auth-dependent flows work.
- Rocket.Chat, Matrix, and LiveKit are not fully provisioned by this runner; the script provides startup-safe defaults for ordinary Admin/backend work.
- First-run Maven/npm/Docker downloads can take several minutes.

## Clone The Workspace

Create one parent workspace folder. All ORISO repos must be sibling directories because the script resolves paths from that layout.

```bash
mkdir ORISO
cd ORISO
```

Clone the required repos in this order:

```bash
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

The runner also expects this local deployment file:

```text
Deployment/local/docker-compose.local.generated.yml
```

If `Deployment` is not available from the organization yet, copy or create the team-provided local deployment folder before running the script.

Expected layout:

```text
ORISO/
  ORISO-Docs/
  Deployment/
  ORISO-Database/
  ORISO-Keycloak/
  ORISO-UserService/
  ORISO-TenantService/
  ORISO-AgencyService/
  ORISO-ConsultingTypeService/
  ORISO-Admin/
  ORISO-Frontend/
```

## Download Before Running

Install these first:

| Required item | Why it is needed | Verify |
|---|---|---|
| Git | Branch/status checks | `git --version` |
| Docker Desktop | MariaDB, MongoDB, Redis, RabbitMQ, local Keycloak, local API gateway | `docker --version` and `docker compose version` |
| Node.js with npm | Admin UI and ORISO-Frontend | `node --version` and `npm --version` |
| Java 11 | Current `UserService` and `ConsultingTypeService` Maven target | `java -version` after selecting Java 11 |
| Java 17 | Current `TenantService` and `AgencyService` Maven target | `java -version` after selecting Java 17 |
| SDKMAN, recommended | Lets the runner switch Java versions | `sdk version` |
| curl | Health checks | `curl --version` |

First run needs internet access for Docker images, Maven dependencies, and npm dependencies. Maven itself does not need separate installation because the services use `./mvnw`.

The script uses local Keycloak. It also provides local boot defaults for MongoDB, Rocket.Chat, Matrix, and identity URLs so the services can start without installing those systems separately. Those defaults are enough for Admin/backend development; they are not a real Rocket.Chat or Matrix environment.

Recommended SDKMAN installs:

```bash
sdk install java 11.0.24-tem
sdk install java 17.0.12-tem
```

## Repo Importance

Required for normal local Admin/backend development:

| Repo | Why it matters |
|---|---|
| `ORISO-Docs` | Contains this runbook and local runner |
| `Deployment` | Provides the local Docker Compose file and gateway target |
| `ORISO-Database` | Provides MariaDB schemas used by `init-db` |
| `ORISO-Keycloak` | Provides `realm.json` for local Keycloak |
| `ORISO-UserService` | Users, sessions, tenant-admin/user-admin APIs |
| `ORISO-TenantService` | Tenant/Tenant-Unit APIs |
| `ORISO-AgencyService` | Agency/place APIs |
| `ORISO-ConsultingTypeService` | Settings and consulting type APIs |
| `ORISO-Admin` | Admin Panel UI |
| `ORISO-Frontend` | Public/client frontend UI |

Optional for specialized work:

| Repo | When needed |
|---|---|
| `ORISO-Matrix` | Matrix/Synapse chat runtime work |
| `ORISO-Livekit` | Video/call runtime work |
| `ORISO-Element`, `ORISO-ElementCall` | Element-based client/call integration |
| `ORISO-Redis` | Redis deployment/config work |
| `ORISO-Status`, `ORISO-HealthDashboard`, `ORISO-SignOZ` | Monitoring/status work |

## Reference Guides

These local setup references were copied from `Deployment/guides` into this folder so peers can work from one place:

- [Keycloak Setup and Operations Guide](./guides/keycloak/KEYCLOAK_SETUP_AND_OPERATIONS_GUIDE.md)
- [Tenant and Multitenancy Guide](./guides/tenant/TENANT_AND_MULTITENANCY_GUIDE.md)

## Main Script

Run from the workspace root:

```bash
cd /path/to/ORISO
./ORISO-Docs/services-local-setup/run-oriso-local.sh check
./ORISO-Docs/services-local-setup/run-oriso-local.sh start
```

Open Admin:

```text
http://localhost:9000/admin
```

Useful commands:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh status
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs tenantservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs agencyservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs consultingtypeservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs frontend
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs -f userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop all
```

The normal `stop` command stops app services and the API gateway, but leaves Docker infra running. `stop all` also stops Docker infra while preserving volumes.

## Run Only What You Need

The runner defaults to:

```text
userservice tenantservice agencyservice consultingtypeservice admin
```

All backend services are started by default because ORISO backend behavior is split across UserService, TenantService, AgencyService, and ConsultingTypeService.

Choose which UI to run with `--ui`:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui frontend
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui both
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui none
```

`--ui admin` is the default. `--ui none` starts backend services only.

Examples:

| Task type | Suggested services |
|---|---|
| Backend-only task | `./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui none` |
| Admin UI task | `./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin` |
| ORISO-Frontend task | `./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui frontend` |
| Admin plus ORISO-Frontend task | `./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui both` |

Advanced: override the exact services only when you intentionally want a smaller custom stack:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --services "userservice tenantservice admin"
```

## Branch Handling

Show current branches and a concise local-change summary:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh branches
```

Run all repos on their current local branches:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
```

The runner does not switch branches and does not pull latest code. This is intentional: if you create a feature branch from `dev` and make local changes, the script runs that exact local branch and prints the branch summary before starting services.

To work on a feature branch, switch it yourself first in the relevant repo, then run the script normally:

```bash
cd ORISO-Admin
git switch -c feature/my-task dev
cd ..
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
```

## Run ORISO-Frontend

First start the local backend stack with the frontend selected:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui frontend
```

Open:

```text
http://localhost:9002
```

The runner creates `ORISO-Frontend/.env.local` when it does not already exist. The important local values are:

```text
PORT=9002
REACT_APP_API_URL=http://localhost:8088
REACT_APP_AUTH_URL=http://localhost:8080
REACT_APP_MATRIX_HOMESERVER_URL=http://localhost:8008
```

Use `PORT`, not `VITE_PORT`, for the ORISO-Frontend dev server. This app uses the Create React App-style startup script, and browser-exposed variables must be `REACT_APP_*`.

To run Admin and ORISO-Frontend together:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui both
```

Then open:

```text
Admin:          http://localhost:9000/admin
ORISO-Frontend: http://localhost:9002
```

## What The Script Does

`start` performs:

1. Checks required tools and service repo branches.
2. Starts Docker infra from `Deployment/local/docker-compose.local.generated.yml`.
3. Waits for MariaDB, RabbitMQ, and the configured Keycloak URL.
4. Creates local MariaDB databases/users.
5. Imports schemas only when marker tables are missing.
6. Applies idempotent local schema patches required by the current service code, including the UserService invite-link columns from the live changeset.
7. Exports local boot defaults for Keycloak, MongoDB, Rocket.Chat, Matrix, RabbitMQ, and service URLs.
8. Starts a local Nginx API gateway on `localhost:8088`.
9. Starts selected Java services, Admin UI, and/or ORISO-Frontend in the background.
10. Writes logs and PID files under `ORISO-Docs/services-local-setup/.local-runtime/`.

## Current Java Targets

These are from the current `dev` POMs:

| Service | Current active Java target |
|---|---:|
| `ORISO-UserService` | Java 11 |
| `ORISO-TenantService` | Java 17 |
| `ORISO-AgencyService` | Java 17 |
| `ORISO-ConsultingTypeService` | Java 11 |

The POMs also contain `java.upper.version=21`, but that is not the active compiler target.

TenantService and AgencyService currently compile Java 17 preview features, so the runner starts them with `--enable-preview` at runtime.

## Keycloak

The script starts local Keycloak on `localhost:8080`.

Open:

```text
http://localhost:8080
admin / local_admin_change_me
```

Import `ORISO-Keycloak/realm.json` into realm `online-beratung`, then create test users with the roles needed for your task.

Common roles:

- `tenant-admin`
- `single-tenant-admin`
- `user-admin`
- `consultant-admin`
- `restricted-agency-admin`

## Logs And Runtime Files

```text
ORISO-Docs/services-local-setup/.local-runtime/logs/
ORISO-Docs/services-local-setup/.local-runtime/pids/
ORISO-Docs/services-local-setup/.local-runtime/nginx.conf
```

Use:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs -f admin
```

`logs <service>` prints the latest log lines and exits. Use `logs -f <service>` only when you want to follow the log until you press `Ctrl-C`.

## Local Boot Defaults

The runner exports these values for backend services:

```text
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
IDENTITY_OPENID_CONNECT_URL=http://localhost:8080/realms/online-beratung/protocol/openid-connect
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/userservice?retryWrites=false
ROCKET_CHAT_BASE_URL=http://localhost:3000
ROCKET_CHAT_MONGO_URL=mongodb://localhost:27017/rocketchat?retryWrites=false
MATRIX_API_URL=http://localhost:8008
MATRIX_SERVER_NAME=localhost
MATRIX_ADMIN_USERNAME=local_matrix_admin
USER_SERVICE_API_URL=http://localhost:8082
USER_ADMIN_SERVICE_API_URL=http://localhost:8082
```

Rocket.Chat and Matrix calls can still warn or fail when a feature directly needs them. For ordinary Admin and user-management development, these defaults satisfy startup validation and keep the services runnable.

## Troubleshooting

If ports are busy:

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(8080|8081|8082|8083|8084|8088|9000|3306|5672|6379|27017)'
```

For the Keycloak port specifically:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep 8080
```

If a stale local Keycloak container owns the port:

```bash
docker rm -f oriso-local-keycloak
```

If Java is wrong, install SDKMAN candidates or override names:

```bash
ORISO_JAVA_11_VERSION=11.0.26-tem ORISO_JAVA_17_VERSION=17.0.14-tem ./ORISO-Docs/services-local-setup/run-oriso-local.sh start
```

If Admin calls the wrong host, check `ORISO-Admin/.env.local`:

```bash
VITE_API_URL=localhost:8088
VITE_USE_API_URL=true
VITE_USE_HTTPS=false
```

If ORISO-Frontend calls the wrong host, check `ORISO-Frontend/.env.local`:

```bash
PORT=9002
REACT_APP_API_URL=http://localhost:8088
REACT_APP_AUTH_URL=http://localhost:8080
```

If the DB is stale, stop first and reset only when you intentionally want to delete local data:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop all
cd Deployment/local
docker compose -f docker-compose.local.generated.yml down -v
```

If UserService fails with a missing `agency_invite_link` column such as `anonymity`, rerun:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh init-db
```

The runner applies the current local UserService invite-link schema patch even when the base schema was already imported.
