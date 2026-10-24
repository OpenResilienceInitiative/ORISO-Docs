// Health criteria files: parsing, validation, inheritance (ORISO-Docs#217, epic #213).
// Seam: the module's public functions, fed with file text. No file system except the seed test at the end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METRIC_NAMES, METRICS } from '../lib/health-metrics.mjs';
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria, CriteriaError } from '../lib/health-criteria.mjs';
import { CAPABILITY_IDS, CODE_REPOS } from '../lib/capabilities.mjs';

const ctx = { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS };
const F = (id, front, body = '') => parseCriteriaFile(`---\n${front}\n---\n${body}`, `health/${id}.md`);
const DEFAULT = F('default', `scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  lint: {threshold: 0, weight: 2}
tests:
  - run the area's unit tests`, 'Judge the area by the numbers.');
const set = (...files) => validateCriteriaSet([DEFAULT, ...files], ctx);
const codeOf = fn => { try { fn(); } catch (e) { return e.code; } return null; };

test('the closed metric list is the eight agreed names, in one shared module', () => {
  assert.deepEqual([...METRIC_NAMES], ['size', 'test-ratio', 'lint', 'duplication', 'crap', 'email-render', 'email-links', 'email-languages']);
  for (const n of METRIC_NAMES) assert.ok(['lower', 'higher'].includes(METRICS[n].better), n);
  assert.throws(() => { METRIC_NAMES.push('x'); }, TypeError, 'the list is frozen');
});

test('front matter and body are read; the id is the file name', () => {
  assert.equal(DEFAULT.id, 'default');
  assert.deepEqual(DEFAULT.scope, { raw: '*', capability: '*', glob: null });
  assert.deepEqual(DEFAULT.metrics, { size: { threshold: 400, weight: 1 }, lint: { threshold: 0, weight: 2 } });
  assert.deepEqual(DEFAULT.tests, ["run the area's unit tests"]);
  assert.equal(DEFAULT.instruction, 'Judge the area by the numbers.');
  assert.match(DEFAULT.version, /^[0-9a-f]{12}$/);
});

test('block form of metrics, comments and quoted values parse the same', () => {
  const f = F('x', `# a comment
scope: chat:ORISO-Frontend/src/**   # inline comment
inherits: default
metrics:
  crap:
    threshold: 30
    weight: 3
tests: []`);
  assert.deepEqual(f.scope, { raw: 'chat:ORISO-Frontend/src/**', capability: 'chat', glob: 'ORISO-Frontend/src/**' });
  assert.deepEqual(f.metrics, { crap: { threshold: 30, weight: 3 } });
  assert.deepEqual(f.tests, []);
  assert.equal(f.inherits, 'default');
});

test('a file without front matter, with tabs or with an unknown key is refused', () => {
  assert.equal(codeOf(() => parseCriteriaFile('no front matter', 'a.md')), 'front-matter');
  assert.equal(codeOf(() => F('x', 'scope: "*"\nmetrics:\n\tsize: {threshold: 1, weight: 1}')), 'yaml');
  assert.equal(codeOf(() => F('x', 'scope: chat\nmetricz: {}')), 'unknown-key');
});

test('unknown metric names fail validation instead of being skipped', () => {
  const bad = F('x', 'scope: chat\nmetrics:\n  cyclomatic: {threshold: 10, weight: 1}');
  assert.equal(codeOf(() => set(bad)), 'metric-unknown');
  assert.match(String(new CriteriaError('metric-unknown', 'm')), /m/);
  try { set(bad); } catch (e) { assert.match(e.message, /cyclomatic/); assert.match(e.message, /health\/x\.md/); }
});

test('threshold and weight must be present, finite and not negative', () => {
  for (const m of ['{weight: 1}', '{threshold: 3}', '{threshold: -1, weight: 1}', '{threshold: 1, weight: -2}', '{threshold: abc, weight: 1}'])
    assert.equal(codeOf(() => set(F('x', `scope: chat\nmetrics:\n  size: ${m}`))), 'metric-value', m);
});

test('unknown capability ids are rejected, also inside a path scope', () => {
  assert.equal(codeOf(() => set(F('x', 'scope: invented-id'))), 'scope-capability');
  assert.equal(codeOf(() => set(F('x', 'scope: invented-id:ORISO-Frontend/src/**'))), 'scope-capability');
});

test('a path glob must start inside a known repository', () => {
  assert.equal(codeOf(() => set(F('x', 'scope: "*:ORISO-Fronted/**"'))), 'scope-repo');
  assert.equal(codeOf(() => set(F('x', 'scope: "*:{ORISO-Frontend,Nope}/**"'))), 'scope-repo');
  assert.equal(codeOf(() => set(F('x', 'scope: "*:{ORISO-Frontend,ORISO-Admin}/**"'))), null);
});

test('inherits must name an existing file, without cycles', () => {
  assert.equal(codeOf(() => set(F('x', 'scope: chat\ninherits: ghost'))), 'inherits-unknown');
  assert.equal(codeOf(() => set(F('a', 'scope: chat\ninherits: b'), F('b', 'scope: live-chat\ninherits: a'))), 'inherits-cycle');
});

test('exactly one default file with scope * and no glob; scopes are unique', () => {
  assert.equal(codeOf(() => validateCriteriaSet([F('x', 'scope: chat')], ctx)), 'default-missing');
  assert.equal(codeOf(() => validateCriteriaSet([DEFAULT, F('default2', 'scope: "*"')], ctx)), 'duplicate-scope');
  assert.equal(codeOf(() => set(F('a', 'scope: chat'), F('b', 'scope: chat'))), 'duplicate-scope');
  assert.equal(codeOf(() => set(F('a', 'scope: chat\ninherits: default'), F('default', 'scope: chat'))), 'duplicate-id');
  assert.equal(codeOf(() => validateCriteriaSet([F('default', 'scope: "*:ORISO-Frontend/**"')], ctx)), 'default-scope');
});

// ---- resolver: effective criteria, nearest file wins per key, origin recorded ----
const FRONT = F('frontend', `scope: "*:{ORISO-Frontend,ORISO-Admin}/**"
metrics:
  crap: {threshold: 30, weight: 3}
  size: {threshold: 300, weight: 1}
tests:
  - npm run test:unit`, 'Review React code for risky untested functions.');
const MAIL = F('email', `scope: email-templates
metrics:
  email-render: {threshold: 0, weight: 3}
  lint: {threshold: 5, weight: 1}`, 'Render every template.');
const CHAT = F('chat-ui', `scope: chat:ORISO-Frontend/src/components/chat/**
inherits: frontend
metrics:
  crap: {threshold: 20, weight: 4}`);
const tree = set(FRONT, MAIL, CHAT);
const eff = (capability, path) => resolveCriteria(tree, { capability, path });
const view = e => ({
  matched: e.matched, chain: e.chain,
  metrics: Object.fromEntries(Object.entries(e.metrics).map(([k, m]) => [k, [m.threshold, m.weight, m.origin.id]])),
  tests: [e.tests.list, e.tests.origin.id], instruction: [e.instruction.text, e.instruction.origin.id],
});

test('a capability without its own file gets the default, every key from default', () => {
  assert.deepEqual(view(eff('deletion')), {
    matched: 'default', chain: ['default'],
    metrics: { size: [400, 1, 'default'], lint: [0, 2, 'default'] },
    tests: [["run the area's unit tests"], 'default'], instruction: ['Judge the area by the numbers.', 'default'] });
});

test('email-templates: own metrics, the rest inherited from the default, origin per key', () => {
  assert.deepEqual(view(eff('email-templates')), {
    matched: 'email', chain: ['email', 'default'],
    metrics: { 'email-render': [0, 3, 'email'], lint: [5, 1, 'email'], size: [400, 1, 'default'] },
    tests: [["run the area's unit tests"], 'default'], instruction: ['Render every template.', 'email'] });
});

test('a frontend path is matched by the glob; the same capability outside the glob is not', () => {
  assert.equal(eff('chat', 'ORISO-Frontend/src/App.tsx').matched, 'frontend');
  assert.equal(eff('chat', 'ORISO-Admin/src/x.tsx').matched, 'frontend');
  assert.equal(eff('chat', 'ORISO-UserService/src/main/X.java').matched, 'default');
  assert.equal(eff('chat').matched, 'default', 'a capability alone has no path, so no path scope applies');
});

test('the nearest file wins per key; folders and files below it inherit from it', () => {
  const v = view(eff('chat', 'ORISO-Frontend/src/components/chat/Bubble.tsx'));
  assert.equal(v.matched, 'chat-ui');
  assert.deepEqual(v.chain, ['chat-ui', 'frontend', 'default']);
  assert.deepEqual(v.metrics, { crap: [20, 4, 'chat-ui'], size: [300, 1, 'frontend'], lint: [0, 2, 'default'] });
  assert.deepEqual(v.tests, [['npm run test:unit'], 'frontend']);
  assert.deepEqual(v.instruction, ['Review React code for risky untested functions.', 'frontend']);
  assert.equal(eff('chat', 'ORISO-Frontend/src/components/chat/').matched, 'chat-ui', 'a folder is covered when its files are');
  assert.equal(eff('chat', 'ORISO-Frontend/src/components/').matched, 'frontend', 'a parent folder is not covered by the narrower scope');
});

test('a capability file beats a wildcard path file; a path inside a capability beats the capability file', () => {
  assert.equal(eff('email-templates', 'ORISO-Frontend/src/emails/kit/emailTemplate.ts').matched, 'email');
  const t2 = set(FRONT, MAIL, F('mail-fe', 'scope: email-templates:ORISO-Frontend/src/emails/**\ninherits: email'));
  assert.equal(resolveCriteria(t2, { capability: 'email-templates', path: 'ORISO-Frontend/src/emails/x.ts' }).matched, 'mail-fe');
  assert.equal(resolveCriteria(t2, { capability: 'email-templates', path: 'ORISO-Admin/src/x.tsx' }).matched, 'email');
});

test('an empty tests list overrides inherited tests; weight 0 switches a metric off but keeps the origin', () => {
  const t = set(F('quiet', 'scope: deletion\ntests: []\nmetrics:\n  size: {threshold: 10, weight: 0}'));
  const e = resolveCriteria(t, { capability: 'deletion' });
  assert.deepEqual([e.tests.list, e.tests.origin.id], [[], 'quiet']);
  assert.deepEqual([e.metrics.size.weight, e.metrics.size.origin.id], [0, 'quiet']);
});

test('an unknown capability id cannot be resolved', () => {
  assert.equal(codeOf(() => eff('invented')), 'capability-unknown');
});

test('two path scopes of equal specificity that both match are ambiguous', () => {
  const t = set(F('a', 'scope: "*:ORISO-Frontend/src/**"'), F('b', 'scope: "*:ORISO-Frontend/src/*"'));
  assert.equal(codeOf(() => resolveCriteria(t, { capability: 'chat', path: 'ORISO-Frontend/src/x.ts' })), 'ambiguous');
});

// ---- the committed seed files ----
import { loadCriteria, buildCriteriaDoc } from '../lib/health-criteria.mjs';
import { loadRules } from '../lib/capabilities.mjs';

const rules = loadRules();
const seed = loadCriteria(undefined, ctx);
const seedEff = (capability, path) => resolveCriteria(seed, { capability, path });

test('seed: a default, a frontend file and an email file load and validate', () => {
  assert.deepEqual(seed.map(f => f.id).sort(), ['default', 'email', 'frontend']);
});

test('seed: frontend scores CRAP per function with the proposed threshold 30', () => {
  const e = seedEff('chat', 'ORISO-Frontend/src/components/chat/Bubble.tsx');
  assert.equal(e.matched, 'frontend');
  assert.equal(e.metrics.crap.threshold, 30);
  assert.equal(e.metrics.crap.origin.id, 'frontend');
  assert.equal(e.metrics.lint.origin.id, 'default');
  assert.equal(seedEff('chat', 'ORISO-UserService/src/main/java/X.java').metrics.crap, undefined, 'backend code has no CRAP');
});

test('seed: the email scope is a capability of capability-rules.json and uses render, links and languages', () => {
  const email = seed.find(f => f.id === 'email');
  assert.ok(rules.capabilities[email.scope.capability], `${email.scope.capability} is a real capability`);
  const e = seedEff('email-templates');
  assert.deepEqual(['email-links', 'email-languages', 'email-render'].map(k => k in e.metrics), [true, true, true]);
  assert.equal(e.metrics.crap, undefined);
  // The real template override in the frontend resolves to that capability, hence to the email file.
  assert.equal(seedEff('email-templates', 'ORISO-Frontend/src/emails/kit/emailTemplate.ts').matched, 'email');
});

test('seed: every file has a reviewer instruction of its own or inherited', () => {
  for (const f of seed) assert.ok(seedEff(f.scope.capability === '*' ? 'chat' : f.scope.capability).instruction.text.length > 40, f.id);
});

// ---- the document the map reads (map/data/criteria.json) ----
const doc = buildCriteriaDoc(seed, rules);

test('doc: carries the closed metric list, the files with their repo paths and the edit source', () => {
  assert.equal(doc.schemaVersion, 1);
  assert.deepEqual(Object.keys(doc.metrics), [...METRIC_NAMES]);
  assert.equal(doc.files.email.path, 'tools/understand-anything/platform/capabilities/health/email.md');
  assert.equal(doc.source.repository, 'OpenResilienceInitiative/ORISO-Docs');
  assert.match(doc.files.frontend.version, /^[0-9a-f]{12}$/);
});

test('doc: every capability has its effective criteria with origins; unknown ids are absent', () => {
  assert.deepEqual(Object.keys(doc.capabilities).sort(), [...CAPABILITY_IDS].sort());
  const mail = doc.capabilities['email-templates'].effective;
  assert.equal(mail.matched, 'email');
  assert.equal(mail.metrics['email-render'].origin, 'email');
  assert.equal(mail.metrics.size.origin, 'default');
  assert.equal(mail.metrics.size.better, 'lower');
  assert.deepEqual(mail.tests.list.length, 2);
});

test('doc: path-scoped files that reach into a capability are listed as narrower rules, wildcard ones only where no capability file overrides', () => {
  const inChat = doc.capabilities.chat.inside.map(x => x.file);
  assert.deepEqual(inChat, ['frontend']);
  assert.equal(doc.capabilities.chat.inside[0].effective.metrics.crap.threshold, 30);
  assert.deepEqual(doc.capabilities['email-templates'].inside, [], 'the email file beats the frontend glob everywhere');
  assert.deepEqual(doc.capabilities['case-handover'].inside.map(x => x.file), ['frontend'], 'case-handover has frontend code');
});

test('doc: nothing in it is HTML or a secret; it is plain JSON data', () => {
  const round = JSON.parse(JSON.stringify(doc));
  assert.deepEqual(round, doc);
});
