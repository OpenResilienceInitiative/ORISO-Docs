# Platform ADRs

This directory holds the platform-level architecture decision records (ADRs) imported from a
previously-untracked local folder (`/Users/frankgerhardt/ORISO/0 - Docs/`, `ADR-*.md` files only,
not its `_artifacts/` subfolder). The series was re-synchronised on 2026-08-17 from the same local folder (then 22 files, ADR-001 to ADR-023) so that the published documentation site renders the current text.

## Decisions authored after the import

- `ADR-020-scheduled-calls-secure-invitations-and-unified-contact-calendar.md` — accepted
  2026-08-12; governs secure call invitations, planned audio/video contacts, availability,
  the unified Contact Calendar, and the Future Timeline.
- `ADR-021`, `ADR-022`, `ADR-023` — accepted 2026-08-16 (legal-text hierarchy and versioning,
  consent gates and re-consent, Platform Services Agreement and Träger governance).

New decisions in this section are repository-owned records and are not part of the unchanged
19-file import described above.

## Known issues

- **ADR-014 numbering collision — resolved 2026-08-08 (ORISO-Docs#73):** the media-scanning
  decision (accepted 2026-07-18) was renumbered to `ADR-019`; `ADR-014` now unambiguously means
  shared legal text objects and topic-before-consent. Both files carry a note about the change.
## Other local ADR collections NOT imported here

Two other local ADR collections exist and were deliberately excluded from this import because
they need manual reconciliation first:

- `0 - Docs M4_Frank/ADR-001..004.md` — an older, possibly-superseded duplicate of ADR-001–004.
- `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — a completely different, unrelated ADR
  series that happens to reuse the same numbering.

Both need a human to reconcile against the series imported here before they can be merged in.
