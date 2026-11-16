# ADR-035: Configurable first-reply module per conversation type

- **Status:** Proposed — Frank, 2026-11-16 (decisions taken in the platform-greeting session); needs product sign-off on this written form before it is treated as canonical.
- **Date:** 2026-11-16
- **Deciders:** Frank (product) + AI (engineering)
- **Amends:** ADR-018 decisions 1, 2, 5 and 6 (fixed Baustein catalogue, single free Baustein, platform-owned ordering, no toggle on safety Bausteine). ADR-018 decisions 3, 4, 7–11 stay as they are.
- **Related:** ADR-018 (Erstantwort as one persisted event), ADR-010 (platform allowlist shape), ORISO-UserService#1565 (no platform wording for "who reads along"), ORISO-Admin#601 (centre level), ORISO-Frontend#825 (client-side trigger), branches `feat/platform-greeting-override` (UserService) and `feat/platform-greeting-tab` (Admin)
- **Trigger:** While building the platform and centre overrides for the fixed greeting texts, Frank asked for the first reply to become a configurable module: take the shipped, translated prototype apart, delete or reorder sections, add own sections with a title and an open/collapsed state — and do this separately per conversation type, because live chat and group conversations already greet differently and internal conversations have no greeting at all.

---

## Context

ADR-018 made the Erstantwort a fixed catalogue of Bausteine with exactly one free text and a platform-owned order. The first implementation (UserService `ErstantwortPayloadBuilder`, Frontend `ErstantwortSequence`) hard-codes the layout: greeting open, FAQ-like questions collapsed, emergency numbers last in red and collapsed, closing open. Editing works per text field only (Träger in TenantService `content.erstantwort*`; platform and centre overrides on the two branches above, in UserService table `erstantwort_text_override`).

Three things do not fit that shape:

1. **One sequence for all conversation types.** Agency counselling (`AGENCY_COUNSELLING`), live chat (`LIVE_CHAT`) and group conversations (`SELF_HELP`) already show different greeting formats; internal groups (`INTERNAL_GROUP`) show none. A single catalogue cannot express that, and the code branches on `conversationType` in several places instead.
2. **Text-only editing.** A Träger that does not want to show a crisis line, or wants an extra paragraph, has no way to say so except by abusing the one free Baustein.
3. **The sequence already is an accordion of messages.** Every visible unit is either a plain chat message or a titled panel that starts open or collapsed. The configuration should describe exactly that, rather than a list of named text slots.

## Decision

1. **One first-reply module per conversation type.** Each conversation type (`AGENCY_COUNSELLING`, `LIVE_CHAT`, `SELF_HELP`, `INTERNAL_GROUP`, and any type added later) has its own configuration. A type without a configuration sends no first reply; `INTERNAL_GROUP` ships empty, which is today's behaviour.

2. **The module is an ordered list of sections built from a shipped prototype.** The platform ships one translated prototype per conversation type (all seven language versions, today's wording, gender-neutral per ADR-018 decision 7). An editor starts from the prototype and may delete sections, reorder them and add own sections. Each section has:
   - a **kind** (see decision 3),
   - a **title** (required for panels, absent for a plain message),
   - a **display state**: `open` (shown as text) or `collapsed` (title only, expands on tap),
   - per-language content, written in German and machine-translated on publish as today.

3. **Section kinds.** Three kinds, deliberately few:
   - **Message** — a plain chat bubble with text. The greeting and the closing are messages.
   - **Panel** — a titled accordion panel with rich text. The emergency numbers, "who reads along" and the free notice are panels.
   - **Fixed module** — a platform component the editor can place and title but whose behaviour and data come from the system: the e-mail module (address collection, still subject to ADR-018's conversation account controls), the consent card, the account-completion card. A fixed module renders live state and is never free text (ADR-018 decision 2's guardrail survives here).

4. **Closing questions are part of the module.** Each conversation-type tile in the Admin shows two direct fields — **Begrüßung** (opening message) and **Abschließende Fragen** (closing questions) — and one button that opens the full configurator as a dialog. The configurator adds questions of three types: free text, single select, multi select; and hints of the kinds in decision 3. Answers to closing questions are stored with the conversation, not in the frozen event (decision 7).

5. **Who may change what.** The resolution chain of ADR-018 decision 6 stays — `Beratungsstelle ?? Träger ?? Plattform ?? shipped prototype` — but it now resolves **whole modules per conversation type**, not single texts. The most specific level that saved a module for that type wins as a whole; there is no per-section merging across levels. Within its own module an editor may:
   - remove, reorder and retitle every section, **including the emergency numbers and "send us no personal data"**, and change any section's display state;
   - add sections and closing questions.

   This deliberately replaces ADR-018's interim rule that the two safety Bausteine have no toggle. Product decision (Frank, 2026-11-16): whoever builds the module is responsible for its safety content. The Admin shows a warning when a saved module for `AGENCY_COUNSELLING`, `LIVE_CHAT` or `SELF_HELP` contains no emergency section, but does not block saving.

6. **Ordering against consent is still the platform's.** Section order is free, but section *triggers* (chat entry · after the first message · after dispatch · after assignment) stay platform-assigned per fixed-module kind, so no configuration can move a data-collecting module before consent (ADR-018 decision 5 survives for triggers).

7. **Delivery is unchanged.** The resolved module is still frozen into one `[SYSTEM_NOTIFICATION]` event at send time (ADR-018 decision 3 and 4); the payload gains `version: 2` with the ordered section list (`kind`, `title`, `display`, `body` or `module`). Clients render version 1 events as today, so history stays readable.

8. **Storage.** One row per (scope, scope id, conversation type) holding the module as versioned JSON, in UserService next to `erstantwort_text_override`. The text-override rows written by the first platform/centre slice are migrated into a module for `AGENCY_COUNSELLING` at the matching level, so nothing an editor saved is lost. Träger content in TenantService `content.erstantwort*` is migrated the same way.

## Consequences

- **The platform/centre override PRs are held** and land together with the builder as one PR set (Frank, 2026-11-16). Their storage, access checks (`AdminScope`) and translation flow are reused; their fixed-slot editors are replaced by the configurator.
- **Storybook first:** the configurator (tile with two fields, dialog, section list, question types, prototype reset) is prototyped in ORISO-Admin Storybook before any backend change; the Frontend renders version 2 payloads in `ErstantwortSequence` stories against the same fixtures.
- **Translation of closing questions** reuses the TenantService translate endpoint. A centre-only admin still cannot call it (`AUTHORIZATION_UPDATE_TENANT`); they publish without machine translation, and missing languages fall back as in ADR-018 decision 8.
- **Loss of one guarantee:** ADR-018 guaranteed that every advice seeker sees emergency numbers. Under this ADR that holds only while the editor keeps the section. The warning in decision 5 and the audit columns (`updated_by`, `update_date`) are the remaining controls; the DSFA transparency record must say so.
- **ORISO-Frontend#825** (client-side trigger without a server event) must read the resolved module instead of the fixed catalogue, or be retired.
- **Answers to closing questions** are new personal data in a special-category context. Before they are stored, the DSFA needs an entry (purpose, retention, who reads them); until then closing questions can be configured and shown but answers are not persisted.

## Rejected

- **Keep the fixed catalogue and add toggles per Baustein.** Covers "hide the crisis line" but not own sections, ordering or per-type formats.
- **Per-section inheritance across levels** (a centre changes one panel and inherits the rest from the Träger). Makes every module a merge of up to four sources, so no editor can see what is actually sent; whole-module resolution keeps "what you see is what goes out".
- **One module for all conversation types with per-section type filters.** Harder to read than four short lists, and internal groups would still need an "everything off" special case.
