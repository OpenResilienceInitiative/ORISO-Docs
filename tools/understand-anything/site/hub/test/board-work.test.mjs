// Branch and PR sums behind the badges on task and epic cards (ORISO-Docs#215).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/board-agg.js', import.meta.url), 'utf8'), sandbox);
const plain = v => JSON.parse(JSON.stringify(v));
const workIndex = (b, e) => plain(sandbox.BoardAgg.workIndex(b, e));

const R = 'OpenResilienceInitiative/ORISO-Frontend';
const epics = {repos: ['ORISO-Frontend', 'ORISO-Admin'], epics: [{r: 0, n: 10, t: 'E', b: 'chat', subs: [[1, 900, 'Via sub list', 'o']]}, {r: 0, n: 20, t: 'Empty', b: 'chat', subs: []}]};
const br = (name, source = 'linked', prs = [], repository = R) => ({name, repository, source, lastCommitDate: '2026-10-20T10:00:00Z', url: 'https://github.com/' + repository + '/tree/' + name, prs});
const pr = (number, state = 'OPEN', branch = null) => ({number, repository: R, title: 'PR ' + number, url: 'https://github.com/' + R + '/pull/' + number, state, isDraft: false, checks: 'SUCCESS', reviewDecision: null, updatedAt: '2026-10-21T10:00:00Z', branch});
const item = (number, work, over = {}) => ({contentType: 'Issue', repository: over.repository || R, number, title: 'T' + number, url: 'https://github.com/' + (over.repository || R) + '/issues/' + number, parent: null, ...over, ...(work ? {work} : {})});
const w = (branches = [], prs = [], hidden = 0) => ({branches, prs, hidden});

const board = () => ({items: [
  item(10, w([br('feat/10-a')], [pr(1, 'OPEN', 'feat/10-a')])),
  item(11, w([br('feat/11-a', 'pr', [2]), br('feat/11-b', 'name'), br('feat/10-a', 'name')], [pr(2), pr(3, 'MERGED')], 1), {parent: {repository: R, number: 10}}),
  item(12, w(), {parent: {repository: R, number: 10}}),
  item(900, w([br('fix/900-x', 'linked', [], 'OpenResilienceInitiative/ORISO-Admin')]), {repository: 'OpenResilienceInitiative/ORISO-Admin'}),
  item(5, w([br('feat/5')])),
]});

test('a task sums its distinct branches and counts only open PRs', () => {
  const idx = workIndex(board(), epics);
  assert.deepEqual([idx.byItem['ORISO-Frontend#11'].branches, idx.byItem['ORISO-Frontend#11'].prs, idx.byItem['ORISO-Frontend#11'].hidden], [3, 1, 1]);
  assert.equal(idx.byItem['ORISO-Frontend#11'].prList.length, 2); // the merged one is listed, not counted
});

test('an epic sums its own work, its children and its sub-issue list; a branch shared by two issues counts once', () => {
  const e = workIndex(board(), epics).byEpic[0];
  // feat/10-a (epic, and again by name on #11), feat/11-a, feat/11-b, fix/900-x
  assert.deepEqual([e.branches, e.prs, e.hidden], [4, 2, 1]);
  assert.deepEqual(e.issues.map(i => i.number), [10, 11, 900]); // #12 has nothing, #5 is not part of the epic
  assert.equal(e.issues[0].repository, 'ORISO-Frontend');
});

test('an epic without work has zero sums; the index is null for a board exported before #215', () => {
  assert.deepEqual(workIndex(board(), epics).byEpic[1], {branches: 0, prs: 0, hidden: 0, issues: []});
  const old = board(); old.items.forEach(i => { delete i.work; });
  assert.equal(sandbox.BoardAgg.workIndex(old, epics), null);
  assert.equal(sandbox.BoardAgg.workIndex(null, epics), null);
});

test('pull request board items and issues without work data never get a summary', () => {
  const b = board(); b.items.push({contentType: 'PullRequest', repository: R, number: 99, title: 'x', url: null, parent: null});
  const idx = workIndex(b, epics);
  assert.equal(idx.byItem['ORISO-Frontend#99'], undefined);
  assert.deepEqual(Object.keys(idx.byItem).sort(), ['ORISO-Admin#900', 'ORISO-Frontend#10', 'ORISO-Frontend#11', 'ORISO-Frontend#12', 'ORISO-Frontend#5']);
});
