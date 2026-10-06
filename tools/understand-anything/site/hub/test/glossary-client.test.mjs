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
