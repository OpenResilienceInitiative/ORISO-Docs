# Tenant model and multitenancy (ORISO)

This guide explains how **tenants** work across the platform: what they represent, how a request’s tenant is chosen, how that ties to Keycloak and the Tenant Service, and which feature flags change behavior. It is aimed at operators and integrators; implementation details reference the Java services where behavior is defined.

## Product knowledge

This section translates the technical tenant model into **how the product behaves** for admins, consultants, and support—without re-reading Java packages.

### Tenant as the “organisation slice”

- A **tenant** is the top-level boundary for **one customer organisation** (or one branded environment) on a shared platform.
- **Agencies** (“Beratungsstelle” / counseling centers in the admin UI) are created **inside** a tenant and carry a **`tenantId`**. Consultants are assigned to one or more agencies; those agencies must belong to the **same** tenant as the consultant’s account.
- **End-users (askers)** and **consultants** both authenticate through Keycloak; their user profile should carry the same **numeric `tenantId`** as the tenant they belong to, so tokens and backend filters stay aligned.

### Admin vs consultant applications

- **Admin** (`ORISO-Admin`) is used to manage tenants (super admin), agencies, topics, and consultant accounts. Agency and user forms **filter agencies by selected tenant** so you cannot accidentally attach a consultant to another organisation’s agencies.
- **Consultant / end-user app** (`ORISO-Frontend`) performs login against Keycloak; when the tenant service is used and **single-domain multitenancy is off**, the frontend **rejects** login if the **tenant context of the login page** (subdomain / resolved tenant) does **not** match the **`tenantId` claim** in the issued token. Symptom: “unauthorized” even with a correct password—usually **wrong subdomain** or **missing/wrong `tenantId` on the Keycloak user**.

### Typical provisioning order (operators)

1. **Tenant Service** — Ensure the tenant exists (id, name, **subdomain** for hostname-based routing).
2. **Keycloak** — Set user attribute **`tenantId`** to that tenant’s numeric id; assign client scopes so **`tenantId`** appears on access tokens (see **Keycloak configuration** below).
3. **Agencies** — Create counseling centers under that tenant (postcode, city, topics, etc.).
4. **Consultants** — Create users, assign **tenant** and **agencies**; username/password live in Keycloak and must match what the user types at login (the app may try an encoded username first, then plain).

### Optional Caritas-style concepts

- Some deployments enable **diocese** (“Diözese”) and **consulting type** pickers on the **agency** form when feature flags demand it. Those lists come from Agency Service admin APIs; they classify agencies for reporting and routing, **they are not a substitute** for tenant id. **Carrier / regional Caritas** entries in operator guides usually map to that **diocese** or tenant naming—not to a second parallel tenant system unless you configured it that way.

### Technical / global users

- Users with the Keycloak realm role **`technical`** get tenant id **`0`** on the backend: global maintenance, no single-tenant Hibernate filter in the normal sense. This is **not** a day-to-day consultant or tenant-admin account.

### Cookies and “am I logged in?”

- After a successful login, the consultant app stores tokens in cookies such as **`keycloak`** and **`refreshToken`**. If the browser only shows **`lang`** and **`CSRF-TOKEN`** in `document.cookie` and no **`keycloak`**, login did not complete successfully (or cookies were cleared)—often the same tenant/token mismatch or Keycloak rejection described above.

## What a tenant is

In ORISO, a **tenant** is a **numeric identifier** (`Long`) that scopes operational data so multiple organisations (or environments) can share one deployment without seeing each other’s data.

Concretely:

- **Tenant ID** — Primary key used in APIs, headers, JWT claims, and Hibernate filters.
- **Subdomain** — Human-facing hostname segment (for example `tenant-a` in `tenant-a.example.com`) mapped to a tenant record via **Tenant Service** (User Service resolves subdomain → tenant id through `TenantService`).
- **Keycloak user attribute `tenantId`** — Stored on the user and exposed on tokens as the **`tenantId` claim** (see realm client scope `app-custom` in `ORISO-Keycloak/realm.json`), so authenticated callers carry their tenant in the access token.
- **Tenant Service** — Holds tenant metadata (including subdomain). User Service and others call it over HTTP (`tenant.service.api.url` / `TENANT_SERVICE_API_URL` in Helm).

The knowledge graph (`graphify-out/graph.json`) clusters tenant-related code around resolvers (`TenantResolverService`, `SubdomainTenantResolver`, `AccessTokenTenantResolver`), the HTTP filter (`HttpTenantFilter`), admin/frontend hooks (`useTenantsData`, tenant admin APIs), and `TenantData` — which matches the architecture below.

## Request lifecycle: how the current tenant is set

When **`multitenancy.enabled`** is `true`, backend services run a filter (for example **`HttpTenantFilter`** in User Service) on most HTTP requests. It:

1. Calls **`TenantResolverService.resolve(request)`** to obtain a tenant id.
2. Stores it in **`TenantContext`** (thread-local) for the duration of the request.
3. Loads the subdomain for that tenant from Tenant Service (skipped for tenant id **`0`**, the technical / global context).

Whitelisted paths (health, actuator, swagger, favicon) skip tenant resolution.

## How the tenant id is resolved

Resolution is implemented in **`TenantResolverService`** (same pattern exists in Agency Service and similar pieces in Consulting Type Service). Behaviour depends on **authentication** and **feature flags**.

### Authenticated users

The first resolver that “can resolve” wins, in this order:

1. **`TechnicalOrSuperAdminUserTenantResolver`** — If the Keycloak token has the **`technical`** realm role, tenant id is forced to **`0`**. That value means “no single tenant”: global operations, super-admin style access, and Hibernate tenant filters are not applied the same way as for real tenants.
2. **`AccessTokenTenantResolver`** — Reads the **`tenantId`** claim from the token (supports `Long`, `Integer`, or numeric `String`).

If **`feature.multitenancy.with.single.domain.enabled`** is **false** (classic multi-subdomain setup), then for **non-technical** tenants the service **cross-checks** the token tenant with the first match from:

- **`CustomHeaderTenantResolver`** — HTTP header **`tenantId`** (numeric).
- **`SubdomainTenantResolver`** — Subdomain from the request, resolved via Tenant Service.

The token tenant and header/subdomain tenant **must match**; otherwise the request fails with access denied. That prevents token replay from one tenant against another tenant’s host or injected header.

If **`feature.multitenancy.with.single.domain.enabled`** is **true**, that cross-check is **not** used; tenant for authenticated users comes only from the authenticated resolver chain above (plus the single-domain resolver for unauthenticated paths — see below).

### Unauthenticated users

Order: **`CustomHeaderTenantResolver`** → **`MultitenancyWithSingleDomainTenantResolver`** → **`SubdomainTenantResolver`**. If none resolve, access is denied.

**`MultitenancyWithSingleDomainTenantResolver`** (only when the feature flag is on) resolves tenant without relying on hostname:

- Prefer tenant from **`agencyId`** header: loads agency and uses **`agency.tenantId`**.
- Else, for specific consultant-by-id URLs, may load consultant to get **`consultant.tenantId`** (briefly uses technical tenant `0` on the thread only for that lookup).
- Else falls back to **main tenant subdomain** from application settings, then Tenant Service by subdomain.

## Data isolation in User Service

With multitenancy enabled, **`TenantAspect`** enables a Hibernate filter **`tenantFilter`** on repository/port layer queries so database access is **tenant-scoped**, unless the context is **technical / super-admin** (`TenantContext.isTechnicalOrSuperAdminContext()` — tenant id `0`).

## Propagation to other services

**`TenantHeaderSupplier`** adds an outbound **`tenantId`** header when calling downstream services (when multitenancy is enabled and context is set), so the same tenant context flows through internal HTTP calls.

## Keycloak configuration

In **`ORISO-Keycloak/realm.json`**, client scope **`app-custom`** includes a protocol mapper named **`tenantId`** that maps the Keycloak user attribute **`tenantId`** to the **`tenantId`** token claim (access token, ID token, userinfo). Clients used for end-user or consultant login should request scopes that include this so backend services can resolve the tenant from the token.

Operational steps for Keycloak live in **`../keycloak/KEYCLOAK_SETUP_AND_OPERATIONS_GUIDE.md`**; this document is the conceptual complement for tenant id and multitenancy.

## Configuration flags

| Property | Typical meaning |
|----------|-----------------|
| **`multitenancy.enabled`** | Master switch. When `false`, tenant filter, resolver bean, and tenant aspect are not active (`@ConditionalOnExpression` in code). Default in shipped `application-*.properties` in User Service is **`false`** — enable explicitly for true multitenant operation. |
| **`feature.multitenancy.with.single.domain.enabled`** | One shared hostname: resolve tenant from **`agencyId`** / consultant path / main-tenant setting instead of relying on subdomain vs token cross-check. Exposed for Tenant Service chart as **`FEATURE_MULTITENANCY_WITH_SINGLE_DOMAIN_ENABLED`**. |

Align these flags across **User Service**, **Agency Service**, **Consulting Type Service**, and **Tenant Service** for consistent behaviour.

## Deployment and ingress

- **Tenant Service** is deployed as its own workload (Helm chart `tenantservice`); MariaDB schema `tenantservice` holds tenant records.
- Ingress rewrites document public and numeric paths under `/service/tenant/...` — see **`ORISO-Kubernetes/ingress/05-tenantservice-ingress.yaml`** and comments there.

## Quick operator checklist

1. **Keycloak** — Users have **`tenantId`** attribute set; **`app-custom`** (or equivalent) scope is assigned so tokens contain **`tenantId`**.
2. **Tenant Service** — Tenant rows exist with correct **subdomain** and **id** matching Keycloak.
3. **DNS / ingress** — For subdomain mode, hostnames must yield the expected subdomain for **`SubdomainTenantResolver`**.
4. **Feature flags** — Same **`multitenancy.enabled`** and **`feature.multitenancy.with.single.domain.enabled`** values everywhere they apply.
5. **Service mesh / gateways** — Preserve or set **`tenantId`** (and when using single-domain mode, **`agencyId`**) headers for internal calls as designed.

## Related code (for developers)

- User Service: `de.caritas.cob.userservice.api.tenant.*`, `HttpTenantFilter`, `TenantAspect`, `TenantHeaderSupplier`
- Agency Service: parallel `api.tenant` package
- Keycloak: `ORISO-Keycloak/realm.json` — scope `app-custom`, mapper `tenantId`
