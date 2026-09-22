"""Tests for check_production_hosts.py (run: python3 -m unittest discover -s .github/scripts -p 'test_*.py')."""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_production_hosts as guard  # noqa: E402

HOST = "app." + "oriso" + ".org"  # split so this test file never trips the guard itself


class GuardTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)
        self.allowlist = self.root / "allowlist.txt"
        self.allowlist.write_text("# production-specific pages\n", encoding="utf-8")
        self.track("allowlist.txt")

    def tearDown(self):
        self._tmp.cleanup()

    def write(self, path, content, track=True):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            target.write_bytes(content)
        else:
            target.write_text(content, encoding="utf-8")
        if track:
            self.track(path)

    def track(self, path):
        subprocess.run(["git", "add", "--", path], cwd=self.root, check=True)

    def allow(self, *patterns):
        with self.allowlist.open("a", encoding="utf-8") as handle:
            for pattern in patterns:
                handle.write(f"{pattern}  # production-specific\n")

    def run_guard(self):
        return guard.find_problems(self.root, self.allowlist)

    def test_flags_a_production_host_with_file_and_line(self):
        self.write("guide.mdx", f"intro\ncurl -I https://{HOST}\n")

        self.assertEqual(self.run_guard(), [f"guide.mdx:2: {HOST}"])

    def test_placeholder_hosts_and_look_alike_words_pass(self):
        self.write(
            "guide.mdx",
            "curl -I https://app.example.org\nsee oriso.organisation and ORISO docs\n",
        )

        self.assertEqual(self.run_guard(), [])

    def test_allowlisted_files_and_globs_pass(self):
        self.write("site/README.md", f"served at https://{HOST}\n")
        self.write("out/deep/page.html", f"<a href='https://{HOST}'>\n")
        self.allow("site/README.md", "out/**")

        self.assertEqual(self.run_guard(), [])

    def test_untracked_files_are_ignored(self):
        self.write("scratch.md", f"https://{HOST}\n", track=False)

        self.assertEqual(self.run_guard(), [])

    def test_binary_files_are_ignored(self):
        self.write("logo.png", b"\x89PNG\x00" + HOST.encode())

        self.assertEqual(self.run_guard(), [])

    def test_stale_allowlist_entry_is_reported(self):
        self.allow("gone.md")

        self.assertEqual(
            self.run_guard(), ["allowlist.txt: entry 'gone.md' matches no tracked file"]
        )

    def test_main_exits_non_zero_and_names_the_hit(self):
        self.write("guide.mdx", f"https://{HOST}\n")

        completed = subprocess.run(
            [
                sys.executable,
                str(Path(guard.__file__)),
                "--root",
                str(self.root),
                "--allowlist",
                str(self.allowlist),
            ],
            capture_output=True,
            text=True,
        )

        self.assertEqual(completed.returncode, 1)
        self.assertIn("guide.mdx:1", completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
