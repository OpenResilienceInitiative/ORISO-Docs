import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  loadRules, validateRules, resolveFile, checkCoverage, isProductionFile, listProductionFiles,
  CAPABILITY_IDS, CODE_REPOS, SHARED,
} from '../lib/capabilities.mjs';

const caps = Object.fromEntries(CAPABILITY_IDS.map(id => [id, { label: id }]));
const mk = (rules = [], overrides = []) => validateRules({ schemaVersion: 1, capabilities: caps, rules, overrides });
const R = (prefix, capability, repo = 'ORISO-Frontend') => ({ repo, prefix, capability });

test('longest prefix wins', () => {
  const rules = mk([R('src/', 'chat'), R('src/components/notifications/', 'notifications')]);
  assert.equal(resolveFile(rules, 'ORISO-Frontend', 'src/components/notifications/Bell.tsx').capability, 'notifications');
  assert.equal(resolveFile(rules, 'ORISO-Frontend', 'src/App.tsx').capability, 'chat');
});

test('explicit override beats a longer rule', () => {
  const rules = mk([R('src/a/b/', 'chat')], [{ repo: 'ORISO-Frontend', path: 'src/a/b/x.ts', capability: 'branding', reason: 'r' }]);
  const r = resolveFile(rules, 'ORISO-Frontend', 'src/a/b/x.ts');
  assert.deepEqual([r.capability, r.via], ['branding', 'override']);
});

test('prefixes match whole path segments, not string prefixes', () => {
  const rules = mk([R('src/chat/', 'chat')]);
  assert.throws(() => resolveFile(rules, 'ORISO-Frontend', 'src/chatty/x.ts'), { code: 'unmatched' });
});

test('a file matching no rule fails loudly (no implicit catch-all)', () => {
  assert.throws(() => resolveFile(mk([R('src/', 'chat')]), 'ORISO-Admin', 'src/x.ts'), { code: 'unmatched' });
});

test('two equal-specificity rules with different capabilities are ambiguous', () => {
  const rules = { ...mk(), rules: [R('src/', 'chat'), R('src/', 'branding', 'ORISO-Frontend')] };
  assert.throws(() => resolveFile(rules, 'ORISO-Frontend', 'src/x.ts'), { code: 'ambiguous' });
});

test('validateRules rejects duplicates, unknown capability, unknown repo, bare prefix, reasonless override', () => {
  assert.throws(() => mk([R('src/', 'chat'), R('src/', 'chat')]), { code: 'duplicate' });
  assert.throws(() => mk([R('src/', 'nope')]), { code: 'capability-unknown' });
  assert.throws(() => mk([R('src/', 'chat', 'ORISO-Nope')]), { code: 'repo' });
  assert.throws(() => mk([R('src', 'chat')]), { code: 'path' });
  assert.throws(() => mk([], [{ repo: 'ORISO-Frontend', path: 'a.ts', capability: 'chat' }]), { code: 'reason' });
});

test('validateRules requires exactly the 22 feature-page slugs incl. shared', () => {
  assert.equal(CAPABILITY_IDS.length, 22);
  assert.throws(() => validateRules({ schemaVersion: 1, capabilities: { chat: {} }, rules: [] }), { code: 'capability-missing' });
});

test('isProductionFile excludes tests, stories, typings, build output and non-code', () => {
  const f = 'ORISO-Frontend';
  assert.equal(isProductionFile(f, 'src/a/B.tsx'), true);
  assert.equal(isProductionFile(f, 'src/a/B.test.tsx'), false);
  assert.equal(isProductionFile(f, 'src/a/B.stories.tsx'), false);
  assert.equal(isProductionFile(f, 'src/a/types.d.ts'), false);
  assert.equal(isProductionFile(f, 'node_modules/x/y.js'), false);
  assert.equal(isProductionFile(f, 'README.md'), false);
  assert.equal(isProductionFile(f, 'src/a.scss'), true);
  assert.equal(isProductionFile('ORISO-UserService', 'src/a.scss'), false);
  assert.equal(isProductionFile('ORISO-UserService', 'src/test/java/A.java'), false);
  assert.equal(isProductionFile('ORISO-UserService', 'src/main/java/A.java'), true);
});

test('checkCoverage reports unmatched, ambiguous and dead entries without throwing', () => {
  const rules = mk([R('src/', 'chat'), R('gone/', 'chat')]);
  const c = checkCoverage(rules, { 'ORISO-Frontend': ['src/a.ts', 'lib/b.ts'] });
  assert.deepEqual([c.total, c.mapped, c.unmatched], [2, 1, ['ORISO-Frontend:lib/b.ts']]);
  assert.deepEqual(c.deadRules, ['ORISO-Frontend:gone/']);
});

// ---- contract against the reviewed rules and the real clones ----
const CLONES = process.env.ORISO_CLONES_DIR ?? '/home/claude/oriso';
const have = CODE_REPOS.every(r => existsSync(`${CLONES}/${r}/.git`));

test('reviewed rules file is valid and uses only known capability ids', () => {
  const rules = loadRules();
  assert.ok(rules.rules.length > 0);
  assert.ok(rules.capabilities[SHARED]);
});

test('CONTRACT: every production file in the six code clones maps to exactly one capability or "shared"',
  { skip: have ? false : `clones not found under ${CLONES} (set ORISO_CLONES_DIR)` }, () => {
    const rules = loadRules();
    const files = Object.fromEntries(CODE_REPOS.map(r => [r, listProductionFiles(r, `${CLONES}/${r}`)]));
    const c = checkCoverage(rules, files);
    assert.ok(c.total > 1000, 'suspiciously few production files');
    assert.deepEqual(c.unmatched.slice(0, 20), [], `${c.unmatched.length} unmatched production files`);
    assert.deepEqual(c.ambiguous.slice(0, 20), [], 'ambiguous matches');
    assert.deepEqual(c.deadRules.concat(c.deadOverrides).slice(0, 20), [], 'rules/overrides that match no file (stale)');
    assert.equal(c.mapped, c.total);
  });
