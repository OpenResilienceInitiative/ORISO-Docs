# ADR-034: Add-ons, optional services with their own UI, discovered by the platform and enabled per Träger

- **Status:** Proposed, 2026-11-12. Discussed at the DigiSucht kickoff (Caritas, delphi, BITS GmbH); needs product and technical sign-off.
- **Date:** 2026-11-06 (updated 2026-11-12, 2026-11-13, 2026-11-16 and 2026-11-17 with the results of a working implementation)
- **Deciders:** ORISO product owner and platform leads; BITS GmbH (DigiSucht) as proposer
- **Related:** ADR-001 (modules toggleable per tenant and per agency), ADR-010 (per-Träger allowlist computed server-side), ADR-011 (single domain, path-based routing under `/service/*`), ADR-024 (notification matrix), ADR-030 (Activity Timeline), ADR-032 (counsellor calendar); `ORISO-Frontend/src/extensions` (build-time file replacement, unchanged by this ADR)
- **Reference implementation:** [OpenResilienceInitiative/ORISO-AddonService](https://github.com/OpenResilienceInitiative/ORISO-AddonService); demo add-on [BITS-GmbH/oriso-addon-digisucht-tools](https://github.com/BITS-GmbH/oriso-addon-digisucht-tools); host changes in ORISO-Frontend, ORISO-Admin, ORISO-UserService and ORISO-Helm (PRs linked from this ADR's PR)

---

## Context

The DigiSucht instance needs several larger functions that ORISO does not have and that only some Träger will want: nine digital counselling tools (interactive exercises such as Motivationswaage or Konsumtagebuch), a survey tool (questionnaires in counselling and time-limited evaluations for whole user groups) and a counselling documentation system. delphi's tender requires that these are built **modular, usable optionally by other instances, with the core functionality of ORISO unchanged**, and that they are integrated into the shared code base of the Open Resilience Initiative.

ORISO has no runtime extension point today:

- `ORISO-Frontend/src/extensions` replaces source files **at build time**. It works for theming (DigiSucht uses it for fonts, texts and its registration page), but every override is a fork of one file: it cannot import the file it replaces and silently diverges when upstream changes.
- Features are switched on per Träger through tenant settings (`feature…Enabled` flags), which only works for code that already lives in the core.
- The backend is a fixed set of Spring services behind ingress-nginx with one Ingress per service (`/service/users`, `/service/agencies`, …, ADR-011). nginx cannot route to services it learns about at runtime.

Building each of these functions into the core would grow ORISO by three large, DigiSucht-driven modules that every other Träger then carries, reviews and upgrades. Keeping them in forks would contradict the tender and fragment the platform.

## Decision drivers

- New functions must not change ORISO's core behaviour, and must be switchable per Träger and per agency (ADR-001).
- Other operators must be able to install a published add-on into their instance if they want it.
- Add-ons must feel like part of ORISO: same login, same design, same language and form of address, shown in the places where users already work.
- Admins manage add-ons in the existing ORISO-Admin, not in a separate admin application per add-on.
- Deletion, data export and notifications must keep working across core and add-ons (GDPR, tender requirements).
- Operations stay Kubernetes and Helm based (ADR-011), observable like every other ORISO service.

## Decision

Introduce **add-ons**: separately deployed services that bring a backend and a frontend bundle, are discovered by the platform, and are enabled per Träger. One new core service, the **AddonService**, connects them to ORISO.

```mermaid
flowchart LR
  B["Browser\nWeb-App with add-on UI\nORISO-Admin"] --> N["ingress-nginx\n(ADR-011)"]
  N -- "/service/users …" --> C["Core services\nUser, Tenant, Agency, ConsultingType"]
  N -- "/service/addons/**" --> S["AddonService (new)\nregistry, gateway, settings, stats"]
  S -- "short-lived signed token" --> A1["Add-on A\nbackend + UI bundle + own storage"]
  S -- "…" --> A2["Add-on B"]
  A1 -. "host API" .-> S
  S -. "context checks" .-> C
```

### 1. What an add-on is

- A service in its own Kubernetes namespace (default `addons`), installed with its own Helm chart, written in any language; the contract prescribes no technology. For add-ons maintained by the ORISO community, Spring Boot is recommended because it matches the core services. The demo add-on is a small Node service, to show that the contract does not depend on the stack.
- It owns its storage. It has no direct access to MariaDB, MongoDB, Redis or Matrix.
- It carries the label `oriso.io/addon: "true"` on its Service and serves a **manifest** at `GET /.well-known/oriso-addon.json`.
- It may contain one or more apps.

Manifest (contract `oriso-addon/v1`; `react` names the React major the bundle expects from the host (section 4), `readme` and `screenshots` feed ORISO-Admin (section 5), `visibility` is explained in section 2, `calendar` and `events` in section 6; an export entry is reserved for section 6 and `health` for section 7, neither evaluated yet):

```json
{
  "name": "digisucht-tools",
  "version": "1.4.0",
  "contract": "oriso-addon/v1",
  "react": "^19",
  "readme": "https://raw.githubusercontent.com/BITS-GmbH/oriso-addon-digisucht-tools/main/docs/README.md",
  "apps": [{
    "id": "goals",
    "title": { "de": "Ausgangssituation und Ziele" },
    "slots": ["asker.navigation", "consultant.session", "consultant.asker-profile"],
    "visibility": "dynamic",
    "icon": "/ui/icons/goals.svg",
    "screenshots": [{ "slot": "asker.navigation", "url": "https://raw.githubusercontent.com/BITS-GmbH/oriso-addon-digisucht-tools/main/docs/img/fragebogen.png", "caption": { "de": "Fragebogen der ratsuchenden Person" } }]
  }],
  "ui": "/ui/entry.js",
  "settings": "/schema/settings.json",
  "calendar": "/calendar",
  "stats": [{ "id": "released", "label": { "de": "Freigegebene Tools" }, "type": "count" }],
  "events": ["user.deleted", "session.deleted", "session.interaction"],
  "health": "/health"
}
```

### 2. Discovery and enablement

- The AddonService lists Services with the label in the add-on namespace every 30 seconds (read-only RBAC on Services in that namespace) and reads each manifest. A static list in the Helm values is the fallback for environments without the Kubernetes API.
- A discovered add-on is **available**, not active. Enablement lives in the AddonService:
  - A **SuperAdmin** switches an add-on on or off globally (off by default) and sets a **mode per Träger**:

    | Mode | Effect | Träger admins |
    |---|---|---|
    | `OFF` (default) | not available | do not see the add-on |
    | `TENANT` | the Träger decides | see it and switch it on or off |
    | `ON` | always on | see it, cannot switch it off |
    | `ON_HIDDEN` | always on for the Träger and all its agencies | do not see it |

    `ON_HIDDEN` is for add-ons a Träger should not have to care about, for example one every Träger of an instance runs.
  - Träger admins can override the Träger state per **agency** (modes `TENANT` and `ON`). An agency override only takes effect while the add-on is on for the Träger, so the Träger level is always a complete off switch.
  - Controls an admin may not use are not shown, rather than shown disabled.
  - Like ADR-010, the effective state is computed server-side; a client only learns the add-ons enabled for itself.
- **What a user sees is decided in three stages, all in the AddonService; the UI only shows what the registry returns:**
  1. *Enablement (operator, static):* the global switch, the mode per Träger and agency overrides. The registry evaluates them **in context**: the web app asks with the same `X-Oriso-Agency-Id` / `X-Oriso-Session-Id` headers as its API calls, so a counsellor in a case sees only add-ons enabled for that case's agency, and a disabled add-on shows no button, tile or menu entry at all. Without a context header the registry uses the caller's own agencies (a counsellor's agencies, a client's session agencies): an add-on is listed if it is enabled for at least one of them.
  2. *Slot and role (manifest, static):* the slot decides the audience (section 4).
  3. *App state (add-on, dynamic):* an app marked `"visibility": "dynamic"` in the manifest is only listed if the add-on says so for this person. The AddonService asks `GET /visibility` with a user-scoped add-on token (including agency and session context) and gets per app `visible` and an optional `badge` count (for example "1 new"). Answers are cached for a short time per user and context. If the add-on does not answer in time, a dynamic app stays hidden. Example: the client's menu entry for a tool only appears once a counsellor has released it.
- **Trust model:** installed add-ons are trusted. The operator decides what is installed; there is no per-add-on permission model in v1.

### 3. Backend: one route, one gateway

- One new Ingress route `/service/addons/**` points to the AddonService. No per-add-on Ingress, no change to existing routes (ADR-011).
- For every request to `/service/addons/<name>/api/**` the AddonService validates the Keycloak token, checks that the add-on is enabled for the caller's Träger and agency, and forwards the request with a **short-lived token** for that add-on only:
  - RS256, issuer `oriso-addonservice`, audience = the add-on's name, valid for a few minutes.
  - Claims: subject, username, roles, tenant, and where applicable agency, session and client (`agencyId`, `sessionId`, `askerId`).
  - The public keys are served at `/service/addons/.well-known/jwks.json`, so add-ons verify tokens without a shared secret and without integrating Keycloak. The user's own token never leaves the core.
- **Context is checked, not trusted.** The UI asks for context with the headers `X-Oriso-Agency-Id` and `X-Oriso-Session-Id`. The AddonService verifies the agency against the caller's memberships and the session against UserService (only a counsellor with access to that session gets it) and only then puts it into the token, together with the session's client.
- **Core gates are known to add-ons.** Platform-wide gates such as the DPA gate ("new counselling blocked until the Träger has confirmed the current DPA") are served to add-ons through the host API (`GET /addons/host/gates`, section 6), and each add-on decides what a closed gate means for it: the tools add-on, for example, refuses new releases but keeps released tools and answers usable. The gateway does not know add-on semantics, so it does not block on its own. Operators enable an add-on for a Träger only when its DPA is in order; a hard block in the gateway remains possible later if ORISO wants it. Account inactivity needs no add-on handling: a locked account gets no token and so never reaches the gateway.
- Add-ons call back into ORISO only through the **host API** of the AddonService (section 6), authenticated with their own add-on token.

### 4. Frontend: slots and a mount contract

There is one kind of add-on. It declares in its manifest which **slots** its apps appear in; the slot decides who sees the app, where, and which context it receives. An add-on can use several slots, for example the tools add-on gives clients their own page and counsellors a panel in the case view.

| Slot | Audience | Place | Context in addition to user, role and Träger |
|---|---|---|---|
| `asker.navigation` | Clients | own page in the navigation of the web app | none |
| `consultant.navigation` | Counsellors | own page in the navigation of the web app | agency |
| `consultant.session` | Counsellors | side panel in the case view | agency, open session, its client |
| `consultant.asker-profile` | Counsellors | tile in the client profile overview | agency, client |
| `asker.session-menu` | Clients | entry in the chat's menu, opens the app in a side panel of the chat | agency, open session (verified as the client's own) |
| `consultant.session-menu` | Counsellors | entry in the chat's menu, opens the app in the case view's side panel | agency, open session, its client |
| `admin.page` | Admins | own page in ORISO-Admin | admin level, Träger, agency where applicable |
| `registration.agency-finder` | Anonymous visitors | replaces the agency selection step of the registration | Träger, locale, topic and postcode known so far |

- When a user opens an add-on app, the web app or ORISO-Admin loads the add-on's bundle from `/service/addons/<name>/ui/…` (same origin, no change to security headers) and mounts it into the slot.
- **Bundles are public code.** A browser's module import cannot send a bearer token, so `/ui/**` is served without authentication. Bundles must contain code only, never data; everything user-related goes through the authenticated API.
- An add-on can further restrict an app by role inside its slot; it cannot widen the audience of a slot.
- **Icons:** an app may name a monochrome SVG from its own UI route (`"icon": "/ui/icons/goals.svg"`). The host uses it wherever its own entries have icons (navigation, chat menu, profile tiles, admin tabs) and draws it as a mask in the theme colour, so it follows the Träger colours and active states. Without one, a default icon is shown. Pages of the navigation slots use the full content width.
- **Registration (`registration.agency-finder`):** for operators that match people to a Beratungsstelle by more than postcode and topic (for example with a short questionnaire), an add-on can take over the agency selection step of the core registration, and only that step. Account creation, password rules, consent and legal texts stay in the core. The add-on finishes with `complete({ agencyId, topicId, postcode, consultingType, registrationRef })`; the core then registers the person and passes `registrationRef` along, and UserService publishes `user.registered` with the new user id and that reference, so the add-on can attach the answers it stored before the account existed. Instances without such an add-on keep the normal agency selection.
  - Because there is no login yet, the add-on is listed by a public registry entry per Träger (`GET /service/addons/public/registration?tenantId=…`) and reached through a public route `/service/addons/<name>/public/api/**`. The AddonService admits it only for an add-on enabled for that Träger in this slot, rate-limits per client, and forwards with an anonymous add-on token that carries the Träger and the role `anonymous` but no user claims. Browser cookies and headers are not forwarded.
- **Lifecycle:** the bundle exports `bootstrap`, `mount(element, context)`, `unmount` and optionally `update(context)`, the shape of a single-spa parcel, so authors can use existing adapters. `update` lets the host pass a new context (for example another session) without remounting. `context` carries the user and role, tenant, locale including the form of address (`de` / `de@informal`), the tenant's theme tokens, the slot context from the table above, an API client bound to the add-on's own route, `navigate` and `notify`.
- **Shared React:** the host provides its React, ReactDOM client and JSX runtime on `globalThis.__ORISO_ADDON_SHARED__`. An add-on uses these instead of bundling React, which keeps one React instance per page and lets a bundle be a plain ES module without a build step. Other libraries are bundled by the add-on; UI components come from the host's kit.
- **Component kit:** the host also shares a small, curated set of its own components as `kit` on the same global, so add-ons look and behave like ORISO without copying its design. The web kit (`@oriso/web-kit` 1.x) offers `Provider`, `Button`, `TextField`, `Textarea`, `Checkbox`, `Select`, `RadioGroup`, `DatePicker`, `NumberField`, `Notice`, `Card`, `Headline` and `Spinner`, enough for questionnaires and documentation forms (single and multiple choice, dates, numbers with a range, dropdowns, free text).
  - Each kit component renders the real core component (for example `OrisoTextarea`, `M3Checkbox`, the core `Button`) behind small props of its own. Only those props are contract; the core can refactor the component behind them.
  - Add-ons render in their own React root, outside the host's providers. They wrap their tree in the kit's `Provider`, which supplies the host's theme including the Träger colours.
  - Kit components treat add-on text as text: no translation lookup, no HTML.
  - Authors import the kit like a package (`import { Button } from '@oriso/web-kit'`). A small bundler plugin maps that import, and React, onto the global; the host publishes a types-only package generated from the kit's prop types. No component code is bundled into an add-on.
  - The kit's components appear in the host's Storybook under "Add-ons", which is also the reference for authors.
  - ORISO-Admin uses a different component library (antd); an admin kit with the same approach is planned and not part of v1. Until then an `admin.page` app brings its own components.
- Add-ons ship their own translations; the host only passes the active locale.

### 5. Admin: settings, statistics and admin pages in ORISO-Admin

- **Description:** the manifest may point to a Markdown `readme`, for example in the add-on's repository, and list up to six `screenshots` per app, each for one of its slots. The AddonService fetches and caches the readme from an allowlist of hosts (default `raw.githubusercontent.com`, also required for screenshots) and resolves relative links. ORISO-Admin shows the readme with its images on the add-on's page, without raw HTML, and lists each app with readable slot names (for example "Beratende: Seitenleiste im Fall") and its screenshots. Images load from that host, so an instance with a strict Content Security Policy has to allow it.
- **Settings** need no UI from the add-on: the manifest points to a **JSON Schema**, ORISO-Admin renders the form, and the AddonService stores the values and serves them to the add-on through the host API. v1 supports a deliberately small subset: an object of `string`, `boolean`, `number` and `integer` properties with `title`, `description` and `default`, plus `enum` and `maxLength` for strings and `minimum`/`maximum` for numbers. Values merge in the order **schema defaults, Träger, agency**.
- **Statistics:** the manifest declares them (id, label, type). The AddonService fetches aggregated, anonymous values per Träger from the add-on's `/stats?tenantId=…` with a service token (role `addon-service`); add-ons never push. ORISO-Admin shows them as tiles.
- **Admin pages** (`admin.page`) are for add-ons whose administration is more than configuration, for example the survey editor. ORISO-Admin lists them in its navigation and mounts them with the same contract as the web app.

### 6. Host API and lifecycle events

- **Settings:** `GET /addons/host/settings` returns the effective settings for the token's Träger and agency.
- **Core gates:** `GET /addons/host/gates` returns the gates of the token's Träger, today the DPA gate (status, signed, `newCounsellingAllowed`, grace period, deadline), read from the TenantService and cached briefly.
- **Context:** `GET /addons/host/context` resolves the sessions (agency, counsellor, status), agencies and counsellors of the token's user or, for a counsellor in a verified session, of that session's client; always within the token's Träger and, with an agency in the token, that agency. The AddonService reads it from UserService (`GET /users/addon-context`, technical role) and caches it briefly.
- **Notifications:** an add-on asks the core to notify a person (for example "a new tool has been released for you") with a title, a short text, a link back into the add-on and one flag: important or not. It never chooses a channel. The core delivers through its existing channels (Activity Timeline, e-mail, push; ADR-024, ADR-030) according to the person's own notification preferences, and only addresses people within the caller's context: the caller's Träger, clients only through a session the caller may access, and the counsellors of a client (`recipient: "counsellors"`) only for the client themself or a counsellor in that client's session. Add-ons have no mail configuration of their own; if mail is off in the core it is off for add-ons too.
- **Audit entries (write only):** an add-on reports auditable actions (for example "counsellor released tool X to client Y"). The AddonService stamps each entry with actor, time, Träger and add-on, stores it, and ORISO-Admin shows it in its existing Logs area next to the core's audit logs, with the same visibility rules per admin level. Add-ons can only write entries; they cannot read the log, not even their own entries.
- **Calendar entries (read only):** an add-on can declare that it has dated entries such as appointments, deadlines or reminders. The core asks it for the entries of one person in a time range, the way it fetches statistics, and shows them in the counsellor calendar (ADR-032) together with its own appointments. Each entry has a title, a start (and optional end), a kind and a link into the add-on. The calendar only shows and links; booking, moving or cancelling happens inside the add-on.
- **Data export:** add-ons expose an export endpoint; the central export collects it, configurable per admin level as the tender requires. Not implemented yet; it depends on the central export.
- **Lifecycle events** via RabbitMQ (already part of the platform): UserService publishes `user.deleted`, `session.deleted`, `user.registered` (with the `registrationRef` of a registration add-on) and `session.interaction` (a counsellor wrote in a session, a call ended, an appointment took place; session, agency, counsellor, type and time, never content, coalesced per session so a chat does not produce an event per message; for example for reminders to document), TenantService `tenant.deleted`, on the topic exchange `oriso.lifecycle` after the deletion is committed (ids only, no personal data). The AddonService consumes them with a durable queue of its own and forwards each event to every add-on that lists its type in the manifest's `events`, as `POST /events` with a service token; deliveries are stored and retried with growing pauses, so an add-on that is down receives them later. Add-ons therefore need no access to RabbitMQ. Handlers must be **idempotent and tolerate unknown ids**: a Träger created and rolled back within a second still produces a deletion event, and events can arrive twice.

### 7. Operations

- Network policies allow traffic into the add-on namespace only from the AddonService; outbound only to the AddonService host API and the add-on's own storage.
- Every add-on exposes its health route and OpenTelemetry, and appears in the Health Dashboard and SigNoz like a core service.
- The AddonService can switch an add-on off per Träger or globally at any time.
- The AddonService is part of the ORISO Helm chart, disabled by default. Its image is published like the other services' as `ghcr.io/openresilienceinitiative/oriso-addonservice` (`latest` from main, `dev` from dev, versions from `release/addonservice-<version>`).

### 8. Versioning

- The contract is versioned (`oriso-addon/v1`), independently of ORISO releases. Breaking changes require a new contract version; the AddonService can serve more than one version during a transition.
- The kit has its own version (`kit.version` on the global). Removing a kit component or changing its props is a breaking change of the kit; adding components is not.
- Each ORISO release states which contract versions its web app, ORISO-Admin and AddonService support. Operators who stay on an older release line need the host side backported to it; the reference implementation was backported to 2.0.15 for the DigiSucht test instance.

## Consequences

**Positive**

- Large, Träger-specific functions stay out of the core and its review queue; the core grows by one service and a small set of frontend slots.
- Add-ons release independently; ORISO upgrades do not wait for partners.
- Other operators can install published add-ons and enable them for their own Träger.
- One place for auth, enablement, core gates, logging and the kill switch.

**Negative / cost**

- A new core service to build and run, and a public contract that ORISO has to keep stable.
- Shared React couples add-ons to the host's React major; a React major upgrade in ORISO needs an announcement and compatible add-on releases.
- The kit's props are public API. ORISO has to keep them stable even when it reworks the components behind them, which is why the kit stays small.
- Trusted, in-page add-ons can see what the page can see. This is acceptable only because operators choose what they install; it must be stated in the operator documentation.
- ORISO-Admin needs a JSON Schema form, statistics tiles and the same slot loader as the web app.

## Considered options

- **Build the functions into the core.** Rejected: contradicts the tender's "core unchanged" requirement and makes every Träger carry DigiSucht-specific modules.
- **Only build-time file replacement (`src/extensions`).** Rejected: no backend story, every override is a fork of an upstream file, nothing can be shared with other instances. It stays as the theming mechanism.
- **One Ingress per add-on, no gateway.** Rejected: every add-on would have to validate Keycloak tokens, enablement and core gates itself, there is no central kill switch, and every install touches the ingress setup.
- **Iframe-only integration.** Rejected for v1: strongest isolation, but no shared theme or React, awkward layout in slots. Can be added later as a second integration mode for untrusted add-ons.
- **A permission or scope model per add-on.** Deferred: with operator-installed, trusted add-ons it adds approval work without a real gain in v1.
- **A separate component package (`@oriso/ui`) extracted from the core.** Not now: cleanest separation, but a large extraction both frontends would have to adopt. The kit gives add-ons the same imports without moving code, and its prop types are a natural starting point if the package comes later.
- **Module Federation for host components.** Rejected: it solves the same problem with more machinery, and the web app (webpack) and ORISO-Admin (Vite) would need two different federation setups. Sharing through the existing global needs neither.
- **Enablement as tenant settings in TenantService.** Rejected: agency overrides and per-add-on state would add a second, differently shaped settings store to TenantService; the AddonService already owns the registry and the gateway check.
