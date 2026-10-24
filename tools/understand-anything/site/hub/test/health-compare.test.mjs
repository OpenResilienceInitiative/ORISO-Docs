// compareRuns(a, b): before/after of two runs of one scope (ORISO-Docs#219, epic #213). Pure function of map/views.js (classic script).
// Fixtures are real run records (the builder the CLI uses) and their compact history form (what health.json carries).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord, buildHistory} from '../../../platform/lib/health-run.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const plain = x => JSON.parse(JSON.stringify(x));
const compareRuns = (a, b) => plain(sandbox.MapViews.compareRuns(a, b));

const crit = (size = 400) => resolveCriteria(validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: ${size}, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
---
x`, 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS}), {capability: 'chat', path: 'ORISO-Frontend/'});
const m = (value, reason) => ({value, source: 'test', details: reason ? {reason} : {}});
function rec(at, meas, {model = null, verdict = [], size = 400, commit = 'a'.repeat(40)} = {}) {
  return buildRunRecord({
    manifest: createRunManifest({at, commits: {'ORISO-Frontend': commit}}), scope: {capability: 'chat', repo: 'ORISO-Frontend', path: null}, commit,
    effective: crit(size), measurements: {size: m(meas[0]), 'test-ratio': m(meas[1]), lint: meas[2] === null ? m(null, 'no linter configuration') : m(meas[2]), duplication: m(meas[3])},
    model, startedAt: at, verdict,
  });
}
// A (before): overall 53. B (after, a refactoring): overall 90. Scores worked out by hand from the rules in health/README.md.
const A = rec('2026-09-01T08:00:00Z', [900, 0.25, 4, 2.5], {model: 'claude-test', verdict: [{criterion: 'readability', score: 40, weight: 1, reasons: ['Two 600 line files mix rendering and state.']}]});
const B = rec('2026-10-24T10:15:00Z', [300, 0.5, 0, 8], {model: 'claude-test', commit: 'b'.repeat(40), verdict: [{criterion: 'readability', score: 70, weight: 1, reasons: ['Split into small files.', 'State moved to a hook.']}]});
const by = (list, key, name) => list.find(x => x[key] === name);

test('fixtures are what the hand calculation says (guards the expected values below)', () => {
  assert.deepEqual([A.overall, B.overall], [Math.round((0 * 1 + 50 * 2 + 60 * 2 + 100 + 40) / 7), Math.round((100 + 200 + 200 + 40 + 70) / 7)]);
});

test('per metric: value delta, direction by `better`, and why', () => {
  const c = compareRuns(A, B);
  const size = by(c.metrics, 'name', 'size'), ratio = by(c.metrics, 'name', 'test-ratio'), lint = by(c.metrics, 'name', 'lint'), dup = by(c.metrics, 'name', 'duplication');
  assert.deepEqual([size.from, size.to, size.delta, size.direction], [900, 300, -600, 'better'], 'lower is better: the file got smaller');
  assert.deepEqual([ratio.from, ratio.to, ratio.delta, ratio.direction], [0.25, 0.5, 0.25, 'better'], 'higher is better: more tests');
  assert.deepEqual([lint.from, lint.to, lint.delta, lint.direction], [4, 0, -4, 'better']);
  assert.deepEqual([dup.from, dup.to, dup.delta, dup.direction], [2.5, 8, 5.5, 'worse'], 'duplication grew');
  assert.deepEqual(size.reasons, ['into-threshold']); assert.deepEqual(dup.reasons, ['out-of-threshold']);
  assert.deepEqual([size.scoreFrom, size.scoreTo, size.scoreDelta], [0, 100, 100]);
  assert.deepEqual([size.better, dup.better], ['lower', 'lower']);
  assert.deepEqual(c.metrics.map(x => x.name), ['size', 'test-ratio', 'lint', 'duplication'], 'order of the later run');
});

test('per criterion of the model: score delta (higher is better), the reasons of both runs as text', () => {
  const c = compareRuns(A, B);
  assert.equal(c.criteria.length, 1);
  const r = c.criteria[0];
  assert.deepEqual([r.criterion, r.from, r.to, r.delta, r.direction], ['readability', 40, 70, 30, 'better']);
  assert.deepEqual(r.notes, {from: ['Two 600 line files mix rendering and state.'], to: ['Split into small files.', 'State moved to a hook.']});
});

test('overall: delta and direction, and a count of what got better and worse', () => {
  const c = compareRuns(A, B);
  assert.deepEqual([c.overall.from, c.overall.to, c.overall.delta, c.overall.direction], [A.overall, B.overall, B.overall - A.overall, 'better']);
  assert.deepEqual(c.counts, {better: 4, worse: 1, same: 0, unknown: 0});
  assert.equal(compareRuns(B, A).overall.direction, 'worse');
  assert.equal(compareRuns(B, A).metrics[0].direction, 'worse', 'the size grew again');
});

test('the same run twice: nothing changed; identical values are `same`, never better or worse', () => {
  const c = compareRuns(B, B);
  assert.ok(c.metrics.every(x => x.direction === 'same' && x.delta === 0 && x.reasons.includes('unchanged')));
  assert.equal(c.overall.direction, 'same'); assert.deepEqual(c.counts, {better: 0, worse: 0, same: 5, unknown: 0});
});

test('a metric that could not be measured on one side is unknown, with the reason, never a delta against 0', () => {
  const noLint = rec('2026-09-15T08:00:00Z', [500, 0.4, null, 3]);
  const c = compareRuns(noLint, B);
  const lint = by(c.metrics, 'name', 'lint');
  assert.deepEqual([lint.from, lint.to, lint.delta, lint.direction], [null, 0, null, 'unknown']);
  assert.deepEqual(lint.reasons, ['not-measured-before']);
  assert.deepEqual(lint.notes, {from: ['no linter configuration'], to: []});
  const back = by(compareRuns(B, noLint).metrics, 'name', 'lint');
  assert.deepEqual(back.reasons, ['not-measured-now']);
  assert.equal(c.counts.unknown, 2, 'lint, and the criterion only the later run has');
});

test('a criterion only one run has is unknown; a changed threshold or criteria version is flagged', () => {
  const plainRun = rec('2026-09-15T08:00:00Z', [500, 0.4, 1, 3]);
  const c = compareRuns(plainRun, B);
  assert.deepEqual([c.criteria[0].direction, c.criteria[0].reasons, c.criteria[0].from], ['unknown', ['only-in-later'], null]);
  assert.equal(compareRuns(B, plainRun).criteria[0].reasons[0], 'only-in-earlier');
  const loose = rec('2026-09-20T08:00:00Z', [500, 0.4, 1, 3], {size: 600});
  const d = compareRuns(loose, B);
  assert.equal(d.criteriaChanged, true);
  const size = by(d.metrics, 'name', 'size');
  assert.ok(size.reasons.includes('threshold-changed')); assert.deepEqual([size.thresholdFrom, size.thresholdTo], [600, 400]);
  assert.equal(compareRuns(A, B).criteriaChanged, false);
});

test('works on the compact history entries too (what the map holds for past runs), mixed with a full record', () => {
  const [ca, cb] = buildHistory([A, B])[0].runs;
  assert.deepEqual(compareRuns(ca, cb).metrics, compareRuns(A, B).metrics.map(x => ({...x, notes: {from: [], to: []}})));
  const mixed = compareRuns(ca, B);
  assert.equal(mixed.overall.delta, B.overall - A.overall);
  assert.deepEqual(mixed.criteria[0].notes, {from: [], to: ['Split into small files.', 'State moved to a hook.']}, 'a compact run has no reasons; the full one does');
});

test('inputs are not changed, and nonsense does not throw', () => {
  const before = JSON.stringify([A, B]);
  compareRuns(A, B);
  assert.equal(JSON.stringify([A, B]), before);
  assert.equal(sandbox.MapViews.compareRuns(null, B), null);
  assert.equal(sandbox.MapViews.compareRuns(A, {}), null);
});
