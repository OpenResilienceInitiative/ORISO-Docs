#!/usr/bin/env node
// Health run CLI (ORISO-Docs#218, epic #213): measure one scope of a repository checkout and store the run record.
//
//   node platform/health-run.mjs run --capability <id> --repo <name> --checkout <dir> [--path <folder>]
//        [--coverage <lcov.info|coverage-final.json>] [--commit <sha>] [--allow-dirty]
//        [--model <name> --verdict <verdict.json>] [--root <docs repo>] [--now <UTC ISO time>] [--dry-run]
//   node platform/health-run.mjs validate [--root <docs repo>]
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
import { CAPABILITY_IDS, CODE_REPOS, loadRules } from './lib/capabilities.mjs';
import { loadCriteria, resolveCriteria } from './lib/health-criteria.mjs';
import { measureScope } from './lib/health-measure/index.mjs';
import { buildRunRecord, loadRuns, runFile } from './lib/health-run.mjs';

const DOCS_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// -> { file, record, written }
export function runHealth(o) {
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
  const record = buildRunRecord({
    manifest: createRunManifest({ at: startedAt, commits: { [scope.repo]: commit }, trigger: 'health-run' }),
    scope, commit, effective, measurements, model: o.model ?? null, startedAt, verdict,
  });
  const file = runFile(record), abs = join(root, file);
  if (o.dryRun) return { file, record, written: false };
  if (existsSync(abs)) throw new Error(`${file} already exists: records are never overwritten`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(record, null, 2) + '\n');
  return { file, record, written: true };
}

function parseArgs(argv) {
  const o = {}, flags = new Set(['allow-dirty', 'dry-run']);
  const map = { capability: 'capability', repo: 'repo', checkout: 'checkout', path: 'path', coverage: 'coverage', commit: 'commit', model: 'model', verdict: 'verdict', root: 'root', now: 'now' };
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

export function main(argv, out = console) {
  const [cmd, ...rest] = argv;
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
  out.error('usage: health-run.mjs run --capability <id> --repo <name> --checkout <dir> [--path <folder>] [--coverage <file>] | validate');
  return 2;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(`health-run: ${e.message}`); process.exitCode = 1; }
}
