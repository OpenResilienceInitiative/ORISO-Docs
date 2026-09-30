# Platform ADRs

This directory holds the platform-level architecture decision records (ADRs) imported from a
previously-untracked local folder (`/Users/frankgerhardt/ORISO/0 - Docs/`, `ADR-*.md` files only,
not its `_artifacts/` subfolder). The series was re-synchronised on 2026-08-17 from the same local folder (23 files, ADR-001 to ADR-023, one per number) so that the published documentation site renders the current text.

## Decisions authored after the import

- `ADR-020-scheduled-calls-secure-invitations-and-unified-contact-calendar.md` — accepted
  2026-08-12; governs secure call invitations, planned audio/video contacts, availability,
  the unified Contact Calendar, and the Future Timeline.
- `ADR-021`, `ADR-022`, `ADR-023` — accepted 2026-08-16 (legal-text hierarchy and versioning,
  consent gates and re-consent, Platform Services Agreement and Träger governance).
- `ADR-024`, `ADR-025`, `ADR-026` — accepted 2026-09-15, added to this series 2026-09-22; the
  transactional e-mail set of EPIC `ORISO-Frontend#828` (notification matrix as two lists,
  UserService rendering notification mails instead of the upstream MailService, tenant branding
  contract for e-mail). Each carries an implementation-status table measured on `dev` 2026-09-22;
  ADR-025 is not implemented on `dev`, ADR-024 and ADR-026 are in part.

  Note for readers of the delivered code: it cites these three decisions as `ADR-019`, `ADR-020`
  and `ADR-021`. In this series those numbers are media scanning, scheduled calls and the
  legal-text hierarchy. The e-mail decisions are 024–026; the code references still have to be
  corrected (listed in each ADR).

New decisions in this section are repository-owned records and are not part of the unchanged
19-file import described above.

## Known issues

- **ADR-014 numbering collision — resolved 2026-08-08 (ORISO-Docs#73):** the media-scanning
  decision (accepted 2026-07-18) was renumbered to `ADR-019`; `ADR-014` now unambiguously means
  shared legal text objects and topic-before-consent. Both files carry a note about the change.
- **The numbers circulating in conversation are not always these numbers (checked 2026-09-05,
  not corrected — renumbering would break every existing citation):** the assignment
  "ADR-003 = AVV/Legal, ADR-014/015 = virus scanner, ADR-019 = silent key backup" that appears in
  chats and notes does **not** match the files here (014 = legal-text objects, 015 = per-chat-type
  media flags, 019 = media scanning). When in doubt, the filename and the H1 title of the file in
  this directory are authoritative; they agree for all 26 records. See also
  `../dsfa-analysis/dsfa-alt-neu-vergleich.md` §3.
- **The silent key backup / key recovery decision has no ADR file** — it is referred to as
  "ADR-019" in project notes, but that number belongs to media scanning. A record still has to be
  written; it must take the next free number, not 019.
- **`ADR-SECURITY-02-unified-crypto-boundary.md` lives in `ORISO-UserService/documentation/`** and
  is outside this numbering. It belongs into the canonical series; not moved here yet.

## Other local ADR collections NOT imported here

Two other local ADR collections exist and were deliberately excluded from this import because
they need manual reconciliation first:

- `0 - Docs M4_Frank/ADR-001..004.md` — an older, possibly-superseded duplicate of ADR-001–004.
- `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — a completely different, unrelated ADR
  series that happens to reuse the same numbering.

Both need a human to reconcile against the series imported here before they can be merged in.
