// Health panel, "History" section: trend, list of past runs, "Compare with latest", links (ORISO-Docs#219).
// views.js is a classic script; this runs it like the browser does. The trend is built with DOM APIs, so the sandbox gets a small
// document shim (createElementNS, setAttribute, appendChild, textContent, outerHTML); the real DOM is exercised in map-history-render.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord, buildHealthDoc} from '../../../platform/lib/health-run.mjs';

const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function El(tag) { this.tag = tag; this.attrs = []; this.kids = []; this.text = null; }
El.prototype.setAttribute = function (k, v) { this.attrs.push([k, String(v)]); };
El.prototype.appendChild = function (c) { this.kids.push(c); return c; };
Object.defineProperty(El.prototype, 'textContent', {set(v) { this.text = String(v); }});
Object.defineProperty(El.prototype, 'outerHTML', {get() {
  return '<' + this.tag + this.attrs.map(([k, v]) => ' ' + k + '="' + escAttr(v) + '"').join('') + '>' +
    (this.text !== null ? this.text.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '') + this.kids.map(k => k.outerHTML).join('') + '</' + this.tag + '>';
}});
const sandbox = {document: {createElementNS: (ns, tag) => { assert.equal(ns, 'http://www.w3.org/2000/svg'); return new El(tag); }}}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const plain = x => JSON.parse(JSON.stringify(x));

const SHA1 = '1'.repeat(40), SHA2 = '2'.repeat(40), SHA3 = '3'.repeat(40);
const crit = resolveCriteria(validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
---
x`, 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS}), {capability: 'chat', path: 'ORISO-Frontend/'});
const m = value => ({value, source: 'test', details: {}});
function rec(at, [size, ratio, lint, dup], {commit, model = null, verdict = [], capability = 'chat', path = null} = {}) {
  return buildRunRecord({
    manifest: createRunManifest({at, commits: {'ORISO-Frontend': commit}}), scope: {capability, repo: 'ORISO-Frontend', path}, commit, effective: crit,
    measurements: {size: m(size), 'test-ratio': m(ratio), lint: m(lint), duplication: m(dup)}, model, startedAt: at, verdict,
  });
}
const OLD = rec('2026-05-01T08:00:00Z', [900, 0.25, 4, 2.5], {commit: SHA1});
const MID = rec('2026-08-01T08:00:00Z', [600, 0.3, 2, 2.5], {commit: SHA2, model: 'claude-test', verdict: [{criterion: 'maintainability', score: 40, weight: 1, reasons: ['Two 600 line files <b>mix</b> state.']}]});
const NEW = rec('2026-10-24T10:15:00Z', [300, 0.5, 0, 4], {commit: SHA3, model: 'claude-test', verdict: [{criterion: 'maintainability', score: 70, weight: 1, reasons: ['Split into small files.']}]});
const SLUG = {chat: 'chat', handover: 'case-handover'};
const load = (records, tweak = d => d) => MapViews.setHealth(plain(tweak(buildHealthDoc(records))), id => SLUG[id] || null);
const NODE = id => 'https://understand.oriso.org/supergraph/?token=t&node=' + encodeURIComponent(id);
MapViews.setNodeLink(NODE);
const panel = (lang = 'en', block = {id: 'chat'}) => MapViews.VIEWS.health.panel(block, lang, 'capability:' + (SLUG[block.id] || 'x'));
const hist = html => (/<section class="hhist"[\s\S]*?<\/section>/.exec(html) || [''])[0];
const items = html => [...html.matchAll(/<li class="hh-run[^"]*" data-run-start="([^"]+)"[\s\S]*?<\/li>(?=<li class="hh-run|<\/ol>)/g)].map(x => ({start: x[1], html: x[0]}));

test('the section lists every run of the scope, newest first, with date, model and overall', () => {
  load([OLD, MID, NEW]);
  const h = hist(panel('en'));
  assert.ok(h, 'history section present');
  assert.deepEqual(items(h).map(i => i.start), [NEW.startedAt, MID.startedAt, OLD.startedAt]);
  const first = items(h)[0].html;
  assert.match(first, /2026-10-24 10:15 UTC/); assert.match(first, /claude-test/); assert.match(first, new RegExp(String(NEW.overall)));
  assert.match(items(h)[2].html, /none \(metrics only\)/);
  assert.match(h, /3 runs/);
});

test('trend: one point per scored run, built from DOM nodes, no inline style, points carry the date and the score', () => {
  load([OLD, MID, NEW]);
  const h = hist(panel('en'));
  const svg = /<svg[\s\S]*<\/svg>/.exec(h)[0];
  assert.equal((svg.match(/<circle /g) || []).length, 3);
  assert.doesNotMatch(h, /\sstyle=/);
  assert.match(svg, /role="img"/);
  for (const r of [OLD, MID, NEW]) assert.match(svg, new RegExp(`data-start="${r.startedAt}"`));
  assert.match(svg, new RegExp(`<title>2026-10-24 10:15 UTC: ${NEW.overall}</title>`));
  assert.match(svg, /hh-b-(good|fair|weak|poor)/);
  assert.equal((svg.match(/<polyline /g) || []).length, 1, 'one connected line');
});

test('a run without a score is a gap in the line, not a zero', () => {
  load([OLD, MID, NEW], d => { d.history[0].runs[1].overall = null; return d; });
  const svg = /<svg[\s\S]*<\/svg>/.exec(hist(panel('en')))[0];
  assert.equal((svg.match(/<circle /g) || []).length, 2);
  assert.equal((svg.match(/<polyline /g) || []).length, 0, 'two single points do not form a line');
  assert.match(items(hist(panel('en')))[1].html, /no score/i);
});

test('every run links to its Understand node (?node=) and to GitHub at the run commit; https only', () => {
  load([OLD, NEW]);
  const h = hist(panel('en'));
  const [n, o] = items(h);
  assert.match(n.html, new RegExp('data-hh-node href="' + NODE('capability:chat').replace(/[?.]/g, '\\$&').replace(/&/g, '&amp;') + '"'));
  assert.match(n.html, new RegExp(`data-hh-source href="https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${SHA3}"`));
  assert.match(o.html, new RegExp(`/tree/${SHA1}"`), 'the OLD run points at its own commit, not at the latest');
  assert.match(n.html, /rel="noopener noreferrer"/);
  assert.match(n.html, /node=capability%3Achat/);
});

test('hostile or malformed history entries are dropped; a javascript: or foreign node link is never rendered', () => {
  load([OLD, NEW], d => {
    d.history[0].runs.push({...d.history[0].runs[0], startedAt: '2026-10-25T00:00:00Z', commit: 'zz"><script>1</script>'});
    d.history[0].runs.push({...d.history[0].runs[0], startedAt: '2026-10-26T00:00:00Z', file: '../../etc/passwd'});
    d.history[0].runs.push('nope');
    return d;
  });
  const h = hist(panel('en'));
  assert.equal(items(h).length, 2);
  assert.doesNotMatch(h, /<script/);
  MapViews.setNodeLink(() => 'javascript:alert(1)');
  assert.doesNotMatch(hist(panel('en')), /javascript:/); assert.doesNotMatch(hist(panel('en')), /data-hh-node/);
  MapViews.setNodeLink(() => 'https://evil.example/x');
  assert.doesNotMatch(hist(panel('en')), /evil\.example/);
  MapViews.setNodeLink(NODE);
});

test('Compare with latest: every earlier run has the view, the latest has none; the deltas are those of compareRuns', () => {
  load([OLD, MID, NEW]);
  const h = hist(panel('en')), it = items(h);
  assert.doesNotMatch(it[0].html, /hh-cmp/);
  assert.match(it[1].html, /<details class="hh-cmp"[^>]*><summary>Compare with latest<\/summary>/);
  assert.match(it[2].html, /Compare with latest/);
  const mid = it[1].html;
  assert.match(mid, /data-metric="size"[^>]*data-direction="better"/);
  assert.match(mid, /data-metric="duplication"[^>]*data-direction="worse"/);
  assert.match(mid, /−300/, 'size 600 → 300');
  assert.match(mid, /data-criterion="maintainability"[^>]*data-direction="better"/);
  assert.match(mid, /\+30/);
  assert.match(mid, /Split into small files\./, 'reasons of the latest run, which the page holds in full');
  assert.match(mid, new RegExp(`data-overall-delta="${NEW.overall - MID.overall}"`));
  const old = it[2].html;
  assert.match(old, /data-criterion="maintainability"[^>]*data-direction="unknown"/, 'the oldest run had no verdict: not comparable');
  assert.match(old, /only in the later run/);
});

test('German texts and decimal comma; record texts are escaped', () => {
  load([OLD, MID, NEW]);
  const h = hist(panel('de')), it = items(h);
  assert.match(h, /Verlauf/); assert.match(it[1].html, /Mit letztem Lauf vergleichen/); assert.match(it[1].html, /besser/); assert.match(it[1].html, /schlechter/);
  assert.match(it[1].html, /data-metric="test-ratio"[\s\S]*?0,3/);
  assert.match(it[0].html, /Quelltext auf GitHub/); assert.match(it[0].html, /Graph-Knoten/);
  load([MID, NEW], d => d);
  // MID's reason is only in the compact history as score; the hostile text lives in MID's full record, which the page never holds (only the latest does)
  assert.doesNotMatch(hist(panel('de')), /<b>mix/);
  const hostile = rec('2026-10-25T10:15:00Z', [300, 0.5, 0, 4], {commit: SHA3, model: 'm', verdict: [{criterion: 'maintainability', score: 70, weight: 1, reasons: ['x <b>y</b>']}]});
  hostile.verdict[0].criterion = 'maintainability<img>'; // a hand-edited file: the tooling would refuse it, the page must still escape it
  load([MID, hostile]);
  const out = hist(panel('en'));
  assert.doesNotMatch(out, /<img>|<b>y/); assert.match(out, /x &lt;b&gt;y&lt;\/b&gt;/);
});

test('one run only: trend and list show it; there is nothing to compare with and the section says so', () => {
  load([NEW]);
  const h = hist(panel('en'));
  assert.equal(items(h).length, 1); assert.doesNotMatch(h, /hh-cmp/); assert.match(h, /No earlier run to compare with/);
  assert.equal((/<svg[\s\S]*<\/svg>/.exec(h)[0].match(/<circle /g) || []).length, 1);
});

test('the cap is stated: "last 50 of N" when the file holds fewer runs than exist', () => {
  load([OLD, MID, NEW], d => { d.history[0].total = 73; return d; });
  assert.match(hist(panel('en')), /last 3 of 73 runs/);
  assert.match(hist(panel('de')), /letzte 3 von 73 Läufen/);
});

test('without history (older health.json) or without a record there is no section and nothing breaks', () => {
  MapViews.setHealth(plain({schemaVersion: 1, records: [NEW]}), id => SLUG[id] || null);
  assert.equal(hist(panel('en')), '');
  load([NEW]);
  assert.equal(hist(panel('en', {id: 'handover'})), '', 'a square without record has no history');
  MapViews.setHealth(null, () => null);
  assert.doesNotThrow(() => panel('en'));
});

test('without a DOM the trend is left out and the list stays (no throw)', () => {
  const s2 = {}; s2.self = s2;
  vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), s2);
  s2.MapViews.setHealth(plain(buildHealthDoc([OLD, NEW])), id => SLUG[id] || null);
  const html = s2.MapViews.VIEWS.health.panel({id: 'chat'}, 'en', 'capability:chat');
  assert.doesNotMatch(html, /<svg/); assert.match(html, /hh-run/);
});
