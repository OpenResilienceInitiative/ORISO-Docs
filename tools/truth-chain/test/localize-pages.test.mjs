import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeGeneratedPage} from '../lib/localize-pages.mjs';
import {renderGeneratedPages} from '../lib/generate-pages.mjs';
test('template labels localize but arbitrary original-source quotations and inline data are byte-stable',()=>{
 const quotation='Architecture tiers and Endpoint inventory are source names.';
 const text='# Endpoint inventory\n\n## Source evidence quotation (original language)\n\n> '+quotation+'\n\n`/Architecture tiers`\n';
 const de=localizeGeneratedPage(text,'de',[quotation]);
 assert.match(de,/^# Endpunktinventar/);assert.ok(de.includes(quotation));assert.ok(de.includes('`/Architecture tiers`'));
 assert.match(de,/Zitat aus dem Quellnachweis/);
});
test('every fixed generated template gets bilingual prose while refs and SHAs remain exact',()=>{
 const exp={generatedAt:'2026-09-30T00:00:00Z',repos:[{name:'ORISO-UserService',summary:'Exact original description',commit:'a'.repeat(40),tier:'Backend',nodeCount:2}],endpoints:[],dependsOn:[],tiers:[],graphSource:{generationId:'fixture-id',sources:[{repository:'ORISO-UserService',ref:'refs/heads/dev',sourceSHA:'a'.repeat(40)}]}};
 for(const text of renderGeneratedPages(exp).values()) {
  const de=localizeGeneratedPage(text,'de',exp.repos.map(r=>r.summary));
  assert.ok(de.includes('Diese Seite wird'));assert.ok(de.includes('Herkunft der Quellgeneration'));
  assert.ok(de.includes('`refs/heads/dev`'));assert.ok(de.includes('`'+'a'.repeat(40)+'`'));
  assert.equal(de.includes('This page is'),false);
 }
});
