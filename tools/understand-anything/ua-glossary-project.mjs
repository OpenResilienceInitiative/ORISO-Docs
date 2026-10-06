import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {projectGlossary,validateGlossarySources} from './lib/glossary-projection.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function immutableSource(root,repository) {
  const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const cache=new Map();
  return {repository,revision,readSource(relative){
    if(relative.startsWith('/')||relative.split('/').includes('..')||relative.includes('\\'))throw Error('Unsafe glossary source path');
    if(cache.has(relative))return cache.get(relative);
    const bytes=execFileSync('git',['show',revision+':'+relative],{cwd:root,stdio:['ignore','pipe','pipe']});
    if(!fs.readFileSync(path.join(root,relative)).equals(bytes))throw Error('Selected glossary source has uncommitted drift: '+relative);
    cache.set(relative,bytes);return bytes;
  }};
}
export function projectSelectedGraphs({data,bytes,documentationRevision,selected,graphs}) {
  const sourceBindings=validateGlossarySources(data,selected),writes=[],graphMappings=[];
  for(const source of selected) {
    const input=graphs.find(g=>g.repository===source.repository);
    if(!input)continue;
    const result=projectGlossary(data,input.graph,source);
    writes.push({repository:source.repository,graph:result.graph});graphMappings.push(...result.outcomes);
  }
  for(const c of data.concepts)for(const m of c.graphMappings)if(!graphMappings.some(o=>o.conceptId===c.id&&o.repository===m.repository&&o.nodeId===m.nodeId))graphMappings.push({conceptId:c.id,...m,selectedRevision:null,reviewedRevision:data.audit.sourceVector[m.repository]??null,state:'unavailable',reason:'Repository graph is absent from the selected generation.'});
  const report={schemaVersion:1,catalogHash:digest(bytes),documentationRevision:documentationRevision,sourceVector:Object.fromEntries(selected.map(s=>[s.repository,s.revision])),sourceBindings,graphMappings,evidence:'editorial-vocabulary-not-runtime-verification'};
  return {report,graphs:writes};
}

/** Producer boundary: every input is checked before any staged graph or artifact is changed. */
export function projectGeneration({generation,sources,authoredRoot}) {
  const docs=immutableSource(authoredRoot,'ORISO-Docs'),catalogPath='tools/understand-anything/glossary/catalog.json',bytes=docs.readSource(catalogPath),data=JSON.parse(bytes);
  const selected=fs.readdirSync(sources,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>immutableSource(path.join(sources,d.name),d.name));
  if(selected.find(s=>s.repository==='ORISO-Docs')?.revision!==docs.revision)throw Error('Pinned Docs glossary source vector mismatch');
  const graphs=selected.flatMap(source=>{const file=path.join(generation,source.repository,'.understand-anything/knowledge-graph.json');return fs.existsSync(file)?[{repository:source.repository,graph:JSON.parse(fs.readFileSync(file))}]:[];});
  const {report,graphs:projected}=projectSelectedGraphs({data,bytes,documentationRevision:docs.revision,selected,graphs});
  const out=path.join(generation,'glossary');fs.mkdirSync(out,{recursive:true});
  for(const {repository,graph} of projected)fs.writeFileSync(path.join(generation,repository,'.understand-anything/knowledge-graph.json'),JSON.stringify(graph,null,2)+'\n');
  fs.writeFileSync(path.join(out,'catalog.json'),bytes);fs.writeFileSync(path.join(out,'bindings.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const arg=name=>{const i=process.argv.indexOf(name);if(i<0||!process.argv[i+1])throw Error('Required '+name);return process.argv[i+1];};
  try {const report=projectGeneration({generation:arg('--generation'),sources:arg('--sources'),authoredRoot:arg('--authored-root')});console.log(JSON.stringify({catalogHash:report.catalogHash,mappings:report.graphMappings.length,sourceBindings:report.sourceBindings.length}));}catch(error){console.error(error.message);process.exitCode=1;}
}
