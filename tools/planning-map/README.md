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

## Known unverified assumption

Priority, Effort and Platform release are org issue fields. The queries in `lib/queries.mjs` assume `Issue.issueFieldValues` and `Organization.issueFields` with `IssueFieldSingleSelect*` types. They were written from the documented shape, not a live run. If the first live run errors, fix only `lib/queries.mjs` and `normalizeIssueFieldValues` / `liveOptions` in `lib/board.mjs`.

After the first live run, copy `fieldOptions.platformRelease` into `board-contract.json` to pin it.

## Tests

`node --test tools/planning-map/test/*.test.mjs` (recorded-shape fixture in `fixtures/`, page size 2).

Platform release is an org multi-select issue field (read via `IssueFieldMultiSelectValue.options`); more than one value on an issue is flagged in `warnings`. Readiness has no fixed range: `readinessRange` records the observed min/max.

## Watchers (ORISO-Docs#207)

`lib/watchers.mjs` runs inside `buildBoard` and writes `findings[]` (rule, severity, detail) plus `assignees[]` onto every public item, and `findingCounts` at the top level (all additive; v1 boards without them still validate). Rules: `stalled`, `closed-not-done`, `qa-external-no-bjoern`, `epic-no-readiness`, `gate-status-mismatch` (no-op until a Gate field exists, #211). All thresholds and the QA external reviewer live in `watchers.config.json`. Stalled = open item in a status with a configured limit, last updated more than that many days before `syncedAt`.

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
