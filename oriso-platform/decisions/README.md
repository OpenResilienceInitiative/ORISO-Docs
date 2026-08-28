# Platform ADRs

This directory holds the platform-level architecture decision records (ADRs) imported from a
previously-untracked local folder (`/Users/frankgerhardt/ORISO/0 - Docs/`, `ADR-*.md` files only,
not its `_artifacts/` subfolder). The 19 files here were copied unchanged (byte-for-byte).

## Known issues

- **ADR-014 numbering collision (unresolved):** two files in this very import both use the
  number 014 — `ADR-014-media-scanning-via-matrix-content-scanner-fail-closed.md` and
  `ADR-014-shared-legal-text-objects-multi-topic-agencies-topic-before-consent.md`. They cover
  unrelated topics. Renumbering is a human editorial call and was deliberately left untouched by
  this import; a human should reconcile/renumber before this series is treated as canonical.

## Other local ADR collections NOT imported here

Two other local ADR collections exist and were deliberately excluded from this import because
they need manual reconciliation first:

- `0 - Docs M4_Frank/ADR-001..004.md` — an older, possibly-superseded duplicate of ADR-001–004.
- `0 - Docs M4_Frank/1 Analysis/ADR/ADR-001..011.md` — a completely different, unrelated ADR
  series that happens to reuse the same numbering.

Both need a human to reconcile against the series imported here before they can be merged in.
