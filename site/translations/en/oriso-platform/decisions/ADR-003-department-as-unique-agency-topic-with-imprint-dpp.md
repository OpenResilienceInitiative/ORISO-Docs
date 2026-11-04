# ADR-003: Department = unique (Agency × Topic) carrying its own imprint + DPP

> **⚠️ Partially superseded by ADR-014 (2026-07-16).** Decision #3 (admin single-select
> topic picker) is REVERSED: one Beratungsstelle hosts several Fachbereiche, the admin
> topic picker is multi-select again, and legal texts are shareable `legal_text` objects
> (`dpp_id`/`imprint_id`). The UNIQUE(agency_id, topic_id) constraint and per-department
> imprint/DPP from this ADR remain in force. Read ADR-014 before acting on this document.
>
> **Also extended by `ADR-021` (2026-08-16).** The level ladder described here stops at the Träger;
> there is a platform level above it (main tenant, gated by
> `legalContentChangesBySingleTenantAdminsAllowed`). Legal texts also have no version history yet —
> `ADR-021` decides to build one generically. `ADR-022` covers when these documents are shown and
> how a help-seeker's agreement is recorded.

- **Status:** Accepted — Frank, 2026-06-25 (team ratification pending)
- **Date:** 2026-06-25
- **Deciders:** Frank + backend/admin leads
- **Related:** ADR-001 (modalities as modules — topic/agency/modality orthogonal);
  ADR-002 (silent membership); `ORISO-UserService/CONTEXT.md`; AgencyService `Agency`,
  `agency_topic`; TenantService `tenant.content_impressum` / `content_privacy`;
  `CentralDataProtectionTemplateService`

---

## Context

A "department" (e.g. *Debt counselling*, *Suicide prevention*, *Pregnancy* inside one
agency centre) is, in the domain diagram, an **(agency × topic)** pairing that must carry
its **own individualised imprint and data privacy policy**, because economically several
departments work "under one roof" but are legally distinct.

Today in code:
- `agency_topic` is a plain join with **no `UNIQUE(agency_id, topic_id)`** → the same topic
  can be linked to one agency multiple times ("duplicate topics"), which breaks any per-pair
  imprint/DPP mapping and makes routing ambiguous.
- **Imprint is per-tenant only** (`tenant.content_impressum`); **DPP is per-tenant content
  rendered with per-agency contact placeholders** (`CentralDataProtectionTemplateService`).
  Neither can be individualised per department.

The silent-membership routing (ADR-002) needs a clean "topic → the one department → its
counsellors + its imprint/DPP".

## Decision

1. **Department is the first-class unit** = a **unique** (agency_id, topic_id). Enforce
   `UNIQUE(agency_id, topic_id)`. Duplicate (agency, topic) becomes a **prevented data
   error**, not a supported case.
2. **Attach `imprint_id` + `dpp_id` to the department**, individualised per pairing
   (overriding/extending the tenant-level imprint and agency-rendered DPP).
3. **Admin topic picker becomes single-select** (was multi-select). Existing duplicate
   `agency_topic` rows are removed **before** the constraint is added. (ORISO is pre-prod with
   no real users → duplicates can simply be deleted/recreated, not carefully back-filled.)
4. **Imprint/DPP carry a `draft | published` status.** Counselling may start while the basis
   is still a **draft/unpublished** document; the draft state is **recorded in the audit/log**
   (provisional basis) rather than presented to the client as a finalised legal document.

## Consequences

**Positive:** unambiguous routing (topic → one department → counsellors + imprint/DPP); the
"each department its own individualised imprint/DPP" requirement is satisfied; duplicate-topic
class of bug is structurally prevented.

**Negative / cost:** a migration is required (dedup existing duplicates, backfill
`imprint_id`/`dpp_id`, then add the constraint); imprint moves from tenant-only to a
department-level object (new tables/columns across AgencyService and/or TenantService); admin
UX change (single-select + dedup tooling); draft/published lifecycle adds state to manage.

## Alternatives considered

- **Support duplicate topics, each with its own imprint** (reject): ambiguous routing — "topic
  → which of the duplicate departments?" has no clean answer; the bug class persists.
- **Keep imprint per-tenant only** (reject): cannot individualise per department, which is the
  whole legal requirement.

## Implementation status (2026-07-01)

The DPP half of this decision is already built and live on `dev` (`agency_topic.content_dpp` +
`publication_status`, `DepartmentDataProtectionService` — commits `54fe868`/`a84e81a`). Confirmed
in a grill-with-docs session: the remaining work — the `UNIQUE(agency_id, topic_id)` constraint +
dedupe migration, and the still-missing per-department Impressum column (the `imprint_id` half) —
will be built together in one slice, since both touch `agency_topic`. See also `ADR-009` (Topic
itself stays global; Department is only where the legal texts live).

## Implementation status (2026-07-03)

Verified 2026-07-03: `UNIQUE(agency_id, topic_id)`, the dedup migration, and the
`imprint_id`/`dpp_id` reference columns exist ONLY on the stale local branch
`feat/adr-003-department-agency-topic-unique` in ORISO-AgencyService (base 55 commits behind
`dev`, pre-AVV; its changeset dir `0021_agency_topic_department` collides with dev's
`0021_agency_topic_legal` and its SQL lacks `IF NOT EXISTS`). Dev stores DPP inline
(`agency_topic.content_dpp`), the local branch models references — mutually inconsistent, needs
rebase + renumber + a reconcile decision (recommend: keep inline `content_dpp`, drop `dpp_id`;
keep imprint as a `content_imprint` inline column for symmetry). Per-department imprint not
started anywhere. `AgencyTopicRepository.findByAgency_IdAndTopicId` already assumes uniqueness
(`Optional` return). Tracked as ORISO-UserService#203 under EPIC #205.

## Implementation status (2026-07-07)

The 2026-07-03 note above is **superseded** — the reconcile it recommended was carried out and
the whole backend now lives on `dev` (the stale reference-column branch was abandoned):

- **AgencyService (done, on `dev`):** changeset `0023_agency_topic_department` runs the dedup, adds
  `UNIQUE(agency_id, topic_id)` (guarded by an `onFail=MARK_RAN` precondition), and adds the inline
  `content_imprint` + `publication_status_imprint` columns — mirroring the existing inline
  `content_dpp`/`publication_status` from `0021`. `dpp_id`/`imprint_id` reference columns were
  dropped as recommended. `AgencyTopic` carries all four fields with a `@PrePersist` NOT-NULL guard.
  Admin API exposes per-department **read + publish** for both DPP and imprint (commit `a2e638f`,
  IDOR-scoped to the caller's agencies). Public, published-only read side is `DepartmentLegalService`
  (draft/never-authored → `null`) wired into `AgencyController`.
- **Admin FE — PR opened:** the agency topic picker becomes **single-select** (was multi-select) —
  the last open acceptance item of #203. The 2026-06-26 attempt (`02435c3`) was never merged and
  `dev` diverged, so it was re-applied fresh onto current `dev`, then hardened: the id-normalisation
  logic (previously duplicated across `addAgencyData.ts`, `updateAgencyData.ts`, and the Edit page)
  was unified into one `normalizeTopicIds()` helper, and test coverage was added where there was
  none before — `updateAgencyData.ts` had zero tests prior to this PR. See
  [ORISO-Admin#245](https://github.com/OpenResilienceInitiative/ORISO-Admin/pull/245)
  (`fix/adr-003-agency-single-topic-picker`), not yet merged.

Remaining after this slice: the client-facing render of the department imprint/DPP is part of the
broader case-handover client view (#204), not ADR-003 proper.
