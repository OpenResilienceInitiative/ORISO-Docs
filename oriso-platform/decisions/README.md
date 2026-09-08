# Platform ADRs

This directory holds the platform-level architecture decision records (ADRs) imported from a
previously-untracked local folder (`/Users/frankgerhardt/ORISO/0 - Docs/`, `ADR-*.md` files only,
not its `_artifacts/` subfolder). The 19 files here were copied unchanged (byte-for-byte), except
for the one renumbering recorded below.

## Known issues

- **ADR-014 numbering collision (resolved 2026-09-08, ORISO-Docs#73):** two files in this import
  both used the number 014 — the media-scanning ADR (2026-07-18) and
  `ADR-014-shared-legal-text-objects-multi-topic-agencies-topic-before-consent.md` (2026-07-16),
  on unrelated topics. The media-scanning ADR was the younger of the two and had no inbound
  references, so it moved to
  `ADR-019-media-scanning-via-matrix-content-scanner-fail-closed.md`; the legal-text ADR keeps
  014, and every reference to "ADR-014" in this repo now resolves to it. The renumbering touched
  the filename and the ADR's own title line only — its body is unchanged. The upstream local
  folder this series was imported from still carries the old number and is outside this repo; a
  human should re-sync it.

## Other local ADR collections NOT imported here

Two other local ADR collections exist and were deliberately excluded from this import because
they need manual reconciliation first:

- `0 - Docs M4_Frank/ADR-001..004.md` — an older, possibly-superseded duplicate of ADR-001–004.
- `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — a completely different, unrelated ADR
  series that happens to reuse the same numbering.

Both need a human to reconcile against the series imported here before they can be merged in.
