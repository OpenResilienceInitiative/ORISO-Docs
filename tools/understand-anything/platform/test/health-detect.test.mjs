// Change detection for scheduled health runs (ORISO-Docs#220, epic #213).
// Seam: selectScopes() is a pure function (scopes, latest records, a diff function, a cap) -> who runs and why.
// changedFiles() is the thin git layer, tested against a real repository.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkRepo } from './health-fixture.mjs';
import { RULES } from './health-fixture.mjs';
import { selectScopes, scopesOf, changedFiles, DEFAULT_LIMIT } from '../lib/health-detect.mjs';

const SHA1 = '1'.repeat(40), SHA2 = '2'.repeat(40);
const sc = (capability, repo = 'ORISO-Frontend') => ({ capability, repo, path: null });
const rec = (scope, commit, startedAt) => ({ scope, commit, startedAt });
const cap = (repo, p) => (p.startsWith('src/chat/') ? 'chat' : p.startsWith('src/other/') ? 'branding' : null);
// diff(repo, since) -> files changed since that commit, or null when the commit is unknown
const diffOf = table => (repo, since) => (since in table ? table[since] : null);

test('a scope whose files changed since its latest record is selected, an untouched one is not', () => {
  const r = selectScopes({
    scopes: [sc('chat'), sc('branding')],
    latest: [rec(sc('chat'), SHA1, '2026-10-01T00:00:00Z'), rec(sc('branding'), SHA2, '2026-10-02T00:00:00Z')],
    diff: diffOf({ [SHA1]: ['src/chat/a.ts', 'README.md'], [SHA2]: ['README.md'] }), capabilityOf: cap,
  });
  assert.deepEqual(r.selected.map(s => [s.scope.capability, s.reason, s.changed]), [['chat', 'changed', 1]]);
  assert.deepEqual(r.skipped.map(s => [s.scope.capability, s.reason]), [['branding', 'unchanged']]);
});

test('a scope that was never run is selected, and goes before changed ones', () => {
  const r = selectScopes({
    scopes: [sc('chat'), sc('branding')],
    latest: [rec(sc('chat'), SHA1, '2026-10-01T00:00:00Z')],
    diff: diffOf({ [SHA1]: ['src/chat/a.ts'] }), capabilityOf: cap,
  });
  assert.deepEqual(r.selected.map(s => [s.scope.capability, s.reason]), [['branding', 'never-run'], ['chat', 'changed']]);
});

test('a latest commit the checkout does not know (rewritten history) counts as changed', () => {
  const r = selectScopes({ scopes: [sc('chat')], latest: [rec(sc('chat'), SHA1, '2026-10-01T00:00:00Z')], diff: diffOf({}), capabilityOf: cap });
  assert.deepEqual(r.selected.map(s => [s.reason, s.changed]), [['changed', null]]);
});

test('the cap keeps never-run scopes first, then the longest-waiting ones; the rest is reported as over-cap', () => {
  const scopes = ['a', 'b', 'c', 'd'].map(id => sc(id));
  const latest = [rec(sc('b'), SHA1, '2026-10-05T00:00:00Z'), rec(sc('c'), SHA1, '2026-10-01T00:00:00Z'), rec(sc('d'), SHA1, '2026-10-03T00:00:00Z')];
  const r = selectScopes({ scopes, latest, diff: diffOf({ [SHA1]: ['a/1', 'b/1', 'c/1', 'd/1'] }), capabilityOf: (repo, p) => p.split('/')[0], limit: 2 });
  assert.deepEqual(r.selected.map(s => s.scope.capability), ['a', 'c'], 'never-run a, then c (oldest record)');
  assert.deepEqual(r.skipped.map(s => [s.scope.capability, s.reason]), [['d', 'over-cap'], ['b', 'over-cap']]);
});

test('the default cap is small and positive; limit 0 or a negative one is refused', () => {
  assert.ok(Number.isInteger(DEFAULT_LIMIT) && DEFAULT_LIMIT > 0 && DEFAULT_LIMIT <= 10);
  assert.throws(() => selectScopes({ scopes: [], latest: [], diff: diffOf({}), capabilityOf: cap, limit: 0 }), /limit/);
});

test('only the newest record of a scope counts, whatever the order of the list', () => {
  const r = selectScopes({
    scopes: [sc('chat')],
    latest: [rec(sc('chat'), SHA2, '2026-10-09T00:00:00Z'), rec(sc('chat'), SHA1, '2026-10-01T00:00:00Z')],
    diff: diffOf({ [SHA1]: ['src/chat/a.ts'], [SHA2]: [] }), capabilityOf: cap,
  });
  assert.deepEqual(r.selected, []);
});

test('folder records do not count for the whole-capability scope', () => {
  const r = selectScopes({
    scopes: [sc('chat')], latest: [rec({ capability: 'chat', repo: 'ORISO-Frontend', path: 'src/chat' }, SHA1, '2026-10-01T00:00:00Z')],
    diff: diffOf({ [SHA1]: [] }), capabilityOf: cap,
  });
  assert.deepEqual(r.selected.map(s => s.reason), ['never-run']);
});

test('the result is the same for the same input (stable order)', () => {
  const input = { scopes: [sc('b'), sc('a')], latest: [], diff: diffOf({}), capabilityOf: cap };
  assert.deepEqual(selectScopes(input), selectScopes({ ...input, scopes: [...input.scopes].reverse() }));
});

test('scopesOf lists capability x repository pairs the rules know, once each, sorted', () => {
  const list = scopesOf({ ...RULES, overrides: [{ repo: 'ORISO-Admin', path: 'src/x/', capability: 'chat', reason: 't' }] });
  assert.deepEqual(list.map(s => `${s.capability}|${s.repo}`), ['branding|ORISO-Frontend', 'chat|ORISO-Admin', 'chat|ORISO-Frontend', 'email-templates|ORISO-Frontend', 'notifications|ORISO-Frontend']);
  assert.ok(list.every(s => s.path === null));
});

const git = (dir, ...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', dir, ...a], { encoding: 'utf8' }).trim();
test('changedFiles lists the files changed between a commit and HEAD, and null for an unknown commit', () => {
  const root = mkRepo({ 'src/chat/a.ts': 'a\n', 'README.md': 'r\n' });
  git(root, 'init', '-q'); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'one');
  const first = git(root, 'rev-parse', 'HEAD');
  git(root, 'mv', 'src/chat/a.ts', 'src/chat/b.ts'); git(root, 'commit', '-q', '-am', 'two');
  assert.deepEqual(changedFiles(root, first), ['src/chat/a.ts', 'src/chat/b.ts']);
  assert.deepEqual(changedFiles(root, git(root, 'rev-parse', 'HEAD')), []);
  assert.equal(changedFiles(root, SHA1), null);
});
