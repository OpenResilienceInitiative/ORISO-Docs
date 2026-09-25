# ADR-026: One tenant branding contract for e-mail, and a colour that cannot carry white text is rejected

- **Status:** Accepted — Frank, 2026-09-15
- **Implementation:** partly on `dev` — decision 4 yes, decision 3 on one path, decisions 1, 2 and 5 not (see Implementation status)
- **Date:** 2026-09-15 (implementation status re-measured on `dev` 2026-09-22)
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-010` (platform-controlled per-tenant appearance allowlist); `ADR-024`
  (notification matrix); `ADR-025` (replacing the upstream mail path); EPIC `ORISO-Frontend#828`;
  `ORISO-Frontend#862` (this decision); `ORISO-TenantService#154` (the accent field);
  `ORISO-TenantService#269` and `ORISO-UserService#1229` (tenant-pinned logo route, merged
  2026-09-22)
- **Scope:** which brand values an outgoing mail uses, where they come from, and what happens when
  they are absent or unusable; the dated addendum below also fixes sender transport ownership.

---

## Context

Three mechanisms decided what a mail looked like, and they disagreed.

1. **`email.brand.*` Spring properties** — per environment, not per Träger. Every Träger on a
   multi-tenant environment sent mail with the same organisation name and logo.
2. **`EmailBrandingResolver`** — real TenantService theming, but used only by the invite and DPA
   path.
3. **The SMTP settings' `emailThemeColor`** — a transport setting used as a design token by the
   catalogue renderer, while the invite path deliberately ignored it as "a transport setting is not
   a design token". Two senders, two opposite rules, same platform.

Underneath sits a harder problem: a mail is not a web page. It is fetched by a client the platform
does not control, often with images blocked, frequently on a device that is not the recipient's own.
Two consequences follow that a web-side branding contract does not have to think about.

## Decision

1. **One resolver for every mail.** `EmailBrandingResolver` is the only source of brand values;
   `OrisoEmailBrand.valuesForTenant(appUrl, tenantId)` is the only way a sender obtains them. The
   `email.brand.platform-name`, `email.brand.org-name` and `email.brand.logo-url` properties are
   removed. The SMTP `emailThemeColor` stops being a design token.

2. **A logo is loaded only from the platform's own origin.** A logo URL is used only when its
   scheme, host and port match `app.base.url`; a stored (non-URL) image resolves to
   `<appBase>/service/tenant/public/branding/{tenantId}/logo`. Anything else is dropped and the
   mail falls back to the text wordmark.

   The reason is not tidiness. An image in an e-mail is fetched by the recipient's client at the
   moment of reading, from wherever the URL points — which tells a third party that this person
   opened this mail, at this time, from this address. A Träger logo on a foreign CDN turns every
   counselling mail into a tracking pixel. The Keycloak theme generator carries the same guard, so
   an absent logo leaves no gap in the layout rather than a broken image.

3. **A brand colour that cannot carry white text is rejected.** The button label is white. Contrast
   is measured against white; below 4.5:1 the ORISO primary is used instead and a warning is logged.
   This will reject colours that some Träger use in print — that is the intended outcome, and it is
   a conversation to have with them rather than a rule to soften. Text and border colours are
   derived from the accepted colour, never stored separately.

4. **No mail renders with an empty organisation line.** Every value has a working fallback:
   brand name falls back to the platform name and finally to `ORISO`; imprint and privacy URLs are
   synthesised from the tenant base URL; the logo may be absent. A missing field degrades the mail,
   it never blanks it.

5. **Branding is resolved fresh per mail, with a short cache.** Tenant data is read through
   `getRestrictedTenantDataFresh` behind a ten-second TTL cache, bounded to 1000 entries, negatives
   cached too. A Träger who changes their logo does not wait for a deployment; a digest batch does
   not hammer TenantService.

## Implementation status (measured on `dev`, 2026-09-22)

| Decision | State on `dev` |
|---|---|
| 1. One resolver | **Not implemented.** Two mechanisms remain in ORISO-UserService. `OrisoEmailBrand` (password reset, magic-link sign-in, welcome, supervisor-added) still reads `email.brand.*` properties and takes the SMTP `emailThemeColor` as primary colour; it has no TenantService wiring and no `valuesForTenant`. `EmailBrandingResolver` (TenantService theming, properties `email.branding.name` / `email.branding.logo-url`) is used only by the invite path through `InviteFrameMailRenderer`. |
| 2. First-party origin only | **Not implemented.** What is on `dev` since 2026-09-22: a stored (non-URL) Träger logo resolves to `<app.base.url>/service/tenant/public/branding/{tenantId}/logo` (`ORISO-UserService#1229`), served by the new TenantService route `GET /tenant/public/branding/{tenantId}/{asset}` with `asset` = `logo` or `favicon` (`ORISO-TenantService#269`): no authentication, no cookies, 404 for an unknown tenant, and it never fetches an external image. The tenant id in the path picks the tenant, so the route cannot hand out another Träger's image by host resolution. **But** an absolute tenant logo URL is still used as-is, on any origin, and so is the platform `email.branding.logo-url`. The tracking-pixel risk named above therefore still exists for Träger whose logo is an external URL. `#1229` states explicitly that it does not adopt the origin rule. |
| 3. Contrast against white | **Implemented on the catalogue path only.** `OrisoEmailBrand` rejects a colour below 4.5:1 against white, falls back to the ORISO primary and logs a warning. The invite path (`EmailBrandingResolver` with `EmailColors`) does not reject; it derives readable foreground colours from whatever `primaryColor` the Träger set. |
| 4. No empty organisation line | **Implemented** on both paths: each has a name fallback down to `ORISO`, and imprint and privacy URLs are synthesised. Since `#1229`, a tenant base URL without a host (empty subdomain) is rejected, so the footer falls back to the application base URL instead of `https://.<host>`. |
| 5. Fresh read, ten-second cache | **Not implemented.** `EmailBrandingResolver` on `dev` reads `getRestrictedTenantData`, which sits behind the general Spring tenant cache, not `getRestrictedTenantDataFresh`. The TTL-bounded variant exists only on branch `origin/email-v2.1`. |

## What TenantService does not have yet

This contract wants more than the tenant schema offers. The gap is recorded here rather than hidden
behind the fallbacks:

| Wanted | State |
|---|---|
| `theming.accent` (the light accent) | **In the TenantService API on `dev`** (`ORISO-TenantService#154` closed). UserService does not read it yet — `EmailBrandingResolver` still documents it as missing — so mail still renders light-only. |
| `theming.secondaryColor` | in the schema, but ORISO-Admin writes `null` on every theming save, so effectively absent. (Not re-measured 2026-09-22.) |
| Sender identity per Träger | absent. `smtpFrom` is per environment, so on a multi-Träger environment every Träger sends from the same address. (Not re-measured 2026-09-22.) |
| Organisation address and contact line | absent — currently synthesised or omitted. |
| Imprint and privacy URLs | not fields; hard-coded `/impressum` and `/datenschutz` appended to a base URL (confirmed in `EmailBrandingResolver` on `dev`). |

Until the sender identity exists, a recipient sees the right organisation **inside** the mail and the
wrong one in the `From:` line. That is the single most visible remaining defect of this contract, and
it is a TenantService change, not an e-mail change.

## Addendum — sender transport and configuration (accepted 2026-09-25)

Frank chose the explicit server mode proposed in
[ORISO-Frontend#1562](https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1562).
This extends the branding contract to the sender the recipient sees. It supersedes the
conflicting no-platform-fallback assumption in ORISO-TenantService#240 **only when the
Träger explicitly uses platform mode**.

1. **The platform server has one owner: deployment configuration.** Its host, port,
   encryption mode, sender and credentials come from the same deployed configuration for
   all platform mails, including Keycloak account mails and the Admin test. Admin shows
   the effective settings read-only; it cannot store a competing platform configuration.
   Where account access requires mail, installation or startup reports a missing or invalid
   platform SMTP setting rather than leaving those flows silently unable to send.

2. **Every Träger has an explicit mode.** New Träger use `PLATFORM` by default; they may
   choose `OWN` and save a complete server configuration. The Admin form never persists
   displayed platform values as a tenant override. Existing records must be audited before
   assigning a mode: a complete own configuration can be proposed for `OWN`, while a
   partial configuration needs an operator-visible correction and must not be silently
   interpreted as either mode.

3. **Sending obeys the selected mode.** `PLATFORM` dispatches through the platform
   server with a truthful platform sender and the Träger identified in the display name
   and reply address where appropriate. `OWN` dispatches through TenantService, which
   owns and decrypts the tenant credential only at send time. If that configuration is
   incomplete or delivery fails, the caller reports a failure; it never retries through
   the platform server. Do not put a Träger-owned domain in `From` while relaying through
   the platform server.

4. **Public links never acquire a fallback host.** A missing, empty or placeholder
   public origin fails installation or service startup with the setting named. Neither
   production nor localhost may be substituted. The optional `OWN` SMTP configuration
   is validated when selected; its absence does not prevent a `PLATFORM` Träger from
   using the platform server.

5. **The secret boundary is preserved.** UserService does not read the tenant SMTP
   password through an end-user-authenticated tenant DTO or cache it. TenantService's
   internal delivery endpoint remains restricted to the technical identity. The
   endpoint's current lack of a platform fallback is correct inside `OWN` mode; the
   mode decision belongs to the orchestration above it.

The addendum is a policy decision, not a claim of implementation or deployment. The
initial delivery must include two-tenant send tests (platform and own server), sender
headers, failure/no-fallback checks, and real mailbox readback on Dev. Stage needs a
separate operator rollout and test.

## Consequences

- Catalogue mails become tenant-branded once decision 1 lands; on `dev` today only invite mails are.
- The per-tenant tone (`de-sie` versus `de-du`) is **not** part of this contract and has no field
  anywhere. Until one exists, German resolves to the formal variant everywhere and `de-du` is
  reachable only in Storybook.
- Rejecting a Träger colour is visible behaviour, not a silent substitution: the fallback is logged.
- `ADR-010` governs what a Träger may change in the app's appearance; this ADR governs what of that
  reaches a mail. Where they disagree, the narrower rule wins — a value that ADR-010 allows in the app
  may still be refused in a mail, for the two reasons above.
- Code that cites this decision cites it as **"ADR-021"** (UserService `OrisoEmailBrand`,
  `InviteFrameMailRenderer`; Frontend `src/emails/scripts/buildKeycloakTheme.mts`). In this series
  ADR-021 is the legal-text hierarchy. The correct reference is ADR-026.
