// Scheduled health runs end to end, without the network (ORISO-Docs#220, epic #213).
// Seams: detectScopes() and runSelected() of health-run.mjs on real git repositories in a temp folder,
// with a fake model transport; plus the CLI for usage errors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkRepo, lines, RULES } from './health-fixture.mjs';
import { detectScopes, runSelected, runHealth } from '../health-run.mjs';
import { loadRuns } from '../lib/health-run.mjs';

const CLI = fileURLToPath(new URL('../health-run.mjs', import.meta.url));
const git = (dir, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', dir, ...a], { encoding: 'utf8' }).trim();
const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));
// <checkouts>/ORISO-Frontend is a git repository with two capabilities (chat, branding)
function world() {
  const checkouts = tmp('checkouts-');
  const repo = path.join(checkouts, 'ORISO-Frontend');
  fs.rmSync(repo, { recursive: true, force: true });
  const src = mkRepo({ 'src/chat/a.ts': lines(10), 'src/other/b.ts': lines(20), 'README.md': 'r\n' });
  fs.renameSync(src, repo);
  git(repo, 'init', '-q'); git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'one');
  return { checkouts, repo, root: tmp('docs-root-') };
}
const commit = (repo, file, text, msg = 'change') => { fs.writeFileSync(path.join(repo, file), text); git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', msg); };
const caps = sel => sel.selected.map(s => `${s.scope.capability}:${s.reason}`);
const GOOD = JSON.stringify({ verdict: ['maintainability', 'test-quality', 'structure'].map(c => ({ criterion: c, score: 70, reasons: ['ok'] })) });
const fake = reply => { const t = async req => { t.calls.push(req); return reply; }; t.calls = []; return t; };

test('first detection: every scope of a checked-out repository was never run', () => {
  const w = world();
  const d = detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10 });
  assert.deepEqual(caps(d).sort(), ['branding:never-run', 'chat:never-run', 'email-templates:never-run', 'notifications:never-run']);
});

test('scopes of a repository that is not checked out are reported as no-checkout, not selected', () => {
  const w = world();
  const rules = { ...RULES, rules: [...RULES.rules, { repo: 'ORISO-Admin', prefix: 'src/', capability: 'statistics' }] };
  const d = detectScopes({ root: w.root, checkouts: w.checkouts, rules, limit: 10 });
  assert.ok(!d.selected.some(s => s.scope.repo === 'ORISO-Admin'));
  assert.deepEqual(d.skipped.filter(s => s.scope.repo === 'ORISO-Admin').map(s => s.reason), ['no-checkout']);
});

test('after a run, changing one file of one capability selects only that capability (reviewer test plan)', async () => {
  const w = world();
  const first = await runSelected({ ...w, rules: RULES, selection: detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10 }), now: '2026-10-24T10:00:00Z', env: {} });
  assert.equal(first.written.length, 4);
  assert.deepEqual(first.failed, []);
  assert.equal(loadRuns(w.root).length, 4);
  assert.deepEqual(detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10 }).selected, [], 'nothing changed, nothing to do');
  commit(w.repo, 'src/chat/a.ts', lines(11));
  commit(w.repo, 'README.md', 'changed\n', 'docs only');
  const d = detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10 });
  assert.deepEqual(caps(d), ['chat:changed']);
  assert.equal(d.selected[0].changed, 1);
  const second = await runSelected({ ...w, rules: RULES, selection: d, now: '2026-10-25T10:00:00Z', env: {} });
  assert.deepEqual(second.written, ['health/runs/chat/ORISO-Frontend/20261025T100000Z.json']);
  assert.equal(loadRuns(w.root).length, 5, 'history keeps the older record');
});

test('--scope forces one scope even when nothing changed; an unknown scope is refused', () => {
  const w = world();
  const d = detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10, scope: 'chat/ORISO-Frontend' });
  assert.deepEqual(caps(d), ['chat:requested']);
  assert.throws(() => detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, scope: 'chat/ORISO-Nothing' }), /unknown scope/);
  assert.throws(() => detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, scope: 'chat' }), /<capability>\/<repo>/);
});

test('without the secret a run writes a record with model null, an empty verdict and verdictStatus skipped', async () => {
  const w = world();
  const t = fake(GOOD);
  const r = await runSelected({ ...w, rules: RULES, selection: detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 1, scope: 'chat/ORISO-Frontend' }), now: '2026-10-24T10:00:00Z', env: { HEALTH_MODEL: 'm' }, transport: t });
  const rec = loadRuns(w.root)[0].record;
  assert.deepEqual([rec.model, rec.verdict, rec.verdictStatus], [null, [], 'skipped']);
  assert.match(rec.verdictNote, /HEALTH_MODEL_API_KEY/);
  assert.match(rec.inputs.criteria, /^[0-9a-f]{64}$/); assert.equal(rec.inputs.steering, null);
  assert.equal(t.calls.length, 0);
  assert.deepEqual(r.written.length, 1);
});

test('runSelected with checkoutTools false (the scheduled workflow) never runs the checkout\'s eslint; lint is not available with the CI reason', async () => {
  const w = world();
  fs.writeFileSync(path.join(w.repo, '.eslintrc.json'), '{}');
  fs.mkdirSync(path.join(w.repo, 'node_modules/.bin'), { recursive: true });
  fs.writeFileSync(path.join(w.repo, 'node_modules/.bin/eslint'), '#!/usr/bin/env node\nrequire("fs").writeFileSync(__dirname + "/../../RAN", "x");process.stdout.write("[]");', { mode: 0o755 });
  const sel = detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 1, scope: 'chat/ORISO-Frontend' });
  await runSelected({ ...w, rules: RULES, selection: sel, now: '2026-10-24T10:00:00Z', env: {}, checkoutTools: false });
  const lint = loadRuns(w.root)[0].record.metrics.find(m => m.name === 'lint');
  assert.equal(lint.status, 'not-available');
  assert.match(lint.details.reason, /not run in the scheduled workflow/);
  assert.ok(!fs.existsSync(path.join(w.repo, 'RAN')));
});

test('CLI: run-selected --no-checkout-tools is accepted and passed on', () => {
  const w = world();
  const sel = path.join(w.root, 'sel.json');
  fs.writeFileSync(sel, JSON.stringify(detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 1, scope: 'chat/ORISO-Frontend' })));
  const r = spawnSync(process.execPath, [CLI, 'run-selected', '--selection', sel, '--checkouts', w.checkouts, '--root', w.root, '--no-checkout-tools', '--now', '2026-10-24T10:00:00Z'], { encoding: 'utf8', env: { ...process.env, HEALTH_MODEL_API_KEY: '' } });
  assert.equal(r.status, 0, r.stderr);
  const lint = loadRuns(w.root)[0].record.metrics.find(m => m.name === 'lint');
  assert.match(lint.details.reason, /not run in the scheduled workflow/);
});

test('with the secret and a fake model the record has the verdict, model, and the hash of the steering comments', async () => {
  const w = world();
  const t = fake(GOOD);
  const steeringDoc = { schemaVersion: 1, generatedAt: '2026-10-24T00:00:00Z', source: { repository: 'OpenResilienceInitiative/ORISO-Docs', label: 'area-steering', allowedAssociations: ['OWNER', 'MEMBER', 'COLLABORATOR'] }, warnings: [],
    capabilities: { chat: { issue: { number: 9, url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/9', title: 'Steering: Chat', state: 'OPEN' }, skipped: 0, omitted: 0,
      comments: [{ author: 'alice', createdAt: '2026-10-20T08:00:00Z', url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/9#issuecomment-1', authorAssociation: 'MEMBER', body: 'Error handling first.', truncated: false }] } } };
  const steeringFile = path.join(tmp('steer-'), 'steering.json'); fs.writeFileSync(steeringFile, JSON.stringify(steeringDoc));
  await runSelected({ ...w, rules: RULES, steeringFile, selection: detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 1, scope: 'chat/ORISO-Frontend' }), now: '2026-10-24T10:00:00Z', env: { HEALTH_MODEL_API_KEY: 'k', HEALTH_MODEL: 'm' }, transport: t });
  const rec = loadRuns(w.root)[0].record;
  assert.deepEqual([rec.model, rec.verdictStatus, rec.verdict.length], ['m', 'ran', 3]);
  assert.match(rec.inputs.steering, /^[0-9a-f]{64}$/);
  assert.match(t.calls[0].prompt, /Error handling first\./);
  assert.match(t.calls[0].prompt, /"size"/);
  assert.ok(!t.calls[0].prompt.includes('lines(') && !t.calls[0].prompt.includes('const v0'), 'no source code goes to the model');
});

test('a scope that cannot be measured is reported in failed; the other scopes are still written', async () => {
  const w = world();
  const sel = detectScopes({ root: w.root, checkouts: w.checkouts, rules: RULES, limit: 10 });
  fs.rmSync(path.join(w.repo, '.git'), { recursive: true });
  const r = await runSelected({ ...w, rules: RULES, selection: sel, now: '2026-10-24T10:00:00Z', env: {} });
  assert.equal(r.written.length, 0); assert.equal(r.failed.length, 4);
  assert.match(r.failed[0].message, /./);
});

test('--dry-run in the library path: runHealth with dryRun writes nothing', async () => {
  const w = world();
  const x = runHealth({ capability: 'chat', repo: 'ORISO-Frontend', checkout: w.repo, root: w.root, rules: RULES, now: '2026-10-24T10:00:00Z', dryRun: true });
  assert.equal(x.written, false);
  assert.equal(loadRuns(w.root).length, 0);
});

test('CLI: detect and run-selected print JSON; usage errors exit 2', () => {
  const w = world();
  const bad = spawnSync('node', [CLI, 'detect'], { encoding: 'utf8' });
  assert.equal(bad.status, 2); assert.match(bad.stderr, /usage/);
  const repos = spawnSync('node', [CLI, 'repos'], { encoding: 'utf8' });
  assert.equal(repos.status, 0); assert.match(repos.stdout, /^ORISO-Frontend$/m); assert.doesNotMatch(repos.stdout, /E2E|Infra/);
  const unknown = spawnSync('node', [CLI, 'detect', '--checkouts', w.checkouts, '--scope', 'chat/Nope', '--root', w.root], { encoding: 'utf8' });
  assert.equal(unknown.status, 1); assert.match(unknown.stderr, /unknown scope/);
});
