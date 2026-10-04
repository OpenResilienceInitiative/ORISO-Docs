// Actual patched Vite server fixture; synthetic token/source are never delivery evidence.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const i=process.argv.indexOf('--upstream');if(i<0)throw Error('Actual pinned upstream required');const upstream=path.resolve(process.argv[i+1]);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'preview-runtime-'));fs.mkdirSync(path.join(temp,'graph/.understand-anything'),{recursive:true});fs.mkdirSync(path.join(temp,'source'));const content='Synthetic public source fixture\n';fs.writeFileSync(path.join(temp,'source/example.txt'),content);
fs.writeFileSync(path.join(temp,'graph/.understand-anything/knowledge-graph.json'),JSON.stringify({mergeMetadata:{sourceRepos:[{repo:'ORISO-UserService'}]},nodes:[{id:'public',filePath:'example.txt',metadata:{sourceRepo:'ORISO-UserService'}},{id:'private',filePath:'private.txt',metadata:{sourceRepo:'ORISO-Infra'}}]}));
const port=19000+Math.floor(Math.random()*10000),token='synthetic-runtime-fixture';
const child=spawn('npm',['exec','--yes','--package=pnpm@10.6.2','--','pnpm','--dir',upstream,'--filter','@understand-anything/dashboard','dev','--host','127.0.0.1','--port',String(port)],{stdio:'ignore',detached:true,env:{...process.env,UNDERSTAND_ACCESS_TOKEN:token,GRAPH_DIR:path.join(temp,'graph'),ORISO_SOURCE_REPOSITORY:'ORISO-UserService',ORISO_SOURCE_REPOS:JSON.stringify({'ORISO-UserService':path.join(temp,'source')})}});
try{
 let ready=false;for(let n=0;n<100;n++){try{await fetch(`http://127.0.0.1:${port}/`);ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}assert.ok(ready,'Actual pinned viewer did not start');
 for(const [file,node,status] of [['example.txt','public',200],['private.txt','private',422],['example.txt','private',400]]){
  const params=new URLSearchParams({token,path:file,nodeId:node});const response=await fetch(`http://127.0.0.1:${port}/file-content.json?${params}`);assert.equal(response.status,status);const data=await response.json();
  if(status===200)assert.equal(crypto.createHash('sha256').update(data.content).digest('hex'),crypto.createHash('sha256').update(content).digest('hex'));else assert.ok(!('content' in data));
 }
 fs.writeFileSync(path.join(temp,'graph/.understand-anything/knowledge-graph.json'),JSON.stringify({nodes:[{id:'public',filePath:'example.txt'}]}));
 const single=await fetch(`http://127.0.0.1:${port}/file-content.json?${new URLSearchParams({token,path:'example.txt',nodeId:'public'})}`);assert.equal(single.status,200);assert.equal((await single.json()).content,content);
 console.log('Actual pinned source-preview runtime fixture: public hash matches; private unavailable; node mismatch rejected.');
}finally{try{process.kill(-child.pid,'SIGTERM');}catch{}fs.rmSync(temp,{recursive:true,force:true});}
