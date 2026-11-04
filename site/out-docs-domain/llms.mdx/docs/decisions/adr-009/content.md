# ADR-009: Global Topic/Category ownership and AI-assisted translation infrastructure (/decisions/adr-009)



* **Status:** Accepted — Frank, 2026-07-01 (grill-with-docs session). Design decided now ("set the points"); implementation deliberately deferred, see Rollout below.
* **Date:** 2026-07-01
* **Deciders:** Frank + AI (backend/frontend)
* **Related:** `ADR-001` (Topic/Modality/Agency orthogonal axes), `ADR-003` (Department = Agency × Topic, legal-text ownership), `ADR-006` (`conversation_type` fixed enum — explicitly NOT reopened by this decision), `CONTEXT-topics-categories-departments.md`

***

## Context [#context]

Topic/Category CRUD already exists (`ORISO-ConsultingTypeService` `TopicEntity`/`TopicGroupEntity`, `ORISO-Admin` `pages/Topics`), but:

* It is gated to `UserRole.TenantAdmin` and its `tenant_id` column, even though Topics are conceptually **global** (one unique subject, not partitioned per tenant) — the per-agency variation is the **legal text** (Department, [ADR-003](/decisions/adr-003)), not the Topic identity. This mismatch created the false impression that "each Träger has its own topics."
* Translation of Topic names only happens via hand-written SQL migrations (`0011_add_english_topic_names`, `JSON_SET`/`JSON_EXTRACT` on the existing `name` JSON column) — there is no admin-facing translation UI or completeness check.
* Topic/Category icons are hardcoded frontend assets with inconsistent shape treatment (some round, some square) — no upload mechanism.
* `ADR-006`'s `conversation_type` has four fixed, structurally distinct values (Agency Counselling / Live Chat / Internal Group Chat / Self-Help Group) with no admin-editable display label or translation.

Existing infrastructure this decision deliberately reuses rather than replacing:

* `ORISO-Admin`'s `pages/GlobalSettings` (tabs: Login, SMTP) already stores platform-wide, non-tenant-scoped settings, including a secret credential (`globalSmtpPassword` via `FormInputPasswordField`, `useSettingsAdminMutation`).
* `TECHNICAL_TENANT_ID = 0L` is already an established cross-service convention (AgencyService, TenantService) for "this row is platform-level, not tenant-owned."
* `TopicGroupEntity.topicEntities` is already `@ManyToMany` — a Topic can already sit in several Categories at once.

## Decision [#decision]

1. **Ownership:** Platform-Admin becomes the **exclusive** administrator of the global Topic/Category catalog (create/edit/delete Topic and Category, icon assignment, translations). Tenant-/Agency-Admins keep Department-level linking (which agency offers which topic) and author their own legal texts (DPP/Impressum, [ADR-003](/decisions/adr-003)), but no longer edit Topic/Category identity directly.
2. **Icon:** Topic/Category gains an admin-uploadable icon, replacing today's hardcoded, shape-inconsistent frontend assets.
3. **Translation-completeness validation:** the admin form warns when a configured language is missing a translation for a translatable field, instead of silently shipping a blank/fallback value.
4. **AI-assisted translation infrastructure:** a Platform-Admin-configurable **OpenRouter API key**, added as a new tab on the existing `GlobalSettings` page (same secret-field pattern as SMTP), used to machine-translate admin-authored text as a "demo-quality" starting draft — not a replacement for human review. Optionally, and only if low-effort, a translatable field/feature may carry a short fixed context string alongside the translation call (e.g. "this is a Case Handover system notice — keep it short, plain language, no jargon").
5. **Applied to `ConversationType` labels too:** the same translation-completeness + AI-assist infrastructure covers the four fixed `ADR-006` modality display labels. The four modality **values** and their distinct code paths are unchanged — only their user-facing name per language becomes admin-editable through this infrastructure. `ADR-006` is not reopened.
6. **Sequencing:** this ADR sets the schema/ownership direction now so the upcoming `ADR-003` Department migration (`UNIQUE(agency_id, topic_id)` + dedupe + Impressum column, decided the same session) doesn't need a second pass on `topic`/`agency_topic` later. Actual implementation of items 1–5 is explicitly **deferred as follow-on work after the mid-July mandatory AVV/Legal deliverables** — it is not part of that deadline.

## Consequences [#consequences]

**Positive:** one reusable translation-assist mechanism serves multiple features (Topic/Category names, ConversationType labels, and future candidates like Case Handover system-message copy) instead of a bespoke solution per feature; Platform-Admin gets clear, sole ownership of the shared taxonomy, removing the "each tenant has its own topics" confusion; reuses the proven `GlobalSettings` pattern instead of building a new settings surface.

**Negative / cost:** introduces an external dependency (OpenRouter) and a stored API key as a new platform-level credential to manage/rotate; AI-assisted translations are explicitly draft/demo quality and must be presented to admins as such, not as final copy; Tenant-Admins lose their current (narrow) ability to edit Topics directly, which is a permission narrowing to communicate before rollout.

## Alternatives considered [#alternatives-considered]

* **Keep per-tenant Topic catalogs as today:** rejected — perpetuates the "each Träger has its own topics" confusion and multiplies translation effort per tenant instead of once, globally.
* **A dedicated professional translation-management integration instead of an LLM/OpenRouter key:** rejected for now — heavier integration than needed for a "demo-quality" starting draft; not precluded later, since the API-key field is provider-agnostic in shape.
* **Let Platform-Admin define wholly new conversation types:** rejected for this decision — that collides with the still-undecided, much larger `ADR-001` "toggleable modality module" proposal and is explicitly out of scope here.

## Rollout (deferred — do only after mid-July mandatory work) [#rollout-deferred--do-only-after-mid-july-mandatory-work]

1. Migrate Topic/Category ownership UI from `UserRole.TenantAdmin`-gated to Platform-Admin-gated; keep Department-level (agency↔topic) linking on the Tenant/Agency side. Reuse existing Storybook list-view components rather than building new ones; add a preview popup so the admin sees what a Topic/Category will look like to end users before saving.
2. Add icon upload to Topic/Category.
3. Add a "Translation" tab to `GlobalSettings` (OpenRouter API key, optional per-feature context string), reusing `FormInputPasswordField` + `useSettingsAdminMutation`.
4. Add translation-completeness validation to Topic/Category admin forms.
5. Introduce a minimal translated-label store for the 4 fixed `ConversationType` values (new small reference table or JSON blob — technical shape not yet decided, low-risk/reversible) and wire the same completeness check + AI-assist to it.
