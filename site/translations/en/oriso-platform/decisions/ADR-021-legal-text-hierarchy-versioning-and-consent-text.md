# ADR-021: Legal-text hierarchy, generic versioning, and the consent text as a field of the DPP

- **Status:** Accepted — Frank, 2026-08-16 (grill-with-docs session)
- **Date:** 2026-08-16
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-003` (Department = Agency × Topic carries imprint + DPP) and `ADR-014`
  (shared legal-text objects, topic-before-consent) — **both extended by this ADR, neither
  superseded**; `ADR-022` (consent gates in counselling sessions — the runtime half of this
  decision); `ADR-023` (platform-to-Träger governance); `CONTEXT-legal-documents.md`;
  `PLAN-dsfa-living-document-2026-08-13.md`
- **Scope note:** this ADR is about the *documents*. When they are shown, and how a help-seeker's
  agreement is recorded, is `ADR-022`. What the platform and a Träger sign between themselves is
  `ADR-023`.

---

## Context

ADR-003 and ADR-014 established that a Department (Agency × Topic) carries its own imprint and
data-protection policy (DPP), and that legal texts should be shareable objects rather than
duplicated inline strings. Both are correct and remain in force. Neither describes the **complete
ladder of levels**, and neither addresses **versioning** or the **consent sentence** that a
help-seeker actually ticks.

That gap produced repeated, expensive confusion — most visibly a trivial live-chat modal bug that
was re-diagnosed three times because nobody could state which document applies at which point in
the flow.

### Measured current state (2026-08-16, `origin/pre-dev` unless noted)

**Four levels exist, not the two or three usually assumed:**

| # | Level | Storage | Fields |
|---|---|---|---|
| 1 | Platform operator | "main tenant" under single-domain multitenancy, `SingleDomainTenantOverrideService` | `contentImpressum`, `contentPrivacy` |
| 2 | Träger (tenant) | `tenant` | same two, plus `contentPrivacyActivationDate` |
| 3 | Beratungsstelle (agency) | `agency` | `contentDpp`, `contentImprint` (agency-wide, deliberately without publication status) |
| 4 | Fachbereich (Department = agency × topic) | `agency_topic` | `contentDpp`, `contentImprint`, each with its own publication status |

Resolution runs upward: `DepartmentLegalService` takes the published department text, else the
agency-wide text (lines 65–66 / 75–76). Level 1 versus level 2 is decided by the application
setting `legalContentChangesBySingleTenantAdminsAllowed`; when it is on, a Träger **replaces** the
platform text rather than adding to it.

**There is no version history for legal texts.** `legal_text` carries only
`publication_status` DRAFT/PUBLISHED and no archive table. The only versioned legal object in the
whole system is the AVV (`tenant_dpa_version`, TenantService changeset 0018, endpoint
`/tenantadmin/{id}/dpa/versions`). Publishing a new DPP or imprint overwrites the previous wording
without trace — so today no Träger can prove which policy was in force on a given date.

**The editor already supports versions; only the data source is missing.** `M3RichTextEditor`
implements the full version UI (selection, "online since", "adopt as new draft", comparison), but
its `versions` prop is populated exclusively by `DataProcessingAgreementCard`. `LegalText/index.tsx`
and `DepartmentDataProtectionCard` use the same component without version data, and the Admin API
layer has only `getDpaVersions.ts`.

**The consent sentence is static frontend i18n.** It is assembled from three fragments
(`registration.dataProtection.label.{prefix,and,suffix}` in `AccountData.tsx`) around the legal
links. No backend involvement, no configurability. A `LegalConsentTemplateEditor` exists in the
PlaceholderTemplate module with `{{Beratungsstelle}}`, `{{Thema}}`, `{{legal_links}}` tokens — as a
Storybook component without a backing feature.

**Inheritance is asymmetric.** Department → agency is resolved server-side by
`DepartmentLegalService`; → Träger happens client-side (Admin `mergeTranslatedContent`, Frontend
`pickConsentPrivacyContent`).

**Additional constraints found:** `legal_text.kind` is a free `varchar(20)` with no CHECK
constraint; `/agencies/{id}/topics/{tid}/legal` returns raw, unrendered text (no Freemarker on that
path, so placeholders reach the browser verbatim); the existing backend renderer is Freemarker,
where `${...}` can invoke object methods.

## Decision

1. **The ladder has four levels and the platform level is named.** Platform operator → Träger →
   Beratungsstelle → Fachbereich, resolved bottom-up with fallback. Any document reference in code,
   tickets, or UI states its level. "The privacy policy" without a level is not a valid statement.

2. **Replacing is sufficient; the guarantee moves into validation.** A Träger text replaces the
   platform text rather than being appended to it. One sentence, one checkbox. What protects the
   platform's mandatory disclosures is **not** a legal stacking rule but a technical one: a consent
   text **cannot be published** unless it contains the `{{legal_links}}` token — validated
   server-side with an editor error — and the cookie/authentication notice is rendered as a fixed,
   non-editable addendum beneath the sentence.

3. **A generic legal-text version history is built**, for DPP, imprint, and future kinds, on all
   levels. The AVV mechanism (`tenant_dpa_version`) is the blueprint; this is copying, not
   inventing. A generic mechanism is *less* work than a special case for the DPP alone — same
   table, same endpoint, same editor wiring, distinguished by kind. It also closes a standing
   compliance gap.

4. **The consent text is a field of the data-protection policy, not its own legal-text kind.**
   Changing the consent wording means publishing a new DPP version whose body text may be
   unchanged. This yields one history instead of two, and makes "which consent belonged to which
   policy" trivially answerable (same version) instead of reconstructed from timestamps — timestamp
   correlation was already a defect source in the AVV work (second precision versus MariaDB
   `DATETIME(0)`).

5. **Placeholder substitution is split by who owns the data.** The server substitutes what it
   knows (`{{Beratungsstelle}}`, `{{Thema}}`, contact data); the client substitutes
   `{{legal_links}}` with the real, clickable links, because those come from the frontend
   deployment configuration (`LegalLinksProvider` / `settings.legalLinks`) and the backend does not
   know them.

6. **Token syntax is `{{key}}`, never Freemarker `${key}`.** Träger-authored text must never pass
   through Freemarker: `${...}` can call object methods there, which makes tenant-authored content a
   template-injection surface. A plain `{{key}}` replacement cannot do that by construction. The
   product consequently carries two dialects — `${}` for the existing DPP placeholders
   (`responsible`, `dataProtectionOfficer`), `{{}}` for mails and the consent text. Unifying them is
   a separate concern, deliberately deferred.

7. **The imprint is an information duty and never a consent gate.** It requires guaranteed
   reachability on every level; it is never ticked, never blocks, and never triggers re-consent.
   Only the DPP (and, between platform and Träger, the documents in ADR-023) are consent-bearing.

8. **The platform template and the platform's own governing document are separate objects.** The
   template that pre-fills a Träger's consent text carries no legal force; the main tenant's own
   DPP governs whenever no Träger is resolved. Editing the template must never change the document
   in force for unassigned visitors.

9. **Inheritance becomes server-side end to end.** The department → agency → Träger → platform
   chain resolves in one place on the server. The present client-side half (Admin
   `mergeTranslatedContent`, Frontend `pickConsentPrivacyContent`) is a defect source that the
   consent text would otherwise inherit.

## Consequences

**Positive:** every legal document has a resolvable level and a provable history; the "which text
applied when" question becomes answerable for the first time; the consent sentence becomes a Träger
responsibility without the platform losing its mandatory disclosures; one version pointer covers
both the policy and its consent wording (see ADR-022); the existing editor UI is reused as-is.

**Negative / cost:** an archive table plus endpoints per legal-text kind; a validation path for the
mandatory token; the client-side inheritance half has to be moved server-side; two token dialects
coexist until a later unification; the Admin needs version selection wired onto the legal-text cards
that already support it.

## Alternatives considered

- **Append the Träger text to the platform sentence, or show two checkboxes.** Rejected: two
  documents governing the same processing eventually contradict each other, and two ticks is a worse
  user experience. Liability is instead secured by decision 2.
- **`legal_text.kind = CONSENT` as its own object with its own `consent_id` slots.** Migration-free
  (the column has no constraint), but requires a second version history and extends four OpenAPI
  enums, and reintroduces the correlation problem decision 4 removes.
- **Version history for the DPP only.** Rejected: more work than the generic mechanism, and leaves
  the imprint gap open.
- **Substitution entirely client-side or entirely server-side.** Client-only cannot reach agency
  contact data and breaks email/PDF renderings of the same text; server-only would require migrating
  the link targets out of the frontend deployment configuration.
