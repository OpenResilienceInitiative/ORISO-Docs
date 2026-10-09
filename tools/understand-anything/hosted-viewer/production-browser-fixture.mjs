/** Local controlled browser fixture. Never an actual release or host activation. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildViewerArtifact,startViewer} from './production.mjs';
import {recordAttempt} from '../site/hub/attempt.mjs';
import {callCoverage} from '../site/hub/publication.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);if(i>=0)return process.argv[i+1];if(fallback!==undefined)return fallback;throw Error('Required '+key);};
const out=path.resolve(arg('--out')),port=Number(arg('--port','19370'));
if(process.argv.includes('--runtime')&&process.argv.includes('--upstream'))throw Error('Choose --runtime or --upstream');
const upstream=fs.realpathSync(process.argv.includes('--runtime')?path.join(path.resolve(arg('--runtime')),'upstream'):path.resolve(arg('--upstream')));
const reuse=process.argv.includes('--reuse')?fs.realpathSync(arg('--reuse')):null;
if(fs.existsSync(out))throw Error('Preserve existing fixture evidence; choose a fresh --out directory');
fs.mkdirSync(out,{recursive:true});
if(reuse){
 if(fs.existsSync(path.join(reuse,'fullscale-binding.json')))fs.copyFileSync(path.join(reuse,'fullscale-binding.json'),path.join(out,'fullscale-binding.json'));
}else execFileSync('python3',[path.join(here,'production_fixture.py'),out],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',UNDERSTAND_FIXTURE_CORE:path.join(upstream,'understand-anything-plugin/packages/core/dist/index.js')},stdio:'pipe'});
const sourceRoot=fs.realpathSync(reuse?JSON.parse(fs.readFileSync(path.join(reuse,'fixture.json'))).sourceRoot:path.join(out,'sources'));
const generation=path.join(sourceRoot,'graph-generation'),manifest=JSON.parse(fs.readFileSync(path.join(generation,'manifest.json')));
const artifact=path.join(out,'viewer');buildViewerArtifact({dist:path.join(upstream,'understand-anything-plugin/packages/dashboard/dist'),out:artifact,revision:manifest.release.lock.documentationRevision});
const hub=path.join(out,'hub');fs.mkdirSync(path.join(hub,'assets'),{recursive:true});
for(const file of ['index.html','assets/status.js','assets/lang.js','assets/hub.css'])fs.copyFileSync(path.join(here,'../site/hub',file),path.join(hub,file));
const binding=fs.existsSync(path.join(out,'fullscale-binding.json'))?JSON.parse(fs.readFileSync(path.join(out,'fullscale-binding.json'))):null;
const realSources=binding?.repositories?Object.fromEntries(Object.entries(binding.repositories).map(([name,record])=>[name,record.sourceSHA])):binding?.sourceSHA?{'ORISO-UserService':binding.sourceSHA}:{};
const syntheticSources=manifest.sources.length-Object.keys(realSources).length;
const sourceBoundary=Object.keys(realSources).length?`actual committed ${Object.keys(realSources).join(', ')} source trees and ${syntheticSources} synthetic source trees`:`${syntheticSources} synthetic source trees`;
fs.writeFileSync(path.join(hub,'index.html'),fs.readFileSync(path.join(hub,'index.html'),'utf8').replace('<body>',`<body><p class="note">Controlled local fixture: ${sourceBoundary}. No published release or public delivery.</p>`));
const sources=manifest.sources.map(source=>{const graph=JSON.parse(fs.readFileSync(path.join(generation,source.repository,'.understand-anything/knowledge-graph.json')));return {...source,name:source.repository,nodes:graph.nodes.length,calls:callCoverage(graph)};});
const aggregates=['ORISO-Platform','ORISO-Supergraph'].map(repository=>{const graph=JSON.parse(fs.readFileSync(path.join(generation,repository,'.understand-anything/knowledge-graph.json')));return {name:repository,repository,nodes:graph.nodes.length,sourceCommits:graph.project.sourceCommits,coverage:manifest.sources.map(source=>({repository:source.repository,sourceCommit:source.sourceSHA,status:'included'}))};});
fs.writeFileSync(path.join(hub,'status.json'),JSON.stringify({generationId:manifest.generationId,generatedAt:manifest.generatedAt,releaseVersion:manifest.release.lock.version,releasedAt:manifest.release.publishedAt,releaseSources:manifest.release.lock.sources,branch:'controlled-fixture',sources,aggregates,repositories:sources.length,nodes:sources.reduce((n,s)=>n+s.nodes,0)})+'\n');
const receipt=path.join(out,'ops/refresh-attempt.json');recordAttempt({output:receipt,current:hub,input:{state:'failed',attemptId:'controlled-fixture',attemptedAt:new Date().toISOString(),releaseVersion:'v2.0.8',phase:'generation',errorCode:'GENERATION_FAILED'}});
const services=new Map(),servers=[];
for(const [repository,basePath] of [['ORISO-UserService','/user-service/'],['ORISO-Keycloak','/keycloak/'],['ORISO-Platform','/platform/'],['ORISO-Supergraph','/supergraph/']]){
 const started=performance.now(),server=await startViewer({artifact,sourceRoot,repository,basePath,port:0});servers.push(server);services.set(basePath,server.address().port);
 fs.appendFileSync(path.join(out,'startup.jsonl'),JSON.stringify({repository,startedInMs:Math.round(performance.now()-started),fixture:true})+'\n');
}
const allowed=new Set(['index.html','status.json','assets/hub.css','assets/lang.js','assets/status.js']);
const gateway=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 for(const [basePath,targetPort] of services)if(pathname.startsWith(basePath)){
  const proxy=http.request({host:'127.0.0.1',port:targetPort,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});proxy.on('error',()=>{res.writeHead(502);res.end();});req.pipe(proxy);return;
 }
 const name=pathname==='/'?'index.html':pathname.slice(1),file=pathname==='/refresh-attempt.json'?receipt:allowed.has(name)?path.join(hub,name):null;
 if(!file){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/json','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>gateway.listen(port,'127.0.0.1',resolve));servers.push(gateway);
fs.writeFileSync(path.join(out,'fixture.json'),JSON.stringify({fixture:true,evidenceScope:'controlled-local-fixture',syntheticReleaseEnvelope:true,realSources,syntheticSources,viewerManifestSHA256:createHash('sha256').update(fs.readFileSync(path.join(artifact,'viewer-manifest.json'))).digest('hex'),origin:`http://127.0.0.1:${port}`,upstream,out,sourceRoot,artifact,generationId:manifest.generationId,reusedFixture:reuse,sourceSHA:manifest.sources.find(s=>s.repository==='ORISO-UserService').sourceSHA,services:Object.fromEntries(services)},null,2)+'\n');
console.log('Controlled production browser fixture ready: http://127.0.0.1:'+port);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{for(const server of servers)server.close();setTimeout(()=>process.exit(0),500);});
