# Architekturentscheidungen (ADR) (/decisions)



Diese Reihe ist die kanonische Sammlung der plattformweiten Entscheidungen. Die DSFA-Kapitel verweisen auf sie; jeder Verweis der Form `ADR-0NN` in den Kapiteltexten ist auf die jeweilige Seite verlinkt.

| Nr.                           | Entscheidung                                                                                                            | Status                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [ADR-001](/decisions/adr-001) | Counselling modalities as toggleable modules                                                                            | Proposed — needs a team decision (esp. how registration filt |
| [ADR-002](/decisions/adr-002) | Silent room membership with an access-control confidentiality curtain (not E2EE)                                        | Accepted — Frank, 2026-06-25 (team ratification pending)     |
| [ADR-003](/decisions/adr-003) | Department = unique (Agency × Topic) carrying its own imprint + DPP                                                     | Accepted — Frank, 2026-06-25 (team ratification pending)     |
| [ADR-004](/decisions/adr-004) | Keep the custom chat UI; adopt matrix-js-sdk Megolm under it (don't embed Element Web)                                  | Accepted — 2026-06-26 (grill-with-docs session). June-30 sco |
| [ADR-005](/decisions/adr-005) | Matrix federation deliberately OFF; real DNS server\_name via a clean homeserver rebuild                                | Accepted — 2026-06-26 (grill-with-docs session). Timing fixe |
| [ADR-006](/decisions/adr-006) | `conversation_type` as a persisted modality field, rolled out selector-first                                            | Accepted — 2026-06-28 (grill-with-docs session). Decision ma |
| [ADR-007](/decisions/adr-007) | Live-chat liveness — the indicator reads backend Availability, never mirrors or infers it                               | Accepted — 2026-06-28 (grill-with-docs session). Root causes |
| [ADR-008](/decisions/adr-008) | Supervision — keep per-session agency-scoped reach; move side-channels out of the client's room                         | Proposed — 2026-06-28 (grill-with-docs session); U25 cohort  |
| [ADR-009](/decisions/adr-009) | Global Topic/Category ownership and AI-assisted translation infrastructure                                              | Accepted — Frank, 2026-07-01 (grill-with-docs session). Desi |
| [ADR-010](/decisions/adr-010) | Platform-controlled per-Träger allowlist for the Erscheinungsbild (Appearance/Theme) section                            | Proposed — 2026-07-06 (this session); pending Frank's confir |
| [ADR-011](/decisions/adr-011) | Helm-only deployment; single-domain path-based routing supersedes per-service subdomains                                | Accepted — already implemented and live on Pre-Dev.          |
| [ADR-012](/decisions/adr-012) | Self-Help Group Chat — extend the existing Group Chat (don't rebuild), Megolm-first, future-timeline instead of a Lobby | Accepted — 2026-07-09; reconciled with live GitHub/code 2026 |
| [ADR-013](/decisions/adr-013) | 2FA via vendored otp-config SPI (not stock-Keycloak AIA)                                                                | Accepted · Date: 2026-07-11                                  |
| [ADR-014](/decisions/adr-014) | Shared legal-text objects, multi-topic agencies, and topic-before-consent                                               | Accepted — Frank, 2026-07-16 (grill-with-docs session)       |
| [ADR-015](/decisions/adr-015) | Per-chat-type media flag families replace `featureAttachmentUploadDisabled`                                             | Accepted · Date: 2026-07-18                                  |
| [ADR-016](/decisions/adr-016) | Team-Besprechung — separate side room per open enquiry, hard close at acceptance                                        | Accepted — Frank, 2026-07-18 (grill-with-docs session)       |
| [ADR-017](/decisions/adr-017) | Rebuild chat threads on native Matrix `m.thread` relations — hard cut, no dual-read                                     | Accepted — Frank, 2026-07-18 (grill-with-docs session)       |
| [ADR-018](/decisions/adr-018) | Erstantwort — one persisted event rendered as a Carimat bubble sequence, configured per Träger                          | Accepted — Frank, 2026-07-30 (grill-with-docs session)       |
| [ADR-019](/decisions/adr-019) | Media scanning via matrix-content-scanner, fail-closed, pluggable AI check                                              | Accepted · Date: 2026-07-18                                  |
| [ADR-020](/decisions/adr-020) | Scheduled calls, secure invitations, and a unified contact calendar                                                     | Accepted — 2026-08-12                                        |
| [ADR-021](/decisions/adr-021) | Legal-text hierarchy, generic versioning, and the consent text as a field of the DPP                                    | Accepted — Frank, 2026-08-16 (grill-with-docs session)       |
| [ADR-022](/decisions/adr-022) | Two consent gates, consent state as a session pointer, and re-consent on change                                         | Accepted — Frank, 2026-08-16 (grill-with-docs session)       |
| [ADR-023](/decisions/adr-023) | The Platform Services Agreement, living templates, and proportionate escalation                                         | Accepted — Frank, 2026-08-16 (grill-with-docs session)       |

## Herkunft und Pflege [#herkunft-und-pflege]

This directory holds the platform-level architecture decision records (ADRs) imported from a
previously-untracked local folder (`/Users/frankgerhardt/ORISO/0 - Docs/`, `ADR-*.md` files only,
not its `_artifacts/` subfolder). The series was re-synchronised on 2026-08-17 from the same local folder (then 22 files, [ADR-001](/decisions/adr-001) to [ADR-023](/decisions/adr-023)) so that the published documentation site renders the current text.

## Decisions authored after the import [#decisions-authored-after-the-import]

* `ADR-020-scheduled-calls-secure-invitations-and-unified-contact-calendar.md` — accepted
  2026-08-12; governs secure call invitations, planned audio/video contacts, availability,
  the unified Contact Calendar, and the Future Timeline.
* `ADR-021`, `ADR-022`, `ADR-023` — accepted 2026-08-16 (legal-text hierarchy and versioning,
  consent gates and re-consent, Platform Services Agreement and Träger governance).

New decisions in this section are repository-owned records and are not part of the unchanged
19-file import described above.

## Known issues [#known-issues]

* **[ADR-014](/decisions/adr-014) numbering collision — resolved 2026-08-08 (ORISO-Docs#73):** the media-scanning
  decision (accepted 2026-07-18) was renumbered to `ADR-019`; `ADR-014` now unambiguously means
  shared legal text objects and topic-before-consent. Both files carry a note about the change.

## Other local ADR collections NOT imported here [#other-local-adr-collections-not-imported-here]

Two other local ADR collections exist and were deliberately excluded from this import because
they need manual reconciliation first:

* `0 - Docs M4_Frank/ADR-001..004.md` — an older, possibly-superseded duplicate of [ADR-001](/decisions/adr-001)–004.
* `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — a completely different, unrelated ADR
  series that happens to reuse the same numbering.

Both need a human to reconcile against the series imported here before they can be merged in.
