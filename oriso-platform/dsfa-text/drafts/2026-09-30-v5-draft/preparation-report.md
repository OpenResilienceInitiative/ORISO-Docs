# Legal preparation evidence — 2026-09-30

Prepared source and review artifacts only. Nothing was staged, committed, pushed, approved or published. No historical source, release registry or historical generator was modified.

## Scope delivered

- 12 complete DE/EN chapter pairs: Chapters 1–10, Annex 1 extract and annex register. German: 14,339 words; English: 14,177 words. All 69 headings have counterparts. Every inline-code identifier and public Markdown link target is retained byte-for-byte across locales.
- Version `v5-draft`, date `2026-09-30`, technical/operator/legal approval all `pending`. Source and translation hashes gate rendering; English is bound to the exact German-source hash.
- Actual DE/EN HTML and PDF produced, with exact input JSON and artifact byte/hash manifest. PDF: DE 33 pages, EN 29 pages. The PDFs contain all source prose and table cells; rows are linearised for review. Both outputs consume the same sanitised DOM.
- Internal note bodies, nested hidden notes, comments and scripts are removed from both outputs. Public-link allowlist rejects private repositories and token-bearing references. The accessible Yes/No labels from source permission-matrix icons were retained as explicit text.

## Verification

First RED: isolated tests failed because `dsfa_draft` did not exist. Initial GREEN: three tests passed after implementation. Additional RED: nested hidden-note `<br/>` prematurely ended suppression; the regression failed and was fixed. Initial full GREEN: **12 tests passed**, 28.245 seconds, using the existing bundled Python runtime with existing Markdown package directory and bundled ReportLab/pypdf. No dependencies were installed. A further exact-version publication gate and historical immutability suite was added after this run; final result recorded below.

Tests cover missing locale refusal, paired source hashes, stale translation binding, refusal to manufacture approval, version/date/locale/anchors, all headings/code/link correspondence, hidden note removal including void tags, private/token links, exact artifact hashes/bytes and full PDF text retention. PDF retention assertions cover every public paragraph, heading, list item and table cell. Page-footer text is excluded from the retention comparison so paragraphs spanning pages remain comparable. Separate independent extraction found all 350 DE and 349 EN public non-table text blocks retained. The first English PDF page was rendered with existing Poppler and visually inspected: readable text, explicit unapproved warning, complete master-data rows; no clipping observed on that sampled page.

`git diff --name-only HEAD` returned no modified tracked files. Existing untracked audit preview and cache were preserved. New ownership consists only of this draft folder, `tools/dsfa_draft.py` and `tools/test_dsfa_draft.py`.

## Evidence boundary and remaining owner decisions

The current live page was inspected read-only through HTTPS retrieval: footer `v0.1-draft`, document date 14 August 2026, PDF label 17 August 2026. Live HTML still contains internal-note containers. These facts describe the observed historical page; they do not establish a live fix.

The committed provenance baseline is PR119 revision `cf1bd40a8a8fed129c2c1dea7354b27bf7a3f1df`, The new v5-draft files are uncommitted worktree preparation, derived from captured maintained chapter inputs and the full historical frame; the commit does not contain this new draft. Per-file hashes identify the actual inputs. Source hashes are recorded in `manifest.json`. Existing technical statements, risk judgements and sample operator figures are translated faithfully as claims, not revalidated or approved. Conflicting source statements remain visible, notably old account-deletion gap claims alongside the newer notification deletion description.

Annex 2 is unavailable and was not fabricated. The full external Annex 1 risk matrix, actual operator/controller identity, organisational fields, live technical state and exact-version legal review remain owner gates. No clinical/legal correctness claim is made. No publication action is authorised by these artifacts.

Next owner action: open the paired artifacts and assign technical, operator and legal reviewers for this exact draft and its missing annexes.

## Final exact-version gate verification

Final expanded suite: **16 tests passed in 2.312 seconds**, after regenerated HTML/PDF artifacts were bound to the final source-manifest byte hash. Three separate real approval records remain pending with empty owner/time/evidence fields. Publication checks require every record to supply the same `v5-draft` and exact `sourceManifestHash`, approver, timezone-bearing timestamp and evidence. Synthetic approved records exist only in temporary unit-test fixtures. Tests reject missing/pending records, another version/hash, missing identities/evidence, and changed manifest bytes. `--activate`, `--public`, `--latest` and publication checks all fail closed before writing output while real records are pending. The draft renderer does not install; the separate immutable publication tool described below now implements installation.

Historical baseline input hashes include the existing release registry, maintained sources, templates and generator. Tests confirm their current bytes and prove that overwriting a temporary historical snapshot is rejected. The new draft's manifest identifies the committed provenance baseline separately from its uncommitted actual input files. Existing PR119 source and ADR changes are preserved; no tracked changes were made by this child.


## Immutable publication code — retained requirement implemented

Added `tools/legal_publication.py` and `tools/test_legal_publication.py`. The tool installs a complete bilingual release under an explicit filesystem destination root at `legal/dsfa/versions/<approved-version>`. The release version must be supplied explicitly (e.g. `5`, separately from input `v5-draft`). HTML and PDF derive labels from the same parameter. The source manifest is unchanged; its exact hash and approval-record hash are retained in the public artifact manifest with byte/hash records and approved role states.

Gate conditions now include complete unique Chapter IDs 1–10/A1/A, all three exact-manifest approval records, empty missing-annex/source-warning lists, confirmed operator fields with no outstanding fields, and confirmed full DE/EN annex files with matching byte hashes. Remaining bracket placeholders and example addresses also block installation. Draft CLI rendering remains unapproved.

Synthetic tests exercise a successful bilingual HTML/PDF install and explicit atomic `current`/`latest` symlink activation inside temporary directories only. They verify same approved labels, complete public artifact hashes, source-manifest byte preservation, old version byte preservation, refusal to overwrite an existing version, missing/wrong approvals, missing Annex 2, unresolved warnings/fields/annex readiness, missing/duplicate chapters, real-draft refusal and preservation of a historical ordinary file at an activation path. A new version is staged on the same filesystem and renamed as a complete directory; selected links are replaced atomically. Existing release directories cannot be overwritten, and no destination-tree symlink traversal is allowed.

Expanded draft suite: 16 tests passed (94.319 seconds during concurrent workspace activity). Initial publication suite: 4 tests passed (18.332 seconds); final publication result recorded after the public approval-hash manifest addition below. No actual host/destination installation, network mutation, staging, commit or push occurred. Only synthetic temporary directories were installed.

Actual draft owner blockers remain: technical/operator/legal approvals pending; Annex 2 missing; full Annex 1 readiness pending; unverified source warnings; actual controller/governance/rights/proportionality/annex-date fields unconfirmed. This code does not infer any of these decisions.

Other workers' ADR-008/ADR-016 DE/EN translation edits are present in the shared worktree and were preserved.

Final publication verification after all changes: **4 tests passed in 5.532 seconds**. Draft HTML/locale/anchor check additionally passed after the shared renderer extension. Approved HTML includes DE/EN navigation and a locale PDF link; draft HTML remains `noindex,nofollow` and unapproved. Approved output is indexable. Total covered suite: 20 tests (16 draft, 4 publication).

## Public byte readback and review fixes

Implemented read-only `--verify-live --expected-manifest ... --base-url ...` in the publisher. The real CLI accepts only an explicit HTTPS `/legal/dsfa/versions/<expected-version>/` URL with no credentials/query/fragment. It refuses redirects and checks exact public-manifest hash/length/version plus all four HTML/PDF byte lengths and hashes. Per-request five-second deadlines and a thirty-second overall budget bound requests; response bodies are capped to the expected length. Synthetic local HTTP tests are enabled only via an injected test seam.

Final publication/readback suite: **8 tests passed in 0.853 seconds**. Tests include a real temporary HTTP server, correct byte readback, stale HTTP-200 content, public-manifest mismatch, redirect refusal, actual CLI HTTP rejection, version-path mismatch and deadline refusal. No real host readback is claimed because this draft is not published.

Reviewer findings fixed: explicit HTML tag/attribute allowlists remove `srcset`, SVG, meta refresh, forms and active markup; normalized percent-decoded URL path/query/fragment checks reject encoded private repository names and encoded token parameters. Target `releaseVersion` is bound in both the hashed source manifest and all approval records; CLI version 999 cannot replace approved version 5. These negative regressions are covered. Final draft suite: **17 tests passed in 0.627 seconds**; combined covered tests now 25. Independent reviewer reran the 17 draft and prior 7 publication tests and reported no remaining source blocker; the additional deadline test passed afterwards.

No host, Git or GitHub mutation occurred. Actual operator/legal approval, annex readiness and live publication/readback remain separate pending gates.

## Parent integration verification

After focused independent review, new legal/evidence suite32tests and historical generator11tests pass. Internal v2 map retains86claims:81identifier-matched code references,16source-bound without identifier criteria (including3trees),27identifier-missing and9unbound;0runtime claimsverified. Internal visibility neverconferspublicReady. Historical evidence map is unchanged. Local site types/fullbuild complete108publicpages91currentpairs, and actual IAB DE/EN draft HTML exposes all12chapter anchors, v5-draft/date/unapproved warning. Missing annexes/operator facts/approvals still block publication.
