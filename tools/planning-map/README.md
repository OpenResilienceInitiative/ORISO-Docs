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

Expected: about 2,757 items, `statusCounts` matching the board. ORISO-E2E (private) appears only in `privateCounts`.

## Known unverified assumption

Priority, Effort and Platform release are org issue fields. The queries in `lib/queries.mjs` assume `Issue.issueFieldValues` and `Organization.issueFields` with `IssueFieldSingleSelect*` types. They were written from the documented shape, not a live run. If the first live run errors, fix only `lib/queries.mjs` and `normalizeIssueFieldValues` / `liveOptions` in `lib/board.mjs`.

After the first live run, copy `fieldOptions.platformRelease` into `board-contract.json` to pin it.

## Tests

`node --test tools/planning-map/test/*.test.mjs` (recorded-shape fixture in `fixtures/`, page size 2).
