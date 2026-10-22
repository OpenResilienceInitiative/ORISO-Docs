// Planning moves in the map UI (ORISO-Docs#210): optimistic move, rollback with a reason, copy-command fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {parseArgs} from '../../../../planning-map/plan.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/plan-ui.js', import.meta.url), 'utf8'), sandbox);
const PlanMove = sandbox.PlanMove;
const plain = v => JSON.parse(JSON.stringify(v));
const ORG = 'OpenResilienceInitiative';

const item = (repo, number, release, parent) => ({contentType: 'Issue', repository: `${ORG}/${repo}`, number, platformRelease: release, status: 'Ready', ...(parent ? {parent: {repository: `${ORG}/${parent[0]}`, number: parent[1]}} : {})});
const board = () => ({source: {owner: ORG}, items: [
  item('ORISO-Frontend', 10, 'v2.0.12'), item('ORISO-Frontend', 11, null, ['ORISO-Frontend', 10]), item('ORISO-Admin', 5, 'v2.0.12'),
  item('ORISO-Frontend', 99, 'v2.0.12')]});
const epics = {repos: ['ORISO-Frontend', 'ORISO-Admin'], epics: [{r: 0, n: 10, t: 'E', b: 'chat', subs: [[0, 11, 's', 'o'], [1, 5, 's', 'o'], [0, 500, 'private', 'o']]}]};
const rel = (b, n) => b.items.find(i => i.number === n).platformRelease;
const intent = (over) => ({action: 'assignRelease', issues: [{repository: `${ORG}/ORISO-Frontend`, number: 10}], release: 'v2.0.13', withSubIssues: false, expect: 'v2.0.12', ...over});

test('an intent is visible at once, before the transport answers', async () => {
  const s = PlanMove.create(); let release;
  const t = {assignRelease: () => new Promise(r => { release = r; })};
  const done = s.run(intent(), t);
  assert.equal(rel(s.view(board(), epics), 10), 'v2.0.13');
  assert.equal(s.intents[0].status, 'pending');
  release({ok: true});
  assert.equal((await done).status, 'confirmed');
  assert.equal(rel(s.view(board(), epics), 10), 'v2.0.13');
});

test('ROLLBACK: a failed write restores the board and keeps the reason', async () => {
  const s = PlanMove.create(), b = board();
  const t = {assignRelease: async () => ({ok: false, error: {code: 'NO_WRITE_RIGHTS', message: 'Resource not accessible', issue: `${ORG}/ORISO-Frontend#10`}, applied: []})};
  const r = await s.run(intent(), t);
  assert.equal(r.status, 'failed');
  assert.equal(r.error.code, 'NO_WRITE_RIGHTS');
  assert.deepEqual(plain(s.view(b, epics)), plain(b));
  assert.equal(PlanMove.reason(r.error, 'en'), 'No write rights on GitHub for this issue.');
  assert.match(PlanMove.reason(r.error, 'de'), /Schreibrechte/);
});

test('ROLLBACK: a transport that rejects or throws is rolled back as TRANSPORT', async () => {
  for (const t of [{assignRelease: () => Promise.reject(new Error('offline'))}, {assignRelease: () => { throw new Error('boom'); }}]) {
    const s = PlanMove.create(), b = board();
    const r = await s.run(intent(), t);
    assert.equal(r.status, 'failed');
    assert.equal(r.error.code, 'TRANSPORT');
    assert.deepEqual(plain(s.view(b, epics)), plain(b));
  }
});

test('ROLLBACK: a conflict snaps the card back as well', async () => {
  const s = PlanMove.create(), b = board();
  await s.run(intent(), {assignRelease: async () => ({ok: false, error: {code: 'CONFLICT', message: 'x'}})});
  assert.equal(rel(s.view(b, epics), 10), 'v2.0.12');
});

test('a partly applied move keeps exactly what GitHub already took and rolls back the rest', async () => {
  const s = PlanMove.create(), b = board();
  const r = await s.run(intent({withSubIssues: true}), {assignRelease: async () => ({ok: false, error: {code: 'NO_WRITE_RIGHTS', message: 'x', issue: `${ORG}/ORISO-Admin#5`}, applied: [`${ORG}/ORISO-Frontend#10`, `${ORG}/ORISO-Frontend#11`]})});
  assert.equal(r.status, 'confirmed'); assert.equal(r.partial, true);
  const v = s.view(b, epics);
  assert.deepEqual([rel(v, 10), rel(v, 11), rel(v, 5)], ['v2.0.13', 'v2.0.13', 'v2.0.12']);
});

test('withSubIssues moves the epic and its sub-issues on the board, not unrelated issues; without it only the epic', async () => {
  const s = PlanMove.create();
  await s.run(intent({withSubIssues: true}), {assignRelease: async () => ({ok: true})});
  const v = s.view(board(), epics);
  assert.deepEqual([rel(v, 10), rel(v, 11), rel(v, 5), rel(v, 99)], ['v2.0.13', 'v2.0.13', 'v2.0.13', 'v2.0.12']);
  const s2 = PlanMove.create();
  await s2.run(intent(), {assignRelease: async () => ({ok: true})});
  const v2 = s2.view(board(), epics);
  assert.deepEqual([rel(v2, 10), rel(v2, 11)], ['v2.0.13', null]);
});

test('view never mutates the board it is given', async () => {
  const s = PlanMove.create(), b = board(), before = plain(b);
  await s.run(intent({withSubIssues: true}), {assignRelease: async () => ({ok: true})});
  s.view(b, epics);
  assert.deepEqual(plain(b), before);
});

test('without a PlanningTransport the move stays visible as a command to run, and can be discarded', async () => {
  const s = PlanMove.create();
  const r = await s.run(intent({withSubIssues: true}), undefined);
  assert.equal(r.status, 'command');
  assert.equal(rel(s.view(board(), epics), 10), 'v2.0.13');
  s.discard(r.id);
  assert.equal(rel(s.view(board(), epics), 10), 'v2.0.12');
});

test('a transport without the needed method counts as absent', async () => {
  const s = PlanMove.create();
  assert.equal((await s.run(intent(), {})).status, 'command');
});

test('the copied command is exactly what plan.mjs parses back into the intent (real shell quoting)', () => {
  const i = intent({withSubIssues: true, issues: [{repository: `${ORG}/ORISO-Frontend`, number: 10}, {repository: 'ORISO-Admin', number: 5}], release: 'v2.0.13'});
  for (const withApply of [false, true]) {
    const cmd = PlanMove.command(i, withApply);
    assert.match(cmd, /^node tools\/planning-map\/plan\.mjs assign-release /);
    const rest = cmd.slice('node tools/planning-map/plan.mjs '.length);
    const tokens = execFileSync('sh', ['-c', 'printf "%s\\n" ' + rest], {encoding: 'utf8'}).trimEnd().split('\n');
    assert.deepEqual(tokens, plain(PlanMove.argv(i, withApply)));
    const parsed = parseArgs(tokens);
    assert.deepEqual([parsed.issues, parsed.release, parsed.withSubIssues, parsed.expect, parsed.apply],
      [[`${ORG}/ORISO-Frontend#10`, `${ORG}/ORISO-Admin#5`], 'v2.0.13', true, 'v2.0.12', withApply]);
  }
  assert.equal(parseArgs(PlanMove.argv(intent({expect: null}))).expect, null);
});

test('a release name with a space or quote is shell-safe', () => {
  const cmd = PlanMove.command(intent({release: "v2 it's"}));
  const rest = cmd.slice('node tools/planning-map/plan.mjs '.length);
  const tokens = execFileSync('sh', ['-c', 'printf "%s\\n" ' + rest], {encoding: 'utf8'}).trimEnd().split('\n');
  assert.equal(parseArgs(tokens).release, "v2 it's");
});

test('every error code has a German and an English reason', () => {
  for (const code of Object.keys(PlanMove.REASONS)) {
    assert.ok(PlanMove.reason({code}, 'de') && PlanMove.reason({code}, 'en') && PlanMove.reason({code}, 'de') !== PlanMove.reason({code}, 'en'));
  }
  assert.ok(PlanMove.reason({code: 'WHAT'}, 'en'));
});

// ───── setGate intents (ORISO-Docs#211) ─────
const gateIntent = over => ({action: 'setGate', issues: [{repository: `${ORG}/ORISO-Frontend`, number: 11}], gate: 'R3 Human review', expect: null, ...over});

test('a setGate intent shows the gate at once and rolls back with the reason when refused', async () => {
  const s = PlanMove.create(), b = board();
  b.items.forEach(i => { i.gate = null; });
  const done = s.run(gateIntent(), {setGate: async () => ({ok: false, error: {code: 'FIELD_MISSING', message: 'no Gate field'}})});
  assert.equal(s.view(b, epics).items.find(i => i.number === 11).gate, 'R3 Human review');
  const r = await done;
  assert.equal(r.status, 'failed');
  assert.equal(s.view(b, epics).items.find(i => i.number === 11).gate, null);
  assert.match(PlanMove.reason(r.error, 'en'), /does not exist on GitHub yet/);
});

test('the set-gate command parses back with --gate and --expect', () => {
  const tokens = PlanMove.argv(gateIntent({gate: 'R4 Verified on Dev', expect: 'R3 Human review'}), true);
  const parsed = parseArgs(plain(tokens));
  assert.deepEqual([parsed.command, parsed.issues, parsed.gate, parsed.expect, parsed.apply], ['set-gate', [`${ORG}/ORISO-Frontend#11`], 'R4 Verified on Dev', 'R3 Human review', true]);
  assert.match(PlanMove.command(gateIntent({gate: 'R4 Verified on Dev'})), /--gate 'R4 Verified on Dev'/);
});

test('every error code the planning API can return has a reason in the UI', async () => {
  const {ERROR_CODES} = await import('../../../../planning-map/lib/planning-api.mjs');
  for (const code of ERROR_CODES) assert.ok(code in PlanMove.REASONS || code === 'BAD_REQUEST', code);
});

// ───── per-issue expectations and displaced sub-issues (review of #210) ─────
test('multi-epic intents carry one expectation per issue, and plan.mjs parses them back', () => {
  const i = intent({expect: undefined, release: 'v2.0.13', issues: [
    {repository: `${ORG}/ORISO-Frontend`, number: 10, expect: 'v2.0.12'}, {repository: `${ORG}/ORISO-Admin`, number: 5, expect: null}, {repository: `${ORG}/ORISO-Admin`, number: 6}]});
  delete i.expect;
  const cmd = PlanMove.command(i, false);
  const rest = cmd.slice('node tools/planning-map/plan.mjs '.length);
  const tokens = execFileSync('sh', ['-c', 'printf "%s\\n" ' + rest], {encoding: 'utf8'}).trimEnd().split('\n');
  const parsed = parseArgs(tokens);
  assert.deepEqual(parsed.issues, [`${ORG}/ORISO-Frontend#10`, `${ORG}/ORISO-Admin#5`, `${ORG}/ORISO-Admin#6`]);
  assert.deepEqual(parsed.expects, {[`${ORG}/ORISO-Frontend#10`]: 'v2.0.12', [`${ORG}/ORISO-Admin#5`]: null});
  assert.equal(parsed.expect, undefined);
});

test('otherRelease lists the sub-issues of a move that sit in another release now (from the synced board)', () => {
  const b = board(); b.items.find(x => x.number === 11).platformRelease = 'v2.0.14';
  const i = intent({withSubIssues: true, release: 'v2.0.13'});
  assert.deepEqual(plain(PlanMove.otherRelease(b, epics, i)), [{issue: `${ORG}/ORISO-Frontend#11`, before: 'v2.0.14'}, {issue: `${ORG}/ORISO-Admin#5`, before: 'v2.0.12'}]);
  assert.deepEqual(plain(PlanMove.otherRelease(b, epics, intent({withSubIssues: false}))), [], 'the epic itself is not "displaced"');
  assert.deepEqual(plain(PlanMove.otherRelease(b, epics, intent({withSubIssues: true, release: 'v2.0.12'}))), [{issue: `${ORG}/ORISO-Frontend#11`, before: 'v2.0.14'}]);
});

test('run keeps otherRelease on the intent; a confirming transport answer replaces it with what GitHub saw', async () => {
  const s = PlanMove.create();
  const x = await s.run({...intent(), otherRelease: [{issue: 'a#1', before: 'v1'}]}, null);
  assert.deepEqual(plain(x.otherRelease), [{issue: 'a#1', before: 'v1'}]);
  const y = await s.run({...intent(), otherRelease: []}, {assignRelease: async () => ({ok: true, otherRelease: [{issue: 'b#2', before: 'v9'}]})});
  assert.deepEqual(plain(y.otherRelease), [{issue: 'b#2', before: 'v9'}]);
});
