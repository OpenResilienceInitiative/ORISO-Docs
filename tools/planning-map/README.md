# Planning map: board.json export (ORISO-Docs#204, epic #197)

Seam 1 of the planning map: one stable, versioned file describing the ORISO Roadmap project (#1).

- Contract (pinned option lists, private repos): `board-contract.json`
- Output schema (v1): `board.schema.json`; validator: `lib/schema.mjs`; `validateBoard()` in `lib/board.mjs`
- Reusable module for the hub / a workflow: `lib/board.mjs` (`fetchAll`, `buildBoard`, `driftCheck`, `validateBoard`); inject any `run(query, vars)` GraphQL runner.

## Operator command (Mac, `gh` logged in with project read)

```sh
gh auth status   # needs scope read:project (gh auth refresh -s read:project)
node tools/planning-map/export-board.mjs --out board.json
```

Exit codes: 0 ok, 1 error/invalid, 2 drift (file is still written). Drift check alone: add `--drift-only`; `--strict` also fails while the Platform release options are not pinned yet.

Expected: about 2,757 items, `statusCounts` matching the board. ORISO-E2E (private) appears only in `privateCounts`; items GitHub redacts (no content, type REDACTED) and draft issues appear only in `hiddenCounts` (count and status, never a title or id).

## Unified run (one Stand for graph, board and counts)

Board status, code and test counts and the graph used to be produced at different times. A **run manifest** (`lib/run-manifest.mjs`) fixes one run id (`YYYYMMDDTHHMMSSZ-<8 hex of sha256(time, commits)>`), one timestamp and the commit of every repo, and is stamped into all three outputs: `project.run` in the super-graph, `run` in `board.json` (optional in the schema), `run` in every map data file.

```
node tools/planning-map/nightly-run.mjs --graph <knowledge-graph.json> --map-inputs <dir> --out <dir> \
     [--board-file board.json | --board-fixture f] [--commit Repo=<sha> ...] [--at <UTC>] [--trigger schedule|workflow_dispatch|manual]
node tools/planning-map/run-manifest.mjs check --graph g.json --board b.json --data-dir map-data/   # exit 1 on mixed runs
```

`nightly-run.mjs` is the one entry for the nightly schedule and for manual dispatch (`--trigger`). It builds the stamped set in a scratch directory, cross-checks it (`assertSameRun`) and only then writes `run.json`, `oriso-super-graph.json` and `map-data/*` (including `board.json`, listed under `optional` in `links.json`). Commits default to `graph.project.sourceCommits`; add repos with `--commit`. A board file that already carries another run's stamp is refused.

The map footer shows one "Stand" with the run id and commit per repo, and a warning if data files carry different runs or none.

**Integration points.**
- Board sync workflow (#208): do not add a second workflow. After `export-board.mjs`, call `stampBoard(board, manifest)` from `lib/run-manifest.mjs` (or `run-manifest.mjs stamp board <file> --manifest run.json`), or simply call `nightly-run.mjs --board-file <exported board.json>` as the last step of that workflow (the board file must be unstamped).
- Release pipeline (`tools/understand-anything/bundle/pipeline.py`, `ua-public-site.yml`) stays release-bound and sealed; its graph is the `--graph` input. It is not stamped in place (that would break the generation seal); `nightly-run.mjs` writes the stamped copy `oriso-super-graph.json`. No schedule is added to `ua-public-site.yml`.

## Known unverified assumption

Priority, Effort and Platform release are org issue fields. The queries in `lib/queries.mjs` assume `Issue.issueFieldValues` and `Organization.issueFields` with `IssueFieldSingleSelect*` types. They were written from the documented shape, not a live run. If the first live run errors, fix only `lib/queries.mjs` and `normalizeIssueFieldValues` / `liveOptions` in `lib/board.mjs`.

After the first live run, copy `fieldOptions.platformRelease` into `board-contract.json` to pin it.

## Tests

`node --test tools/planning-map/test/*.test.mjs` (recorded-shape fixture in `fixtures/`, page size 2).

Platform release is an org multi-select issue field (read via `IssueFieldMultiSelectValue.options`); more than one value on an issue is flagged in `warnings`. Readiness has no fixed range: `readinessRange` records the observed min/max.

## Watchers (ORISO-Docs#207)

`lib/watchers.mjs` runs inside `buildBoard` and writes `findings[]` (rule, severity, detail) plus `assignees[]` onto every public item, and `findingCounts` at the top level (all additive; v1 boards without them still validate). Rules: `stalled`, `closed-not-done`, `qa-external-no-bjoern`, `epic-no-readiness`, `gate-status-mismatch` (no-op until a Gate field exists, #211), `job-stale` (#216, see "Agent jobs"). All thresholds and the QA external reviewer live in `watchers.config.json`. Stalled = open item in a status with a configured limit, last updated more than that many days before `syncedAt`.

## Planning API and runner (ORISO-Docs#210)

Seam 2: `lib/planning-api.mjs`. `assignRelease(issue, release, {withSubIssues, expectedRelease, dryRun, transport})` sets the org issue field `Platform release` (multi-select, `IFMS_kgDOArcqMA`) to exactly one value. The GitHub transport is injected (`async (query, variables) => {data, errors}`); tests use `test/fake-github.mjs`, never the network. Every call returns a typed result and never throws:

- ok: `{ok: true, release, dryRun, results: [{issue, role, before, after, changed, wrote}]}`
- error: `{ok: false, error: {code, message, issue?, detail?}, applied: [...]}`; codes `NO_WRITE_RIGHTS`, `CONFLICT` (live value differs from `expectedRelease`), `NOT_FOUND`, `UNKNOWN_RELEASE` (detail lists the live names), `FIELD_MISSING`, `BAD_REQUEST`, `TRANSPORT`, `GITHUB_ERROR`.
- `withSubIssues` also moves direct sub-issues (any repository, paged). Rights on every target are checked before the first write; `applied` lists what was written if a later write still fails. A sub-issue the login cannot read (a null node) refuses the move; `detail.unreadable` lists each one by position with `NO_WRITE_RIGHTS` or `NOT_FOUND`. A body without data (401, SSO, `{data: null}`) is `NO_WRITE_RIGHTS` or `TRANSPORT`, never `FIELD_MISSING`/`NOT_FOUND`.

Local runner (uses the operator's `gh` login, shells out to `gh api graphql`, dry run by default):

```sh
node tools/planning-map/plan.mjs assign-release --issue OpenResilienceInitiative/ORISO-Frontend#1734 --release v2.0.13 --with-sub-issues --expect v2.0.12
node tools/planning-map/plan.mjs assign-release --issue ORISO-Frontend#1734=v2.0.12 --issue ORISO-Admin#88=none --release v2.0.13
node tools/planning-map/plan.mjs assign-release ... --apply     # only --apply writes
```

`--issue ref=<expected>` (or `=none`) is the expectation for that one issue and wins over `--expect`. Several `--issue` refs are all or nothing: every one is planned first (reads, rights, conflicts, sub-issues); if any fails, nothing is written and the JSON says `"preflight": "failed"`.

Exit codes: 0 ok, 1 planning error (typed JSON on stdout), 2 usage.

UNVERIFIED (not run against live GitHub from this sandbox): the write is the one constant `SET_RELEASE_MUTATION` (`setIssueFieldValue` with `multiSelectOptionIds`, from the GitHub GraphQL changelog entries of 2026-03-12 and 2026-06-04) and `releaseWriteVariables`; the read of option ids assumes `IssueFieldMultiSelect.options { id name }`. If the first `--apply` fails, change only those two places. Rights are read from `Issue.viewerCanUpdate`.

## Gate field (ORISO-Docs#211)

`gate-options.json` is the reviewed list of the eight Gate options (P1 Framed, P2 Specified, P3 Sliced, P4 Ready for agent, R1 Checks green, R2 AI review, R3 Human review, R4 Verified on Dev) with colour, GitHub description and entry criteria (DE/EN). The field does NOT exist yet. A project admin creates it once, with either command from `createField` in that file (generated by `lib/gate.mjs`, a test keeps them equal):

```sh
gh project field-create 1 --owner OpenResilienceInitiative --name Gate --data-type SINGLE_SELECT --single-select-options "P1 Framed,P2 Specified,P3 Sliced,P4 Ready for agent,R1 Checks green,R2 AI review,R3 Human review,R4 Verified on Dev"
```

(the `createField.graphql` variant, `createProjectV2Field` on `PVT_kwDODkeBP84BHH8p`, also sets colours and descriptions.) Nothing in this repo runs either command.

- `setGate(issue, gate, {expectedGate, dryRun, transport})` in `lib/planning-api.mjs` writes the project field with `updateProjectV2ItemFieldValue`; until the field exists it answers `FIELD_MISSING`. Also `plan.mjs set-gate --issue Org/Repo#1 --gate "R3 Human review" [--expect <gate>|none] [--apply]`.
- Export: `board.json` items carry `gate` (null while the field is absent) and `fieldOptions.gate`; the drift check compares the live options with `board-contract.json` only once the field exists.
- Gate/Status mismatch watcher: reviewed mapping in `watchers.config.json` (`gate.allowedStatuses`), literal truth table in `test/watchers.test.mjs`. Spec pairs: P4 with Ready, R1-R3 with In review, R4 with QA internal. Reviewed additions: P4 also In progress (the agent has started), R4 also QA external and Done (the client's lifecycle took over), every gate also On hold. P1-P3 only Backlog (and On hold). Items without a Gate are never flagged.
- Map: in the epic view each sub-issue with a gate shows a step indicator (8 steps, current one marked, criteria on hover) and a gate filter (all, no gate, one gate) that combines with the status filter. Both appear only once some issue has a gate.

UNVERIFIED: `SET_GATE_MUTATION` and `GATE_FIELD_QUERY` use the documented Projects v2 API shapes but were not run against the live board.

## Agent jobs (ORISO-Docs#216)

An agent reports its status into a marked section of the issue DESCRIPTION, so comments stay clean and GitHub keeps the edit history.

```
node tools/planning-map/job.mjs report --issue Org/Repo#123 --state running [--branch feat/x] [--pr "#5"] [--report https://...] \
     [--next "what comes next"] [--model name] [--machine label] [--runner local|cloud] [--apply]
```

- Dry run by default: prints the diff of the description. `--apply` writes. Uses the operator's `gh` login like `plan.mjs`. Exit 0 ok, 1 typed error (JSON), 2 usage.
- Every call merges into the section already there (`started` kept, branches and PRs added, `updated` = now), so repeating it is a heartbeat. After `done`/`failed`, a new `running` report starts a fresh run.
- The section sits between `<!-- oriso:job:start v1 -->` and `<!-- oriso:job:end -->` (each alone on its line, outside code fences). Only that text is replaced; without markers the section is appended; broken or doubled markers are refused (`BAD_MARKERS`). Text outside is byte-identical (tested).
- `writeJobSection(issue, job | (existing) => job, {expectedUpdatedAt, expectedBodyHash, dryRun, transport})` in `lib/planning-api.mjs`. The issue is read, planned, read again and only then written; a changed `updatedAt` or body is a `CONFLICT`. GitHub has no compare-and-set for `updateIssue`, so a human edit in the milliseconds between the second read and the write could still be overwritten (the edit history keeps it). UNVERIFIED against the live API: the `updateIssue` mutation and `Issue.body`/`updatedAt` reads.
- Section: a short Markdown summary plus a fenced `yaml` block with `state` (running, stopped, waiting-human, done, failed), `runner` (local, cloud), `machine`, `started`, `updated`, `model`, `branches`, `prs`, `next`, `report`. Validated (`lib/job.mjs`): closed enums, ISO UTC times, `machine` is a short label (no dots, so no host name; no `@`), secret patterns and addresses are refused in every text field, `report` must be an https link without credentials or token-like query keys. No host name or user name is ever added by the tool.
- Export: `buildBoard` parses the section of every public Issue into `items[].job` (additive). The description itself is never exported. Private repositories, drafts, redacted items and pull requests get no `job`; a damaged section gives a `warnings` entry (issue link only).
- Watcher `job-stale`: `state: running` and `updated` more than `jobStaleHours` (default 24, `watchers.config.json`) before the sync.
- Note: the board query now also fetches `Issue.body` (needed to find the section). That makes the project export heavier; if GitHub times out, lower the page size in `queries.mjs`.

## Human steering (ORISO-Docs#221)

Members steer an area with comments on one GitHub issue per capability (label `area-steering`, in ORISO-Docs). Automation never writes there.

```
node tools/planning-map/steering.mjs ensure --capability email-templates            # dry run: prints title and body
node tools/planning-map/steering.mjs ensure --capability email-templates --apply    # finds the issue, or creates it (and the label if missing)
node tools/planning-map/steering.mjs export --out steering.json                     # what the sync workflow runs
```

- Title `Steering: <capability title>` (title from `capability-rules.json`). The body carries the hidden marker
  `<!-- oriso:steering:v1 capability=<id> -->`; lookup and export find the issue by that marker among the `area-steering` issues, never by the
  title, so renaming or closing the issue changes nothing. Two issues for one capability: the lowest number wins, with a warning.
- Export keeps a comment only if `authorAssociation` is OWNER, MEMBER or COLLABORATOR and the author is a human account (no bots, no deleted
  accounts) and the comment is not minimized. Everything else is counted in `skipped` and leaves no trace (no name, no text). Per comment:
  author login, createdAt, url, authorAssociation, body as plain text (control characters removed, cut at 2000 characters with
  `truncated: true`). Per capability the newest 50 are kept; older member comments are counted in `omitted`.
- **Why a separate `steering.json` and not part of `board.json`:** the board is a project export with its own privacy rule (private repositories
  as counts) and drift contract; steering comes from issue comments of one public repository, needs its own failure handling (a failed steering
  export must not hold back the board; the workflow step is `continue-on-error`) and may be re-run on its own. A separate file also keeps
  board.schema.json, board-agg.js and its fixtures untouched. Schema: `steering.schema.json` (checked by `validateSteering`, the hub build
  and the tests). It travels in the same workflow artifact `planning-board`.
- Publication: `publication.mjs --steering <file>` validates it (ORISO-Docs links only) and publishes the optional `map/data/steering.json`.
  Without it the Health panel shows the command to create the steering issue.

### Agent input: `steeringFor(capabilityId)`

```js
import { steeringFor } from "./tools/planning-map/lib/steering.mjs";
const comments = steeringFor("email-templates", { file: "steering.json" }); // or { doc } with the parsed file
// [{author, createdAt, url, authorAssociation, body, truncated}, ...] newest first; [] if nobody has steered this area yet
```

For the #220 health job: put `comments` into the job input beside the criteria, and hash them into the run file like the criteria version.
It reads the file named by `{file}` or `$ORISO_STEERING_FILE`. It throws on a missing or invalid file, an unknown capability or a comment that is
not a member's: "no file" must never read as "nobody said anything". Treat the bodies as instructions from people, not as trusted code or shell.

## Send health check (ORISO-Docs#220)

`sendHealthCheck(scope, criteria, {dryRun, transport})` in `lib/planning-api.mjs` files ONE request issue in ORISO-Docs for a scope (`{capability, repo, path|null}`; `criteria` is the effective criteria from `resolveCriteria`).
The issue names the scope, the criteria version, the metrics and the exact `health-run.mjs run` command, and carries the hidden marker `<!-- oriso:health-check:v1 scope=<capability>/<repo>[/<path>] -->`.
Asking again for a scope with an open request finds it and writes nothing (the GitHub search is fuzzy, so the marker is compared exactly). The run itself is never started from here.
CLI: `node tools/planning-map/plan.mjs health-check --capability <id> --repo <name> [--path <folder>] [--apply]` (dry run by default). UNVERIFIED against the live API (no org access from the sandbox): the search query and `createIssue`;
adjust only the three documents `HealthCheckFind_QUERY`, `HealthCheckRepo_QUERY`, `HealthCheckCreate_MUTATION`. Tests: `test/planning-health-check.test.mjs`, `test/health-workflow.test.mjs`.
