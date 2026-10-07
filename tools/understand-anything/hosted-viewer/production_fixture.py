"""Synthetic complete published generation for the actual HTTP contract fixture."""
import pathlib,sys,subprocess,json,datetime,shutil,hashlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'test'))
from bundle_contract_test import fixture
from bundle.contract import seal
from bundle.release_inputs import required_repositories,canonical_bytes
root=pathlib.Path(sys.argv[1]);source=root/'source';source.mkdir()
subprocess.run(['git','init','-q',str(source)],check=True)
(source/'source.txt').write_text('Synthetic source text\n')
subprocess.run(['git','-C',str(source),'add','.'],check=True)
subprocess.run(['git','-C',str(source),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'],check=True)
sha=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
sources_root=root/'sources';gen=sources_root/'graph-generation';now=datetime.datetime.now(datetime.timezone.utc);fixture(gen,now)
sources=[]
for name in sorted(required_repositories()):
 shutil.copytree(source,sources_root/name);shutil.copytree(gen/'ORISO-Test',gen/name)
 for p in (gen/name).rglob('*.json'):p.write_text(p.read_text().replace('ORISO-Test',name).replace('a'*40,sha))
 p=gen/name/'.understand-anything/knowledge-graph.json';g=json.loads(p.read_text());g['nodes'][0]['filePath']='source.txt';p.write_text(json.dumps(g))
 sources.append(dict(repository=name,ref='refs/tags/v2.0.7',sourceSHA=sha,fetchedAt=now.isoformat(),fetchSuccess=True))
shutil.rmtree(gen/'ORISO-Test')
for name in ['ORISO-Platform','ORISO-Supergraph']:
 p=gen/name/'.understand-anything/knowledge-graph.json';g=json.loads(p.read_text());g['project']['sourceCommits']={s['repository']:sha for s in sources};p.write_text(json.dumps(g))
lock=dict(schemaVersion='oriso.platform-release/v1',version='v2.0.7',releaseUrl='https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7',documentationRevision=sha,sources=[{k:s[k] for k in ['repository','ref','sourceSHA']} for s in sources])
evidence=dict(lock=lock,sha256=hashlib.sha256(canonical_bytes(lock)).hexdigest(),publishedAt=now.isoformat(),releaseId=1,evidenceScope='published-github-release-and-source-refs')
seal(gen,sources,now=now,release=evidence)
