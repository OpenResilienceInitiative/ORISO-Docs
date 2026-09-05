---
title: Install and run locally
description: The one entry point for a new developer — prerequisites, repositories, and the first command that actually starts something, for frontend, admin and backend work.
---
Start here. This page gets you from an empty machine to a running piece of ORISO.
It has three tracks; pick the one that matches your first ticket and ignore the others
until you need them.

Every version and command below is taken from the repositories themselves — the links
open the exact file on `dev` in a new tab.

## Choose your track

| You are working on | Track | You need |
| --- | --- | --- |
| The counselling app UI | [Frontend](#track-a-frontend) | Node only, or Node plus a backend to talk to |
| The admin panel UI | [Admin](#track-b-admin-panel) | Node, plus backends (locally or the shared dev environment) |
| A Spring Boot service | [Backend](#track-c-a-backend-service) | JDK, Docker, databases, Keycloak |
| The whole stack at once | [Full local stack](#the-full-local-stack) | All of the above |

## Prerequisites

| Tool | Version | Where the version comes from |
| --- | --- | --- |
| Node.js | 22.12.0 | [`ORISO-Frontend/.nvmrc`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/.nvmrc) and [`ORISO-Admin/.nvmrc`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/.nvmrc) |
| npm engine range | `>=22 <23` (frontend), `^22.12.0` (admin) | [`ORISO-Frontend/package.json#L11-L13`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/package.json#L11-L13), [`ORISO-Admin/package.json#L6-L8`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/package.json#L6-L8) |
| JDK | 21 | [`ORISO-UserService/pom.xml#L28`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/pom.xml#L28), [`ORISO-AgencyService/pom.xml#L29`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/pom.xml#L29), [`ORISO-TenantService/pom.xml#L30`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/pom.xml#L30), [`ORISO-ConsultingTypeService/pom.xml#L31`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/pom.xml#L31) |
| Maven | not installed separately — every service ships `./mvnw` | the service repositories |
| Docker with Compose | any current release | databases, cache, queue, local Keycloak |
| Git, curl | any | clone and health checks |

`nvm use` picks up `.nvmrc` in both UI repositories. For the JDK, any distribution of
21 works; SDKMAN is convenient if you also keep older JDKs around.

## Get the repositories

All repositories must be **siblings inside one workspace folder** — the local runner and
several scripts resolve paths from that layout.

```bash
mkdir ORISO && cd ORISO

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

Which repository owns what is listed in the [repository map](/plattform/flows-und-reference/repository-map).

## Track A: frontend

```bash
cd ORISO-Frontend
nvm use            # 22.12.0
npm ci
cp .env.example .env
npm run dev        # dev server
```

`npm run dev` runs [`scripts/start.js`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/package.json#L14-L16);
`npm start` instead serves the built app through the proxy in `proxy/server.js`.
The API host, Matrix URL, cookie names, LiveKit and legal URLs all come from
[`.env.example`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/.env.example) —
copy it and point `REACT_APP_API_URL` at either your local gateway or the shared dev API.

Component work does not need a backend at all:

```bash
npm run storybook          # http://localhost:6006
npm run test:storybook     # the same stories as CI component tests
npm run test:unit
```

Storybook is the fastest loop for anything visual, and its stories are executed as
component tests in CI, so a story that renders is a test that passes.

## Track B: admin panel

```bash
cd ORISO-Admin
nvm use            # 22.12.0
npm ci --legacy-peer-deps
cp .env.example .env
npm start          # Vite, http://localhost:9000/admin
```

`npm start` runs `prestart` first, which writes the runtime configuration file consumed
by the app at boot —
[`scripts/generate-runtime-env.js`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/scripts/generate-runtime-env.js).
That generated file wins over `.env` at runtime, so if a setting looks ignored, check it
first. Dev-server behaviour and proxying live in
[`vite.config.ts`](https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/dev/vite.config.ts).

Same as the frontend, the UI-only loop needs no backend:

```bash
npm run storybook
npm run test:storybook
npm run lint
```

## Track C: a backend service

Each of the four services is an ordinary Spring Boot application built with Maven
wrapper and JDK 21:

```bash
cd ORISO-AgencyService
./mvnw spring-boot:run -Dspring-boot.run.profiles=local -DskipTests
```

The same shape works for `ORISO-UserService`, `ORISO-TenantService` and
`ORISO-ConsultingTypeService`. What each one additionally needs before it will start:

| Service | Needs | Contract |
| --- | --- | --- |
| [UserService](https://github.com/OpenResilienceInitiative/ORISO-UserService) | MariaDB `userservice`, Keycloak, peer service URLs; Matrix/Redis/RabbitMQ depending on profile | [`api/userservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/userservice.yaml), [`api/useradminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/useradminservice.yaml) |
| [AgencyService](https://github.com/OpenResilienceInitiative/ORISO-AgencyService) | MariaDB `agencyservice`, Keycloak, TenantService | [`api/agencyservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyservice.yaml), [`api/agencyadminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyadminservice.yaml) |
| [TenantService](https://github.com/OpenResilienceInitiative/ORISO-TenantService) | MariaDB `tenantservice`, Keycloak, ConsultingType/ApplicationSettings/UserAdmin APIs | [`api/tenantservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/api/tenantservice.yaml) |
| [ConsultingTypeService](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService) | MongoDB consulting/application collections, MariaDB `consultingtypeservice`, Keycloak, TenantService | [`api/consultingtypeservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/consultingtypeservice.yml), [`api/topicservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/topicservice.yml) |

Read the contract first, the controller second. That order saves an hour per endpoint —
see [backend services](/plattform/core-systems/backend-services).

Start order when you run several at once: TenantService, ConsultingTypeService,
AgencyService, UserService. Everything depends on Keycloak and its database being up
first.

## The full local stack

`ORISO-Docs` ships a runner that starts Docker infrastructure, initialises the databases,
runs a local API gateway and starts the services and a UI:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh check
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --ui admin
./ORISO-Docs/services-local-setup/run-oriso-local.sh status
./ORISO-Docs/services-local-setup/run-oriso-local.sh logs -f userservice
./ORISO-Docs/services-local-setup/run-oriso-local.sh stop
```

Hybrid mode runs the ORISO services locally but authenticates against the shared dev
Keycloak, so you skip the realm import entirely — the usual choice for admin and
backend work:

```bash
./ORISO-Docs/services-local-setup/run-oriso-local.sh start --hybrid --ui admin
```

Default ports: gateway `8088`, admin `9000`, frontend `9002`.

The runner is a work in progress and always uses whichever branch each repository has
checked out — it never switches or pulls. The full option list, the environment
variables and the known gaps are in the
[local development runbook](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/services-local-setup/ORISO-local-development-runbook.md),
the script itself is
[`run-oriso-local.sh`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/services-local-setup/run-oriso-local.sh).

Two places in that runbook have drifted from the code and are worth knowing before you
follow it literally:

- it asks for JDK 11 and 17, but all four services target **JDK 21** today (see the
  prerequisites table above);
- its default Node path for the frontend points at an 18.x install, while `.nvmrc` says
  22.12.0 — use `nvm use`.

## Where to go next

1. [Architecture](/plattform/start-here/architecture) — the service landscape and who calls whom.
2. [Authentication and Keycloak](/plattform/core-systems/authentication-and-keycloak) — before you touch
   login, roles or tokens.
3. [Backend services](/plattform/core-systems/backend-services) — to find the service that owns your change.
4. [Database and data model](/plattform/core-systems/database-and-data-model) — before you change persistence.
5. [How we keep the docs honest](/plattform/knowledge-graphs/understand-anything) — the code graphs behind these
   pages, and the dashboards you can query yourself.
