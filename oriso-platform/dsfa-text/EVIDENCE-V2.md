# Internal DPIA evidence migration

`evidence-map-v2.json` preserves every original claim, stable slug and original status from `evidence-map.yaml`, without modifying that historical input. Each claim text is bound to its actual repository source commit and file bytes. Code references use locally available `origin/dev` commit snapshots when their files exist. The observation is explicitly local and not a fresh remote-ref or deployment check.

Every claim has lifecycle and runtime fields. Original `live` labels are retained as `legacyStatus`; current records are `documented` with runtime `not-verified`. Finding expected identifiers in a source file does not establish live behaviour. Missing files or non-Git local artifacts remain unbound. There is no public approval or runtime acceptance in this migration.

The map is internal evidence, excluded from public catalogs and legal artifacts. Public document publication still requires owner review of source statements, current runtime observations where claimed, completed annexes, and three independent exact-version approvals. This migration does not clear draft source warnings.

For developers — validate, or reproduce from explicit local repositories:

```bash
python3 tools/dsfa_evidence.py oriso-platform/dsfa-text/evidence-map-v2.json
python3 tools/dsfa_evidence.py oriso-platform/dsfa-text/evidence-map.yaml \
  --repository . --repositories-root "$ORISO_REPOSITORIES" \
  --output oriso-platform/dsfa-text/evidence-map-v2.json
PYTHONPATH=tools python3 -m unittest tools/test_dsfa_evidence.py
```
