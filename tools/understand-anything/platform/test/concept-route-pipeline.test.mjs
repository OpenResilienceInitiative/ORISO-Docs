import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceLocation} from '../../hosted-viewer/source-location.mjs';
const tools=fileURLToPath(new URL('../../',import.meta.url));
const repos=['ORISO-Admin','ORISO-AgencyService','ORISO-ConsultingTypeService','ORISO-Database','ORISO-Docs','ORISO-E2E','ORISO-ElementCall','ORISO-Frontend','ORISO-HealthDashboard','ORISO-Helm','ORISO-Infra','ORISO-Keycloak','ORISO-Livekit','ORISO-SigNoz','ORISO-Status','ORISO-TenantService','ORISO-UserService'];
const userFile='src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java';
const verifierFile='keycloak-image/otp-config-spi/src/main/java/de/onlineberatung/authenticator/MailOtpVerifier.java';
const from='ORISO-UserService::concept:identity-authentication-2fa';
const owningClass=`ORISO-Keycloak::class:${verifierFile}:de.onlineberatung.authenticator.MailOtpVerifier`;
function fixture({staleRepo,staleConcept}={}) {
 const root=mkdtempSync(path.join(tmpdir(),'ua-concept-route-'));
 const put=(file,content)=>{mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);};
 const run=(script,args=[],env={})=>execFileSync(process.execPath,[path.join(tools,script),...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
 const revisions={};
 for(const repo of repos){
  const source=path.join(root,'sources',repo),output=path.join(root,'graphs',repo,'.understand-anything');mkdirSync(source,{recursive:true});mkdirSync(output,{recursive:true});
  if(repo==='ORISO-UserService'){
   put(path.join(source,userFile),'package de.caritas.cob.userservice.api.adapters.keycloak;\npublic class KeycloakService {\n private static final String ENDPOINT_OTP_SETUP = "/setup-otp/{username}";\n public boolean setUpOtpCredential(String name) {\n var requestUrl = getOtpUrl(ENDPOINT_OTP_SETUP, name);\n keycloakClient.putForEntity(token, requestUrl, dto, Object.class);\n return true;\n }\n}\n');
   put(path.join(source,'src/main/resources/application.properties'),'identity.otp-url=${app.base.url}/auth/realms/${keycloak.realm}/otp-config\n');
  }
  if(repo==='ORISO-Keycloak'){
   put(path.join(source,verifierFile),'package de.onlineberatung.authenticator;\npublic class MailOtpVerifier {\n public boolean verify(String submitted) { return submitted != null; }\n}\n');
   put(path.join(source,'api/otp-config.yaml'),'openapi: 3.0.0\npaths:\n  /otp-config/setup-otp/{username}:\n    put:\n      summary: Setup OTP\n');
  }
  // A deliberate same-path decoy proves the preview follows selected ownership.
  if(repo==='ORISO-Docs')put(path.join(source,verifierFile),'Docs decoy, never the owning SPI');
  const git=(...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','-q');git('add','.');git('-c','user.name=UA Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','Graph pipeline source');revisions[repo]=git('rev-parse','HEAD');
  if(['ORISO-UserService','ORISO-Keycloak'].includes(repo))run('ua-generate.mjs',[source,repo,output]);
  else {put(path.join(output,'knowledge-graph.json'),JSON.stringify({version:'1.0.0',project:{name:repo,gitCommitHash:revisions[repo]},nodes:[],edges:[],layers:[],tour:[]}));put(path.join(output,'meta.json'),JSON.stringify({gitCommitHash:revisions[repo]}));}
 }
 function enrich(repo,stale=false){
  const dir=path.join(root,'graphs',repo,'.understand-anything'),g=JSON.parse(readFileSync(path.join(dir,'knowledge-graph.json'))),node=g.nodes.find(n=>n.type==='class');
  const claim={sourceCommit:stale?'a'.repeat(40):revisions[repo],generationId:'synthetic-reviewed-fixture',generatedAt:'2026-01-01T00:00:00Z',reviewedAt:'2026-01-02T00:00:00Z',reviewedBy:{kind:'agent',name:'Fixture reviewer'},confidence:'source-reviewed',evidence:[{nodeId:node.id,kind:'source',sourceCommit:revisions[repo],sourceRange:node.lineRange,sourceFingerprint:node.metadata.sourceFingerprint}]};
  const ids=repo==='ORISO-UserService'?['concept:identity-authentication-2fa']:['concept:email-otp-second-factor','concept:otp-config-rest-api'];
  const file=path.join(root,repo+'-enrichment.json');put(file,JSON.stringify({concepts:ids.map(id=>({id,name:id,summary:'Reviewed fixture ownership',tags:['2fa'],related:[node.id],claim:id===staleConcept?{...claim,sourceCommit:'a'.repeat(40)}:claim}))}));run('ua-enrich-merge.mjs',[dir,file]);
 }
 enrich('ORISO-UserService',staleRepo==='ORISO-UserService');enrich('ORISO-Keycloak',staleRepo==='ORISO-Keycloak');
 function build(mode){const out=path.join(root,mode);if(mode==='platform')run('platform/ua-platform-graph.mjs',['--graphs-dir',path.join(root,'graphs'),'--repos-dir',path.join(root,'sources'),'--out',out]);else run('ua-build-supergraph.mjs',['--out',out],{UA_BASE:path.join(root,'graphs'),UA_REPOSITORIES:'ORISO-UserService,ORISO-Keycloak'});return JSON.parse(readFileSync(path.join(out,'knowledge-graph.json')));}
 return {root,build,revisions};
}
test('generated platform gives the 2FA reader a direct owning class and exact source preview', {skip:!process.env.UA_CORE},()=>{
 const f=fixture();try{
  const graph=f.build('platform');
  assert.ok(graph.edges.some(e=>e.source===from&&e.target===owningClass&&e.type==='related'),'owning SPI class must be selectable directly from 2FA');
  const node=graph.nodes.find(n=>n.id===owningClass);assert.equal(node.type,'class');assert.equal(node.metadata.sourceCommit,f.revisions['ORISO-Keycloak']);
  const location=sourceLocation(graph,path.join(f.root,'sources/ORISO-Docs'),verifierFile,owningClass,Object.fromEntries(repos.map(r=>[r,path.join(f.root,'sources',r)])));
  assert.match(readFileSync(location.absoluteFile,'utf8'),/public class MailOtpVerifier/);assert.equal(location.sourceCommit,f.revisions['ORISO-Keycloak']);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('aggregate graph preserves the same reviewed one-click owning implementation', {skip:!process.env.UA_CORE},()=>{
 const f=fixture();try{
  const graph=f.build('supergraph');
  assert.ok(graph.edges.some(e=>e.source===from&&e.target===owningClass&&e.type==='related'),'aggregate retains reviewed cross-repo concept route');
  const node=graph.nodes.find(n=>n.id===owningClass);assert.equal(node.metadata.sourceRepo,'ORISO-Keycloak');assert.equal(node.metadata.sourceCommit,f.revisions['ORISO-Keycloak']);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('changed or unreviewed concept evidence never promotes a direct owning-class route', {skip:!process.env.UA_CORE},()=>{
 const f=fixture({staleRepo:'ORISO-Keycloak'});try{
  for(const mode of ['platform','supergraph']){
   const graph=f.build(mode);
   assert.equal(graph.edges.some(e=>e.source===from&&e.target===owningClass&&e.metadata?.evidence==='source-reviewed'),false);
   const concept=graph.nodes.find(n=>n.id==='ORISO-Keycloak::concept:email-otp-second-factor');
   assert.equal(concept.metadata.semanticClaim.status,'stale');assert.match(concept.summary,/Dated orientation; stale/);
  }
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('aggregate cannot present a stale target as a source-reviewed bridge when another target is current', {skip:!process.env.UA_CORE},()=>{
 const f=fixture({staleConcept:'concept:email-otp-second-factor'});try{
  const graph=f.build('supergraph');
  assert.equal(graph.edges.some(e=>e.source===from&&e.target==='ORISO-Keycloak::concept:email-otp-second-factor'&&e.metadata?.evidence==='source-reviewed'),false);
  assert.ok(graph.edges.some(e=>e.source===from&&e.target==='ORISO-Keycloak::concept:otp-config-rest-api'&&e.metadata?.evidence==='source-reviewed'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
