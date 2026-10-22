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
