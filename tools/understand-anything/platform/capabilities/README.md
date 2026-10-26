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

## Health criteria (`health/*.md`, ORISO-Docs#217, epic #213)

One Markdown file per area, YAML front matter plus the reviewer instruction as body. Files are validated against this rules file and the closed metric list in
`platform/lib/health-metrics.mjs`; an unknown capability id, repository or metric name fails the build.

    ---
    scope: email-templates            # "*" | <capability id> | <capability id or *>:<path glob starting with a repository>
    inherits: default                 # optional; every file but default ends in default
    metrics:
      email-render: {threshold: 0, weight: 3}
    tests:
      - npm run emails:build (ORISO-Frontend)
    ---
    Reviewer instruction and rules in prose.

The effective criteria for a capability, folder (path ends in `/`) or file come from the file with the most specific scope (a capability beats `*`, then the longer
literal glob prefix wins); it and its `inherits` chain are merged and the nearest file wins per key (each metric, `tests`, the instruction).
Every key records the file it came from. Change the files only through PR review; the map's "Edit" link opens GitHub's editor, which creates the PR.
