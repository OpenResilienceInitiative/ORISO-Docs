# ADR-015 — Per-chat-type media flag families replace `featureAttachmentUploadDisabled`

**Status:** Accepted · **Date:** 2026-07-18
**Context docs:** `PLAN-media-upload-security-2026-07-18.md`

## Context

Media handling needs three orthogonal switches (upload allowed; inline display
vs file-only download with virus scan attached; AI scan on/off), each
configurable **per chat type** (1:1 / group / anonymous live chat / supervision)
and on **every level** of the settings cascade (platform governance → tenant →
agency), like every other ORISO base capability.

Today there is exactly one related switch: `featureAttachmentUploadDisabled` —
an **inverted** flag, tenant/agency level only, **no chat-type granularity**,
edited under Communication Settings, read by the Frontend to hide the upload
button. It directly overlaps the new upload switch.

The existing pattern for per-chat-type capabilities is the
`featureVideoCalls*` family: a master flag plus four chat-type-suffixed
variants, present in `TenantSettings` and the agency `settings` JSON with
identical vocabulary, capped platform-side via `allowedPermissionToggles`
(`tenant_admin_controls` / `agency_admin_control`), rendered as chat-type cards
in the Admin.

## Options

**A — replace (chosen).** New `featureMediaUpload*` family supersedes the old
flag entirely: one-time translation of stored tenant/agency settings (old
"disabled" → new family off everywhere), old switch removed from Admin UI and
Frontend. One source of truth; the new family's master flag *is* the kill
switch. No production users exist, so migration risk is minimal.

**B — keep both.** Old flag stays as a global kill switch next to the granular
family. Two overlapping switches whose interaction nobody can explain later;
permanent confusion in the Admin.

## Decision

Introduce three flag families following the `featureVideoCalls*` pattern
verbatim — `featureMediaUpload…`, `featureMediaInlineDisplay…`,
`featureMediaAiScan…` (master + four chat-type variants each) — on tenant *and*
agency level, with new platform `allowedPermissionToggles` keys, and **remove
`featureAttachmentUploadDisabled`** via a one-time, TDD-covered settings
translation. Chat type is the only dimension; there is no separate
logged-in/anonymous axis (anonymous users exist only in the anonymous live chat
type).

The migration is written test-first and must prove: existing stored settings
translate correctly, Frontend behaviour is identical pre/post for every
combination, and no tenant loses its current upload posture.

## Consequences

- Admins configure media behaviour per chat type like video calls — familiar UI,
  no new concepts.
- Every consumer of `featureAttachmentUploadDisabled` (Admin Communication
  Settings, Frontend message submit interface, generated API types) must be
  migrated in the same change set; the flag disappears from the API surface.
- 3 families × 5 flags × 2 levels + governance keys is a wide but shallow
  surface — the cost of "configurable down to the smallest unit", accepted
  deliberately.
- Requires the agency-level settings UI (WP-0) so the agency dimension is
  actually operable, not just stored.
