import unittest,sys,pathlib,tempfile,subprocess,json,copy,hashlib
TOOLS=pathlib.Path(__file__).resolve().parents[2]/'tools/understand-anything';sys.path.insert(0,str(TOOLS))
from bundle.release_inputs import validate_lock,verify_release,load_release,required_repositories,canonical_bytes
from bundle.pipeline import fetch_source
from bundle.contract import ContractError

def lock():return {'schemaVersion':'oriso.platform-release/v1','version':'v2.0.7','releaseUrl':'https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.7','documentationRevision':'a'*40,'sources':[{'repository':n,'ref':'refs/tags/v2.0.7','sourceSHA':'a'*40} for n in sorted(required_repositories())]}
def api(path):return {'private':False,'visibility':'public'} if '/releases/' not in path else {'draft':False,'prerelease':False,'published_at':'2026-09-30T00:00:00Z','tag_name':'v2.0.7','html_url':lock()['releaseUrl'],'id':1,'assets':[{'name':'platform-release.json','state':'uploaded','size':len(canonical_bytes(lock())),'digest':'sha256:'+hashlib.sha256(canonical_bytes(lock())).hexdigest()}]}
class ReleaseLockTests(unittest.TestCase):
 def test_complete_lock_is_source_evidence_not_approval(self):
  result=verify_release(lock(),api=api,tag_sha=lambda *_:'a'*40);self.assertEqual(result['evidenceScope'],'published-github-release-and-source-refs');self.assertEqual(len(result['sha256']),64)
 def test_missing_private_tip_and_unpublished_inputs_fail(self):
  with self.assertRaises(Exception):load_release(None)
  for change in [lambda x:x['sources'].pop(),lambda x:x['sources'][0].update(repository='ORISO-Infra'),lambda x:x['sources'][0].update(ref='refs/heads/dev'),lambda x:x.update(documentationRevision='b'*40)]:
   data=lock();change(data)
   with self.assertRaises(Exception):validate_lock(data)
  with self.assertRaises(Exception):verify_release(lock(),api=lambda p:{**api(p),'draft':True},tag_sha=lambda *_:'a'*40)
  with self.assertRaises(Exception):verify_release(lock(),api=lambda p:{**api(p),'private':True},tag_sha=lambda *_:'a'*40)
 def test_retargeted_tag_and_wrong_docs_revision_fail(self):
  with self.assertRaisesRegex(Exception,'retargeted'):verify_release(lock(),api=api,tag_sha=lambda *_:'b'*40)
  with self.assertRaisesRegex(Exception,'documentation revision'):validate_lock(lock(),'b'*40)
 def test_public_source_cli_without_lock_fails_before_clone(self):
  with tempfile.TemporaryDirectory() as name:
   p=pathlib.Path(name);result=subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('ua_sources.py')),'--tooling',str(TOOLS),'--base',str(p/'sources'),'--inventory',str(p/'inventory.json'),'--repo-args',str(p/'args'),'--require-release','--documentation-revision','a'*40],capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertIn('release manifest required',result.stdout);self.assertFalse((p/'sources').exists())
 def test_other_public_origin_rejected_despite_complete_valid_source_vector(self):
  for origin in ['ORISO-Frontend','ORISO-Docs','ORISO-UserService']:
   data=lock();data['releaseUrl']=data['releaseUrl'].replace('/ORISO-Helm/','/'+origin+'/')
   with self.assertRaisesRegex(Exception,'ORISO-Helm'):validate_lock(data)
 def test_helm_origin_tag_must_match_its_exact_locked_sha(self):
  data=lock();helm=next(s for s in data['sources'] if s['repository']=='ORISO-Helm');helm['ref']=helm['sourceSHA']
  with self.assertRaisesRegex(Exception,'origin tag'):verify_release(data,api=lambda p:{**api(p),'assets':[{'name':'platform-release.json','state':'uploaded','size':len(canonical_bytes(data)),'digest':'sha256:'+hashlib.sha256(canonical_bytes(data)).hexdigest()}]} if '/releases/' in p else api(p),tag_sha=lambda repo,ref:'b'*40 if repo=='ORISO-Helm' else 'a'*40)
 def test_release_asset_missing_duplicate_state_size_and_digest_fail(self):
  for assets in [[],[api('repos/x/releases/tags/x')['assets'][0]]*2,[{**api('repos/x/releases/tags/x')['assets'][0],'state':'new'}],[{**api('repos/x/releases/tags/x')['assets'][0],'size':1}],[{**api('repos/x/releases/tags/x')['assets'][0],'digest':'sha256:'+'b'*64}]]:
   with self.subTest(assets=assets):
    with self.assertRaisesRegex(Exception,'release asset'):verify_release(lock(),api=lambda p:{**api(p),'assets':assets} if '/releases/' in p else api(p),tag_sha=lambda *_:'a'*40)
 def test_other_payload_same_helm_version_and_commit_is_not_released_asset(self):
  data=lock();next(s for s in data['sources'] if s['repository']=='ORISO-UserService')['sourceSHA']='b'*40
  shas={s['repository']:s['sourceSHA'] for s in data['sources']}
  with self.assertRaisesRegex(Exception,'release asset'):verify_release(data,api=api,tag_sha=lambda repo,ref:shas[repo])
 def test_actual_git_tag_retarget_and_sha_fetch(self):
  with tempfile.TemporaryDirectory() as name:
   p=pathlib.Path(name);remote=p/'remote';subprocess.run(['git','init','-q',str(remote)],check=True);(remote/'file').write_text('one');subprocess.run(['git','-C',str(remote),'add','.'],check=True)
   commit=['git','-C',str(remote),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm']
   subprocess.run(commit+['one'],check=True);first=subprocess.check_output(['git','-C',str(remote),'rev-parse','HEAD'],text=True).strip();subprocess.run(['git','-C',str(remote),'tag','v2.0.7'],check=True)
   clone=p/'clone';subprocess.run(['git','clone','-q',str(remote),str(clone)],check=True)
   self.assertEqual(fetch_source(clone,'refs/tags/v2.0.7',expected_sha=first),first);self.assertEqual(fetch_source(clone,first,expected_sha=first),first)
   (remote/'file').write_text('two');subprocess.run(['git','-C',str(remote),'add','.'],check=True);subprocess.run(commit+['two'],check=True);subprocess.run(['git','-C',str(remote),'tag','-f','v2.0.7'],check=True,stdout=subprocess.DEVNULL)
   with self.assertRaisesRegex(ContractError,'released source SHA'):fetch_source(clone,'refs/tags/v2.0.7',expected_sha=first)
class PreviewDocumentationInputsTests(unittest.TestCase):
 def test_preview_catalogue_comes_from_the_checked_out_docs_commit_not_moving_dev(self):
  import ua_sources
  entries=[{'name':'ORISO-Docs','branch':'dev','enrichment':'enrich-docs.json'},{'name':'ORISO-TenantService','branch':'dev','enrichment':'enrich-tenantservice.json'}]
  selected=ua_sources.select_preview_entries(entries,'b'*40)
  self.assertEqual(selected[0]['branch'],'b'*40);self.assertEqual(selected[0]['sourceSHA'],'b'*40)
  self.assertEqual(selected[1],entries[1]);self.assertEqual(entries[0]['branch'],'dev')
  for invalid in [None,'dev','refs/pull/162/merge','b'*39,'b'*40+';echo bad']:
   with self.subTest(invalid=invalid):
    with self.assertRaisesRegex(ValueError,'Exact documentation revision'):ua_sources.select_preview_entries(entries,invalid)
 def test_preview_requires_the_docs_repository_and_invalid_input_never_creates_clone_output(self):
  import ua_sources
  with self.assertRaisesRegex(ValueError,'Docs source'):ua_sources.select_preview_entries([], 'b'*40)
  with tempfile.TemporaryDirectory() as name:
   p=pathlib.Path(name);result=subprocess.run([sys.executable,str(pathlib.Path(__file__).with_name('ua_sources.py')),'--tooling',str(TOOLS),'--base',str(p/'sources'),'--inventory',str(p/'inventory.json'),'--repo-args',str(p/'args'),'--documentation-revision','dev'],capture_output=True,text=True)
   self.assertNotEqual(result.returncode,0);self.assertFalse((p/'sources').exists())
 def test_container_git_trust_applies_to_only_the_checked_out_workspace(self):
  import os,re
  workflow=(TOOLS.parents[1]/'.github/workflows/ua-tooling.yml').read_text()
  command=re.search(r'name: Trust the checked-out workspace in the ephemeral container\n\s+run: (.+)',workflow).group(1)
  with tempfile.TemporaryDirectory() as name:
   p=pathlib.Path(name);workspace=p/'workspace';other=p/'other'
   for repo in [workspace,other]:subprocess.run(['git','init','-q',str(repo)],check=True)
   env={**os.environ,'GIT_CONFIG_GLOBAL':str(p/'gitconfig'),'GIT_CONFIG_NOSYSTEM':'1','GIT_TEST_ASSUME_DIFFERENT_OWNER':'1','GITHUB_WORKSPACE':str(workspace)}
   probe=lambda repo:subprocess.run(['git','-C',str(repo),'status','--short'],env=env,capture_output=True,text=True)
   self.assertIn('dubious ownership',probe(workspace).stderr)
   subprocess.run(['bash','-euc',command],env=env,check=True)
   self.assertEqual(probe(workspace).returncode,0);self.assertIn('dubious ownership',probe(other).stderr)
   self.assertEqual(subprocess.check_output(['git','config','--global','--get-all','safe.directory'],env=env,text=True).strip(),str(workspace))
if __name__=='__main__':unittest.main()
