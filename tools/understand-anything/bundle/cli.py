"""Supported shell entrypoints share the same generation contract."""

from __future__ import annotations
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid
from .contract import ContractError, MAX_FILE, read_json, require, validate, write_json
from .pipeline import REPOS, fetch_source, refresh, run
from .storage import pull, rollback

TOOLS = Path(__file__).resolve().parents[1]


def repo_context():
    root = Path(run(["git", "rev-parse", "--show-toplevel"], timeout=10)).resolve()
    remote = run(["git", "-C", str(root), "remote", "get-url", "origin"], timeout=10)
    name = remote.rstrip("/").rsplit("/", 1)[-1].rsplit(":", 1)[-1].removesuffix(".git")
    return root, name


def source_status(manifest, repository, name, ref, allow=False):
    source = next((s for s in manifest["sources"] if s["repository"] == name), None)
    require(source is not None, f"repository absent from generation: {name}")
    require(source["ref"] == ref, f"wrong source ref: expected {ref}")
    origin = fetch_source(repository, ref)
    require(
        origin == source["sourceSHA"],
        "VALID-BUT-NOT-CURRENT-SOURCE: fetched source ref differs from graph full SHA",
    )
    checkout = run(["git", "-C", str(repository), "rev-parse", "HEAD"], timeout=10)
    if checkout != source["sourceSHA"]:
        require(
            allow,
            "VALID-DIFFERENT-CHECKOUT: use --allow-different-checkout to accept the declared source intentionally",
        )
        return "VALID-DIFFERENT-CHECKOUT"
    return "VALID-CURRENT-SOURCE"


def download(args):
    if args.from_dir:
        root = Path(args.from_dir).resolve()

        def fetch(name, target):
            source = root / name
            with source.open("rb") as handle, target.open("wb") as output:
                copy_bounded(handle, output)

        return fetch, str(root)
    if args.via_https is not None:
        base = args.via_https.rstrip("/")
        require(
            urllib.parse.urlparse(base).scheme == "https",
            "HTTPS transport requires https://",
        )
        parsed_base = urllib.parse.urlparse(base)
        require(
            parsed_base.hostname
            and parsed_base.username is None
            and parsed_base.password is None
            and not parsed_base.query
            and not parsed_base.fragment,
            "HTTPS base must be a plain endpoint; provide credentials through ORISO_UA_AUTH",
        )
        auth = os.environ.get("ORISO_UA_AUTH", "")
        expected_origin = urllib.parse.urlparse(base).netloc

        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                # Reject in urllib's redirect handler, before it can open the target
                # or forward Authorization. Post-response URL checks are too late.
                fp.close()
                raise ContractError(
                    "HTTPS redirect rejected before sending credentials"
                )

        opener = urllib.request.build_opener(NoRedirect())

        def fetch(name, target):
            request = urllib.request.Request(base + "/" + name)
            if auth:
                request.add_header(
                    "Authorization", "Basic " + base64.b64encode(auth.encode()).decode()
                )
            with opener.open(request, timeout=60) as response, target.open(
                "wb"
            ) as output:
                require(
                    urllib.parse.urlparse(response.url).scheme == "https"
                    and urllib.parse.urlparse(response.url).netloc == expected_origin,
                    "transport downgraded or redirected HTTPS",
                )
                copy_bounded(response, output)

        return fetch, base
    host = os.environ.get("ORISO_UA_SSH_ALIAS", "predev")
    remote = os.environ.get("ORISO_UA_REMOTE_ROOT", "/opt/oriso-understand/published")
    require(
        not host.startswith("-") and not any(c.isspace() for c in host),
        "invalid SSH host",
    )

    def fetch(name, target):
        command = [
            "ssh",
            "-o",
            "BatchMode=yes",
            "-o",
            "ConnectTimeout=10",
            host,
            "cat -- " + shlex.quote(remote + "/" + name),
        ]
        # Spool stderr privately; never echo credentials/remote command responses.
        with target.open("wb") as output, tempfile.TemporaryFile() as error:
            try:
                result = subprocess.run(
                    command, stdout=output, stderr=error, timeout=90
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                raise ContractError("SSH transfer failed or timed out") from exc
        require(
            result.returncode == 0, "SSH transfer failed; previous generation retained"
        )
        require(target.stat().st_size <= MAX_FILE, "download exceeds size budget")

    return fetch, f"ssh:{host}:{remote}"


def copy_bounded(source, target):
    size = 0
    while True:
        data = source.read(1024 * 1024)
        if not data:
            break
        size += len(data)
        require(size <= MAX_FILE, "download exceeds size budget")
        target.write(data)


def migrate(repository, cache):
    """Explicit backup + remove old hiding flags; never overwrite tracked graphs."""
    legacy = repository / ".understand-anything"
    backup = cache / "legacy-backups" / str(uuid.uuid4())
    if legacy.exists():
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(legacy, backup, symlinks=True)
    tracked = run(
        ["git", "-C", str(repository), "ls-files", "-z", "--", ".understand-anything"],
        timeout=10,
    ).split("\0")
    for name in filter(None, tracked):
        run(
            [
                "git",
                "-C",
                str(repository),
                "update-index",
                "--no-skip-worktree",
                "--",
                name,
            ],
            timeout=10,
        )
    pointer = repository / ".understand-anything-cache.json"
    tracked_pointer = run(
        [
            "git",
            "-C",
            str(repository),
            "ls-files",
            "--",
            ".understand-anything-cache.json",
        ],
        timeout=10,
    )
    require(not tracked_pointer, "cache pointer is tracked; refusing overwrite")
    if pointer.exists():
        old = read_json(pointer)
        require(
            old.get("schemaVersion") == "oriso.ua.cache-pointer/v1",
            "unrecognized existing cache pointer",
        )
    exclude = Path(
        run(
            ["git", "-C", str(repository), "rev-parse", "--git-path", "info/exclude"],
            timeout=10,
        )
    )
    if not exclude.is_absolute():
        exclude = repository / exclude
    exclude.parent.mkdir(parents=True, exist_ok=True)
    content = exclude.read_text() if exclude.exists() else ""
    if "/.understand-anything-cache.json" not in content.splitlines():
        with exclude.open("a") as handle:
            handle.write(
                ("\n" if content and not content.endswith("\n") else "")
                + "/.understand-anything-cache.json\n"
            )
    write_json(
        pointer,
        {
            "schemaVersion": "oriso.ua.cache-pointer/v1",
            "cache": str(cache),
            "legacyBackup": str(backup) if backup.exists() else None,
        },
    )
    print(
        "MIGRATED: legacy graph bytes retained; hidden index flags cleared; external cache pointer recorded"
    )


def generation_status(manifest, content_root, cache, requested, channel):
    selected = next(
        (g for g in manifest["graphs"] if g["repository"] == requested), None
    )
    require(selected is not None, "requested graph absent")
    graph = read_json(content_root / selected["path"])
    depth = read_json(content_root / requested / ".understand-anything/depth.json")
    receipt = cache / "receipts" / f"{manifest['generationId']}.json"
    delivery_record = read_json(receipt) if receipt.exists() else {}
    delivery = delivery_record.get("deliveredAt")
    channel = delivery_record.get("channel") or channel
    return dict(
        generationId=manifest["generationId"],
        channel=channel,
        generatedAt=manifest["generatedAt"],
        structuralAnalyzedAt=graph["project"]["analyzedAt"],
        semanticCoverage=depth.get("semanticCoverage", {}),
        semanticReviewedAt=depth.get("semanticReviewedAt"),
        deliveredAt=delivery,
        verificationScope="cached-content",
        sourceVerification=None,
        graphDirectory=str(content_root / requested / ".understand-anything"),
    )


def pull_main(argv):
    parser = argparse.ArgumentParser(
        description="Validate and atomically pull a complete source-bound UA generation into an external cache."
    )
    transport = parser.add_mutually_exclusive_group()
    transport.add_argument("--via-ssh", action="store_true")
    transport.add_argument(
        "--via-https", nargs="?", const="https://predev.oriso.org/ua"
    )
    transport.add_argument(
        "--from",
        dest="from_dir",
        help="local published generation store (offline transport)",
    )
    parser.add_argument("--cache-dir")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument(
        "--path",
        action="store_true",
        help="print validated cached content path only; run --verify first for current-source verification",
    )
    parser.add_argument(
        "--status-json",
        action="store_true",
        help="print validated cached status JSON; --verify checks current source separately",
    )
    parser.add_argument("--platform-only", action="store_true")
    parser.add_argument("--allow-different-checkout", action="store_true")
    parser.add_argument("--migrate-legacy", action="store_true")
    parser.add_argument(
        "--unlock", action="store_true", help="alias for explicit --migrate-legacy"
    )
    parser.add_argument("--rollback", action="store_true")
    parser.add_argument("--ref")
    args = parser.parse_args(argv)
    repository, name = repo_context()
    fetch, channel = download(args)
    cache = (
        Path(
            args.cache_dir
            or os.environ.get("ORISO_UA_CACHE")
            or (
                Path(os.environ.get("XDG_CACHE_HOME", str(Path.home() / ".cache")))
                / "oriso-understand"
                / hashlib.sha256(channel.encode()).hexdigest()[:16]
            )
        )
        .expanduser()
        .resolve()
    )
    ref = args.ref or "refs/heads/" + next((b for n, b, _ in REPOS if n == name), "dev")
    if args.migrate_legacy or args.unlock:
        migrate(repository, cache)
        return 0
    if args.rollback:
        manifest = rollback(cache)
        print(
            f'ROLLED-BACK {manifest["generationId"]}; source freshness must be reverified'
        )
        return 0
    if args.path or args.status_json or args.verify:
        content_root = (cache / "current").resolve(strict=True)
        manifest = validate(content_root)
    else:
        manifest = None
    requested = "ORISO-Platform" if args.platform_only else name
    if args.path:
        require(
            any(g["repository"] == requested for g in manifest["graphs"]),
            "requested graph absent",
        )
        print(content_root / requested / ".understand-anything")
        return 0
    status = []

    def check(manifest, stage):
        status.append(
            source_status(
                manifest, repository, name, ref, args.allow_different_checkout
            )
        )

    if args.verify:
        check(manifest, content_root)
        if not args.status_json:
            print(f'{status[-1]} {manifest["generationId"]} source={name} {ref}')
    elif not args.status_json:
        manifest = pull(fetch, cache, check=check, channel=channel)
        content_root = cache / "generations" / manifest["generationId"]
        print(
            f'REFRESHED {manifest["generationId"]} {status[-1]} (complete generation)'
        )
    summary = generation_status(manifest, content_root, cache, requested, channel)
    if args.verify:
        summary.update(
            verificationScope="current-source", sourceVerification=status[-1]
        )
    if args.status_json:
        print(json.dumps(summary, sort_keys=True))
        return 0
    print(
        f'channel={summary["channel"]} structuralAnalyzedAt={summary["structuralAnalyzedAt"]} lastSuccessfulDelivery={summary["deliveredAt"] or "unknown"}'
    )
    print(
        "semanticCoverage="
        + json.dumps(summary["semanticCoverage"], sort_keys=True)
        + " semanticReviewedAt="
        + str(summary["semanticReviewedAt"] or "unknown/unbound")
    )
    if (repository / ".understand-anything").exists():
        print(
            "LEGACY-REPO-GRAPHS-UNMODIFIED: consumers must use ua-pull --path; --migrate-legacy backs up and clears old hiding flags",
            file=sys.stderr,
        )
    return 0


def refresh_main(argv):
    parser = argparse.ArgumentParser(
        description="Build and publish one complete generation; source checkouts remain unchanged."
    )
    parser.add_argument(
        "mode", nargs="?", choices=["refresh", "verify"], default="refresh"
    )
    parser.add_argument(
        "--base", default=os.environ.get("UA_BASE", "/opt/oriso-understand")
    )
    parser.add_argument("--tools", default=str(TOOLS))
    parser.add_argument("--publish-root", default=os.environ.get("UA_PUBLISH_ROOT"))
    parser.add_argument(
        "--repo",
        action="append",
        help="explicit repo:branch[:enrichment.json] input inventory",
    )
    args = parser.parse_args(argv)
    base = Path(args.base)
    publish_root = Path(args.publish_root) if args.publish_root else base / "published"
    specs = []
    for item in args.repo or []:
        pieces = item.split(":")
        require(len(pieces) in (2, 3), "expected repo:branch[:enrichment]")
        specs.append((pieces[0], pieces[1], pieces[2] if len(pieces) == 3 else ""))
    specs = specs or REPOS
    if args.mode == "verify":
        manifest = validate(
            publish_root / "current",
            expected_refs={n: "refs/heads/" + b for n, b, _ in specs},
        )
        for name, branch, _ in specs:
            source_status(
                manifest, base / name, name, "refs/heads/" + branch, allow=True
            )
        print(
            f'VALID-CURRENT-SOURCE {manifest["generationId"]} ({len(specs)} freshly fetched inputs)'
        )
    else:
        refresh(base, args.tools, publish_root, specs)
    return 0


def main(argv=None):
    argv = list(argv or sys.argv[1:])
    try:
        require(bool(argv), "entrypoint required")
        if argv[0] in ("seal", "validate", "publish"):
            from .contract import seal
            from .storage import publish

            p = argparse.ArgumentParser()
            p.add_argument("stage")
            p.add_argument("--sources")
            p.add_argument("--publish-root")
            options = p.parse_args(argv[1:])
            if argv[0] == "seal":
                require(options.sources is not None, "--sources JSON file required")
                manifest = seal(Path(options.stage), read_json(Path(options.sources)))
            elif argv[0] == "publish":
                require(options.publish_root is not None, "--publish-root required")
                manifest = publish(Path(options.stage), Path(options.publish_root))
            else:
                manifest = validate(Path(options.stage))
            print(
                json.dumps(
                    {
                        "generationId": manifest["generationId"],
                        "status": argv[0].upper() + "-OK",
                    }
                )
            )
            return 0
        require(argv[0] in ("pull", "refresh"), "unknown entrypoint")
        return pull_main(argv[1:]) if argv[0] == "pull" else refresh_main(argv[1:])
    except (ContractError, OSError, ValueError) as error:
        print(f"FAILED: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print(
            "INTERRUPTED: inspect current and previous pointers before retrying",
            file=sys.stderr,
        )
        return 130
