---
title: Platform overview
description: The developer entry point — install, understand the architecture, find the owning service, open the code.
---

# Platform overview

Developer documentation for the ORISO platform: seventeen repositories, two React
applications, four Spring Boot services, Keycloak, Matrix and one Helm chart.

The pages here are written against the code on `dev`. Anything that names a file links
into the repository, in a new tab, at the path — and where it matters, the lines — that
make the claim true.

## The path through this section

1. **[Install and run locally](./install-and-run-locally.md)** — prerequisites, the
   repositories, and the first command that starts something. Three tracks: frontend,
   admin, backend.
2. **[Architecture](./architecture.md)** — the service landscape, who calls whom, and a
   table of "I want to change X, open Y".
3. **Find the owner** — [backend services](./backend-services.md) for the APIs,
   [frontend and admin](./frontend-admin-overview.md) for the UIs,
   [database and data model](./database-and-data-model.md) for the tables.
4. **Open the code** — every service section links straight into `dev`.

## Core systems

| Page | Read it before you… |
| --- | --- |
| [Authentication and Keycloak](./authentication-and-keycloak.md) | touch login, roles, tokens or tenant resolution |
| [Database and data model](./database-and-data-model.md) | change persistence or add a column |
| [Backend services](./backend-services.md) | change an endpoint or its contract |
| [Frontend and Admin](./frontend-admin-overview.md) | change a screen or an API client |
| [Kubernetes deployment](./kubernetes-deployment.md) | change routing, hostnames, secrets or resources |

## Flows

| Page | Covers |
| --- | --- |
| [Tenant lifecycle](./tenant-lifecycle.md) | how a tenant is created and resolved |
| [Repository map](./repository-map.md) | which repository owns which concern |
| [Troubleshooting](./troubleshooting.md) | where to look first, per symptom |

## How these pages stay true

The structure behind them is a knowledge graph rebuilt from the code, and every link on
the site is verified offline against the repository checkouts before release.
[How we keep the docs honest](./understand-anything.md) explains the mechanism and the
public dashboards at [understand.oriso.org](https://understand.oriso.org/).

Decisions — as opposed to facts — live in the
[architecture decision records](/decisions). When a page says "this is how it is", the
ADR says why.

## Scope

These pages describe what is **built**: repositories, services, contracts, routing and
data ownership. Deployment and operations for a self-hosted installation start at the
[platform setup overview](../../oriso-platform/overview.mdx); the product behaviour is
described in the [product overview](../../product/overview.mdx).
