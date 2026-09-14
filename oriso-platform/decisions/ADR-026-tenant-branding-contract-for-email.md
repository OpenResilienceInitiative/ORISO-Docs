# ADR-026: One tenant branding contract for e-mail, and a colour that cannot carry white text is rejected

- **Status:** Accepted — Frank, 2026-09-15
- **Date:** 2026-09-15
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-010` (platform-controlled per-tenant appearance allowlist); `ADR-024`
  (notification matrix); `ADR-025` (replacing the upstream mail path); EPIC `ORISO-Frontend#828`;
  `ORISO-Frontend#862` (this decision); `ORISO-TenantService#154` (the missing accent field)
- **Scope:** which brand values an outgoing mail uses, where they come from, and what happens when
  they are absent or unusable.

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

## What TenantService does not have yet

This contract wants more than the tenant schema offers. The gap is recorded here rather than hidden
behind the fallbacks:

| Wanted | State |
|---|---|
| `theming.accent` (the light accent) | not in the schema — `ORISO-TenantService#154`. Without it, mail renders light-only. |
| `theming.secondaryColor` | in the schema, but ORISO-Admin writes `null` on every theming save, so effectively absent. |
| Sender identity per Träger | absent. `smtpFrom` is per environment, so on a multi-Träger environment every Träger sends from the same address. |
| Organisation address and contact line | absent — currently synthesised or omitted. |
| Imprint and privacy URLs | not fields; hard-coded `/impressum` and `/datenschutz` appended to a base URL. |

Until the sender identity exists, a recipient sees the right organisation **inside** the mail and the
wrong one in the `From:` line. That is the single most visible remaining defect of this contract, and
it is a TenantService change, not an e-mail change.

## Consequences

- Catalogue mails become tenant-branded for the first time; previously only invite and DPA mails were.
- The per-tenant tone (`de-sie` versus `de-du`) is **not** part of this contract and has no field
  anywhere. Until one exists, German resolves to the formal variant everywhere and `de-du` is
  reachable only in Storybook.
- Rejecting a Träger colour is visible behaviour, not a silent substitution: the fallback is logged.
- `ADR-010` governs what a Träger may change in the app's appearance; this ADR governs what of that
  reaches a mail. Where they disagree, the narrower rule wins — a value that ADR-010 allows in the app
  may still be refused in a mail, for the two reasons above.
