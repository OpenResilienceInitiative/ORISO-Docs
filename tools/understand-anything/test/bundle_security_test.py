"""Concrete review regressions: redirect disclosure, log disclosure, and lost inventory."""

import argparse
import base64
import contextlib
import email.message
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.request
import urllib.response

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from bundle import cli, pipeline
from bundle.contract import ContractError, seal, validate
from bundle.storage import publish, rollback
from bundle_contract_test import fixture, NOW


class ReviewRegressions(unittest.TestCase):
    def test_redirect_is_rejected_before_any_second_request_or_output_write(self):
        # Exercise urllib's actual redirect/error processing, replacing only socket I/O.
        original_build = urllib.request.build_opener
        for redirect in (
            "https://other.example/next",
            "https://origin.example/next",
            "http://origin.example/next",
            "https://origin.example:444/next",
        ):
            requests = []

            class Transport(urllib.request.BaseHandler):
                handler_order = 100

                def https_open(self, request):
                    requests.append(request)
                    headers = email.message.Message()
                    code = 302 if len(requests) == 1 else 200
                    if code == 302:
                        headers["Location"] = redirect
                    response = urllib.response.addinfourl(
                        io.BytesIO(b"redirect target response"),
                        headers,
                        request.full_url,
                        code,
                    )
                    response.msg = "Found" if code == 302 else "OK"
                    return response

                http_open = https_open

            transport = Transport()
            fake = original_build(transport)
            args = argparse.Namespace(
                from_dir=None, via_https="https://origin.example/ua"
            )
            with self.subTest(redirect=redirect), tempfile.TemporaryDirectory() as tmp:
                target = Path(tmp) / "manifest.json"
                target.write_bytes(b"original output")
                with patch.dict(
                    "os.environ", {"ORISO_UA_AUTH": "synthetic-user:synthetic-secret"}
                ), patch("urllib.request.urlopen", side_effect=fake.open), patch(
                    "urllib.request.build_opener",
                    side_effect=lambda *handlers: original_build(transport, *handlers),
                ):
                    fetch, _ = cli.download(args)
                    with self.assertRaises(ContractError):
                        fetch("current/manifest.json", target)
                self.assertEqual(len(requests), 1, "Redirect target received a request")
                self.assertEqual(target.read_bytes(), b"original output")
                self.assertTrue(
                    requests[0].get_header("Authorization").startswith("Basic ")
                )

    def test_https_base_cannot_embed_secrets_in_the_displayed_channel(self):
        for url in (
            "https://user:secret@host.invalid",
            "https://host.invalid/ua?token=secret",
            "https://host.invalid/ua#secret",
        ):
            with self.subTest(url_kind=url.split(":", 1)[0]), self.assertRaises(
                ContractError
            ):
                cli.download(argparse.Namespace(from_dir=None, via_https=url))

    def test_https_success_still_uses_bounded_copy(self):
        original_build = urllib.request.build_opener

        class Transport(urllib.request.BaseHandler):
            handler_order = 100

            def https_open(self, request):
                response = urllib.response.addinfourl(
                    io.BytesIO(b"valid response"),
                    email.message.Message(),
                    request.full_url,
                    200,
                )
                response.msg = "OK"
                return response

        transport = Transport()
        fake = original_build(transport)
        with tempfile.TemporaryDirectory() as tmp, patch(
            "urllib.request.urlopen", side_effect=fake.open
        ), patch(
            "urllib.request.build_opener",
            side_effect=lambda *handlers: original_build(transport, *handlers),
        ), patch(
            "bundle.cli.copy_bounded", wraps=cli.copy_bounded
        ) as bounded:
            fetch, _ = cli.download(
                argparse.Namespace(from_dir=None, via_https="https://origin.example/ua")
            )
            target = Path(tmp) / "file"
            fetch("current/manifest.json", target)
            self.assertEqual(target.read_bytes(), b"valid response")
            bounded.assert_called_once()

    def test_command_stderr_credentials_are_redacted_before_tail_and_cli_output(self):
        samples = [
            ('{"access_token": "SYNTHETIC_TOKEN"}', ["SYNTHETIC_TOKEN"]),
            ('{"password":"SYNTHETIC_PASSWORD"}', ["SYNTHETIC_PASSWORD"]),
            (
                "fatal: https://synthetic-user:URLSECRET@host.invalid/private?access_token=QUERYSECRET#FRAGMENTSECRET\n",
                ["synthetic-user", "URLSECRET", "QUERYSECRET", "FRAGMENTSECRET"],
            ),
            (
                "GET /path?token=QUERYSECRET&other=SECONDSECRET\nAuthorization: Bearer HEADERSECRET\nProxy-Authorization: Basic PROXYSECRET\n",
                ["QUERYSECRET", "SECONDSECRET", "HEADERSECRET", "PROXYSECRET"],
            ),
            (
                '{"Authorization": "Bearer JSONSECRET"}\nX-Api-Key: KEYSECRET\nCookie: session=COOKIESECRET\n',
                ["JSONSECRET", "KEYSECRET", "COOKIESECRET"],
            ),
            (
                "fatal https://user:" + "LONGSECRET" * 300 + "@host.invalid/path\n",
                ["LONGSECRET"],
            ),
        ]
        for stderr, secrets in samples:
            with self.subTest(stderr_kind=stderr[:12]):
                process = subprocess.CompletedProcess(
                    ["git"], 1, stdout="", stderr=stderr
                )
                output = io.StringIO()
                with patch(
                    "bundle.pipeline.subprocess.run", return_value=process
                ), patch(
                    "bundle.cli.refresh",
                    side_effect=lambda *args: pipeline.run(["git"]),
                ), contextlib.redirect_stderr(
                    output
                ):
                    result = cli.main(["refresh"])
                self.assertEqual(result, 1)
                text = output.getvalue()
                self.assertIn("command failed (1): git", text)
                self.assertLess(len(text), 1900)
                for secret in secrets:
                    self.assertNotIn(secret, text)

    def test_nested_manifest_is_inventoried_and_checked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "stage"
            sources = fixture(root)
            nested = root / "ORISO-Test/.understand-anything/manifest.json"
            nested.write_text('{"configuration":1}')
            manifest = seal(root, sources, now=NOW)
            self.assertIn(
                nested.relative_to(root).as_posix(),
                {f["path"] for f in manifest["files"]},
            )
            nested.write_text('{"configuration":2}')
            with self.assertRaises(ContractError):
                validate(root, now=NOW)

    def test_unlisted_nested_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "stage"
            sources = fixture(root)
            seal(root, sources, now=NOW)
            (root / "ORISO-Test/.understand-anything/manifest.json").write_text("{}")
            with self.assertRaises(ContractError):
                validate(root, now=NOW)

    def test_rollback_rejects_absent_or_regular_current_without_mutating_routes(self):
        for kind in ("missing", "file", "directory"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                store = root / "store"
                for number in (1, 2):
                    stage = root / f"stage-{number}"
                    sources = fixture(stage)
                    seal(stage, sources, now=NOW)
                    publish(stage, store, now=NOW)
                previous = (store / "previous").readlink()
                current = store / "current"
                current.unlink()
                if kind == "file":
                    current.write_bytes(b"original bytes")
                elif kind == "directory":
                    current.mkdir()
                with self.assertRaises(ContractError):
                    rollback(store, now=NOW)
                self.assertEqual((store / "previous").readlink(), previous)
                self.assertFalse(current.is_symlink())
                if kind == "file":
                    self.assertEqual(current.read_bytes(), b"original bytes")
                elif kind == "directory":
                    self.assertTrue(current.is_dir())
                else:
                    self.assertFalse(current.exists())

    def test_legacy_verify_missing_positional_argument_has_usage_error(self):
        result = subprocess.run(
            [
                sys.executable,
                str(Path(__file__).resolve().parents[1] / "ua-verify.py"),
                "/synthetic-base",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("Usage:", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
