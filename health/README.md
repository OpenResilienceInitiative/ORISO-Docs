# Health run records

One JSON file per health run and scope. They are the only source of every number the map's Health view shows
(epic [ORISO-Docs#213](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/213), ticket #218). The Understand viewer node panel
([ADR-028](../oriso-platform/decisions/ADR-028-capability-map-stays-in-hub-health-in-viewer-node-panel.md), step 2) reads the same files, so this schema is the contract.

Commits to `health/runs/` come only from the scheduled health workflow or a pull request. Nothing here is edited by hand.

## Layout

```
health/runs/<capability>/<repo>/<timestamp>.json                    whole capability inside one repository
health/runs/<capability>/<repo>/at/<folder path>/<timestamp>.json   one folder of it
```

- `<capability>` is an id of `tools/understand-anything/platform/capabilities/capability-rules.json` (for example `chat`, `email-templates`, `shared`).
- `<repo>` is the repository that was measured (for example `ORISO-Frontend`). A capability that spans repositories has one scope per repository.
- `<folder path>` is relative to the repository root, without leading or trailing slash (`src/components/chat`).
- `<timestamp>` is `startedAt` as `YYYYMMDDTHHMMSSZ`. A file is never overwritten; the history of a scope is the list of its files.
- The loader refuses a file that sits in a folder that does not match its own `scope` and `startedAt`.

The latest record per scope (newest `startedAt`) goes into `map/data/health.json`. Before and after of two runs is a comparison of two files.

`health.json` also holds a compact **history** per scope (ORISO-Docs#219): `history: [{scope, total, runs}]`, `historyCap: 50`. `runs` are the newest 50 runs of the scope,
oldest first; each has `file` (path of its full record under `health/runs/`), `startedAt`, `model`, `commit`, `criteriaVersion`, `overall`, the value, threshold, `better`
and score of every metric, and the score of every verdict criterion. Reasons and `details` are not copied: the map keeps the file small (about 600 bytes per run) and the
full record stays reachable by `file`. When a scope has more than 50 runs, `total` says so and the panel shows "last 50 of N runs". Raising the cap is a change of
`HISTORY_CAP` in `platform/lib/health-run.mjs`.

## Record (schema: `tools/understand-anything/platform/health-run.schema.json`, version 1)

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `run` | Run manifest of the planning map (#201): `runId`, `generatedAt`, `commits` per repository. `commits[scope.repo]` equals `commit`. |
| `scope` | `{capability, repo, path}`; `path` is `null` for the whole capability. |
| `commit` | 40-character id of the measured commit. |
| `criteriaVersion` | sha256 of the effective criteria the run was judged by: threshold and weight per metric, the tests, the reviewer instruction. Which file a key came from is not part of it. |
| `model` | Model that wrote the verdict, `null` for a metrics-only run. |
| `startedAt` | UTC ISO time. |
| `metrics[]` | `name` (closed list, `platform/lib/health-metrics.mjs`), `status` (`measured` or `not-available`), `value`, `threshold`, `better`, `unit`, `weight`, `pass`, `score`, `source`, `details`. |
| `verdict[]` | Per criterion judged by the model: `criterion`, `score` 0 to 100, `weight`, `reasons` (at least one). Empty when `model` is `null`. A verdict criterion is never a metric name: metrics are scored by threshold. |
| `verdictStatus` | Optional (#220). `ran`: a model wrote the verdict. `skipped`: the AI step did not run (no secret, no model configured, private repository, model error); then `model` is `null` and `verdict` is empty. Absent in records of runs that never tried. |
| `verdictNote` | Optional. Why the verdict was skipped. Never contains a secret. |
| `inputs` | Optional (#220). `criteria`: sha256 of the criteria the model was given, equal to `criteriaVersion`. `steering`: sha256 of the member steering comments it was given (author, time, text), or `null` when no steering source was available. |
| `overall` | Weighted mean of all scored criteria (metric scores and verdict scores), rounded to an integer; `null` when nothing was scored. |
| `links` | `graphNode` (`capability:<id>` or `<repo>::folder:<path>`), `source` (GitHub tree URL of the measured folder at `commit`). |

A metric that could not be measured is `not-available`: `value`, `pass` and `score` are `null` and `details.reason` says why (no linter configuration, no
coverage file, no templates). It is never 0 and does not count in `overall`. Metrics with weight 0 in the criteria are switched off and not in the record.
`details` is a JSON object of at most 20,000 bytes: the worst offenders, counts, the reason.

### Score

A proposal, like the thresholds, until the first runs show a real distribution.

- `lower` is better (size, lint, duplication, crap, email-render, email-links): value at or under the threshold scores 100; the score falls linearly to 0 at twice the threshold. A threshold of 0 (lint, broken links) costs 10 points per unit.
- `higher` is better (test-ratio, email-languages): value at or over the threshold scores 100, otherwise `100 * value / threshold`.
- `overall = round(sum(score * weight) / sum(weight))` over metrics with a score and weight above 0 and verdict entries.

The validator recomputes `pass`, `score` and `overall` from the other fields and rejects a record where they differ, so a number cannot be written that the rest of the record does not support.

## Metric runner

    node tools/understand-anything/platform/health-run.mjs run --capability <id> --repo <name> --checkout <dir> \
        [--path <folder>] [--coverage <lcov.info|coverage-final.json>] [--commit <sha>] [--allow-dirty] \
        [--model <name> --verdict <verdict.json>] [--root <docs repo>] [--now <UTC time>] [--dry-run]
    node tools/understand-anything/platform/health-run.mjs validate

`run` takes the effective criteria for the scope (`platform/capabilities/health`, nearest file wins, see #217), computes the metrics they name for the files of
the capability inside the checkout (the capability of a file comes from the capability rules, as on the map) and writes one record. The checkout must be
clean unless `--commit` or `--allow-dirty` is given, because the record names the commit. `--dry-run` prints without writing.

| Metric | How it is measured | Not available when |
| --- | --- | --- |
| `size` | Lines of the largest production code file (java, ts, tsx, js, jsx; physical lines like `wc -l`). | no production code in scope |
| `test-ratio` | Test code lines per production code line. No tests at all is a measured 0. | no production code in scope |
| `lint` | Findings of the checkout's own `eslint --format json` (only with an eslint configuration and an installed eslint; the checkout's eslint is executed, so run it on trusted checkouts only). | no linter configuration, eslint not installed, eslint fails, no JS/TS files |
| `duplication` | Share of code lines in a repeated window of 50 tokens (comments, whitespace and imports ignored, identifiers not normalised). | no production code |
| `crap` | Per function: `complexity^2 * (1 - coverage)^3 + complexity`. Complexity from the TypeScript AST (if, loops, catch, `?:`, case, `&&`, `\|\|`, `??`). Coverage is the share of covered lines inside the function, from a coverage file that is **given** (lcov or istanbul). The value is the worst function. | no coverage file (`details.state: no-coverage`), unreadable file, no function with coverage data. Files the report does not know are listed in `details.filesWithoutCoverage`, not counted as 0 % |
| `email-render` | Templates (`html`, `htm`, `ftl` and their `txt` twins) that fail a static well-formedness check: tags nest and close, FreeMarker blocks close, placeholders close, file not empty. No template engine runs. | no templates in scope |
| `email-links` | Broken links: empty, `#`, relative, `javascript:`, malformed, `undefined`/`null` values. Placeholders are fine. No link is fetched. | no templates in scope |
| `email-languages` | Variants (`de-sie`, `de-du`, `en`, `fr`, `ru`, `ti`, `tr`) that have a template; `details.missing` lists the gaps per occasion. | no templates, or none inside a variant folder |

Tests: `platform/test/health-run.test.mjs` (schema, scoring, layout), `platform/test/health-measure.test.mjs` (one fixture repository per metric),
`platform/test/health-run-cli.test.mjs`. Map side: `tools/understand-anything/site/hub/README.md`, "Views".

## Scheduled runs and the AI verdict (#220)

`.github/workflows/health-runs.yml` runs nightly and on demand (optional input `scope`, `<capability>/<repo>`), on `main` or `dev` only.

1. **measure**: clones the public code repositories (`health-run.mjs repos`, branch `dev`, full history), then
   `health-run.mjs detect` selects the scopes that are new (never run) or whose files changed since the commit of their latest record
   (`git diff <commit>..HEAD`, files assigned to capabilities by the same rules as the map; at most 6 per run, never-run first, then the longest wait).
   `health-run.mjs run-selected` measures them and then calls the verdict step.
2. **propose**: validates the new records and opens one pull request against `dev` (`bot/health-runs-<run id>`, `Refs ...#213`). Nothing is merged by the workflow.
   While such a pull request is open, the next run stops before it does any work.

The verdict step (`platform/lib/health-verdict.mjs`) gives the model the effective criteria, the member steering comments of the capability and the metrics just measured,
and no source code. It scores three review criteria (`maintainability`, `test-quality`, `structure`) from 0 to 100 with reasons; metrics stay scored by threshold.
Configuration is environment only: `HEALTH_MODEL_API_KEY` (secret), `HEALTH_MODEL` (model name), `HEALTH_MODEL_PROVIDER` (`anthropic` default, or `openai` for any
OpenAI-compatible endpoint with `HEALTH_MODEL_BASE_URL`). Without the key or the model name the record is metrics only (`verdictStatus: skipped`). Repositories that are not known
public are never sent unless `HEALTH_MODEL_ALLOW_PRIVATE=true` (the workflow never sets it). A model error or an unusable answer also leaves a skipped verdict with the reason.

Metrics that need an installed checkout (`lint`, `crap` coverage) are `not-available` in the workflow runs; they are measured when a run is made on a prepared checkout.

"Send health check" for one scope: `node tools/planning-map/plan.mjs health-check --capability <id> --repo <name> [--path <folder>] [--apply]` files one request issue in ORISO-Docs
(dry run without `--apply`; an open request for the same scope is found, not duplicated). The Health panel shows this command for the capability, folder or file the map is drilled into.
