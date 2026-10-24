// Health history in map/data/health.json: a compact, capped list of runs per scope (ORISO-Docs#219, epic #213).
// Seam: buildHealthDoc(records) of lib/health-run.mjs, fed with real run records built from criteria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunManifest } from '../../../planning-map/lib/run-manifest.mjs';
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria } from '../lib/health-criteria.mjs';
import { CAPABILITY_IDS, CODE_REPOS } from '../lib/capabilities.mjs';
import { buildRunRecord, buildHealthDoc, runFile, HISTORY_CAP } from '../lib/health-run.mjs';

const SHA = n => String(n).repeat(40).slice(0, 40);
const set = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  lint: {threshold: 0, weight: 1}
---
x`, 'health/default.md')], { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
const effective = resolveCriteria(set, { capability: 'chat', path: 'ORISO-Frontend/' });
function rec({ at, size = 300, lint = 0, path = null, capability = 'chat', model = null, verdict = [], commit = SHA(1) }) {
  return buildRunRecord({
    manifest: createRunManifest({ at, commits: { 'ORISO-Frontend': commit } }), scope: { capability, repo: 'ORISO-Frontend', path }, commit, effective,
    measurements: { size: { value: size, source: 's', details: {} }, lint: { value: lint, source: 'l', details: {} } }, model, startedAt: at, verdict,
  });
}
const day = n => `2026-${String(1 + Math.floor((n - 1) / 28)).padStart(2, '0')}-${String(1 + ((n - 1) % 28)).padStart(2, '0')}T08:00:00Z`;

test('every scope gets its runs oldest first, compact: date, model, commit, overall, the score per criterion, the record file path', () => {
  const a = rec({ at: '2026-09-01T08:00:00Z', size: 900, lint: 4, commit: SHA(1) });
  const b = rec({ at: '2026-10-24T10:15:00Z', size: 300, lint: 0, model: 'claude-test', commit: SHA(2), verdict: [{ criterion: 'readability', score: 40, weight: 1, reasons: ['mixed concerns'] }] });
  const doc = buildHealthDoc([b, a]);
  assert.equal(doc.history.length, 1);
  const h = doc.history[0];
  assert.deepEqual(h.scope, { capability: 'chat', repo: 'ORISO-Frontend', path: null });
  assert.equal(h.total, 2);
  assert.deepEqual(h.runs.map(r => r.startedAt), ['2026-09-01T08:00:00Z', '2026-10-24T10:15:00Z']);
  const [x, y] = h.runs;
  assert.equal(x.file, runFile(a)); assert.equal(y.file, runFile(b));
  assert.equal(x.commit, SHA(1)); assert.equal(y.model, 'claude-test'); assert.equal(x.model, null);
  assert.equal(x.overall, a.overall); assert.equal(y.overall, b.overall);
  assert.deepEqual(y.metrics.map(m => [m.name, m.value, m.threshold, m.better, m.score]), [['size', 300, 400, 'lower', 100], ['lint', 0, 0, 'lower', 100]]);
  assert.deepEqual(x.metrics.map(m => [m.name, m.value, m.score]), [['size', 900, 0], ['lint', 4, 60]]);
  assert.deepEqual(y.verdict, [{ criterion: 'readability', score: 40 }], 'scores only: reasons stay in the full record');
  assert.equal(y.criteriaVersion, b.criteriaVersion);
});

test('the latest record per scope stays in records; the history is a second, separate list per scope', () => {
  const doc = buildHealthDoc([rec({ at: '2026-09-01T08:00:00Z' }), rec({ at: '2026-10-01T08:00:00Z' }), rec({ at: '2026-10-02T08:00:00Z', path: 'src/components/chat' })]);
  assert.equal(doc.records.length, 2);
  assert.deepEqual(doc.history.map(h => [h.scope.path, h.total]), [[null, 2], ['src/components/chat', 1]]);
});

test('the history is capped at the newest 50 runs per scope; total says how many exist', () => {
  assert.equal(HISTORY_CAP, 50);
  const many = Array.from({ length: 60 }, (_, i) => rec({ at: day(i + 1), size: 100 + i }));
  const doc = buildHealthDoc(many);
  const h = doc.history[0];
  assert.equal(h.total, 60); assert.equal(h.runs.length, 50);
  assert.equal(h.runs[0].startedAt, day(11)); assert.equal(h.runs[49].startedAt, day(60));
  assert.equal(doc.historyCap, 50);
  assert.ok(JSON.stringify(doc.history).length < 60000, 'compact: well below the size of the full records');
});

test('a not-available metric keeps value and score null in the history; no records is an empty history', () => {
  const r = buildRunRecord({
    manifest: createRunManifest({ at: '2026-10-01T08:00:00Z', commits: { 'ORISO-Frontend': SHA(1) } }), scope: { capability: 'chat', repo: 'ORISO-Frontend', path: null }, commit: SHA(1), effective,
    measurements: { size: { value: 10, source: 's', details: {} }, lint: { value: null, source: 'l', details: { reason: 'no linter' } } }, startedAt: '2026-10-01T08:00:00Z',
  });
  const m = buildHealthDoc([r]).history[0].runs[0].metrics.find(x => x.name === 'lint');
  assert.deepEqual([m.value, m.score], [null, null]);
  assert.deepEqual(buildHealthDoc([]), { schemaVersion: 1, records: [], history: [], historyCap: 50 });
});
