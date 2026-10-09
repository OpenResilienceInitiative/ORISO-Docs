import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {renderFeatures} from '../render-features.mjs';
import {buildHub,installHub,readbackHub,validateSources} from '../publication.mjs';
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const projectFixtureCode=`
import fs from 'node:fs';import path from 'node:path';
import {immutableSource,projectSelectedGraphs} from ${JSON.stringify(new URL('../../../ua-glossary-project.mjs',import.meta.url).href)};
const generation=process.argv[1],sources=JSON.parse(process.argv[2]),docs=immutableSource(${JSON.stringify(root)},'ORISO-Docs');
const bytes=docs.readSource('tools/understand-anything/glossary/catalog.json'),data=JSON.parse(bytes);
const selected=sources.map(s=>s.repository==='ORISO-Docs'?docs:{repository:s.repository,revision:s.sourceSHA});
const inputs=selected.map(s=>({repository:s.repository,graph:JSON.parse(fs.readFileSync(path.join(generation,s.repository,'.understand-anything/knowledge-graph.json')))}));
const {report,graphs}=projectSelectedGraphs({data,bytes,documentationRevision:docs.revision,selected,graphs:inputs});
for(const {repository,graph} of graphs)fs.writeFileSync(path.join(generation,repository,'.understand-anything/knowledge-graph.json'),JSON.stringify(graph));
const superPath=path.join(generation,'ORISO-Supergraph/.understand-anything/knowledge-graph.json'),supergraph=JSON.parse(fs.readFileSync(superPath));for(const node of graphs.find(g=>g.repository==='ORISO-Docs').graph.nodes)supergraph.nodes.push({...node,id:'ORISO-Docs::'+node.id});fs.writeFileSync(superPath,JSON.stringify(supergraph));
fs.mkdirSync(path.join(generation,'glossary'));fs.writeFileSync(path.join(generation,'glossary/catalog.json'),bytes);fs.writeFileSync(path.join(generation,'glossary/bindings.json'),JSON.stringify(report));
`;

test('actual source bindings and deterministic locale output validate',()=>{assert.equal(validateSources(root).features.length,10)});
test('validated public generation becomes immutable hub consumer artifact with exact readback',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-consumer-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();const generation=path.join(temp,'generation');execFileSync('python3',['-c',`
import sys,pathlib,datetime,json,shutil,hashlib,subprocess
sys.path.insert(0,${JSON.stringify(path.join(root,'tools/understand-anything/test'))})
from bundle_contract_test import fixture
from bundle.contract import seal
from bundle.release_inputs import required_repositories,canonical_bytes
p=pathlib.Path(sys.argv[1]);now=datetime.datetime.now(datetime.timezone.utc);fixture(p,now)
sources=[]
for name in sorted(required_repositories()):
 sha=${JSON.stringify(revision)} if name=='ORISO-Docs' else ('f812000dd830eaa88704b529e30b7563bc6bada0' if name=='ORISO-TenantService' else 'a'*40)
 shutil.copytree(p/'ORISO-Test',p/name)
 for f in (p/name).rglob('*.json'):f.write_text(f.read_text().replace('ORISO-Test',name).replace('a'*40,sha))
 sources.append(dict(repository=name,ref='refs/tags/v2.0.7',sourceSHA=sha,fetchedAt=now.isoformat(),fetchSuccess=True))
 if name in ['ORISO-TenantService','ORISO-Docs']:
  f=p/name/'.understand-anything/knowledge-graph.json';g=json.loads(f.read_text());node_id='concept:tenant-registry' if name=='ORISO-TenantService' else 'document:oriso-platform/decisions/ADR-023-platform-services-agreement-and-traeger-governance.md'
  g['nodes'].append(dict(id=node_id,type='concept' if name=='ORISO-TenantService' else 'document',name='Tenant Registry (Träger)' if name=='ORISO-TenantService' else 'ADR-023-platform-services-agreement-and-traeger-governance.md',summary='Historical summary',tags=[],complexity='simple'))
  f.write_text(json.dumps(g))

shutil.rmtree(p/'ORISO-Test')
for name in ['ORISO-Platform','ORISO-Supergraph']:
 f=p/name/'.understand-anything/knowledge-graph.json';g=json.loads(f.read_text());g['project']['sourceCommits']={s['repository']:s['sourceSHA'] for s in sources};f.write_text(json.dumps(g))
lock=dict(schemaVersion='oriso.platform-release/v1',version='v2.0.7',releaseUrl='https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7',documentationRevision=${JSON.stringify(revision)},sources=[{k:s[k] for k in ['repository','ref','sourceSHA']} for s in sources])
release=dict(lock=lock,sha256=hashlib.sha256(canonical_bytes(lock)).hexdigest(),publishedAt=now.isoformat(),releaseId=1,evidenceScope='published-github-release-and-source-refs')
subprocess.run(['node','--input-type=module','-e',${JSON.stringify(projectFixtureCode)},str(p),json.dumps(sources)],check=True)
seal(p,sources,now=now,release=release)
(p.parent/'release.json').write_text(json.dumps(lock))
`,generation],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
 const artifact=path.join(temp,'artifact'),origin='http://localhost:3000';const releaseLock=JSON.parse(fs.readFileSync(path.join(temp,'release.json')));const manifest=buildHub({root,out:artifact,generation,origin,revision,releaseLock});assert.equal(manifest.releaseBinding.sha256.length,64);assert.equal(manifest.operatorSnapshotHash.length,64);const operator=JSON.parse(fs.readFileSync(path.join(artifact,'operator-snapshot.json')));assert.equal(operator.status,'unavailable');assert.equal(operator.snapshotHash,manifest.operatorSnapshotHash);assert.equal(JSON.parse(fs.readFileSync(path.join(artifact,'status.json'))).operatorSnapshotHash,operator.snapshotHash);for(const file of ['features/de.html','features/en.html','index.html']){const text=fs.readFileSync(path.join(artifact,file),'utf8');assert.ok(text.includes(operator.snapshotHash));assert.ok(!text.includes('/api/dpia'));}
 const bindings=JSON.parse(fs.readFileSync(path.join(artifact,'glossary/bindings.json')));assert.ok(bindings.graphMappings.some(m=>m.nodeId==='concept:tenant-registry'&&m.href==='/tenant-service/?token=oriso-tenant-dashboard'));assert.ok(bindings.graphMappings.some(m=>m.repository==='ORISO-Docs'&&m.href==='/docs/?token=oriso-docs-dashboard'&&m.viewerNodeId.startsWith('ORISO-Docs::')));assert.ok(manifest.files.some(f=>f.path==='glossary/sources/bjorn-reconciliation.md'));
for(const s of JSON.parse(fs.readFileSync(path.join(artifact,'status.json'))).sources){assert.ok(Number.isInteger(s.calls.confirmed)&&Number.isInteger(s.calls.possible));assert.ok(s.calls.unresolved===null||Number.isInteger(s.calls.unresolved));}
 const rawOperator=path.join(temp,'synthetic-public-api.json');fs.writeFileSync(rawOperator,JSON.stringify({operator:{legalName:'SYNTHETIC_OPERATOR'},keyFigures:{tenants:{count:0,asOfDate:'2026-10-01'}},branding:{tenantName:'DISTINCT_SYNTHETIC_BRAND'}}));
 const snapshotPath=path.join(temp,'synthetic-snapshot.json');const snapshot=JSON.parse(execFileSync('python3',[path.join(root,'tools/public_operator_snapshot.py'),'--raw',rawOperator,'--operator-id','synthetic-test','--origin','https://operator.example.invalid','--source-date','2026-10-01T10:00:00Z','--source-sha','eea5db184ebaddf80dab16e8f045af8c359c10e1'],{encoding:'utf8'}));fs.writeFileSync(snapshotPath,JSON.stringify(snapshot));
 const confirmation=path.join(temp,'synthetic-human-confirmation.json');const record={state:'approved',scope:'operator-only',snapshotHash:snapshot.snapshotHash,operatorId:snapshot.operatorId,origin:snapshot.origin,legalName:'SYNTHETIC_OPERATOR',confirmedBy:'Synthetic reviewer',confirmedAt:'2026-10-01T11:00:00Z'};fs.writeFileSync(confirmation,JSON.stringify(record));
 const confirmed=path.join(temp,'confirmed-hub');const confirmedManifest=buildHub({root,out:confirmed,generation,origin,revision,releaseLock,operatorSnapshot:snapshotPath,operatorConfirmation:confirmation});assert.equal(confirmedManifest.operatorSnapshotHash,snapshot.snapshotHash);assert.equal(confirmedManifest.operatorFieldsConfirmed,true);
 for(const locale of ['de','en']){const text=fs.readFileSync(path.join(confirmed,'features/'+locale+'.html'),'utf8');assert.ok(text.includes('SYNTHETIC_OPERATOR'));assert.ok(text.includes('<dd>0</dd>'));assert.ok(text.includes('<dd>2026-10-01</dd>'));assert.ok(text.includes(snapshot.snapshotHash));}
 fs.writeFileSync(confirmation,JSON.stringify({...record,legalName:'CHANGED_OPERATOR'}));assert.throws(()=>buildHub({root,out:path.join(temp,'bad-confirmation'),generation,origin,revision,releaseLock,operatorSnapshot:snapshotPath,operatorConfirmation:confirmation}));assert.ok(!fs.existsSync(path.join(temp,'bad-confirmation')));
 const malformed=path.join(temp,'malformed-operator.json');fs.writeFileSync(malformed,JSON.stringify({password:'SECRET_SENTINEL'}));assert.throws(()=>buildHub({root,out:path.join(temp,'bad-operator'),generation,origin,revision,releaseLock,operatorSnapshot:malformed}),/operator|snapshot|Command failed/);assert.ok(!fs.existsSync(path.join(temp,'bad-operator')));const preview=buildHub({root,out:path.join(temp,'preview'),generation,origin,revision});assert.equal(preview.state,'preview');assert.throws(()=>installHub({artifact:path.join(temp,'preview'),destination:path.join(temp,'no-install'),currentLink:path.join(temp,'no-current'),origin,revision}),/binding/);await assert.rejects(readbackHub(preview),/release|preview/i);
 const mismatched=structuredClone(releaseLock);mismatched.sources.find(s=>s.repository==='ORISO-UserService').sourceSHA='b'.repeat(40);assert.throws(()=>buildHub({root,out:path.join(temp,'mismatch'),generation,origin,revision,releaseLock:mismatched}),/source vector/);assert.ok(!fs.existsSync(path.join(temp,'mismatch')));
 assert.equal(manifest.scope,'understand-hub');assert.ok(!manifest.files.some(f=>/legal|test/.test(f.path)));assert.ok(manifest.files.some(f=>f.path==='glossary/catalog.json'));assert.ok(manifest.files.some(f=>f.path==='glossary/bindings.json'));assert.equal(manifest.glossary.documentationRevision,revision);assert.ok(fs.readFileSync(path.join(artifact,'glossary/index.html'),'utf8').includes('Platform Services Agreement'));assert.ok(manifest.glossary.sourceBindings>0);
 assert.throws(()=>installHub({artifact,origin,revision}),/explicit.*binding/);
 const currentLink=path.join(temp,'public-current'),destination=path.join(temp,'immutable');const installed=installHub({artifact,destination,currentLink,origin,revision});assert.equal(fs.realpathSync(currentLink),fs.realpathSync(installed));
 const legal=path.join(temp,'legal');fs.mkdirSync(legal);fs.writeFileSync(path.join(legal,'historical.html'),'preserved');
 await readbackHub(manifest,async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(currentLink,new URL(url).pathname.slice(1)))}));
 await assert.rejects(readbackHub(manifest,async url=>({ok:true,arrayBuffer:async()=>new URL(url).pathname.endsWith('hub-manifest.json')?Buffer.from(JSON.stringify({...manifest,sourceRevision:'f'.repeat(40)})+'\n'):fs.readFileSync(path.join(currentLink,new URL(url).pathname.slice(1)))})),/manifest/);
 assert.equal(fs.readFileSync(path.join(legal,'historical.html'),'utf8'),'preserved');
 const catalogFile=path.join(artifact,'glossary/catalog.json'),catalogBytes=fs.readFileSync(catalogFile);fs.writeFileSync(catalogFile,'tampered');assert.throws(()=>installHub({artifact,destination,currentLink,origin,revision}),/hash|binding|checksum/);fs.writeFileSync(catalogFile,catalogBytes);await assert.rejects(readbackHub(manifest,async url=>({ok:true,arrayBuffer:async()=>new URL(url).pathname.endsWith('glossary/catalog.json')?Buffer.from('tampered'):fs.readFileSync(path.join(currentLink,new URL(url).pathname.slice(1)))})),/glossary\/catalog/);
 fs.writeFileSync(path.join(artifact,'index.html'),'tampered');assert.throws(()=>installHub({artifact,destination,currentLink,origin,revision}),/hash/);assert.equal(fs.realpathSync(currentLink),fs.realpathSync(installed));
 await assert.rejects(readbackHub(manifest,async()=>({ok:false})),/readback/);
});
test('actual canonical-source and locale output drift fail before artifact generation',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-bindings-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const data=JSON.parse(fs.readFileSync(path.join(root,'tools/understand-anything/site/hub/features/catalog.json'))),catalog=JSON.parse(fs.readFileSync(path.join(root,'site/page-catalog.json')));
 const copy=(relative)=>{fs.mkdirSync(path.dirname(path.join(temp,relative)),{recursive:true});fs.copyFileSync(path.join(root,relative),path.join(temp,relative));};
 const glossaryData=JSON.parse(fs.readFileSync(path.join(root,'tools/understand-anything/glossary/catalog.json')));copy('tools/understand-anything/glossary/catalog.json');copy('tools/understand-anything/site/hub/glossary/index.html');for(const source of new Set(glossaryData.concepts.flatMap(c=>c.sources.filter(s=>s.binding!=='external').map(s=>s.path))))copy(source);
 copy('site/page-catalog.json');for(const f of data.features){copy(f.source);const p=catalog.pages.find(p=>p.id===f.id);for(const locale of ['de','en'])copy(p.translations[locale].path);}
 execFileSync('git',['init','-q',temp]);execFileSync('git',['-C',temp,'add','.']);execFileSync('git',['-C',temp,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);const revision=execFileSync('git',['-C',temp,'rev-parse','HEAD'],{encoding:'utf8'}).trim();for(const f of data.features)f.sourceRevision=revision;
 const hub=path.join(temp,'tools/understand-anything/site/hub/features');fs.mkdirSync(hub,{recursive:true});fs.writeFileSync(path.join(hub,'catalog.json'),JSON.stringify(data));
 // Use the actual renderer on a disposable source root.
 for(const locale of ['de','en'])fs.writeFileSync(path.join(hub,locale+'.html'),renderFeatures(data,locale));fs.writeFileSync(path.join(hub,'index.html'),renderFeatures(data,'de'));
 assert.equal(validateSources(temp).features.length,10);
 fs.appendFileSync(path.join(temp,data.features[0].source),'changed');assert.throws(()=>validateSources(temp),/Stale hub source binding/);copy(data.features[0].source);
 fs.appendFileSync(path.join(hub,'en.html'),'changed');assert.throws(()=>validateSources(temp),/renderer output differs/);
 fs.writeFileSync(path.join(hub,'en.html'),renderFeatures(data,'en'));
 const glossarySource=glossaryData.concepts[0].sources[0].path;fs.appendFileSync(path.join(temp,glossarySource),'changed');const out=path.join(temp,'never-created');assert.throws(()=>buildHub({root:temp,out}),/Stale glossary source binding/);assert.ok(!fs.existsSync(out));copy(glossarySource);
 const incomplete=structuredClone(glossaryData);delete incomplete.concepts[0].en.definition;fs.writeFileSync(path.join(temp,'tools/understand-anything/glossary/catalog.json'),JSON.stringify(incomplete));assert.throws(()=>buildHub({root:temp,out}),/drift/);assert.ok(!fs.existsSync(out));copy('tools/understand-anything/glossary/catalog.json');
 fs.appendFileSync(path.join(temp,'tools/understand-anything/site/hub/glossary/index.html'),'changed');assert.throws(()=>buildHub({root:temp,out}),/glossary renderer output differs/);assert.ok(!fs.existsSync(out));
});
test('hosted preflight fails named missing operator bindings before consumer scheduling',()=>{
 const text=fs.readFileSync(path.join(root,'.github/workflows/ua-public-site.yml'),'utf8');const code=text.match(/node - <<'NODE'\n([\s\S]*?)\n          NODE/)[1].split('\n').map(x=>x.slice(10)).join('\n');
 assert.throws(()=>execFileSync(process.execPath,['-e',code],{env:{PATH:process.env.PATH},stdio:'pipe'}),error=>/UNDERSTAND_HUB_CURRENT/.test(error.stderr.toString())&&/UNDERSTAND_VIEWER_READBACK_TOKENS/.test(error.stderr.toString()));
 assert.ok(text.includes('needs: [binding, produce]'));assert.ok(text.includes('runtime-test.mjs'));assert.ok(text.includes('consumer.py'));assert.ok(text.includes('--readback'));assert.ok(!text.includes('UA_GRAPH_TOKEN'));
});

test('uncommitted client, CSS and renderer drift reject publication before output creation', t => {
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-immutable-inputs-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const selected=path.join(temp,'docs');execFileSync('git',['clone','--quiet','--shared',root,selected],{stdio:'pipe'});
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:selected,encoding:'utf8'}).trim();
 for(const relative of ['tools/understand-anything/site/hub/assets/glossary.js','tools/understand-anything/site/hub/assets/hub.css','tools/understand-anything/site/hub/render-glossary.mjs']) {
  const file=path.join(selected,relative),before=fs.readFileSync(file),out=path.join(temp,path.basename(relative)+'-output');
  fs.appendFileSync(file,'\n/* UNCOMMITTED_PUBLICATION_INPUT */\n');
  assert.throws(()=>buildHub({root:selected,out,generation:path.join(temp,'not-read'),origin:'http://localhost:3000',revision}),error=>error.message.includes('drift')&&error.message.includes(relative));
  assert.ok(!fs.existsSync(out),'Rejected immutable input must not leave an artifact');
  fs.writeFileSync(file,before);
 }
});
