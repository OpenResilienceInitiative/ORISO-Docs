# CodeRabbit review disposition

The external review completed with 32 findings. Each was checked against the current source; severity labels are the reviewer's initial labels, not independently confirmed impact. The first connection attempt failed; the second completed. This ledger records incorporation, including suggestions that would weaken the intended evidence boundary.

| # | Initial severity | File | Disposition |
| --- | --- | --- | --- |
| 1 | minor | `.github/workflows/ua-tooling.yml` | Fixed: checkout does not persist credentials. |
| 2 | minor | `tools/understand-anything/enrichments/enrich-admin.json` | Fixed: catalogue description covers the imported administration domains. |
| 3 | minor | `tools/understand-anything/README.md` | Fixed: README runs *_test.py, including installer checks. |
| 4 | major | `tools/understand-anything/bundle/contract.py` | Declined: the explicit audit contract rejects future timestamps. No measured clock skew justifies weakening that boundary; synchronize clocks instead. |
| 5 | minor | `tools/understand-anything/bundle/storage.py` | Fixed and regression-tested: rollback requires current and previous symlinks. |
| 6 | major | `tools/understand-anything/bundle/pipeline.py` | Fixed and regression-tested: sanitize credentials before truncating diagnostics. |
| 7 | minor | `tools/understand-anything/README.md` | Obsolete: remediation-matrix.md now exists and is included. |
| 8 | major | `tools/understand-anything/bundle/contract.py` | Fixed and regression-tested: only root manifest.json is excluded. |
| 9 | minor | `tools/understand-anything/analysis-config/ORISO-Docs.understandignore` | Fixed: nested node_modules paths are explicitly excluded independently of repository-relative policy globs. |
| 10 | major | `tools/understand-anything/bundle/cli.py` | Fixed and regression-tested: redirects reject before credentials can leave the intended origin. |
| 11 | minor | `tools/understand-anything/ua-enrich-merge.mjs` | Fixed: omit tour steps without nonempty descriptions. |
| 12 | minor | `tools/understand-anything/ua-verify.py` | Fixed: incomplete compatibility invocation returns usage and exit 2. |
| 13 | minor | `tools/understand-anything/ua-validate-consumer.mjs` | Fixed and regression-tested: linked consumer invocations resolve the real module path. |
| 14 | minor | `tools/understand-anything/enrichments/enrich-agencyservice.json` | Fixed: catalogue description no longer invents a registration lookup flow. |
| 15 | major | `tools/understand-anything/enrichments/enrich-kubernetes.json` | Qualified: distinguish Dev Helm routing from PreDev legacy history and require current environment evidence. Do not claim an exhaustive never-deployed history from a graph annotation. |
| 16 | minor | `tools/understand-anything/ua-verify.py` | Fixed: positional TOOLING and flag-based usage are documented. |
| 17 | minor | `tools/understand-anything/enrichments/enrich-database.json` | Fixed: exact seven schema paths verified against Database source c9630a93f84f1d45853ba54b657ebd3bc0ff8acc. |
| 18 | minor | `tools/understand-anything/platform/ua-platform-graph.mjs` | Fixed: log matches the unmatched-fraction calculation. |
| 19 | minor | `tools/understand-anything/provenance/imported-sources.json` | Partly fixed: destination corrected to platform/ua-platform-graph.mjs. Rehash suggestion declined: ledger hashes intentionally identify original imported bytes, not repaired outputs. |
| 20 | major | `tools/understand-anything/platform/ua-platform-graph.mjs` | Fixed and regression-tested: per-service consumed count subtracts actual overlap-classified external entries, consistent with global count. |
| 21 | minor | `tools/understand-anything/enrichments/enrich-agencyservice.json` | Fixed: both metadata and catalogue descriptions are reconciled. |
| 22 | minor | `tools/understand-anything/ua-build-supergraph.mjs` | Fixed: explicit staging output usage replaces retired install/default-path instructions. |
| 23 | major | `tools/understand-anything/lib/extraction.mjs` | Declined: silently continuing after a missing Java identity would weaken the audit contract. Valid grammar limits remain explicit diagnostics; missing identity remains fatal. |
| 24 | critical | `tools/understand-anything/install.py` | False positive: package-lock.json is tracked in the staged change (blob08a4970ae4fc09ad2316b33a1118620540a68707); clean installs on macOS and Linux use it successfully. |
| 25 | major | `tools/understand-anything/ua-dashboard.sh` | Fixed: one verified status snapshot supplies immutable graphDirectory and sourceVerification; assignment failures propagate. |
| 26 | minor | `tools/understand-anything/platform/narrative/platform-enrich.json` | Fixed: live layer counts use stats placeholders; historical narratives remain visibly dated. The whole-runtime-call-map claim was removed. |
| 27 | minor | `tools/understand-anything/platform/narrative/PLATFORM.md` | Fixed as preservation: imported PLATFORM.md explicitly labeled a historical pre-fix snapshot, not current evidence. |
| 28 | minor | `tools/understand-anything/platform/README.md` | Fixed as preservation: README clearly distinguishes historical intermediate runs and points to actual current statistics. |
| 29 | major | `tools/understand-anything/platform/lib/source-reader.mjs` | Fixed with regressions: only proven path absence is tolerated; Git/ref/repository/blob failures propagate. |
| 30 | minor | `tools/understand-anything/platform/narrative/apply-platform-enrich.mjs` | Fixed: comment describes priorSummary metadata rather than current summary replacement. |
| 31 | minor | `tools/understand-anything/patches/oriso-schema-viewer-v1.patch` | Declined: malformed status JSON is a configuration failure and should stop this verified entrypoint, not silently downgrade it. Absent status already yields null/unknown. |
| 32 | minor | `tools/understand-anything/lib/semantic-flows.mjs` | Fixed with regressions: identical logical relations deduplicate; conflicting metadata rejects before commit. |

Additional real-browser defects found independently were corrected in the pinned viewer patch: missing ContainerNode edge handles; cache-local Open code routing; missing claim/ordered-flow details; and an incompatible single-repository freshness warning on aggregate graphs. Their tests and final browser readback are separate from this external review.
