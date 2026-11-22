// Health run record: schema, scoring, paths, latest per scope (ORISO-Docs#218, epic #213).
// Seam: the public functions of lib/health-run.mjs, fed with plain objects; the file system only in the load tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRunManifest } from '../../../planning-map/lib/run-manifest.mjs';
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria } from '../lib/health-criteria.mjs';
import { CAPABILITY_IDS, CODE_REPOS } from '../lib/capabilities.mjs';
import {
  validateRunRecord, scoreMetric, computeOverall, criteriaVersion, buildRunRecord,
  runFile, parseRunFile, loadRuns, latestPerScope, buildHealthDoc,
} from '../lib/health-run.mjs';

const SHA = 'a'.repeat(40);
const AT = '2026-10-24T10:15:00Z';
const crit = (...files) => validateCriteriaSet(files.map(([id, front, body]) => parseCriteriaFile(`---\n${front}\n---\n${body ?? 'Judge by the numbers.'}`, `health/${id}.md`)), { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
const set = crit(['default', `scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
tests: []`]);
const effective = resolveCriteria(set, { capability: 'chat', path: 'ORISO-Frontend/' });
const scope = { capability: 'chat', repo: 'ORISO-Frontend', path: null };
const measurements = {
  size: { value: 300, source: 'health-run size: 12 files', details: { largest: [] } },
  'test-ratio': { value: 0.25, source: 'health-run test-ratio', details: {} },
  lint: { value: null, source: 'eslint', details: { reason: 'no linter configuration found' } },
  duplication: { value: 2.5, source: 'health-run duplication', details: {} },
};
const build = (over = {}) => buildRunRecord({
  manifest: createRunManifest({ at: AT, commits: { 'ORISO-Frontend': SHA }, trigger: 'health-run' }),
  scope, commit: SHA, effective, measurements, model: null, startedAt: AT, ...over,
});

test('scoring: pass at the threshold, linear to zero at twice the threshold, zero threshold costs 10 points per unit', () => {
  assert.deepEqual(scoreMetric({ value: 400, threshold: 400, better: 'lower' }), { pass: true, score: 100 });
  assert.deepEqual(scoreMetric({ value: 600, threshold: 400, better: 'lower' }), { pass: false, score: 50 });
  assert.deepEqual(scoreMetric({ value: 900, threshold: 400, better: 'lower' }), { pass: false, score: 0 });
  assert.deepEqual(scoreMetric({ value: 0, threshold: 0, better: 'lower' }), { pass: true, score: 100 });
  assert.deepEqual(scoreMetric({ value: 3, threshold: 0, better: 'lower' }), { pass: false, score: 70 });
  assert.deepEqual(scoreMetric({ value: 0.25, threshold: 0.5, better: 'higher' }), { pass: false, score: 50 });
  assert.deepEqual(scoreMetric({ value: 7, threshold: 7, better: 'higher' }), { pass: true, score: 100 });
  assert.deepEqual(scoreMetric({ value: null, threshold: 5, better: 'lower' }), { pass: null, score: null }, 'not available is never scored as 0');
});

test('a record is built from criteria and measurements: weights, units and scores come from the criteria, not from the caller', () => {
  const r = build();
  assert.deepEqual(validateRunRecord(r), []);
  const by = Object.fromEntries(r.metrics.map(m => [m.name, m]));
  assert.deepEqual(r.metrics.map(m => m.name), ['size', 'test-ratio', 'lint', 'duplication']);
  assert.equal(by.size.threshold, 400); assert.equal(by.size.weight, 1); assert.equal(by.size.unit, 'lines per file'); assert.equal(by.size.better, 'lower');
  assert.equal(by.size.pass, true); assert.equal(by.size.score, 100);
  assert.equal(by['test-ratio'].pass, false); assert.equal(by['test-ratio'].score, 50);
  assert.equal(by.lint.status, 'not-available'); assert.equal(by.lint.value, null); assert.equal(by.lint.pass, null); assert.equal(by.lint.score, null);
  assert.equal(by.duplication.score, 100);
  assert.equal(r.model, null); assert.deepEqual(r.verdict, []);
  assert.equal(r.criteriaVersion, criteriaVersion(effective));
  assert.equal(r.run.commits['ORISO-Frontend'], SHA);
  assert.deepEqual(r.links, { graphNode: 'capability:chat', source: `https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${SHA}` });
});

test('overall is the weighted mean over the scored criteria; a criterion without a value does not count as 0', () => {
  // size 100 (w1), test-ratio 50 (w2), duplication 100 (w1); lint not available (w2, left out): (100 + 100 + 100) / 4 = 75
  assert.equal(build().overall, 75);
  assert.equal(computeOverall([], []), null);
  assert.equal(computeOverall([{ score: null, weight: 3 }], []), null);
  assert.equal(computeOverall([{ score: 80, weight: 1 }], [{ score: 20, weight: 3 }]), 35);
});

test('a metric with weight 0 is switched off: it is not in the record', () => {
  const off = resolveCriteria(crit(['default', 'scope: "*"\nmetrics:\n  size: {threshold: 400, weight: 0}\n  lint: {threshold: 0, weight: 1}']), { capability: 'chat', path: 'ORISO-Frontend/' });
  const r = build({ effective: off, measurements: { lint: { value: 2, source: 'eslint', details: {} } } });
  assert.deepEqual(r.metrics.map(m => m.name), ['lint']);
});

test('criteria version is the hash of what the run was judged by; origin files do not change it', () => {
  const same = resolveCriteria(crit(['default', 'scope: "*"\nmetrics:\n  duplication: {threshold: 5, weight: 1}\n  lint: {threshold: 0, weight: 2}\n  test-ratio: {threshold: 0.5, weight: 2}\n  size: {threshold: 400, weight: 1}\ntests: []']), { capability: 'chat', path: 'ORISO-Frontend/' });
  assert.equal(criteriaVersion(same), criteriaVersion(effective), 'key order and file layout do not matter');
  const changed = resolveCriteria(crit(['default', 'scope: "*"\nmetrics:\n  size: {threshold: 500, weight: 1}\n  test-ratio: {threshold: 0.5, weight: 2}\n  lint: {threshold: 0, weight: 2}\n  duplication: {threshold: 5, weight: 1}\ntests: []']), { capability: 'chat', path: 'ORISO-Frontend/' });
  assert.notEqual(criteriaVersion(changed), criteriaVersion(effective));
  assert.match(criteriaVersion(effective), /^[0-9a-f]{64}$/);
});

test('a model verdict is stored per criterion with mandatory reasons and joins the overall', () => {
  const r = build({ model: 'claude-test', verdict: [{ criterion: 'maintainability', score: 40, weight: 1, reasons: ['Two 600 line files mix rendering and state.'] }] });
  assert.deepEqual(validateRunRecord(r), []);
  assert.equal(r.overall, Math.round((300 + 40) / 5)); // 300 from the metrics (weights 4), 40 * 1 from the verdict
  assert.throws(() => build({ model: 'm', verdict: [{ criterion: 'x', score: 10, weight: 1, reasons: [] }] }), /reasons/);
  assert.throws(() => build({ model: null, verdict: [{ criterion: 'x', score: 10, weight: 1, reasons: ['r'] }] }), /model/);
  assert.throws(() => build({ model: 'm', verdict: [{ criterion: 'size', score: 10, weight: 1, reasons: ['r'] }] }), /metric/);
});

test('schema: every required field is enforced and unknown fields are refused', () => {
  const good = build();
  for (const k of Object.keys(good)) {
    const bad = structuredClone(good); delete bad[k];
    assert.ok(validateRunRecord(bad).some(e => e.includes(k)), `missing ${k} is reported`);
  }
  assert.ok(validateRunRecord({ ...good, extra: 1 }).some(e => /extra/.test(e)));
  assert.ok(validateRunRecord({ ...good, commit: 'abc' }).some(e => /commit/.test(e)));
  assert.ok(validateRunRecord({ ...good, schemaVersion: 2 }).length > 0);
  assert.ok(validateRunRecord('x').length > 0);
});

test('semantic rules: unknown metric, fake numbers, wrong overall, commit that is not in the manifest', () => {
  const rec = mut => { const r = structuredClone(build()); mut(r); return validateRunRecord(r).join('\n'); };
  assert.match(rec(r => { r.metrics[0].name = 'cyclomatic'; }), /unknown metric cyclomatic/);
  assert.match(rec(r => { r.metrics[1].name = 'size'; }), /duplicate metric size/);
  assert.match(rec(r => { r.metrics[2].value = 0; }), /not-available.*null/s, 'a not-available metric cannot carry a value');
  assert.match(rec(r => { r.metrics[0].status = 'not-available'; }), /not-available/);
  assert.match(rec(r => { r.metrics[0].pass = false; }), /pass.*value/s);
  assert.match(rec(r => { r.metrics[0].score = 12; }), /score.*value/s);
  assert.match(rec(r => { r.metrics[0].score = 120; }), /score does not follow/);
  assert.match(rec(r => { r.overall = 99; }), /overall/);
  assert.match(rec(r => { r.overall = 0; }), /overall/);
  assert.match(rec(r => { r.run.commits['ORISO-Frontend'] = 'b'.repeat(40); }), /commit/);
  assert.match(rec(r => { r.scope.capability = 'invented'; }), /capability/);
  assert.match(rec(r => { r.links.graphNode = 'capability:other'; }), /graphNode/);
  assert.match(rec(r => { r.links.source = 'https://github.com/x/y/tree/' + SHA; }), /source/);
  assert.match(rec(r => { r.model = null; r.verdict = [{ criterion: 'structure', score: 1, weight: 1, reasons: ['r'] }]; }), /model/);
  assert.match(rec(r => { r.metrics[0].details = { blob: 'x'.repeat(21000) }; }), /20000/);
  assert.match(rec(r => { r.startedAt = '2026-10-24 10:15'; }), /startedAt/);
});

test('a folder scope links to the folder node and to the folder on GitHub at the commit', () => {
  const r = build({ scope: { capability: 'chat', repo: 'ORISO-Frontend', path: 'src/components/chat' } });
  assert.deepEqual(validateRunRecord(r), []);
  assert.equal(r.links.graphNode, 'ORISO-Frontend::folder:src/components/chat');
  assert.equal(r.links.source, `https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${SHA}/src/components/chat`);
  assert.throws(() => build({ scope: { capability: 'chat', repo: 'ORISO-Frontend', path: '../etc' } }), /path/);
  assert.throws(() => build({ scope: { capability: 'chat', repo: 'ORISO-Frontend', path: '/abs' } }), /path/);
});

test('file layout: health/runs/<capability>/<repo>/[at/<path>/]<timestamp>.json, and it round-trips', () => {
  assert.equal(runFile(build()), 'health/runs/chat/ORISO-Frontend/20261024T101500Z.json');
  const folder = build({ scope: { capability: 'chat', repo: 'ORISO-Frontend', path: 'src/__tests__/x' } });
  assert.equal(runFile(folder), 'health/runs/chat/ORISO-Frontend/at/src/__tests__/x/20261024T101500Z.json');
  assert.deepEqual(parseRunFile(runFile(folder)), { scope: folder.scope, stamp: '20261024T101500Z' });
  assert.deepEqual(parseRunFile(runFile(build())), { scope, stamp: '20261024T101500Z' });
  assert.equal(parseRunFile('health/runs/chat/x.json'), null);
  assert.equal(parseRunFile('elsewhere/chat/ORISO-Frontend/20261024T101500Z.json'), null);
});

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'health-runs-'));
const put = (root, rec, file = runFile(rec)) => { const p = path.join(root, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(rec, null, 2) + '\n'); return p; };

test('latest record per scope; older runs stay as history; the doc for the map holds the latest in full and the rest as compact history (#219)', () => {
  const root = tmp();
  const old = build({ startedAt: '2026-09-01T08:00:00Z', manifest: createRunManifest({ at: '2026-09-01T08:00:00Z', commits: { 'ORISO-Frontend': 'b'.repeat(40) } }), commit: 'b'.repeat(40) });
  const fresh = build();
  const folder = build({ scope: { capability: 'chat', repo: 'ORISO-Frontend', path: 'src/x' } });
  const other = build({ scope: { capability: 'chat', repo: 'ORISO-Admin', path: null }, manifest: createRunManifest({ at: AT, commits: { 'ORISO-Admin': SHA } }) });
  for (const r of [old, fresh, folder, other]) put(root, r);
  const runs = loadRuns(root).map(x => x.record);
  assert.equal(runs.length, 4);
  const latest = latestPerScope(runs);
  assert.equal(latest.length, 3);
  assert.ok(latest.includes(runs.find(r => r.startedAt === AT && r.scope.path === null && r.scope.repo === 'ORISO-Frontend')));
  const doc = buildHealthDoc(runs);
  assert.equal(doc.schemaVersion, 1); assert.equal(doc.records.length, 3);
  assert.deepEqual(doc.records.map(r => r.scope.repo + '/' + (r.scope.path ?? '')), ['ORISO-Admin/', 'ORISO-Frontend/', 'ORISO-Frontend/src/x'], 'stable order');
  assert.deepEqual(buildHealthDoc([]), { schemaVersion: 1, records: [], history: [], historyCap: 50 }, 'no records is a valid, empty doc');
  assert.equal(loadRuns(path.join(root, 'nothing-here')).length, 0, 'a missing health folder is an empty history');
});

test('a broken file stops the load: invalid record, record in the wrong folder, unreadable JSON', () => {
  let root = tmp(); const r = build();
  put(root, { ...r, overall: 1 });
  assert.throws(() => loadRuns(root), /20261024T101500Z\.json.*overall/s);
  root = tmp(); put(root, r, 'health/runs/chat/ORISO-Frontend/20261025T000000Z.json');
  assert.throws(() => loadRuns(root), /path.*does not match/s);
  root = tmp(); put(root, r, 'health/runs/notifications/ORISO-Frontend/20261024T101500Z.json');
  assert.throws(() => loadRuns(root), /path.*does not match/s);
  root = tmp(); fs.mkdirSync(path.join(root, 'health/runs/chat/ORISO-Frontend'), { recursive: true });
  fs.writeFileSync(path.join(root, 'health/runs/chat/ORISO-Frontend/20261024T101500Z.json'), '{nope');
  assert.throws(() => loadRuns(root), /not JSON/);
});

// ORISO-Docs#213 review (finding 9): a verdict criterion is one of the review criteria the verdict step asks for, with the weight the
// step produces (1); the scope's repository is one of the code repositories. A record that says otherwise did not come from the tooling.
test('validateRunRecord: verdict criteria must be review criteria with weight 1, scope.repo must be a code repository', async () => {
  const { REVIEW_CRITERIA } = await import('../lib/health-verdict.mjs');
  const { CODE_REPOS } = await import('../lib/capabilities.mjs');
  const ok = build({ model: 'm', verdict: REVIEW_CRITERIA.map(c => ({ criterion: c, score: 50, weight: 1, reasons: ['r'] })) });
  assert.deepEqual(validateRunRecord(ok), []);
  const rec = mut => { const r = structuredClone(ok); mut(r); return validateRunRecord(r).join('\n'); };
  assert.match(rec(r => { r.verdict[0].criterion = 'readability'; }), /verdict\[0\] readability: not a review criterion \(maintainability, test-quality, structure\)/);
  assert.match(rec(r => { r.verdict[1].weight = 2; r.overall = null; }), /verdict\[1\] test-quality: weight must be 1/);
  assert.match(rec(r => { r.verdict.push({ ...r.verdict[0] }); }), /duplicate verdict criterion maintainability/);
  assert.ok(!CODE_REPOS.includes('ORISO-E2E'));
  assert.match(rec(r => { r.scope.repo = 'ORISO-E2E'; r.run.commits = { 'ORISO-E2E': r.commit }; r.links.source = r.links.source.replace('ORISO-Frontend', 'ORISO-E2E'); }), /scope\.repo: ORISO-E2E is not a code repository/);
  assert.throws(() => build({ model: 'm', verdict: [{ criterion: 'readability', score: 40, reasons: ['r'] }] }), /review criterion/);
});
