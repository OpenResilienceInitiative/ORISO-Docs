// Refactoring tasks per capability and their state: planned / running / done (ORISO-Docs#222). Pure function of map/board-agg.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateBoard} from '../../../../planning-map/lib/board.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/board-agg.js', import.meta.url), 'utf8'), sandbox);
const BA = sandbox.BoardAgg;
const plain = v => JSON.parse(JSON.stringify(v));

const R = 'OpenResilienceInitiative/ORISO-Docs';
const F = 'OpenResilienceInitiative/ORISO-Frontend';
// Epic 10 maps to the block "chat"; epic 20 is a generic refactoring epic with no block.
const epics = {repos: ['ORISO-Frontend', 'ORISO-Docs'], epics: [{r: 0, n: 10, t: 'Chat', b: 'chat', subs: [[0, 11, 'Sub of chat', 'o']]}, {r: 1, n: 20, t: 'Refactoring', b: null, subs: []}]};
let n = 100;
const task = (status, over = {}) => ({
  id: 'PVTI_' + n, contentType: 'Issue', repository: R, number: n++, title: 'T' + (n - 1), url: `https://github.com/${R}/issues/${n - 1}`,
  state: 'OPEN', updatedAt: '2026-10-24T08:00:00Z', status, gate: null, readiness: null, issueType: 'Task', parent: {repository: R, number: 20},
  priority: null, effort: null, platformRelease: null, assignees: [], findings: [], refactor: {scope: 'email-templates:ORISO-Frontend:src/mails'}, ...over,
});
const board = items => ({items});

test('three states: planned is open and not started, running is in progress to QA internal, done is QA external, Done or closed', () => {
  const b = board([
    task('Backlog'), task('Ready'), task('On hold'), task(null),
    task('In progress'), task('In review'), task('QA internal'),
    task('QA external'), task('Done'), task('Backlog', {state: 'CLOSED'}), task('In progress', {state: 'CLOSED'}),
  ]);
  const r = plain(BA.refactoring(b, epics));
  const e = r.bySlug['email-templates'];
  assert.deepEqual([e.planned, e.running, e.done, e.total], [4, 3, 4, 11]);
  assert.deepEqual(e.items.map(i => i.state), ['planned', 'planned', 'planned', 'planned', 'running', 'running', 'running', 'done', 'done', 'done', 'done']);
});

test('the state of one issue is a pure function of status and open/closed', () => {
  const s = (status, state) => BA.refactorState({status, state: state || 'OPEN'});
  assert.deepEqual(['Backlog', 'Ready', 'On hold', null, 'In progress', 'In review', 'QA internal', 'QA external', 'Done'].map(x => s(x)),
    ['planned', 'planned', 'planned', 'planned', 'running', 'running', 'running', 'done', 'done']);
  assert.equal(s('Backlog', 'CLOSED'), 'done');
  assert.equal(s('In review', 'CLOSED'), 'done');
  assert.equal(s('Something new'), 'planned'); // an unknown status does not count as running or done
});

test('the scope in the task decides the capability, whatever epic the task sits in', () => {
  const b = board([task('Ready', {refactor: {scope: 'chat'}}), task('Ready', {refactor: {scope: 'email-templates:ORISO-Frontend'}})]);
  const r = plain(BA.refactoring(b, epics));
  assert.deepEqual(Object.keys(r.bySlug).sort(), ['chat', 'email-templates']);
  assert.deepEqual(r.byBlock, {});
});

test('without a scope the task goes through the existing capability mapping: epic, sub-issue list, parent', () => {
  const b = board([
    task('Ready', {refactor: {scope: null}, repository: F, number: 10, parent: null}), // the epic itself
    task('In progress', {refactor: {scope: null}, repository: F, number: 11, parent: null}), // listed sub-issue
    task('Done', {refactor: {scope: null}, repository: F, number: 12, parent: {repository: F, number: 10}}), // child of the epic
  ]);
  const r = plain(BA.refactoring(b, epics));
  assert.deepEqual([r.byBlock.chat.planned, r.byBlock.chat.running, r.byBlock.chat.done], [1, 1, 1]);
  assert.deepEqual(r.bySlug, {});
});

test('a task that maps nowhere is counted as unmapped, never guessed onto a square', () => {
  const r = plain(BA.refactoring(board([task('Ready', {refactor: {scope: null}})]), epics));
  assert.equal(r.unmapped, 1);
  assert.deepEqual([r.byBlock, r.bySlug], [{}, {}]);
});

test('only items with the refactoring category count; pull requests and plain tasks do not', () => {
  const plainTask = task('Ready'); delete plainTask.refactor;
  const pr = task('Ready', {contentType: 'PullRequest'});
  const r = plain(BA.refactoring(board([plainTask, pr]), epics));
  assert.deepEqual([r.bySlug, r.byBlock, r.unmapped], [{}, {}, 0]);
});

test('items carry what the panel needs: short repository, number, title, https url, state, status, scope', () => {
  const t = task('In review', {title: 'Refactor mails'});
  const [i] = plain(BA.refactoring(board([t]), epics)).bySlug['email-templates'].items;
  assert.deepEqual(i, {repository: 'ORISO-Docs', number: t.number, title: 'Refactor mails', url: t.url, state: 'running', status: 'In review', scope: 'email-templates:ORISO-Frontend:src/mails'});
});

test('an empty, missing or old board (no refactor field) gives an empty index, never throws', () => {
  for (const b of [null, undefined, {}, {items: []}, board([{contentType: 'Issue', repository: R, number: 1, status: 'Done'}])]) {
    const r = plain(BA.refactoring(b, epics));
    assert.deepEqual([r.byBlock, r.bySlug, r.unmapped], [{}, {}, 0]);
  }
  assert.deepEqual(plain(BA.refactoring(board([task('Ready')]), null).bySlug['email-templates'].planned), 1);
});

test('the label name of the category equals the one pinned in the board contract', () => {
  const contract = JSON.parse(readFileSync(new URL('../../../../planning-map/board-contract.json', import.meta.url), 'utf8'));
  assert.equal(BA.REFACTORING_LABEL, contract.categories.refactoring.name);
});

test('the shared fixture board stays valid with a refactoring item', () => {
  const b = JSON.parse(readFileSync(new URL('./fixtures/board.json', import.meta.url), 'utf8'));
  b.items.push({...b.items.find(x => x.contentType === 'Issue'), id: 'PVTI_refactor', number: 4242, refactor: {scope: 'chat:ORISO-Frontend:src/chat'}});
  assert.deepEqual(validateBoard(b), []);
  b.items.at(-1).refactor = {scope: 'Chat'};
  assert.notDeepEqual(validateBoard(b), []);
});
