import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import {gunzipSync} from 'node:zlib';
import {buildViewerArtifact,installViewerArtifact,startViewer} from './production.mjs';
const here=path.dirname(new URL(import.meta.url).pathname),tooling=path.dirname(here);
function fixture(t,when){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'static-viewer-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 execFileSync('python3',[path.join(here,'production_fixture.py'),root,...(when?[when]:[])],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
 const dist=path.join(root,'dist');fs.mkdirSync(path.join(dist,'assets'),{recursive:true});fs.writeFileSync(path.join(dist,'index.html'),'<!doctype html><script type="module" src="/assets/view.js"></script>');fs.writeFileSync(path.join(dist,'assets/view.js'),'document.title="Production fixture";');
 const artifact=path.join(root,'artifact');buildViewerArtifact({dist,out:artifact,revision:execFileSync('git',['-C',path.join(root,'sources/ORISO-Docs'),'rev-parse','HEAD'],{encoding:'utf8'}).trim()});return {root,artifact};
}
function raw(url,headers={}){return new Promise((resolve,reject)=>{http.get(url,{headers},res=>{const parts=[];res.on('data',b=>parts.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts)}));}).on('error',reject);});}
test('production HTTP serves a sealed build and exact compressed graph bytes, with guarded source routes',async t=>{
 const {root,artifact}=fixture(t),sourceRoot=path.join(root,'sources');
 const server=await startViewer({artifact,sourceRoot,repository:'ORISO-UserService',basePath:'/user-service/',port:0});t.after(()=>new Promise(r=>server.close(r)));
 const origin=`http://127.0.0.1:${server.address().port}/user-service/`;
 const home=await fetch(origin);assert.equal(home.status,200);assert.match(await home.text(),/\/user-service\/assets\/view.js/);
 assert.equal((await fetch(origin+'assets/view.js')).status,200);
 const graphBytes=fs.readFileSync(path.join(sourceRoot,'graph-generation/ORISO-UserService/.understand-anything/knowledge-graph.json'));
 const plain=await raw(origin+'knowledge-graph.json');assert.equal(plain.status,200);assert.deepEqual(plain.body,graphBytes);
 const zipped=await raw(origin+'knowledge-graph.json',{'Accept-Encoding':'gzip'});assert.equal(zipped.headers['content-encoding'],'gzip');assert.deepEqual(gunzipSync(zipped.body),graphBytes);assert.ok(zipped.body.length<graphBytes.length);
 const browser=await fetch(origin+'knowledge-graph.json');assert.deepEqual(Buffer.from(await browser.arrayBuffer()),graphBytes);
 assert.equal((await fetch(origin+'file-content.json?path=source.txt&nodeId=one')).status,200);
 assert.equal((await fetch(origin+'file-content.json?path=untracked.txt')).status,404);
 assert.equal((await fetch(origin+'file-content.json?path=source.txt&nodeId=two')).status,400);
 assert.equal((await fetch(origin+'file-content.json?path=..%2Fsecret')).status,400);
 assert.equal((await fetch(origin+'@vite/client')).status,404);
 assert.equal((await fetch(origin+'knowledge-graph.json',{method:'POST'})).status,405);
 fs.writeFileSync(path.join(sourceRoot,'ORISO-UserService/untracked.txt'),'PRIVATE_SENTINEL');
 const dirty=await fetch(origin+'file-content.json?path=source.txt&nodeId=one');assert.equal(dirty.status,503);assert.ok(!(await dirty.text()).includes('PRIVATE_SENTINEL'));
});
test('tampered builds, branch previews and dirty sources never open a production listener',async t=>{
 const {root,artifact}=fixture(t),sourceRoot=path.join(root,'sources'),args={artifact,sourceRoot,repository:'ORISO-UserService',port:0};
 fs.appendFileSync(path.join(artifact,'static/assets/view.js'),'tampered');await assert.rejects(startViewer(args),/artifact hash/);
 fs.writeFileSync(path.join(artifact,'static/assets/view.js'),'document.title="Production fixture";');
 fs.writeFileSync(path.join(sourceRoot,'ORISO-UserService/ignored.txt'),'PRIVATE_SENTINEL');
 fs.writeFileSync(path.join(sourceRoot,'ORISO-UserService/.git/info/exclude'),'ignored.txt\n');await assert.rejects(startViewer(args),/dirty|mismatched/);
 fs.rmSync(path.join(sourceRoot,'ORISO-UserService/ignored.txt'));
 const manifestFile=path.join(sourceRoot,'graph-generation/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));delete manifest.release;fs.writeFileSync(manifestFile,JSON.stringify(manifest));await assert.rejects(startViewer(args),/released generation/);
});

test('static build from a different documentation revision cannot represent the installed release',async t=>{
 const {root,artifact}=fixture(t);const p=path.join(artifact,'viewer-manifest.json'),m=JSON.parse(fs.readFileSync(p));m.sourceRevision='b'.repeat(40);fs.writeFileSync(p,JSON.stringify(m));
 await assert.rejects(startViewer({artifact,sourceRoot:path.join(root,'sources'),repository:'ORISO-UserService',port:0}),/documentation revision/);
});
test('actual pinned production build serves its asset chunks without exposing the bundled demo graph',{skip:!process.env.UNDERSTAND_TEST_UPSTREAM},async t=>{
 const {root}=fixture(t),artifact=path.join(root,'actual-artifact'),sourceRoot=path.join(root,'sources');
 const revision=execFileSync('git',['-C',path.join(sourceRoot,'ORISO-Docs'),'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const manifest=buildViewerArtifact({dist:path.join(process.env.UNDERSTAND_TEST_UPSTREAM,'understand-anything-plugin/packages/dashboard/dist'),out:artifact,revision});
 assert.ok(!manifest.files.some(f=>f.path==='static/knowledge-graph.json'));
 for(const [repository,basePath] of [['ORISO-UserService','/user-service/'],['ORISO-Platform','/platform/'],['ORISO-Supergraph','/supergraph/'],['ORISO-Docs','/docs/']]){
  const server=await startViewer({artifact,sourceRoot,repository,basePath,port:0});t.after(()=>new Promise(r=>server.close(r)));const origin=`http://127.0.0.1:${server.address().port}${basePath}`;
  const html=await(await fetch(origin+'?token=public-navigation-marker')).text();assert.ok(!html.includes('@vite/client'));
  const urls=[...html.matchAll(/(?:src|href)="((?:\.\/|\/)[^" ]+)"/g)].map(m=>m[1]);assert.ok(urls.length>=5);
  for(const route of urls)assert.equal((await fetch(new URL(route,origin))).status,200,route);
  // Fetch every sealed JS chunk too: lazy imports must resolve under each prefix.
  for(const file of manifest.files.filter(f=>f.path.endsWith('.js')))assert.equal((await fetch(new URL(file.path.replace(/^static\//,''),origin))).status,200,file.path);
  const graph=await(await fetch(origin+'knowledge-graph.json')).json();assert.equal(graph.project.name,repository);
  const aggregate=['ORISO-Platform','ORISO-Supergraph'].includes(repository),response=await fetch(origin+'file-content.json?path=source.txt&nodeId='+encodeURIComponent(aggregate?'ORISO-Docs::one':'one'));assert.equal(response.status,200);const source=await response.json();assert.equal(source.content,'Synthetic source text\n');
  if(aggregate){assert.equal(source.sourceRepo,'ORISO-Docs');assert.equal(source.sourceCommit,revision);}
 }
});

test('only matching immutable production artifact can switch the viewer current pointer',t=>{
 const {root,artifact}=fixture(t),destination=path.join(root,'static-releases'),currentLink=path.join(destination,'current'),generation=path.join(root,'sources/graph-generation');
 const installed=installViewerArtifact({artifact,destination,currentLink,generation});assert.equal(fs.realpathSync(currentLink),installed);
 assert.equal(installViewerArtifact({artifact,destination,currentLink,generation}),installed);
 fs.appendFileSync(path.join(artifact,'static/assets/view.js'),'tampered');assert.throws(()=>installViewerArtifact({artifact,destination,currentLink,generation}),/hash/);assert.equal(fs.realpathSync(currentLink),installed);
});

test('an old installed released generation keeps serving its honestly dated immutable bytes',async t=>{
 const {root,artifact}=fixture(t,'2020-01-01T00:00:00+00:00'),server=await startViewer({artifact,sourceRoot:path.join(root,'sources'),repository:'ORISO-UserService',port:0});t.after(()=>new Promise(r=>server.close(r)));
 const graph=await(await fetch(`http://127.0.0.1:${server.address().port}/knowledge-graph.json`)).json();assert.equal(graph.project.analyzedAt,'2020-01-01T00:00:00+00:00');
 assert.throws(()=>installViewerArtifact({artifact,destination:path.join(root,'new-install'),currentLink:path.join(root,'new-current'),generation:path.join(root,'sources/graph-generation')}));
});
