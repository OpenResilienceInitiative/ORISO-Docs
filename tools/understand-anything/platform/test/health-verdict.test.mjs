// AI verdict step (ORISO-Docs#220, epic #213; spec stories 18, 29).
// Seams: runVerdictStep() with a FAKE model transport (never the network), httpTransport() with a fake fetch,
// and buildRunRecord()/validateRunRecord() for what lands in the record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunManifest } from '../../../planning-map/lib/run-manifest.mjs';
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria } from '../lib/health-criteria.mjs';
import { CAPABILITY_IDS, CODE_REPOS } from '../lib/capabilities.mjs';
import { buildRunRecord, validateRunRecord, criteriaVersion } from '../lib/health-run.mjs';
import { REVIEW_CRITERIA, buildVerdictInput, parseVerdict, runVerdictStep, httpTransport, isPublicRepo, buildPrompt } from '../lib/health-verdict.mjs';

const SHA = 'a'.repeat(40), AT = '2026-10-24T10:15:00Z';
const set = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  lint: {threshold: 0, weight: 2}
tests: []
---
Judge by the numbers.`, 'health/default.md')], { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
const effective = resolveCriteria(set, { capability: 'chat', path: 'ORISO-Frontend/' });
const scope = { capability: 'chat', repo: 'ORISO-Frontend', path: null };
const measurements = { size: { value: 900, source: 's', details: {} }, lint: { value: null, source: 'eslint', details: { reason: 'no linter configuration found' } } };
const base = () => buildRunRecord({ manifest: createRunManifest({ at: AT, commits: { 'ORISO-Frontend': SHA } }), scope, commit: SHA, effective, measurements, startedAt: AT });
const steering = [
  { author: 'alice', createdAt: '2026-10-20T08:00:00Z', url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/9#issuecomment-1', authorAssociation: 'MEMBER', body: 'Look at error handling first.', truncated: false },
];
const good = { verdict: REVIEW_CRITERIA.map((c, i) => ({ criterion: c, score: 60 + i, reasons: [`reason for ${c}`] })) };
const KEY = { HEALTH_MODEL_API_KEY: 'k-test', HEALTH_MODEL: 'test-model' };
const fakeModel = reply => { const calls = []; const t = async req => { calls.push(req); return typeof reply === 'function' ? reply(req) : reply; }; t.calls = calls; return t; };
const step = (over = {}) => runVerdictStep({ scope, effective, steering, metrics: base().metrics, env: KEY, transport: fakeModel(JSON.stringify(good)), ...over });

// ---- input and hashes ----
test('the input holds the effective criteria, the member steering comments and the measured metrics, and nothing else about the code', () => {
  const { input } = buildVerdictInput({ scope, effective, steering, metrics: base().metrics });
  assert.deepEqual(Object.keys(input).sort(), ['criteria', 'metrics', 'reviewCriteria', 'scope', 'steering']);
  assert.equal(input.criteria.instruction, 'Judge by the numbers.');
  assert.deepEqual(input.criteria.metrics, { size: { threshold: 400, weight: 1 }, lint: { threshold: 0, weight: 2 } });
  assert.deepEqual(input.steering, [{ author: 'alice', createdAt: '2026-10-20T08:00:00Z', body: 'Look at error handling first.' }]);
  assert.deepEqual(input.metrics.map(m => [m.name, m.value, m.status]), [['size', 900, 'measured'], ['lint', null, 'not-available']]);
  assert.deepEqual(input.reviewCriteria, REVIEW_CRITERIA);
});

test('hashes: the criteria hash is the record criteriaVersion; the steering hash changes with a comment and not with its url', () => {
  const a = buildVerdictInput({ scope, effective, steering, metrics: base().metrics }).hashes;
  assert.equal(a.criteria, criteriaVersion(effective));
  const moved = buildVerdictInput({ scope, effective, steering: [{ ...steering[0], url: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/9#issuecomment-2' }], metrics: base().metrics }).hashes;
  assert.equal(moved.steering, a.steering);
  const edited = buildVerdictInput({ scope, effective, steering: [{ ...steering[0], body: 'Do not touch until the release.' }], metrics: base().metrics }).hashes;
  assert.notEqual(edited.steering, a.steering);
  assert.match(a.steering, /^[0-9a-f]{64}$/);
});

test('no steering source is recorded as null, an empty steering list as a hash: "nobody said anything" differs from "not looked"', () => {
  const none = buildVerdictInput({ scope, effective, steering: null, metrics: [] });
  const empty = buildVerdictInput({ scope, effective, steering: [], metrics: [] });
  assert.equal(none.hashes.steering, null); assert.deepEqual(none.input.steering, []);
  assert.match(empty.hashes.steering, /^[0-9a-f]{64}$/);
});

// ---- the step ----
test('with the secret the fake model gets the input and its verdict is validated and returned', async () => {
  const t = fakeModel(JSON.stringify(good));
  const r = await step({ transport: t });
  assert.equal(r.status, 'ran'); assert.equal(r.model, 'test-model'); assert.equal(r.note, null);
  assert.deepEqual(r.verdict.map(v => v.criterion), REVIEW_CRITERIA);
  assert.deepEqual(r.verdict[0], { criterion: REVIEW_CRITERIA[0], score: 60, weight: 1, reasons: [`reason for ${REVIEW_CRITERIA[0]}`] });
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].model, 'test-model');
  assert.match(t.calls[0].prompt, /Look at error handling first\./);
  assert.match(t.calls[0].prompt, /"size"/);
  assert.match(t.calls[0].system, /JSON/);
  assert.match(r.inputs.criteria, /^[0-9a-f]{64}$/); assert.match(r.inputs.steering, /^[0-9a-f]{64}$/);
});

test('without HEALTH_MODEL_API_KEY the step is skipped, nothing is sent, and the hashes are still recorded', async () => {
  const t = fakeModel('never');
  const r = await step({ env: { HEALTH_MODEL: 'test-model' }, transport: t });
  assert.deepEqual([r.status, r.model, r.verdict], ['skipped', null, []]);
  assert.match(r.note, /HEALTH_MODEL_API_KEY/);
  assert.equal(t.calls.length, 0);
  assert.match(r.inputs.criteria, /^[0-9a-f]{64}$/);
  assert.equal((await step({ env: { HEALTH_MODEL_API_KEY: '  ', HEALTH_MODEL: 'm' }, transport: t })).status, 'skipped', 'a blank secret is no secret');
});

test('without a configured model name nothing runs either (no default provider, no default model)', async () => {
  const t = fakeModel('never');
  const r = await step({ env: { HEALTH_MODEL_API_KEY: 'k' }, transport: t });
  assert.equal(r.status, 'skipped'); assert.match(r.note, /HEALTH_MODEL\b/); assert.equal(t.calls.length, 0);
});

test('private repositories are never sent unless HEALTH_MODEL_ALLOW_PRIVATE=true; unknown repositories count as private', async () => {
  assert.equal(isPublicRepo('ORISO-Frontend'), true);
  assert.equal(isPublicRepo('ORISO-E2E'), false);
  assert.equal(isPublicRepo('Some-Other-Repo'), false);
  const t = fakeModel(JSON.stringify(good));
  const priv = { ...scope, repo: 'ORISO-E2E' };
  const r = await step({ scope: priv, transport: t });
  assert.equal(r.status, 'skipped'); assert.match(r.note, /private/); assert.equal(t.calls.length, 0);
  assert.equal((await step({ scope: priv, transport: t, env: { ...KEY, HEALTH_MODEL_ALLOW_PRIVATE: '1' } })).status, 'skipped', 'only the word true switches it on');
  assert.equal((await step({ scope: priv, transport: t, env: { ...KEY, HEALTH_MODEL_ALLOW_PRIVATE: 'true' } })).status, 'ran');
});

test('a model failure or an unusable answer skips the verdict with the reason; the metrics of the run survive', async () => {
  const boom = await step({ transport: async () => { throw new Error('503 overloaded'); } });
  assert.deepEqual([boom.status, boom.model, boom.verdict], ['skipped', null, []]); assert.match(boom.note, /model error: 503 overloaded/);
  const junk = await step({ transport: fakeModel('I think it is fine.') });
  assert.equal(junk.status, 'skipped'); assert.match(junk.note, /invalid verdict/);
});

test('the secret never appears in the note, the prompt or the result', async () => {
  const t = fakeModel(JSON.stringify(good));
  const r = await step({ transport: t, env: { ...KEY, HEALTH_MODEL_API_KEY: 'sk-very-secret' } });
  assert.ok(!JSON.stringify(r).includes('sk-very-secret'));
  assert.ok(!JSON.stringify(t.calls).includes('sk-very-secret'));
  const err = await step({ env: { ...KEY, HEALTH_MODEL_API_KEY: 'sk-very-secret' }, transport: async () => { throw new Error('bad key sk-very-secret'); } });
  assert.ok(!JSON.stringify(err).includes('sk-very-secret'));
});

// ---- parsing ----
test('parseVerdict accepts JSON in a code fence or with prose around it, rounds scores, and needs every review criterion once', () => {
  const fenced = '```json\n' + JSON.stringify(good) + '\n```';
  assert.equal(parseVerdict(fenced).length, REVIEW_CRITERIA.length);
  assert.equal(parseVerdict('Here you go: ' + JSON.stringify({ verdict: good.verdict.map(v => ({ ...v, score: 70.6 })) }))[0].score, 71);
  const bad = fn => assert.throws(() => parseVerdict(JSON.stringify({ verdict: fn(structuredClone(good.verdict)) })), /invalid verdict/);
  bad(v => v.slice(1));
  bad(v => [...v, v[0]]);
  bad(v => { v[0].score = 101; return v; });
  bad(v => { v[0].score = -1; return v; });
  bad(v => { v[0].score = '80'; return v; });
  bad(v => { v[0].reasons = []; return v; });
  bad(v => { v[0].reasons = ['  ']; return v; });
  bad(v => { v[0].criterion = 'size'; return v; });
  bad(v => { v[0].extra = 1; return v; });
  assert.throws(() => parseVerdict('{"verdict": [}'), /invalid verdict/);
  assert.throws(() => parseVerdict(''), /invalid verdict/);
});

test('the prompt treats steering comments as direction from members, never as code to run, and asks for JSON only', () => {
  const { input } = buildVerdictInput({ scope, effective, steering, metrics: base().metrics });
  const { system, prompt } = buildPrompt(input);
  assert.match(system, /only JSON/i);
  assert.match(system, /steering/i);
  assert.match(prompt, /maintainability/);
});

// ---- record ----
test('a verdict that ran lands in the record with model, hashes and status; the record validates', async () => {
  const s = await step();
  const rec = buildRunRecord({ manifest: createRunManifest({ at: AT, commits: { 'ORISO-Frontend': SHA } }), scope, commit: SHA, effective, measurements, startedAt: AT,
    model: s.model, verdict: s.verdict, verdictStatus: s.status, verdictNote: s.note, inputs: s.inputs });
  assert.deepEqual(validateRunRecord(rec), []);
  assert.equal(rec.model, 'test-model'); assert.equal(rec.verdictStatus, 'ran'); assert.deepEqual(rec.inputs, s.inputs);
  assert.equal(rec.verdict.length, REVIEW_CRITERIA.length);
});

test('a skipped verdict is a record with model null, an empty verdict and verdictStatus skipped', async () => {
  const s = await step({ env: {} });
  const rec = buildRunRecord({ manifest: createRunManifest({ at: AT, commits: { 'ORISO-Frontend': SHA } }), scope, commit: SHA, effective, measurements, startedAt: AT,
    model: s.model, verdict: s.verdict, verdictStatus: s.status, verdictNote: s.note, inputs: s.inputs });
  assert.deepEqual(validateRunRecord(rec), []);
  assert.deepEqual([rec.model, rec.verdict, rec.verdictStatus], [null, [], 'skipped']);
  assert.match(rec.verdictNote, /HEALTH_MODEL_API_KEY/);
});

test('old records without the new fields stay valid; the new fields cannot contradict each other', () => {
  assert.deepEqual(validateRunRecord(base()), []);
  const rec = mut => { const r = structuredClone(base()); mut(r); return validateRunRecord(r).join('\n'); };
  assert.match(rec(r => { r.verdictStatus = 'skipped'; r.model = 'm'; }), /skipped.*model/s);
  assert.match(rec(r => { r.verdictStatus = 'ran'; }), /ran.*model/s);
  assert.match(rec(r => { r.verdictStatus = 'maybe'; }), /verdictStatus/);
  assert.match(rec(r => { r.inputs = { criteria: 'nope', steering: null }; }), /inputs/);
  assert.match(rec(r => { r.inputs = { criteria: 'a'.repeat(64), steering: null, extra: 1 }; }), /extra/);
  assert.match(rec(r => { r.inputs = { criteria: 'b'.repeat(64), steering: null }; }), /criteria.*criteriaVersion/s, 'the criteria hash is the one of the record');
});

// ---- real transport, fake fetch ----
test('httpTransport (anthropic) posts the prompt with the key in a header and returns the text', async () => {
  const seen = [];
  const fetch = async (url, init) => { seen.push({ url, init }); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'ANSWER' }] }) }; };
  const t = httpTransport({ provider: 'anthropic', apiKey: 'k1', fetch });
  assert.equal(await t({ model: 'm1', system: 'S', prompt: 'P' }), 'ANSWER');
  assert.equal(seen[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen[0].init.headers['x-api-key'], 'k1');
  const body = JSON.parse(seen[0].init.body);
  assert.deepEqual([body.model, body.system, body.messages], ['m1', 'S', [{ role: 'user', content: 'P' }]]);
  assert.ok(!seen[0].init.body.includes('k1'));
});

test('httpTransport (openai-compatible) uses the configured base url; an error status throws without the key', async () => {
  const fetch = async (url, init) => ({ ok: url.startsWith('https://llm.example/v1/'), status: 200, json: async () => ({ choices: [{ message: { content: 'OK' } }] }), text: async () => 'nope', init });
  const t = httpTransport({ provider: 'openai', apiKey: 'k2', baseUrl: 'https://llm.example/v1', fetch });
  assert.equal(await t({ model: 'm', system: 'S', prompt: 'P' }), 'OK');
  const bad = httpTransport({ provider: 'openai', apiKey: 'k2', baseUrl: 'https://other.example/v1', fetch: async () => ({ ok: false, status: 401, text: async () => 'unauthorized k2' }) });
  await assert.rejects(() => bad({ model: 'm', system: 'S', prompt: 'P' }), e => /401/.test(e.message) && !e.message.includes('k2'));
  assert.throws(() => httpTransport({ provider: 'nope', apiKey: 'k', fetch }), /provider/);
  assert.throws(() => httpTransport({ provider: 'openai', apiKey: 'k', fetch }), /HEALTH_MODEL_BASE_URL|base url/i);
  assert.throws(() => httpTransport({ provider: 'openai', apiKey: 'k', baseUrl: 'http://plain.example', fetch }), /https/);
});
