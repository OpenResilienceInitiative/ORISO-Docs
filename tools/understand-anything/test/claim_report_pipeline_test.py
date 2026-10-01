"""Internal report location is separate from atomic public generations."""
import pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from bundle.pipeline import internal_report_directory
from bundle.contract import ContractError
class ReportLocationTests(unittest.TestCase):
 def test_public_root_current_child_and_symlink_alias_are_rejected_before_creation(self):
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);public=root/'public';public.mkdir();alias=root/'alias';alias.symlink_to(public,target_is_directory=True)
   for destination in [public,public/'current/review',alias/'review']:
    with self.subTest(destination=destination):
     with self.assertRaisesRegex(ContractError,'outside'):internal_report_directory(destination,public)
   self.assertEqual(list(public.iterdir()),[])
 def test_separate_internal_sibling_resolves_without_creating_anything(self):
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);destination=root/'internal-review'
   self.assertEqual(internal_report_directory(destination,root/'public'),destination.resolve())
   self.assertFalse(destination.exists())

class PublicPolicyTests(unittest.TestCase):
 def test_shared_policy_is_exact_supported_vector_and_subset_of_public_visibility(self):
  import json
  from bundle.release_inputs import required_repositories
  tools=pathlib.Path(__file__).resolve().parents[1]
  policy=json.loads((tools/'bundle/public-repositories.json').read_text())
  names=required_repositories()
  visibility=json.loads((tools.parent/'truth-chain/public-repositories.json').read_text())
  self.assertEqual(set(policy['repositories']),names)
  self.assertEqual(len(names),16)
  self.assertTrue(names <= set(visibility['repositories']))
