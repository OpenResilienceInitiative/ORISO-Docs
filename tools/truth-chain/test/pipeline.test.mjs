import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync,existsSync,copyFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareDocumentation, generationExport} from '../lib/pipeline.mjs';
import {loadGeneratedCatalog} from '../lib/generated-catalog.mjs';
import {buildManifest} from '../../docs-publication/publication.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const tooling=join(root,'tools/understand-anything');
function fixture(t,pathValue='/changed',repoName='ORISO-UserService',sourceSHA='a'.repeat(40)) {
 const temp=mkdtempSync(join(tmpdir(),'docs-pipeline-'));t.after(()=>rmSync(temp,{recursive:true,force:true}));
 const stage=join(temp,'generation');
 execFileSync('python3',['-c',`
import sys,pathlib,datetime,json
sys.path.insert(0,${JSON.stringify(join(tooling,'test'))})
from bundle_contract_test import fixture
from bundle.contract import seal
root=pathlib.Path(sys.argv[1]); now=datetime.datetime.now(datetime.timezone.utc)
sources=fixture(root,now)
for p in list(root.rglob('*.json')):
 text=p.read_text().replace('ORISO-Test',sys.argv[3]).replace('a'*40,sys.argv[4]);p.write_text(text)
(root/'ORISO-Test').rename(root/sys.argv[3])
for item in sources:item['repository']=sys.argv[3];item['sourceSHA']=sys.argv[4]
p=root/sys.argv[3]/'.understand-anything'/'knowledge-graph.json';g=json.loads(p.read_text())
g['nodes'].append({'id':'endpoint:changed','type':'endpoint','name':'GET '+sys.argv[2],'summary':'','tags':[],'complexity':'simple'})
p.write_text(json.dumps(g));seal(root,sources,now=now)
`,stage,pathValue,repoName,sourceSHA],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
 const repo=join(temp,'repo');mkdirSync(join(repo,'docs/platform'),{recursive:true});
 writeFileSync(join(repo,'docs/platform/backend-services.md'),'# Human editorial source\n');
 const map=join(temp,'evidence.yaml');writeFileSync(map,'entries:\n  - slug: missing-check\n    claim: source check\n    evidence:\n      - repo: ORISO-UserService\n        path: src/Missing.java\n        expect: [missing]\n');
 return {temp,stage,repo,map};
}
async function siteCatalogFixture(temp) {
 const siteRoot=resolve(process.env.DOCS_SITE_ROOT??root);
 const source=join(siteRoot,'site/scripts/page-catalog.mjs');
 assert.ok(existsSync(source),'Actual P1 page-catalog.mjs is required: merge P1 before CI, or set DOCS_SITE_ROOT for an explicit local integration fixture. No shared-boundary test is skipped.');
 const copy=join(temp,'actual-site-page-catalog.mjs');copyFileSync(source,copy);
 return import(pathToFileURL(copy).href);
}
test('validated generation→export→decay→bilingual registry→actual public artifact is connected',async t=>{
 const f=fixture(t);const result=prepareDocumentation({generationDir:f.stage,repoRoot:f.repo,toolingRoot:tooling,evidenceMap:f.map,reposRoot:join(f.temp,'no-clones')});
 assert.equal(result.export.endpoints[0].path,'/changed');
 assert.equal(result.evidence.counts.unverified,1);
 assert.equal(readFileSync(join(f.repo,'docs/platform/backend-services.md'),'utf8'),'# Human editorial source\n');
 const registry=JSON.parse(readFileSync(join(f.repo,'docs/generated/page-catalog.json'),'utf8'));
 assert.ok(registry.pages.every(p=>p.graphSource.sources[0].sourceSHA==='a'.repeat(40)));
 const page=registry.pages.find(p=>p.id==='docs/generated/endpoint-inventory');
 const de=readFileSync(join(f.repo,page.translations.de.path),'utf8'),en=readFileSync(join(f.repo,page.translations.en.path),'utf8');
 assert.match(de,/Endpunktinventar/);assert.match(en,/Endpoint inventory/);assert.match(de,/GET.*\/changed/);
 const out=join(f.temp,'out');mkdirSync(out);
 const ingested=loadGeneratedCatalog(f.repo);
 assert.equal(ingested.length,registry.pages.length);
 const site=await siteCatalogFixture(f.temp);
 const policyPath=join(f.repo,'tools/truth-chain/public-repositories.json');mkdirSync(dirname(policyPath),{recursive:true});copyFileSync(join(root,'tools/truth-chain/public-repositories.json'),policyPath);
 const editorial={version:1,pages:[]},catalogPath=join(f.repo,'site/page-catalog.json');mkdirSync(dirname(catalogPath),{recursive:true});writeFileSync(catalogPath,JSON.stringify(editorial)+'\n');
 const originalCatalogBytes=readFileSync(catalogPath);
 const merged=site.mergeCatalog(editorial,ingested);
 const read=path=>existsSync(join(f.repo,path))?readFileSync(join(f.repo,path),'utf8'):undefined;
 const index=site.buildPageIndex(merged,read),pages=index.pages;
 assert.equal(index.coverage.completePairs,index.coverage.currentPages);
 assert.equal(index.pages[0].graphSource.generationId,registry.generationId);
 assert.deepEqual(editorial,{version:1,pages:[]});assert.deepEqual(readFileSync(catalogPath),originalCatalogBytes);
 assert.throws(()=>site.mergeCatalog({pages:[{id:ingested[0].id,route:'other'}]},ingested),/collides/);
 assert.throws(()=>site.mergeCatalog({pages:[{id:'editorial',route:ingested[0].route}]},ingested),/collides/);
 const forged=structuredClone(ingested[0]);forged.graphSource.sources[0].repository='ORISO-Infra';
 assert.throws(()=>site.buildPageIndex(site.mergeCatalog(editorial,[forged]),read),/public source/);
 for(const p of ingested)for(const lang of ['de','en']){const file=join(out,lang,p.route,'index.html');mkdirSync(dirname(file),{recursive:true});writeFileSync(file,readFileSync(join(f.repo,p.translations[lang].path)));}
 const inputs={root:f.repo,outDir:out,index,revision:'b'.repeat(40)};
 assert.throws(()=>buildManifest(inputs),/Platform release binding/);
 const manifest=buildManifest({...inputs,preview:true});
 assert.ok(manifest.files.find(f=>f.path==='de/graphs/endpoint-inventory/index.html'));
 assert.equal(manifest.state,'preview');
});
test('tampered or stale generation is rejected before generated source edits',t=>{
 const f=fixture(t);writeFileSync(join(f.stage,'ORISO-UserService/.understand-anything/meta.json'),'{}');
 assert.throws(()=>generationExport(f.stage,{toolingRoot:tooling}),/generation validation/);
});
test('workflow invokes generation and publication sequence and covers graph input changes',()=>{
 const text=readFileSync(join(root,'.github/workflows/docs-publication.yml'),'utf8');
 assert.match(text,/tools\/understand-anything\/\*\*/);assert.match(text,/bundle refresh/);assert.match(text,/prepare-documentation\.mjs/);
 assert.ok(text.indexOf('prepare-documentation.mjs')<text.indexOf('sync-content.mjs --full-current'));
 assert.match(text,/--verify-live/);
});

test('changed validated graph and SHA change generated locale content and source-bound hash',t=>{
 const a=fixture(t,'/before'),b=fixture(t,'/after','ORISO-UserService','c'.repeat(40));
 const produce=f=>prepareDocumentation({generationDir:f.stage,repoRoot:f.repo,toolingRoot:tooling,evidenceMap:f.map,reposRoot:join(f.temp,'no-clones')});
 const first=produce(a),second=produce(b);
 const p=x=>x.registry.pages.find(p=>p.id==='docs/generated/endpoint-inventory');
 assert.notEqual(p(first).translations.de.sourceHash,p(second).translations.de.sourceHash);
 const de=readFileSync(join(b.repo,p(second).translations.de.path),'utf8');
 assert.match(de,/\/after/);assert.match(de,new RegExp('c'.repeat(40)));assert.match(de,/refs\/heads\/dev/);
 assert.match(de,/belegt weder ein Release-Artefakt/);
});
test('expired source generation and private repository generation fail closed',t=>{
 const old=fixture(t),manifest=JSON.parse(readFileSync(join(old.stage,'manifest.json'),'utf8'));
 manifest.generatedAt='2026-01-01T00:00:00Z';writeFileSync(join(old.stage,'manifest.json'),JSON.stringify(manifest));
 assert.throws(()=>generationExport(old.stage,{toolingRoot:tooling}),/generation validation/);
 const privateInput=fixture(t,'/internal','ORISO-Infra');
 assert.throws(()=>generationExport(privateInput.stage,{toolingRoot:tooling}),/private\/unknown/);
});

test('hosted workflow binding preflight fails promptly without runner/root and accepts explicit binding',()=>{
 const text=readFileSync(join(root,'.github/workflows/docs-publication.yml'),'utf8');
 const body=text.match(/node - <<'NODE'\n([\s\S]*?)\n          NODE/)?.[1];assert.ok(body);
 assert.throws(()=>execFileSync(process.execPath,['-e',body],{env:{PATH:process.env.PATH},stdio:'pipe'}),e=>e.stderr.toString().includes('Missing deployment binding: DOCS_PUBLICATION_RUNNER_LABELS, DOCS_PUBLICATION_ROOT'));
 assert.doesNotThrow(()=>execFileSync(process.execPath,['-e',body],{env:{PATH:process.env.PATH,DOCS_PUBLICATION_RUNNER_LABELS:'["self-hosted","fixture-host"]',DOCS_PUBLICATION_ROOT:'/fixture/releases-root',DOCS_PUBLICATION_CURRENT_LINK:'/fixture/docs-site'},stdio:'pipe'}));
 assert.throws(()=>execFileSync(process.execPath,['-e',body],{env:{PATH:process.env.PATH,DOCS_PUBLICATION_RUNNER_LABELS:'["ubuntu-latest"]',DOCS_PUBLICATION_ROOT:'/fixture',DOCS_PUBLICATION_CURRENT_LINK:'/fixture/docs-site'},stdio:'pipe'}));
});
test('evidence identifier match on another clone SHA stays unverified',t=>{
 const workspace=mkdtempSync(join(tmpdir(),'docs-evidence-sha-'));t.after(()=>rmSync(workspace,{recursive:true,force:true}));
 const clones=join(workspace,'clones'),clone=join(clones,'ORISO-UserService');mkdirSync(join(clone,'src'),{recursive:true});
 execFileSync('git',['init','-q',clone]);writeFileSync(join(clone,'src/Claim.java'),'expectedIdentifier\n');
 execFileSync('git',['-C',clone,'add','.']);execFileSync('git',['-C',clone,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);
 const sha=execFileSync('git',['-C',clone,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const f=fixture(t,'/claim','ORISO-UserService',sha);writeFileSync(f.map,'entries:\n  - slug: identifier\n    evidence:\n      - repo: ORISO-UserService\n        path: src/Claim.java\n        expect: [expectedIdentifier]\n');
 const opts={generationDir:f.stage,repoRoot:f.repo,toolingRoot:tooling,evidenceMap:f.map,reposRoot:clones};
 assert.equal(prepareDocumentation(opts).evidence.counts.ok,1);
 writeFileSync(join(clone,'src/Claim.java'),'expectedIdentifier\n// changed\n');
 const dirty=prepareDocumentation(opts);assert.equal(dirty.evidence.counts.unverified,1);assert.equal(dirty.evidence.findings[0].evidence[0].reason,'clone-source-dirty');
 execFileSync('git',['-C',clone,'add','.']);execFileSync('git',['-C',clone,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','changed']);
 const changed=prepareDocumentation(opts);assert.equal(changed.evidence.counts.ok,0);assert.equal(changed.evidence.counts.unverified,1);
 assert.equal(changed.evidence.findings[0].evidence[0].reason,'clone-source-sha-mismatch');
});

test('actual generated catalog ingestion rejects edited source, private metadata and unmarked files',t=>{
 const f=fixture(t);prepareDocumentation({generationDir:f.stage,repoRoot:f.repo,toolingRoot:tooling,evidenceMap:f.map,reposRoot:join(f.temp,'no-clones')});
 const path=join(f.repo,'docs/generated/page-catalog.json'),original=readFileSync(path,'utf8');
 let registry=JSON.parse(original);registry.pages[0].graphSource.sources[0].repository='ORISO-Infra';writeFileSync(path,JSON.stringify(registry));
 assert.throws(()=>loadGeneratedCatalog(f.repo),/private\/unknown/);
 writeFileSync(path,original);const source=join(f.repo,registry.pages[0].source),before=readFileSync(source,'utf8');writeFileSync(source,before+'\nmodified');
 assert.throws(()=>loadGeneratedCatalog(f.repo),/binding/);
 writeFileSync(source,'# Editorial\n');assert.throws(()=>loadGeneratedCatalog(f.repo),/unmarked source/);
});
