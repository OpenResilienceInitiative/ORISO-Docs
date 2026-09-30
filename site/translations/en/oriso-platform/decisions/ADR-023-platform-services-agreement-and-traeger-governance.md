# ADR-023: The Platform Services Agreement, living templates, and proportionate escalation

- **Status:** Accepted — Frank, 2026-08-16 (grill-with-docs session)
- **Date:** 2026-08-16
- **Deciders:** Frank (product) + AI (engineering)
- **Related:** `ADR-021` (legal-text hierarchy and versioning); `ADR-022` (help-seeker consent);
  EPIC AVV / DPA work (`ADR-003` era, `tenant_dpa_version`, `DpaLegalForm`);
  `PLAN-dsfa-living-document-2026-08-13.md` section 7.6 (proportionality of compliance
  escalations); `CONTEXT-legal-documents.md`
- **Scope:** the relationship between the **platform operator** and a **Träger**. The help-seeker
  does not appear in this ADR.

---

## Context

The admin module presents the Auftragsverarbeitungsvertrag (AVV) as if it were the whole agreement
between platform operator and Träger. It is not — it is one annex. Alongside it sit the service
terms, the technical and organisational measures, the subprocessor list, and references to further
documents such as the DPIA. A Träger signing "the AVV" is in fact concluding a contract of which the
AVV is one part, and the module both mis-names and under-shows what is being signed.

Separately, ADR-021 introduces a platform template that pre-fills a Träger's consent text. A
template without a maintained connection to its origin is a copy: legal corrections made centrally
never reach the Träger who copied it a year earlier.

And once the platform can require a Träger to adopt something, the question of what happens on
refusal becomes a product decision with safety consequences. ORISO carries U25 suicide prevention;
an enforcement mechanism that terminates counselling would endanger the very people the
data-protection rule exists to protect.

## Decision

1. **The agreement is named as a contract, and the AVV is an annex to it.**

   | | German (UI, Träger-facing) | English (code, ADRs, GitHub) |
   |---|---|---|
   | The whole | **Plattformvertrag** | **Platform Services Agreement** |
   | Annex 1 | Auftragsverarbeitungsvertrag (AVV), Art. 28 GDPR | Data Processing Agreement (DPA) |
   | Annex 2 | Technische und organisatorische Maßnahmen (TOM), Art. 32 | Technical and Organisational Measures |
   | Annex 3 | Unterauftragsverarbeiter | Subprocessor list |
   | Annex 4 | Leistungsbeschreibung / Nutzungsbedingungen | Service description / terms of use |
   | Alongside | Verweise (DSFA, Datenschutzerklärung der Plattform) | References — linked, not co-signed |

   The act is **Vertragsabschluss**; the record is an **Unterzeichnung** carrying signing date,
   signing person, and their role. "Vereinbarung" is not used: a Träger concludes a binding contract
   by clicking, and the wording should say so. In English, "Agreement" is the standard binding term
   and is kept. Entities read `platform_agreement`, `agreement_annex`, `agreement_signature`.

   This renames and re-frames an existing module; it does not change who signs what. Existing AVV
   tickets are **renamed**, not replaced.

2. **The platform template keeps a living connection to its origin.**
   - A Träger text records **which template version** it was derived from. This costs nothing extra,
     because ADR-021 decision 3 gives the template versions anyway.
   - When the platform operator publishes a new template version, every Träger text with an older
     reference is automatically "outdated" — a number comparison, not a notification system.
   - The Admin shows a hint with a **side-by-side comparison**. Adopting means the Träger publishes
     their own new version containing the changes; declining clears the hint.
   - The existing "new from template" split button in the PlaceholderTemplate module is exactly this
     mechanism.

3. **The template and the platform's own governing document are separate objects.** A template is a
   pattern with no legal force; the main tenant's own DPP governs whenever no Träger is resolved.
   Editing a suggestion must never set law for unassigned visitors. (Also recorded as ADR-021
   decision 8, because it constrains the data model there.)

4. **Every template change is marked recommended or mandatory.** Only "mandatory" carries a
   deadline. Cosmetic changes may be ignored without consequence; a change forced by law may not.

5. **Escalation is staged and has a hard limit.** If a Träger does not adopt a mandatory change by
   the deadline: hint → warning banner → **suspension of new registrations** for that Träger.

   **Non-negotiable:** running counselling sessions, logins of existing help-seekers, and access to
   existing histories are **always** preserved. Data-protection enforcement must never endanger the
   protected interest it exists to serve. The model is the existing AVV gate, which hard-blocks only
   the creation of new Beratungsstellen and otherwise warns. This principle applies platform-wide and
   answers GDPR Art. 35(7)(d) (remedies including safeguards for data subjects); it is recorded as
   section 7.6 of the DPIA plan.

## Consequences

**Positive:** a Träger sees what they are actually signing; central legal corrections reach every
Träger without a push channel; the platform can enforce what the law requires without acquiring the
power to cut off counselling; the naming stops implying that the AVV is the entire relationship.

**Negative / cost:** the admin module grows from one document to a contract with annexes; a
derivation reference plus outdated detection plus a comparison view have to be built; the deadline
and escalation logic is new; UI wording, ADR titles, entity names, and existing tickets have to be
renamed consistently in one pass.

## Alternatives considered

- **Keep calling it "Vereinbarung".** Rejected — too weak for something concluded by clicking, and
  it obscures that the AVV is only one part.
- **Plain copy of the template with no connection.** Rejected — legal corrections would never reach
  the Träger.
- **Template stays authoritative, the Träger only appends.** Rejected — contradicts ADR-021
  decision 2 (one sentence, one checkbox).
- **Warning only, no consequence.** Rejected — a Träger could indefinitely sit out something legally
  required.
- **Automatic adoption after the deadline.** Rejected — the Träger would have published a text they
  never read.
- **Suspending logins or terminating sessions on non-compliance.** Rejected outright; see decision 5.
