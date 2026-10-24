#!/usr/bin/env node
// Health run CLI (ORISO-Docs#218, epic #213): measure one scope of a repository checkout and store the run record.
//
//   node platform/health-run.mjs run --capability <id> --repo <name> --checkout <dir> [--path <folder>]
//        [--coverage <lcov.info|coverage-final.json>] [--commit <sha>] [--allow-dirty]
//        [--model <name> --verdict <verdict.json>] [--root <docs repo>] [--now <UTC ISO time>] [--dry-run]
//   node platform/health-run.mjs validate [--root <docs repo>]
//
// Scheduled runs (ORISO-Docs#220, .github/workflows/health-runs.yml):
//   node platform/health-run.mjs repos                                 public code repositories, one per line
//   node platform/health-run.mjs detect --checkouts <dir> [--limit <n>] [--scope <capability>/<repo>] [--out <file>] [--root <docs repo>]
//        which scopes need a run: never run, or files of the capability changed since the commit of the latest record
//   node platform/health-run.mjs run-selected --selection <detect.json> --checkouts <dir> [--steering <steering.json>] [--now <UTC time>] [--root <docs repo>]
//        metrics for every selected scope, then the AI verdict step. Secret and model come from the environment only:
//        HEALTH_MODEL_API_KEY, HEALTH_MODEL, HEALTH_MODEL_PROVIDER (anthropic | openai), HEALTH_MODEL_BASE_URL, HEALTH_MODEL_ALLOW_PRIVATE.
//        Without the key the verdict is skipped and the record says so (verdictStatus skipped).
//
// "run" reads the effective criteria for the scope (platform/capabilities/health), computes the metrics they name
// (size, test-ratio, lint, duplication, crap, email-render, email-links, email-languages), and writes
// <root>/health/runs/<capability>/<repo>/[at/<folder>/]<timestamp>.json. Without --dry-run it never overwrites a record.
// The checkout must be clean unless --commit or --allow-dirty is given: the record names the commit it measured.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunManifest } from '../../planning-map/lib/run-manifest.mjs';
import { CAPABILITY_IDS, CODE_REPOS, CapabilityError, loadRules, resolveFile } from './lib/capabilities.mjs';
import { loadCriteria, resolveCriteria } from './lib/health-criteria.mjs';
import { measureScope } from './lib/health-measure/index.mjs';
import { buildRunRecord, loadRuns, runFile } from './lib/health-run.mjs';
import { changedFiles, scopesOf, selectScopes, DEFAULT_LIMIT } from './lib/health-detect.mjs';
import { httpTransport, runVerdictStep } from './lib/health-verdict.mjs';
import { steeringFor } from '../../planning-map/lib/steering.mjs';

const DOCS_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// -> { file, record, written }   (synchronous: metrics only, or a verdict file given with --verdict)
export function runHealth(o) {
  const { prepared, finish } = prepareRun(o);
  return finish(prepared.verdict, {});
}

// Metrics first, then (optionally) the AI verdict step, then the record. o.ai = { env, transport?, steering: list|null }.
// -> same as runHealth
export async function runHealthAi(o) {
  const { prepared, finish } = prepareRun(o);
  const interim = finish([], {}, { dryRun: true }).record;
  const transport = o.ai.transport ?? lazyTransport(o.ai.env);
  const step = await runVerdictStep({ scope: prepared.scope, effective: prepared.effective, steering: o.ai.steering ?? null, metrics: interim.metrics, env: o.ai.env, transport });
  return finish(step.verdict, { model: step.model, verdictStatus: step.status, verdictNote: step.note, inputs: step.inputs });
}

// The real transport is built only when the step is about to call it; a bad provider setting then becomes the note of a
// skipped verdict instead of a crash of the whole run.
function lazyTransport(env) {
  return req => httpTransport({ provider: (env.HEALTH_MODEL_PROVIDER || 'anthropic').trim(), apiKey: (env.HEALTH_MODEL_API_KEY || '').trim(), baseUrl: env.HEALTH_MODEL_BASE_URL?.trim() || undefined })(req);
}

function prepareRun(o) {
  const root = resolve(o.root ?? DOCS_ROOT);
  if (!CAPABILITY_IDS.includes(o.capability)) throw new Error(`unknown capability ${o.capability}`);
  if (!o.repo || !o.checkout) throw new Error('--repo and --checkout are required');
  const checkout = resolve(o.checkout);
  if (!existsSync(checkout)) throw new Error(`checkout ${checkout} does not exist`);
  let commit = o.commit;
  if (!commit) {
    if (!o.allowDirty && git(checkout, 'status', '--porcelain', '--untracked-files=no')) throw new Error('the checkout has uncommitted changes: commit them, or pass --allow-dirty (the record names HEAD)');
    commit = git(checkout, 'rev-parse', 'HEAD');
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`commit must be a 40-character lowercase hex id (got ${commit})`);
  const scope = { capability: o.capability, repo: o.repo, path: o.path ?? null };
  const criteria = loadCriteria(o.criteriaDir ?? undefined, { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
  const effective = resolveCriteria(criteria, { capability: scope.capability, path: scope.path === null ? `${scope.repo}/` : `${scope.repo}/${scope.path}/` });
  const rules = o.rules ?? loadRules();
  const names = Object.entries(effective.metrics).filter(([, m]) => m.weight > 0).map(([n]) => n);
  const measurements = measureScope({ root: checkout, repo: scope.repo, scope: { capability: scope.capability, path: scope.path }, rules, metrics: names, coverage: o.coverage ? resolve(o.coverage) : null });
  const startedAt = o.now ?? new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  let verdict = [];
  if (o.verdict) verdict = JSON.parse(readFileSync(o.verdict, 'utf8'));
  const finish = (v, extra, opt = {}) => {
    const record = buildRunRecord({
      manifest: createRunManifest({ at: startedAt, commits: { [scope.repo]: commit }, trigger: 'health-run' }),
      scope, commit, effective, measurements, model: extra.model !== undefined ? extra.model : (o.model ?? null), startedAt, verdict: v, ...extra,
    });
    const file = runFile(record), abs = join(root, file);
    if (o.dryRun || opt.dryRun) return { file, record, written: false };
    if (existsSync(abs)) throw new Error(`${file} already exists: records are never overwritten`);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(record, null, 2) + '\n');
    return { file, record, written: true };
  };
  return { prepared: { scope, effective, verdict }, finish };
}

// ---- scheduled runs (ORISO-Docs#220) ----
const capabilityOfFile = rules => (repo, p) => {
  try { return resolveFile(rules, repo, p).capability; } catch (e) { if (e instanceof CapabilityError) return null; throw e; }
};
// -> { selected: [{scope, reason, since, changed}], skipped: [{scope, reason}] }
// o.scope = "<capability>/<repo>" asks for exactly that scope, changed or not.
export function detectScopes(o) {
  const root = resolve(o.root ?? DOCS_ROOT), rules = o.rules ?? loadRules();
  const checkouts = resolve(o.checkouts);
  const all = scopesOf(rules);
  const has = repo => existsSync(join(checkouts, repo, '.git')) || existsSync(join(checkouts, repo));
  if (o.scope !== undefined) {
    const [capability, repo, ...extra] = String(o.scope).split('/');
    if (!capability || !repo || extra.length) throw new Error(`--scope must be <capability>/<repo> (got ${JSON.stringify(o.scope)})`);
    const hit = all.find(s => s.capability === capability && s.repo === repo);
    if (!hit) throw new Error(`unknown scope ${o.scope}: the capability rules put no ${capability} code into ${repo}`);
    if (!has(repo)) return { selected: [], skipped: [{ scope: hit, reason: 'no-checkout' }] };
    return { selected: [{ scope: hit, reason: 'requested', since: null, changed: null }], skipped: [] };
  }
  const present = all.filter(s => has(s.repo));
  const missing = all.filter(s => !has(s.repo)).map(scope => ({ scope, reason: 'no-checkout' }));
  const latest = loadRuns(root).map(r => r.record);
  const r = selectScopes({ scopes: present, latest, diff: (repo, since) => changedFiles(join(checkouts, repo), since), capabilityOf: capabilityOfFile(rules), limit: o.limit ?? DEFAULT_LIMIT });
  return { selected: r.selected, skipped: [...r.skipped, ...missing] };
}

// Metrics and the AI verdict for every selected scope. One failing scope does not stop the others.
// -> { written: [file], failed: [{scope, message}] }
export async function runSelected(o) {
  const env = o.env ?? process.env;
  let steeringDoc = null;
  if (o.steeringFile) {
    try { steeringDoc = JSON.parse(readFileSync(o.steeringFile, 'utf8')); } catch (e) { process.stderr.write(`health-run: steering file not used (${e.message})\n`); }
  }
  const written = [], failed = [];
  for (const sel of o.selection.selected) {
    const { capability, repo, path } = sel.scope;
    try {
      let steering = null;
      if (steeringDoc) { try { steering = steeringFor(capability, { doc: steeringDoc }); } catch (e) { process.stderr.write(`health-run: steering not used for ${capability} (${e.message})\n`); } }
      const r = await runHealthAi({ capability, repo, path, checkout: join(resolve(o.checkouts), repo), root: o.root, rules: o.rules, now: o.now, coverage: o.coverage, ai: { env, transport: o.transport, steering } });
      written.push(r.file);
    } catch (e) { failed.push({ scope: sel.scope, message: e.message }); }
  }
  return { written, failed };
}

function parseArgs(argv) {
  const o = {}, flags = new Set(['allow-dirty', 'dry-run']);
  const map = { selection: 'selection', checkouts: 'checkouts', steering: 'steeringFile', limit: 'limit', scope: 'scope', out: 'out', capability: 'capability', repo: 'repo', checkout: 'checkout', path: 'path', coverage: 'coverage', commit: 'commit', model: 'model', verdict: 'verdict', root: 'root', now: 'now' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const k = a.slice(2);
    if (flags.has(k)) o[k === 'allow-dirty' ? 'allowDirty' : 'dryRun'] = true;
    else if (map[k]) { if (argv[i + 1] === undefined) throw new Error(`--${k} needs a value`); o[map[k]] = argv[++i]; }
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

export async function main(argv, out = console) {
  const [cmd, ...rest] = argv;
  if (cmd === 'repos') { for (const r of CODE_REPOS) out.log(r); return 0; }
  if (cmd === 'detect') {
    const o = parseArgs(rest);
    if (!o.checkouts) { out.error('usage: health-run.mjs detect --checkouts <dir> [--limit <n>] [--scope <capability>/<repo>] [--out <file>]'); return 2; }
    if (o.limit !== undefined) { o.limit = Number(o.limit); if (!Number.isInteger(o.limit) || o.limit < 1) throw new Error('--limit must be a positive integer'); }
    const d = detectScopes(o);
    const text = JSON.stringify(d, null, 2) + '\n';
    if (o.out) writeFileSync(o.out, text); else out.log(text);
    out.error(`health-run: ${d.selected.length} scope(s) selected: ` + (d.selected.map(s => `${s.scope.capability}/${s.scope.repo} (${s.reason})`).join(', ') || 'none'));
    return 0;
  }
  if (cmd === 'run-selected') {
    const o = parseArgs(rest);
    if (!o.selection || !o.checkouts) { out.error('usage: health-run.mjs run-selected --selection <detect.json> --checkouts <dir> [--steering <steering.json>]'); return 2; }
    o.selection = JSON.parse(readFileSync(o.selection, 'utf8'));
    const r = await runSelected(o);
    for (const f of r.written) out.log(`wrote ${f}`);
    for (const f of r.failed) out.error(`health-run: ${f.scope.capability}/${f.scope.repo} failed: ${f.message}`);
    return r.failed.length && !r.written.length ? 1 : 0;
  }
  if (cmd === 'run') {
    const r = runHealth(parseArgs(rest));
    out.log(`${r.written ? 'wrote' : 'dry run, would write'} ${r.file}`);
    out.log(`overall ${r.record.overall ?? 'no data'}; ` + r.record.metrics.map(m => `${m.name} ${m.value ?? 'n/a'}`).join(', '));
    return 0;
  }
  if (cmd === 'validate') {
    const o = parseArgs(rest);
    out.log(`${loadRuns(resolve(o.root ?? DOCS_ROOT)).length} run records are valid`);
    return 0;
  }
  out.error('usage: health-run.mjs repos | detect | run-selected | validate | run --capability <id> --repo <name> --checkout <dir> [--path <folder>] [--coverage <file>] | validate');
  return 2;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(c => { process.exitCode = c; }, e => { console.error(`health-run: ${e.message}`); process.exitCode = 1; });
}
