"""Public shell commands against real Git repositories and faulting stage workers."""

import datetime as dt
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bundle.contract import seal, validate
from bundle.storage import publish
from bundle_contract_test import fixture, write

TOOLS = Path(__file__).resolve().parents[1]


def command(args, cwd=None, env=None):
    return subprocess.run(
        [str(a) for a in args],
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
    )


def git(repo, *args):
    result = command(["git", "-C", repo, *args])
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


class PublicCliTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.origin = self.root / "ORISO-Test.git"
        self.repo = self.root / "checkout"
        assert command(["git", "init", "--bare", self.origin]).returncode == 0
        assert command(["git", "clone", self.origin, self.repo]).returncode == 0
        git(self.repo, "config", "user.email", "test@example.invalid")
        git(self.repo, "config", "user.name", "Synthetic Test")
        git(self.repo, "checkout", "-b", "dev")
        (self.repo / "README.md").write_text("source one\n")
        (self.repo / ".understand-anything").mkdir()
        (self.repo / ".understand-anything/knowledge-graph.json").write_text(
            "retained legacy bytes"
        )
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "source")
        git(self.repo, "push", "origin", "dev")
        self.sha = git(self.repo, "rev-parse", "HEAD")
        self.remote = self.root / "published"
        self.cache = self.root / "cache"
        stage = self.root / "stage"
        sources = fixture(stage, dt.datetime.now(dt.timezone.utc))
        sources[0]["sourceSHA"] = self.sha
        for file in ["knowledge-graph.json", "meta.json", "fingerprints.json"]:
            path = stage / "ORISO-Test/.understand-anything" / file
            data = json.loads(path.read_text())
            if file != "knowledge-graph.json":
                data["gitCommitHash"] = self.sha
            else:
                data["project"]["gitCommitHash"] = self.sha
            write(path, data)
        for repo in ("ORISO-Platform", "ORISO-Supergraph"):
            path = stage / repo / ".understand-anything/knowledge-graph.json"
            data = json.loads(path.read_text())
            data["project"]["sourceCommits"] = {"ORISO-Test": self.sha}
            write(path, data)
        seal(stage, sources)
        publish(stage, self.remote)

    def tearDown(self):
        self.temp.cleanup()

    def pull(self, *args, cwd=None, env=None):
        return command(
            [
                "bash",
                TOOLS / "ua-pull.sh",
                "--from",
                self.remote,
                "--cache-dir",
                self.cache,
                *args,
            ],
            cwd or self.repo,
            env,
        )

    def test_installed_symlink_entrypoints_work_outside_tooling_directory(self):
        profile = self.root / "profile/bin"
        profile.mkdir(parents=True)
        for name in ["ua-pull.sh", "ua-refresh.sh", "ua-verify.py"]:
            link = profile / name
            link.symlink_to(TOOLS / name)
            interpreter = "python3" if name.endswith(".py") else "bash"
            result = command([interpreter, link, "--help"], cwd=self.root)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("usage:", result.stdout)
            self.assertNotIn("No module named", result.stderr)

    def test_json_status_uses_verified_immutable_generation_and_delivery_receipt(self):
        self.assertEqual(self.pull().returncode, 0)
        result = self.pull("--status-json", "--platform-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        status = json.loads(result.stdout)
        self.assertEqual(
            status["generationId"], (self.cache / "current").resolve().name
        )
        self.assertEqual(status["channel"], str(self.remote))
        self.assertEqual(status["verificationScope"], "cached-content")
        self.assertIsNotNone(status["deliveredAt"])
        self.assertIsNone(status["semanticReviewedAt"])
        self.assertEqual(status["semanticCoverage"], {})
        self.assertIn("structuralAnalyzedAt", status)

    def test_verified_json_status_identifies_one_immutable_source_checked_snapshot(
        self,
    ):
        self.assertEqual(self.pull().returncode, 0)
        result = self.pull("--verify", "--status-json", "--platform-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        status = json.loads(result.stdout)
        self.assertEqual(status["verificationScope"], "current-source")
        self.assertEqual(status["sourceVerification"], "VALID-CURRENT-SOURCE")
        directory = Path(status["graphDirectory"])
        self.assertEqual(
            directory,
            (self.cache / "current").resolve() / "ORISO-Platform/.understand-anything",
        )
        self.assertEqual(
            json.loads((directory / "knowledge-graph.json").read_text())[
                "generationId"
            ],
            status["generationId"],
        )

    def test_success_and_failed_fetch_never_report_pulled(self):
        first = self.pull()
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertIn("REFRESHED", first.stdout)
        old = (self.cache / "current").resolve()
        self.remote.rename(self.root / "unreachable")
        failed = self.pull()
        self.assertNotEqual(failed.returncode, 0)
        self.assertNotIn("REFRESHED", failed.stdout)
        self.assertEqual((self.cache / "current").resolve(), old)

    def test_cached_ref_after_failed_git_fetch_is_not_accepted(self):
        self.assertEqual(self.pull().returncode, 0)
        self.origin.rename(self.root / "origin-unavailable")
        result = self.pull("--verify")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("VALID-CURRENT-SOURCE", result.stdout)

    def test_checkout_difference_requires_explicit_acceptance(self):
        git(self.repo, "checkout", "-b", "feature")
        (self.repo / "feature.txt").write_text("feature")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "feature")
        result = self.pull()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("VALID-DIFFERENT-CHECKOUT", result.stderr)
        self.assertFalse((self.cache / "current").exists())
        allowed = self.pull("--allow-different-checkout")
        self.assertEqual(allowed.returncode, 0, allowed.stderr)
        self.assertIn("VALID-DIFFERENT-CHECKOUT", allowed.stdout)
        self.assertNotIn("FRESH ", allowed.stdout)

    def test_new_source_ref_rejects_stale_generation_without_changing_cache(self):
        self.assertEqual(self.pull().returncode, 0)
        old = (self.cache / "current").resolve()
        (self.repo / "README.md").write_text("source two")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-m", "second")
        git(self.repo, "push", "origin", "dev")
        failed = self.pull()
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn("NOT-CURRENT-SOURCE", failed.stderr)
        self.assertEqual((self.cache / "current").resolve(), old)

    def test_linked_worktree_legacy_migration_preserves_tracked_content(self):
        worktree = self.root / "linked"
        git(self.repo, "worktree", "add", "--detach", str(worktree), self.sha)
        legacy = worktree / ".understand-anything/knowledge-graph.json"
        before = legacy.read_bytes()
        git(
            worktree,
            "update-index",
            "--skip-worktree",
            ".understand-anything/knowledge-graph.json",
        )
        pulled = self.pull(cwd=worktree)
        self.assertEqual(pulled.returncode, 0, pulled.stderr)
        self.assertEqual(legacy.read_bytes(), before)
        migrated = self.pull("--migrate-legacy", cwd=worktree)
        self.assertEqual(migrated.returncode, 0, migrated.stderr)
        self.assertEqual(legacy.read_bytes(), before)
        self.assertFalse(
            git(
                worktree, "ls-files", "-v", ".understand-anything/knowledge-graph.json"
            ).startswith("S")
        )
        pointer = json.loads((worktree / ".understand-anything-cache.json").read_text())
        self.assertEqual(
            (Path(pointer["legacyBackup"]) / "knowledge-graph.json").read_bytes(),
            before,
        )
        resolved = Path(git(worktree, "rev-parse", "--git-path", "info/exclude"))
        self.assertIn("/.understand-anything-cache.json", resolved.read_text())
        path = self.pull("--path", cwd=worktree)
        self.assertEqual(path.returncode, 0, path.stderr)
        self.assertTrue((Path(path.stdout.strip()) / "knowledge-graph.json").is_file())


class PipelineTests(PublicCliTests):
    def setUp(self):
        super().setUp()
        self.source_base = self.root / "sources"
        self.source_base.mkdir()
        (self.source_base / "ORISO-Test").symlink_to(self.repo)
        self.worker = self.root / "workers"
        self.worker.mkdir()
        worker = r"""#!/usr/bin/env python3
import json,os,pathlib,subprocess,sys,datetime
script=pathlib.Path(sys.argv[1]).name
if os.environ.get('FAULT_STAGE')==script:sys.exit(9)
if script=='ua-validate-consumer.mjs':sys.exit(0)
if script=='ua-glossary-project.mjs':sys.exit(subprocess.run(['node',*sys.argv[1:]]).returncode)
if script=='apply-platform-enrich.mjs':
 graph_path,enrichment_path=map(pathlib.Path,sys.argv[2:]);g=json.loads(graph_path.read_text());enrichment=json.loads(enrichment_path.read_text())
 assert 'generationId' not in g,'Narrative must run before seal'
 g['tour']=enrichment['tour'];g['metadata']['narrative']=enrichment['meta'];graph_path.write_text(json.dumps(g))
 print(os.environ.get('NARRATIVE_REPORT',json.dumps({'droppedRefs':[],'missingStats':[]})));sys.exit(0)
if script=='ua-generate.mjs':
 source,name,out=sys.argv[2:];sha=subprocess.check_output(['git','-C',source,'rev-parse','HEAD'],text=True).strip()
else:
 name='ORISO-Supergraph'if script=='ua-build-supergraph.mjs'else'ORISO-Platform';out=sys.argv[sys.argv.index('--out')+1];sha=None
out=pathlib.Path(out);out.mkdir(parents=True,exist_ok=True);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
g={'version':'1.0.0','metadata':{'extraction':{'diagnostics':{'unresolvedImports':{'total':0},'unresolvedCalls':{'total':0},'unsupportedInputs':{'total':2,'byRelation':{'imports':1,'calls':1}}}}},'project':{'languages':[],'frameworks':[],'description':'','name':name,'gitCommitHash':sha,'analyzedAt':now},'nodes':[{'id':'a','type':'file','name':'a','summary':'','tags':[],'complexity':'simple'}],'edges':[],'layers':[],'tour':[], 'relationCoverage':{'imports':{'emitted':0,'unresolved':0,'unsupported':1,'status':'unsupported'},'calls':{'emitted':0,'unresolved':0,'unsupported':1,'status':'unsupported'}}}
if sha is None:
 g['project']['sourceCommits']={repo:json.loads((pathlib.Path(os.environ['UA_BASE'])/repo/'.understand-anything/meta.json').read_text())['gitCommitHash'] for repo in os.environ['UA_REPOSITORIES'].split(',')}
 count=len(g['project']['sourceCommits']);g['metadata']['extraction']['diagnostics']['unsupportedInputs']={'total':count*2,'byRelation':{'imports':count,'calls':count}}
 for item in g['relationCoverage'].values():item['unsupported']=count
(out/'knowledge-graph.json').write_text(json.dumps(g));(out/'meta.json').write_text(json.dumps({'gitCommitHash':sha,'lastAnalyzedAt':now}));(out/'fingerprints.json').write_text(json.dumps({'gitCommitHash':sha,'files':{}}))
"""
        (self.worker / "ua-node").write_text(worker)
        (self.worker / "ua-node").chmod(0o755)
        narrative = self.worker / "platform/narrative/platform-enrich.json"
        narrative.parent.mkdir(parents=True)
        narrative.write_text(
            json.dumps(
                {
                    "meta": {"generatedAt": "2026-09-04T00:00:00Z", "generatedBy": "historical-fixture"},
                    "tour": [
                        {
                            "order": 1,
                            "title": "Start here",
                            "description": "Staged narrative",
                            "nodeIds": ["a"],
                        }
                    ],
                }
            )
        )
        # Genuine pinned Docs vocabulary sources; the projector is not a mocked worker.
        docs_origin = self.root / "ORISO-Docs.git"
        docs = self.source_base / "ORISO-Docs"
        assert command(["git", "init", "--bare", docs_origin]).returncode == 0
        assert command(["git", "clone", docs_origin, docs]).returncode == 0
        git(docs, "config", "user.email", "fixture@example.invalid")
        git(docs, "config", "user.name", "Fixture")
        git(docs, "checkout", "-b", "dev")
        catalog = json.loads((TOOLS / "glossary/catalog.json").read_text())
        source_paths = {s["path"] for c in catalog["concepts"] for s in c["sources"] if s["binding"] != "external"}
        source_paths.add("tools/understand-anything/glossary/catalog.json")
        for relative in source_paths:
            target = docs / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(TOOLS.parents[1] / relative, target)
        git(docs, "add", ".")
        git(docs, "commit", "-m", "Pinned glossary sources")
        git(docs, "push", "origin", "dev")
        for relative in ["ua-glossary-project.mjs", "lib/glossary-projection.mjs", "glossary/validate.mjs", "glossary/source-bindings.mjs"]:
            target = self.worker / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(TOOLS / relative, target)
        self.output = self.root / "pipeline-published"

    def refresh(self, env=None):
        return command(
            [
                "bash",
                TOOLS / "ua-refresh.sh",
                "--base",
                self.source_base,
                "--tools",
                self.worker,
                "--publish-root",
                self.output,
                "--repo",
                "ORISO-Test:dev",
                "--repo",
                "ORISO-Docs:dev",
            ],
            self.repo,
            env,
        )

    def test_pinned_glossary_artifacts_are_sealed_and_bound_to_the_selected_source_vector(self):
        result = self.refresh()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = validate(self.output / "current")
        self.assertEqual(manifest["glossary"]["documentationRevision"], git(self.source_base / "ORISO-Docs", "rev-parse", "HEAD"))
        self.assertIn("glossary/catalog.json", [f["path"] for f in manifest["files"]])
        self.assertIn("glossary/bindings.json", [f["path"] for f in manifest["files"]])
        bindings = json.loads((self.output / "current/glossary/bindings.json").read_text())
        self.assertEqual(bindings["sourceVector"], {s["repository"]: s["sourceSHA"] for s in manifest["sources"]})
        self.assertTrue(all(b["state"] in ["verified", "external"] for b in bindings["sourceBindings"]))

    def test_glossary_authority_cannot_change_selected_revision_after_sealing(self):
        result = self.refresh()
        self.assertEqual(result.returncode, 0, result.stderr)
        current = (self.output / "current").resolve()
        bindings_path = current / "glossary/bindings.json"
        bindings = json.loads(bindings_path.read_text())
        next(item for item in bindings["sourceBindings"] if item["state"] == "verified")["selectedRevision"] = "b" * 40
        bindings_path.write_text(json.dumps(bindings))
        # Recompute the generic byte inventory: semantic source bindings must still reject it.
        with self.assertRaisesRegex(Exception, "glossary selected authority revision"):
            seal(current, json.loads((current / "manifest.json").read_text())["sources"])

    def test_each_failed_stage_retains_complete_previous_generation(self):
        first = self.refresh()
        self.assertEqual(first.returncode, 0, first.stderr)
        old = (self.output / "current").resolve()
        before = git(self.repo, "rev-parse", "HEAD")
        (self.repo / "README.md").write_text("uncommitted developer work")
        for stage in [
            "ua-generate.mjs",
            "ua-glossary-project.mjs",
            "ua-build-supergraph.mjs",
            "ua-platform-graph.mjs",
            "ua-validate-consumer.mjs",
        ]:
            with self.subTest(stage=stage):
                env = os.environ.copy()
                env["FAULT_STAGE"] = stage
                result = self.refresh(env)
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertNotIn("PUBLISHED", result.stdout)
                self.assertEqual((self.output / "current").resolve(), old)
                validate(old)
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), before)
        self.assertEqual(
            (self.repo / "README.md").read_text(), "uncommitted developer work"
        )

    def test_unbound_platform_narrative_is_excluded_before_mutation(self):
        import hashlib
        baseline=self.worker / "platform/narrative/platform-enrich.json"
        original=baseline.read_bytes();env=os.environ.copy();env['FAULT_STAGE']='apply-platform-enrich.mjs'
        result=self.refresh(env);self.assertEqual(result.returncode,0,result.stderr)
        manifest=validate(self.output / 'current');graph=json.loads((self.output / 'current/ORISO-Platform/.understand-anything/knowledge-graph.json').read_text())
        self.assertEqual(graph['tour'],[]);self.assertNotIn('narrative',graph['metadata'])
        self.assertEqual(graph['metadata']['narrativeCoverage'],dict(status='excluded-unbound',reason='missing-review',input=dict(path='platform/narrative/platform-enrich.json',sha256=hashlib.sha256(original).hexdigest(),generatedAt='2026-09-04T00:00:00Z',generatedBy='historical-fixture'),appliedReviewedClaims=0,runtimeVerified=False))
        self.assertEqual(baseline.read_bytes(),original);self.assertEqual(graph['generationId'],manifest['generationId'])

    def test_purported_reviewed_narrative_fails_before_previous_activation_changes(self):
        self.assertEqual(self.refresh().returncode,0);old=(self.output/'current').resolve()
        baseline=self.worker / 'platform/narrative/platform-enrich.json';data=json.loads(baseline.read_text());data['meta']['reviewedAt']='2026-09-30T00:00:00Z';baseline.write_text(json.dumps(data))
        result=self.refresh();self.assertNotEqual(result.returncode,0);self.assertIn('reviewed platform narrative',result.stderr);self.assertEqual((self.output/'current').resolve(),old)

    def test_invalid_attempted_narrative_report_remains_strict(self):
        from bundle.pipeline import validate_narrative_report
        for report in ['{"droppedRefs":["lost"],"missingStats":[]}', '{"droppedRefs":[],"missingStats":["missing"]}', '', '{malformed', '{}']:
            with self.assertRaises(Exception):validate_narrative_report(report)
        validate_narrative_report('{"droppedRefs":[],"missingStats":[]}')

    def test_versioned_analysis_policy_overrides_unversioned_checkout_policy(self):
        policy = self.worker / "analysis-config/ORISO-Test.understandignore"
        policy.parent.mkdir()
        policy.write_text("ignored-reproducibly/\n")
        (self.repo / ".understandignore").write_text("untracked-server-only/\n")
        result = self.refresh()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = validate(self.output / "current")
        record = manifest["sources"][0]["analysisConfig"]
        self.assertEqual(record["source"], "versioned-tooling")
        self.assertEqual(
            (self.output / "current" / record["artifactPath"]).read_bytes(),
            policy.read_bytes(),
        )
        self.assertEqual(
            (self.repo / ".understandignore").read_text(), "untracked-server-only/\n"
        )

    def test_unversioned_checkout_analysis_policy_is_not_inherited(self):
        (self.repo / ".understandignore").write_text("untracked-server-only/\n")
        result = self.refresh()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = validate(self.output / "current")
        self.assertNotIn("analysisConfig", manifest["sources"][0])

    def test_all_input_fetches_must_succeed_before_any_publication(self):
        self.assertEqual(self.refresh().returncode, 0)
        old = (self.output / "current").resolve()
        self.origin.rename(self.root / "origin-unavailable")
        result = self.refresh()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("ANALYZED", result.stdout)
        self.assertEqual((self.output / "current").resolve(), old)


if __name__ == "__main__":
    unittest.main()
