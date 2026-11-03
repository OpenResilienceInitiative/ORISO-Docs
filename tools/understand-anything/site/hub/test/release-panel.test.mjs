// Milestone / release scope for the left panel of the map (ORISO-Docs#209): grouping, counts, effort, filter.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateMilestones} from '../../../../planning-map/lib/milestones.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/board-agg.js', import.meta.url), 'utf8'), sandbox);
const plain = v => JSON.parse(JSON.stringify(v));
const Agg = {EFFORT_DAYS: plain(sandbox.BoardAgg.EFFORT_DAYS), releases: (b, e) => plain(sandbox.BoardAgg.releases(b, e)),
  milestones: (c, r) => plain(sandbox.BoardAgg.milestones(c, r)), releaseCapabilities: (r, n) => plain(sandbox.BoardAgg.releaseCapabilities(r, n))};
const fx = n => JSON.parse(readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../../../../planning-map/milestones.json', import.meta.url), 'utf8'));
const epics = fx('map-data/epics.json').epics;
epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']];

// Fixture board with releases spread over its issues (the recorded one carries a single release).
const board = fx('board.json');
const rel = {1734: 'v2.0.12', 1801: 'v2.0.12', 1804: 'v2.0.12', 1806: 'v2.0.13', 900: 'v2.0.13', 5: 'v2.0.13', 1900: 'v2.0.13'};
board.items.forEach(i => { i.platformRelease = rel[i.number] || null; });

test('effort weights are S=2, M=4, L=8 person-days', () => {
  assert.deepEqual(Agg.EFFORT_DAYS, {S: 2, M: 4, L: 8});
});

test('a release counts its issues by status and by priority', () => {
  const r = Agg.releases(board, epics).byName['v2.0.12'];
  assert.equal(r.total, 3);
  assert.deepEqual(r.counts, {'In progress': 1, 'Backlog': 1, 'In review': 1});
  assert.deepEqual(r.priority, {Urgent: 1, High: 2, Medium: 0, Low: 0, none: 0});
});

test('a release carries bar segments in board order whose shares sum to 100; an empty one all zero', () => {
  const r = Agg.releases(board, epics).byName['v2.0.12'];
  assert.deepEqual(r.segments.map(g => g.status), [...sandbox.BoardAgg.STATUSES]);
  assert.deepEqual(r.segments.map(g => g.share), [33.33, 0, 0, 33.33, 33.33, 0, 0, 0]);
  const m = Agg.milestones({milestones: [{id: 'x', title: {de: 'X', en: 'X'}, releases: ['v9']}]}, Agg.releases(board, epics));
  assert.ok(m.milestones[0].releases[0].segments.every(g => g.share === 0));
  assert.equal(m.milestones[0].segments.length, 8);
});

test('a release sums effort in person-days and counts the unsized issues apart', () => {
  const r = Agg.releases(board, epics).byName['v2.0.12'];
  assert.deepEqual(r.effort, {S: 1, M: 1, L: 1, none: 0, days: 14}); // 2 + 4 + 8
  const r13 = Agg.releases(board, epics).byName['v2.0.13'];
  assert.deepEqual(r13.effort, {S: 3, M: 0, L: 0, none: 0, days: 6}); // pull request #1900 is not counted
});

test('pull requests are ignored and issues without a release belong to no release', () => {
  const all = Agg.releases(board, epics);
  assert.deepEqual(Object.keys(all.byName).sort(), ['v2.0.12', 'v2.0.13']);
  assert.equal(all.byName['v2.0.13'].total, 3);
  assert.equal(all.noRelease, 5); // 11 issues, 6 with a release
});

test('a release lists the capabilities its issues touch; unmapped issues touch none', () => {
  const all = Agg.releases(board, epics);
  assert.deepEqual(all.byName['v2.0.12'].capabilities, ['chat']);
  assert.deepEqual(all.byName['v2.0.13'].capabilities, ['chat']); // #1806 and #900 map to chat, #5 does not
  assert.equal(all.byName['v2.0.13'].unmapped, 1);
  assert.deepEqual(Agg.releaseCapabilities(all, 'v2.0.12'), ['chat']);
});

test('the filter for an unknown release or no release is empty, never throws', () => {
  const all = Agg.releases(board, epics);
  assert.deepEqual(Agg.releaseCapabilities(all, 'v9'), []);
  assert.deepEqual(Agg.releaseCapabilities(all, null), []);
  assert.deepEqual(Agg.releases(null, epics), {byName: {}, noRelease: 0});
});

test('milestones keep the configured order and list their releases in the configured order', () => {
  const m = Agg.milestones({milestones: [
    {id: 'b', title: {de: 'B', en: 'B'}, releases: ['v2.0.13', 'v2.0.12']},
    {id: 'a', title: {de: 'A', en: 'A'}, releases: []}]}, Agg.releases(board, epics));
  assert.deepEqual(m.milestones.map(x => x.id), ['b', 'a']);
  assert.deepEqual(m.milestones[0].releases.map(r => r.name), ['v2.0.13', 'v2.0.12']);
  assert.equal(m.milestones[0].total, 6);
  assert.equal(m.milestones[0].effort.days, 20);
  assert.deepEqual(m.milestones[0].capabilities, ['chat']);
  assert.equal(m.milestones[1].total, 0);
});

test('a configured release the board does not know yet shows as empty; an unconfigured one is listed apart', () => {
  const m = Agg.milestones({milestones: [{id: 'x', title: {de: 'X', en: 'X'}, releases: ['v2.0.12', 'v3.0.0']}]}, Agg.releases(board, epics));
  const empty = m.milestones[0].releases[1];
  assert.deepEqual([empty.name, empty.total, empty.effort.days, empty.capabilities], ['v3.0.0', 0, 0, []]);
  assert.deepEqual(m.unlisted.map(r => r.name), ['v2.0.13']);
});

test('without a board every configured release is empty', () => {
  const m = Agg.milestones(config, Agg.releases(null, epics));
  assert.ok(m.milestones.length > 0);
  assert.ok(m.milestones.every(x => x.total === 0));
});

test('the reviewed config is valid and names every release of the board fixtures', () => {
  assert.deepEqual(validateMilestones(config), []);
  const names = new Set();
  for (const f of ['../../../../planning-map/fixtures/board.sample.json', './fixtures/board.json'])
    JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')).fieldOptions.platformRelease.forEach(n => names.add(n));
  const configured = new Set(config.milestones.flatMap(m => m.releases));
  for (const n of names) assert.ok(configured.has(n), n);
});

test('config validation rejects duplicates, missing titles and bad shapes', () => {
  const ok = {schemaVersion: 1, milestones: [{id: 'a', title: {de: 'A', en: 'A'}, releases: ['v1']}]};
  assert.deepEqual(validateMilestones(ok), []);
  assert.notDeepEqual(validateMilestones({...ok, schemaVersion: 2}), []);
  assert.match(validateMilestones({schemaVersion: 1, milestones: [ok.milestones[0], {...ok.milestones[0], id: 'b'}]}).join(), /v1.*twice/);
  assert.match(validateMilestones({schemaVersion: 1, milestones: [ok.milestones[0], {...ok.milestones[0]}]}).join(), /id.*twice/);
  assert.match(validateMilestones({schemaVersion: 1, milestones: [{id: 'a', title: {de: 'A'}, releases: []}]}).join(), /title/);
  assert.notDeepEqual(validateMilestones(null), []);
});
