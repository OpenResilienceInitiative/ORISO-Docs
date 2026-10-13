import unittest,pathlib,tempfile,json,subprocess,shutil,sys,datetime
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'test'))
from bundle_contract_test import fixture
from bundle.contract import seal
from consumer import install_sources
class ConsumerTests(unittest.TestCase):
 def test_actual_git_sources_install_only_matching_public_generation(self):
  with tempfile.TemporaryDirectory() as name:
   temp=pathlib.Path(name);repo=temp/'source';repo.mkdir();subprocess.run(['git','init','-q',str(repo)],check=True);(repo/'source.txt').write_text('synthetic source')
   subprocess.run(['git','-C',str(repo),'add','source.txt'],check=True);subprocess.run(['git','-C',str(repo),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture'],check=True)
   sha=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip();gen=temp/'generation';now=datetime.datetime.now(datetime.timezone.utc);sources=fixture(gen,now)
   for p in gen.rglob('*.json'):p.write_text(p.read_text().replace('ORISO-Test','ORISO-UserService'))
   (gen/'ORISO-Test').rename(gen/'ORISO-UserService')
   sources[0]['repository']='ORISO-UserService'
   # A structurally valid branch preview must fail before any installation writes.
   seal(gen,sources,now=now)
   preview_root=temp/'preview-installed'
   def refuse_clone(*args):raise AssertionError('Preview reached clone before release guard')
   with self.assertRaisesRegex(ValueError,'release'):install_sources(gen,preview_root,refuse_clone)
   self.assertFalse(preview_root.exists())
   shutil.rmtree(gen);fixture(gen,now)
   from bundle.release_inputs import required_repositories,canonical_bytes
   import hashlib
   sources=[]
   for name in sorted(required_repositories()):
    shutil.copytree(gen/'ORISO-Test',gen/name)
    for p in (gen/name).rglob('*.json'):p.write_text(p.read_text().replace('ORISO-Test',name).replace('a'*40,sha))
    sources.append(dict(repository=name,ref='refs/tags/v2.0.7',sourceSHA=sha,fetchedAt=now.isoformat(),fetchSuccess=True))
   shutil.rmtree(gen/'ORISO-Test')
   for name in ['ORISO-Platform','ORISO-Supergraph']:
    p=gen/name/'.understand-anything/knowledge-graph.json';g=json.loads(p.read_text());g['project']['sourceCommits']={s['repository']:sha for s in sources};p.write_text(json.dumps(g))
   lock=dict(schemaVersion='oriso.platform-release/v1',version='v2.0.7',releaseUrl='https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7',documentationRevision=sha,sources=[{k:s[k] for k in ['repository','ref','sourceSHA']} for s in sources])
   evidence=dict(lock=lock,sha256=hashlib.sha256(canonical_bytes(lock)).hexdigest(),publishedAt=now.isoformat(),releaseId=1,evidenceScope='published-github-release-and-source-refs')
   seal(gen,sources,now=now,release=evidence)
   manifest_path=gen/'manifest.json';original=manifest_path.read_text();tampered=json.loads(original);tampered['release']['sha256']='b'*64;manifest_path.write_text(json.dumps(tampered))
   with self.assertRaisesRegex(Exception,'release'):install_sources(gen,temp/'tampered-install',refuse_clone)
   self.assertFalse((temp/'tampered-install').exists());manifest_path.write_text(original)
   def clone(name,revision,target):shutil.copytree(repo,target)
   root=temp/'installed';result=install_sources(gen,root,clone);self.assertEqual((root/'current').resolve(),result.resolve());self.assertEqual((result/'ORISO-UserService/source.txt').read_text(),'synthetic source')
   self.assertTrue((result/'graph-generation/manifest.json').is_file())
   other=temp/'other-generation';other.mkdir();(root/'current').unlink();(root/'current').symlink_to(other)
   def no_clone(*args):raise AssertionError('Immutable reuse must not clone again')
   reused=install_sources(gen,root,no_clone);self.assertEqual(reused.resolve(),result.resolve());self.assertEqual((root/'current').resolve(),result.resolve())
   # Even an ignored working-copy file blocks reuse; tracked HEAD alone is insufficient.
   ignored=result/'ORISO-UserService/ignored-secret.txt';ignored.write_text('SYNTHETIC_PRIVATE_SENTINEL');(result/'ORISO-UserService/.git/info/exclude').write_text('ignored-secret.txt\n')
   with self.assertRaisesRegex(ValueError,'checkout changed'):install_sources(gen,root,no_clone)
   self.assertEqual((root/'current').resolve(),result.resolve());ignored.unlink()
   # A wrong checkout cannot activate over the existing complete source generation.
   wrong=temp/'wrong';wrong.mkdir();bad=gen/'manifest.json';data=json.loads(bad.read_text());data['generationId']='not-valid';bad.write_text(json.dumps(data))
   with self.assertRaises(Exception):install_sources(gen,root,clone)
   self.assertEqual((root/'current').resolve(),result.resolve())

class ViewerBindingTests(unittest.TestCase):
 def test_per_repository_graphs_and_missing_coverage_fail_truthfully(self):
  import importlib.util
  spec=importlib.util.spec_from_file_location('mounts',pathlib.Path(__file__).with_name('configure-source-mounts.py'));mounts=importlib.util.module_from_spec(spec);spec.loader.exec_module(mounts)
  manifest={'sources':[{'repository':'ORISO-UserService'},{'repository':'ORISO-AgencyService'}]}
  bindings=[{'service':s,'repository':r,'origin':'https://understand.oriso.org/'+{'users':'user-service','agencies':'agency-service'}[s]+'/','workspaceTarget':'/plugin','graphTarget':'/graph'} for s,r in [('users','ORISO-UserService'),('agencies','ORISO-AgencyService')]]
  with self.assertRaisesRegex(ValueError,'Missing public repository viewer bindings'):mounts.validate_bindings(bindings[:1],manifest,{'users':{},'agencies':{}})
  for service,repo in [('platform','ORISO-Platform'),('supergraph','ORISO-Supergraph')]:bindings.append({'service':service,'repository':repo,'origin':'https://understand.oriso.org/'+service+'/','workspaceTarget':'/plugin','graphTarget':'/graph'})
  services={b['service']:{} for b in bindings}
  self.assertEqual(len(mounts.validate_bindings(bindings,manifest,services)),4)
  with tempfile.TemporaryDirectory() as name:
   temp=pathlib.Path(name);compose=temp/'compose.yml';compose.write_text('services:\n  users:\n    environment: {}\n  agencies:\n    environment: {}\n  platform:\n    environment: {}\n  supergraph:\n    environment: {}\n  legal:\n    image: historical\n')
   for repo in ['ORISO-UserService','ORISO-AgencyService','ORISO-Platform','ORISO-Supergraph']:
    graph=temp/'sources/graph-generation'/repo/'.understand-anything';graph.mkdir(parents=True);(graph/'knowledge-graph.json').write_text('{}')
   mounts.configure(compose,str(temp/'sources'),str(temp/'runtime'),bindings,manifest)
   import yaml
   data=yaml.safe_load(compose.read_text());self.assertEqual(data['services']['legal'],{'image':'historical'})
   for b in bindings:
    volumes=data['services'][b['service']]['volumes'];self.assertTrue(any('/graph-generation/'+b['repository']+':/graph:ro' in v for v in volumes));self.assertFalse(any('ORISO-Supergraph' in v for v in volumes) and b['repository']!='ORISO-Supergraph')


class ViewerReadbackTests(unittest.TestCase):
 def test_stale_200_same_source_body_does_not_prove_current_generation(self):
  from readback import readback_viewer
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);graph_dir=root/'graph-generation/ORISO-UserService/.understand-anything';graph_dir.mkdir(parents=True);source_dir=root/'ORISO-UserService';source_dir.mkdir();(source_dir/'source.txt').write_text('unchanged source')
   meta={'generationId':'current-fixture','gitCommitHash':'a'*40};graph={'nodes':[{'id':'source','filePath':'source.txt'}]};(root/'graph-generation/manifest.json').write_text(json.dumps({'generationId':'current-fixture','sources':[{'repository':'ORISO-UserService','sourceSHA':'a'*40}]}));(graph_dir/'meta.json').write_text(json.dumps(meta));(graph_dir/'knowledge-graph.json').write_text(json.dumps(graph))
   binding={'service':'users','repository':'ORISO-UserService','origin':'https://understand.oriso.org/users/'}
   def fetch(origin,file,token,params=None):return {'meta.json':meta,'knowledge-graph.json':graph,'file-content.json':{'content':'unchanged source'}}[file]
   self.assertEqual(readback_viewer(root,binding,'synthetic',fetch),'users')
   def stale_meta(origin,file,token,params=None):return {**meta,'gitCommitHash':'b'*40} if file=='meta.json' else fetch(origin,file,token,params)
   with self.assertRaisesRegex(ValueError,'metadata/generation/source SHA mismatch'):readback_viewer(root,binding,'synthetic',stale_meta)
   def stale_graph(origin,file,token,params=None):return {**graph,'generationId':'old-fixture'} if file=='knowledge-graph.json' else fetch(origin,file,token,params)
   with self.assertRaisesRegex(ValueError,'graph/generation mismatch'):readback_viewer(root,binding,'synthetic',stale_graph)

if __name__=='__main__':unittest.main()

class ProductionBindingTests(unittest.TestCase):
 def test_existing_viewer_services_run_static_artifact_on_their_bound_ports_and_leave_legal_alone(self):
  import importlib.util,yaml
  spec=importlib.util.spec_from_file_location('mounts',pathlib.Path(__file__).with_name('configure-source-mounts.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);compose=root/'compose.yml';repos=['ORISO-UserService','ORISO-Docs','ORISO-Platform','ORISO-Supergraph'];services=['users','docs','platform','supergraph']
   bindings=[dict(service=s,repository=r,origin='https://understand.oriso.org'+m.ROUTES[r],workspaceTarget='/plugin',graphTarget='/graph') for s,r in zip(services,repos)]
   data={'services':{s:{'image':'historical-dev','command':['pnpm','dev'],'ports':['127.0.0.1:'+str(5100+i)+':5173'],'environment':{}} for i,s in enumerate(services)}};data['services']['legal']={'image':'preserved-legal'};compose.write_text(yaml.safe_dump(data))
   manifest={'sources':[dict(repository=r,sourceSHA='a'*40) for r in repos[:2]]}
   for r in repos:
    graph=root/'sources/graph-generation'/r/'.understand-anything';graph.mkdir(parents=True);(graph/'knowledge-graph.json').write_text('{}')
   m.configure_production(compose,str(root/'sources'),str(root/'runtime'),str(root/'static'),bindings,manifest)
   actual=yaml.safe_load(compose.read_text());self.assertEqual(actual['services']['legal'],{'image':'preserved-legal'})
   for s,r in zip(services,repos):
    service=actual['services'][s];self.assertEqual(service['image'],'oriso-understand-static:'+'a'*40);self.assertEqual(service['command'][:2],['node','/opt/ua-static/production.mjs']);self.assertIn(m.ROUTES[r],service['command']);self.assertIn('5173',service['command']);self.assertTrue(service['read_only']);self.assertTrue(all(v.endswith(':ro') for v in service['volumes']))

class CompressionReadbackTests(unittest.TestCase):
 def test_public_gzip_readback_verifies_decoded_bytes_and_rejects_same_shape_wrong_bytes(self):
  import gzip
  from readback import verify_compressed_graph
  expected=b'{"nodes": [], "edges": []}\n'
  self.assertTrue(verify_compressed_graph('https://understand.oriso.org/users/',expected,'public-marker',lambda *a:{'contentEncoding':'gzip','body':gzip.compress(expected)}))
  with self.assertRaisesRegex(ValueError,'hash mismatch'):verify_compressed_graph('https://understand.oriso.org/users/',expected,'public-marker',lambda *a:{'contentEncoding':'gzip','body':gzip.compress(b'{"nodes": [], "edges": []}')})
  with self.assertRaisesRegex(ValueError,'gzip'):verify_compressed_graph('https://understand.oriso.org/users/',expected,'public-marker',lambda *a:{'contentEncoding':None,'body':expected})
