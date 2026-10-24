// Health view: the criteria box (ORISO-Docs#217). views.js is a classic script; this runs it like the browser does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadCriteria, buildCriteriaDoc} from '../../../platform/lib/health-criteria.mjs';
import {loadRules, CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const DOC = JSON.parse(JSON.stringify(buildCriteriaDoc(loadCriteria(undefined, {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS}), loadRules())));
const panel = (id, lang = 'en', doc = DOC) => { MapViews.setCriteria(doc); return MapViews.VIEWS.health.panel({id: 'block-of-' + id}, lang, 'capability:' + id); };
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('the Health panel lists the effective criteria with threshold, weight and the file each comes from', () => {
  const h = panel('email-templates');
  const t = text(h);
  assert.match(t, /email-render/); assert.match(t, /email-links/); assert.match(t, /email-languages/);
  assert.match(t, /size[^]*400[^]*default\.md/, 'inherited from the default, and says so');
  assert.match(t, /email-render[^]*email\.md/);
  assert.match(t, /npm run emails:build/, 'tests are listed');
  assert.match(t, /templates are judged by what the recipient receives/, 'reviewer instruction');
  assert.doesNotMatch(h, /<code>crap<\/code>/, 'no frontend metric on the email area');
});

test('a frontend capability shows CRAP with its threshold under narrower rules, from frontend.md', () => {
  const t = text(panel('chat'));
  assert.match(t, /crap[^]*30[^]*frontend\.md/i);
  assert.match(t, /ORISO-Frontend/, 'the path scope is named');
});

test('every key carries its origin: DE and EN labels, direction of the threshold', () => {
  const de = text(panel('email-templates', 'de'));
  assert.match(de, /Kriterien/); assert.match(de, /Bearbeiten/); assert.match(de, /Gewicht/);
  assert.match(de, /E-Mail-Darstellung/);
  const en = text(panel('email-templates', 'en'));
  assert.match(en, /Weight/); assert.match(en, /Edit/);
  assert.match(en, /≤ 5/, 'lint maximum');
  assert.match(en, /≥ 7/, 'language minimum');
});

test('the Edit link opens the GitHub web editor on branch dev for the origin file', () => {
  const h = panel('email-templates');
  const links = [...h.matchAll(/<a [^>]*data-crit-edit="([^"]+)"[^>]*href="([^"]+)"/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(links.map(l => l[0]).sort(), ['default', 'email']);
  const email = links.find(l => l[0] === 'email')[1];
  assert.equal(email, 'https://github.com/OpenResilienceInitiative/ORISO-Docs/edit/dev/tools/understand-anything/platform/capabilities/health/email.md');
  assert.match(h, /rel="noopener noreferrer"/);
});

test('https guard: a source or path that is not a plain github.com path renders no link, only the file name', () => {
  for (const mutate of [
    d => { d.source.repository = 'evil.example/x'; }, d => { d.source.repository = 'a/b"><script>'; },
    d => { d.files.email.path = '../../etc/passwd'; }, d => { d.files.email.path = 'a b/c.md'; },
    d => { d.files.email.path = 'javascript:alert(1)'; }, d => { delete d.files.email; }]) {
    const d = JSON.parse(JSON.stringify(DOC)); mutate(d);
    const h = panel('email-templates', 'en', d);
    assert.doesNotMatch(h, /data-crit-edit="email"/, JSON.stringify(mutate.toString()));
    assert.doesNotMatch(h, /<script|href="(?!https:\/\/github\.com\/)/i);
    assert.match(text(h), /email/);
  }
});

test('the reviewer instruction and every data string are escaped', () => {
  const d = JSON.parse(JSON.stringify(DOC));
  const e = d.capabilities['email-templates'].effective;
  e.instruction.text = '<img src=x onerror=alert(1)> & "quoted"';
  e.tests.list = ['<b>cmd</b>'];
  d.capabilities['email-templates'].inside = [{file: '<i>f</i>', scope: '<u>s</u>', effective: JSON.parse(JSON.stringify(e))}];
  const h = panel('email-templates', 'en', d);
  assert.doesNotMatch(h, /<img|<b>|<i>|<u>/);
  assert.match(h, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quoted&quot;/);
});

test('no inline style or script is produced', () => {
  for (const id of CAPABILITY_IDS) assert.doesNotMatch(panel(id), /\sstyle=|<script|\son[a-z]+=/i, id);
});

test('without published criteria, or for an unknown area, the panel says so instead of guessing', () => {
  assert.match(text(panel('chat', 'en', null)), /No criteria published/);
  assert.match(text(panel('chat', 'de', null)), /Keine Kriterien veröffentlicht/);
  assert.match(text(panel('nope', 'en')), /No criteria for this area/);
  assert.match(text(MapViews.VIEWS.health.panel({id: 'x'}, 'en')), /No criteria for this area/, 'a block without a capability node');
  assert.equal(MapViews.VIEWS.state.panel({id: 'chat'}, 'en'), '', 'State is untouched');
  assert.doesNotMatch(MapViews.VIEWS.plan.panel({id: 'chat'}, 'en'), /criteria|crit/i, 'Plan (#223) shows no criteria box');
});

test('a malformed criteria document is ignored, not half rendered', () => {
  for (const bad of [{}, {schemaVersion: 2, capabilities: {}}, 'x', [], {schemaVersion: 1}])
    assert.match(text(panel('chat', 'en', bad)), /No criteria published/);
});

test('without a run record the square stays neutral grey and the panel says "no data" above the criteria box (colours: health-view.test.mjs)', () => {
  assert.equal(MapViews.VIEWS.health.colour({id: 'chat'}), 'neutral');
  assert.match(MapViews.VIEWS.health.legend('en'), /no data/);
  assert.match(text(panel('chat', 'en')), /No health run for this capability: no data[^]*Criteria/);
});

// ORISO-Docs#213 review (finding 8): the box shows the effective criteria per repository, so it matches what a run record was judged by.
test('the criteria box has one block per repository the capability has code in; ORISO-Frontend shows CRAP 30 from frontend.md', () => {
  const h = panel('chat');
  const repos = Object.keys(DOC.capabilities.chat.byRepo);
  for (const repo of repos) assert.match(h, new RegExp('data-crit-repo="' + repo + '"'), repo);
  const fe = h.slice(h.indexOf('data-crit-repo="ORISO-Frontend"'));
  assert.match(text(fe.slice(0, fe.indexOf('</div>'))), /frontend\.md/);
  assert.match(text(fe), /crap[^]*30/i);
});

test('next to the latest run the panel names the criteria set of its repository and says whether the run used it', async () => {
  const {buildRunRecord} = await import('../../../platform/lib/health-run.mjs');
  const {createRunManifest} = await import('../../../../planning-map/lib/run-manifest.mjs');
  const {resolveCriteria} = await import('../../../platform/lib/health-criteria.mjs');
  const files = loadCriteria(undefined, {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS});
  const effective = resolveCriteria(files, {capability: 'chat', path: 'ORISO-Frontend/'});
  const at = '2026-10-24T10:15:00Z', commit = 'd'.repeat(40);
  const rec = JSON.parse(JSON.stringify(buildRunRecord({manifest: createRunManifest({at, commits: {'ORISO-Frontend': commit}}), scope: {capability: 'chat', repo: 'ORISO-Frontend', path: null}, commit, effective, measurements: {}, startedAt: at})));
  assert.equal(rec.criteriaVersion, DOC.capabilities.chat.byRepo['ORISO-Frontend'].version, 'a run is judged by the per-repository set');
  const show = (r) => { MapViews.setCriteria(DOC); MapViews.setHealth({schemaVersion: 1, records: [r]}, () => 'chat'); return MapViews.VIEWS.health.panel({id: 'chat'}, 'en', 'capability:chat'); };
  const same = show(rec);
  assert.match(same, /data-run-criteria="match"/);
  assert.match(text(same.slice(same.indexOf('data-run-criteria'))), /frontend\.md/);
  assert.match(same, /data-crit-repo="ORISO-Frontend" data-crit-latest/);
  const other = show({...rec, criteriaVersion: 'f'.repeat(64)});
  assert.match(other, /data-run-criteria="changed"/);
  assert.match(text(other), /criteria changed since this run/i);
  MapViews.setHealth(null);
});
