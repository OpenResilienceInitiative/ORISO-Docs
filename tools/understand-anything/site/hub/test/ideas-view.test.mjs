// Plan view and the "Show ideas" toggle: pure model behind the canvas (ORISO-Docs#223). No browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function load() {
  const sandbox = {}; sandbox.self = sandbox;
  vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
  return sandbox.MapViews;
}
const SLUGS = {handover: 'case-handover', notify: 'notifications', chat: 'chat'};
const slugOf = id => SLUGS[id] || null;
const label = slug => ({'case-handover': 'Case handover', notifications: 'Notifications'})[slug] || null;
const idea = (o = {}) => ({
  id: 'handover-v2', status: 'discussed', capabilities: ['case-handover', 'notifications'],
  title: {de: 'Übergabe 2', en: 'Handover 2'}, summary: {de: 'Kurz.', en: 'Short.'},
  pages: {de: 'https://docs.oriso.org/de/produkt/ideas/handover-v2', en: 'https://docs.oriso.org/en/produkt/ideas/handover-v2'}, ...o});
const doc = (...ideas) => ({schemaVersion: 1, ideas});
const block = id => ({id});
function ready(...ideas) { const M = load(); M.setIdeas(doc(...ideas), slugOf); return M; }

test('without ideas.json the Plan view says there are no ideas yet and State offers no toggle', () => {
  const M = load();
  assert.equal(M.ideaCount(), 0);
  assert.match(M.VIEWS.plan.legend('en'), /no ideas/i);
  assert.match(M.VIEWS.plan.legend('de'), /keine Ideen/i);
  assert.equal(M.tools('state', 'en', label), '');
  assert.equal(M.VIEWS.plan.colour(block('handover')), 'neutral');
});

test('every view has the hook mark(block); State and Health mark nothing until ideas are shown', () => {
  const M = ready(idea());
  for (const v of M.VIEW_IDS) assert.equal(typeof M.VIEWS[v].mark, 'function');
  assert.equal(M.showIdeas(), false);
  assert.equal(M.VIEWS.state.mark(block('handover')), false, 'hidden by default');
  assert.equal(M.VIEWS.health.mark(block('handover')), false);
  M.toggleIdeas();
  assert.equal(M.showIdeas(), true);
  assert.equal(M.VIEWS.state.mark(block('handover')), true);
  assert.equal(M.VIEWS.state.mark(block('notify')), true);
  assert.equal(M.VIEWS.state.mark(block('chat')), false, 'a square no idea touches stays unmarked');
  assert.equal(M.VIEWS.health.mark(block('handover')), true);
  M.toggleIdeas();
  assert.equal(M.VIEWS.state.mark(block('handover')), false);
});

test('State keeps its colours when ideas are shown: only the mark is added', () => {
  const M = ready(idea());
  M.toggleIdeas();
  assert.equal(M.VIEWS.state.colour(block('handover')), null);
  assert.equal(M.VIEWS.state.legend('en'), '');
});

test('Plan: nothing is highlighted until an idea is selected; selecting highlights exactly its capabilities', () => {
  const M = ready(idea(), idea({id: 'other', capabilities: ['chat']}));
  assert.equal(M.VIEWS.plan.mark(block('handover')), false);
  assert.equal(M.VIEWS.plan.colour(block('handover')), 'neutral');
  M.selectIdea('handover-v2');
  assert.equal(M.selectedIdea(), 'handover-v2');
  assert.equal(M.VIEWS.plan.mark(block('handover')), true);
  assert.equal(M.VIEWS.plan.mark(block('notify')), true);
  assert.equal(M.VIEWS.plan.mark(block('chat')), false);
  assert.equal(M.VIEWS.plan.colour(block('handover')), 'brand-wash');
  assert.equal(M.VIEWS.plan.colour(block('chat')), 'neutral');
  M.selectIdea('other');
  assert.equal(M.VIEWS.plan.mark(block('handover')), false);
  assert.equal(M.VIEWS.plan.mark(block('chat')), true);
  M.selectIdea('other');
  assert.equal(M.selectedIdea(), null, 'selecting again clears');
  M.selectIdea('no-such-idea');
  assert.equal(M.selectedIdea(), null, 'an unknown id selects nothing');
});

test('the Plan list names every idea with its status, in the chosen language, and marks the selection', () => {
  const M = ready(idea(), idea({id: 'b', status: 'epic', epic: 'OpenResilienceInitiative/ORISO-Frontend#42', epicUrl: 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/42', draftItems: 3, title: {de: 'B', en: 'B'}}));
  M.selectIdea('handover-v2');
  const en = M.tools('plan', 'en', label), de = M.tools('plan', 'de', label);
  assert.match(en, /Handover 2/); assert.match(de, /Übergabe 2/);
  assert.match(en, /data-idea="handover-v2"[^>]*aria-pressed="true"/);
  assert.match(en, /data-idea="b"[^>]*aria-pressed="false"/);
  assert.match(en, /Discussed/); assert.match(de, /Besprochen/);
});

test('the selected idea shows the flow idea > discussed > specified > epic with the current step marked', () => {
  const M = ready(idea());
  M.selectIdea('handover-v2');
  const html = M.tools('plan', 'en', label);
  const steps = [...html.matchAll(/<li class="iflow-step[^"]*"[^>]*>(.*?)<\/li>/g)].map(m => m[0]);
  assert.equal(steps.length, 4);
  assert.match(steps[0], /done/); assert.match(steps[1], /aria-current="step"/);
  assert.doesNotMatch(steps[2], /done|aria-current/); assert.doesNotMatch(steps[3], /done|aria-current/);
  for (const w of ['Idea', 'Discussed', 'Specified', 'Epic']) assert.match(html, new RegExp(w));
  assert.match(M.tools('plan', 'de', label), /Idee[\s\S]*Besprochen[\s\S]*Spezifiziert[\s\S]*Epic/);
});

test('links: DE and EN page, epic with draft count; only https links of the expected host are rendered', () => {
  const M = ready(idea({status: 'epic', epic: 'OpenResilienceInitiative/ORISO-Frontend#42', epicUrl: 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/42', draftItems: 3}));
  M.selectIdea('handover-v2');
  const html = M.tools('plan', 'en', label);
  assert.match(html, /href="https:\/\/docs\.oriso\.org\/de\/produkt\/ideas\/handover-v2"/);
  assert.match(html, /href="https:\/\/docs\.oriso\.org\/en\/produkt\/ideas\/handover-v2"/);
  assert.match(html, /href="https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Frontend\/issues\/42"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /3 draft items/);
});

test('https guard: javascript:, http:, other hosts and non-strings never become links', () => {
  for (const bad of ['javascript:alert(1)', 'http://docs.oriso.org/x', 'https://evil.example/x', 'https://docs.oriso.org.evil.example/x', '//docs.oriso.org/x', 42, null, 'https://user@docs.oriso.org/x']) {
    const M = ready(idea({pages: {de: bad, en: bad}, status: 'epic', epic: 'o/r#1', epicUrl: bad}));
    M.selectIdea('handover-v2');
    const html = M.tools('plan', 'en', label);
    assert.doesNotMatch(html, /href=/, `no link for ${String(bad)}`);
    assert.doesNotMatch(html, /javascript:/);
  }
});

test('titles and summaries are escaped', () => {
  const M = ready(idea({title: {de: '<img src=x onerror=alert(1)>', en: '<script>x</script> & "q"'}, summary: {de: '<b>', en: '<i onclick="x">'}}));
  M.selectIdea('handover-v2');
  const html = M.tools('plan', 'en', label) + M.tools('plan', 'de', label) + M.VIEWS.plan.panel(block('handover'), 'en');
  assert.doesNotMatch(html, /<script|<img|<i onclick|<b>/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt; &amp; &quot;q&quot;/);
});

test('invalid entries are dropped, valid ones kept: a bad idea cannot break the canvas', () => {
  const M = load();
  M.setIdeas(doc(idea(), idea({id: 'x', status: 'done'}), idea({id: 'y', capabilities: 'chat'}), {id: 3}, null, idea({id: 'z', title: null}), idea({id: 'ok2', title: {de: 'D', en: 'E'}, capabilities: []})), slugOf);
  assert.equal(M.ideaCount(), 2);
  M.setIdeas({schemaVersion: 2, ideas: [idea()]}, slugOf);
  assert.equal(M.ideaCount(), 0, 'unknown schema version');
  M.setIdeas(null, slugOf);
  assert.equal(M.ideaCount(), 0);
});

test('the toggle exists in State and Health only when ideas exist, names the count and reflects its state', () => {
  const M = ready(idea());
  for (const v of ['state', 'health']) {
    const off = M.tools(v, 'en', label), offDe = M.tools(v, 'de', label);
    assert.match(off, /data-ideatoggle[^>]*aria-pressed="false"/);
    assert.match(off, /Show ideas/); assert.match(offDe, /Ideen anzeigen/);
  }
  M.toggleIdeas();
  assert.match(M.tools('state', 'en', label), /aria-pressed="true"/);
  assert.match(M.tools('state', 'en', label), /1 idea/);
});

test('the capability panel in Plan lists the ideas that touch it, with status; nothing for untouched ones', () => {
  const M = ready(idea());
  const html = M.VIEWS.plan.panel(block('handover'), 'en');
  assert.match(html, /Handover 2/); assert.match(html, /Discussed/);
  assert.equal(M.VIEWS.plan.panel(block('chat'), 'en'), '');
  assert.equal(M.VIEWS.state.panel(block('handover'), 'en'), '');
});

test('capabilities without a square (for example shared) are listed by name and highlight nothing', () => {
  const M = ready(idea({capabilities: ['shared']}));
  M.selectIdea('handover-v2');
  assert.match(M.tools('plan', 'en', label), /shared/);
  for (const id of ['handover', 'notify', 'chat']) assert.equal(M.VIEWS.plan.mark(block(id)), false);
});
