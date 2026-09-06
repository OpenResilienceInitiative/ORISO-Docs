# ORISO-Platform cross-service knowledge graph

> Historical implementation notes and build snapshots retained from the imported September 4 work. Counts, self-loops and deployment descriptions below are not current acceptance evidence. Use the current generation manifest, metadata.stats, typed relations and the remediation matrix; differing older counts refer to different intermediate runs.


A slim, high-signal knowledge graph layered on top of the per-repo
Understand-Anything graphs. Where the existing 36 MB super-graph only glues
repos together with `contains` edges, this graph answers real
cross-service questions: which frontend/admin function calls which backend
endpoint, which service owns which table, which ADR or doc governs which
service/endpoint, and which Helm chart deploys which service.

Zero npm dependencies — Node 22 builtins only (`fs`, `path`,
`child_process`, `url`, `node:test`).

## How to run

```bash
node ua-platform-graph.mjs \
  --graphs-dir <dir with <Repo>/.understand-anything/knowledge-graph.json> \
  --repos-dir  <dir with the real git checkouts, e.g. ~/ORISO> \
  --out        <output dir> \
  [--strict] [--max-unmatched <fraction, default 0.2>]
```

- `--strict` — make the >`--max-unmatched` frontend-endpoint-map-unmatched
  check exit `1` (the default is a warning printed to stderr, exit `0`) —
  see "Exit codes" below.
- `--max-unmatched <fraction>` — override the 20% default threshold, e.g.
  `--max-unmatched 0.3` for 30%.

Local dev, against the checked-in fixtures:

```bash
node ua-platform-graph.mjs \
  --graphs-dir fixtures \
  --repos-dir  /Users/frankgerhardt/ORISO \
  --out        out
```

Docker (`node:22`) wrapper, once this directory is mounted read-only and the
graphs/repos are available inside the container:

```bash
docker run --rm \
  -v "$PWD":/work -w /work \
  -v /opt/oriso-understand:/graphs:ro \
  -v /path/to/repo/checkouts:/repos:ro \
  node:22 \
  node ua-platform-graph.mjs --graphs-dir /graphs --repos-dir /repos --out /work/output
```

Tests:

```bash
node --test test/*.test.mjs
```

(`node --test test/` — letting Node discover the directory itself — no
longer works on Node 24, the runtime this dev-kit is actually run with day
to day; the explicit glob works on both Node 22 and 24 and is what CI/local
dev should use. `test/matcher.test.mjs` covers `lib/matcher.mjs`;
`test/parseSources.test.mjs` covers the Spring-annotation extractor and the
widened Admin appConfig/caller parsing in `lib/parseSources.mjs`.)

## Input assumptions

- `--graphs-dir/<Repo>/.understand-anything/knowledge-graph.json` and
  `meta.json` exist for: ORISO-Frontend, ORISO-Admin, ORISO-UserService,
  ORISO-AgencyService, ORISO-TenantService, ORISO-ConsultingTypeService,
  ORISO-Keycloak, ORISO-Database, ORISO-Helm. These are the per-repo UA
  plugin outputs, unmodified.
- `--repos-dir/<Repo>` is an immutable detached Git source checkout. Reads use
  the exact full commit from that repository graph's meta, never an origin branch
  fallback. Every source read, including ADRs, belongs to the recorded input vector.
  The builder never switches or writes application source checkouts.

## Real node samples collected in step 1 (ground truth, not fabricated)

**Endpoint** (`ORISO-UserService`):
```json
{
  "id": "endpoint:api/appointmentservice.yaml:GET /appointments/{id}",
  "type": "endpoint",
  "name": "GET /appointments/{id}",
  "filePath": "api/appointmentservice.yaml",
  "summary": "Endpoint: GET /appointments/{id}",
  "complexity": "moderate"
}
```

**Function** (`ORISO-UserService`):
```json
{
  "id": "function:scripts/ci/check-no-test-quarantine.py:java_code_only",
  "type": "function",
  "name": "java_code_only",
  "filePath": "scripts/ci/check-no-test-quarantine.py",
  "summary": "Function java_code_only(source)"
}
```

**Service** (`ORISO-UserService`, a Dockerfile-stage node — dropped from
this graph per spec, real service nodes are minted fresh):
```json
{
  "id": "service:Dockerfile:eclipse-temurin",
  "type": "service",
  "name": "eclipse-temurin",
  "summary": "Service eclipse-temurin (image: eclipse-temurin:21-jre@sha256:...)"
}
```

**Table** (`ORISO-Helm`, MariaDB schema dump):
```json
{
  "id": "table:charts/mariadb/sql-schemas/agencyservice-schema.sql:DATABASECHANGELOG",
  "type": "table",
  "name": "DATABASECHANGELOG",
  "summary": "table: DATABASECHANGELOG (65 fields)"
}
```

**Document** (`ORISO-UserService`):
```json
{
  "id": "document:AGENTS.md",
  "type": "document",
  "name": "AGENTS.md",
  "summary": "document file with 6 sections (56 lines)."
}
```

Endpoint counts per repo from the fixture pull (2026-09-04):
UserService 255, AgencyService 134, TenantService 108,
ConsultingTypeService 49, Keycloak 5 — **551** total, matching the task's
expected ~550 within one endpoint (UserService gained one route between
when the task's counts were taken and when the fixtures were pulled).

## The origin-variable table (`src/resources/scripts/endpoints.ts`)

```
userServiceOrigin           -> ORISO-UserService
agencyServiceOrigin         -> ORISO-AgencyService
tenantServiceOrigin         -> ORISO-TenantService
consultingTypeServiceOrigin -> ORISO-ConsultingTypeService
keycloakOrigin               -> ORISO-Keycloak
apiUrl (proxy, ambiguous)    -> path-prefix table fallback ONLY
```

`ORISO-Admin/src/appConfig.ts` uses different local variable names for the
same five services (`userServiceURL`, `agencyServiceURL`,
`tenantServiceURL`, `consultingTypeServiceURL` — Admin has no direct
Keycloak-URL constant in its endpoint builders) — both naming schemes are
recognized by `lib/parseSources.mjs`/`lib/matcher.mjs` and the origin
variable always takes precedence over the `apiUrl`/prefix-table fallback,
per the matcher tests.

## Architecture

- `lib/matcher.mjs` — pure, dependency-free path/method matching:
  `normalizePath`, `pathsEqual`, `resolveRepoForCall`, `matchEndpoint`,
  `ownEndpointCoversPath`, `parseEndpointName`. `ownEndpointCoversPath`
  answers "does this repo serve anything under this path at all" (own
  endpoints only, wildcard-aware, method ignored, prefix-aware) — the
  dead-frontend-calls.md fix, see "Precision fixes" below. Fully covered by
  `test/matcher.test.mjs` (22 cases).
  `matchEndpoint` returns `{node, methodConfidence, matchQuality}` —
  `matchQuality` is `'exact'` for a full literal (or param-to-param) path
  match, `'wildcard'` for a backend `{param}` lined up against a call-side
  literal segment. A wildcard candidate is only accepted when NO OTHER
  endpoint in the same repo has a literal at that same segment position
  (same total segment count) — otherwise the literal is almost certainly a
  resource-name segment (e.g. `consultants` in
  `/service/users/consultants`), not a genuine id value, and the call is
  left unmatched (`no-such-endpoint`) rather than false-positive-matched to
  e.g. `GET /users/{username}`. Exact candidates are always preferred over
  wildcard candidates when both exist for the same call. See "Coverage,
  before and after" below for the real bug this fixed
  (`fetchAgencyConsultantList`).
- `lib/parseSources.mjs` — regex/bracket-depth extraction of:
  - `endpoints.ts` (Frontend) and `appConfig.ts` (Admin) URL-builder
    constants, and callers of both across **all of `src/**/*.ts` and
    `src/**/*.tsx`** (per-export-block, so one file with several exported
    functions doesn't cross-wire their endpoint keys/methods);
  - **Admin inline URL shapes**: a file-local helper chained through
    *another* file-local helper (`parseAdminInlineUrlHelpers` now does
    fixed-point iteration, not just one appConfig-constant hop), and a
    caller that inlines both the origin variable AND the path literal
    directly (`` url: `${agencyServiceURL}/service/agencies/${id}` `` with
    no appConfig constant or helper standing in for it at all —
    `parseAdminCallerFile`'s `inline` return field);
  - **Spring `@RestController`/`@Controller` MVC endpoint annotations**
    (`parseSpringControllerFile`) — class-level `@RequestMapping` base
    path(s), method-level `@Get/Post/Put/Delete/PatchMapping` and
    `@RequestMapping(method = RequestMethod.X)`, single or array paths,
    `value=`/`path=` keyword args (quote-aware, so a path literal
    containing its own `{pathVar}` brace doesn't truncate the scan), fully-
    qualified annotation names, and `/service`-prefix dedup;
  - Helm `kind: Deployment` names.
  Deliberately **not** a full TypeScript/Java parser.
- `ua-platform-graph.mjs` — the CLI: loads graphs, builds the backend
  endpoint index from OpenAPI yaml, merges in the Spring-annotation
  candidates (new `endpoint` nodes where OpenAPI has no match, `metadata.
  sources` tagging where it does), parses Frontend/Admin sources, matches
  calls to endpoints, loads ADRs/Fumadocs/Helm/tables, assembles the output
  graph, enforces the size cap, and writes the five reports.
  - Caller attribution (`resolveCallerTarget`): each parsed caller is
    attributed to the most specific node that actually exists in the
    per-repo UA graph — the enclosing exported function
    (`function:<path>:<name>`) if that node exists, else the file node
    (`file:<path>`) as a coarser fallback, tagged
    `metadata.callerGranularity: 'file'` on the `calls` edge; a caller
    whose file doesn't even have a `file` node in the per-repo graph is
    dropped (never a `calls` edge from a node that doesn't exist).

## Known limits

- **The caller scan is now `src/**/*.ts`+`.tsx` repo-wide** (previously
  `src/api/**/*.ts` only) for both Frontend and Admin, which closed most of
  the "real caller lives outside the scanned directory" gap described in
  earlier revisions of this doc (`registerAsker`, `matrixAccessToken`, etc.
  are now found in `src/components/**`/`src/hooks/**`). The
  `existsInGraph` cross-check against the per-repo UA graph's own
  `function`/`file` nodes is unchanged — a parsed caller whose file has
  neither a matching `function:` nor a `file:` node in the per-repo graph
  is still dropped, never emitted as a `calls` edge from a node that
  doesn't exist. A caller attributed to a `file:` node (function exists in
  source but the per-repo graph never extracted it, or it's an anonymous/
  non-`export const` function) is tagged `metadata.callerGranularity:
  'file'` on the edge — see `reports/coverage.md`'s "Caller granularity"
  section for the function-vs-file split.
- **Admin's API layer is still only partially covered**, though
  significantly less so than before. Admin builds request URLs from ~90
  individually exported `appConfig.ts` constants (previously filtered to
  ones with "endpoint" in the name — several real URL-builders, e.g.
  `twoFactorAuth`, `agencyDataAgencyId`, don't follow that convention, so
  that filter was dropped) plus file-local helper functions defined
  directly inside `src/**/*.ts(x)` (never exported to appConfig.ts at
  all — `parseAdminInlineUrlHelpers`). Callers reference these via a bare
  identifier (`url: agencyDataAgencyId(agencyId)`), a template literal
  (`` url: `${accountInvitesEndpoint}/${id}/send` ``), a local helper
  chained through another appConfig constant OR through *another local
  helper* (both now resolved — `parseAdminInlineUrlHelpers`'s fixed-point
  iteration over the file's local `const` declarations), or the origin
  variable and path literal both inlined directly in the caller with no
  named constant at all (`parseAdminCallerFile`'s `inline` case). What's
  **still** unhandled: a ternary between two different identifiers picks
  only the first one found (documented in `parseAdminCallerFile`'s doc
  comment as a heuristic). Coverage numbers for Admin in
  `reports/coverage.md` should still be read as a floor, not a ceiling.
- **The backend's own OpenAPI specs undercount real endpoints — now
  substantially closed by Spring-annotation extraction.** Frontend calls
  like case-handover, tutorial progress, magic-link login, password-reset,
  event-notifications and `do-not-disturb` have no corresponding path in
  `api/*.yaml`, but ARE implemented as `@RestController` methods — this is
  exactly what `parseSpringControllerFile` now recovers (see
  `reports/coverage.md`'s per-repo Spring stats: 72 new endpoint nodes
  across UserService/AgencyService/TenantService/ConsultingTypeService in
  the last real-repo run). What's still genuinely missing (verified with
  `git grep` in ORISO-UserService/-AgencyService, not just assumed): the
  legacy Rocket.Chat-era `/messages/*`, `/conversations/consultants/
  {mymessages,enquiries}` and `/users` (bare) routes have zero Java-side
  implementation at all — Frontend has moved to Matrix directly and these
  are dead server-side; and ORISO-AgencyService has no `caldav` controller
  anywhere, so `appointmentServiceCalDav(Account)` is unimplemented, not
  merely undocumented. Both are classified `no-such-endpoint` in
  `reports/unmatched-frontend-calls.md`, not `proxy-unresolved`.
- **One gateway-rewrite prefix is hard-coded.** ORISO-AgencyService's
  appointment-booking routes are called through
  `/service/appointservice/...` but the OpenAPI paths are plain
  (`/consultants/{id}/meetingSlug`) — the `appointservice` segment is
  stripped by an ingress/gateway rule before it reaches the controller.
  `EXTRA_GATEWAY_PREFIX_STRIP` in `ua-platform-graph.mjs` special-cases
  this one, narrow, confirmed rewrite; it is not a general "strip a
  segment and hope" fallback.
- **The >20%-unmatched check is a warning by default, not a hard failure.**
  Run with `--strict` to make it exit `1` again (see "How to run" above).
  The real-repo fixture run still trips the 20% default threshold — that's
  the underlying gaps above being real, not a bug — but a warning lets the
  rest of the pipeline (graph + reports) still get written and consumed.
- **ADR authority is explicit.** Numeric titles and prose mentions are discovery
  hints (`mentions`); an explicitly scoped proposal uses `proposes_for`. `governs`
  requires `Status: Accepted`, `Scope: ORISO-...` (exact repository names), `Owner: ...`,
  `Supersedes: none` or exact document IDs, and `Superseded-by: none`. A resolved accepted
  successor demotes the predecessor; a proposed successor does not. Missing metadata,
  unknown supersession references, cycles and retired decisions never gain authority.
  ADR IDs use repository plus full path; authority is service scope, not endpoint scope.
  This format does not retrospectively accept any existing ADR. Owners must review source
  declarations separately; the builder never invents them.
- **Fumadocs `documents` edges are relevance only.** Page-level title/frontmatter or
  repeated body mention qualifies discovery. They never confer policy authority.
- **Semantic walkthroughs retain exact provenance.** Four initial UserService paths
  cover scheduled asker deletion, anonymous enquiry creation, account-invite commands
  and request.new timeline notifications. Ordered and error/compensation relations point
  to the exact source and test nodes; `tested_by` means test source exists, not test pass.
  Body/revision/range drift quarantines claims. Historical unbound narrative is retained
  as dated orientation, not silently reapplied as current behavior.
- **Helm's `matrix` and `media-scanner` Deployments have no `deploys` edge**
  — there's no repo in the 17-repo list that owns them 1:1 (they ship as
  part of `ORISO-Helm`/`ORISO-Infra`); `HELM_CHART_TO_REPO` in
  `ua-platform-graph.mjs` documents this explicitly rather than guessing.
- `tour: []` is intentionally empty — filling it is a later LLM pass, not
  this deterministic script's job.

## Output contract

`<out>/knowledge-graph.json` — same node/edge/layer/tour/project schema as
the per-repo graphs. Copied nodes (`endpoint`, `function`, `table`) keep
their original per-repo id, prefixed `<Repo>::<originalId>` (matching the
existing super-graph convention). Hard cap: 5 MB, enforced by progressively
stripping `lineRange`/`complexity` and truncating `summary` fields; the
script exits non-zero with a clear message if it still doesn't fit.

`<out>/reports/`:
- `unmatched-frontend-calls.md` — every Frontend/Admin endpoint-map entry
  that couldn't be matched, with a reason **and a classification**:
  - `no-such-endpoint` — real origin + path, resolved to a repo, but that
    repo has no `endpoint` node (OpenAPI yaml *or* Spring annotation) that
    matches — a genuine backend gap, verified with `git grep` where the
    report says so, not merely assumed.
  - `proxy-unresolved` — built from the generic `apiUrl` proxy origin and
    `PATH_PREFIX_TO_REPO` (`lib/matcher.mjs`) has no entry for it.
  - `parse-failure` — our regex/bracket-depth scanner couldn't extract a
    path literal or a known origin variable from the source at all
    (includes `feMap.unparsed`/`adminMap.unparsed` entries, and any
    "no endpoint-map entry found" case, since that's our tool failing to
    produce *any* entry rather than proof the backend lacks the route).
  - `external` — resolves to Keycloak's own endpoints or a third-party
    tool (budibase) intentionally outside this graph's scope.
- `uncalled-endpoints.md` — backend endpoints with zero incoming CONFIRMED
  `calls` edges (never a `calls_unconfirmed` one — see "Precision fixes"
  below), grouped by repo.
- `adr-number-drift.md` — ADR numbering collisions found across
  `ORISO-Docs`, `ORISO-Frontend`, `ORISO-UserService`.
- `dead-frontend-calls.md` — every `no-such-endpoint` entry from Frontend
  and Admin (deduped by repo+key+path — the same dead key is usually
  referenced by several callers) that ALSO fails the own-endpoint coverage
  check (see "Precision fixes" below): "dead" now requires BOTH (1) no OWN
  `endpoint` node (this repo's `api/*.yaml` OpenAPI spec, or an
  already-extracted Spring `@…Mapping` annotation) covers the full call
  path, wildcard-aware, method ignored, AND (2) `git grep -n` evidence
  (`origin/dev`, `*.java`, kept as supporting context only — never the sole
  proof, since a controller can `implement` an OpenAPI-generated interface
  with no `@…Mapping` of its own at all) agrees. Grouped by suspected cause
  (`legacy pre-Matrix messaging`, `appointment/caldav`, `other`); entries
  refuted by the own-endpoint check are listed separately under "Refuted by
  own-spec/annotation check", tagged `method-mismatch` (an exact-length own
  endpoint exists, just not for this method) or `prefix-in-use` (this key is
  a base-URL constant; a real, longer own endpoint starts with the same
  segments). A cleanup list for developers, not a design doc.
- `coverage.md` — endpoint/function/admin match percentages and raw counts,
  the Spring-annotation extraction stats per repo (new vs. already-in-
  OpenAPI-yaml duplicates), the unmatched classification counts, caller
  granularity (function vs. file), the wildcard-match-precision downgrade
  count, the `governs`/`documents` edge counts (loose vs. strict rule),
  confirmed `calls` vs. `calls_unconfirmed` counts and the share of
  endpoints with a CONFIRMED caller, and the own/consumed/external endpoint
  table described below.
- `spec-drift.md` — every consumed sibling-service endpoint whose owning
  repo IS in this graph (per the >= 50% owner-overlap check — see
  "Precision fixes" below) but does NOT itself expose a matching own
  endpoint (same METHOD + wildcard-equal path) — see "Own vs. consumed vs.
  external endpoints" below.

### Own vs. consumed vs. external endpoints, and the `consumes` edge

A backend repo's checkout can contain OpenAPI endpoint nodes it does **not**
serve itself — a sibling service's spec, bundled so the repo can generate a
client for it. Before this was modelled explicitly, every such node got an
`exposes` edge from the bundling repo, which both inflated "endpoints without
a caller" and hid the real service-to-service dependency. The rule (verified
against the actual fixtures, see `lib/classify.mjs`):

- **own** — the endpoint node's `filePath` has an `api` path segment (e.g.
  `api/userservice.yaml`, or the deeper
  `keycloak-image/otp-config-spi/api/keycloakextension.yaml`). This holds
  regardless of whether the spec's basename matches the repo's own name —
  `ORISO-UserService` bundles `api/appointmentservice.yaml` and
  `api/conversationservice.yaml` under its own `api/` folder too, and those
  count as own by this rule.
- **consumed** — the endpoint node's `filePath` has a `services` path
  segment (e.g. `services/tenantadminservice.yaml`).
- A Spring-annotation-derived endpoint (`metadata.source: 'spring-annotation'`)
  is always own — it's read straight out of the repo's own Java controllers.

Only **own** endpoints get an `exposes` edge (`service -> endpoint`). Every
consumed endpoint is resolved against an `ownSpecOwner` map (spec basename ->
owning repo, built dynamically from every repo's own endpoints — not a
hand-maintained table, though it agrees with the userservice/agencyservice/
tenantservice/consultingtypeservice/keycloak names one would expect):

- **owner in this graph, and it already exposes the same endpoint**
  (wildcard-equal METHOD + path) — the duplicate node is **dropped**; a
  `consumes` edge (`service (consumer) -> endpoint`, `metadata.evidence:
  "bundled-openapi-spec"`) points straight at the owner's own node.
- **owner in this graph, but has no matching own endpoint** — genuine
  contract drift. One node is kept, deduped by (owner, method, path) across
  every consumer that bundles it, attributed to the **owner** (not the
  consumer), tagged `metadata.source: "consumed-spec-only"`. Every raw
  consumer reference is still recorded as a row in `reports/spec-drift.md`
  and gets its own `consumes` edge.
- **owner not in this graph at all** (`appointmentservice`, `mailservice`,
  `conversationservice`, `statisticsservice`, …) — external contract. The
  node stays attributed to the **consuming** repo, tagged
  `metadata.external: true`, one node per consumer (never deduped across
  consumers).

`depends_on` (service -> service) weight is now the sum of `calls`-based
evidence AND `consumes`-based evidence between that pair;
`metadata.evidence` on the edge lists which kind(s) contributed
(`["calls"]`, `["consumes"]`, or both).

`graph.metadata.stats` (written by the builder, consumed by the narrative
apply script's `{{stats.<dotted.path>}}` placeholders — see below) carries:
`endpointsTotal`, `endpointsOwn`, `endpointsConsumed`, `endpointsExternal`,
`endpointsOwnUncalled`, `callsTotal`, `callsWildcard`, `callsPathOnly`,
`deadCalls` (computed from the same data `dead-frontend-calls.md` is built
from, never by re-parsing that markdown), `specDrift`, `governs`,
`documents`, `consumes`, `dependsOn`, and a `services.<Repo>` breakdown of
`{endpointsOwn, endpointsConsumed, endpointsOwnUncalled, callsIn, callsOut,
tables}`.

### Historical coverage snapshot, before UA-06/07 remediation (all fixes: Spring-annotation extraction, widened Admin parsing, wildcard precision, governs/documents noise, repo-wide caller scan)

Real-repo run (`--graphs-dir fixtures --repos-dir ~/ORISO --out out`, no flags), 2026-09-04:

| Metric | Before (Spring+Admin-parsing pass) | After (this pass: A–D) |
| --- | --- | --- |
| Frontend endpoint-map keys matched | 58/80 (72.5%) | 58/80 (72.5%) — unchanged; the remaining gap is genuine backend/proxy/external, not caller-scope (see "Known limits") |
| Admin endpoint-constant keys matched | 20/52 (38.5%) | 33/52 (63.5%) — fix D (repo-wide scan + chained helpers + inline url templates) |
| Backend endpoints total | 623 (551 OpenAPI + 72 Spring) | 625 (551 OpenAPI + 74 Spring — fixture pull gained 2 endpoints) |
| Backend endpoints with ≥ 1 caller | 71/623 (11.4%) | 86/625 (13.8%) — fix D |
| `calls` edges by caller granularity | n/a (field didn't exist) | 176 function-level, 3 file-level |
| Wildcard matches disqualified (would have false-positive-matched under the old rule) | n/a (bug present, uncounted) | 16 — fix A, incl. the reported `fetchAgencyConsultantList` case |
| `governs` edges (ADR → service) | included self-mention noise | 61, self-edges removed entirely — fix B |
| `documents` edges (fumadocs page → service) | 200 (any single mention) | 142 under the stricter mention rule — fix C |
| Graph size | 1006 nodes / 1216 edges, 0.65 MB | 1021 nodes / 1147 edges, 0.66 MB (fewer, more precise edges) |
| `dead-frontend-calls.md` entries (deduped) | report didn't exist | 14, grouped by cause — fix E |
| Exit code (no flags) | `0` (warning only) | `0` (warning only, unchanged) |

Frontend's 58/80 didn't move even with the repo-wide scan — its remaining
22 unmatched keys are mostly real backend gaps (`/messages/*`, caldav),
`proxy`/`external`/`parse-failure` cases already covered by the earlier
pass, not callers hiding outside `src/api/**`. The stated targets for this
pass (Frontend `matchQuality` precision, no `governs`/`documents` noise,
wider caller coverage) were reached; ≥80% Frontend / ≥50% Admin match
percentages were **not** both reached (Admin now clears its 50% bar at
63.5%; Frontend stays at 72.5%, short of 80% for reasons verified above,
not glossed over).

Exit codes: `1` if `knowledge-graph.json` would exceed 5 MB after
truncation, or if `--strict` is passed and more than `--max-unmatched`
(default 20%) of Frontend endpoint-map keys are unmatched (the full
unmatched list is printed to stderr first — without `--strict` the same
condition prints a `WARNING` and exits `0`); `2` for a bad CLI invocation;
`0` otherwise.

### Own/consumed/external split (Problem A), real-repo run 2026-09-04

Same command, after the own/consumed/external classification and the new
`consumes` edge type landed. "Before" here is the *previous* model, where
every endpoint node (own + consumed + external) got an `exposes` edge —
i.e. the numbers in the table just above.

| Metric | Before (own+consumed+external all `exposes`d) | After (own only `exposes`s; `consumes` added) |
| --- | --- | --- |
| Endpoint nodes total (all kinds) | 625 (all got `exposes`) | 348 (290 own + 23 deduped drift + 35 external) |
| Own endpoints (`exposes`) | 625 (undifferentiated) | 290 |
| Consumed-internal references (raw, `consumes`) | 0 (not modelled) | 300 (109 UserService, 97 AgencyService, 67 TenantService, 27 ConsultingTypeService) |
| External references (raw, `consumes`) | 0 (not modelled) | 35 (all UserService-bundled: appointmentservice, conversationservice, …) |
| Spec drift (owner in graph, no matching own endpoint) | not modelled | 40 rows (`reports/spec-drift.md`) |
| `consumes` edges | 0 | 335 |
| `depends_on` edges (now folds in `consumes` evidence too) | 8 | 20 |
| Own endpoints with ≥ 1 caller | 86/625 (13.8%, inflated by consumed duplicates) | 81/290 (27.9%) |
| Frontend endpoint-map keys matched | 58/80 (72.5%) | 55/80 (68.8%) |
| Admin endpoint-constant keys matched | 33/52 (63.5%) | 32/52 (61.5%) |

The Frontend/Admin match percentages **drop** slightly here — this is an
expected, understood side effect, not a bug: a handful of calls (the
`agencyServiceOrigin` `/appointservice/*` booking routes, `keycloakOrigin`
token/logout calls) used to match a **consumed/external** node that no
longer participates in call-matching, because `exposes`/call-matching is
own-endpoint-only now. Those calls are still real traffic reaching a real
server at runtime; the graph just no longer claims a specific endpoint
identity for them if that identity is a bundled foreign spec rather than
this repo's own contract. See `reports/unmatched-frontend-calls.md` for the
newly-unmatched entries (`resolved repo "ORISO-AgencyService" ...` reasons).

### Precision fixes (independent review, 2026-09-04)

An independent review sampled 20 `calls` edges (seed 42) and found only 45%
precision (9/20 correct), plus a spec-drift report that was 40/40 false
positives and a `dead-frontend-calls.md` that refuted 3 of its 4 sampled
entries. All three root causes are fixed; re-verification (20 edges seed 42
+ 20 edges seed 7, each checked against the real caller source via
`git show origin/dev:<path>`) scored 40/40 correct.

**1. `calls` precision — new `calls_unconfirmed` edge type.** A match is
only trustworthy enough to become a `calls` edge when
`methodConfidence === 'exact' && matchQuality === 'exact'` — a full literal
(or param-to-param) path match with a known, matched HTTP method. Every
weaker match (unknown method — `path-only`, measured at 1/10 correct in the
review sample; or a call-side literal against a backend `{param}` —
`wildcard`, every one of the 20 such edges graph-wide was wrong) becomes
`type: 'calls_unconfirmed'` instead, same node, same metadata, **never
silently dropped**, but excluded from `depends_on` weight, `coverage.md`'s
"endpoints with a caller" stat, and `uncalled-endpoints.md`. Real-repo run
(2026-09-04): 125 confirmed `calls`, 44 `calls_unconfirmed` (11 wildcard, 40
path-only — note some edges are both), 110/297 own endpoints (37.0%) reached
by a confirmed caller.

Two deeper bugs fed the wildcard-collapse problem and are fixed at the
source, not patched after the fact:

- **`mergeSpringEndpoints` used to accept a WILDCARD match as proof a
  Spring-annotation candidate was "already documented" in OpenAPI**, so it
  got tagged onto the existing node instead of becoming its own. Real case:
  `EventNotificationController`'s bare `@GetMapping`/`@DeleteMapping` on
  `/users/event-notifications` (2 segments, same shape as the already-known
  `GET /users/{username}`) wildcard-"matched" that unrelated endpoint and
  was never created as its own node at all — every Frontend caller that
  should have hit it instead wildcard-matched `/users/{username}` at
  call-matching time, because there was no exact node for it to prefer. Now
  `mergeSpringEndpoints` requires `matchQuality === 'exact'` to treat a
  candidate as a duplicate.
- **A caller referencing an appConfig/`endpoints.ts` base constant directly
  used to silently drop everything the caller's own `url:` expression
  appended after the interpolation** — `getTenantPermissionPolicies`
  (`` `${tenantAdminEndpoint}/${tenantId}/permission-policies` ``) matched
  only the base `GET /tenantadmin`; `getConsultingType4Tenant`
  (`` `${consultingTypeEndpoint}/basic` ``) matched only the base, missing
  `/basic`. `loadAdminCallers` now runs `resolveIndirectUrlValue` (already
  used for file-local helper chaining) against the raw caller expression
  too, splicing the appConfig constant's own path onto the caller's real
  suffix before matching. (Fixing this also uncovered and fixed a `.` vs
  `\n` bug in `resolveIndirectUrlValue`'s splice regex — a multi-line
  `url:` template like `useTenantsData`'s `` `${tenantAdminEndpoint}/search?
  page=${page}&...` `` spanning several lines silently failed to splice at
  all until the regex was changed from `(.*)$` to `([\s\S]*)$`.)

**2. `dead-frontend-calls.md` — "dead" now requires an own-endpoint check,
not just `git grep '*.java'`.** UserService controllers implement
OpenAPI-generated interfaces (`UserController implements UsersApi`), so a
plain `*.java` grep for `@…Mapping` cannot prove a route is absent, and a
git-grep-only report was refuted 3 of 4 times on review (`sessionBase`,
`chatRoom`, `consultantEnquiriesBase` — all real routes, just base-URL
constants or documented only in OpenAPI yaml rather than a Java annotation).
`lib/matcher.mjs`'s new `ownEndpointCoversPath(callPath, ownEndpoints)`
checks whether ANY own endpoint (OpenAPI yaml or Spring annotation) covers
the call path, wildcard-aware, method ignored — either as a full same-length
match or because the call path is a PREFIX of a real, longer own endpoint
(the base-constant case: `sessionBase` = `/users/sessions` is never itself a
route, it's a prefix combined with a runtime-built suffix elsewhere before
hitting `/users/sessions/{sessionId}/enquiry/new`). A candidate that passes
this check is excluded from "dead" and moved to the report's "Refuted"
section — tagged `method-mismatch` when an exact-length own endpoint exists
for a different method, `prefix-in-use` for the base-constant case. Only a
candidate that fails BOTH the own-endpoint check AND has no useful git-grep
evidence stays classified dead (`updateMessage` `/service/messages/`
confirmed dead by both). Real-repo run: `deadCalls` 16 (down from a report
that used to also list the 3 refuted entries), 8 additional entries moved to
the "Refuted" section.

**3. `spec-drift.md` — owner resolution now requires >= 50% endpoint
overlap, not just a basename match.** A consumed spec's owner used to be
resolved purely by lower-cased spec basename (`ownSpecOwner`), which
collided for `ORISO-UserService`: it bundles its own, real
`api/appointmentservice.yaml` (7 endpoints, `/appointments/*`) AND consumes
`services/appointmentService.yaml` (the retired Cal.com contract, 23
endpoints, `/consultants/*`, no repo in this graph actually owns it) — same
basename after lowercasing, completely disjoint contracts. Every one of
those 40 endpoints (across every UserService-basename consumer) got
attributed to `ORISO-UserService` as "owner" — with UserService as BOTH
consumer and (wrongly) owner, producing a `UserService -> UserService`
`depends_on` self-loop (weight 23) and 40 false `spec-drift.md` rows.
`resolveOwnerWithOverlap` (`ua-platform-graph.mjs`) now accepts a candidate
owner only when its OWN endpoints from the same-named spec cover >= 50% of
the UNIONED consumed set for that basename (pooling every consumer's copy,
not a per-consumer ratio — a consumer that happens to bundle only the
undocumented/drift slice of a genuinely shared spec must not score a false
near-0%; see `test/builder-classification.test.mjs`'s two-consumers-same-
drift case). Below the bar the group is `consumed-external` instead — kept
under the consumer, `metadata.external: true`, no owner, no drift rows.
`depends_on` and `consumes` self-edges (`source === target`) are additionally
forbidden outright as a defensive last line (`console.warn` + drop, asserted
in tests) even though the overlap fix means they should never actually be
reached. Real-repo run: `spec-drift.md` 0 rows (was 40), `depends_on` 19
edges, 0 self-loops (was 1, weight 23).

### `{{stats.<dotted.path>}}` placeholders (narrative layer)

`narrative/apply-platform-enrich.mjs` substitutes `{{stats.<dotted.path>}}`
inside `serviceSummaries` values, `layerDescriptions` values, `concept`
`name`/`summary`, and `tour` step `title`/`description`, resolving the
dotted path against the just-applied graph's `metadata.stats` (see
`lib/placeholders.mjs`). A path that doesn't resolve is **never** silently
dropped — it's replaced with a visible `[stat missing: <path>]` marker, and
every distinct missing path is reported in the apply script's JSON summary
under `missingStats`. Concept ids stay static; only `name`/`summary` text
carries placeholders, written so the *substituted* result still reads as
prose (e.g. `"{{stats.endpointsOwnUncalled}} of {{stats.endpointsOwn}} own
endpoints have no caller"`). Running the apply script twice against the
same graph is still byte-identical (`conceptsAdded`/`edgesAdded` = 0 on the
second run) because the same stats produce the same substituted text both
times.

## Regression checks

Run `node --test platform/test/*.test.mjs test/semantic*.test.mjs` from the parent
understand-anything directory. Strict graph validation preserves exact source maps,
custom relation types, semantic provenance and per-relation coverage; it must reject
invalid edges instead of sanitizing them into a misleading successful publication.
