// Aggregation behind the status bars on the map (ORISO-Docs#205): board.json + epics mapping -> per capability.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateBoard} from '../../../../planning-map/lib/board.mjs';

// Run it as a classic script, exactly like the browser does (the package is type: module).
const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/board-agg.js', import.meta.url), 'utf8'), sandbox);
const raw = sandbox.BoardAgg;
// JSON round trip drops the foreign-realm prototypes so deepStrictEqual compares plain data.
const BoardAgg = {STATUSES: [...raw.STATUSES], aggregate: (b, e) => JSON.parse(JSON.stringify(raw.aggregate(b, e)))};
const fx = n => JSON.parse(readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8'));
const board = fx('board.json'), epics = fx('map-data/epics.json').epics;
// The sub-issue list of the epic carries #900 (Admin); the shared map fixture has none, so add it here.
epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']];

test('the fixture is a valid board.json (schema v1)', () => {
  assert.deepEqual(validateBoard(board), []);
});

test('issues map to a capability through the epics: the epic itself, its parent link and its sub-issue list', () => {
  const agg = BoardAgg.aggregate(board, epics);
  assert.deepEqual(Object.keys(agg.blocks), ['chat']);
  assert.equal(agg.blocks.chat.total, 10); // 1734 + 8 children + #900 from subs; PR and unmapped #5 excluded
  assert.equal(agg.unmapped, 1);
  assert.equal(agg.ignored, 1); // the pull request
});

test('status counts and bar shares follow the board order and sum to 100', () => {
  const b = BoardAgg.aggregate(board, epics).blocks.chat;
  assert.deepEqual(b.counts, {'Backlog': 1, 'Ready': 1, 'On hold': 1, 'In progress': 2, 'In review': 1, 'QA internal': 1, 'QA external': 1, 'Done': 2});
  assert.deepEqual(b.segments.map(s => s.status), BoardAgg.STATUSES);
  assert.deepEqual(b.segments.map(s => s.share), [10, 10, 10, 20, 10, 10, 10, 20]);
  assert.deepEqual(b.segments.map(s => s.group), ['neutral', 'neutral', 'neutral', 'progress', 'progress', 'qa-internal', 'qa-external', 'done']);
  assert.equal(b.segments.reduce((a, s) => a + s.share, 0), 100);
});

test('Urgent and High are counted separately and together', () => {
  const b = BoardAgg.aggregate(board, epics).blocks.chat;
  assert.deepEqual(b.priority, {urgent: 3, high: 2, urgentHigh: 5});
});

test('readiness: average over scored issues, raw max of the board, unscored count (zero is a score)', () => {
  const agg = BoardAgg.aggregate(board, epics), b = agg.blocks.chat;
  assert.equal(agg.readinessMax, 19);
  assert.deepEqual(b.readiness, {avg: 7.6, scored: 8, unscored: 2, max: 19});
  // (8+4+0+12+6+10+19+2)/8 = 7.625 -> one decimal, rounded half up
});

test('an empty or missing board gives no blocks, never throws', () => {
  assert.deepEqual(BoardAgg.aggregate(null, epics).blocks, {});
  assert.deepEqual(BoardAgg.aggregate({items: []}, epics).blocks, {});
});

test('a block with only unscored issues has no average', () => {
  const only = {items: [{contentType: 'Issue', repository: 'o/ORISO-Frontend', number: 1734, status: 'Done', readiness: null, priority: null, parent: null}]};
  const b = BoardAgg.aggregate(only, epics).blocks.chat;
  assert.deepEqual(b.readiness, {avg: null, scored: 0, unscored: 1, max: 0});
});

test('items without a status are counted in the total but not in the bar', () => {
  const x = {items: [
    {contentType: 'Issue', repository: 'o/ORISO-Frontend', number: 1734, status: null, readiness: null, priority: null, parent: null},
    {contentType: 'Issue', repository: 'o/ORISO-Frontend', number: 1, status: 'Done', readiness: null, priority: null, parent: {repository: 'o/ORISO-Frontend', number: 1734}}]};
  const b = BoardAgg.aggregate(x, epics).blocks.chat;
  assert.equal(b.total, 2); assert.equal(b.noStatus, 1);
  assert.equal(b.segments.find(s => s.status === 'Done').share, 100);
});

test('findings from the export are rolled up per capability: total, per rule and the flagged issues', () => {
  const f = BoardAgg.aggregate(board, epics).blocks.chat.findings;
  assert.equal(f.total, 2);
  assert.deepEqual(f.byRule, {'stalled': 1, 'qa-external-no-bjoern': 1});
  assert.deepEqual(f.items.map(i => [i.number, i.rules]), [[1805, ['stalled']], [1806, ['qa-external-no-bjoern']]]);
  assert.equal(f.items[0].details.stalled.days, 30);
  assert.ok(f.items[0].title && f.items[0].url);
});

test('a block whose issues carry no findings (or a board without the field) reports zero', () => {
  const old = JSON.parse(JSON.stringify(board));
  old.items.forEach(i => { delete i.findings; });
  const f = BoardAgg.aggregate(old, epics).blocks.chat.findings;
  assert.deepEqual(f, {total: 0, byRule: {}, items: []});
});

// ───────── Epic side view (ORISO-Docs#206): sub-issues of one epic by board status, filters, private counts ─────────
const view = (extra = {}, filter) => {
  const e = JSON.parse(JSON.stringify(epics));
  Object.assign(e.epics[0], extra);
  return JSON.parse(JSON.stringify(sandbox.BoardAgg.epicView(board, e, 0, filter)));
};

test('epicView lists the sub-issues of one epic grouped by board status, in board order, without the epic itself', () => {
  const v = view();
  assert.equal(v.total, 9); // 8 children via parent link + #900 via the sub-issue list; the epic, the PR and #5 are not sub-issues
  assert.deepEqual(v.groups.map(g => [g.status, g.items.map(i => i.number)]), [
    ['Backlog', [1801]], ['Ready', [1802]], ['On hold', [1803]], ['In progress', [900]], ['In review', [1804]],
    ['QA internal', [1805]], ['QA external', [1806]], ['Done', [1807, 1808]]
  ]);
  assert.deepEqual(v.epic, {repository: 'ORISO-Frontend', number: 1734, title: 'Shared waiting room', url: 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1734'});
});

test('the stacked status bar of the epic counts sub-issues only and its shares sum to 100', () => {
  const v = view();
  assert.deepEqual(v.segments.map(s => [s.status, s.count]), [['Backlog', 1], ['Ready', 1], ['On hold', 1], ['In progress', 1], ['In review', 1], ['QA internal', 1], ['QA external', 1], ['Done', 2]]);
  assert.equal(Math.round(v.segments.reduce((a, s) => a + s.share, 0)), 100);
  assert.equal(v.segments.find(s => s.status === 'Done').group, 'done');
});

test('every item links to GitHub, built from repository and number when the export has no url', () => {
  const items = view().groups.flatMap(g => g.items);
  assert.equal(items.find(i => i.number === 1805).url, 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/1805');
  assert.equal(items.find(i => i.number === 900).url, 'https://github.com/OpenResilienceInitiative/ORISO-Admin/issues/900');
  assert.ok(items.every(i => /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-[A-Za-z]+\/issues\/\d+$/.test(i.url)));
});

test('filters: accepted = Done, dev = QA internal, staging = QA external, open = everything not accepted', () => {
  const nums = f => view({}, f).groups.flatMap(g => g.items.map(i => i.number)).sort((a, b) => a - b);
  assert.deepEqual(nums('accepted'), [1807, 1808]);
  assert.deepEqual(nums('dev'), [1805]);
  assert.deepEqual(nums('staging'), [1806]);
  assert.deepEqual(nums('open'), [900, 1801, 1802, 1803, 1804, 1805, 1806]);
  assert.equal(nums('all').length, 9);
  assert.equal(nums('nonsense').length, 9); // unknown filter falls back to all
});

test('filter chips carry the unfiltered counts and the bar does not change with the filter', () => {
  const v = view({}, 'dev');
  assert.deepEqual(v.filterCounts, {all: 9, accepted: 2, dev: 1, staging: 1, open: 7});
  assert.equal(v.filter, 'dev');
  assert.deepEqual(v.segments, view().segments);
});

test('sub-issues missing from the board stay visible as "not on the board" and count as open unless closed', () => {
  const v = view({subs: [[1, 900, 'Mapped through the epic sub-issue list', 'o'], [1, 777, 'Not on the board yet', 'o'], [0, 778, 'Closed, not on the board', 'c']]});
  const g = v.groups.find(g => g.status === null);
  assert.deepEqual(g.items.map(i => [i.number, i.state]), [[777, 'OPEN'], [778, 'CLOSED']]);
  assert.equal(v.total, 11);
  assert.equal(v.filterCounts.open, 8);
  assert.equal(v.segments.reduce((a, s) => a + s.count, 0), 9); // the bar shows board statuses only
});

test('private sub-issues are only a count: epics hid, no titles, no urls', () => {
  const v = view({hid: 3});
  assert.equal(v.privateCount, 3);
  assert.equal(v.total, 9); // not mixed into the visible list
  assert.equal(view().privateCount, 0);
  assert.equal(JSON.stringify(v).includes('E2E'), false);
});

test('epicView is null for an unknown epic or without board data', () => {
  assert.equal(sandbox.BoardAgg.epicView(board, epics, 5), null);
  assert.equal(sandbox.BoardAgg.epicView(null, epics, 0), null);
});
