# Understand Anything remediation — verification record

The ORISO graph tooling now rejects incomplete or inconsistent generations, exposes the source and limits behind graph claims, and serves the verified bundle through the actual user and PreDev entrypoints. The final installed release and retained generation passed the checks below. PR review, CI, evidence publication and merge state are maintained in [ORISO-Docs issue 110](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/110); this record does not infer those states from local acceptance.

The [remediation matrix](../../tools/understand-anything/provenance/remediation-matrix.md) maps all twelve audit findings. Application behavior/deployment and unrelated PR 107 are outside this tooling acceptance. Evidence files named below live in the routed `${PROJECT_ORISO_ROOT}/0 - Docs/artifacts/2026-09-07-ua-remediation/` directory. Durable screenshots, video and artifact links belong in the PR evidence comment linked from issue 110.

## Accepted source and generation

| Item | Verified identity / result |
| --- | --- |
| Tooling source | `99b59dc15d9e5c721e4c7cf3919c4469f350a8c5`, branch `fix/ua-integrity-and-reproducible-release`, target base `dev`; committed 2026-09-07T02:32:07+02:00. This evidence document is outside installed tooling, so later documentation commits do not change the installed content. |
| macOS and PreDev installation | Exact archived source installed on both machines. Identical content SHA-256: `ed5a56af5a0dd6a224f6100e95207fac680f46faed2b02c74094cf8f5d2c37ae`; runtime `release-ed5a56af5a0dd6a224f6`. `release-install-proof.json` records matching toolchain identities. |
| Pinned dependency/patch | Upstream `ba450c43425f3de6d43daf76526950ad8ca93536`; patch SHA-256 `ebf936b43717889ad13cb7538ba1bf38a81d31862e882eefd94db1d8b7238146`. PreDev uses the Node image digest in the verified lock. |
| Published generation | `301e07d5-8143-4274-aeb3-5a24c9b1c79a`, generated 2026-09-07T00:23:46.569917+00:00. Eighteen source repositories, 20 graphs, 108 inventoried assets, 190,905,700 bytes. Platform declares its actual 17-source subset; supergraph covers all 18. |
| Manifest | SHA-256 `c0aa8a98ef8b0826d19fde534e96befc8bb67beb8d0f9dc88c8cc5f76af05b51`, identical in the stable PreDev store and downloaded cache. Full repository/ref/SHA/fetch-success records are in `release-activated-graph-verification.json`. |
| Final installed consumer | `release-css-consumer-verification.json`: all **20 graphs accepted with zero lossy repairs** by the final installed consumer at 2026-09-07T00:35:33.419740+00:00. The prior complete-generation probe also passed the installed Python bundle validator and source-vector, identity and reference checks. |

The final commit adds only `flex-wrap` to the viewer header and updates its patch checksum. Producer, extraction and schema logic are unchanged from `a1cd8a60588e603ead82cc18b9f6d79204a17238`; the independent comparison confirms all **160 core source files are byte-identical**. Retaining generation `301e07d5…` is therefore appropriate. It was revalidated with the new installed consumer rather than regenerated for a layout change.

## Automated and source-evidence checks

The release checkpoint passed **129 Node tests with zero skips**, **58 Python executions (55 bundle plus three installer)**, and **25 pinned-core search tests**. Those producer/core sources are unchanged by the final header fix. The final installed viewer passed **17 component/configuration tests**. Logs: `release-node-tests.txt`, `release-python-tests.txt`, `release-search-tests.txt`, `release-viewer-tests.txt`. Python totals include inherited test executions and are not a count of distinct scenarios.

Meaningful failure tests cover stale/wrong-source content, recomputed-checksum provenance contradictions, malformed or lossy graphs, dropped/ambiguous references, transfer interruption, concurrent publication, symlink preflight, worktree migration, redirect rejection and diagnostic credential redaction. Post-publication durability faults report uncertainty accurately instead of claiming that the previous pointer was retained. The independent security review and its synthetic probes are preserved in `astra-final-security-review.md`.

A real integration defect initially omitted platform narrative enrichment; another lost 16 ADR references. The final pipeline runs platform build → narrative merge → strict narrative-report check → seal → exact consumer gate → atomic publication. Both `droppedRefs` and `missingStats` must be explicitly empty arrays. Missing, malformed, duplicate-key or nonfinite reports fail closed. Thirteen injected report failures retain the previous complete generation; Huygens independently approved three focused tests and five additional probes.

`release-activated-graph-verification.json` independently checked the actual selected generation:

- Both `IdentityManager.setUpOneTimePassword` overloads have distinct signatures, ranges 34–37 and 39–42, and fingerprints matching UserService `f8f80fab4e0e18cc83511dc290307447c0fc41c1`. The old short ID remains explicitly ambiguous.
- Frontend contains 4,114 imports and 3,092 confirmed source calls; Admin contains 2,789 imports and 1,720 calls. Both report partial coverage and explicit unresolved/unsupported totals. UserService's 16,227 Java call candidates remain unconfirmed.
- Four source walkthroughs cover scheduled asker deletion, anonymous enquiry creation, invitations, and `request.new` timeline notifications. All 25 reviewed flow/step/branch nodes retain current source provenance, ordered steps and matching source/test evidence. Linked application tests were not executed by this remediation; claims retain `runtimeVerified=false`.
- The platform has 11 tour steps and retains all 16 intended ADR targets: 12 concept-related targets and seven tour targets, with valid overlap. All authored relations and tour references remain present. Historical narrative stays dated and unbound; generation time does not become semantic review time.
- All 26 ADR fingerprints match their source commits. There are 61 mentions and zero governs relations; missing accountable owner/scope/lifecycle evidence is not promoted to policy authority.

Earlier generation probes, red captures and the original 69-check activation report remain preserved. They are intermediate evidence, not substitutes for the final consumer and activation records above/below.

## Actual activation, delivery and browser acceptance

`activation-readback-final.json` records **82 passing independent read-only checks** at 2026-09-07T00:38:15.041427+00:00. `activation-readback-final-probe.py` is the replayable inspection. It does not install, fetch refs or modify routes.

| Boundary | Observed outcome |
| --- | --- |
| Local user routes | Three ordinary command wrappers and three ORISO skill links match recorded type/hash/target identities. Both commands delegate through the stable profile into the final runtime. Prior route backups match their recorded identities. |
| Local guidance | All six active replacement hashes and original backup hashes match `local-guidance-activation.json`. The guarded [guidance migration](../../tools/understand-anything/provenance/local-guidance-migration.md) is applied. |
| Final backed-up activation | Local and PreDev activation exited 0; backup timestamps `20260907T003358Z` and `20260907T003359Z`. Stable profiles resolve to `release-ed5a56af5a0dd6a224f6`. PreDev shim and prior-script backup hashes/modes match the ownership records. |
| Upgrade and repeat installation | Upgrading correctly moved previous runtime `release-a70ef10c78123fb96dc7` into `previous`. Separate same-final-release reinstall runs preserved that pointer on both machines; `repeat-final-local.json` and `repeat-final-predev.json` record before/after equality, independently matched to live pointers. |
| Publication and default client | Actual default `ua-pull --via-ssh` uses `ssh:predev:/opt/oriso-understand/published`. Normal, platform and recorded linked-worktree statuses identify generation `301e07d5…`, `VALID-CURRENT-SOURCE`, immutable graph paths and delivery receipt 2026-09-07T00:25:06.902245+00:00. The downloaded manifest matches PreDev. Previous generation `679d196c-ae5e-4e37-ab44-a5ad037066d0` remains available. |
| Manual refresh and schedule | The actual stable `_rebuild/ua-refresh.sh` successfully published the selected generation. Final activation verification checked 18 freshly fetched inputs. Root crontab is byte-identical to its backup and retains `17 */2 * * *`. **No subsequent actual cron execution was observed or claimed.** |

The coordinating agent's real browser run opened the **installed stable `ua-dashboard`**, displaying generation `301e07d5…`. At viewport widths **390, 820 and 1440**, document scroll widths were respectively **390, 820 and 1440**. At 820 pixels the computed header wrap was `wrap`, with all controls visible. This final measurement used the installed release, not the earlier DOM prototype.

The final installed browser also traversed `apiAcceptAnonymousEnquiry` → `PUT /conversations/askers/anonymous/{sessionId}/accept` → ORISO-UserService → owned `event_notification` table → SQL source lines 1–17 at full UserService commit `f8f80fab4e0e18cc83511dc290307447c0fc41c1`. The 11-step tour, ADR source link and distinct OTP overloads were exercised on the preceding runtime against the same graph; unchanged core/schema/graph data and the final consumer/component checks preserve that evidence's scope. No handle warnings, JavaScript exceptions or other warnings were observed in the final run. Four requests for absent optional domain/diff sidecars returned 404, matching the upstream optional-file behavior; those are not zero-network-error claims.

The [activation procedure](../../tools/understand-anything/provenance/activation.md) records reversible ownership-checked rollback. Generic plugin caches and historical repository graph files were outside the route replacements. No application runtime acceptance, application deployment or live destructive/power-loss test is claimed.

## Reviews and delivery record

All three CodeRabbit rounds completed. The first 32 and second nine findings, including fixes, qualified findings and declined suggestions, remain in the [review ledger](../../tools/understand-anything/provenance/review-disposition.md). Independent Astra incorporation reviews are retained alongside their original failure captures.

The third round (`coderabbit-narrative-gate-review.log`) returned one minor suggestion to enforce exactly 16 total, globally unique ADR references. **Declined:** the 16 unique documents intentionally occur in 19 positions—12 concept links and seven tour references, with three overlaps between contexts. Global uniqueness would reject valid reuse. Existing tests verify all 16 exact document paths and intended graph relations; this suggestion does not warrant changing the accepted source.

[Issue 110](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/110) is the live record for the PR, CI checks, review requests, issue state and publication of screenshot/video/artifact links in the PR evidence comment. Merge and deployment remain separate owner-system facts. This report freezes technical verification without embedding a PR number or making future delivery-state claims.

## Replay

Use the accepted installed tooling and pinned core. Set `UA_CORE` to that release's `core/dist/index.js`; set `UA_REAL_USER_GRAPH` and `UA_REAL_PLATFORM_GRAPH` to the recorded generation files so real-output regressions are included. Preserve release identities, exit codes and logs.

```bash
npm test
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s test -p '*_test.py' -v
ua-pull --via-ssh
ua-pull --verify --status-json
ua-pull --platform-only --verify --status-json
ua-dashboard --platform-only
```

A deliberately different checkout requires `--allow-different-checkout` and retains its different-source label. Compare complete source vectors and manifest hashes rather than short SHAs or node counts. Test-source links prove source evidence, not test execution; a manual scheduled-entrypoint run proves the command, not the scheduler.

Recorded by Astra on 2026-09-07 from independent artifact/SSH readbacks, peer verification and the coordinating agent's actual browser observations. Tooling source and installed graph identities are fixed above; external delivery state remains linked to issue 110.
