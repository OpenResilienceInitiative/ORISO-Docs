# Capability rules

`capability-rules.json` maps `(repo, path)` to exactly one capability id (the feature-page slugs on
the Understand site, plus the explicit `shared` bucket). Epic ORISO-Docs#197, ticket #198.

- `rules`: directory prefixes. `overrides`: more specific prefixes or single files; they beat rules.
- Longest match wins within a tier. Equal-length conflicts and unmatched production files fail
  `platform/test/capabilities.test.mjs` (the contract test runs against the six code clones; set
  `ORISO_CLONES_DIR`, default `/home/claude/oriso`, otherwise it is skipped).
- The file was seeded from the v3 growth-map keyword classifier. Every `seed:` override is a
  candidate for human review; change the file only through PR review.

Pipeline integration point: `ua-build-supergraph.mjs` calls `emitCapabilityNodes()` after the per-repo
nodes are merged. It adds one `concept` node `capability:<id>` per capability, `module` folder nodes
`<repo>::folder:<dir>`, and `contains` edges capability -> folder (metadata.featureSlug = slug).
The full pipeline needs the staged per-repo graphs (`UA_BASE`) and the UA core, which are not
available in every environment; the emitter is a pure function tested on a fixture graph.
