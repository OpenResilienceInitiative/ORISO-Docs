# ORISO DSFA v5-draft — bilingual review source

This is an **unapproved preparation draft**, dated 2026-09-30. Technical, operator and legal approval are all pending. It does not approve processing, establish clinical or legal correctness, change the live website, or replace a historical release.

The complete source corpus contains Chapters 1–10, the Annex 1 extract and the annex register, in German and English. The German baseline combines PR119's maintained technical chapters with the existing full document frame and operator draft text. English translates the whole corpus. Source claims are preserved as review material, including statements of decisions, delivered behaviour and outstanding work; they have not been reverified against production. The technical baseline dates to 2026-09-05. Illustrative operator/master data and square-bracket fields require owner confirmation. Contradictions between source chapters, including notification deletion descriptions, remain visible for review rather than being silently resolved.

**Annex 2 is absent.** Its retention/deletion concept has not been fabricated. The Annex 1 extract does not supply a complete external risk matrix. The annex register lists references and placeholders, not evidence that all annexes exist.

## Inputs and outputs

`manifest.json` binds every locale chapter to its byte hash and each translation to its German-source hash. Both locales share `v5-draft`, date and pending approval state. Chapter anchors `kap1` through `kap10`, `kapA1` and `kapA` are retained in HTML. All 69 headings, inline code identifiers and public Markdown link targets are paired across locales.

`artifacts/` contains DE/EN HTML, PDF and exact render-input JSON plus `artifact-manifest.json` recording input hashes, artifact hashes and byte sizes. HTML and PDF consume the same sanitised DOM derived from the validated locale input. Internal-note containers, scripts, styles, HTML comments and hidden-note containers are removed before either render; they are not merely CSS-hidden. The minimal public HTML has no scripts and is marked `noindex,nofollow`.

PDFs are plain review documents: tables are linearised as complete labelled rows, not styled landscape tables. This retains every cell and avoids clipped text. Every page says unapproved. This renderer is isolated from the historical generator and does not publish.

## Reproduce

Use an available Python runtime with Markdown, ReportLab and pypdf; the available bundled workspace runtime was used without installing packages. On a machine where Markdown is in another existing Python package directory, expose that directory through `PYTHONPATH` for the bundled runtime.

```sh
python tools/dsfa_draft.py oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft \
  --output oriso-platform/dsfa-text/drafts/2026-09-30-v5-draft/artifacts --pdf
python -m unittest discover -s tools -p test_dsfa_draft.py -q
```

A source edit intentionally fails the hash gate until the manifest is updated after paired translation review. `approvals.json` contains three separate pending records. The publication gate requires technical, operator and legal records, each binding the same `draftVersion` and exact manifest-byte `sourceManifestHash`, plus approver, timezone-bearing timestamp and evidence. Missing records, pending states and another version/hash are rejected. `--activate`, `--public` and `--latest` fail before writing anything while pending. `--check-publication-approval` validates records only; the draft renderer itself does not install. The separate `tools/legal_publication.py` implements gated immutable installation. Approval metadata in the preparation manifest itself cannot be relabelled `approved`. A future approved release requires its own owner-controlled contract and version; do not overwrite historical artifacts or turn this draft into an approved release by relabelling it.

## Owner review required

1. Identify the actual operator/controller and competent data protection/legal owners; replace or confirm illustrative master data and organisational fields.
2. Review both exact-version texts, reconcile source contradictions and verify technical claims against the intended deployed revision.
3. Supply the actual Annex 2 and complete annex versions before any approval or publication decision.

## Code-ready immutable publication

`tools/legal_publication.py` validates all source hashes and unique chapter coverage (1–10, A1, A), all three exact-manifest approvals, no missing annexes or unresolved source warnings, confirmed operator fields with no outstanding fields, and actual DE/EN full-annex files with matching hashes and confirmed readiness. It also refuses remaining bracket placeholders and example operator addresses. The current draft fails these gates.

After owner review produces a ready input corpus and three genuine approval records, the operator can choose an explicit approved release version and destination root. This command is an example only; it was not run against a host:

```sh
python tools/legal_publication.py <reviewed-draft-folder>   --destination-root <operator-chosen-public-root> --release-version 5   --activate-link current --activate-link latest
```

Both locales are built as `<root>/legal/dsfa/versions/5/{de,en}/index.html` and `dsfa.pdf`, plus a public hash manifest. Version 5 labels derive from the same approved-version parameter in HTML and PDF; the source manifest remains unchanged and its hash binds the approvals. Existing versions cannot be overwritten. A staged same-filesystem directory rename installs the complete bilingual release, followed by atomic symlink replacement only for explicitly selected `current`/`latest` links. Existing ordinary files at activation paths are refused. No network or server reload is performed. Operators must route their host to these selected paths separately.

## Public readback after operator publication

Approval records and the hashed source manifest must now both contain the same explicit `releaseVersion`; the CLI cannot invent another approved version. The real draft's release version remains unset pending owner decisions.

After installation and operator-controlled serving, use the immutable release's locally retained manifest as the expected evidence:

```sh
python tools/legal_publication.py --verify-live \
  --expected-manifest <retained-immutable-release>/manifest.json \
  --base-url https://<operator-host>/legal/dsfa/versions/5/
```

The URL must be HTTPS and exactly match the expected version path, without credentials, query or fragment. No redirects are followed. Readback compares the public manifest's complete bytes, SHA-256, length and version with the retained expectation, then checks all four DE/EN HTML/PDF artifacts against their exact expected SHA-256 and length. HTTP 200 alone cannot pass. Request deadlines are five seconds within a thirty-second readback budget; body lengths are capped to expectations (maximum 64 MiB per artifact). Local HTTP exists only through the injected unit-test transport seam, not the CLI. This command reads only; it does not install or activate anything.
