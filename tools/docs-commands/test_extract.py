"""Public contract tests for documentation command extraction."""

import unittest
import json
import contextlib
import io
from pathlib import Path
import tempfile
from unittest.mock import patch

from extract import extract_sources, main


COMMENT = '<!-- oriso-command: {"id":"local-doctor","environment":"local","verification":"Reports each prerequisite","risk":"read-only"} -->\n'


class ExtractTests(unittest.TestCase):
    def test_extracts_contract_and_verbatim_command_with_lines(self):
        report = extract_sources({"guide.md": "# Guide\n\n" + COMMENT + "\n```bash\n  ./local-stack doctor\n\n```\n"})
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["commands"], [{
            "id": "local-doctor", "environment": "local",
            "verification": "Reports each prerequisite", "risk": "read-only",
            "command": "  ./local-stack doctor\n\n", "source_file": "guide.md",
            "annotation_line": 3, "fence_line": 5, "line": 6, "end_line": 7,
        }])

    def test_tracks_shell_fences_and_ignores_fence_like_content(self):
        text = (COMMENT + "~~~~sh\necho '```'\n" + COMMENT + "~~~\n~~~~\n"
                + "```text\n```bash\nignore me\n```\n"
                + "~~~shell\necho unannotated\n~~~\n")
        report = extract_sources({"guide.md": text})
        self.assertEqual(len(report["commands"]), 1)
        self.assertEqual(report["commands"][0]["command"], "echo '```'\n" + COMMENT + "~~~\n")
        self.assertEqual([(f["code"], f["line"]) for f in report["findings"]], [("missing-contract", 11)])

    def test_rejects_invalid_json_or_contract_fields(self):
        valid = {"id": "local-doctor", "environment": "local", "verification": "Expected output", "risk": "read-only"}
        invalid = ["{broken}", '{"id":"first",' + json.dumps(valid)[1:], "[]", "null",
                   json.dumps({**valid, "unknown": True}), json.dumps({**valid, "environment": "pre-dev"}),
                   json.dumps({**valid, "risk": "approved"}), json.dumps({**valid, "id": " "}),
                   json.dumps({**valid, "verification": ""}), json.dumps({**valid, "verification": 42}),
                   json.dumps({key: value for key, value in valid.items() if key != "verification"}),
                   '{"id":"x","environment":"local","risk":"read-only","verification":NaN}']
        for payload in invalid:
            with self.subTest(payload=payload):
                report = extract_sources({"guide.md": "<!-- oriso-command: " + payload + " -->\n```bash\necho hi\n```\n"})
                self.assertEqual(report["commands"], [])
                self.assertIn("invalid-contract", [f["code"] for f in report["findings"]])

    def test_contract_must_be_adjacent_and_complete(self):
        for text in (COMMENT + "A paragraph intervenes.\n```bash\necho hi\n```\n",
                     COMMENT + "```json\n{}\n```\n",
                     COMMENT):
            with self.subTest(text=text):
                report = extract_sources({"guide.md": text})
                self.assertEqual(report["commands"], [])
                self.assertIn("orphan-contract", [f["code"] for f in report["findings"]])
        for text in ('<!-- oriso-command: {"id":"x"}\n```bash\necho hi\n```\n',
                     COMMENT.rstrip() + ' trailing prose\n```bash\necho hi\n```\n'):
            with self.subTest(text=text):
                report = extract_sources({"guide.md": text})
                self.assertEqual(report["commands"], [])
                self.assertIn("invalid-contract", [f["code"] for f in report["findings"]])
        report = extract_sources({"guide.md": COMMENT + "```bash\necho hi\n"})
        self.assertEqual(report["commands"], [])
        self.assertIn("unclosed-fence", [f["code"] for f in report["findings"]])

    def test_ids_are_unique_across_selected_input_set(self):
        block = COMMENT + "```bash\necho hi\n```\n"
        for sources in ({"guide.md": block + block}, {"one.md": block, "two.md": block}):
            with self.subTest(sources=list(sources)):
                report = extract_sources(sources)
                duplicates = [f for f in report["findings"] if f["code"] == "duplicate-id"]
                self.assertEqual(len(duplicates), 1)
                self.assertIn("local-doctor", duplicates[0]["message"])

    def test_hash_changes_when_source_changes_even_with_same_command(self):
        first = extract_sources({"guide.md": COMMENT + "```bash\necho hi\n```\n"})
        second = extract_sources({"guide.md": "# Changed\n" + COMMENT + "```bash\necho hi\n```\n"})
        self.assertNotEqual(first["sources"][0]["sha256"], second["sources"][0]["sha256"])
        self.assertEqual(first["commands"][0]["command"], second["commands"][0]["command"])

    def run_cli(self, args):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            status = main(args)
        return status, json.loads(output.getvalue())

    def test_cli_is_read_only_and_never_executes_command_or_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "guide.md"
            marker = Path(directory) / "must-not-exist"
            metadata = {"id": f'$(touch {marker})', "environment": "local", "risk": "read-only",
                        "verification": f'__import__("pathlib").Path("{marker}").touch()'}
            content = "<!-- oriso-command: " + json.dumps(metadata) + f" -->\r\n```bash\r\ntouch {marker}\r\n```\r\n"
            source.write_bytes(content.encode())
            before = source.read_bytes()
            status, report = self.run_cli(["--strict", str(source)])
            self.assertEqual(status, 0)
            self.assertEqual(report["commands"][0]["command"], f"touch {marker}\r\n")
            self.assertEqual(source.read_bytes(), before)
            self.assertFalse(marker.exists())
            self.assertEqual(sorted(p.name for p in Path(directory).iterdir()), ["guide.md"])

    def test_extraction_does_not_launch_subprocesses(self):
        with patch("subprocess.Popen", side_effect=AssertionError("Command execution forbidden")), \
                patch("os.system", side_effect=AssertionError("Command execution forbidden")):
            report = extract_sources({"guide.md": COMMENT + "```sh\n$(echo unsafe)\n```\n"})
        self.assertEqual(report["commands"][0]["command"], "$(echo unsafe)\n")

    def test_multiline_annotation_and_all_declared_environments_and_risks(self):
        for environment in ("local", "dev", "stage", "greenfield"):
            for risk in ("read-only", "disposable-only", "operator-approved"):
                with self.subTest(environment=environment, risk=risk):
                    metadata = {"id": "command", "environment": environment, "risk": risk, "verification": "Expected result"}
                    text = "  <!-- oriso-command: " + json.dumps(metadata, indent=2) + " -->\n\n  ~~~shell\necho hi\n  ~~~~~\n"
                    report = extract_sources({"guide.md": text})
                    self.assertEqual(report["findings"], [])
                    self.assertEqual(report["commands"][0]["environment"], environment)
                    self.assertEqual(report["commands"][0]["risk"], risk)

    def test_cli_strict_fails_on_findings_and_errors_remain_json(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "guide.md"
            source.write_text("```bash\necho unannotated\n```\n")
            status, report = self.run_cli(["--strict", str(source)])
            self.assertEqual(status, 1)
            self.assertEqual(report["findings"][0]["code"], "missing-contract")
            self.assertEqual(self.run_cli([str(source)])[0], 0)
            status, report = self.run_cli([str(source.with_name("absent.md"))])
            self.assertEqual(status, 2)
            self.assertEqual(report["findings"][0]["code"], "read-error")
            source.write_bytes(b"\xff")
            self.assertEqual(self.run_cli(["--strict", str(source)])[0], 2)
        for args in ([], ["--execute", "guide.md"]):
            with self.subTest(args=args):
                status, report = self.run_cli(args)
                self.assertEqual(status, 2)
                self.assertEqual(report["findings"][0]["code"], "cli-error")


if __name__ == "__main__":
    unittest.main()
