# Internal claim candidate review

The report associates an authored claim or feature with exact source evidence.
`matched` means that source bytes match the graph, **not** that anyone reviewed
the explanation. No candidate replaces a SemanticClaim, changes historical
prose, approves the DSFA or proves deployed behaviour.

The initial packages cover legal-text translation, case-handover consent and
operator master data. Their qualifications deliberately retain the service,
provider, operator and runtime evidence still needed. They do not resolve the
remaining historical claim queue.

For developers — generate an internal review artifact from a validated full generation:

```sh
node tools/understand-anything/ua-claim-candidates.mjs \
  --generation /path/to/public-root/generation \
  --public-root /path/to/public-root \
  --sources /path/to/exact/repositories \
  --inputs tools/understand-anything/review/claim-packages.json \
  --authored-root "$PWD" \
  --out /path/outside-public-root/claim-candidates.json
```

The CLI validates the complete generation with the existing bundle contract.
It reads source bytes through `git show <fullSHA>:<path>`, so a dirty checkout
cannot silently change the evidence. A validated release binding changes the
source context to `release-bound-source`; the candidate artifact still cannot
be publicly published or treated as reviewed prose. Store it as a separate
internal CI artifact; do not copy it into the public bundle.

For an isolated local review of selected repositories, use `--preview-graphs`
instead. Its manifest must explicitly use
`oriso.ua.claim-candidate-preview/v1`, declare a generation and full SHA vector,
and contain no release record. Each graph must carry that exact generation
and source SHA. This preview is not a complete platform generation or release.

States are `matched`, `ambiguous` (all candidates retained), `missing` and
`stale`. To recheck a prior association, supply `binding` with its `sourceSHA`,
`generationId`, `authoredSourceSHA256` and flattened candidate `evidence`.
A moved range, changed bytes or changed source/generation invalidates it.
Configured authored anchors must still exist in the pinned historical file;
matching code cannot conceal a removed DSFA claim.
Only the 16 repositories in the versioned supported-public allowlist are eligible.
Unknown visibility and private repositories are excluded before authored bytes,
graph files or source bytes are read. The release validator and report share
this policy. Complete-generation mode refuses excluded inputs before full
generation validation can read their graphs.
Installed-runtime tests validate the exact supported vector. The repository
visibility subset is checked before installation by
`.github/scripts/ua_public_policy_test.py`; neither check is skipped when the
other tree is unavailable.

A person must still review the explanation against its evidence, record the
review date and confidence, and run the separate SemanticClaim assessment.
Public source-oriented explanations additionally require the actual released
source vector; preview branch tips cannot substitute for that release.

The release producer enables this through `bundle refresh --internal-report-root`
and uploads `ua-internal-claim-candidates` separately from the public graph
archives. Its internal destination must be outside the entire public root,
including symlink aliases. Standalone CLI calls also require an explicit
`--public-root`: their generation must be inside it and output outside it.
The report is built before the fresh pinned source
checkouts are removed.
