import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('ua_install',Path(__file__).parents[1]/'install.py')
installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.base=Path(self.temp.name).resolve();self.source=self.base/'source';self.source.mkdir()
        (self.source/'toolchain.lock.json').write_text(json.dumps({'upstream':{'url':'https://example.invalid/repo','commit':'a'*40},'patches':[],'pnpm':'10.6.2','nodeImage':'node@sha256:test'}))
        (self.source/'ua-pull.sh').write_text('fixture');(self.source/'ua-dashboard.sh').write_text('fixture')
        (self.source/'skills/oriso-graph').mkdir(parents=True);(self.source/'skills/oriso-graph/SKILL.md').write_text('fixture')
        self.root=self.base/'runtime';self.profile=self.base/'profile'
    def tearDown(self): self.temp.cleanup()
    def install(self):
        with patch.object(installer,'SOURCE',self.source),patch.object(installer,'run'):
            return installer.install(self.root,self.profile)
    def test_same_release_keeps_prior_rollback(self):
        first=self.install();(self.source/'ua-pull.sh').write_text('second');second=self.install()
        self.assertNotEqual(first,second);self.assertEqual((self.root/'previous').resolve(),first)
        self.install();self.assertEqual((self.root/'previous').resolve(),first)
    def test_profile_conflict_cannot_switch_runtime_or_partial_agent_links(self):
        first=self.install();(self.source/'ua-pull.sh').write_text('second')
        conflict=self.profile/'.claude/skills/oriso-graph';conflict.unlink();conflict.mkdir();(conflict/'mine').write_text('keep')
        old=(self.profile/'.agents/skills/oriso-graph').readlink()
        with self.assertRaises(ValueError):self.install()
        self.assertEqual((self.root/'current').resolve(),first)
        self.assertEqual((self.profile/'.agents/skills/oriso-graph').readlink(),old)
        self.assertEqual((conflict/'mine').read_text(),'keep')
    def test_profile_io_failure_rolls_back_modified_links(self):
        first=self.install();(self.source/'ua-pull.sh').write_text('second')
        real=installer.atomic_link
        def fail(target,link):
            if link==self.profile/'bin/ua-dashboard':raise OSError('disk fault')
            return real(target,link)
        old=(self.profile/'.agents/skills/oriso-graph').readlink()
        with patch.object(installer,'atomic_link',side_effect=fail):
            with self.assertRaises(OSError):self.install()
        self.assertEqual((self.root/'current').resolve(),first)
        self.assertEqual((self.profile/'.agents/skills/oriso-graph').readlink(),old)
if __name__=='__main__':unittest.main()
