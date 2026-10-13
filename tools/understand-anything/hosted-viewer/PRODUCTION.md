# Release-bound static Understand viewers

This source replaces public Vite serving with a built static dashboard and a read-only HTTP data/source service. It reuses Docs 141/164 and the existing Helm 398 sender; it does not create a sender, cron, release or deployment. The public hub and source documentation remain public. URL tokens on hub cards are **public navigation markers**, not credentials or authentication. Operational dashboards and `/health/` remain a separate authenticated host boundary from Docs 95.

## Reviewed activation inputs

The release owners must approve a real published platform release and its complete 16-repository tag/fullSHA vector. The Docs revision in that vector must include these viewers and all accepted graph/navigation changes. An older open release PR does not automatically include later Dev changes. Receivers must exist on Docs' default branch; verify Helm sender activation and dispatch access separately. Preview or mixed-source bundles cannot install.

The operator supplies the existing `UNDERSTAND_RUNNER_LABELS`, `UNDERSTAND_HUB_ROOT`, `UNDERSTAND_HUB_CURRENT`, `UNDERSTAND_RUNTIME_ROOT`, `UNDERSTAND_SOURCE_ROOT`, `UNDERSTAND_COMPOSE_FILE`, `UNDERSTAND_VIEWER_BINDINGS` and `UNDERSTAND_VIEWER_READBACK_TOKENS` bindings. Add two explicit host bindings: `UNDERSTAND_STATIC_ROOT` for immutable viewer artifacts and `UNDERSTAND_ATTEMPT_RECEIPT` for one independently served operational receipt. A current path that is an existing directory needs an explicit operator migration before this workflow can run. Preserve the existing content and inspect the proposed current-link targets first.

Every released repository plus `ORISO-Platform` and `ORISO-Supergraph` needs one approved service binding. Each entry retains the existing service, workspaceTarget and graphTarget fields; origin must match `viewer-routes.json`. Keep each existing service's host/container port mapping. `/platform/`, `/supergraph/` and `/docs/` are distinct graphs. Kubernetes is included as a retired configuration source; its graph is not evidence of an active cluster. Missing, duplicate or substituted bindings fail. No service, host port or runtime activation is inferred.

## Host route review before activation

Production requests retain the full canonical viewer prefix. The operator must remove the old Vite/data rewrites for each selected viewer and review the matching host port. For example, after substituting the **already approved existing** platform port:

```nginx
location ^~ /platform/ {
    proxy_pass http://127.0.0.1:APPROVED_EXISTING_PLATFORM_PORT;
    # No trailing URI, strip-prefix rewrite or public development-server upstream.
}
```

Repeat for the exact approved paths in `viewer-routes.json`. Validate nginx before reload. Public hub root/assets/status map to `UNDERSTAND_HUB_CURRENT`. Serve `/refresh-attempt.json` from the separately bound `UNDERSTAND_ATTEMPT_RECEIPT`, never from a sealed hub release directory. Disable caching for status/receipt readback. Do not expose the private activation journals or Compose backups. The service allows GET/HEAD, emits no token-bearing URL/source-body logs and refuses arbitrary paths; operational endpoint authentication remains the host operator's separate requirement.

## Producer and consumer contract

`install.py` builds the exact locked core/dashboard with `--base=./`, so initial assets and lazy chunks work beneath repository and aggregate routes. `production.mjs --build` excludes the upstream demo graph, copies only allowlisted static assets, and seals the server, source adapter and supported-public policy. The artifact's Docs SHA must equal the installed release's Docs SHA. The relocated service has its own policy; it does not assume the installed tooling has sibling truth-chain or docs-publication directories. Hub generation/installation runs from the complete canonical Docs checkout.

The consumer validates the complete bundle and public sources, installs exact clean detached checkouts, and refuses tracked, untracked or ignored changes. It installs a content-addressed static artifact, builds the image from the exact locked Node digest, binds readonly source/runtime/static mounts and runs the production service on each existing container port. Python3+git are installed in the container; Git trusts only the explicit mounted public repository roots. It never runs Vite. Source previews reuse sourceLocation, require graph membership and node/path identity, validate aggregate repository/fullSHA identity, reject escapes and changed checkouts, and limit text to 1 MiB.

The activation transaction snapshots all four current links (runtime, source, static, hub) and the existing Compose bytes. Installation and actual public manifest/metadata/source/graph readbacks run inside that boundary. On failure it restores the preceding pointers and Compose and recreates only approved viewer services. Immutable trees remain preserved. The private mode 0600 journal records committed, rolled-back or rollback-blocked state; a blocked rollback requires operator inspection. GitHub release concurrency serializes these runs. The operator must keep these bindings single-writer and inspect an interrupted journal before retrying.

## Failure receipts and public readback

A separate job records preflight, generation, installation or readback failure, including a safe attempt id/time, attempted version/revision and the hub's last installed generation. Only allowlisted codes are published; raw errors, event bodies, tokens and stacks are never copied. Failure to access the operator host/receipt binding means the public receipt is unavailable; it does not establish success. The hub keeps installed release/source data visible beside the receipt, or labels unavailable status explicitly. Generation age alone does not establish release mismatch. Retained released generations may restart with full integrity/provenance checks even when old; a new installation retains the normal freshness gate.

Readback verifies the public immutable hub manifest and all hub file hashes, every viewer's complete generation/source metadata, the aggregate source vector and one indexed committed source preview per viewer. It also requires negotiated gzip and hashes the **decoded original graph bytes**. The service caches gzip as a transport encoding; graph identifiers, provenance and sealed bytes are unchanged. Compression is not proof of responsiveness or public delivery.

The lead's fixed 43 MB offline measurement was 43,602,694→2,628,047bytes (93.97% reduction), 141.21 ms with decoded byte/SHA equality. That measurement is offline compression only. The local HTTP fixtures independently prove negotiated encoding and Fetch automatic decoded byte equality. Actual public large-graph loading, source navigation and browser acceptance remain separate release gates.

## Local verification and evidence boundary

```bash
UNDERSTAND_TEST_UPSTREAM="/explicit/installed/upstream" node --test tools/understand-anything/hosted-viewer/production.test.mjs
node --test tools/understand-anything/site/hub/test/*.test.mjs tools/understand-anything/hosted-viewer/*.test.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/understand-anything/hosted-viewer -p '*_test.py'
bash -n tools/understand-anything/hosted-viewer/activate.sh
```

The production HTTP fixture uses complete synthetic published releases and real committed source trees; it covers actual pinned built assets, optional data routes, gzip/hash equivalence, source guards, failed immutable installation and rollback. Synthetic fixtures and local images are not an authorized platform release or live-host acceptance. Public activation, host route/auth configuration, release-owner approval, main/dev merges and actual public browser readback were not performed by preparing this source.

For a controlled full-scale local proof, set `UNDERSTAND_FIXTURE_USERSERVICE` to the independently reviewed directory containing `sources/` and `graphs/` for UserService and Keycloak, then run:

```bash
node tools/understand-anything/hosted-viewer/production-browser-fixture.mjs \
  --upstream /explicit/installed/upstream --out /fresh/controlled-fixture --port 19370
```

The helper independently clones exact committed UserService and Keycloak sources, preserving their graph nodes, edges, IDs and source provenance. It uses the canonical platform/supergraph builders and normal sealer; only generation-envelope stamps change. Fourteen other source repositories are explicitly synthetic. `fullscale-binding.json` records original and sealed graph hashes separately. The current UserService source reviewed at `803970c` has 19,941 nodes and 53,175 edges; its sealed local HTTP payload measured 65,386,611 decoded bytes and 3,482,261 gzip bytes (94.67% reduction), with raw gzip decoding and Fetch byte equality. Browser resource duration was 193.2 ms in one local run. These figures describe this controlled fixture, not production-host performance or a real release approval.

The controlled hub was checked at 320/412 pixels in DE/EN: all 16 full revisions, three distinct Platform/Supergraph/Docs entries, coverage, and the failed later refresh beside the installed generation were visible without page overflow. The actual pinned built dashboard loaded the full UserService graph and lazy source viewer. A relocated read-only image served the same decoded graph hash and exact committed source bytes without host Git alternates. Missing optional diff/domain/staleness files remain honest 404s. Real Docs ADR availability is not established by synthetic Docs input.

The normal sealer preserves only a canonical supported `outputLanguage` (`en`, `de`, `zh`, `zh-TW`, `ja`, `ko`, `ru`) and always forces `autoUpdate: false`. Missing language retains the dashboard's English default. Unsupported or malformed language fails preflight before generation stamping; unrelated config fields are discarded. Config bytes remain included in the generation manifest hashes. Set `UNDERSTAND_FIXTURE_LANGUAGE=de` when producing a fresh German controlled fixture.

To test a later pinned runtime without cloning source repositories or changing an installed fixture:

```bash
node tools/understand-anything/hosted-viewer/production-browser-fixture.mjs \
  --runtime /explicit/runtime/current \
  --reuse /existing/controlled-fixture --out /fresh/candidate-evidence --port 19370
```

`--runtime` and `--upstream` are alternatives. Reuse retains the original sealed generation, source tree and locale config; it rebuilds only the consumer artifact and controlled hub from the current source. Changed enrichment or graph producers require a fresh normal-sealed generation first. Existing fixture evidence is preserved. These local fixtures prove code/source/transport behavior; maintainer approval, actual host routes and final public acceptance remain open.

The two aggregate viewers were checked at 320/412 pixels in English and in a normally sealed German configuration. All eight paths selected the real two-factor concept, followed the source-reviewed `MailOtpVerifier` owning class, opened the lazy source viewer and returned the exact Keycloak `1d86e8a` file without page overflow. Actual aggregate HTTP payloads were 646,238 -> 44,897 bytes for Platform and 80,613,037 -> 3,688,001 bytes for Supergraph; decoded/index hashes matched. Receipts and captions explicitly identify two real source repositories, fourteen synthetic sources and the synthetic release envelope. This proof uses the pre-final-review pinned runtime `release-7b61e09aeddcf1f7c6b0`; it does not establish acceptance of later localization or sixth owning-class review changes. Those changes require fresh producer inputs, normal sealing and a final candidate browser run.
