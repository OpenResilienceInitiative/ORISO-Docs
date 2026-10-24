// Job states behind the badges, the Jobs filter and the pop-up block (ORISO-Docs#216). Pure functions of map/jobs.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/jobs.js', import.meta.url), 'utf8'), sandbox);
const J = sandbox.MapJobs;
const plain = v => JSON.parse(JSON.stringify(v));

const R = 'OpenResilienceInitiative/ORISO-Frontend';
const epics = {repos: ['ORISO-Frontend', 'ORISO-Admin'], epics: [{r: 0, n: 10, t: 'E', b: 'chat', subs: [[1, 900, 'Via sub list', 'o']]}, {r: 0, n: 20, t: 'Empty', b: 'chat', subs: []}]};
const job = (state, over = {}) => ({state, runner: 'local', machine: 'mac-frank', started: '2026-10-24T08:00:00Z', updated: '2026-10-24T09:30:00Z', model: 'claude-opus-5-5', branches: ['feat/10-a'], prs: ['#5'], next: 'run the tests', report: 'https://github.com/o/r/pull/5', ...over});
const stale = {rule: 'job-stale', severity: 'warn', detail: {hours: 30, threshold: 24}};
const item = (number, j, over = {}) => ({contentType: 'Issue', repository: over.repository || R, number, title: 'T' + number, url: 'https://github.com/' + (over.repository || R) + '/issues/' + number, parent: null, findings: [], ...over, ...(j ? {job: j} : {})});
const board = () => ({items: [
  item(10, job('running')),
  item(11, job('running'), {parent: {repository: R, number: 10}, findings: [stale]}),
  item(12, job('waiting-human'), {parent: {repository: R, number: 10}}),
  item(13, job('stopped'), {parent: {repository: R, number: 10}}),
  item(14, job('done'), {parent: {repository: R, number: 10}}),
  item(15, job('failed'), {parent: {repository: R, number: 10}}),
  item(16, null, {parent: {repository: R, number: 10}}),
  item(900, job('running'), {repository: 'OpenResilienceInitiative/ORISO-Admin'}),
  item(5, job('stopped')),
]});

test('the index is null for a board without any job (exported before #216 or none running)', () => {
  const b = board(); b.items.forEach(i => { delete i.job; });
  assert.equal(J.index(b, epics), null);
  assert.equal(J.index(null, epics), null);
});

test('an item entry carries the job and the stale finding', () => {
  const idx = plain(J.index(board(), epics));
  assert.equal(idx.byItem['ORISO-Frontend#11'].job.state, 'running');
  assert.deepEqual(idx.byItem['ORISO-Frontend#11'].stale, {hours: 30, threshold: 24});
  assert.equal(idx.byItem['ORISO-Frontend#10'].stale, null);
  assert.equal(idx.byItem['ORISO-Frontend#16'], undefined);
});

test('an epic counts its own job, its children and its sub-issue list; stale is a subset of running', () => {
  const e = plain(J.index(board(), epics)).byEpic[0];
  assert.deepEqual([e.total, e.counts.running, e.counts['waiting-human'], e.counts.stopped, e.counts.done, e.counts.failed, e.stale], [7, 3, 1, 1, 1, 1, 1]);
  assert.deepEqual(e.issues.map(i => i.number), [10, 11, 12, 13, 14, 15, 900]); // #5 is not part of the epic, #16 has no job
  assert.equal(plain(J.index(board(), epics)).byEpic[1].total, 0);
});

test('filters: running includes stale ones, stale is only the stale ones', () => {
  const idx = J.index(board(), epics);
  const m = (f, n) => J.matches(f, idx.byItem['ORISO-Frontend#' + n]);
  assert.deepEqual([m('running', 10), m('running', 11), m('stale', 11), m('stale', 10), m('waiting-human', 12), m('stopped', 13), m('all', 10), m('running', 13)], [true, true, true, false, true, true, true, false]);
  assert.equal(J.matches('all', undefined), true);
  assert.equal(J.matches('running', undefined), false);
});

const ev = () => ({total: 8, groups: [
  {status: 'In progress', group: 'progress', token: 'x', count: 3, items: [{repository: 'ORISO-Frontend', number: 10}, {repository: 'ORISO-Frontend', number: 11}, {repository: 'ORISO-Frontend', number: 16}]},
  {status: 'Done', group: 'done', token: 'y', count: 2, items: [{repository: 'ORISO-Frontend', number: 14}, {repository: 'ORISO-Admin', number: 900}]},
]});

test('applyFilter keeps the matching items, drops empty groups and counts every filter over what is shown', () => {
  const idx = J.index(board(), epics);
  const r = plain(J.applyFilter(ev(), idx, 'running', 0));
  assert.equal(r.available, true);
  assert.deepEqual(r.ev.groups.map(g => [g.status, g.count, g.items.map(i => i.number)]), [['In progress', 2, [10, 11]], ['Done', 1, [900]]]);
  assert.deepEqual(r.counts, {all: 5, running: 3, stopped: 0, 'waiting-human': 0, stale: 1});
  const none = plain(J.applyFilter(ev(), idx, 'stopped', 0));
  assert.deepEqual(none.ev.groups, []);
  assert.equal(plain(J.applyFilter(ev(), idx, 'all', 0)).ev.groups.length, 2);
});

test('applyFilter: unknown filter means all; no jobs in the epic or no index means not available and nothing changes', () => {
  const idx = J.index(board(), epics);
  assert.equal(plain(J.applyFilter(ev(), idx, 'bogus', 0)).filter, 'all');
  const off = J.applyFilter(ev(), idx, 'running', 1);
  assert.deepEqual([off.available, off.filter, off.ev.groups.length], [false, 'all', 2]);
  assert.equal(J.applyFilter(ev(), null, 'running', 0).available, false);
});

test('badges: an item shows its state, an epic the sums; both open the work pop-up by the same ref; stale is named', () => {
  const idx = J.index(board(), epics);
  const b = J.badgeHTML(idx, 'item:ORISO-Frontend#11', 'en');
  assert.match(b, /^<button type="button" class="wkbadge jobbadge" data-work="item:ORISO-Frontend#11" data-job-state="running" data-job-stale="1"/);
  assert.match(b, />Job: running · stale</);
  assert.match(J.badgeHTML(idx, 'item:ORISO-Frontend#12', 'de'), />Job: wartet auf Mensch</);
  assert.match(J.badgeHTML(idx, 'epic:0', 'en'), />Jobs: 3 running · 1 stale · 1 waiting for a human · 1 stopped · 1 failed</);
  assert.equal(J.badgeHTML(idx, 'item:ORISO-Frontend#16', 'en'), '');
  assert.equal(J.badgeHTML(idx, 'epic:1', 'en'), '');
  assert.equal(J.badgeHTML(null, 'epic:0', 'en'), '');
  assert.equal(J.badgeHTML(idx, 'garbage', 'en'), '');
});

test('a finished epic job set is not a call for attention: the epic badge says done', () => {
  const b = board(); b.items.forEach(i => { if (i.job) i.job.state = 'done'; i.findings = []; });
  assert.match(J.badgeHTML(J.index(b, epics), 'epic:0', 'en'), />Jobs: 7 done</);
});

test('popup block: state, where, when, model, next, report link; texts are escaped, links need https', () => {
  const b = board();
  const x = b.items.find(i => i.number === 11);
  x.job.next = '<img src=x onerror=alert(1)>';
  x.job.machine = 'a&b';
  x.job.report = 'javascript:alert(1)';
  const html = J.popupHTML(J.index(b, epics), 'item:ORISO-Frontend#11', 'en');
  assert.ok(!/<img|href="javascript/.test(html));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /running/);
  assert.match(html, /stale: no update for 30 h \(limit 24 h\)/);
  assert.match(html, /local · a&amp;b/);
  assert.match(html, /2026-10-24 08:00 UTC/);
  assert.match(html, /2026-10-24 09:30 UTC/);
  assert.match(html, /claude-opus-5-5/);
  assert.ok(!/href=/.test(html), 'a non-https report is text, not a link');
  const ok = J.popupHTML(J.index(board(), epics), 'item:ORISO-Frontend#10', 'de');
  assert.match(ok, /<a href="https:\/\/github\.com\/o\/r\/pull\/5" target="_blank" rel="noopener">/);
  assert.match(ok, /läuft/);
  assert.match(ok, /Nächster Schritt/);
});

test('popup for an epic lists every job with its issue; stub makes a pop-up possible for a job without branches', () => {
  const idx = J.index(board(), epics);
  const html = J.popupHTML(idx, 'epic:0', 'en');
  assert.equal((html.match(/class="jobcard"/g) || []).length, 7);
  assert.match(html, /<a href="https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Admin\/issues\/900"[^>]*>T900<\/a>/);
  assert.deepEqual(plain(J.stub(idx, 'item:ORISO-Frontend#12')), {kind: 'item', branches: 0, prs: 0, hidden: 0, issues: [], title: '#12 T12'});
  assert.deepEqual(plain(J.stub(idx, 'epic:0')).kind, 'epic');
  assert.equal(J.stub(idx, 'item:ORISO-Frontend#16'), null);
  assert.equal(J.stub(null, 'item:ORISO-Frontend#12'), null);
});

test('filter chips: one per filter with counts and a pressed state; hidden when the epic has no job', () => {
  const idx = J.index(board(), epics);
  const r = J.applyFilter(ev(), idx, 'stale', 0);
  const html = J.filterHTML(r, 'en');
  assert.equal((html.match(/data-jfilter="/g) || []).length, 5);
  assert.match(html, /data-jfilter="stale" aria-pressed="true"/);
  assert.match(html, /data-jfilter="running" aria-pressed="false"/);
  assert.match(html, /waiting for a human/);
  assert.equal(J.filterHTML(J.applyFilter(ev(), idx, 'all', 1), 'en'), '');
});

test('page contract: jobs.js loads before map.js, is published, and uses no inline style, network or eval', () => {
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const page = read('map/index.html'), src = read('map/jobs.js'), pub = read('publication.mjs');
  assert.ok(page.indexOf('/map/jobs.js') > 0 && page.indexOf('/map/jobs.js') < page.indexOf('/map/map.js'));
  assert.match(pub, /jobs\\\.js/); // allowed pattern
  assert.match(pub, /'map\/jobs\.js'/); // static input
  assert.match(pub, /tools\/planning-map\/lib\/job\.mjs/); // producer input of the exporter
  assert.ok(!/style\s*=|\.style\b|eval\(|new Function|fetch\(|XMLHttpRequest|api\.github\.com/.test(src));
});
