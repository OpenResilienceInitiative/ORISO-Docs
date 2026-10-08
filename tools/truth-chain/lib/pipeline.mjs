import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildDocsExport} from './export-docs.mjs';
import {checkEvidenceMap} from './decay-check.mjs';
import {parseEvidenceMap} from './parse-evidence-map.mjs';
import {renderGeneratedPages,writeGeneratedPages,mayOverwrite} from './generate-pages.mjs';
import {localizeGeneratedPage} from './localize-pages.mjs';
const publicRepos=new Set(JSON.parse(readFileSync(new URL('../public-repositories.json',import.meta.url),'utf8')).repositories);
const defaultTooling=fileURLToPath(new URL('../../understand-anything',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJSON=path=>JSON.parse(readFileSync(path,'utf8'));
function writeJSON(path,data){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(data,null,2)+'\n');}
export function generationExport(generationDir,{toolingRoot=defaultTooling}={}) {
 generationDir=resolve(generationDir);
 // Reuse pinned bundle contract: schema, freshness, every byte, graph/source SHA
 // consistency and no unknown/symlink/unlisted artifacts. Never trust status.json.
 try {execFileSync('python3',['-m','bundle','validate',generationDir],{cwd:toolingRoot,env:{...process.env,PYTHONPATH:toolingRoot,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});}
 catch {throw Error('Public graph generation validation failed (schema, age, source SHA or artifact bytes)');}
 const manifest=readJSON(join(generationDir,'manifest.json'));
 if(manifest.sources.some(s=>!publicRepos.has(s.repository)))throw Error('Public graph generation contains private/unknown repository sources');
 const nodes=[],edges=[];
 for(const source of manifest.sources) {
  const spec=manifest.graphs.find(g=>g.repository===source.repository);if(!spec)throw Error('Source repository graph absent');
  const graph=readJSON(join(generationDir,source.repository,'.understand-anything/knowledge-graph.json'));
  nodes.push({id:'repo:'+source.repository,name:source.repository,type:'module',summary:graph.project?.description??'',nodeCount:graph.nodes.length,metadata:{gitCommitHash:source.sourceSHA}});
  for(const node of graph.nodes)nodes.push({...node,id:node.id.startsWith(source.repository+'::')?node.id:source.repository+'::'+node.id,sourceRepo:source.repository});
 }
 const superSpec=manifest.graphs.find(g=>g.repository==='ORISO-Supergraph');
 if(superSpec) {
  const graph=readJSON(join(generationDir,'ORISO-Supergraph/.understand-anything/knowledge-graph.json'));
  edges.push(...graph.edges.filter(e=>(e.type??e.kind)==='depends_on'));
 }
 const exp=buildDocsExport({kind:'validated-public-generation',nodes,edges}, {lastAnalyzedAt:manifest.generatedAt,repos:Object.fromEntries(manifest.sources.map(s=>[s.repository,s.sourceSHA]))},{generatedAt:manifest.generatedAt});
 exp.graphSource={generationId:manifest.generationId,generatedAt:manifest.generatedAt,scope:'declared-source-refs',sources:manifest.sources.map(({repository,ref,sourceSHA})=>({repository,ref,sourceSHA}))};
 return exp;
}
export function prepareDocumentation({generationDir,repoRoot,toolingRoot=defaultTooling,evidenceMap,reposRoot}) {
 repoRoot=resolve(repoRoot);
 const exp=generationExport(generationDir,{toolingRoot});
 const map=parseEvidenceMap(readFileSync(evidenceMap??join(repoRoot,'oriso-platform/dsfa-text/evidence-map.yaml'),'utf8'));
 // Raw evidence paths/findings stay in nonpublic export, not public pages.
 const eligible={...map,entries:(map.entries??[]).filter(e=>(e.evidence??[]).every(ev=>publicRepos.has(ev.repo)))};
 const evidence=checkEvidenceMap({mapText:eligible,reposRoot:reposRoot??join(repoRoot,'..'),commits:exp.commits,verifiedAt:new Date().toISOString()});
 // Evidence is a source check only when the inspected clone is exactly the
 // generation SHA. A successful identifier lookup in another checkout is not proof.
 const sourceStates=new Map();
 for(const source of exp.graphSource.sources) {
   let current=null;
   try {current=execFileSync('git',['-C',join(reposRoot??join(repoRoot,'..'),source.repository),'rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
   let clean=false;
   try {clean=!execFileSync('git',['-C',join(reposRoot??join(repoRoot,'..'),source.repository),'status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
   sourceStates.set(source.repository,{matches:current===source.sourceSHA&&clean,reason:current===source.sourceSHA&&!clean?'clone-source-dirty':'clone-source-sha-mismatch'});
 }
 for(const finding of evidence.findings) {
   for(const ev of finding.evidence) if(!sourceStates.get(ev.repo)?.matches) {ev.status='unverified';ev.reason=ev.reason==='clone-missing'?'clone-missing':sourceStates.get(ev.repo)?.reason??'clone-source-sha-mismatch';}
   finding.status=finding.evidence.some(e=>e.status==='broken')?'broken':finding.evidence.some(e=>e.status==='drifted')?'drifted':finding.evidence.some(e=>e.status==='unverified')||!finding.evidence.length?'unverified':'ok';
 }
 evidence.counts={total:evidence.findings.length,ok:0,drifted:0,broken:0,unverified:0};
 for(const finding of evidence.findings)evidence.counts[finding.status]++;
 const out=join(repoRoot,'.understand-anything/docs-export');writeJSON(join(out,'export.json'),exp);writeJSON(join(out,'evidence-status.json'),evidence);
 const files=renderGeneratedPages(exp,{evidenceStatus:evidence});
 const registry={version:1,generated:true,generationId:exp.graphSource.generationId,pages:[]};
 const all=new Map(files);
 for(const [source,text] of files) {
  const id=source.replace(/\.md$/,'');
  const sourceHash=hash(text);const translations={};
  for(const locale of ['de','en']) {
   const path=source.replace('docs/generated/','docs/generated/locales/'+locale+'/');
   all.set(path,localizeGeneratedPage(text,locale,exp.repos.map(r=>r.summary)));translations[locale]={path,sourceHash,reviewedAt:exp.generatedAt};
  }
  registry.pages.push({id,source,route:'graphs/'+id.replace('docs/generated/',''),aliases:[],owner:'ORISO-Docs',lifecycle:/\/(?:super-graph-(?:index|explorer|detailed)|understand-anything-inventory)$/.test(id)?'archived':'current',translations,graphSource:exp.graphSource});
 }
 registry.pages.sort((a,b)=>a.id.localeCompare(b.id,'en'));
 for(const [path] of all)if(existsSync(join(repoRoot,path))&&!mayOverwrite(path,readFileSync(join(repoRoot,path),'utf8')))throw Error('Editorial generated-tree file is protected: '+path);
 const registryPath=join(repoRoot,'docs/generated/page-catalog.json');
 if(existsSync(registryPath)&&readJSON(registryPath).generated!==true)throw Error('Unmarked registry is protected');
 const written=writeGeneratedPages(repoRoot,all);
 if(written.skipped.length)throw Error('Generated source protection rejected output');
 writeJSON(registryPath,registry);
 return {export:exp,evidence,registry,written:written.written.length};
}
