import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectGlossary} from '../lib/glossary-projection.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../glossary/catalog.json',import.meta.url)));
const repository='ORISO-TenantService';
const revision=catalog.audit.sourceVector[repository];
function graph(){return {project:{name:repository,gitCommitHash:revision},nodes:[{id:'concept:tenant-registry',type:'concept',name:'Tenant Registry (Träger)',summary:'Historical unbound source summary',tags:['tenant'],metadata:{semanticClaim:{status:'unbound',reviewedAt:null}}},{id:'file:src/main/java/com/vi/tenantservice/api/model/TenantEntity.java',type:'file',name:'TenantEntity.java',tags:[],summary:'Source class'},{id:'concept:dpa-lifecycle',type:'concept',name:'DPA lifecycle',summary:'Legacy contract-document module',tags:['dpa']} ]};}
test('preferred bilingual vocabulary is visible and searchable without renaming technical identifiers or semantic claims',()=>{
 const original=graph(),result=projectGlossary(catalog,original,{repository,revision});
 const centre=result.graph.nodes[0],source=result.graph.nodes[1];
 assert.equal(centre.name,'Provider registry / Trägerverzeichnis');
 assert.ok(centre.tags.includes('Provider'));assert.ok(centre.tags.includes('Träger'));assert.ok(centre.tags.includes('Tenant Registry (Träger)'));
 assert.deepEqual(centre.metadata.semanticClaim,original.nodes[0].metadata.semanticClaim);assert.equal(centre.summary,original.nodes[0].summary);
 assert.equal(source.id,original.nodes[1].id);assert.equal(source.name,'TenantEntity.java');assert.ok(source.tags.includes('Provider'));
 assert.equal(result.graph.nodes[2].name,'DPA lifecycle');
 assert.deepEqual(projectGlossary(catalog,result.graph,{repository,revision}).graph,result.graph);
 assert.equal(original.nodes[0].name,'Tenant Registry (Träger)');
});
test('changed selected graph revisions remain historical while missing and mistyped mappings are explicit',()=>{
 const changed=graph();changed.project.gitCommitHash='b'.repeat(40);changed.nodes[1].type='class';
 const result=projectGlossary(catalog,changed,{repository,revision:'b'.repeat(40)});
 assert.equal(result.outcomes.find(o=>o.nodeId==='concept:tenant-registry').state,'historical');
 assert.ok(result.outcomes.some(o=>o.state==='unavailable'));assert.equal(result.graph.nodes[1].name,'TenantEntity.java');
 assert.throws(()=>projectGlossary(catalog,changed,{repository,revision}),/revision mismatch/);
});
test('selected authoritative bytes bind unchanged newer releases without rewriting review provenance and fail on drift',async()=>{
 const {validateGlossarySources}=await import('../lib/glossary-projection.mjs');
 const root=new URL('../../../',import.meta.url),selected={repository:'ORISO-Docs',revision:'b'.repeat(40),readSource:p=>fs.readFileSync(new URL(p,root))};
 const result=validateGlossarySources(catalog,[selected]);
 const binding=result.find(b=>b.path?.includes('ADR-023'));
 assert.equal(binding.state,'verified');assert.equal(binding.selectedRevision,'b'.repeat(40));assert.notEqual(binding.reviewedRevision,binding.selectedRevision);
 assert.throws(()=>validateGlossarySources(catalog,[{...selected,readSource:()=>Buffer.from('changed')}]),/Stale glossary source binding/);
 const missing=structuredClone(catalog);delete missing.concepts[0].en.definition;
 assert.throws(()=>validateGlossarySources(missing,[selected]),/definition/);
});
test('the producer projects only pinned Docs bytes before aggregation and rejects drift without mutating graphs',async t=>{
 const os=await import('node:os'),path=await import('node:path'),{execFileSync}=await import('node:child_process');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'glossary-producer-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const docs=path.join(temp,'sources','ORISO-Docs'),tenant=path.join(temp,'sources',repository),stage=path.join(temp,'generation'),repoRoot=new URL('../../../',import.meta.url);
 for(const dir of [docs,tenant])fs.mkdirSync(dir,{recursive:true});
 const copy=p=>{const target=path.join(docs,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(new URL(p,repoRoot),target);};
 for(const p of new Set(catalog.concepts.flatMap(c=>c.sources.filter(s=>s.binding!=='external').map(s=>s.path))))copy(p);
 const catalogPath=path.join(docs,'tools/understand-anything/glossary/catalog.json');fs.mkdirSync(path.dirname(catalogPath),{recursive:true});fs.writeFileSync(catalogPath,JSON.stringify(catalog));
 const commit=dir=>{execFileSync('git',['init','-q',dir]);execFileSync('git',['-C',dir,'add','.']);execFileSync('git',['-C',dir,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','fixture']);return execFileSync('git',['-C',dir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();};
 commit(docs);const selectedRevision=commit(tenant),input=graph();input.project.gitCommitHash=selectedRevision;
 const output=path.join(stage,repository,'.understand-anything/knowledge-graph.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(input));
 const run=()=>execFileSync(process.execPath,[new URL('../ua-glossary-project.mjs',import.meta.url).pathname,'--generation',stage,'--sources',path.join(temp,'sources'),'--authored-root',docs],{encoding:'utf8',stdio:'pipe'});
 run();const report=JSON.parse(fs.readFileSync(path.join(stage,'glossary/bindings.json')));
 assert.equal(JSON.parse(fs.readFileSync(output)).nodes[0].name,'Provider registry / Trägerverzeichnis');
 assert.equal(report.sourceVector[repository],selectedRevision);assert.ok(report.graphMappings.some(m=>m.state==='historical'));
 assert.ok(report.sourceBindings.some(b=>b.state==='verified'&&!b.reviewRevisionMatches));
 const before=fs.readFileSync(output);fs.appendFileSync(path.join(docs,catalog.concepts[0].sources[0].path),'changed');
 assert.throws(run,/Command failed/);assert.deepEqual(fs.readFileSync(output),before);
});

test('the pinned consumer finds preferred terms and legacy aliases in supported fields',async()=>{
 assert.ok(process.env.UA_CORE,'UA_CORE must point to the pinned patched core');
 const {SearchEngine}=await import(process.env.UA_CORE);
 const result=projectGlossary(catalog,graph(),{repository,revision});
 const search=new SearchEngine(result.graph.nodes);
 for(const query of ['Provider','Träger','Tenant Registry'])assert.ok(search.search(query).some(r=>r.nodeId==='concept:tenant-registry'));
 const agencyCatalog=structuredClone(catalog),agency='ORISO-AgencyService';
 const agencyGraph={project:{name:agency,gitCommitHash:catalog.audit.sourceVector[agency]},nodes:[{id:'concept:agency-registry',type:'concept',name:'Counseling Agency Registry',summary:'Historical',tags:[]}]};
 const agencySearch=new SearchEngine(projectGlossary(agencyCatalog,agencyGraph,{repository:agency,revision:catalog.audit.sourceVector[agency]}).graph.nodes);
 for(const query of ['Counselling Centre','Beratungsstelle','Agency'])assert.ok(agencySearch.search(query).some(r=>r.nodeId==='concept:agency-registry'));
});
test('conflicting business labels and ambiguous exact node targets cannot silently choose a winner',()=>{
 const conflicting=structuredClone(catalog);
 const owner=conflicting.concepts.find(c=>c.id==='counsellor');
 owner.graphMappings.push({repository,nodeId:'concept:tenant-registry',mode:'domain-concept',label:{de:'Andere Bedeutung',en:'Different meaning'}});
 assert.throws(()=>projectGlossary(conflicting,graph(),{repository,revision}),/conflicting .*labels/);
 const duplicate=graph();duplicate.nodes.push(structuredClone(duplicate.nodes[0]));
 const result=projectGlossary(catalog,duplicate,{repository,revision});
 assert.equal(result.outcomes.find(o=>o.nodeId==='concept:tenant-registry').state,'unavailable');
 assert.equal(result.graph.nodes[0].name,'Tenant Registry (Träger)');
});
