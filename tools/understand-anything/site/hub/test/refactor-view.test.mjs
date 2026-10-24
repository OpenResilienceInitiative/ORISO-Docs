// Health view: refactoring marker per square and the "Refactoring" section of the panel (ORISO-Docs#222). views.js runs like in the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const plain = v => JSON.parse(JSON.stringify(v));
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const slug = id => ({chat: 'chat', mailadmin: 'email-templates'}[id] || (id === 'base' ? 'shared' : null));
const GH = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/';
const it = (number, state, over = {}) => ({repository: 'ORISO-Docs', number, title: 'Refactor ' + number, url: GH + number, state, status: state === 'done' ? 'Done' : state === 'running' ? 'In progress' : 'Ready', scope: 'chat', ...over});
const slot = items => ({planned: items.filter(i => i.state === 'planned').length, running: items.filter(i => i.state === 'running').length, done: items.filter(i => i.state === 'done').length, total: items.length, items});
const index = (bySlug = {}, byBlock = {}) => ({bySlug, byBlock, unmapped: 0});
const set = (idx) => MapViews.setRefactoring(idx, slug);
const marker = (id = 'chat', lang = 'en') => plain(MapViews.VIEWS.health.refactor({id}, lang));
const panel = (id = 'chat', lang = 'en', node = 'capability:chat') => MapViews.VIEWS.health.panel({id}, lang, node);

test('the marker names the state in words: running beats planned beats done', () => {
  set(index({chat: slot([it(1, 'done'), it(2, 'planned'), it(3, 'running')])}));
  assert.deepEqual(marker(), {state: 'running', word: 'running', text: 'Refactoring: running (3)'});
  set(index({chat: slot([it(1, 'done'), it(2, 'planned')])}));
  assert.deepEqual(marker(), {state: 'planned', word: 'planned', text: 'Refactoring: planned (2)'});
  set(index({chat: slot([it(1, 'done')])}));
  assert.deepEqual(marker(), {state: 'done', word: 'done', text: 'Refactoring: done'});
  set(index({chat: slot([it(1, 'planned')])}));
  assert.equal(marker().text, 'Refactoring: planned');
});

test('German words', () => {
  set(index({chat: slot([it(1, 'planned')])}));
  assert.equal(marker('chat', 'de').text, 'Refactoring: geplant');
  set(index({chat: slot([it(1, 'running')])}));
  assert.equal(marker('chat', 'de').text, 'Refactoring: läuft');
  set(index({chat: slot([it(1, 'done')])}));
  assert.equal(marker('chat', 'de').text, 'Refactoring: erledigt');
});

test('no marker without data: no board, no task for this square, a square without a capability', () => {
  set(null);
  assert.equal(MapViews.VIEWS.health.refactor({id: 'chat'}, 'en'), null);
  set(index({}));
  assert.equal(MapViews.VIEWS.health.refactor({id: 'chat'}, 'en'), null);
  set(index({chat: slot([it(1, 'planned')])}));
  assert.equal(MapViews.VIEWS.health.refactor({id: 'nowhere'}, 'en'), null);
  assert.equal(MapViews.VIEWS.health.refactor(null, 'en'), null);
});

test('tasks found by the epic mapping (byBlock) and by their scope (bySlug) add up on one square', () => {
  set(index({chat: slot([it(1, 'planned')])}, {chat: slot([it(2, 'running')])}));
  assert.equal(marker().text, 'Refactoring: running (2)');
  assert.deepEqual([...panel().matchAll(/data-rf-task="(\d+)"/g)].map(m => m[1]).sort(), ['1', '2']);
});

test('the shared square uses the capability "shared"', () => {
  set(index({shared: slot([it(9, 'planned', {scope: 'shared'})])}));
  assert.equal(marker('base').text, 'Refactoring: planned');
});

test('the panel lists the tasks with state words, status and GitHub links, and counts the three states', () => {
  set(index({chat: slot([it(1, 'planned'), it(2, 'running'), it(3, 'done')])}));
  const h = panel(), t = text(h);
  assert.match(t, /Refactoring/);
  assert.match(t, /planned 1/); assert.match(t, /running 1/); assert.match(t, /done 1/);
  for (const n of [1, 2, 3]) {
    const li = new RegExp('<li[^>]*data-rf-task="' + n + '"[^>]*>(.*?)</li>').exec(h)[1];
    assert.match(li, new RegExp('<a [^>]*href="' + GH + n + '"[^>]*rel="noopener noreferrer"'));
    assert.match(li, /target="_blank"/);
    assert.match(text(li), /ORISO-Docs #\d Refactor \d/);
  }
  assert.match(text(/data-rf-task="2".*?<\/li>/.exec(h)[0]), /running/);
  assert.match(text(/data-rf-task="2".*?<\/li>/.exec(h)[0]), /In progress/);
  assert.match(text(/data-rf-task="1".*?<\/li>/.exec(h)[0]), /planned/);
});

test('links pass the https guard: other hosts, other organisations, http and javascript: stay plain text', () => {
  const bad = ['http://github.com/OpenResilienceInitiative/ORISO-Docs/issues/1', 'https://evil.example/OpenResilienceInitiative/ORISO-Docs/issues/1', 'https://github.com/Other/ORISO-Docs/issues/1',
    'javascript:alert(1)', 'https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/1', 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/1" onmouseover="x', null];
  set(index({chat: slot(bad.map((url, i) => it(i + 1, 'planned', {url})))}));
  const h = panel();
  assert.doesNotMatch(h, /href="(?!https:\/\/github\.com\/OpenResilienceInitiative\/)/);
  assert.equal([...h.matchAll(/<a [^>]*data-rf-link/g)].length, 0);
  assert.equal([...h.matchAll(/data-rf-task=/g)].length, bad.length, 'the tasks are still listed');
});

test('everything from the board is escaped', () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  set(index({chat: slot([it(1, 'planned', {title: evil, repository: evil, status: evil})])}));
  const h = panel();
  assert.doesNotMatch(h, /<img|<script/i);
  assert.match(h, /&lt;img/);
});

test('no board data: the section says the state is unknown instead of showing zeros, and still offers the command', () => {
  set(null);
  const h = panel(), t = text(h);
  assert.match(t, /Board not synced/);
  assert.doesNotMatch(t, /planned 0/);
  assert.match(h, /data-rf-cmd/);
});

test('board without a task for this square: "none yet" and the command', () => {
  set(index({}));
  assert.match(text(panel()), /No refactoring task yet/);
  assert.match(text(panel('chat', 'de')), /Noch keine Refactoring-Aufgabe/);
});

test('the command is the exact propose-refactor call for the scope; a dry run unless --apply is said so', () => {
  set(index({}));
  const cmd = h => text(/<code[^>]*data-rf-cmd[^>]*>(.*?)<\/code>/.exec(h)[1]);
  assert.equal(cmd(panel()), 'node tools/planning-map/plan.mjs propose-refactor --scope chat --epic <Org/Repo#n> [--apply]');
  assert.equal(cmd(panel('mailadmin', 'en', 'capability:email-templates')), 'node tools/planning-map/plan.mjs propose-refactor --scope email-templates --epic <Org/Repo#n> [--apply]');
  assert.match(text(panel()), /dry run/i);
  assert.match(text(panel('chat', 'de')), /Probelauf/);
});

test('with a health run for the square the command carries its scope and its record file', () => {
  const SHA = 'a'.repeat(40);
  const rec = (path) => ({schemaVersion: 1, run: {schemaVersion: 1, runId: '20261024T101500Z-aaaaaaaa', generatedAt: '2026-10-24T10:15:00Z', commits: {'ORISO-Frontend': SHA}}, scope: {capability: 'chat', repo: 'ORISO-Frontend', path}, commit: SHA,
    criteriaVersion: 'b'.repeat(64), model: null, startedAt: '2026-10-24T10:15:00Z', metrics: [], verdict: [], overall: 55, links: {graphNode: 'capability:chat', source: `https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${SHA}`},
    file: 'health/runs/chat/ORISO-Frontend/20261024T101500Z.json'}); // health.json carries the record path (buildHealthDoc)
  MapViews.setHealth({schemaVersion: 1, records: [rec(null)]}, slug);
  set(index({}));
  const cmd = h => text(/<code[^>]*data-rf-cmd[^>]*>(.*?)<\/code>/.exec(h)[1]);
  assert.equal(cmd(panel()), 'node tools/planning-map/plan.mjs propose-refactor --scope chat:ORISO-Frontend --record health/runs/chat/ORISO-Frontend/20261024T101500Z.json --epic <Org/Repo#n> [--apply]');
  MapViews.setHealth(null, slug);
});

test('the section is its own function: the criteria box, run panel and steering section are still there', () => {
  set(index({chat: slot([it(1, 'planned')])}));
  const h = panel();
  assert.match(h, /class="steer"/);
  assert.match(h, /data-health|hno|hrun/);
  assert.equal([...h.matchAll(/data-refactor/g)].length, 1);
});

test('a hand-edited index cannot break the page: wrong shapes are ignored', () => {
  for (const bad of [{bySlug: {chat: {items: 'x'}}}, {bySlug: {chat: null}, byBlock: 3}, 'x', 7, []]) {
    set(bad);
    assert.doesNotThrow(() => panel());
    assert.equal(MapViews.VIEWS.health.refactor({id: 'chat'}, 'en'), null);
  }
});

// ORISO-Docs#213 review (finding 11): a dropped task is named as a word, never shown as done.
test('a dropped task shows the word "dropped" (DE "verworfen") and is not counted as done', () => {
  const items = [it(1, 'dropped'), it(2, 'done')];
  set(index({chat: {...slot(items), dropped: 1}}));
  const h = panel();
  assert.match(h, /data-rf-task="1" data-rf-state="dropped"><span class="rfx-s" data-rf-word>dropped</);
  assert.match(text(h), /done 1/);
  assert.match(text(h), /dropped 1/);
  assert.match(text(panel('chat', 'de')), /verworfen/);
  set(index({chat: {...slot([it(3, 'dropped')]), dropped: 1}}));
  assert.equal(marker().state, 'dropped');
  assert.match(marker().text, /dropped/);
  set(null);
});

// ORISO-Docs#213 review (finding 16): the propose-refactor command uses the record path health.json carries (records[].file).
test('the propose-refactor command uses the record file from health.json, not a path rebuilt on the page', () => {
  const rec = {schemaVersion: 1, run: {runId: 'r1'}, scope: {capability: 'chat', repo: 'ORISO-Frontend', path: 'src/chat'}, commit: 'a'.repeat(40), startedAt: '2026-10-24T10:15:00Z',
    overall: 50, metrics: [], verdict: [], links: {graphNode: 'ORISO-Frontend::folder:src/chat', source: null}, file: 'health/runs/chat/ORISO-Frontend/at/src/chat/20261024T101500Z.json'};
  rec.scope.path = null; rec.links.graphNode = 'capability:chat'; rec.file = 'health/runs/chat/ORISO-Frontend/20261024T101500Z.json';
  MapViews.setHealth({schemaVersion: 1, records: [rec]}, slug);
  set(index({chat: slot([it(1, 'planned')])}));
  assert.match(panel(), /--record health\/runs\/chat\/ORISO-Frontend\/20261024T101500Z\.json/);
  MapViews.setHealth({schemaVersion: 1, records: [{...rec, file: 'health/runs/chat/ORISO-Frontend/OTHER.json'}]}, slug);
  assert.match(panel(), /--record health\/runs\/chat\/ORISO-Frontend\/OTHER\.json/, 'the file comes from the data, it is not recomputed');
  MapViews.setHealth({schemaVersion: 1, records: [{...rec, file: '../../etc/passwd'}]}, slug);
  assert.doesNotMatch(panel(), /--record/, 'a file outside health/runs is not used');
  MapViews.setHealth(null); set(null);
});
