import unittest,sys,pathlib,tempfile,subprocess,json,copy
TOOLS=pathlib.Path(__file__).resolve().parents[2]/'tools/understand-anything';sys.path.insert(0,str(TOOLS))
from bundle.release_inputs import validate_lock,verify_release,load_release,required_repositories
from bundle.pipeline import fetch_source
from bundle.contract import ContractError

def lock():return {'schemaVersion':'oriso.platform-release/v1','version':'v2.0.7','releaseUrl':'https://github.com/OpenResilienceInitiative/ORISO-Frontend/releases/tag/v2.0.7','documentationRevision':'a'*40,'sources':[{'repository':n,'ref':'refs/tags/v2.0.7','sourceSHA':'a'*40} for n in sorted(required_repositories())]}
def api(path):return {'private':False,'visibility':'public'} if '/releases/' not in path else {'draft':False,'prerelease':False,'published_at':'2026-09-30T00:00:00Z','tag_name':'v2.0.7','html_url':lock()['releaseUrl'],'id':1}
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
 def test_actual_git_tag_retarget_and_sha_fetch(self):
  with tempfile.TemporaryDirectory() as name:
   p=pathlib.Path(name);remote=p/'remote';subprocess.run(['git','init','-q',str(remote)],check=True);(remote/'file').write_text('one');subprocess.run(['git','-C',str(remote),'add','.'],check=True)
   commit=['git','-C',str(remote),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm']
   subprocess.run(commit+['one'],check=True);first=subprocess.check_output(['git','-C',str(remote),'rev-parse','HEAD'],text=True).strip();subprocess.run(['git','-C',str(remote),'tag','v2.0.7'],check=True)
   clone=p/'clone';subprocess.run(['git','clone','-q',str(remote),str(clone)],check=True)
   self.assertEqual(fetch_source(clone,'refs/tags/v2.0.7',expected_sha=first),first);self.assertEqual(fetch_source(clone,first,expected_sha=first),first)
   (remote/'file').write_text('two');subprocess.run(['git','-C',str(remote),'add','.'],check=True);subprocess.run(commit+['two'],check=True);subprocess.run(['git','-C',str(remote),'tag','-f','v2.0.7'],check=True,stdout=subprocess.DEVNULL)
   with self.assertRaisesRegex(ContractError,'released source SHA'):fetch_source(clone,'refs/tags/v2.0.7',expected_sha=first)
if __name__=='__main__':unittest.main()
