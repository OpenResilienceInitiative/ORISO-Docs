import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script = new URL('../ua-build-supergraph.mjs',import.meta.url);
function fixture(fn){const base=mkdtempSync(join(tmpdir(),'ua-supergraph-'));try{fn(base);}finally{rmSync(base,{recursive:true,force:true});}}
function repo(base,name,sha){const dir=join(base,name,'.understand-anything');mkdirSync(dir,{recursive:true});const graph={version:'1.0.0',project:{name,description:name,languages:['java'],frameworks:[],analyzedAt:new Date().toISOString(),gitCommitHash:sha},nodes:[{id:'same-id',type:'file',name:'Source',summary:'Source',tags:[],complexity:'simple',metadata:{sourceFingerprint:'b'.repeat(64)}}],edges:[],layers:[],tour:[]};writeFileSync(join(dir,'knowledge-graph.json'),JSON.stringify(graph));writeFileSync(join(dir,'meta.json'),JSON.stringify({gitCommitHash:sha}));}
function run(base){return spawnSync(process.execPath,[script.pathname,'--out',join(base,'out')],{encoding:'utf8',env:{...process.env,UA_BASE:base,UA_REPOSITORIES:'ORISO-Frontend,ORISO-UserService'}});}
test('missing required repo fails aggregate generation',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));assert.notEqual(run(base).status,0);assert.equal(existsSync(join(base,'out/knowledge-graph.json')),false);}));
test('aggregate retains full source vector, unique IDs and source provenance',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));const result=run(base);assert.equal(result.status,0,result.stderr);const graph=JSON.parse(readFileSync(join(base,'out/knowledge-graph.json')));assert.equal(graph.project.gitCommitHash,null);assert.deepEqual(graph.project.sourceCommits,{'ORISO-Frontend':'a'.repeat(40),'ORISO-UserService':'c'.repeat(40)});assert.equal(new Set(graph.nodes.map(n=>n.id)).size,graph.nodes.length);assert.equal(graph.nodes.find(n=>n.id==='ORISO-Frontend::same-id').metadata.sourceFingerprint,'b'.repeat(64));}));
test('graph/meta disagreement fails before aggregate is emitted',()=>fixture(base=>{repo(base,'ORISO-Frontend','a'.repeat(40));repo(base,'ORISO-UserService','c'.repeat(40));writeFileSync(join(base,'ORISO-Frontend/.understand-anything/meta.json'),JSON.stringify({gitCommitHash:'b'.repeat(40)}));assert.notEqual(run(base).status,0);assert.equal(existsSync(join(base,'out/knowledge-graph.json')),false);}));
