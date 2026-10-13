import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderFeatures} from '../render-features.mjs';
const data=JSON.parse(readFileSync(new URL('../features/catalog.json',import.meta.url)));
test('ten source-bound bilingual summaries link canonical localized docs',()=>{
 assert.equal(data.features.length,10);
 for(const locale of ['de','en']){
  const html=renderFeatures(data,locale);
  assert.match(html,new RegExp(`<html lang="${locale}"`));
  for(const feature of data.features){assert.match(feature.sourceHash,/^[a-f0-9]{64}$/);assert.match(feature.sourceRevision,/^[a-f0-9]{40}$/);assert.ok(html.includes(`https://docs.oriso.org/${locale}/${feature.route}`));}
  assert.ok(!html.includes('partly built'));
 }
});
test('renderer escapes source summaries and preserves subsection IDs',()=>{
 const html=renderFeatures({...data,features:[{...data.features[0],en:{title:'<bad>',summary:'<script>'}}]},'en');
 assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('id="ai-tools"'));
});
test('status source renders released source vector and missing evidence',()=>{
 const status=readFileSync(new URL('../assets/status.js',import.meta.url),'utf8');
 assert.ok(status.includes("status.branch"));assert.ok(status.includes('Status unavailable'));assert.ok(status.includes('status.releaseSources'));assert.ok(!status.includes('STALE_HOURS'));assert.ok(status.includes('Release bound'));
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(!home.includes('Branch main'));assert.ok(!home.includes('released and accepted'));
});

import vm from 'node:vm';
test('old release remains bound when exact vector matches; changed SHA is visibly unbound',async()=>{
 const script=readFileSync(new URL('../assets/status.js',import.meta.url),'utf8');
 for(const mismatch of [false,true]){
  const state={};const source={repository:'ORISO-Docs',ref:'refs/tags/v2.0.7',sourceSHA:'a'.repeat(40)};
  vm.runInNewContext(script,{document:{querySelectorAll:()=>[],querySelector:selector=>selector.includes('state')?state:null},Intl,Date,Number,String,Boolean,Set,fetch:async()=>({ok:true,json:async()=>({generatedAt:'2020-01-01T00:00:00Z',branch:source.ref,releaseVersion:'v2.0.7',releasedAt:'2020-01-01T00:00:00Z',releaseSources:[source],sources:[{...source,sourceSHA:(mismatch?'b':'a').repeat(40)}]})})});
  await new Promise(resolve=>setImmediate(resolve));assert.match(state.className,mismatch?/warn/:/ok/);
 }
});

test('repository cards show call coverage with unresolved calls in both languages',async()=>{
 const script=readFileSync(new URL('../assets/status.js',import.meta.url),'utf8');
 const appended=[];const card={querySelector:()=>null,appendChild:line=>appended.push(line)};
 const el=()=>{const node={attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},appendChild(c){this.children.push(c);}};return node;};
 const nodes={closest:()=>card};
 const source={name:'ORISO-UserService',repository:'ORISO-UserService',ref:'refs/heads/dev',sourceSHA:'a'.repeat(40),nodes:10,calls:{confirmed:20648,possible:6023,unresolved:147611,status:'partial'}};
 vm.runInNewContext(script,{document:{querySelectorAll:selector=>selector.includes('ORISO-UserService')?[nodes]:[],querySelector:()=>null,createElement:el},Intl,Date,Number,String,Boolean,Set,fetch:async()=>({ok:true,json:async()=>({generatedAt:'2020-01-01T00:00:00Z',branch:'dev',sources:[source,{...source,name:'ORISO-Empty',calls:{confirmed:0,possible:0,unresolved:0}}]})})});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(appended.length,1);
 const [deText,enText]=appended[0].children.map(c=>c.textContent);
 assert.equal(deText,'Aufrufe: 20.648 quellseitig aufgelöst · 6.023 möglich · 147.611 nicht aufgelöst. Enge statische Quellregeln; keine Bestätigung durch Compiler, Typprüfung oder Laufzeit.');
 assert.equal(enText,'Calls: 20,648 source-resolved · 6,023 possible · 147,611 unresolved. Narrow static source rules; no compiler, type-checker or runtime verification.');
 assert.deepEqual(appended[0].children.map(c=>c.attrs.lang),['de','en']);
});
test('reader sees exact repository revision and generation time while a failed later refresh stays separate',async()=>{
 const script=readFileSync(new URL('../assets/status.js',import.meta.url),'utf8'),rows=[],attempt={appendChild(child){this.textContent += child.textContent;}};
 const createElement=()=>({children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},appendChild(v){this.children.push(v);}});
 const source={name:'ORISO-Docs',repository:'ORISO-Docs',ref:'refs/tags/v2.0.7',sourceSHA:'a'.repeat(40),fetchedAt:'2026-10-01T08:00:00Z',nodes:10};
 const status={generatedAt:'2026-10-01T09:00:00Z',generationId:'installed-one',branch:source.ref,releaseVersion:'v2.0.7',releasedAt:'2026-10-01T07:00:00Z',releaseSources:[source],sources:[source]};
 vm.runInNewContext(script,{document:{createElement,querySelectorAll:()=>[],querySelector:s=>s==='[data-ua="source-list"]'?{appendChild:r=>rows.push(r)}:s==='[data-ua="attempt"]'?attempt:null},Intl,Date,Number,String,Boolean,Set,fetch:async url=>({ok:true,json:async()=>url==='/status.json'?status:{schemaVersion:'oriso.refresh-attempt/v1',state:'failed',attemptId:'123-1',attemptedAt:'2026-10-02T10:00:00Z',releaseVersion:'v2.0.8',documentationRevision:'b'.repeat(40),phase:'generation',errorCode:'GENERATION_FAILED',installed:{generationId:'installed-one',releaseVersion:'v2.0.7'}}})});
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(rows.length,1);const row=rows[0];assert.equal(row.children[0].children[0].textContent,'ORISO-Docs');assert.equal(row.children[1].children[0].textContent,'a'.repeat(40));assert.equal(row.children[2].textContent,'refs/tags/v2.0.7');assert.equal(row.children[3].textContent,'2026-10-01T09:00:00Z');
 assert.match(attempt.textContent,/v2.0.8/);assert.match(attempt.textContent,/GENERATION_FAILED/);assert.match(attempt.textContent,/v2.0.7/);
});
