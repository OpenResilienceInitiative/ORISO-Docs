// Real patched Vite server; committed synthetic source is not delivery evidence.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const i=process.argv.indexOf('--upstream');
if(i<0)throw Error('Actual pinned upstream required');
const upstream=path.resolve(process.argv[i+1]);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'preview-runtime-'));
const graphDir=path.join(temp,'graph'),sourceDir=path.join(temp,'source');
fs.mkdirSync(path.join(graphDir,'.understand-anything'),{recursive:true});fs.mkdirSync(sourceDir);
const content='Synthetic public source fixture\n';
fs.writeFileSync(path.join(sourceDir,'example.txt'),content);
fs.writeFileSync(path.join(graphDir,'example.txt'),'Wrong-repository decoy\n');
const git=(...args)=>execFileSync('git',['-C',sourceDir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
git('init','-q');git('add','.');git('-c','user.name=UA Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Public preview source');
const sha=git('rev-parse','HEAD'),privateSHA='a'.repeat(40);
const vector={'ORISO-UserService':sha,'ORISO-Infra':privateSHA};
const sourceRepos=Object.entries(vector).map(([repo,gitCommitHash])=>({repo,gitCommitHash}));
const nodes=[{id:'ORISO-UserService::file:example.txt',filePath:'example.txt',sourceRepo:'ORISO-UserService',metadata:{sourceRepo:'ORISO-UserService',sourceCommit:sha}},
 {id:'ORISO-Infra::file:private.txt',filePath:'private.txt',sourceRepo:'ORISO-Infra',metadata:{sourceRepo:'ORISO-Infra',sourceCommit:privateSHA}}];
const graphPath=path.join(graphDir,'.understand-anything/knowledge-graph.json');
const save=g=>fs.writeFileSync(graphPath,JSON.stringify(g));
const supergraph={kind:'oriso-super-graph',project:{sourceCommits:vector},mergeMetadata:{sourceRepos},nodes};
save(supergraph);
const port=19000+Math.floor(Math.random()*10000),token='synthetic-runtime-fixture';
const child=spawn('npm',['exec','--yes','--package=pnpm@10.6.2','--','pnpm','--dir',upstream,'--filter','@understand-anything/dashboard','dev','--host','127.0.0.1','--port',String(port)],{stdio:'ignore',detached:true,env:{...process.env,UNDERSTAND_ACCESS_TOKEN:token,GRAPH_DIR:graphDir,ORISO_SOURCE_REPOSITORY:'ORISO-UserService',ORISO_SOURCE_REPOS:JSON.stringify({'ORISO-UserService':sourceDir})}});
async function preview(file,node,status){
 const params=new URLSearchParams({token,path:file,nodeId:node});
 const response=await fetch(`http://127.0.0.1:${port}/file-content.json?${params}`);assert.equal(response.status,status);
 const data=await response.json();if(status===200)assert.equal(data.content,content);else assert.ok(!('content' in data));return data;
}
try{
 let ready=false;for(let n=0;n<100;n++){try{await fetch(`http://127.0.0.1:${port}/`);ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}assert.ok(ready,'Actual pinned viewer did not start');
 await preview('example.txt',nodes[0].id,200);await preview('private.txt',nodes[1].id,422);await preview('example.txt',nodes[1].id,400);
 const platform={kind:'oriso-platform',project:{sourceCommits:vector},metadata:{sources:sourceRepos},nodes:nodes.map(n=>({...n,metadata:{sourceCommit:n.metadata.sourceCommit}}))};
 save(platform);await preview('example.txt',nodes[0].id,200);
 save({...platform,project:{sourceCommits:{...vector,'ORISO-Infra':'short'}}});
 assert.equal((await preview('example.txt',nodes[0].id,409)).errorCode,'SOURCE_IDENTITY_MISMATCH');
 save(platform);fs.writeFileSync(path.join(sourceDir,'example.txt'),'Changed source bytes');
 assert.equal((await preview('example.txt',nodes[0].id,409)).errorCode,'SOURCE_IDENTITY_MISMATCH');
 fs.writeFileSync(path.join(sourceDir,'example.txt'),content);
 save({nodes:[{id:'public',filePath:'example.txt'}]});
 // Single-repository viewers use GRAPH_DIR as their source root.
 fs.writeFileSync(path.join(graphDir,'example.txt'),content);await preview('example.txt','public',200);
 console.log('Actual pinned source preview: aggregate and platform exact source match; private repo unavailable; mixed vector, changed bytes and node mismatch rejected.');
}finally{try{process.kill(-child.pid,'SIGTERM');}catch{}fs.rmSync(temp,{recursive:true,force:true});}
