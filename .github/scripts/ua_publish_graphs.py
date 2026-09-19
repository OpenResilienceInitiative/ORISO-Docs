#!/usr/bin/env python3
"""Publish one validated graph generation to the consumer channel.

Why a release asset and not a commit: the current producer emits 50 MB of JSON
for UserService alone, roughly 250 MB raw across the platform. Committing that
into each repository on every run would add hundreds of megabytes of history
per month to repositories developers clone daily. The same generation
compresses to about 12 MB, and a release asset is a stable HTTPS URL that a
consumer workflow fetches with curl -- no SSH key and no token inside a job
that also runs a third-party review CLI.

PRIVACY BOUNDARY, and the reason this script filters rather than trusting its
input: ORISO-Docs is a public repository, so every asset here is world
readable. A graph describes a repository's structure -- file paths, symbols,
call relationships -- so publishing the graph of a private repository would
publish that structure. The supergraph and the platform graph merge every
input, which means they inherit the most restrictive input's visibility.

This script therefore refuses to publish any asset that is not provably built
from public sources only. It does not take that on faith from the caller: it
re-derives the decision from the generation's own manifest.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
import sys
import urllib.error
import urllib.request

API = "https://api.github.com"

# Aggregates merge every input in the generation, so they carry the union of
# all source visibilities and can never be published from a mixed generation.
AGGREGATES = ("ORISO-Supergraph", "ORISO-Platform")


def request(method, url, token, data=None, content_type=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "oriso-ua-graph-refresh",
    }
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=300) as response:
        body = response.read()
    return json.loads(body) if body else {}


def public_repositories(owner, names, token):
    """Ask GitHub which inputs are public. Anything unproven counts as private.

    A failed lookup must not read as "public": that would turn a transient API
    error into a disclosure. Callers treat absence from this set as a refusal.
    """
    public = set()
    for name in sorted(names):
        try:
            data = request("GET", f"{API}/repos/{owner}/{name}", token)
        except urllib.error.HTTPError as error:
            print(f"::warning::{name}: visibility lookup failed ({error.code}).")
            continue
        except urllib.error.URLError as error:
            print(f"::warning::{name}: visibility lookup failed ({error.reason}).")
            continue
        if data.get("private") is False and data.get("visibility") == "public":
            public.add(name)
    return public


def publishable(generation, owner, token):
    """Split the generation into what may be published and what may not."""
    manifest_path = os.path.join(generation, "manifest.json")
    if not os.path.isfile(manifest_path):
        raise SystemExit("Refusing to publish: the generation has no manifest.json")
    with open(manifest_path, encoding="utf-8") as handle:
        manifest = json.load(handle)

    sources = [entry["repository"] for entry in manifest.get("sources", [])]
    if not sources:
        raise SystemExit("Refusing to publish: the manifest names no sources")

    public = public_repositories(owner, sources, token)
    private = [name for name in sources if name not in public]

    allowed, withheld = [], []
    for name in sorted(os.listdir(generation)):
        if not os.path.isdir(os.path.join(generation, name, ".understand-anything")):
            continue
        if name in AGGREGATES:
            # Only publishable when every single input was public.
            (allowed if not private else withheld).append(name)
        elif name in public:
            allowed.append(name)
        else:
            withheld.append(name)
    return allowed, withheld, private


def pack(generation, out_dir, names):
    os.makedirs(out_dir, exist_ok=True)
    packed = []
    for name in names:
        archive = os.path.join(out_dir, f"{name}.tar.gz")
        # A fixed mtime and sorted entries keep the archive byte-stable for an
        # unchanged generation, so consumers can cache on the asset's digest.
        subprocess.run(
            [
                "tar",
                "--sort=name",
                "--mtime=@0",
                "--owner=0",
                "--group=0",
                "--numeric-owner",
                "-czf",
                archive,
                "-C",
                generation,
                f"{name}/.understand-anything",
            ],
            check=True,
        )
        packed.append(archive)
    return packed


def ensure_release(owner, repo, tag, token):
    try:
        return request("GET", f"{API}/repos/{owner}/{repo}/releases/tags/{tag}", token)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
    payload = json.dumps(
        {
            "tag_name": tag,
            "name": "Understand Anything - current graph generation",
            "body": (
                "Rolling channel for the current validated graph generation.\n\n"
                "Assets are replaced by `.github/workflows/ua-graph-refresh.yml`.\n"
                "Public inputs only; graphs of private repositories are never "
                "published here. Each asset carries the generation manifest, so a "
                "consumer can prove which source revision it is reading.\n\n"
                "Do not edit these assets by hand."
            ),
            "prerelease": True,
        }
    ).encode()
    return request(
        "POST", f"{API}/repos/{owner}/{repo}/releases", token, payload, "application/json"
    )


def replace_asset(release, path, owner, repo, token):
    name = os.path.basename(path)
    # An upload under an existing name is rejected, so the old asset goes
    # first. That leaves a short window with no asset under this name; the
    # consumer step is fail-soft by contract and falls back to the committed
    # copy rather than failing the review.
    for asset in release.get("assets", []):
        if asset["name"] == name:
            request(
                "DELETE",
                f"{API}/repos/{owner}/{repo}/releases/assets/{asset['id']}",
                token,
            )
    with open(path, "rb") as handle:
        payload = handle.read()
    request(
        "POST",
        release["upload_url"].split("{")[0] + f"?name={name}",
        token,
        payload,
        mimetypes.guess_type(name)[0] or "application/octet-stream",
    )
    return len(payload)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generation", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--owner", default="OpenResilienceInitiative")
    parser.add_argument("--repo", default="ORISO-Docs")
    parser.add_argument("--tag", default="ua-graph-latest")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="decide and pack, but publish nothing",
    )
    parser.add_argument(
        "--upload-only",
        action="store_true",
        help=(
            "upload assets a previous --dry-run already packed. Splitting the "
            "run lets build provenance be attested for the exact bytes between "
            "packing and publishing; re-packing here would attest one archive "
            "and publish another."
        ),
    )
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("::error::GITHUB_TOKEN is required, including for the visibility check.")
        return 1

    allowed, withheld, private = publishable(args.generation, args.owner, token)
    for name in withheld:
        reason = (
            f"aggregate built from private input(s): {', '.join(private)}"
            if name in AGGREGATES
            else "source repository is not public"
        )
        print(f"::notice::Withholding {name} from the public channel: {reason}.")
    if not allowed:
        print("::error::No publishable graph in this generation.")
        return 1

    if args.upload_only:
        # Re-derive `allowed` above rather than trusting the directory: a file
        # that appeared in out/ between the two calls must not be published
        # just because it is there.
        packed = [
            os.path.join(args.out, f"{name}.tar.gz")
            for name in allowed
            if os.path.isfile(os.path.join(args.out, f"{name}.tar.gz"))
        ]
        if not packed:
            print("::error::--upload-only found no packed asset to publish.")
            return 1
    else:
        packed = pack(args.generation, args.out, allowed)
        total = sum(os.path.getsize(p) for p in packed)
        print(f"PACKED {len(packed)} assets, {total / 1024 / 1024:.1f} MiB")

    if args.dry_run:
        print("::notice::Dry run: nothing was published.")
        return 0

    release = ensure_release(args.owner, args.repo, args.tag, token)
    for path in packed:
        size = replace_asset(release, path, args.owner, args.repo, token)
        print(f"PUBLISHED {os.path.basename(path)} ({size / 1024:.0f} KiB)")
    print(
        f"Channel: https://github.com/{args.owner}/{args.repo}"
        f"/releases/download/{args.tag}/<repository>.tar.gz"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
