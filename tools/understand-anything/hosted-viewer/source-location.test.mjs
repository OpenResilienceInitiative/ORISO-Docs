import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {sourceLocation} from './source-location.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'graph-source-'));const docs=path.join(root,'docs');const repo=path.join(root,'repo');fs.mkdirSync(docs);fs.mkdirSync(repo);fs.writeFileSync(path.join(docs,'same.txt'),'docs');fs.writeFileSync(path.join(repo,'same.txt'),'repo');fs.symlinkSync(path.join(docs,'same.txt'),path.join(repo,'escape.txt'));
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
git('init','-q');git('add','same.txt');git('-c','user.name=UA Fixture','-c','user.email=fixture@example.invalid','commit','-qm','Source fixture');
const sha=git('rev-parse','HEAD');
const n={id:'Repo::file:same.txt',filePath:'same.txt',metadata:{sourceRepo:'Repo'}};const graph={project:{sourceCommits:{Repo:sha}},mergeMetadata:{sourceRepos:[{repo:'Repo',gitCommitHash:sha}]},nodes:[n,{...n,id:'escape',filePath:'escape.txt'}]};
test('uses source repository even when docs has same filename',()=>{const r=sourceLocation(graph,docs,'same.txt',n.id,{Repo:repo});assert.equal(fs.readFileSync(r.absoluteFile,'utf8'),'repo')});
test('requires exact node and path',()=>{assert.equal(sourceLocation(graph,docs,'same.txt',null,{Repo:repo}).statusCode,400);assert.equal(sourceLocation(graph,docs,'other.txt',n.id,{Repo:repo}).statusCode,400)});
test('does not expose unlisted repositories',()=>assert.equal(sourceLocation(graph,docs,'same.txt',n.id,{}).errorCode,'SOURCE_UNAVAILABLE_REPO'));
test('rejects traversal and symlink escape',()=>{assert.equal(sourceLocation(graph,docs,'../docs/same.txt',n.id,{Repo:repo}).statusCode,400);assert.equal(sourceLocation(graph,docs,'escape.txt','escape',{Repo:repo}).statusCode,400)});
test('single repository retains graph membership requirement',()=>{const g={nodes:[{filePath:'same.txt'}]};assert.equal(sourceLocation(g,repo,'same.txt',null).absoluteFile,fs.realpathSync(path.join(repo,'same.txt')));assert.equal(sourceLocation(g,repo,'escape.txt',null).statusCode,404)});
test('missing source remains a genuine error',()=>{const g={nodes:[{filePath:'gone.txt'}]};assert.equal(sourceLocation(g,repo,'gone.txt',null).errorCode,'SOURCE_NOT_FOUND')});
process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));

test('platform preview retains repository and exact source revision across colliding paths',()=>{
  const platform={kind:'oriso-platform',project:{sourceCommits:{Repo:sha}},metadata:{sources:[{repo:'Repo',gitCommitHash:sha}]},nodes:[{id:'Repo::file:same.txt',filePath:'same.txt',sourceRepo:'Repo',metadata:{sourceCommit:sha}}]};
  const r=sourceLocation(platform,docs,'same.txt',platform.nodes[0].id,{Repo:repo});
  assert.equal(fs.readFileSync(r.absoluteFile,'utf8'),'repo');
  assert.equal(r.sourceRepo,'Repo');assert.equal(r.sourceCommit,sha);
});

test('aggregate preview rejects conflicting identity, incomplete vectors and changed source',()=>{
  const platform={kind:'oriso-platform',project:{sourceCommits:{Repo:sha}},metadata:{sources:[{repo:'Repo',gitCommitHash:sha}]},nodes:[{id:'Repo::file:same.txt',filePath:'same.txt',sourceRepo:'Repo',metadata:{sourceCommit:sha}}]};
  const resolve=g=>sourceLocation(g,docs,'same.txt','Repo::file:same.txt',{Repo:repo});
  for(const g of [
    {...platform,project:{sourceCommits:{Repo:sha,Other:'short'}}},
    {...platform,metadata:{}},
    {...platform,nodes:[{...platform.nodes[0],sourceRepo:'Other'}]},
    {...platform,project:{sourceCommits:{Repo:'b'.repeat(40)}},metadata:{sources:[{repo:'Repo',gitCommitHash:'b'.repeat(40)}]}},
    {...platform,metadata:{sources:[{repo:'Repo',gitCommitHash:sha},{repo:'Other',gitCommitHash:'a'.repeat(40)}]}},
    {...platform,nodes:[{...platform.nodes[0],metadata:{sourceRepo:'Other',sourceCommit:sha}}]},
    {...platform,nodes:[{...platform.nodes[0],metadata:{sourceCommit:'a'.repeat(40)}}]},
    {...platform,project:{sourceCommits:{Repo:'a'.repeat(40)}}}
  ])assert.equal(resolve(g).errorCode,'SOURCE_IDENTITY_MISMATCH');
  fs.writeFileSync(path.join(repo,'same.txt'),'changed since graph generation');
  try{assert.equal(resolve(platform).errorCode,'SOURCE_IDENTITY_MISMATCH');}finally{fs.writeFileSync(path.join(repo,'same.txt'),'repo');}
});

test('aggregate identity cannot be bypassed by missing declaration metadata',()=>{
 const damaged={kind:'oriso-super-graph',project:{sourceCommits:{Repo:sha}},nodes:[n]};
 assert.equal(sourceLocation(damaged,docs,'same.txt',n.id,{Repo:repo}).errorCode,'SOURCE_IDENTITY_MISMATCH');
});
