---
title: "Install and run locally"
description: "The one entry point for a new developer — prerequisites, repositories, and the first command that actually starts something, for frontend, admin and backend work."
source: "docs/platform/install-and-run-locally.md"
---

Start here. This page gets you from an empty machine to a running piece of ORISO.
It has three tracks; pick the one that matches your first ticket and ignore the others
until you need them.

Runtime requirements below come from the service and UI sources on `dev`. The local
runner update is tracked in [ORISO-Docs issue 48](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/48)
and [PR 142](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/142).
The local API/Admin baseline was checked on 2026-10-01 with runner revision
[`bd6250215d6f`](https://github.com/OpenResilienceInitiative/ORISO-Docs/tree/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0).
The [verification receipt](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/verification/2026-10-01-reviewed-baseline.json)
records the exact service/UI commits and the scope of the check. Use those commits
to reproduce that run; a newer `dev` checkout can differ. Source checks, local
execution and a published release are separate evidence.

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
| Python | 3.10 or later | the local runner |
| Docker with Compose | Compose v2 | bundled local databases, cache, queue and Keycloak |
| Git, curl | any | clone and health checks |

`nvm use` picks up `.nvmrc` in both UI repositories. For the JDK, any distribution of
21 works; select the same JDK through `JAVA_HOME` and `PATH`. The runner reads the
selected services' `pom.xml` and UIs' `package.json` and rejects runtime mismatches.

## Get the repositories

Service and UI repositories must be **siblings inside one workspace folder**.
Git worktrees are supported. The runner may live in a separate selected Docs
checkout or worktree; set its path and the source workspace separately below.
The bundled local baseline does not require ORISO-Database, ORISO-Keycloak or
Deployment checkouts. ORISO-Frontend is required only when selected.

Clone the service sources from `dev`. Until PR 142 is merged, select the checked
Docs runner revision explicitly instead of assuming the default Docs branch
contains it. The receipt records the service revisions used for the local check.

```bash
mkdir ORISO && cd ORISO

git clone https://github.com/OpenResilienceInitiative/ORISO-Docs.git
git -C ORISO-Docs checkout --detach bd6250215d6f4dbcb3d68a056a88f06a2277d0b0
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-UserService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-TenantService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-AgencyService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-Admin.git
git clone --branch dev https://github.com/OpenResilienceInitiative/ORISO-Frontend.git
```

Which repository owns what is listed in the [repository map](/en/plattform/flows-und-reference/repository-map).

## Track A: frontend

```bash
cd ORISO-Frontend
nvm use            # 22.12.0
npm ci
cp .env.example .env
npm run dev        # dev server
```

`npm run dev` runs [`scripts/start.js`](https://github.com/OpenResilienceInitiative/ORISO-Frontend/blob/dev/package.json#L231);
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
component tests in CI, run `npm run test:storybook` to verify the stories. Rendering alone is not test evidence.

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

The services build with Maven wrapper and JDK 21. For local development, prefer the
managed runner below: it supplies local infrastructure and the service environment.
The runner selects the `dev` Spring profile and `dev,seed` Liquibase contexts.
There is no common supported `local` profile across all four services.

The following manual example is only for an already configured local service.
First start its dependencies and explicitly supply loopback database, authentication
and peer-service endpoints, fixture credentials, required callback URLs and
technical-client settings. The `dev` profile name does not mean that shared Dev
resources should be used. The command alone does not provide this configuration
or establish successful startup:

```bash
cd ORISO-AgencyService
SPRING_LIQUIBASE_CONTEXTS=dev,seed ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests
```

The wrapper command has the same shape for `ORISO-UserService`, `ORISO-TenantService`
and `ORISO-ConsultingTypeService`, but each needs its own complete local environment.
This table summarizes dependencies; it is not a complete startup configuration:

| Service | Needs | Contract |
| --- | --- | --- |
| [UserService](https://github.com/OpenResilienceInitiative/ORISO-UserService) | MariaDB `userservice`, Keycloak, peer service URLs; Matrix/Redis/RabbitMQ depending on profile | [`api/userservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/userservice.yaml), [`api/useradminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/api/useradminservice.yaml) |
| [AgencyService](https://github.com/OpenResilienceInitiative/ORISO-AgencyService) | MariaDB `agencyservice`, Keycloak, TenantService | [`api/agencyservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyservice.yaml), [`api/agencyadminservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/dev/api/agencyadminservice.yaml) |
| [TenantService](https://github.com/OpenResilienceInitiative/ORISO-TenantService) | MariaDB `tenantservice`, Keycloak, ConsultingType/ApplicationSettings/UserAdmin APIs | [`api/tenantservice.yaml`](https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/dev/api/tenantservice.yaml) |
| [ConsultingTypeService](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService) | MongoDB consulting/application collections, MariaDB `consultingtypeservice`, Keycloak, TenantService | [`api/consultingtypeservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/consultingtypeservice.yml), [`api/topicservice.yml`](https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/dev/api/topicservice.yml) |

Read the contract first, the controller second. That order saves an hour per endpoint —
see [backend services](/en/plattform/core-systems/backend-services).

For a managed local baseline, use the runner below to start the local dependencies
and selected services together. Service schemas and development seeds come from
each service's current Liquibase master with the `dev,seed` contexts. Do not apply
copied ORISO-Database SQL or ad-hoc schema repairs to make a service start.

## The full local stack

The runner contract covers the local API/Admin baseline: four Java services, Admin,
a loopback gateway, MariaDB, MongoDB, Redis, RabbitMQ, stock local Keycloak and a
local Mailpit SMTP catcher.
Infrastructure comes from bundled local fixtures with synthetic credentials and
published ports bound to loopback. Use disposable checkouts and data for the first
validation. Chat, calls, outbound mail and custom ORISO Keycloak SPI registration
or recovery flows are outside this baseline.

Replace both example paths. The workspace selects service sources; the runner path
selects the Docs revision being tested. They can be different directories.

```bash
export ORISO_WORKSPACE_ROOT="/path/to/ORISO"
export ORISO_LOCAL_RUNNER="/path/to/selected/ORISO-Docs/services-local-setup/run-oriso-local.sh"
"$ORISO_LOCAL_RUNNER" doctor --json
```

Doctor is read-only: it reports source commits, branches, selected tools and ports,
and supported capabilities. Exit 1 means resolve the listed prerequisite before
starting. It does not install dependencies, print credentials or stop unknown port
listeners. Default selection is all four backends plus Admin; select `--ui frontend`,
`--ui both`, `--ui none` or a backend subset with `--services "userservice tenantservice"`.

```bash
"$ORISO_LOCAL_RUNNER" start all
"$ORISO_LOCAL_RUNNER" status
"$ORISO_LOCAL_RUNNER" logs tenantservice
"$ORISO_LOCAL_RUNNER" stop all
```

Start may install missing UI dependencies, build services and create owned runtime
files and local database volumes. Its readiness contract requires selected
application health and local OIDC metadata; a listening port alone is insufficient.
`start infra` checks infrastructure only. `stop all` stops owned process groups and
Compose containers while preserving named volumes and unrelated resources. Plain
`stop` leaves infrastructure running. Never delete volumes to repair an unexplained
migration failure; retain the failing log and source revision first.

Default URLs are Admin `http://localhost:9000`, gateway `http://localhost:8088`,
and local auth `http://localhost:8080`; selected Frontend uses port `9002`. The
synthetic local realm is for development, not real operator identities. Record
doctor JSON, source commits, health responses and the browser journey under test.
Local SMTP capture uses `127.0.0.1:1025`; captured test mail is visible in the
Mailpit inbox at `http://localhost:8025`. Mailpit has no outbound relay configured.
This local capture capability does not verify a platform mail journey or external
delivery; actual platform and outbound mail remain unverified.
Service app-link origins use the real local HTTPS edge `https://localhost:9443`.
Its certificate remains in the owned runtime directory; readiness verifies it
explicitly without changing system or browser trust. With Frontend absent, app
routes return 503. Optional HTTPS Frontend proxying is not a tested browser/API/auth
or DPA journey. Admin browser checks use the actual local HTTP entry point.
OpenSSL is required to create the local certificate. Do not bypass a browser
certificate warning to claim acceptance.

The isolated local check in the receipt returned `UP` for all four service health
endpoints. Admin served its login page with Username, Password and Sign in;
no login was submitted. The check verified the HTTPS edge certificate, local
OIDC metadata and the fixture technical JWT subject/role, and accepted a test
message with Mailpit inbox readback. Owned teardown freed all 14 selected ports,
kept five named volumes and left pre-existing Element Call containers unchanged.
This verifies the API/Admin baseline and local SMTP capture. Platform mail,
outbound delivery, DPA signing, custom Keycloak SPI, chat/calls, Dev deployment and
public release verification remain open. An Admin login page is not an accepted
authenticated browser journey.

Local mode uses bundled authentication. Hybrid mode requires `--hybrid` and an
explicit approved `ORISO_DEV_KEYCLOAK_URL`; it uses external authentication without
provisioning it. Supply remote credentials through the approved local secret
mechanism. Local fixture credentials are never sent to remote auth. Success in
local mode does not establish hybrid readiness.

The runner uses each selected repository's checked-out source and never switches
branches or pulls. Source revision, review, merge, deployment and release readback
remain separate. The complete port options, failure procedure and verification
boundaries are in the
[local development runbook](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/ORISO-local-development-runbook.md).
See the [English quick start](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/README.md)
and [`run-oriso-local.sh`](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/bd6250215d6f4dbcb3d68a056a88f06a2277d0b0/services-local-setup/run-oriso-local.sh)
at the checked revision linked from [PR 142](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/142).

## Where to go next

1. [Architecture](/en/plattform/start-here/architecture) — the service landscape and who calls whom.
2. [Authentication and Keycloak](/en/plattform/core-systems/authentication-and-keycloak) — before you touch
   login, roles or tokens.
3. [Backend services](/en/plattform/core-systems/backend-services) — to find the service that owns your change.
4. [Database and data model](/en/plattform/core-systems/database-and-data-model) — before you change persistence.
5. [How we keep the docs honest](/en/plattform/knowledge-graphs/understand-anything) — the code graphs behind these
   pages, and the dashboards you can query yourself.
