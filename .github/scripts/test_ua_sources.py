"""Preview inputs remain one exact snapshot while source branches move."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("ua_sources.py")
spec = importlib.util.spec_from_file_location("ua_sources", SCRIPT)
ua_sources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ua_sources)

TOOLS = Path(__file__).resolve().parents[2] / "tools/understand-anything"
sys.path.insert(0, str(TOOLS))
from bundle.pipeline import fetch_source  # noqa: E402


def git(*args):
    return subprocess.check_output(["git", *map(str, args)], text=True).strip()


class PreviewSourceTests(unittest.TestCase):
    def test_preview_stays_bound_to_cloned_commit_after_branch_advances(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            origin = root / "origin.git"
            author = root / "author"
            base = root / "sources"
            inventory = root / "inventory.json"
            repo_args = root / "repo-args.txt"

            git("init", "--bare", origin)
            git("clone", origin, author)
            git("-C", author, "config", "user.name", "Fixture")
            git("-C", author, "config", "user.email", "fixture@example.invalid")
            git("-C", author, "checkout", "-b", "dev")
            (author / "README.md").write_text("first\n")
            git("-C", author, "add", "README.md")
            git("-C", author, "commit", "-m", "first")
            git("-C", author, "push", "origin", "dev")
            first_sha = git("-C", author, "rev-parse", "HEAD")

            original_git = ua_sources.git

            def local_git(args, token, **kwargs):
                remote = f"https://github.com/{ua_sources.OWNER_DEFAULT}/ORISO-Test"
                return original_git(
                    [str(origin) if item == remote else item for item in args],
                    token,
                    **kwargs,
                )

            argv = [
                str(SCRIPT), "--tooling", str(TOOLS), "--base", str(base),
                "--inventory", str(inventory), "--repo-args", str(repo_args),
            ]
            with patch.object(sys, "argv", argv), patch.object(
                ua_sources, "load_inventory", return_value=[
                    {"name": "ORISO-Test", "branch": "dev", "enrichment": "test.json"}
                ]
            ), patch.object(ua_sources, "git", side_effect=local_git):
                self.assertEqual(ua_sources.main(), 0)

            self.assertEqual(
                json.loads(inventory.read_text())["included"][0]["sourceSHA"],
                first_sha,
            )
            self.assertIn(f"ORISO-Test:{first_sha}:test.json", repo_args.read_text())

            (author / "README.md").write_text("second\n")
            git("-C", author, "commit", "-am", "second")
            git("-C", author, "push", "origin", "dev")
            self.assertNotEqual(fetch_source(base / "ORISO-Test", "dev"), first_sha)
            self.assertEqual(
                fetch_source(base / "ORISO-Test", first_sha, expected_sha=first_sha),
                first_sha,
            )


if __name__ == "__main__":
    unittest.main()
