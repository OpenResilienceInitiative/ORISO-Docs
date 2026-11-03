import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script = new URL('../ua-build-supergraph.mjs',import.meta.url);
function fixture(fn){const base=mkdtempSync(join(tmpdir(),'ua-supergraph-'));try{fn(base);}finally{rmSync(base,{recursive:true,force:true});}}
function repo(base,name,sha){const dir=join(base,name,'.understand-anything');mkdirSync(dir,{recursive:true});const graph={version:'1.0.0',project:{name,description:name,languages:['java'],frameworks:[],analyzedAt:new Date().toISOString(),gitCommitHash:sha},nodes:[{id:'same-id',type:'file',name:'Source',summary:'Source',tags:[],complexity:'simple',metadata:{sourceFingerprint:'b'.repeat(64)}}],edges:[],layers:[],tour:[],relationCoverage:{imports:{emitted:0,unresolved:0,unsupported:0,status:'complete'},calls:{emitted:0,unresolved:0,unsupported:0,status:'complete'}}};writeFileSync(join(dir,'knowledge-graph.json'),JSON.stringify(graph));writeFileSync(join(dir,'meta.json'),JSON.stringify({gitCommitHash:sha}));}
function run(base){return spawnSync(process.execPath,[script.pathname,'--out',join(base,'out')],{encoding:'utf8',env:{...process.env,UA_BASE:base,UA_REPOSITORIES:'ORISO-Frontend,ORISO-UserService'}});}
test('missing required repo fails aggregate generation',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));assert.notEqual(run(base).status,0);assert.equal(existsSync(join(base,'out/knowledge-graph.json')),false);}));
test('aggregate retains full source vector, unique IDs and source provenance',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));const result=run(base);assert.equal(result.status,0,result.stderr);const graph=JSON.parse(readFileSync(join(base,'out/knowledge-graph.json')));assert.equal(graph.project.gitCommitHash,null);assert.deepEqual(graph.project.sourceCommits,{'ORISO-Frontend':'a'.repeat(40),'ORISO-UserService':'c'.repeat(40)});assert.equal(new Set(graph.nodes.map(n=>n.id)).size,graph.nodes.length);assert.equal(graph.nodes.find(n=>n.id==='ORISO-Frontend::same-id').metadata.sourceFingerprint,'b'.repeat(64));}));
test('graph/meta disagreement fails before aggregate is emitted',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));writeFileSync(join(base,'ORISO-Frontend/.understand-anything/meta.json'),JSON.stringify({gitCommitHash:'b'.repeat(40)}));assert.notEqual(run(base).status,0);assert.equal(existsSync(join(base,'out/knowledge-graph.json')),false);}));
test('native aggregate preserves honest relation coverage and bounded source-qualified diagnostics without pipeline post-processing',()=>fixture(base=>{
  repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));
  for(const [name,unresolved,unsupported] of [['ORISO-Frontend',2,1],['ORISO-UserService',5,3]]){
    const file=join(base,name,'.understand-anything/knowledge-graph.json');const graph=JSON.parse(readFileSync(file));
    graph.edges=[{source:'same-id',target:'same-id',type:'calls_unconfirmed',direction:'forward',weight:0.5}];
    graph.relationCoverage={imports:{emitted:0,unresolved:0,unsupported:0,status:'complete'},calls:{emitted:0,unresolved,unsupported:unsupported+1,status:'partial'},calls_unconfirmed:{emitted:1,unresolved:0,unsupported:0,status:'complete'}};
    graph.metadata={extraction:{unresolvedCalls:[{file:'src/Caller.java',caller:'unknown',reason:'target-not-indexed-or-unresolved'}],diagnostics:{unresolvedCalls:{total:unresolved,retained:1,omitted:unresolved-1},unsupportedInputs:{total:unsupported,byRelation:{calls:unsupported}}}}};
    writeFileSync(file,JSON.stringify(graph));
  }
  const result=run(base);assert.equal(result.status,0,result.stderr);const graph=JSON.parse(readFileSync(join(base,'out/knowledge-graph.json')));
  assert.deepEqual(graph.relationCoverage.calls,{emitted:0,unresolved:7,unsupported:6,status:'partial'});
  assert.deepEqual(graph.relationCoverage.calls_unconfirmed,{emitted:2,unresolved:0,unsupported:0,status:'complete'});
  assert.deepEqual(graph.relationCoverage.contains,{emitted:2,unresolved:0,unsupported:0,status:'complete'});
  assert.equal(graph.metadata.extraction.diagnostics.unresolvedCalls.total,7);
  assert.deepEqual(graph.metadata.extraction.unresolvedCalls.map(sample=>[sample.sourceRepo,sample.sourceCommit]),[['ORISO-Frontend','a'.repeat(40)],['ORISO-UserService','c'.repeat(40)]]);
  assert.equal(graph.metadata.coverageProvenance.runtimeVerified,false);
  const checked=spawnSync('python3',['-c','import json,sys;from bundle.contract import graph_check;graph_check(json.load(open(sys.argv[1])))',join(base,'out/knowledge-graph.json')],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(checked.status,0,checked.stderr);
}));
test('missing or malformed input measurements fail instead of appearing as complete zero coverage',()=>{
  for(const invalid of [null,{imports:{emitted:0,unresolved:0,unsupported:0,status:'complete'},calls:{emitted:0,unresolved:-1,unsupported:0,status:'complete'}}])fixture(base=>{
    repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));
    const file=join(base,'ORISO-Frontend/.understand-anything/knowledge-graph.json');const graph=JSON.parse(readFileSync(file));graph.relationCoverage=invalid;writeFileSync(file,JSON.stringify(graph));
    const result=run(base);assert.notEqual(result.status,0);assert.match(result.stderr,/source relation coverage/);assert.equal(existsSync(join(base,'out/knowledge-graph.json')),false);
  });
});
