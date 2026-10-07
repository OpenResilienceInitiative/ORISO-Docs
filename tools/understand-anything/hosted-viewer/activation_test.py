"""Public activation transaction boundary; synthetic failures are not deployment evidence."""
import unittest,tempfile,pathlib
from activation import activate
class ActivationTests(unittest.TestCase):
 def test_readback_failure_restores_preceding_complete_pointers_and_compose(self):
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);old=root/'old';new=root/'new';old.mkdir();new.mkdir();links=[root/x for x in ['hub','sources','static','runtime']]
   for link in links:link.symlink_to(old)
   compose=root/'compose.yml';compose.write_text('services: old\n');restarted=[]
   def install():
    for link in links:link.unlink();link.symlink_to(new)
    compose.write_text('services: new\n')
    raise ValueError('Synthetic public hash mismatch')
   with self.assertRaisesRegex(ValueError,'Synthetic public hash mismatch'):activate(links,compose,root/'journal',install,lambda:restarted.append('preceding-services'))
   self.assertTrue(all(p.resolve()==old.resolve() for p in links));self.assertEqual(compose.read_text(),'services: old\n');self.assertEqual(restarted,['preceding-services'])
 def test_first_install_failure_removes_only_new_current_links(self):
  with tempfile.TemporaryDirectory() as name:
   root=pathlib.Path(name);new=root/'new';new.mkdir();current=root/'current';compose=root/'compose';compose.write_text('unchanged')
   def install():current.symlink_to(new);raise ValueError('failed')
   with self.assertRaises(ValueError):activate([current],compose,root/'journal',install,lambda:None)
   self.assertFalse(current.exists());self.assertTrue(new.is_dir());self.assertEqual(compose.read_text(),'unchanged')
