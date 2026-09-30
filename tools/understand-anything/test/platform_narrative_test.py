"""Actual platform generator boundary; pinned core when UA_CORE is supplied."""
import unittest,pathlib,tempfile,json,subprocess,sys,os,hashlib
TOOLS=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(TOOLS))
from bundle.pipeline import exclude_unbound_platform_narrative
from bundle.contract import graph_check,ContractError
from bundle.release_inputs import required_repositories
class NativeNarrativeTests(unittest.TestCase):
 def test_actual_native_graph_excludes_baseline_without_semantic_mutation(self):
  baseline=TOOLS/'platform/narrative/platform-enrich.json';original=baseline.read_bytes()
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name)
   for repo in required_repositories():
    source=root/'sources'/repo;source.mkdir(parents=True);subprocess.run(['git','init','-q',str(source)],check=True)
    subprocess.run(['git','-C',str(source),'-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--allow-empty','-qm','synthetic'],check=True)
    sha=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip();directory=root/'graphs'/repo/'.understand-anything';directory.mkdir(parents=True)
    (directory/'knowledge-graph.json').write_text(json.dumps(dict(version='1.0.0',project=dict(name=repo,gitCommitHash=sha),nodes=[],edges=[],layers=[],tour=[])))
    (directory/'meta.json').write_text(json.dumps(dict(gitCommitHash=sha)))
   subprocess.run(['node',str(TOOLS/'platform/ua-platform-graph.mjs'),'--graphs-dir',str(root/'graphs'),'--repos-dir',str(root/'sources'),'--out',str(root/'out')],check=True,capture_output=True,text=True)
   graph_path=root/'out/knowledge-graph.json';before=json.loads(graph_path.read_text());coverage=exclude_unbound_platform_narrative(graph_path,baseline);after=json.loads(graph_path.read_text())
   expected=json.loads(json.dumps(before));expected['metadata']['narrativeCoverage']=coverage;self.assertEqual(after,expected);self.assertEqual(after['tour'],[]);self.assertFalse(any(n['id'].startswith('concept:') for n in after['nodes']))
   self.assertEqual(coverage['input']['sha256'],hashlib.sha256(original).hexdigest());self.assertEqual(coverage['input']['generatedAt'],'2026-09-04T00:00:00.000Z');self.assertEqual(coverage['appliedReviewedClaims'],0);self.assertFalse(coverage['runtimeVerified']);self.assertEqual(baseline.read_bytes(),original);graph_check(after)
   if os.environ.get('UA_CORE'):
    subprocess.run(['node','--input-type=module','-e',"import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import {verifyConsumer} from './tools/understand-anything/ua-validate-consumer.mjs';const {validateGraph}=await import(pathToFileURL(process.env.UA_CORE));verifyConsumer(JSON.parse(readFileSync(process.argv[1])),validateGraph);",str(graph_path)],cwd=TOOLS.parents[1],check=True,capture_output=True,text=True)
   reviewed=root/'reviewed.json';data=json.loads(original);data['concepts'][0]['claim']={'sourceCommit':'a'*40};reviewed.write_text(json.dumps(data));bytes_before=graph_path.read_bytes()
   with self.assertRaisesRegex(ContractError,'reviewed platform narrative'):exclude_unbound_platform_narrative(graph_path,reviewed)
   self.assertEqual(graph_path.read_bytes(),bytes_before)
