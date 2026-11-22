// Gate step indicator and gate filter in the epic view (ORISO-Docs#211): data side, in board-agg.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/board-agg.js', import.meta.url), 'utf8'), sandbox);
const plain = v => JSON.parse(JSON.stringify(v));
const Agg = sandbox.BoardAgg;
const fx = n => JSON.parse(readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8'));
const options = JSON.parse(readFileSync(new URL('../../../../planning-map/gate-options.json', import.meta.url), 'utf8')).options;
const epics = fx('map-data/epics.json').epics;
epics.epics[0].subs = [];
const ORG = 'OpenResilienceInitiative/';

// Fixture board: epic 1734 with children 1801..1808; give some of them gates.
function board(gates) {
  const b = fx('board.json');
  b.items.forEach(i => { if (gates[i.number] !== undefined) i.gate = gates[i.number]; });
  return b;
}
const view = (b, filter, gate) => plain(Agg.epicView(b, epics, 0, filter, gate));
const numbers = ev => ev.groups.flatMap(g => g.items.map(i => i.number)).sort();

test('the page knows the same eight gates as the reviewed gate-options.json', () => {
  assert.deepEqual(plain(Agg.GATES).map(g => [g.name, g.phase, g.step, g.criteria]), options.map(o => [o.name, o.phase, o.step, o.criteria]));
});

test('gateStep: 1 to 8 along the gates, 0 for none or an unknown value', () => {
  assert.deepEqual(['P1 Framed', 'R4 Verified on Dev', null, undefined, 'Renamed'].map(Agg.gateStep), [1, 8, 0, 0, 0]);
});

test('without any Gate value the epic view carries no gate data and shows no gate filter', () => {
  const ev = view(board({}));
  assert.equal(ev.gateAvailable, false);
  assert.ok(ev.groups.every(g => g.items.every(i => i.gate === null && i.gateStep === 0)));
});

test('items carry their gate and step', () => {
  const ev = view(board({1801: 'P2 Specified', 1804: 'R3 Human review'}));
  const items = ev.groups.flatMap(g => g.items);
  assert.deepEqual(items.filter(i => i.gate).map(i => [i.number, i.gate, i.gateStep]).sort(), [[1801, 'P2 Specified', 2], [1804, 'R3 Human review', 7]]);
  assert.equal(ev.gateAvailable, true);
});

test('FILTER "waiting at R3": only the issues at that gate remain', () => {
  const b = board({1801: 'P2 Specified', 1804: 'R3 Human review', 1805: 'R3 Human review', 1806: 'R4 Verified on Dev'});
  const ev = view(b, 'all', 'R3 Human review');
  assert.deepEqual(numbers(ev), [1804, 1805]);
  assert.equal(ev.gate, 'R3 Human review');
});

test('filter "no gate" keeps the ungated; "all" keeps everything; an unknown value falls back to all', () => {
  const b = board({1801: 'P2 Specified'});
  assert.equal(numbers(view(b, 'all', 'none')).includes(1801), false);
  assert.equal(numbers(view(b, 'all', 'none')).length, 7);
  assert.equal(numbers(view(b, 'all', 'all')).length, 8);
  assert.equal(view(b, 'all', 'Nonsense').gate, 'all');
});

test('gate and status filters combine, and the counts on each side respect the other filter', () => {
  const b = board({1801: 'R3 Human review', 1804: 'R3 Human review', 1805: 'R3 Human review'}); // Backlog, In review, QA internal
  const ev = view(b, 'dev', 'R3 Human review'); // developed on Dev = QA internal
  assert.deepEqual(numbers(ev), [1805]);
  assert.equal(ev.gateCounts['R3 Human review'], 1, 'gate counts follow the status filter');
  assert.equal(ev.filterCounts.dev, 1, 'status counts follow the gate filter');
  assert.equal(ev.filterCounts.all, 3);
});

test('gate counts list every gate, plus none and all', () => {
  const ev = view(board({1801: 'P1 Framed'}), 'all');
  assert.deepEqual(Object.keys(ev.gateCounts), ['all', 'none', ...options.map(o => o.name)]);
  assert.equal(ev.gateCounts.all, 8); assert.equal(ev.gateCounts.none, 7); assert.equal(ev.gateCounts['P1 Framed'], 1);
});

test('a gate value that is not one of the eight is kept as text, step 0, and filterable only as "all"/"none"', () => {
  const ev = view(board({1801: 'Old name'}));
  const i = ev.groups.flatMap(g => g.items).find(x => x.number === 1801);
  assert.deepEqual([i.gate, i.gateStep], ['Old name', 0]);
});
