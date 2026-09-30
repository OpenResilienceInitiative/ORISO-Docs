import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {renderFeatures} from '../render-features.mjs';
import {buildHub,installHub,readbackHub,validateSources} from '../publication.mjs';
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
test('actual source bindings and deterministic locale output validate',()=>{assert.equal(validateSources(root).features.length,10)});
test('validated public generation becomes immutable hub consumer artifact with exact readback',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-consumer-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();const generation=path.join(temp,'generation');execFileSync('python3',['-c',`
import sys,pathlib,datetime,json,shutil,hashlib
sys.path.insert(0,${JSON.stringify(path.join(root,'tools/understand-anything/test'))})
from bundle_contract_test import fixture
from bundle.contract import seal
from bundle.release_inputs import required_repositories,canonical_bytes
p=pathlib.Path(sys.argv[1]);now=datetime.datetime.now(datetime.timezone.utc);fixture(p,now)
sources=[]
for name in sorted(required_repositories()):
 sha=${JSON.stringify(revision)} if name=='ORISO-Docs' else 'a'*40
 shutil.copytree(p/'ORISO-Test',p/name)
 for f in (p/name).rglob('*.json'):f.write_text(f.read_text().replace('ORISO-Test',name).replace('a'*40,sha))
 sources.append(dict(repository=name,ref='refs/tags/v2.0.7',sourceSHA=sha,fetchedAt=now.isoformat(),fetchSuccess=True))
shutil.rmtree(p/'ORISO-Test')
for name in ['ORISO-Platform','ORISO-Supergraph']:
 f=p/name/'.understand-anything/knowledge-graph.json';g=json.loads(f.read_text());g['project']['sourceCommits']={s['repository']:s['sourceSHA'] for s in sources};f.write_text(json.dumps(g))
lock=dict(schemaVersion='oriso.platform-release/v1',version='v2.0.7',releaseUrl='https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7',documentationRevision=${JSON.stringify(revision)},sources=[{k:s[k] for k in ['repository','ref','sourceSHA']} for s in sources])
release=dict(lock=lock,sha256=hashlib.sha256(canonical_bytes(lock)).hexdigest(),publishedAt=now.isoformat(),releaseId=1,evidenceScope='published-github-release-and-source-refs')
seal(p,sources,now=now,release=release)
(p.parent/'release.json').write_text(json.dumps(lock))
`,generation],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
 const artifact=path.join(temp,'artifact'),origin='http://localhost:3000';const releaseLock=JSON.parse(fs.readFileSync(path.join(temp,'release.json')));const manifest=buildHub({root,out:artifact,generation,origin,revision,releaseLock});assert.equal(manifest.releaseBinding.sha256.length,64);const preview=buildHub({root,out:path.join(temp,'preview'),generation,origin,revision});assert.equal(preview.state,'preview');assert.throws(()=>installHub({artifact:path.join(temp,'preview'),destination:path.join(temp,'no-install'),currentLink:path.join(temp,'no-current'),origin,revision}),/binding/);await assert.rejects(readbackHub(preview),/release|preview/i);
 const mismatched=structuredClone(releaseLock);mismatched.sources.find(s=>s.repository==='ORISO-UserService').sourceSHA='b'.repeat(40);assert.throws(()=>buildHub({root,out:path.join(temp,'mismatch'),generation,origin,revision,releaseLock:mismatched}),/source vector/);assert.ok(!fs.existsSync(path.join(temp,'mismatch')));
 assert.equal(manifest.scope,'understand-hub');assert.ok(!manifest.files.some(f=>/legal|test|catalog/.test(f.path)));
 assert.throws(()=>installHub({artifact,origin,revision}),/explicit.*binding/);
 const currentLink=path.join(temp,'public-current'),destination=path.join(temp,'immutable');const installed=installHub({artifact,destination,currentLink,origin,revision});assert.equal(fs.realpathSync(currentLink),fs.realpathSync(installed));
 const legal=path.join(temp,'legal');fs.mkdirSync(legal);fs.writeFileSync(path.join(legal,'historical.html'),'preserved');
 await readbackHub(manifest,async url=>({ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(currentLink,new URL(url).pathname.slice(1)))}));
 await assert.rejects(readbackHub(manifest,async url=>({ok:true,arrayBuffer:async()=>new URL(url).pathname.endsWith('hub-manifest.json')?Buffer.from(JSON.stringify({...manifest,sourceRevision:'f'.repeat(40)})+'\n'):fs.readFileSync(path.join(currentLink,new URL(url).pathname.slice(1)))})),/manifest/);
 assert.equal(fs.readFileSync(path.join(legal,'historical.html'),'utf8'),'preserved');
 fs.writeFileSync(path.join(artifact,'index.html'),'tampered');assert.throws(()=>installHub({artifact,destination,currentLink,origin,revision}),/hash/);assert.equal(fs.realpathSync(currentLink),fs.realpathSync(installed));
 await assert.rejects(readbackHub(manifest,async()=>({ok:false})),/readback/);
});
test('actual canonical-source and locale output drift fail before artifact generation',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hub-bindings-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const data=JSON.parse(fs.readFileSync(path.join(root,'tools/understand-anything/site/hub/features/catalog.json'))),catalog=JSON.parse(fs.readFileSync(path.join(root,'site/page-catalog.json')));
 const copy=(relative)=>{fs.mkdirSync(path.dirname(path.join(temp,relative)),{recursive:true});fs.copyFileSync(path.join(root,relative),path.join(temp,relative));};
 copy('site/page-catalog.json');for(const f of data.features){copy(f.source);const p=catalog.pages.find(p=>p.id===f.id);for(const locale of ['de','en'])copy(p.translations[locale].path);}
 execFileSync('git',['init','-q',temp]);execFileSync('git',['-C',temp,'add','.']);execFileSync('git',['-C',temp,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture']);const revision=execFileSync('git',['-C',temp,'rev-parse','HEAD'],{encoding:'utf8'}).trim();for(const f of data.features)f.sourceRevision=revision;
 const hub=path.join(temp,'tools/understand-anything/site/hub/features');fs.mkdirSync(hub,{recursive:true});fs.writeFileSync(path.join(hub,'catalog.json'),JSON.stringify(data));
 // Use the actual renderer on a disposable source root.
 for(const locale of ['de','en'])fs.writeFileSync(path.join(hub,locale+'.html'),renderFeatures(data,locale));fs.writeFileSync(path.join(hub,'index.html'),renderFeatures(data,'de'));
 assert.equal(validateSources(temp).features.length,10);
 fs.appendFileSync(path.join(temp,data.features[0].source),'changed');assert.throws(()=>validateSources(temp),/Stale hub source binding/);copy(data.features[0].source);
 fs.appendFileSync(path.join(hub,'en.html'),'changed');assert.throws(()=>validateSources(temp),/renderer output differs/);
});
test('hosted preflight fails named missing operator bindings before consumer scheduling',()=>{
 const text=fs.readFileSync(path.join(root,'.github/workflows/ua-public-site.yml'),'utf8');const code=text.match(/node - <<'NODE'\n([\s\S]*?)\n          NODE/)[1].split('\n').map(x=>x.slice(10)).join('\n');
 assert.throws(()=>execFileSync(process.execPath,['-e',code],{env:{PATH:process.env.PATH},stdio:'pipe'}),error=>/UNDERSTAND_HUB_CURRENT/.test(error.stderr.toString())&&/UNDERSTAND_VIEWER_READBACK_TOKENS/.test(error.stderr.toString()));
 assert.ok(text.includes('needs: [binding, produce]'));assert.ok(text.includes('runtime-test.mjs'));assert.ok(text.includes('consumer.py'));assert.ok(text.includes('--readback'));assert.ok(!text.includes('UA_GRAPH_TOKEN'));
});
