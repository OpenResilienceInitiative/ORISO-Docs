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
test('curated graph concepts carry complete bilingual business labels and shared Topic/Category meaning',()=>{
  const data=validateGlossary(catalog());
  const provider=data.concepts.find(c=>c.id==='provider').graphMappings.find(m=>m.mode==='domain-concept');
  assert.deepEqual(provider.label,{de:'Trägerverzeichnis',en:'Provider registry'});
  for(const id of ['topic','category']) {
    const mapping=data.concepts.find(c=>c.id===id).graphMappings.find(m=>m.nodeId==='concept:topics');
    assert.ok(mapping,`${id} must be discoverable through the curated topic/category node`);
    assert.deepEqual(mapping.label,{de:'Themen und Kategorien',en:'Topics and Categories'});
  }
});
test('missing bilingual concept labels and conflicting shared-node labels block publication',()=>{
  const missing=catalog();delete missing.concepts.find(c=>c.id==='provider').graphMappings.find(m=>m.mode==='domain-concept').label.en;
  assert.throws(()=>validateGlossary(missing), /provider.*graphMappings.*label.en/);
  const conflicting=catalog();conflicting.concepts.find(c=>c.id==='category').graphMappings.find(m=>m.mode==='domain-concept').label.en='Different category label';
  assert.throws(()=>validateGlossary(conflicting), /category.*conflicting.*concept:topics/);
  const wrongTarget=catalog();wrongTarget.concepts.find(c=>c.id==='provider').graphMappings.find(m=>m.mode==='domain-concept').nodeId='file:TenantEntity.java';
  assert.throws(()=>validateGlossary(wrongTarget), /provider.*domain-concept.*concept-qualified/);
});

test('preferred terms and authored domain prose reject Agency and Tenant with narrowly recorded explanatory exceptions', () => {
  const renamed = catalog(); renamed.concepts.find(c => c.id === 'counselling-centre').en.term = 'Agency';
  assert.throws(() => validateGlossary(renamed), /counselling-centre.*en.term.*Agency/);
  for (const field of ['context', 'responsibility', 'invariant', 'editorialNote']) {
    const prose = catalog(); prose.concepts.find(c => c.id === 'provider')[field].en = 'Tenant owns the legal context';
    assert.throws(() => validateGlossary(prose), new RegExp(`provider.*${field}.en.*Tenant`));
  }
  const valid = catalog();
  assert.ok(validateGlossary(valid));
  const excepted = valid.copyPolicy.allowlist[0];
  assert.ok(excepted, 'technical tenancy explanation needs an explicit exception');
  const changed = catalog();
  const concept = changed.concepts.find(c => c.id === excepted.conceptId);
  const parts = excepted.field.split('.');
  let target = concept; for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] += ' New human wording uses Tenant and Agency.';
  assert.throws(() => validateGlossary(changed), /deprecated human wording/);
});
