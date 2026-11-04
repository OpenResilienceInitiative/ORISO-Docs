# EPIC DRAFT — Media Scanner Rollout (Phase 2) under ORISO-Admin#366

> **Planning draft only — nothing has been posted to GitHub.**
> Prepared 2026-08-14 from `dsfa-deepdive-media-scanning.md` (DSFA deep-dive 1) + live `gh` state.

## Structural decision (verified via gh, 2026-08-14)

**Continue under the existing EPIC ORISO-Admin#366 — do NOT create a new epic.**

Rationale, from live issue state:
- ORISO-Admin#366 is **OPEN**, board status **On hold**, and its body already carries an honest
  "Phase 2 — on hold" section with the exact resume conditions (revive Helm#111/#112, settle AVV).
- Helm#98 (scanner PoC) and Helm#99 (ALTCHA) are **OPEN** and already linked as native
  sub-issues of #366. Their acceptance criteria still match the target architecture (ADR-019
  fail-closed). A new epic would duplicate all of this.
- What is genuinely **new** since the epic was written: **E2EE is durably ON**, so the scanner
  needs the matrix-content-scanner encrypted-media protocol (client key forwarding) — frontend
  work that exists in **no** issue today. This is a scope *addition* to Phase 2, not a reason to
  re-cut the epic.

Plan of record: post the update comment below on #366 (move board status On hold → Ready once
infra confirms), keep Helm#98/#99 as-is, and add **three new sub-issues** (drafts below) covering
the gaps no existing issue owns: download-path wiring + verdict plumbing, the encrypted-media
path, and the AI-scan/AVV gate + admin-toggle truth.

---

## Draft 1 — Update comment for ORISO-Admin#366 (post as comment, then edit "Phase 2" section accordingly)

```markdown
## Phase 2 resume plan (media scanning) — proposed structure and order

Phase 2 stays inside this epic. The two existing sub-issues ORISO-Helm#98 (scanner) and
ORISO-Helm#99 (ALTCHA) remain valid; this comment adds the missing pieces and fixes the order.

**What changed since this epic was written**

1. **E2EE is now permanently on.** ADR-019 was decided while Matrix crypto was off ("server side
   can see media"). Encrypted attachments can only be scanned via the matrix-content-scanner
   encrypted-media protocol, where the client sends the file keys to the scanner over an
   encrypted POST. This is client work that no current issue covers — without it the scanner
   would only ever see unencrypted legacy media. ADR-019 needs an E2EE addendum on resume.
2. **AI scanning is contractually blocked.** Enabling the Mistral vision check in any real
   environment requires a zero-retention sub-processor agreement (KDG/AVV) first. The plain
   ClamAV virus scan has no such dependency and can go live earlier.
3. The PoC itself is finished and reviewed on branch `feat/media-scanner-poc`
   (ORISO-Helm, `templates/media-scanner/`, off by default). PRs Helm#111/#112 were closed
   unmerged on 2026-07-29 as "not needed now" — the branches are alive.

**Execution order** (ClamAV-only first = real security gain with no contract dependency):

| # | Step | Issue | Effort |
|---|------|-------|--------|
| A | Infra decision: revive PRs #111/#112 (merge is risk-free — charts render nothing unless enabled) | conversation w/ infra | 0.5 d |
| B | Harden + merge scanner chart: pin image tags (currently `latest`), `aiCheck.existingSecret`, resources (ClamAV needs 1–2 GB RAM) | ORISO-Helm#98 | 1–2 d |
| C | Enable scanner on pre-dev **ClamAV-only** (`aiCheck: false`); route client media downloads through the scanner instead of Synapse directly (ingress + frontend media URL) | new sub-issue (1) | 2–4 d |
| E | Wire scanner verdicts into the existing `mediaCheckState` model + fail-closed E2E tests (scanner down ⇒ download blocked) | new sub-issue (1) | 2–3 d |
| D | Encrypted-media scan path: client-side POST-to-scan with key forwarding (mandatory since E2EE-on) | new sub-issue (2) | 3–5 d |
| F | Mistral zero-retention AVV signed, then enable `aiCheck`; until then keep the `featureMediaAiScan…` admin toggles honest (disabled/annotated) | new sub-issue (3) | 1 d tech + contract lead time |
| G | ALTCHA + upload rate limit (independent package) | ORISO-Helm#99 | 3–4 d |

**Total to "fail-closed virus scan live" (without AI, without ALTCHA): roughly 8–14 person-days**
after the infra go-ahead. The Phase-2 acceptance gate in this epic is unchanged: an unchecked or
failed file is server-side inaccessible, not merely hidden in the UI.
```

---

## Draft 2 — New sub-issue (1 of 3) · repo: **ORISO-Helm** (+ ORISO-Frontend wiring) · order: after Helm#98 chart merge

**Title:** `Route client media downloads through the content scanner and wire verdicts to mediaCheckState (ClamAV-only, fail-closed)`

```markdown
## Why
Parent: EPIC ORISO-Admin#366, Phase 2. The scanner chart (ORISO-Helm#98, branch
`feat/media-scanner-poc`) only protects anyone if clients actually fetch media through it.
Today nothing is wired: Helm main has no Matrix media ingress at all, clients download via the
Element SDK path straight from Synapse, and no scanner ever feeds the frontend's
`mediaCheckState` — outside the anonymous live chat, `MessageAttachment` defaults to `safe`.

## What
- Ingress/routing so client media downloads go through matrix-content-scanner instead of
  `matrix-synapse:8008` directly (pre-dev first, ClamAV-only: `aiCheck: false`).
- Frontend media URL configuration switched to the scanner path.
- Scanner verdicts drive the existing state model `uploading → unchecked(blur) → safe /
  blocked / error` (both sides of the model already exist; only the feed is missing).
- Fail-closed end-to-end tests: scanner unreachable ⇒ download blocked; timeout, unparsable
  response, and ClamAV signature-update outage all quarantine, never release.

## Acceptance
- EICAR test file uploaded in chat is never retrievable through the client media path
- With the scanner scaled to zero, media downloads fail closed (no silent direct-Synapse bypass)
- A clean image transitions unchecked → safe from the scanner verdict, with no human reveal step
- Verified on pre-dev; evidence attached per the usual PR-evidence flow

_Effort: M–L (steps C+E of the epic plan, ~4–7 d combined)._
```

---

## Draft 3 — New sub-issue (2 of 3) · repo: **ORISO-Frontend** · order: after sub-issue (1)

**Title:** `Encrypted-media scanning: client key forwarding to the content scanner (E2EE path)`

```markdown
## Why
Parent: EPIC ORISO-Admin#366, Phase 2. ADR-019 predates the permanent switch to Matrix E2EE.
Encrypted attachments are opaque to a plain proxy-GET scanner: with E2EE durably on, the
scanner would effectively scan nothing relevant. The matrix-content-scanner supports an
encrypted-media protocol where the client POSTs the file's decryption keys to the scanner,
encrypted to the scanner's published key. This path is not built in the PoC.

## What
- Implement the encrypted POST-to-scan flow in the frontend download path (Element SDK
  integration point), replacing the plain proxy-GET for encrypted media.
- Keep the fail-closed contract: no verdict ⇒ media stays blurred/blocked.
- Add an E2EE addendum to ADR-019 documenting the changed context and this mechanism.

## Acceptance
- An encrypted image in a normal E2EE counselling chat receives a real ClamAV verdict
- EICAR inside an encrypted room is blocked server-side, not just hidden client-side
- Unencrypted legacy media keeps working through the same scanner path
- ADR-019 addendum merged

_Effort: L (step D of the epic plan, ~3–5 d)._
```

---

## Draft 4 — New sub-issue (3 of 3) · repo: **ORISO-Admin** · order: parallel to (1)/(2), gate before AI enablement

**Title:** `AI-scan gate: Mistral zero-retention sub-processor agreement + honest featureMediaAiScan toggles`

```markdown
## Why
Parent: EPIC ORISO-Admin#366, Phase 2. Two compliance loose ends:
1. The Mistral vision check must not be enabled in any real environment before a
   zero-retention sub-processor agreement (KDG/AVV) is in place. The plain ClamAV scan is
   independent of this and ships earlier.
2. The `featureMediaAiScan…` toggles are already switchable in the Admin panel today but do
   nothing while no scanner exists — misleading for QA and for the client.

## What
- Track the AVV/sub-processor agreement as the explicit gate for `aiCheck.enabled: true`;
  record Mistral in the KDG/AVV sub-processor documentation once signed.
- Until the scanner (and for AI, the AVV) is live: disable the `featureMediaAiScan…` cards in
  Admin with an explanatory hint, or annotate them as "prepared — not yet active"
  (design rule: disable, don't hide).
- Enablement checklist for `aiCheck` per environment (secret via `aiCheck.existingSecret`,
  verdict behaviour on Mistral outage = quarantine).

## Acceptance
- No environment can enable AI scanning before the signed AVV is recorded
- Admin UI no longer suggests an AI scan is running when it is not
- Sub-processor documentation updated on activation

_Effort: S (step F of the epic plan, ~1 d technical + contract lead time)._
```

---

## Not touched
- **ORISO-Helm#99 (ALTCHA + rate limit)** stays as-is — independent package G, unchanged scope.
- **TenantService editor images** (legal texts) are out of scope: they never pass Matrix/the
  scanner; magic-bytes whitelist + 2 MB cap + auth are built and tested.
