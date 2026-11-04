# ADR-011: Helm-only deployment; single-domain path-based routing supersedes per-service subdomains (/decisions/adr-011)



* **Status:** Accepted — already implemented and live on Pre-Dev.
* **Date:** 2026-07-07
* **Deciders:** Jonas Rogg / ops, announced team-wide at Jour-Fix 2026-06-30
* **Related:** [ADR-005](/decisions/adr-005) (Matrix keeps its own subdomain — the one deliberate exception to this decision)

***

## Context [#context]

ORISO originally deployed via **ORISO-Kubernetes**: raw `kubectl` + Helm sub-charts, with one subdomain per surface — `app.`, `admin.`, `api.`, `auth.`, `matrix.<domain>` (still documented in that repo's README "Access URLs" section).

Since the 2026-06-30 Jour-Fix announcement, **ORISO-Helm** is the canonical repo for all deployment, Helm charts, schemas, Keycloak, Redis, and Matrix infra changes. Its current chart already implements a different shape: `main-ingress.yaml` routes everything through **one host** (`global.domainName`) with path rules — `/` → frontend, `/admin` → Admin Panel, `/service/*` → backend APIs, `/auth` → Keycloak, `/room` → Element Call. This is not a future plan; it is already live on Pre-Dev and is the target shape for the final managed cluster on Gridscale.

ORISO has **no live production users** — it's a pre-launch rebuild of an older web portal, and go-live means fresh user onboarding, not a migration of live traffic. So there is no cutover risk forcing this decision, but the routing shape is still hard to change once real integrations (CORS allowlists, cookie domains, embedded links, TLS certs) depend on it.

## Decision [#decision]

**ORISO-Helm, not ORISO-Kubernetes, is the single canonical definition of ORISO's deployment topology.** Every environment — including the final Gridscale-managed cluster — converges on one public domain with path-based routing, replacing the one-subdomain-per-service scheme. Matrix is the sole intentional exception and keeps its own subdomain (federation/homeserver constraints, see [ADR-005](/decisions/adr-005)).

## Decision drivers [#decision-drivers]

* One TLS certificate / one cert-manager `Issuer` instead of one per subdomain.
* No cross-origin requests between app, admin, and services — the CORS and cookie/session-domain complexity a subdomain split creates simply doesn't exist.
* Matches how the operator (Neusta) will actually run the final cluster: one ingress, one DNS record.

## Considered options [#considered-options]

* **Keep per-service subdomains** (status quo in ORISO-Kubernetes). Rejected: needs a wildcard or N certs, and cookies still end up scoped to the parent domain anyway — the isolation subdomains promise was never really realized.
* **Hybrid** (merge app+admin, leave API/auth on subdomains). Rejected: once the CORS/cookie work is done for the merge, there's no remaining benefit to keeping any legacy subdomains — it would just perpetuate ORISO-Kubernetes as a second source of truth.

## Consequences [#consequences]

* ORISO-Kubernetes's README (subdomain "Access URLs") is now **historical, not current** — anyone landing there for routing/ingress work should be redirected to ORISO-Helm.
* ORISO-Kubernetes **cannot simply be archived**: its `.github/workflows/build-and-push.yml` is still the actual CI pipeline building and pushing every service's container image to `ghcr.io`. Until that workflow moves (into ORISO-Helm or a dedicated CI location), the repo stays alive — and PRs opened against it go nowhere in practice, confirmed by Jonas Rogg in `#oriso-dev-team`, 2026-07-07 (re: PR #84), even though the repo itself isn't marked archived on GitHub.
* A pointer to this ADR was added to the top of `ORISO-Kubernetes/README.md` so the next person who lands there (as PR #84's author did) sees the redirect and the CI caveat immediately, instead of the question recurring in Slack.

## Status & progress (2026-07-07) [#status--progress-2026-07-07]

* Routing shape already implemented and live on Pre-Dev via `ORISO-Helm/templates/nginx/main-ingress.yaml`.
* No live-migration cutover exists or is planned — the final target is simply a fresh launch on the Gridscale-managed cluster on this same scheme.
* Open blocker to archiving ORISO-Kubernetes: move `build-and-push.yml` off that repo.
