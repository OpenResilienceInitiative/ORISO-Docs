# ADR-019 — Media scanning via matrix-content-scanner, fail-closed, pluggable AI check

**Status:** Accepted · **Date:** 2026-07-18

> **Renumbered 2026-08-08 from ADR-014 (ORISO-Docs#73).** Two accepted ADRs both carried
> the number 014, so every cross-reference to "ADR-014" was ambiguous. The later of the two —
> this one, accepted 2026-07-18 — took the new number; `ADR-014-shared-legal-text-objects-…`
> (accepted 2026-07-16) keeps 014. Inbound references in `0 - Docs` were updated with it.

**Context docs:** `PLAN-media-upload-security-2026-07-18.md`

## Context

ORISO adds image upload to both TipTap editors and already allows attachments in
chats — including **registration-less live chats** where anonymous guests (U25
context, minors) can send files to counsellors. Files must not be openable until
checked for viruses and harmful content (nudity, abuse imagery). Requirements
from the planning session:

- A file that has not passed checks must "just sit there" — not openable, and
  enforcement must not rely on client goodwill.
- Blur-until-checked thumbnails in the UI, driven by a queryable status
  (*unchecked / safe / blocked*).
- Short-term a PoC using an AI API; long-term the option to swap in a
  self-hosted vision model must stay open.
- The whole capability must be toggleable through the ORISO settings cascade.

Matrix crypto is currently off (facade always-on), so the server side can see
media content — server-side scanning is feasible today.

## Options

**A — matrix-content-scanner (chosen).** The official Element project that
proxies media downloads: a client receives a file only after the scanner has
cleared it. The actual check is an exchangeable script — ours chains ClamAV
(virus) and a Mistral vision check (nudity/harmful). Denial is enforced at the
download path, so an unchecked or failed file is server-side inaccessible
regardless of client behaviour. Supports encrypted media via key-forwarding if
crypto is enabled later (chat rebuild epic).

**B — custom scan service.** Own microservice notified on upload, status table,
own status endpoint; every client must honour the status itself. More code, and
enforcement is weaker: anyone with the mxc URL bypasses it.

## Decision

Deploy **matrix-content-scanner** as its own service in ORISO-Helm with a custom
scan script: ClamAV first, then the AI check (Mistral API for the PoC — EU
provider, zero-retention, recorded as sub-processor in the KDG/AVV
documentation).

Two hard properties:

1. **Fail-closed.** If any check is unreachable, errors, or is unsure, the file
   stays quarantined. Nothing is ever released "in doubt".
2. **The scan script is the exchange point.** Swapping Mistral for a self-hosted
   vision model later changes only the script, nothing else in the pipeline.

Client blur state feeds from scanner verdicts: *not yet scanned* → blurred,
*clean* → clear, *failed* → blocked tile. Before the pipeline exists, guest
images are blurred with counsellor click-to-reveal — the same state model with a
human verdict.

## Consequences

- Server-enforced quarantine for free; no per-client enforcement drift.
- Scan-on-download adds latency on first open of a file; mitigated by scanning
  eagerly and caching verdicts (scanner behaviour).
- Mistral becomes a KDG/AVV-documented sub-processor until self-hosting lands.
- If Matrix E2E encryption is enabled later, the scanner's encrypted-media
  support must be wired into the clients (key forwarding) — tracked in the chat
  rebuild epic, not here.
