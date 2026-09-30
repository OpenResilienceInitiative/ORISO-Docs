import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const corePath=process.env.UA_CORE;
if (!corePath) throw new Error('UA_CORE must point to the pinned, patched core dist/index.js');
const {validateGraph}=await import(pathToFileURL(corePath));
const relations=['exposes','consumes','owns','governs','calls_unconfirmed','mentions','proposes_for','on_error','compensates'];
function fixture() {return {version:'1.0.0',schemaVersion:'oriso.ua.graph/v1',generationId:'test-generation',kind:'oriso-platform', project:{name:'ORISO-Platform',description:'Platform',languages:[],frameworks:[],analyzedAt:new Date().toISOString(),gitCommitHash:null,sourceCommits:{'ORISO-Frontend':'a'.repeat(40)}},nodes:[{id:'a',type:'service',name:'Caller',summary:'Caller',tags:[],complexity:'simple'},{id:'b',type:'endpoint',name:'Endpoint',summary:'Endpoint',tags:[],complexity:'simple'}],edges:relations.map(type=>({source:'a',target:'b',type,direction:'forward',weight:1,metadata:{certainty:type==='calls_unconfirmed'?'unconfirmed':'source-backed',sourceSHA:'a'.repeat(40)}})),layers:[{id:'all',name:'All',description:'All',nodeIds:['a','b']}],tour:[]};}
test('platform consumer preserves every relation, provenance and generation',()=>{const graph=fixture(), result=validateGraph(graph);assert.equal(result.success,true);assert.deepEqual(result.issues,[]);assert.deepEqual(result.data,graph);});
test('ORISO consumer rejects malformed relations rather than dropping them',()=>{const graph=fixture();graph.edges[0].type='invented_relation';assert.equal(validateGraph(graph).success,false);});
test('ORISO consumer rejects duplicates and dangling tour references',()=>{const graph=fixture();graph.nodes.push({...graph.nodes[0]});assert.equal(validateGraph(graph).success,false);const other=fixture();other.tour=[{order:1,title:'Broken',description:'Missing',nodeIds:['missing']}];assert.equal(validateGraph(other).success,false);});
test('aggregate commits cannot be null without a source vector',()=>{const graph=fixture();delete graph.project.sourceCommits;assert.equal(validateGraph(graph).success,false);});
const {verifyConsumer}=await import('../ua-validate-consumer.mjs');
test('release consumer gate rejects silent repairs and version omissions',()=>{const graph=fixture();assert.throws(()=>verifyConsumer(graph,()=>({success:true,issues:[],data:{...graph,edges:[]}})),/changed graph/);const invalid=fixture();delete invalid.version;assert.throws(()=>verifyConsumer(invalid,validateGraph),/rejected/);});

import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
test('symlinked consumer CLI cannot silently skip invalid generation validation',()=>{
  const root=mkdtempSync(join(tmpdir(),'ua-consumer-link-'));
  try {
    const link=join(root,'validate.mjs');
    symlinkSync(fileURLToPath(new URL('../ua-validate-consumer.mjs',import.meta.url)),link);
    writeFileSync(join(root,'manifest.json'),JSON.stringify({graphs:[{repository:'ORISO-Frontend',path:'broken.json'}]}));
    writeFileSync(join(root,'broken.json'),'{}');
    const result=spawnSync(process.execPath,[link,root],{encoding:'utf8',env:{...process.env,UA_CORE:corePath}});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/ORISO strict consumer schema is required/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
