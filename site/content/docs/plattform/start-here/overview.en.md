---
title: "Platform overview"
description: "The developer entry point — install, understand the architecture, find the owning service, open the code."
source: "docs/platform/overview.md"
---

Developer documentation for the ORISO platform: seventeen repositories, two React
applications, four Spring Boot services, Keycloak, Matrix and one Helm chart.

The pages here are written against the code on `dev`. Anything that names a file links
into the repository, in a new tab, at the path — and where it matters, the lines — that
make the claim true.

## The path through this section

1. **[Install and run locally](/en/plattform/start-here/install-and-run-locally)** — prerequisites, the
   repositories, and the first command that starts something. Three tracks: frontend,
   admin, backend.
2. **[Architecture](/en/plattform/start-here/architecture)** — the service landscape, who calls whom, and a
   table of "I want to change X, open Y".
3. **Find the owner** — [backend services](/en/plattform/core-systems/backend-services) for the APIs,
   [frontend and admin](/en/plattform/core-systems/frontend-admin-overview) for the UIs,
   [database and data model](/en/plattform/core-systems/database-and-data-model) for the tables.
4. **Open the code** — every service section links straight into `dev`.

## Core systems

| Page | Read it before you… |
| --- | --- |
| [Authentication and Keycloak](/en/plattform/core-systems/authentication-and-keycloak) | touch login, roles, tokens or tenant resolution |
| [Database and data model](/en/plattform/core-systems/database-and-data-model) | change persistence or add a column |
| [Backend services](/en/plattform/core-systems/backend-services) | change an endpoint or its contract |
| [Frontend and Admin](/en/plattform/core-systems/frontend-admin-overview) | change a screen or an API client |
| [Kubernetes deployment](/en/plattform/core-systems/kubernetes-deployment) | change routing, hostnames, secrets or resources |

## Flows

| Page | Covers |
| --- | --- |
| [Tenant lifecycle](/en/plattform/flows-und-reference/tenant-lifecycle) | how a tenant is created and resolved |
| [Repository map](/en/plattform/flows-und-reference/repository-map) | which repository owns which concern |
| [Troubleshooting](/en/plattform/flows-und-reference/troubleshooting) | where to look first, per symptom |

## How these pages stay true

The structure behind them is a knowledge graph rebuilt from the code, and every link on
the site is verified offline against the repository checkouts before release.
[How we keep the docs honest](/en/plattform/knowledge-graphs/understand-anything) explains the mechanism and the
public dashboards at [understand.oriso.org](https://understand.oriso.org/).

Decisions — as opposed to facts — live in the
[architecture decision records](/en/decisions). When a page says "this is how it is", the
ADR says why.

## Scope

These pages describe what is **built**: repositories, services, contracts, routing and
data ownership. Deployment and operations for a self-hosted installation start at the
[platform setup overview](/en/betrieb/getting-started/overview); the product behaviour is
described in the [product overview](/en/produkt/overview/overview).
