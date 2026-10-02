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
