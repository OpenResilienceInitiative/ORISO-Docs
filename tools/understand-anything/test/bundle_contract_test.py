import copy
import datetime as dt
import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from bundle.contract import ContractError, seal, validate
from bundle.storage import publish, pull, rollback

NOW = dt.datetime(2026, 9, 7, tzinfo=dt.timezone.utc)
SHA = "a" * 40


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value))


def fixture(root, when=NOW):
    timestamp = when.isoformat()
    for repo in ["ORISO-Test", "ORISO-Platform", "ORISO-Supergraph"]:
        aggregate = repo != "ORISO-Test"
        graph = {
            "version": "1.0.0",
            "metadata": {
                "extraction": {
                    "diagnostics": {
                        "unresolvedImports": {"total": 0},
                        "unresolvedCalls": {"total": 0},
                        "unsupportedInputs": {"total": 1, "byRelation": {"calls": 1}},
                    }
                }
            },
            "project": {
                "languages": [],
                "frameworks": [],
                "description": "",
                "name": repo,
                "gitCommitHash": None if aggregate else SHA,
                "analyzedAt": timestamp,
            },
            "nodes": [
                {
                    "id": "one",
                    "type": "file",
                    "name": "a.ts",
                    "summary": "",
                    "tags": [],
                    "complexity": "simple",
                },
                {
                    "id": "two",
                    "type": "file",
                    "name": "b.ts",
                    "summary": "",
                    "tags": [],
                    "complexity": "simple",
                },
            ],
            "edges": [
                {
                    "source": "one",
                    "target": "two",
                    "type": "imports",
                    "direction": "forward",
                    "weight": 1,
                }
            ],
            "layers": [
                {
                    "id": "files",
                    "name": "Files",
                    "description": "",
                    "nodeIds": ["one", "two"],
                }
            ],
            "tour": [
                {"order": 1, "title": "Start", "description": "", "nodeIds": ["one"]}
            ],
            "relationCoverage": {
                "imports": {
                    "emitted": 1,
                    "unresolved": 0,
                    "unsupported": 0,
                    "status": "complete",
                },
                "calls": {
                    "emitted": 0,
                    "unresolved": 0,
                    "unsupported": 1,
                    "status": "unsupported",
                },
            },
        }
        if aggregate:
            graph["project"]["sourceCommits"] = {"ORISO-Test": SHA}
        directory = root / repo / ".understand-anything"
        write(directory / "knowledge-graph.json", graph)
        write(
            directory / "meta.json",
            {"gitCommitHash": None if aggregate else SHA, "lastAnalyzedAt": timestamp},
        )
        write(
            directory / "fingerprints.json",
            {"gitCommitHash": None if aggregate else SHA, "files": {}},
        )
    return [
        {
            "repository": "ORISO-Test",
            "ref": "refs/heads/dev",
            "sourceSHA": SHA,
            "fetchedAt": timestamp,
            "fetchSuccess": True,
        }
    ]


class ContractTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name) / "stage"
        self.sources = fixture(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_generation_preserves_extension_metadata(self):
        path = self.root / "ORISO-Test/.understand-anything/knowledge-graph.json"
        graph = json.loads(path.read_text())
        graph["edges"][0]["metadata"] = {"certainty": "verified-source"}
        write(path, graph)
        seal(self.root, self.sources, now=NOW)
        manifest = validate(self.root, now=NOW)
        self.assertEqual(len(manifest["graphs"]), 3)
        self.assertEqual(
            json.loads(path.read_text())["edges"][0]["metadata"]["certainty"],
            "verified-source",
        )

    def test_malformed_or_structurally_wrong_graphs_are_fatal(self):
        path = self.root / "ORISO-Test/.understand-anything/knowledge-graph.json"
        pristine = json.loads(path.read_text())
        cases = [
            lambda g: g["metadata"]["extraction"]["diagnostics"][
                "unsupportedInputs"
            ].update(total=7, byRelation={"calls": 7}),
            lambda g: g["project"].pop("gitCommitHash"),
            lambda g: g.pop("metadata"),
            lambda g: g.pop("version"),
            lambda g: g.pop("tour"),
            lambda g: g["nodes"][0].update(filePath=123),
            lambda g: g["nodes"][0].update(domainMeta={"entryType": "invented"}),
            lambda g: g["nodes"][0].update(knowledgeMeta={"wikilinks": 7}),
            lambda g: g["nodes"][0].update(
                figmaMeta={"dimensions": {"width": "wide", "height": 2}}
            ),
            lambda g: g["edges"][0].update(description=[]),
            lambda g: g.update(kind="invalid"),
            lambda g: g.update(
                metadata={
                    "extraction": {"diagnostics": {"unresolvedImports": {"total": 7}}}
                }
            ),
            lambda g: g["project"].update(name="ORISO-Unrelated"),
            lambda g: g["nodes"].append(copy.deepcopy(g["nodes"][0])),
            lambda g: g["edges"][0].update(target="missing"),
            lambda g: g["layers"][0]["nodeIds"].append("missing"),
            lambda g: g["tour"][0]["nodeIds"].append("missing"),
            lambda g: g["edges"][0].update(type="fabricated"),
            lambda g: g["edges"][0].update(direction="directed"),
            lambda g: g["relationCoverage"]["imports"].update(emitted=0),
            lambda g: g["relationCoverage"]["imports"].update(unresolved=1),
            lambda g: g["project"].update(gitCommitHash="not-a-commit"),
        ]
        for change in cases:
            with self.subTest(change=change):
                graph = copy.deepcopy(pristine)
                change(graph)
                write(path, graph)
                with self.assertRaises(ContractError):
                    seal(self.root, self.sources, now=NOW)
        path.write_text("{broken")
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)

    def test_content_timestamp_not_mtime_and_exact_boundary(self):
        seal(self.root, self.sources, now=NOW)
        validate(self.root, now=NOW + dt.timedelta(seconds=86400))
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW + dt.timedelta(seconds=86400.01))
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW - dt.timedelta(seconds=1))

    def test_wrong_source_or_failed_fetch_never_seals(self):
        for change in [
            {"fetchSuccess": False},
            {"sourceSHA": "a" * 8},
            {"ref": "refs/heads/other"},
        ]:
            sources = copy.deepcopy(self.sources)
            sources[0].update(change)
            with self.subTest(change=change), self.assertRaises(ContractError):
                seal(
                    self.root,
                    sources,
                    now=NOW,
                    expected_refs={"ORISO-Test": "refs/heads/dev"},
                )

    def test_meta_source_and_graph_generation_mismatch_fail(self):
        path = self.root / "ORISO-Test/.understand-anything/meta.json"
        write(path, {"gitCommitHash": "b" * 40, "lastAnalyzedAt": NOW.isoformat()})
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)

    def test_required_aggregate_absent_is_fatal(self):
        (
            self.root / "ORISO-Platform/.understand-anything/knowledge-graph.json"
        ).unlink()
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)

    def test_checksum_corruption_even_same_counts_is_fatal(self):
        seal(self.root, self.sources, now=NOW)
        path = self.root / "ORISO-Test/.understand-anything/knowledge-graph.json"
        graph = json.loads(path.read_text())
        graph["nodes"][0]["name"] = "changed"
        write(path, graph)
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW)

    def test_conflicting_aggregate_source_vector_cannot_be_relabelled(self):
        for key in ("project", "metadata"):
            path = (
                self.root / "ORISO-Platform/.understand-anything/knowledge-graph.json"
            )
            graph = json.loads(path.read_text())
            if key == "project":
                graph["project"]["sourceCommits"] = {"ORISO-Test": "b" * 40}
            else:
                graph["project"]["sourceCommits"] = {"ORISO-Test": SHA}
                graph["metadata"] = {
                    "sources": [{"repo": "ORISO-Test", "gitCommitHash": "b" * 40}]
                }
            write(path, graph)
            with self.subTest(key=key), self.assertRaises(ContractError):
                seal(self.root, self.sources, now=NOW)

    def test_aggregate_scalar_provenance_cannot_be_overwritten(self):
        for filename in ("meta.json", "fingerprints.json"):
            with self.subTest(filename=filename):
                fixture(self.root)
                path = self.root / "ORISO-Platform/.understand-anything" / filename
                data = json.loads(path.read_text())
                data["gitCommitHash"] = "b" * 40
                write(path, data)
                with self.assertRaises(ContractError):
                    seal(self.root, self.sources, now=NOW)

    def test_explicit_aggregate_subset_stays_source_bound(self):
        import shutil

        second = copy.deepcopy(self.sources[0])
        second["repository"] = "ORISO-Second"
        self.sources.append(second)
        directory = self.root / "ORISO-Second/.understand-anything"
        shutil.copytree(self.root / "ORISO-Test/.understand-anything", directory)
        path = directory / "knowledge-graph.json"
        graph = json.loads(path.read_text())
        graph["project"]["name"] = "ORISO-Second"
        write(path, graph)
        manifest = seal(self.root, self.sources, now=NOW)
        platform = next(g for g in manifest["graphs"] if g["kind"] == "platform")
        self.assertEqual(platform["sourceRepositories"], ["ORISO-Test"])
        stamped = json.loads((self.root / platform["path"]).read_text())
        self.assertEqual(
            [x["repository"] for x in stamped["sourceRepositories"]], ["ORISO-Test"]
        )
        validate(self.root, now=NOW)

    def test_symlinked_graph_is_rejected_before_touching_external_bytes(self):
        path = self.root / "ORISO-Test/.understand-anything/knowledge-graph.json"
        external = self.root.parent / "external.json"
        external.write_bytes(path.read_bytes())
        before = external.read_bytes()
        path.unlink()
        path.symlink_to(external)
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)
        self.assertEqual(external.read_bytes(), before)

    def test_aggregate_fingerprint_vector_cannot_disagree_even_with_valid_checksum(
        self,
    ):
        import hashlib

        seal(self.root, self.sources, now=NOW)
        path = self.root / "ORISO-Platform/.understand-anything/fingerprints.json"
        data = json.loads(path.read_text())
        data["sourceSHAs"] = {"ORISO-Test": "b" * 40}
        write(path, data)
        manifest = json.loads((self.root / "manifest.json").read_text())
        entry = next(
            e
            for e in manifest["files"]
            if e["path"] == path.relative_to(self.root).as_posix()
        )
        entry.update(
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            size=path.stat().st_size,
        )
        write(self.root / "manifest.json", manifest)
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW)

    def test_fingerprint_provenance_and_missing_relation_contract_fail(self):
        path = self.root / "ORISO-Test/.understand-anything/fingerprints.json"
        write(path, {"gitCommitHash": "b" * 40, "files": {}})
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)
        write(path, {"gitCommitHash": SHA, "files": {}})
        graph_path = self.root / "ORISO-Test/.understand-anything/knowledge-graph.json"
        graph = json.loads(graph_path.read_text())
        del graph["relationCoverage"]["calls"]
        write(graph_path, graph)
        with self.assertRaises(ContractError):
            seal(self.root, self.sources, now=NOW)

    def test_same_prefix_wrong_full_source_is_not_equal(self):
        sources = copy.deepcopy(self.sources)
        sources[0]["sourceSHA"] = "a" * 8 + "b" * 32
        with self.assertRaises(ContractError):
            seal(self.root, sources, now=NOW)

    def test_unknown_envelope_or_ref_cannot_be_accepted(self):
        seal(self.root, self.sources, now=NOW)
        manifest = json.loads((self.root / "manifest.json").read_text())
        manifest["schemaVersion"] = "unknown/v99"
        write(self.root / "manifest.json", manifest)
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW)

    def test_unlisted_and_escaping_files_are_fatal(self):
        seal(self.root, self.sources, now=NOW)
        (self.root / "unexpected.json").write_text("{}")
        with self.assertRaises(ContractError):
            validate(self.root, now=NOW)


class TransferTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = pathlib.Path(self.temp.name)
        self.remote = self.base / "remote"
        self.local = self.base / "local"
        self.make_generation("old")
        pull(self.fetch, self.local, now=NOW)
        self.old = (self.local / "current").resolve()
        self.make_generation("new")

    def tearDown(self):
        self.temp.cleanup()

    def make_generation(self, label):
        root = self.base / label
        sources = fixture(root)
        seal(root, sources, now=NOW)
        publish(root, self.remote, now=NOW)

    def fetch(self, name, destination):
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes((self.remote / name).read_bytes())

    def test_total_partial_interrupted_or_corrupt_transfer_retains_previous(self):
        for kind in ["all", "meta", "platform", "interrupt", "corrupt"]:

            def fetch(name, dest):
                if (
                    kind == "all"
                    or (kind == "meta" and name.endswith("/meta.json"))
                    or (kind == "platform" and "ORISO-Platform" in name)
                ):
                    raise OSError("synthetic unavailable")
                self.fetch(name, dest)
                if kind == "interrupt" and name.endswith("/knowledge-graph.json"):
                    raise KeyboardInterrupt()
                if kind == "corrupt" and name.endswith("/knowledge-graph.json"):
                    dest.write_text("{broken")

            with self.subTest(kind=kind), self.assertRaises(
                (ContractError, OSError, KeyboardInterrupt)
            ):
                pull(fetch, self.local, now=NOW)
            self.assertEqual((self.local / "current").resolve(), self.old)
            validate(self.old, now=NOW)

    def test_remote_current_change_cannot_mix_generation(self):
        initial = (self.remote / "current").resolve().name

        def fetch(name, dest):
            self.fetch(name, dest)
            if name == "current/manifest.json":
                self.make_generation("third")

        result = pull(fetch, self.local, now=NOW)
        self.assertEqual(result["generationId"], initial)
        self.assertEqual((self.local / "previous").resolve(), self.old)
        rollback(self.local, now=NOW)
        self.assertEqual((self.local / "current").resolve(), self.old)

    def test_new_valid_generation_can_recover_invalid_current_without_erasing_it(self):
        damaged = self.old / "ORISO-Test/.understand-anything/knowledge-graph.json"
        damaged.write_text("{broken")
        result = pull(self.fetch, self.local, now=NOW)
        self.assertNotEqual((self.local / "current").resolve(), self.old)
        self.assertEqual(damaged.read_text(), "{broken")
        validate(self.local / "current", now=NOW)

    def test_validator_snapshots_current_once_during_promotion(self):
        from unittest.mock import patch
        from bundle import contract

        original = contract.read_json
        seen = []

        def reading(path):
            result = original(path)
            if not seen:
                seen.append(path)
                from bundle.storage import switch

                new = (self.remote / "current").resolve()
                # Install another complete immutable generation, then promote while
                # the old validator is between manifest and asset reads.
                import shutil

                local_new = self.local / "generations" / new.name
                shutil.copytree(new, local_new)
                switch(self.local, "current", "generations/" + new.name)
            return result

        with patch("bundle.contract.read_json", side_effect=reading):
            result = validate(self.local / "current", now=NOW)
        self.assertEqual(result["generationId"], self.old.name)
        self.assertNotEqual((self.local / "current").resolve(), self.old)

    def test_post_replace_fsync_failure_reports_changed_pointer_not_retained(self):
        from unittest.mock import patch
        from bundle.storage import switch

        new = (self.remote / "current").resolve()
        with patch(
            "bundle.storage.os.fsync", side_effect=OSError("synthetic disk error")
        ):
            with self.assertRaisesRegex(
                ContractError, "PUBLICATION-DURABILITY-UNCERTAIN.*pointer was replaced"
            ):
                switch(self.local, "current", str(new))
        self.assertEqual((self.local / "current").resolve(), new)
        self.assertTrue(self.old.exists())

    def test_manifest_path_traversal_is_rejected_before_write(self):
        def fetch(name, dest):
            self.fetch(name, dest)
            if name == "current/manifest.json":
                manifest = json.loads(dest.read_text())
                manifest["files"][0]["path"] = "../../escaped.json"
                write(dest, manifest)

        with self.assertRaises(ContractError):
            pull(fetch, self.local, now=NOW)
        self.assertFalse((self.base / "escaped.json").exists())
        self.assertEqual((self.local / "current").resolve(), self.old)

    def test_concurrent_writer_fails_without_pointer_change(self):
        from bundle.storage import locked

        with locked(self.local), self.assertRaises(ContractError):
            pull(self.fetch, self.local, now=NOW)
        self.assertEqual((self.local / "current").resolve(), self.old)


if __name__ == "__main__":
    unittest.main()
