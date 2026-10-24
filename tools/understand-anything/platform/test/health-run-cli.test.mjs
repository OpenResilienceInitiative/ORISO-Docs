// Health run CLI: from a fixture checkout to a stored, valid record (ORISO-Docs#218).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkRepo, lines, RULES } from './health-fixture.mjs';
import { runHealth } from '../health-run.mjs';
import { loadRuns, validateRunRecord } from '../lib/health-run.mjs';

const CLI = fileURLToPath(new URL('../health-run.mjs', import.meta.url));
const git = (dir, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', dir, ...a], { encoding: 'utf8' }).trim();
const docsRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'docs-root-'));
function gitRepo(files) {
  const root = mkRepo(files);
  git(root, 'init', '-q'); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'fixture');
  return { root, sha: git(root, 'rev-parse', 'HEAD') };
}
const NOW = '2026-10-24T10:15:00Z';

test('a run on a clean checkout writes a valid record named after scope and time, with the commit of HEAD', () => {
  const { root, sha } = gitRepo({ 'src/chat/a.ts': lines(10), 'src/chat/a.test.ts': lines(5) });
  const out = docsRoot();
  const r = runHealth({ capability: 'chat', repo: 'ORISO-Frontend', checkout: root, root: out, rules: RULES, now: NOW });
  assert.equal(r.file, 'health/runs/chat/ORISO-Frontend/20261024T101500Z.json');
  const onDisk = JSON.parse(fs.readFileSync(path.join(out, r.file), 'utf8'));
  assert.deepEqual(validateRunRecord(onDisk), []);
  assert.equal(onDisk.commit, sha);
  const by = Object.fromEntries(onDisk.metrics.map(m => [m.name, m]));
  assert.deepEqual(Object.keys(by), ['crap', 'size', 'test-ratio', 'lint', 'duplication'], 'frontend criteria (crap) on top of the default four');
  assert.equal(by.crap.status, 'not-available');
  assert.equal(by.size.value, 10); assert.equal(by['test-ratio'].value, 0.5);
  assert.equal(by.lint.status, 'not-available', 'no linter configuration: not available, not 0');
  assert.equal(by.lint.score, null);
  assert.equal(loadRuns(out).length, 1);
});

test('frontend criteria add CRAP: without coverage it is "no coverage", with a coverage file it is measured', () => {
  const { root } = gitRepo({ 'src/chat/a.ts': 'export function f(a){ if(a){ return 1; } return 2; }\n' });
  const out = docsRoot();
  const none = runHealth({ capability: 'chat', repo: 'ORISO-Frontend', checkout: root, root: out, rules: RULES, now: NOW }).record;
  const crap0 = none.metrics.find(m => m.name === 'crap');
  assert.equal(crap0.status, 'not-available'); assert.equal(crap0.details.state, 'no-coverage');
  const cov = path.join(docsRoot(), 'lcov.info'); fs.writeFileSync(cov, 'SF:src/chat/a.ts\nDA:1,1\nend_of_record\n');
  const r = runHealth({ capability: 'chat', repo: 'ORISO-Frontend', checkout: root, root: out, rules: RULES, now: '2026-10-24T11:00:00Z', coverage: cov }).record;
  const crap = r.metrics.find(m => m.name === 'crap');
  assert.equal(crap.value, 2); assert.equal(crap.threshold, 30); assert.equal(crap.pass, true);
  assert.equal(loadRuns(out).length, 2, 'the earlier run stays as history');
});

test('a folder scope is stored under at/<path> and links to the folder', () => {
  const { root } = gitRepo({ 'src/chat/a.ts': lines(10), 'src/chat/sub/b.ts': lines(30) });
  const out = docsRoot();
  const r = runHealth({ capability: 'chat', repo: 'ORISO-Frontend', checkout: root, root: out, rules: RULES, now: NOW, path: 'src/chat/sub' });
  assert.equal(r.file, 'health/runs/chat/ORISO-Frontend/at/src/chat/sub/20261024T101500Z.json');
  assert.equal(r.record.metrics.find(m => m.name === 'size').value, 30);
  assert.equal(r.record.links.graphNode, 'ORISO-Frontend::folder:src/chat/sub');
});

test('an e-mail scope is judged by the e-mail criteria, not by CRAP', () => {
  const { root } = gitRepo({ 'src/mails/dist/en/a.html': '<html><body><a href="https://example.org">x</a></body></html>\n' });
  const r = runHealth({ capability: 'email-templates', repo: 'ORISO-Frontend', checkout: root, root: docsRoot(), rules: RULES, now: NOW, dryRun: true });
  assert.equal(r.written, false);
  const by = Object.fromEntries(r.record.metrics.map(m => [m.name, m]));
  assert.ok(!('crap' in by), 'a frontend metric is not forced onto e-mail templates');
  assert.deepEqual([by['email-render'].value, by['email-links'].value, by['email-languages'].value], [0, 0, 1]);
  assert.equal(by['email-languages'].pass, false);
});

test('refusals: dirty checkout, unknown capability, bad commit, overwrite, verdict without a model', () => {
  const { root, sha } = gitRepo({ 'src/chat/a.ts': lines(3) });
  const out = docsRoot();
  const base = { capability: 'chat', repo: 'ORISO-Frontend', checkout: root, root: out, rules: RULES, now: NOW };
  fs.appendFileSync(path.join(root, 'src/chat/a.ts'), 'changed();\n');
  assert.throws(() => runHealth(base), /uncommitted changes/);
  assert.ok(runHealth({ ...base, allowDirty: true, dryRun: true }).record.commit === sha);
  git(root, 'checkout', '-q', '--', '.');
  assert.throws(() => runHealth({ ...base, capability: 'nope' }), /unknown capability/);
  assert.throws(() => runHealth({ ...base, commit: 'abc' }), /40-character/);
  runHealth(base);
  assert.throws(() => runHealth(base), /never overwritten/);
  const verdict = path.join(out, 'v.json'); fs.writeFileSync(verdict, JSON.stringify([{ criterion: 'maintainability', score: 40, reasons: ['why'] }]));
  assert.throws(() => runHealth({ ...base, now: '2026-10-24T12:00:00Z', verdict }), /model/);
  const withModel = runHealth({ ...base, now: '2026-10-24T12:00:00Z', verdict, model: 'claude-test' }).record;
  assert.equal(withModel.model, 'claude-test'); assert.equal(withModel.verdict[0].weight, 1);
});

test('the command line: run, then validate; errors exit non-zero with a message', () => {
  const { root } = gitRepo({ 'src/chat/a.ts': lines(3) });
  const out = docsRoot();
  const ok = spawnSync('node', [CLI, 'run', '--capability', 'chat', '--repo', 'ORISO-Frontend', '--checkout', root, '--root', out, '--now', NOW], { encoding: 'utf8' });
  // chat is not in the real capability rules for this fixture, so no file resolves: the metrics are not available but the record is still valid
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /wrote health\/runs\/chat\/ORISO-Frontend\/20261024T101500Z\.json/);
  const v = spawnSync('node', [CLI, 'validate', '--root', out], { encoding: 'utf8' });
  assert.equal(v.status, 0); assert.match(v.stdout, /1 run records are valid/);
  const bad = spawnSync('node', [CLI, 'run', '--capability', 'chat'], { encoding: 'utf8' });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr, /--repo and --checkout/);
  assert.equal(spawnSync('node', [CLI], { encoding: 'utf8' }).status, 2);
});
