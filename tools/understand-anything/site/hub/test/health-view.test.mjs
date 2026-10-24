// Health view logic (ORISO-Docs#218): colours, panel, and the "No invented data" rule.
// views.js is a classic script; this runs it like the browser does and feeds it real run records.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord} from '../../../platform/lib/health-run.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const plain = x => JSON.parse(JSON.stringify(x));

const SHA = 'd'.repeat(40);
const crit = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
---
x`, 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS});
const effective = resolveCriteria(crit, {capability: 'chat', path: 'ORISO-Frontend/'});
const MEAS = {
  size: {value: 300, source: 'health-run size: 12 files', details: {}},
  'test-ratio': {value: 0.25, source: 'health-run test-ratio: 2 of 8', details: {}},
  lint: {value: null, source: 'eslint', details: {reason: 'no linter configuration (eslint) in the checkout'}},
  duplication: {value: 2.5, source: 'health-run duplication 50-token window', details: {}},
};
function record({at = '2026-10-24T10:15:00Z', capability = 'chat', repo = 'ORISO-Frontend', path = null, measurements = MEAS, model = null, verdict = [], commit = SHA} = {}) {
  return buildRunRecord({
    manifest: createRunManifest({at, commits: {[repo]: commit}}), scope: {capability, repo, path}, commit,
    effective, measurements, model, startedAt: at, verdict,
  });
}
const SLUG = {chat: 'chat', handover: 'case-handover', base: 'shared'};
const load = (...records) => MapViews.setHealth(plain({schemaVersion: 1, records}), id => SLUG[id] || null);
const BLOCK = {id: 'chat'};
const health = MapViews.VIEWS.health;
const withOverall = overall => { const r = record(); r.overall = overall; return r; }; // colour logic only; the validator is the publisher's job

test('colour follows the overall score: good from 80, fair from 60, weak from 40, otherwise critical; the edges belong to the upper band', () => {
  const at = overall => { load(withOverall(overall)); return health.colour(BLOCK); };
  assert.deepEqual([100, 80].map(at), ['ua-health-good', 'ua-health-good']);
  assert.deepEqual([79, 60].map(at), ['ua-health-fair', 'ua-health-fair']);
  assert.deepEqual([59, 40].map(at), ['ua-health-weak', 'ua-health-weak']);
  assert.deepEqual([39, 0].map(at), ['ua-health-poor', 'ua-health-poor'], '0 is a measured score and is critical, not grey');
  load(withOverall(80)); assert.deepEqual(plain(health.badge(BLOCK)), {band: 'good', text: '80'});
});

test('no record, no overall score, or another capability: neutral grey and no badge ("no data")', () => {
  MapViews.setHealth(null, id => SLUG[id]);
  assert.equal(health.colour(BLOCK), 'neutral'); assert.equal(health.badge(BLOCK), null);
  load(withOverall(null)); // nothing could be scored: not 0
  assert.equal(health.colour(BLOCK), 'neutral'); assert.equal(health.badge(BLOCK), null);
  load(record({capability: 'case-handover'}));
  assert.equal(health.colour(BLOCK), 'neutral', 'a record of another capability does not colour this square');
  assert.equal(health.colour({id: 'unmapped'}), 'neutral');
  assert.equal(health.colour(null), 'neutral');
  MapViews.setHealth({schemaVersion: 2, records: [record()]}, id => SLUG[id]);
  assert.equal(health.colour(BLOCK), 'neutral', 'an unknown document version is ignored');
});

test('the square shows the newest run of the whole capability; folder runs do not colour it', () => {
  const old = record({at: '2026-09-01T08:00:00Z', measurements: {...MEAS, size: {...MEAS.size, value: 900}}});
  const folder = record({at: '2026-10-25T08:00:00Z', path: 'src/x', measurements: {...MEAS, size: {...MEAS.size, value: 900}}});
  load(old, record(), folder);
  assert.equal(health.badge(BLOCK).text, String(record().overall));
  load(old, folder);
  assert.equal(health.badge(BLOCK).text, String(old.overall), 'only a folder run newer than the capability run exists: the older capability run still colours');
  load(folder);
  assert.equal(health.colour(BLOCK), 'neutral', 'a folder run alone says nothing about the whole capability');
  assert.match(health.panel(BLOCK, 'en', 'capability:chat'), /src\/x/, 'but the panel lists it');
});

test('malformed records are dropped, never half shown', () => {
  const bad = [{}, {...record(), commit: 'xyz'}, {...record(), startedAt: 'yesterday'}, {...record(), overall: 120}, {...record(), overall: '80'}, {...record(), scope: {capability: 'chat'}}, 'x', null];
  MapViews.setHealth(plain({schemaVersion: 1, records: bad}), id => SLUG[id]);
  assert.equal(health.colour(BLOCK), 'neutral');
  assert.match(health.panel(BLOCK, 'en', 'capability:chat'), /No health run/);
});

const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

test('the panel shows date, model, commit, every metric with its value against the threshold and its source, and the links', () => {
  const r = record({model: 'claude-test', verdict: [{criterion: 'readability', score: 40, weight: 1, reasons: ['Two 600 line files mix rendering and state.']}]});
  load(r);
  const html = health.panel(BLOCK, 'en', 'capability:chat'), t = text(html);
  assert.match(t, /Latest health run/); assert.match(t, /2026-10-24 10:15 UTC/); assert.match(t, /claude-test/); assert.match(t, new RegExp('Commit ' + SHA.slice(0, 7)));
  assert.match(t, /size.*Value 300.*Threshold ≤ 400.*met.*Source: health-run size: 12 files/);
  assert.match(t, /test-ratio.*Value 0\.25.*Threshold ≥ 0\.5.*not met/);
  assert.match(t, /lint.*not available.*no linter configuration \(eslint\) in the checkout/);
  assert.doesNotMatch(t, /Lint lint Value/, 'a not-available metric shows no value');
  assert.match(t, /Lint lint not available Threshold ≤ 0/);
  assert.match(t, /readability.*Score 40.*Two 600 line files/);
  assert.match(html, /<a data-health-source href="https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Frontend\/tree\/d{40}" target="_blank" rel="noopener noreferrer">/);
  assert.match(t, /Graph node capability:chat/);
  assert.match(html, /data-hband="/);
});
test('metrics only: "none (metrics only)" and German formatting with decimal comma', () => {
  load(record());
  const t = text(health.panel(BLOCK, 'de', 'capability:chat'));
  assert.match(t, /Modell keines \(nur Kennzahlen\)/); assert.match(t, /Wert 0,25/); assert.match(t, /Schwelle ≥ 0,5/); assert.match(t, /nicht verfügbar/);
  assert.match(t, /Letzter Prüflauf/);
});
test('a run without any scored criterion says "no data" for the overall score instead of 0', () => {
  const r = record({measurements: {}});
  assert.equal(r.overall, null);
  load(r);
  const t = text(health.panel(BLOCK, 'en', 'capability:chat'));
  assert.match(t, /Overall: no data/); assert.doesNotMatch(t, /Overall 0/);
  assert.equal(health.colour(BLOCK), 'neutral');
});

test('record texts are untrusted: markup is escaped, a link that is not a GitHub tree URL of the org is not rendered', () => {
  const r = record({measurements: {...MEAS, size: {...MEAS.size, source: '<img src=x onerror=alert(1)>'}}, model: '<script>alert(1)</script>'});
  const raw = plain(r); raw.links.source = 'javascript:alert(1)';
  MapViews.setHealth({schemaVersion: 1, records: [raw]}, id => SLUG[id]);
  const html = health.panel(BLOCK, 'en', 'capability:chat');
  assert.doesNotMatch(html, /<img|<script/); assert.match(html, /&lt;img src=x/);
  assert.doesNotMatch(html, /javascript:/); assert.doesNotMatch(html, /data-health-source/);
  raw.links.source = 'https://evil.example/OpenResilienceInitiative/x/tree/' + SHA;
  MapViews.setHealth({schemaVersion: 1, records: [raw]}, id => SLUG[id]);
  assert.doesNotMatch(health.panel(BLOCK, 'en', 'capability:chat'), /evil\.example/);
});

// ---------------------------------------------------------------- "No invented data"
const elements = html => [...html.matchAll(/<(span|time|code|strong)\b([^>]*\bdata-from="([^"]+)"[^>]*)>([^<]*)<\/\1>/g)]
  .map(m => ({attrs: m[2], path: m[3], text: m[4].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"), index: m.index}));
function at(obj, path) {
  return path.split(/[.\[\]]+/).filter(Boolean).reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
}
function traces(html, records, lang) {
  const found = elements(html);
  assert.ok(found.length > 0, 'the panel has traceable values');
  for (const el of found) {
    // the record is the main one, or the one named by the closest list item of "other runs" before the element
    const before = html.slice(0, el.index), li = [...before.matchAll(/<li data-rec-start="([^"]*)" data-rec-repo="([^"]*)" data-rec-path="([^"]*)">/g)].pop();
    const inOther = li && !before.slice(li.index).includes('</li>');
    const rec = inOther ? records.find(r => r.startedAt === li[1] && r.scope.repo === li[2] && (r.scope.path ?? '') === li[3]) : records[0];
    assert.ok(rec, 'record found for ' + el.path);
    const v = at(rec, el.path);
    assert.notEqual(v, undefined, `${el.path} is not a field of the record`);
    const shown = typeof v === 'number' ? (lang === 'de' ? String(v).replace('.', ',') : String(v))
      : el.path === 'startedAt' ? v.slice(0, 10) + ' ' + v.slice(11, 16) + ' UTC'
      : el.path === 'commit' ? v.slice(0, 7) : el.path === 'criteriaVersion' ? v.slice(0, 12)
      : v === null ? el.text : String(v);
    assert.equal(el.text, shown, `${el.path}: rendered "${el.text}" but the record says "${shown}"`);
  }
  // nothing numeric is left outside a traced element
  const stripped = html.replace(/<(span|time|code|strong)\b[^>]*\bdata-from="[^"]*"[^>]*>[^<]*<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(stripped, /\d/, 'digits outside traced elements: ' + (stripped.match(/.{0,25}\d.{0,25}/) || [''])[0]);
}

test('No invented data: every number in the run panel is a field of the record it comes from, DE and EN', () => {
  const main = record({model: 'claude-test', verdict: [{criterion: 'readability', score: 40, weight: 2, reasons: ['Two 600 line files mix rendering and state.']}]});
  const other = record({at: '2026-09-01T08:00:00Z', measurements: {...MEAS, size: {...MEAS.size, value: 500}}});
  const folder = record({at: '2026-10-20T08:00:00Z', path: 'src/chat/sub'});
  load(main, other, folder);
  const records = [main, other, folder];
  for (const lang of ['en', 'de']) {
    const html = MapViews.VIEWS.health.panel(BLOCK, lang, null);
    traces(html, records, lang);
    assert.match(html, /data-rec-start="2026-09-01T08:00:00Z"/, 'other runs are listed and traced to their own record');
  }
});
test('No invented data: the square badge is exactly the overall field, and a missing record has no number at all', () => {
  const r = record(); load(r);
  assert.equal(health.badge(BLOCK).text, String(r.overall));
  MapViews.setHealth(null, id => SLUG[id]);
  const none = health.panel(BLOCK, 'en', null);
  assert.doesNotMatch(none.replace(/<[^>]+>/g, ' '), /\d/);
});
test('the legend names the band limits that the colour rule uses and nothing else numeric', () => {
  load(record());
  for (const lang of ['de', 'en']) assert.deepEqual(health.legend(lang).match(/\d+/g), ['80', '60', '40']);
});
