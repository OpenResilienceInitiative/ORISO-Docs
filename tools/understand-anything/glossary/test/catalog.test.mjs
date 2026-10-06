import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGlossary} from '../validate.mjs';
const catalog = () => JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url)));
test('readers receive a complete bilingual vocabulary including provider and the agreement annex distinction', () => {
  const data = validateGlossary(catalog());
  const byId = new Map(data.concepts.map(c => [c.id,c]));
  assert.equal(byId.get('provider').en.term, 'Provider');
  assert.match(byId.get('dpa').en.definition, /Annex 1/);
  assert.match(byId.get('platform-services-agreement').en.definition, /including its annexes/);
  for (const c of data.concepts) for (const lang of ['de','en']) assert.ok(c[lang].example.trim(), c.id);
});
test('missing translations and unresolved related targets block publication with the term and field', () => {
  const missing = catalog(); missing.concepts[1].en.definition = '';
  assert.throws(() => validateGlossary(missing), /provider.*en.definition/);
  const dangling = catalog(); dangling.concepts[1].related.push('nonexistent');
  assert.throws(() => validateGlossary(dangling), /provider.*related.*nonexistent/);
});
test('the provided partner glossary is discoverable and draft practice vocabulary cannot appear delivered', () => {
  const data=validateGlossary(catalog());
  assert.equal(data.reconciliation.length,36);
  assert.ok(data.concepts.find(c => c.id==='workstream').aliases.en.includes('WS'));
  assert.ok(data.concepts.find(c => c.id==='runtime-environment').aliases.de.includes('RTE'));
  assert.equal(data.concepts.filter(c=>c.editorialState==='draft').length,5);
  assert.equal(data.concepts.find(c=>c.id==='dev-ali-environment').editorialState,'historical');
  assert.equal(data.concepts.find(c=>c.id==='supervision').sources[0].state,'proposed');
});
test('catalog rejects duplicate IDs, unqualified deprecated wording, invalid provenance and private paths',()=>{
  const duplicate=catalog();duplicate.concepts[1].id=duplicate.concepts[0].id;
  assert.throws(()=>validateGlossary(duplicate), /duplicate/);
  const deprecated=catalog();deprecated.concepts[1].deprecatedTerms[0].reason='';
  assert.throws(()=>validateGlossary(deprecated), /provider.*reason/);
  const badHash=catalog();badHash.concepts[1].sources[0].sourceHash='missing';
  assert.throws(()=>validateGlossary(badHash), /provider.*sourceHash/);
  const privatePath=catalog();privatePath.concepts[1].en.example='/Users/test/private.txt';
  assert.throws(()=>validateGlossary(privatePath), /provider.*en.example.*private/);
  const staleRow=catalog();staleRow.reconciliation[0].conceptIds=['missing'];
  assert.throws(()=>validateGlossary(staleRow), /bjorn-01.*missing/);
});
test('omitting a partner input or silently preferring inherited mistranslation is rejected',()=>{
  const omitted=catalog();omitted.reconciliation.pop();
  assert.throws(()=>validateGlossary(omitted),/reconciliation.*36/);
  const incorrectCopy=catalog();incorrectCopy.concepts[2].en.definition='An Agency Unit offers counselling.';
  assert.throws(()=>validateGlossary(incorrectCopy),/counselling-centre.*en.definition.*Agency Unit/);
});
