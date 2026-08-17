# ADR-014: Shared legal-text objects, multi-topic agencies, and topic-before-consent

- **Status:** Accepted — Frank, 2026-07-16 (grill-with-docs session)
- **Date:** 2026-07-16

> **Number collision resolved 2026-08-08 (ORISO-Docs#73).** A second accepted ADR also carried
> the number 014 (media scanning via the Matrix content scanner). It was the later decision
> (2026-07-18) and became **ADR-019**. This record keeps 014, so an unqualified "ADR-014" now
> means shared legal text objects and topic-before-consent.

> **Extended 2026-08-16 by `ADR-021`.** Nothing here is reversed. ADR-021 adds what this record
> does not cover: the **platform level above the Träger**, a **generic version history** for legal
> texts (today only the AVV has one), and the **consent sentence as a field of the DPP**. The
> topic-before-consent invariant below is unchanged and is the reason Gate 2 in `ADR-022` can
> resolve a department document at all.

- **Deciders:** Frank + AI
- **Related:** `ADR-003` (Department = unique Agency × Topic — **partially superseded by this ADR**, see below);
  `ADR-021` (hierarchy, versioning, consent text — extends this record); `ADR-022` (consent gates);
  `ADR-009` (global Topic ownership); `CONTEXT-topics-categories-departments.md`;
  `CONTEXT-domain-caritas-diakonie-online-counselling.md` (Org → Tenancy Mapping);
  QDL epic ORISO-Frontend#181 (QR code & direct links)

---

## Context

ADR-003 correctly made the Department = unique (agency_id, topic_id) the carrier of the
individualised Impressum + DPP. But two of its implementation choices turned out to violate the
result the domain actually needs:

1. **The single-select admin topic picker** (ADR-003 decision #3, shipped as ORISO-Admin PR #244)
   forces one topic per agency. Real Beratungsstellen host several independent Fachbereiche under
   one roof; modelling that as one agency per topic would multiply the same real-world entity
   (same address maintained N times) and corrupt any future resource management. The DB never
   forbade multi-topic agencies — `UNIQUE(agency_id, topic_id)` only forbids the *same* topic
   twice. The QDL direct-link epic (#181/#184, "restrict topic options to `agency.topicIds`")
   also presupposes multi-topic agencies.
2. **Inline legal-text storage** (the 2026-07-07 reconcile: keep `agency_topic.content_dpp` /
   `content_imprint` inline, drop the `dpp_id`/`imprint_id` references) makes sharing impossible:
   one DPP that legally covers four Fachbereiche must be pasted and maintained four times — the
   same duplication disease at the text level.

Additionally, the QDL direct-link flow (QDL-02, #183) planned the topic pop-up *after* account
creation — but privacy consent happens *during* account creation, and the department-specific
DPP/Impressum can only be resolved once (agencyId, topicId) are known. Choosing the topic after
consent means the client consented to the wrong (tenant-fallback) document.

Three invariants drive this decision (Frank, 2026-07-16):

- **No duplicated real-world entities.** One Beratungsstelle = one agency row, however many
  topics it serves.
- **Flexible legal-text assignment.** One text may cover many Fachbereiche, or each may have its
  own — an authoring decision, not a schema constraint; never maintained in N copies.
- **Unambiguous consent.** It must always be clear which counselling body a consultant belongs to
  and exactly which legal texts the help-seeker consents to.

## Decision

1. **Agencies are multi-topic again.** The admin topic picker returns to **multi-select**
   (reverses ADR-003 decision #3 / ORISO-Admin PR #244). Existing multi-topic agencies are
   **valid data**, not dirt to clean up. Department = unique (agency × topic), the `UNIQUE`
   constraint, and the draft|published lifecycle from ADR-003 all stand unchanged.
2. **Legal texts become first-class shared objects.** New `legal_text` entity
   (id, tenant_id, kind = DPP | IMPRINT, label, multilingual content, publication_status).
   `agency_topic` references them via **nullable `dpp_id` / `imprint_id`** (reverses the
   2026-07-07 "keep inline, drop references" reconcile). Several departments may point at the
   same text; editing a shared text warns "used by N departments" and offers fork-as-copy.
3. **Migration is additive:** lift existing inline `content_dpp`/`content_imprint` into
   `legal_text` rows, merge byte-identical texts into one shared row, set the references; keep
   the inline columns as read-fallback for one release, then drop them.
4. **Unassigned = tenant fallback.** A department without an assigned text falls back to the
   tenant-level document (today's behaviour). No auto-created empty drafts.
5. **Topic-before-consent invariant:** in every registration path — normal flow and all QDL
   direct links (`cid`/`aid`/`tid`) — **agency + topic (= the department) must be determined
   before the consent step**, so the consent screen always shows the correct department
   DPP/Impressum. Concretely: a counsellor link without `tid` shows the topic pop-up as the
   *first* screen after opening the link (QDL-02 order corrected); per-topic links/QR codes
   (`aid`+`tid`, `cid`+`tid`) are the department-level variant and skip the pop-up.

## Consequences

**Positive:** no phantom duplicate agencies (addresses maintained once; resource management stays
accurate); "one text for four Fachbereiche" is a pointer, not four copies; consent is always
against the resolvable department document; the QDL epic's center QR (`aid`) and department QR
(`aid`+`tid`) map 1:1 onto the model; the client-side `DepartmentLegalSection` keeps working
unchanged (only the backend resolution source changes).

**Negative / cost:** reverses two already-merged pieces of work (Admin #244 single-select; the
inline-text reconcile in AgencyService `0021`/`0023`); a new entity + admin surface
(legal-text library, per-department assignment) must be built; a backfill/dedup migration is
required; QDL-02 (#183) must reorder its pop-up.

## Alternatives considered

- **One agency per topic ("Design B"):** rejected — duplicates the same physical Beratungsstelle
  per topic, multiplies address maintenance, and fabricates entities that do not exist in the
  real world, corrupting resource management.
- **Keep inline per-department texts:** rejected — sharing one legally identical text across
  departments degenerates into N maintained copies; exactly the duplication the domain forbids.
- **Topic selection after consent (QDL-02 as originally specced):** rejected — the client would
  consent before the applicable department document is knowable.
