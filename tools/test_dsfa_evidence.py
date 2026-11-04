import copy, unittest
from dsfa_evidence import validate
class EvidenceContract(unittest.TestCase):
 def setUp(self):
  self.map={'visibility':'internal','schema':'oriso.dsfa.evidence/v2','entries':[{'slug':'claim','claim':'Text','source':{'branch':'docs/review','commit':'a'*40,'path':'oriso-platform/dsfa-text/evidence-map.yaml','sha256':'b'*64},'lifecycle':'documented','runtime':{'state':'not-verified','environment':None,'deployedCommit':None,'observedAt':None,'evidence':[]},'evidence':[]}]}
 def test_unverified_claim_is_valid_but_not_public_acceptance(self):
  self.assertEqual(validate(self.map),{'claims':1,'runtimeVerified':0,'allRuntimeVerified':False,'publicReady':False})
 def test_required_exact_source_and_runtime_fields(self):
  for field in ['branch','commit','path','sha256']:
   with self.subTest(field=field):
    item=copy.deepcopy(self.map);del item['entries'][0]['source'][field]
    with self.assertRaises(ValueError):validate(item)
  for value in ['a'*7,'x'*40,None]:
   item=copy.deepcopy(self.map);item['entries'][0]['source']['commit']=value
   with self.assertRaises(ValueError):validate(item)
  item=copy.deepcopy(self.map);del item['entries'][0]['runtime']['environment']
  with self.assertRaises(ValueError):validate(item)
 def test_no_absolute_home_paths_and_unique_claims(self):
  for path in ['/Users/person/code','../secret','C:\\Users\\person','file:///Users/person']:
   item=copy.deepcopy(self.map);item['entries'][0]['source']['path']=path
   with self.assertRaises(ValueError):validate(item)
  item=copy.deepcopy(self.map);item['entries']*=2
  with self.assertRaises(ValueError):validate(item)
 def test_live_needs_actual_runtime_evidence(self):
  item=copy.deepcopy(self.map);item['entries'][0]['lifecycle']='live'
  with self.assertRaises(ValueError):validate(item)
  item['entries'][0]['runtime']['state']='verified'
  with self.assertRaises(ValueError):validate(item)
 def test_unbound_code_cannot_claim_source_verification(self):
  item=copy.deepcopy(self.map);item['entries'][0]['evidence']=[{'repo':'ORISO-UserService','path':'src/file.java','source':None,'sourceVerification':'matched'}]
  with self.assertRaises(ValueError):validate(item)

 def test_every_original_claim_retained_and_runtime_unverified(self):
  from pathlib import Path
  import json,yaml
  root=Path(__file__).resolve().parents[1]/'oriso-platform/dsfa-text'
  original=yaml.safe_load((root/'evidence-map.yaml').read_text())['entries']
  current=json.loads((root/'evidence-map-v2.json').read_text())
  self.assertEqual([c['slug'] for c in original],[c['slug'] for c in current['entries']])
  self.assertEqual([c['claim'] for c in original],[c['claim'] for c in current['entries']])
  self.assertEqual([c['status'] for c in original],[c['legacyStatus'] for c in current['entries']])
  self.assertFalse(validate(current)['publicReady'])
  self.assertEqual(validate(current)['runtimeVerified'],0)

 def test_internal_evidence_is_never_public_ready(self):
  item=copy.deepcopy(self.map);runtime=item['entries'][0]['runtime'];runtime.update(state='verified',environment='dev',deployedCommit='a'*40,observedAt='2026-09-30T00:00:00Z',evidence=[{'reference':'internal-reviewed-test','sha256':'a'*64}])
  self.assertTrue(validate(item)['allRuntimeVerified'])
  self.assertFalse(validate(item)['publicReady'])
  item['visibility']='public'
  with self.assertRaises(ValueError):validate(item)
