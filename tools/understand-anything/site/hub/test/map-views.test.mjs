// View switch State | Health | Plan: hash codec and view registry (ORISO-Docs#214). Pure module, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Run it as a classic script, exactly like the browser does (the package is type: module).
const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
// JSON round trip drops the foreign-realm prototypes so deepStrictEqual compares plain data.
const raw = sandbox.MapViews;
const {parseHash: rawParse, buildHash, VIEWS, VIEW_IDS, DEFAULT_VIEW} = raw;
const parseHash = h => JSON.parse(JSON.stringify(rawParse(h)));
const CAP = 'capability:case-handover';
const FILE = 'ORISO-UserService::file:src/main/java/x/A.java';

test('the default view is State and the views are State, Health, Plan in that order', () => {
  assert.equal(DEFAULT_VIEW, 'state');
  assert.deepEqual([...VIEW_IDS], ['state', 'health', 'plan']);
});

test('legacy #node= links parse as the State view with that node (#199)', () => {
  assert.deepEqual(parseHash('#node=' + encodeURIComponent(CAP)), {view: 'state', node: CAP, hasView: false});
  assert.deepEqual(parseHash('#node=' + encodeURIComponent(FILE)).node, FILE);
  assert.equal(parseHash('#node=a+b%3A%3Ac').node, 'a+b::c', 'a plus sign stays a plus sign');
});

test('view and node are read together, in any order', () => {
  assert.deepEqual(parseHash('#view=health&node=' + encodeURIComponent(CAP)), {view: 'health', node: CAP, hasView: true});
  assert.deepEqual(parseHash('#node=' + encodeURIComponent(CAP) + '&view=plan'), {view: 'plan', node: CAP, hasView: true});
  assert.deepEqual(parseHash('#view=plan'), {view: 'plan', node: null, hasView: true});
});

test('unknown views, empty and broken hashes fall back to State without a node', () => {
  assert.equal(parseHash('#view=nope').view, 'state');
  assert.deepEqual(parseHash(''), {view: 'state', node: null, hasView: false});
  assert.deepEqual(parseHash('#'), {view: 'state', node: null, hasView: false});
  assert.equal(parseHash('#node=%E0%A4%A').node, null);
  assert.equal(parseHash('#node=' + 'x'.repeat(513)).node, null);
  assert.equal(parseHash('#node=a%00b').node, null);
});

test('an unencoded & inside a legacy node id is kept', () => {
  assert.equal(parseHash('#node=capability:a&b').node, 'capability:a&b');
});

test('buildHash keeps State links identical to the #199 form and round-trips the others', () => {
  assert.equal(buildHash('state', CAP), '#node=' + encodeURIComponent(CAP));
  assert.equal(buildHash('state', null), '');
  assert.equal(buildHash('health', null), '#view=health');
  assert.equal(buildHash('plan', FILE), '#view=plan&node=' + encodeURIComponent(FILE));
  for (const v of VIEW_IDS) for (const n of [null, CAP, FILE]) {
    const back = parseHash(buildHash(v, n));
    assert.equal(back.view, v); assert.equal(back.node, n);
  }
});

test('every view offers the same three hooks: legend, colour, panel', () => {
  for (const v of VIEW_IDS) {
    assert.equal(typeof VIEWS[v].title.de, 'string'); assert.equal(typeof VIEWS[v].title.en, 'string');
    assert.equal(typeof VIEWS[v].legend, 'function');
    assert.equal(typeof VIEWS[v].colour, 'function');
    assert.equal(typeof VIEWS[v].panel, 'function');
  }
});

test('State keeps today\'s map: no colour override, no extra panel, no legend of its own', () => {
  assert.equal(VIEWS.state.colour({id: 'x'}), null);
  assert.equal(VIEWS.state.panel({id: 'x'}, 'de'), '');
  assert.equal(VIEWS.state.legend('de'), '');
});

test('Health draws a neutral layer and says in one line that the view is coming, in DE and EN (Plan: ideas-view.test.mjs)', () => {
  for (const v of ['health']) {
    assert.equal(VIEWS[v].colour({id: 'x'}), 'neutral');
    for (const lang of ['de', 'en']) {
      const legend = VIEWS[v].legend(lang);
      assert.ok(legend.length > 10 && !/\n/.test(legend));
      // Health's panel is the criteria box since #217 (test/map-criteria.test.mjs); Plan still shows the note.
      if (v === 'plan') assert.match(VIEWS[v].panel({id: 'x'}, lang), new RegExp(legend.slice(0, 10).replace(/[()]/g, '.')));
    }
  }
  assert.match(VIEWS.health.legend('en'), /coming/i);
  assert.match(VIEWS.health.legend('de'), /folgt/i);
});
