# DSFA / DPIA text

- `evidence-map.yaml` — structured claim registry ([#83](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/83)). One entry per technical claim: `slug`, `chapter`, `claim`, `status`, `evidence[]` (`repo`, `path`, `lines`, `expect`).
- Chapter Markdown (KDG/GDPR prose) is **not** in this PR on `main` — it lives on `pre-dev` with `tools/build-dsfa-page.py`. The decay checker never rewrites those files.

Nightly: `tools/evidence-decay-check.mjs` → `.understand-anything/docs-export/evidence-status.json`.
