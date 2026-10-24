// Health panel, "Steering" section (ORISO-Docs#221). views.js is a classic script; this runs it like the browser does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const ISSUE = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/300';
const cm = (author, d, body, over = {}) => ({author, createdAt: `2026-10-${d}T08:30:00Z`, url: `${ISSUE}#issuecomment-${d}`, authorAssociation: 'MEMBER', body, truncated: false, ...over});
const doc = (comments, issueUrl = ISSUE) => ({schemaVersion: 1, generatedAt: '2026-10-24T12:00:00Z', source: {repository: 'OpenResilienceInitiative/ORISO-Docs', label: 'area-steering', allowedAssociations: ['OWNER', 'MEMBER', 'COLLABORATOR']},
  capabilities: {chat: {issue: {number: 300, url: issueUrl, title: 'Steering: Chat', state: 'OPEN'}, comments, skipped: 0, omitted: 0}}, warnings: []});
const panel = (steering, id = 'chat', lang = 'en') => { MapViews.setSteering(steering); return MapViews.VIEWS.health.panel({id: 'b'}, lang, 'capability:' + id); };
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('comments show newest first with author and date, and a link to add one on GitHub', () => {
  const h = panel(doc([cm('frank', '20', 'older note'), cm('nikunj', '22', 'newest note')]));
  const t = text(h);
  assert.ok(t.indexOf('newest note') < t.indexOf('older note'), 'newest first');
  assert.match(t, /nikunj/); assert.match(t, /2026-10-22/); assert.match(t, /Steering/);
  const add = /<a [^>]*data-steer-add[^>]*>/.exec(h)[0];
  assert.match(add, new RegExp('href="' + ISSUE.replace(/[./]/g, '\\$&') + '#new_comment_field"'));
  assert.match(add, /rel="noopener noreferrer"/); assert.match(add, /target="_blank"/);
  assert.match(text(h), /Add a comment on GitHub/);
});

test('German labels and date format', () => {
  const t = text(panel(doc([cm('frank', '20', 'Notiz')]), 'chat', 'de'));
  assert.match(t, /Steuerung/); assert.match(t, /20\.10\.2026/); assert.match(t, /Kommentar auf GitHub hinzufügen/);
});

test('a steering issue without member comments says so and still offers the link', () => {
  const h = panel(doc([]));
  assert.match(text(h), /No steering comments yet/);
  assert.match(h, /data-steer-add/);
});

test('no steering issue yet: the exact command to create one, no link', () => {
  const h = panel(doc([cm('frank', '20', 'x')]), 'branding');
  assert.match(h, /<code[^>]*data-steer-cmd[^>]*>node tools\/planning-map\/steering\.mjs ensure --capability branding --apply<\/code>/);
  assert.doesNotMatch(h, /data-steer-add/);
  const none = panel(null, 'branding');
  assert.match(none, /ensure --capability branding --apply/, 'also without any steering file');
});

test('everything is escaped: markup in a comment, in the author name and in the title stays text', () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>"\'&';
  const h = panel(doc([cm('frank', '20', evil)]));
  assert.doesNotMatch(h, /<img|<script/i);
  assert.match(text(h), /<img src=x onerror=alert\(1\)><script>alert\(2\)<\/script>"'&/);
  assert.equal((h.match(/onerror/g) || []).length, 1, 'only inside escaped text');
});

test('comments of non-members, bad authors or foreign links are not shown even from a hand-edited file', () => {
  const h = panel(doc([
    cm('outsider', '20', 'outside voice', {authorAssociation: 'NONE'}), cm('x" onmouseover="1', '21', 'bad author'),
    cm('frank', '22', 'bad link', {url: 'javascript:alert(1)'}), cm('frank', '23', 'good one'),
  ]));
  const t = text(h);
  assert.match(t, /good one/); assert.doesNotMatch(t, /outside voice|bad author/);
  assert.match(t, /bad link/, 'the text is fine, only the link is dropped');
  assert.doesNotMatch(h, /javascript:/);
});

test('the issue link is only ever an ORISO-Docs https issue; anything else gives the command instead', () => {
  for (const bad of ['javascript:alert(1)', 'http://github.com/OpenResilienceInitiative/ORISO-Docs/issues/300', 'https://evil.example/OpenResilienceInitiative/ORISO-Docs/issues/300',
    'https://github.com/OpenResilienceInitiative/ORISO-E2E/issues/3', ISSUE + '"><x>']) {
    const h = panel(doc([cm('frank', '20', 'x')], bad));
    assert.doesNotMatch(h, /data-steer-add/, bad);
    assert.match(h, /data-steer-cmd/, bad);
  }
});

test('the criteria box stays and the steering section follows it; other views get none', () => {
  MapViews.setSteering(doc([cm('frank', '20', 'x')]));
  const h = MapViews.VIEWS.health.panel({id: 'b'}, 'en', 'capability:chat');
  MapViews.setCriteria(null);
  const h2 = MapViews.VIEWS.health.panel({id: 'b'}, 'en', 'capability:chat');
  assert.ok(h2.indexOf('vnote') >= 0 && h2.indexOf('vnote') < h2.indexOf('class="steer"'), 'steering is appended after the criteria output');
  assert.equal(MapViews.VIEWS.state.panel({id: 'b'}, 'en', 'capability:chat'), '');
  assert.doesNotMatch(MapViews.VIEWS.plan.panel({id: 'b'}, 'en', 'capability:chat'), /steer/);
});

test('a block without a capability gets no steering section; a broken file is treated as absent', () => {
  MapViews.setSteering(doc([cm('frank', '20', 'x')]));
  assert.doesNotMatch(MapViews.VIEWS.health.panel({id: 'b'}, 'en', null), /steer/);
  MapViews.setSteering({schemaVersion: 2});
  assert.match(MapViews.VIEWS.health.panel({id: 'b'}, 'en', 'capability:chat'), /ensure --capability chat/);
});
