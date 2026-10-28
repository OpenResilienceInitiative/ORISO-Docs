"""Synthetic complete published generation for the actual HTTP contract fixture."""
import pathlib,sys,subprocess,json,datetime,shutil,hashlib,os
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
sources_root=root/'sources';gen=sources_root/'graph-generation';now=datetime.datetime.fromisoformat(sys.argv[2]) if len(sys.argv)>2 else datetime.datetime.now(datetime.timezone.utc);fixture(gen,now)
sources=[]
for name in sorted(required_repositories()):
 shutil.copytree(source,sources_root/name);shutil.copytree(gen/'ORISO-Test',gen/name)
 for p in (gen/name).rglob('*.json'):p.write_text(p.read_text().replace('ORISO-Test',name).replace('a'*40,sha))
 p=gen/name/'.understand-anything/knowledge-graph.json';g=json.loads(p.read_text());g['nodes'][0]['filePath']='source.txt';p.write_text(json.dumps(g))
 sources.append(dict(repository=name,ref='refs/tags/v2.0.7',sourceSHA=sha,fetchedAt=now.isoformat(),fetchSuccess=True))
shutil.rmtree(gen/'ORISO-Test')
actual=os.environ.get('UNDERSTAND_FIXTURE_USERSERVICE')
actual_bindings={}
if actual:
 review=pathlib.Path(actual)
 for name in ['ORISO-UserService','ORISO-Keycloak']:
  repository=review/'sources'/name;sha_actual=subprocess.check_output(['git','-C',str(repository),'rev-parse','HEAD'],text=True).strip()
  shutil.rmtree(sources_root/name)
  subprocess.run(['git','clone','--quiet','--no-checkout','--no-local',str(repository),str(sources_root/name)],check=True)
  subprocess.run(['git','-C',str(sources_root/name),'checkout','--quiet','--detach',sha_actual],check=True)
  for filename in ['knowledge-graph.json','meta.json','fingerprints.json']:shutil.copyfile(review/'graphs'/name/'.understand-anything'/filename,gen/name/'.understand-anything'/filename)
  for source in sources:
   if source['repository']==name:source['sourceSHA']=sha_actual
  actual_bindings[name]=sha_actual
if actual and os.environ.get('UNDERSTAND_FIXTURE_CORE'):
 tooling=pathlib.Path(__file__).resolve().parents[1]
 env={**os.environ,'UA_CORE':os.environ['UNDERSTAND_FIXTURE_CORE'],'UA_BASE':str(gen),'UA_REPOSITORIES':','.join(sorted(required_repositories()))}
 subprocess.run(['node',str(tooling/'platform/ua-platform-graph.mjs'),'--graphs-dir',str(gen),'--repos-dir',str(sources_root),'--out',str(gen/'ORISO-Platform/.understand-anything')],env=env,check=True,stdout=subprocess.DEVNULL)
 subprocess.run(['node',str(tooling/'ua-build-supergraph.mjs'),'--out',str(gen/'ORISO-Supergraph/.understand-anything')],env=env,check=True,stdout=subprocess.DEVNULL)
else:
 for name in ['ORISO-Platform','ORISO-Supergraph']:
  p=gen/name/'.understand-anything/knowledge-graph.json';g=json.loads(p.read_text());vector={s['repository']:s['sourceSHA'] for s in sources};g['project']['sourceCommits']=vector
  g['kind']='oriso-platform' if name=='ORISO-Platform' else 'oriso-super-graph';records=[{'repo':s['repository'],'gitCommitHash':s['sourceSHA']} for s in sources]
  if name=='ORISO-Platform':g['metadata']['sources']=records
  else:g['mergeMetadata']={'sourceRepos':records}
  ids={n['id']:'ORISO-Docs::'+n['id'] for n in g['nodes']}
  for node in g['nodes']:
   node['id']=ids[node['id']];node['sourceRepo']='ORISO-Docs';node['metadata']={'sourceRepo':'ORISO-Docs','sourceCommit':vector['ORISO-Docs']}
  g['nodes'][0]['filePath']='source.txt';g['nodes'][0]['name']='Synthetic source fixture'
  for edge in g['edges']:edge['source']=ids[edge['source']];edge['target']=ids[edge['target']]
  for section in g['layers']+g['tour']:section['nodeIds']=[ids[i] for i in section['nodeIds']]
  p.write_text(json.dumps(g))
if actual:
 now=datetime.datetime.now(datetime.timezone.utc)
 for directory in gen.iterdir():
  config=directory/'.understand-anything/config.json'
  if config.parent.is_dir():
   value=json.loads(config.read_text()) if config.exists() else {};value['outputLanguage']=os.environ.get('UNDERSTAND_FIXTURE_LANGUAGE','en');config.write_text(json.dumps(value))
lock=dict(schemaVersion='oriso.platform-release/v1',version='v2.0.7',releaseUrl='https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7',documentationRevision=sha,sources=[{k:s[k] for k in ['repository','ref','sourceSHA']} for s in sources])
evidence=dict(lock=lock,sha256=hashlib.sha256(canonical_bytes(lock)).hexdigest(),publishedAt=now.isoformat(),releaseId=1,evidenceScope='published-github-release-and-source-refs')
seal(gen,sources,now=now,release=evidence)
if actual:
 bindings={}
 for name,sha_actual in actual_bindings.items():
  raw=review/'graphs'/name/'.understand-anything/knowledge-graph.json';published=gen/name/'.understand-anything/knowledge-graph.json'
  original=json.loads(raw.read_bytes());sealed=json.loads(published.read_bytes());normalized=json.loads(json.dumps(sealed));expected=json.loads(json.dumps(original))
  for graph in [normalized,expected]:
   for node in graph['nodes']:
    claim=node.get('metadata',{}).get('semanticClaim')
    if claim:claim.pop('evaluatedGenerationId',None)
  assert normalized['nodes']==expected['nodes'] and normalized['edges']==expected['edges']
  assert sealed['project']['gitCommitHash']==sha_actual
  bindings[name]={'sourceSHA':sha_actual,'originalSHA256':hashlib.sha256(raw.read_bytes()).hexdigest(),'sealedSHA256':hashlib.sha256(published.read_bytes()).hexdigest(),'nodeCount':len(sealed['nodes']),'edgeCount':len(sealed['edges'])}
 (root/'fullscale-binding.json').write_text(json.dumps({'fixture':True,'repositories':bindings,'generationChanges':['generationId','sourceRepositories','metadata.semanticClaim.evaluatedGenerationId'],'remainingSources':'14 controlled synthetic source trees; not a published release'},indent=2)+'\n')
