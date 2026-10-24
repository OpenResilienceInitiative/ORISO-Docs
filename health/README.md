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
