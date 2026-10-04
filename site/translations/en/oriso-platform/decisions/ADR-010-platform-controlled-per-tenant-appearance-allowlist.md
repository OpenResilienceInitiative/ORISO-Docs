# ADR-010: Platform-controlled per-Träger allowlist for the Erscheinungsbild (Appearance/Theme) section

- **Status:** Proposed — 2026-07-06 (this session); pending Frank's confirmation of the data model, then implementation.
- **Date:** 2026-07-06
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** THB theme-builder work (PRs #123/#124/#125 closed, #153 phone-preview merged 06-17, #126 THB-06 merged 07-02); `ProtectedPageLayoutWrapper.tsx` / `settingsTabs.ts` visibility gating; ORISO-Admin `GlobalSettings` (SuperAdmin-only page, login + smtp tabs); TenantService `TenantAdminControlsService` (platform-global controls singleton); memory `oriso-design-rule-disable-not-hide` (this ADR is a **deliberate, scoped exception** — see Decision §3).

---

## Context

The "Erscheinungsbild" (Appearance/Theme) section was reported lost after the React 19 / antd 5 modernization. Verification (2026-07-06) showed it is **not lost**: the THB theme builder (`src/pages/Tenants/Edit/ThemeSettings` → `components/Tenants/GeneralSettings` → `ThemeBuilder`, with the phone preview `iphone-14-pro.png` + `MiniChatPreview`) is intact on `dev`, byte-identical across the modernization. It is a **subsection inside the tenant edit view**, gated by role + multitenancy mode via `shouldShowThemeSettings` (`ProtectedPageLayoutWrapper.tsx:82`, `App.tsx:77`, `settingsTabs.ts:63`).

Two facts drive this ADR:

1. **There is already an `appearance` permission toggle** — `settings.tenantAdminControls.allowedPermissionToggles.appearance` — read in `GeneralSettings/index.tsx` (`appearanceEditable`), but it only makes the ThemeBuilder **read-only**, and it is **platform-global, not per-tenant**: `TenantAdminControlsService` loads a **single row** (`findTopByOrderByIdAsc`) and enriches *every* tenant's settings payload with the *same* controls object (comments state "platform-global admin controls"). So today it is all-tenants-or-none, and only read-only.

2. **The requirement is per-Träger.** A platform admin (SuperAdmin) must decide, via a **multi-select of Träger**, which tenants may edit the Erscheinungsbild. Allowed → section visible and editable. Not allowed → the Erscheinungsbild subsection is **completely hidden** for that Träger.

SuperAdmin identity: `useUserRoles.hook.ts:39` — `AgencyAdmin && TenantAdmin && tenantId === 0`.

## Decision (proposed)

1. **Introduce a platform-global allowlist of Träger IDs — `appearanceAllowedTenantIds: number[]` — inside the existing `tenant_admin_controls` JSON blob.** No schema migration: `controls` is `LONGTEXT` JSON, so the field is additive. This is the single authoritative source, edited only by SuperAdmin.

2. **Compute the per-tenant boolean server-side.** When TenantService enriches a specific tenant's settings (`enrichSettingsWithTenantAdminControls`), set `allowedPermissionToggles.appearance = appearanceAllowedTenantIds.contains(tenantId)` for the tenant being served. This **reuses the existing boolean the frontend already reads**, and keeps the raw allowlist server-side (a tenant-admin's client only learns its own allowed/not, never the full list).

3. **Frontend: hide, do not read-only.** Change the Erscheinungsbild subsection from `readOnly` to **completely hidden** when `appearance !== true` and the user is not SuperAdmin — hide the subsection card *and* the tab/nav entry. This is a **deliberate exception** to the panel-wide "disable, don't hide" rule (`oriso-design-rule-disable-not-hide`): the rule governs settings a role is entitled to see but not change; here appearance editing is a **platform-granted capability** a non-allowlisted Träger has no entitlement to and should not be aware of.

4. **New SuperAdmin-only multi-select** in `GlobalSettings` as a new tab (`/admin/global-settings/appearance`), listing all Träger (`searchTenantData`, label `name` / value `id`), reusing `SelectFormField` `isMulti`. Selection = `appearanceAllowedTenantIds`, saved via the existing controls update endpoint (same path as global SMTP settings). Visible/editable only for SuperAdmin.

5. **SuperAdmin always sees and edits appearance** (bypass the allowlist), so the platform can configure any Träger's theme.

## Considered options

- **Per-tenant boolean column on each tenant (extend `tenant_admin_controls` with a `tenant_id`, or a new per-tenant flag).** Rejected: requires a schema migration + Liquibase changeset + per-tenant writes, for no gain over an additive JSON array.
- **Keep the single global `appearance` boolean.** Rejected: cannot express "these Träger yes, those no."
- **Read-only instead of hidden.** Rejected by product: completely hide for non-allowlisted Träger.
- **Ship the full allowlist to every tenant client and filter in the browser.** Rejected: needlessly exposes the platform's full Träger allowlist to every tenant-admin; compute the per-tenant boolean on the server instead (§2).

## Consequences

**Positive:** small, mostly-additive change — no DB migration (JSON field), reuses the existing global-controls service/endpoint and the existing `appearance` boolean the FE already consumes; the FE change is essentially `readOnly → hidden` plus one new SuperAdmin page; the section "returns" for allowlisted Träger. **Negative / cost:** the meaning of the existing global `appearance` boolean changes from "global on/off" to "computed per served tenant from the allowlist" — any current consumer expecting the global semantics must be checked; SuperAdmin must curate the list; a tenant newly removed from the list loses the section on next load.

## Testing (what this needs)

**Unit (ORISO-Admin, vitest):**
- A pure gating helper `isAppearanceEditingAllowed({ appearanceToggle, isSuperAdmin })` (or equivalent): allowed boolean true → true; false/undefined → false; SuperAdmin → true regardless.
- Visibility: given `appearance !== true` and non-SuperAdmin, the Erscheinungsbild subsection **and** its tab/nav entry are **not rendered** (assert absence in the DOM, not merely a `readOnly` prop).
- The SuperAdmin multi-select page renders only for SuperAdmin; a non-SuperAdmin never reaches it.

**Unit / slice (ORISO-TenantService):**
- `TenantAdminControlsService` round-trips `appearanceAllowedTenantIds` through the JSON `controls` (serialize/deserialize; default empty list; backward-compatible with existing rows that lack the field).
- Enrichment computes `allowedPermissionToggles.appearance = allowlist.contains(servedTenantId)` — true for a listed tenant, false for an unlisted one; the raw list is not exposed in the enriched per-tenant payload.

**Integration / E2E (Admin gate, Playwright/Cypress):**
- SuperAdmin: open Global Settings → Appearance tab → multi-select lists Träger → enable a Träger → save → that Träger's admin sees and can edit the Erscheinungsbild section; disable → the section disappears for that Träger.
- Non-SuperAdmin tenant-admin: never sees the multi-select; sees the section iff their tenant is allowlisted.

## Open (pending Frank)

- Confirm the data model (platform-global allowlist array vs. a real per-tenant flag). Recommendation: the array in the existing controls JSON (§1).
- Any existing consumer of the global `appearance` boolean that relies on global semantics (to be grepped before flipping to computed-per-tenant).
- i18n keys + exact German labels for the new tab ("Erscheinungsbild") and the multi-select ("Welche Träger dürfen das Erscheinungsbild ändern?").
- Whether SingleTenantAdmin (single-domain mode) is ever a platform-level curator, or strictly SuperAdmin.
