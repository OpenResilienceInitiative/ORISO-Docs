// Health run records (ORISO-Docs#218, epic #213): build, validate, store and read.
//
// One JSON file per run and scope, schema in platform/health-run.schema.json, layout in health/README.md:
//   health/runs/<capability>/<repo>/<timestamp>.json                 scope = whole capability inside the repository
//   health/runs/<capability>/<repo>/at/<folder path>/<timestamp>.json  scope = a folder of it
// The record is the only source of every number the Health view shows (spec story 24): nothing is derived
// on the page. A metric that could not be measured is "not-available" with value, pass and score null, never 0.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { validate } from '../../../planning-map/lib/schema.mjs';
import { METRICS, isMetric } from './health-metrics.mjs';
import { CAPABILITY_IDS } from './capabilities.mjs';

export const RECORD_VERSION = 1;
export const RUNS_DIR = 'health/runs';
export const DETAILS_MAX_BYTES = 20000;
export const SCHEMA = JSON.parse(readFileSync(new URL('../health-run.schema.json', import.meta.url), 'utf8'));
export const GITHUB_ORG = 'OpenResilienceInitiative';

const STAMP = /^\d{8}T\d{6}Z$/;
const PATH_RE = new RegExp(SCHEMA.properties.scope.properties.path.pattern);
// A scope path is a folder inside the repository: no "..", no leading or trailing slash.
const okPath = p => typeof p === 'string' && PATH_RE.test(p) && !p.split('/').some(s => s === '.' || s === '..');

// ---- scoring ----
// Threshold met -> 100. 'lower': one threshold of overshoot costs everything (twice the threshold = 0);
// a threshold of 0 (lint) costs 10 points per finding. 'higher': proportional to value / threshold.
// These are proposals like the thresholds themselves (README, "Score").
export function scoreMetric({ value, threshold, better }) {
  if (value === null || value === undefined) return { pass: null, score: null };
  if (better === 'higher') {
    const pass = value >= threshold;
    return { pass, score: pass || threshold <= 0 ? 100 : Math.round(100 * value / threshold) };
  }
  const pass = value <= threshold;
  const span = threshold > 0 ? threshold : 10;
  return { pass, score: pass ? 100 : Math.max(0, Math.round(100 * (1 - (value - threshold) / span))) };
}

// Weighted mean over the criteria that have a score. Metrics without a value and switched-off ones (weight 0) do not count.
export function computeOverall(metrics, verdict) {
  let sum = 0, weight = 0;
  for (const c of [...metrics, ...verdict]) {
    if (typeof c.score !== 'number' || !(c.weight > 0)) continue;
    sum += c.score * c.weight; weight += c.weight;
  }
  return weight > 0 ? Math.round(sum / weight) : null;
}

const canonical = v => Array.isArray(v) ? v.map(canonical)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
// Hash of what the run was judged by: threshold and weight per metric, the tests and the reviewer instruction.
// Which file a key came from is not part of it.
export function criteriaVersion(effective) {
  const doc = {
    metrics: Object.fromEntries(Object.entries(effective.metrics).map(([n, m]) => [n, { threshold: m.threshold, weight: m.weight }])),
    tests: effective.tests.list, instruction: effective.instruction.text,
  };
  return createHash('sha256').update(JSON.stringify(canonical(doc))).digest('hex');
}

// ---- links, paths ----
export function graphNodeOf(scope) {
  return scope.path === null ? `capability:${scope.capability}` : `${scope.repo}::folder:${scope.path}`;
}
export function sourceUrlOf(scope, commit) {
  return `https://github.com/${GITHUB_ORG}/${scope.repo}/tree/${commit}${scope.path === null ? '' : '/' + scope.path}`;
}
export const stampOf = startedAt => startedAt.replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');
export function runFile(rec) {
  const { capability, repo, path } = rec.scope;
  return `${RUNS_DIR}/${capability}/${repo}/${path === null ? '' : 'at/' + path + '/'}${stampOf(rec.startedAt)}.json`;
}
// -> { scope, stamp } or null when the path is not a run file path
export function parseRunFile(file) {
  const parts = String(file).split('/');
  if (parts.slice(0, 2).join('/') !== RUNS_DIR || parts.length < 5 || !parts.at(-1).endsWith('.json')) return null;
  const stamp = parts.at(-1).slice(0, -5);
  if (!STAMP.test(stamp)) return null;
  const [capability, repo] = parts.slice(2, 4), rest = parts.slice(4, -1);
  if (rest.length === 0) return { scope: { capability, repo, path: null }, stamp };
  if (rest[0] !== 'at' || rest.length < 2) return null;
  return { scope: { capability, repo, path: rest.slice(1).join('/') }, stamp };
}
export const scopeKey = scope => `${scope.capability}|${scope.repo}|${scope.path ?? ''}`;

// ---- build ----
// measurements: { <metric name>: { value: number|null, source: string, details: object } } from the metric runner.
// Which metrics exist, their threshold, weight and unit come from the effective criteria, never from the caller.
export function buildRunRecord({ manifest, scope, commit, effective, measurements, model = null, startedAt, verdict = [] }) {
  if (scope.path !== null && !okPath(scope.path)) throw new Error(`scope path "${scope.path}" is not a folder inside the repository`);
  const metrics = [];
  for (const [name, c] of Object.entries(effective.metrics)) {
    if (!(c.weight > 0)) continue;
    const m = measurements[name] ?? { value: null, source: 'not computed', details: { reason: 'the runner did not compute this metric' } };
    const value = typeof m.value === 'number' && Number.isFinite(m.value) ? m.value : null;
    const { pass, score } = scoreMetric({ value, threshold: c.threshold, better: METRICS[name].better });
    metrics.push({
      name, status: value === null ? 'not-available' : 'measured', value, threshold: c.threshold, better: METRICS[name].better,
      unit: METRICS[name].unit, weight: c.weight, pass, score, source: m.source, details: m.details ?? {},
    });
  }
  if (model === null && verdict.length) throw new Error('a verdict needs a model: model is null');
  for (const v of verdict) {
    if (!Array.isArray(v.reasons) || !v.reasons.length || v.reasons.some(r => typeof r !== 'string' || !r.trim())) throw new Error(`verdict "${v.criterion}" needs reasons`);
    if (metrics.some(m => m.name === v.criterion)) throw new Error(`verdict criterion "${v.criterion}" is a metric name: metrics are scored by threshold`);
  }
  const verdictOut = verdict.map(v => ({ criterion: v.criterion, score: v.score, weight: v.weight ?? 1, reasons: v.reasons }));
  const rec = {
    schemaVersion: RECORD_VERSION, run: manifest, scope: { capability: scope.capability, repo: scope.repo, path: scope.path },
    commit, criteriaVersion: criteriaVersion(effective), model, startedAt, metrics, verdict: verdictOut,
    overall: computeOverall(metrics, verdictOut), links: { graphNode: graphNodeOf(scope), source: sourceUrlOf(scope, commit) },
  };
  const errors = validateRunRecord(rec);
  if (errors.length) throw new Error('run record invalid: ' + errors.join('; '));
  return rec;
}

// ---- validate ----
// -> list of error strings, empty when the record is valid.
export function validateRunRecord(rec) {
  const errors = validate(SCHEMA, rec);
  if (errors.length) return errors;
  const e = msg => errors.push(msg);
  if (!CAPABILITY_IDS.includes(rec.scope.capability)) e(`scope.capability: unknown capability ${rec.scope.capability}`);
  if (rec.scope.path !== null && !okPath(rec.scope.path)) e(`scope.path: "${rec.scope.path}" is not a folder inside the repository`);
  if (rec.run.commits[rec.scope.repo] !== rec.commit) e(`commit: run.commits does not list ${rec.commit} for ${rec.scope.repo}`);
  const seen = new Set();
  rec.metrics.forEach((m, i) => {
    const at = `metrics[${i}] ${m.name}`;
    if (!isMetric(m.name)) return e(`${at}: unknown metric ${m.name}`);
    if (seen.has(m.name)) e(`${at}: duplicate metric ${m.name}`);
    seen.add(m.name);
    if (m.better !== METRICS[m.name].better || m.unit !== METRICS[m.name].unit) e(`${at}: better and unit must be those of the metric list`);
    if (m.status === 'not-available') {
      if (m.value !== null || m.pass !== null || m.score !== null) e(`${at}: a not-available metric has value, pass and score null`);
    } else {
      if (typeof m.value !== 'number') return e(`${at}: a measured metric needs a value`);
      const want = scoreMetric(m);
      if (m.pass !== want.pass) e(`${at}: pass does not follow from value and threshold`);
      if (m.score !== want.score) e(`${at}: score does not follow from value and threshold`);
    }
    if (JSON.stringify(m.details).length > DETAILS_MAX_BYTES) e(`${at}: details exceed ${DETAILS_MAX_BYTES} bytes`);
  });
  if (rec.model === null && rec.verdict.length) e('model: null (metrics only) but a verdict is present');
  rec.verdict.forEach((v, i) => {
    const at = `verdict[${i}] ${v.criterion}`;
    if (!(v.score >= 0 && v.score <= 100)) e(`${at}: score must be between 0 and 100`);
    if (!v.reasons.length || v.reasons.some(r => typeof r !== 'string' || !r.trim())) e(`${at}: reasons are mandatory`);
    if (seen.has(v.criterion)) e(`${at}: criterion is a metric name`);
  });
  if (rec.overall !== computeOverall(rec.metrics, rec.verdict)) e(`overall: ${rec.overall} is not the weighted mean of the scores`);
  if (rec.links.graphNode !== graphNodeOf(rec.scope)) e(`links.graphNode: expected ${graphNodeOf(rec.scope)}`);
  if (rec.links.source !== sourceUrlOf(rec.scope, rec.commit)) e(`links.source: expected ${sourceUrlOf(rec.scope, rec.commit)}`);
  return errors;
}

// ---- read ----
function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}
// Every record under <root>/health/runs, validated. A file that is invalid, not JSON or stored where its scope
// and start time do not put it stops the load: a half-read history would look like a healthier one.
export function loadRuns(root) {
  const dir = join(root, RUNS_DIR);
  if (!existsSync(dir)) return [];
  return walk(dir).map(abs => {
    const file = relative(root, abs).split(sep).join('/');
    let record;
    try { record = JSON.parse(readFileSync(abs, 'utf8')); } catch { throw new Error(`${file}: not JSON`); }
    const errors = validateRunRecord(record);
    if (errors.length) throw new Error(`${file}: ${errors.join('; ')}`);
    if (runFile(record) !== file) throw new Error(`${file}: path does not match the record (expected ${runFile(record)})`);
    return { file, record };
  });
}

// The record with the newest startedAt for every scope; ties go to the larger run id.
export function latestPerScope(records) {
  const best = new Map();
  for (const r of records) {
    const k = scopeKey(r.scope), cur = best.get(k);
    if (!cur || r.startedAt > cur.startedAt || (r.startedAt === cur.startedAt && r.run.runId > cur.run.runId)) best.set(k, r);
  }
  return [...best.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, r]) => r);
}
// History per scope (ORISO-Docs#219): the newest HISTORY_CAP runs, oldest first, in a compact form the map can draw a trend and a
// comparison from without fetching every record: date, model, commit, overall, one entry per metric (value, threshold, better, score)
// and per verdict criterion (score). Reasons and details stay in the full record, reachable by `file` (path in the docs repository).
export const HISTORY_CAP = 50;
const byTime = (a, b) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : a.run.runId < b.run.runId ? -1 : a.run.runId > b.run.runId ? 1 : 0);
function compactRun(r) {
  return {
    file: runFile(r), startedAt: r.startedAt, model: r.model, commit: r.commit, criteriaVersion: r.criteriaVersion, overall: r.overall,
    metrics: r.metrics.map(m => ({ name: m.name, value: m.value, threshold: m.threshold, better: m.better, score: m.score })),
    verdict: r.verdict.map(v => ({ criterion: v.criterion, score: v.score })),
  };
}
export function buildHistory(records) {
  const groups = new Map();
  for (const r of records) { const k = scopeKey(r.scope); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  return [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, list]) => {
    list.sort(byTime);
    const s = list[0].scope;
    return { scope: { capability: s.capability, repo: s.repo, path: s.path }, total: list.length, runs: list.slice(-HISTORY_CAP).map(compactRun) };
  });
}
// map/data/health.json: the latest full record per scope, plus the compact history per scope
export function buildHealthDoc(records) {
  return { schemaVersion: 1, records: latestPerScope(records), history: buildHistory(records), historyCap: HISTORY_CAP };
}
