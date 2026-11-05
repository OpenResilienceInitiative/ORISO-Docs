#!/usr/bin/env node
// Scheduled Health's trust boundary: plan on trusted tooling, measure without model secrets,
// then validate and judge the measurements in a fresh job that never runs checkout code.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePlan, validateBatch, makeEnvelope, validateEnvelope } from './lib/health-batch.mjs';
import { CAPABILITY_IDS, CODE_REPOS, loadRules } from './lib/capabilities.mjs';
import { scopesOf } from './lib/health-detect.mjs';
import { loadCriteria, resolveCriteria } from './lib/health-criteria.mjs';
import { buildRunRecord, criteriaVersion, runFile } from './lib/health-run.mjs';
import { METRICS } from './lib/health-metrics.mjs';
import { runVerdictStep, httpTransport } from './lib/health-verdict.mjs';
import { steeringFor } from '../../planning-map/lib/steering.mjs';
import { createRunManifest } from '../../planning-map/lib/run-manifest.mjs';
import { runHealth } from './health-run.mjs';
import { isolatedMeasurements, lintTargets } from './lib/health-isolation.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const read = (path, maxBytes = 10 * 1024 * 1024) => {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maxBytes) throw new Error('invalid or oversized JSON input');
  return JSON.parse(readFileSync(path, 'utf8'));
};
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const effectiveFor = scope => resolveCriteria(loadCriteria(undefined, { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS }), {
  capability: scope.capability, path: `${scope.repo}/`
});
const save = (file, value) => { mkdirSync(resolve(file, '..'), { recursive: true }); writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };


function validatePlan(plan) {
  if (!plan || plan.version !== 1 || !Array.isArray(plan.items)) throw new Error('invalid plan');
  const commits = Object.fromEntries(plan.items.map(item => [item.scope?.repo, item.commit]));
  const reconstructed = makePlan({ selection: { selected: plan.items.map(item => ({ scope: item.scope })) }, commits,
    criteriaFor: scope => criteriaVersion(effectiveFor(scope)), runId: plan.runId, startedAt: plan.startedAt });
  if (JSON.stringify(reconstructed) !== JSON.stringify(plan)) throw new Error('plan metadata does not match trusted criteria');
  const allowed = new Set(scopesOf(loadRules()).map(s => `${s.capability}|${s.repo}`));
  if (plan.items.some(i => !allowed.has(`${i.scope.capability}|${i.scope.repo}`))) throw new Error('plan contains an unknown scope');
  if (process.env.GITHUB_RUN_ID && plan.runId !== process.env.GITHUB_RUN_ID) throw new Error('plan belongs to another workflow run');
}

export function checkoutBatch({ plan, checkouts }) {
  validatePlan(plan);
  mkdirSync(checkouts, { recursive: true });
  const seen = new Set();
  for (const { scope, commit } of plan.items) {
    if (seen.has(scope.repo)) continue;
    seen.add(scope.repo);
    const dir = join(checkouts, scope.repo);
    execFileSync('git', ['clone', '--quiet', '--filter=blob:none', '--no-tags', '--branch', 'dev',
      `https://github.com/OpenResilienceInitiative/${scope.repo}`, dir], { stdio: 'inherit' });
    execFileSync('git', ['-C', dir, 'merge-base', '--is-ancestor', commit, 'origin/dev'], { stdio: 'inherit' });
    execFileSync('git', ['-C', dir, 'checkout', '--quiet', '--detach', commit], { stdio: 'inherit' });
  }
}

export function planBatch({ selection, checkouts, runId, startedAt }) {
  const commits = {};
  const allowed = new Set(scopesOf(loadRules()).map(s => `${s.capability}|${s.repo}`));
  for (const { scope } of selection.selected) {
    if (!CODE_REPOS.includes(scope.repo) || scope.path !== null || !allowed.has(`${scope.capability}|${scope.repo}`)) throw new Error('unknown scope or repository');
    const dir = join(checkouts, scope.repo);
    const remote = git(dir, 'remote', 'get-url', 'origin');
    if (remote !== `https://github.com/OpenResilienceInitiative/${scope.repo}` && remote !== `https://github.com/OpenResilienceInitiative/${scope.repo}.git`) throw new Error('untrusted checkout remote');
    commits[scope.repo] = git(dir, 'rev-parse', 'HEAD');
  }
  return makePlan({ selection, commits, criteriaFor: scope => criteriaVersion(effectiveFor(scope)), runId, startedAt });
}

export function measureBatch({ plan, checkouts, recordsRoot, collect = isolatedMeasurements }) {
  validatePlan(plan);
  const records = [], collected = new Map(), rules = loadRules();
  for (const item of plan.items) {
    const checkout = join(checkouts, item.scope.repo);
    if (git(checkout, 'rev-parse', 'HEAD') !== item.commit || git(checkout, 'status', '--porcelain', '--untracked-files=all')) throw new Error('checkout does not match pinned commit');
    if (!collected.has(item.scope.repo)) {
      const scopes = plan.items.filter(i => i.scope.repo === item.scope.repo).map(i => i.scope);
      collected.set(item.scope.repo, collect({ checkout, scope: item.scope, scopes, rules }));
    }
    const { lintReport: repoLint, coverageData } = collected.get(item.scope.repo);
    const targets = new Set(lintTargets({ checkout, scope: item.scope, rules }));
    const lintReport = repoLint && targets.size ? repoLint.filter(r => targets.has(r.filePath)) : null;
    const tmp = mkdtempSync(join(tmpdir(), 'health-report-'));
    try {
      const coverage = coverageData ? join(tmp, 'coverage.json') : undefined;
      if (coverage) writeFileSync(coverage, JSON.stringify(coverageData));
      const result = runHealth({ ...item.scope, checkout, root: recordsRoot, now: plan.startedAt, coverage, lintReport, checkoutTools: false, dryRun: true });
      for (const metric of result.record.metrics.filter(m => ['lint', 'crap'].includes(m.name))) {
        metric.source += ' (checkout-reported; protected dev commit trusted)';
      }
      if (!lintReport) {
        const lint = result.record.metrics.find(m => m.name === 'lint');
        if (lint) lint.details = { state: 'ci-setup', reason: 'isolated lint or its validated report was unavailable' };
      }
      records.push(result.record);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }
  validateBatch(plan, records);
  return records;
}

export async function judgeBatch({ plan, records, root, env = process.env, transport, steeringDoc = null }) {
  validatePlan(plan);
  validateBatch(plan, records);
  const prepared = records.map(record => {
    const effective = effectiveFor(record.scope);
    if (criteriaVersion(effective) !== record.criteriaVersion || record.startedAt !== plan.startedAt || record.model !== null || record.verdict.length) throw new Error('measurement metadata is not trusted');
    const expectedManifest = createRunManifest({ at: plan.startedAt, commits: { [record.scope.repo]: record.commit }, trigger: 'health-run' });
    if (JSON.stringify(record.run) !== JSON.stringify(expectedManifest)) throw new Error('measurement run manifest does not match plan');
    const expected = Object.entries(effective.metrics).filter(([, metric]) => metric.weight > 0);
    if (record.metrics.length !== expected.length || expected.some(([name, criterion]) => {
      const metric = record.metrics.find(m => m.name === name);
      return !metric || metric.threshold !== criterion.threshold || metric.weight !== criterion.weight ||
        metric.better !== METRICS[name].better || metric.unit !== METRICS[name].unit;
    })) throw new Error('measurement metrics do not match trusted criteria');
    const steering = steeringDoc ? steeringFor(record.scope.capability, { doc: steeringDoc }) : null;
    return { record, effective, steering };
  });
  const output = [];
  for (const { record, effective, steering } of prepared) {
    // A checkout tool can emit arbitrary failure text. Never send that text to the model.
    const metrics = record.metrics.map(m => m.status === 'not-available' ? { ...m, details: { reason: 'Measurement unavailable' } } : m);
    const lazy = transport ?? (req => httpTransport({ provider: (env.HEALTH_MODEL_PROVIDER || 'anthropic').trim(), apiKey: (env.HEALTH_MODEL_API_KEY || '').trim(), baseUrl: env.HEALTH_MODEL_BASE_URL?.trim() || undefined })(req));
    const result = await runVerdictStep({ scope: record.scope, effective, steering, metrics, env, transport: lazy });
    const measurements = Object.fromEntries(record.metrics.map(m => [m.name, { value: m.value, source: m.source, details: m.details }]));
    const final = buildRunRecord({ manifest: record.run, scope: record.scope, commit: record.commit, effective, measurements, startedAt: record.startedAt,
      model: result.model, verdict: result.verdict, verdictStatus: result.status, verdictNote: result.note, inputs: result.inputs });
    const file = join(root, runFile(final));
    if (existsSync(file)) throw new Error('record already exists');
    save(file, final); output.push(file);
  }
  return output;
}

async function main([command, ...args]) {
  const opts = Object.fromEntries(args.map((value, i) => i % 2 === 0 ? [value.replace(/^--/, ''), args[i + 1]] : null).filter(Boolean));
  if (command === 'plan') return save(opts.out, planBatch({ selection: read(opts.selection), checkouts: resolve(opts.checkouts), runId: opts.run, startedAt: opts.at }));
  if (command === 'measure') { const plan = read(opts.plan); return save(opts.out, makeEnvelope(plan, measureBatch({ plan, checkouts: resolve(opts.checkouts), recordsRoot: resolve(opts.root) }))); }
  if (command === 'repos') { const plan = read(opts.plan); validatePlan(plan); for (const repo of new Set(plan.items.map(i => i.scope.repo))) console.log(repo); return; }
  if (command === 'checkout') return checkoutBatch({ plan: read(opts.plan), checkouts: resolve(opts.checkouts) });
  if (command === 'judge') { const plan = read(opts.plan); const records = validateEnvelope(plan, read(opts.measurements)); return judgeBatch({ plan, records, root: resolve(opts.root), steeringDoc: opts.steering ? read(opts.steering) : null }); }
  throw new Error('usage: health-batch.mjs plan|measure|judge');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(e => { console.error(`health-batch: ${e.message}`); process.exitCode = 1; });
