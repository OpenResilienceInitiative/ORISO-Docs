import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findConcepts, resolveConcept} from '../assets/glossary.js';

const catalog = JSON.parse(readFileSync(new URL('../../../glossary/catalog.json', import.meta.url)));

test('readers search both languages, decomposed Unicode, legacy aliases and actual code names with category narrowing', () => {
  assert.ok(findConcepts(catalog, {query: '  TRÄGER  '}).some(concept => concept.id === 'provider'));
  assert.ok(findConcepts(catalog, {query: 'Agency Unit'}).some(concept => concept.id === 'counselling-centre'));
  assert.ok(findConcepts(catalog, {query: 'U\u0308bungsbereich'}).some(concept => concept.id === 'practice-area'));
  assert.ok(findConcepts(catalog, {query: 'GroupChatParticipant.chatId'}).some(concept => concept.id === 'self-help-group-chat'));
  assert.ok(findConcepts(catalog, {query: 'AVV', category: 'legal-documents-and-flows'}).some(concept => concept.id === 'dpa'));
  assert.equal(findConcepts(catalog, {query: 'AVV', category: 'organisation-and-roles'}).some(concept => concept.id === 'dpa'), false);
  assert.equal(findConcepts(catalog, {query: 'term-that-does-not-exist-0123'}).length, 0);
});

test('stable concept anchors remain language independent; unknown or malformed hashes fall back to provider', () => {
  assert.equal(resolveConcept(catalog, '#counselling-centre').id, 'counselling-centre');
  assert.equal(resolveConcept(catalog, '#dpa').id, 'dpa');
  assert.equal(resolveConcept(catalog, '#%64pa').id, 'dpa');
  assert.equal(resolveConcept(catalog, '#unknown').id, 'provider');
  assert.equal(resolveConcept(catalog, '#%bad%E0').id, 'provider');
});

test('activating the keyboard skip link focuses DPA while preserving selection, search and category', async () => {
  const {initGlossary} = await import('../assets/glossary.js');
  const events = {}, windowEvents = {};
  let focused = null;
  const element = (id, extra = {}) => ({id, value: '', hidden: false, addEventListener: (name, handler) => { events[`${id}:${name}`] = handler; }, focus: () => { focused = id; }, ...extra});
  const articles = catalog.concepts.map(c => element(c.id));
  const results = catalog.concepts.map(c => element(c.id, {dataset: {conceptId: c.id}, querySelector: () => ({setAttribute() {}, removeAttribute() {}})}));
  const nodes = Object.fromEntries([...articles, element('glossary-data', {textContent: JSON.stringify(catalog)}), element('glossary-query', {value: 'AVV'}), element('glossary-category', {value: 'legal-documents-and-flows'}), element('glossary-count'), element('glossary-empty'), element('glossary-reset')].map(e => [e.id, e]));
  const document = {getElementById: id => nodes[id], querySelectorAll: selector => selector.startsWith('#glossary-results') ? results : articles, addEventListener: (name, handler) => { events[name] = handler; }, documentElement: {getAttribute: () => 'de', classList: {add() {}}}};
  const window = {location: {hash: '#dpa'}, history: {pushState: (_state, _title, hash) => { window.location.hash = hash; }}, addEventListener: (name, handler) => { windowEvents[name] = handler; }};
  initGlossary(document, window);
  let prevented = false;
  events.click({target: {closest: () => ({getAttribute: () => '#glossary-detail'})}, button: 0, preventDefault: () => { prevented = true; }});
  assert.equal(prevented, true);
  assert.equal(focused, 'dpa');
  assert.equal(window.location.hash, '#dpa');
  assert.equal(nodes['glossary-query'].value, 'AVV');
  assert.equal(nodes['glossary-category'].value, 'legal-documents-and-flows');
  assert.equal(nodes.dpa.hidden, false);
  assert.equal(nodes.provider.hidden, true);
});
