# Final verification record — draft

Developers need a graph whose source, limitations and delivery state they can verify before using it to plan a change. The implementation and earlier candidate checks below provide evidence for that contract. **Final source identity, installed release, generation, activation, browser acceptance and GitHub delivery are pending in this draft.** They must be filled from the final readbacks, not inferred from test results or earlier artifacts whose names contain “final”.

Scope: [ORISO-Docs issue 110](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/110). The [remediation matrix](../../tools/understand-anything/provenance/remediation-matrix.md) maps all twelve audit findings; the [review ledger](../../tools/understand-anything/provenance/review-disposition.md) preserves external review dispositions. Application behavior, application deployment and unrelated PR 107 are outside this tooling acceptance.

## Established evidence

Evidence files below are in the machine-local, routed `${PROJECT_ORISO_ROOT}/0 - Docs/artifacts/2026-09-07-ua-remediation/` directory unless stated otherwise. Publish their durable review links with the final handoff; these local paths alone are not a PR evidence gateway.

| Evidence | What it establishes | Limit |
| --- | --- | --- |
| `live-candidate-graph-verification.md` and `.json` | Earlier isolated PreDev generation `596b31cf-17ae-4614-9598-2e60c4f3bdcb`: 18 repositories, both aggregates, 108 inventoried assets; Python and the exact installed consumer accepted all 20 graphs without repairs. Platform declared 17 source inputs; supergraph declared all 18. | This generation predates the final narrative-pipeline and review fixes. It is not final acceptance. |
| Same independent source probe | Distinct OTP overload IDs/ranges; nonzero Frontend/Admin imports with explicit partial coverage; four UserService source walkthroughs with 25 reviewed nodes; source/test fingerprints checked; 26 ADR fingerprints checked, with 61 mentions and zero governs. | Source evidence only. Unconfirmed Java calls remain hints; linked application tests were not executed and every walkthrough retains `runtimeVerified=false`. |
| `astra-final-security-review.md` and referenced probe outputs | Independent redirect rejection, credential redaction, nested asset inventory, rollback guards and immutable viewer-status snapshot checks. Sixteen urllib outcomes passed; the final quoted-key redaction amendment passed targeted tests. | Synthetic transport faults and source review do not establish final live delivery or browser behavior. |
| Earlier `final-node-tests.txt`, `final-python-tests.txt`, `final-viewer-tests.txt` | Recorded checkpoint: 123 Node executions without skips, 54 Python executions including installer tests, and 12 viewer tests. | These logs predate the latest second-review changes. They are not the final frozen-source suite. |
| Latest bundle checkpoint, replayable from the tests below | 54 bundle executions passed after UTC review-date ordering and mandatory narrative-stage integration; four targeted regressions passed after formatting. Narrative failure retains the previous complete generation. Invalid review dates reject before stamping. | This is 54 bundle executions, not the earlier 54-test Python total above. Final combined suite and installed generation still require readback. |
| [Activation procedure](../../tools/understand-anything/provenance/activation.md), isolated execution of its exact embedded programs | Eight Bash and ten Python blocks parse. Seven changed-route/backup probes stop safely; valid route, pointer and shim rollback controls pass in temporary directories. | No machine activation is established by those fixtures. |

The independently found missing platform narrative invocation is now corrected in `bundle/pipeline.py`: platform build → narrative enrichment on the staged graph → seal → exact pinned-consumer validation → atomic publication. The final graph must visibly contain the generated narrative/tour; a passing raw platform builder is insufficient. Historical prose remains dated and unbound unless its claim evidence supports a stronger status.

## Final readback fields

Replace each `PENDING` only with observed values and an evidence link. Record the actual timestamp and command exit status for each gate.

| Gate | Required readback | Result |
| --- | --- | --- |
| Frozen source | Full Docs commit and branch/base; clean source or exact remaining diff identity; final toolchain lock and patch SHA-256. | **PENDING** |
| Reproducible installation | macOS and PreDev installed release IDs, `installed.json` content SHA-256, pinned upstream/core and Node image identity, build results, profile links and repeat-install rollback preservation. | **PENDING** |
| Complete generation | Final UUID, generatedAt, manifest SHA-256, 18 successful repository/ref/full-SHA fetch records, all 20 graph identities/checksums, platform's declared subset, coverage/semantic dispositions; Python and exact consumer outcomes. | **PENDING** |
| Publication and client | Resolved immutable current and previous targets; actual transport and delivery receipt; one `--verify --status-json` result carrying the same generation, graphDirectory and explicit sourceVerification; normal clone and disposable linked-worktree readbacks. | **PENDING** |
| User and schedule routes | Backed-up ordinary CLI/Dev-Kit wrappers, ORISO-only skill links, stable PreDev compatibility shim and unchanged cron; exact route ownership records. Complete [local guidance migration](../../tools/understand-anything/provenance/local-guidance-migration.md) separately and record its guarded replacements. | **PENDING** |
| Installed browser | Final release and generation in desktop/mobile banner; search and navigation; both OTP overloads; flow order/error/compensation and source/test evidence; source link at the correct commit; confirmed/hint distinction; platform tour; relevant console readback. | **PENDING** |
| Delivery workflow | Second-review dispositions and independent incorporation; final CI checks with source SHA; PR URL/base/head, requested reviewer, issue state and durable evidence links. Merge/deployment are separate explicit states. | **PENDING** |
| Scheduled execution | First successful manual refresh through the stable shim, then a separately observed actual cron run. A manual run does not prove the schedule ran. | **PENDING** |

## Replay

From the accepted tooling directory, use the installed pinned core. Set `UA_CORE` to that release's `core/dist/index.js`; set `UA_REAL_USER_GRAPH` and `UA_REAL_PLATFORM_GRAPH` to the exact recorded generation files to include real-output regressions. Save the environment identities and command results with the log.

```bash
npm test
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s test -p '*_test.py' -v
```

The final CI workflow also includes the pinned core search tests. Record their actual result, and the installed viewer's build/component checks, separately from the repository suite. Do not turn skipped real-output tests into a claim of complete acceptance.

Use [activation.md](../../tools/understand-anything/provenance/activation.md) for installation, guarded routing and rollback commands. From the intended source checkout, the installed client replay is:

```bash
ua-pull --via-ssh
ua-pull --verify --status-json
ua-pull --platform-only --verify --status-json
ua-dashboard --platform-only
```

A deliberately different checkout needs explicit `--allow-different-checkout` and must retain its visible different-source label. Compare complete source vectors and manifest hashes, not short SHAs or node counts. Keep incomplete/failing delivery nonzero; report post-publication durability uncertainty accurately if injected. No destructive live fault or power-loss test is required or claimed by this record.

Draft prepared by Astra on 2026-09-07. Final acceptance fields intentionally await the coordinating agent's exact readbacks.
