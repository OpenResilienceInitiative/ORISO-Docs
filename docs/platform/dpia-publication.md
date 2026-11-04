---
title: DPIA sources, versions and publication
description: How technical evidence and bilingual legal artifacts are prepared, reviewed and linked without duplicating the DPIA.
---

# DPIA sources, versions and publication

The canonical DPIA is on [Understand Legal](https://understand.oriso.org/legal/dsfa/). This page explains the technical delivery chain. It does not reproduce or approve the legal document.

## Sources and evidence

[PR119](https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/119) owns the chapter sources, evidence map, version history and bilingual review draft. Repository ADRs explain the technical decisions. Graph evidence describes declared repository refs and full source commits; it does not establish live behaviour or legal compliance.

Start with the DPIA's [technical procedure](https://understand.oriso.org/legal/dsfa/#kap6), [data subject rights](https://understand.oriso.org/legal/dsfa/#kap8) and [result](https://understand.oriso.org/legal/dsfa/#kap10). Those links lead to the published document's own version, which can differ from a newer Dev review package.

## German and English bindings

Each draft chapter has a stable chapter ID, German-source hash, English-source hash and translation binding. Editing the German source invalidates the English binding until the pair is reviewed. Both HTML and PDF use the same validated language input, version and date. An artifact manifest records their byte hashes and render-input hashes.

The September preparation contains all ten chapters, the Annex1 extract and the annex register. Annex2 remains missing. Operator fields and source contradictions need owner review; a complete translation is not an approval.

## Three separate approvals

Technical review checks source claims and artifact consistency. Operator review confirms the actual controller, processes and organisational fields. Legal review assesses the exact texts and annexes. Each record must name its reviewer, time and evidence and bind the same version and manifest hash. A record for another source revision is rejected.

Draft rendering is allowed while approvals are pending. Public activation must refuse missing approval, missing annexes and unresolved readiness. Internal notes are removed from both HTML and PDF before export; hiding them with CSS is insufficient.

## Publication and verification

Source evidence is rechecked with each published platform release, using its exact repository versions and full commit vector. A Dev merge or a clock-based job cannot publish a new public graph or technical documentation release. Changed legal claims enter the review queue; the three approvals still bind the exact legal version independently.

Historical releases are immutable. A new approved version gets its own directory and content manifest. The current link changes only after the new artifact is verified. German HTML, English HTML and both PDFs must identify the same approved version.

After activation, compare the actual public bytes against the reviewed manifest and test chapter links, language switching and PDF downloads in a browser. A local build, a merged PR and a public readback are separate evidence states.

## Current review boundary

The live page observed on 30 September2026 showed v0.1-draft dated14August, while its PDF label named17August. The new v5-draft is a review package. Publication, operator/legal approval and the missing Annex2 remain open in [issue80](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/80); no current-version update is implied by this page.

Technical documentation publication is separately tracked in [issue140](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/140). See [graph provenance](./understand-anything.md) for the distinction between source generation and the released Understand graph.
