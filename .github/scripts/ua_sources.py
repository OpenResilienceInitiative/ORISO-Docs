#!/usr/bin/env python3
"""Prepare the graph generation's inputs: decide, clone, and emit the arguments.

All three belong together. The authoritative repo/branch list lives in the
pinned tooling (`bundle.pipeline.REPOS`) and must not be copied into workflow
YAML -- a second copy drifts silently, and the generation contract would then
build a different platform than the tooling believes it built.

Cloning happens here rather than in shell so the token never reaches a file or
a process listing: it is read from the environment and handed to git through an
in-memory credential helper. A URL of the form https://x-access-token:TOKEN@...
would appear in `ps`, in `set -x` output, and in any shell script written to
disk, so it is not used.

Two inputs are private (ORISO-E2E, ORISO-Infra). Without a token that can read
them the run covers the public repositories only. That is a supported mode, not
a degraded one: the public consumer channel may not carry graphs of private
repositories anyway.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

OWNER_DEFAULT = "OpenResilienceInitiative"

# Private on GitHub; anonymous CI cannot read them.
PRIVATE = {"ORISO-E2E", "ORISO-Infra"}


def load_inventory(tooling: str):
    sys.path.insert(0, tooling)
    from bundle.pipeline import REPOS  # noqa: E402  (path configured above)

    return [{"name": n, "branch": b, "enrichment": e} for n, b, e in REPOS]


def git_env(token: str | None) -> dict:
    env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
    if token:
        # `-c credential.helper=` clears any inherited helper first, so the
        # token below is the only credential source and nothing on the runner
        # can substitute another one.
        env["GIT_ASKPASS"] = ""
    return env


def git(args, token: str | None, **kwargs):
    command = ["git"]
    if token:
        command += [
            "-c",
            "credential.helper=",
            "-c",
            f"credential.helper=!f() {{ echo username=x-access-token; echo password={token}; }}; f",
        ]
    return subprocess.run(command + args, env=git_env(token), **kwargs)


def reachable(owner: str, name: str, token: str | None) -> bool:
    probe = git(
        ["ls-remote", "--heads", f"https://github.com/{owner}/{name}", "HEAD"],
        token,
        capture_output=True,
        timeout=60,
    )
    return probe.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tooling", required=True)
    parser.add_argument("--owner", default=OWNER_DEFAULT)
    parser.add_argument("--base", required=True, help="directory to clone sources into")
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--repo-args", required=True)
    args = parser.parse_args()

    token = os.environ.get("UA_GRAPH_TOKEN") or None
    included, skipped = [], []

    for entry in load_inventory(args.tooling):
        if entry["name"] in PRIVATE:
            # Check even with a token: a token that lacks read access would
            # otherwise fail deep inside the producer, where the error is far
            # harder to read than it is here.
            if not token or not reachable(args.owner, entry["name"], token):
                skipped.append(entry["name"])
                continue
        included.append(entry)

    if not included:
        print("::error::No reachable inputs; refusing to build an empty generation.")
        return 1

    os.makedirs(args.base, exist_ok=True)
    for entry in included:
        target = os.path.join(args.base, entry["name"])
        # The producer expects base/<name> to be a git repository with an
        # `origin` remote; it fetches the pinned branch itself and analyses a
        # detached checkout, so a single-branch clone is sufficient.
        result = git(
            [
                "clone",
                "--quiet",
                "--single-branch",
                "--branch",
                entry["branch"],
                f"https://github.com/{args.owner}/{entry['name']}",
                target,
            ],
            token,
            capture_output=True,
            text=True,
            timeout=900,
        )
        if result.returncode != 0:
            # Never echo git's stderr verbatim: a failing authenticated clone
            # can carry the remote URL, and with it the credential.
            print(f"::error::Failed to clone {entry['name']} ({entry['branch']}).")
            return 1
        print(f"INPUT {entry['name']} {entry['branch']}")

    for name in skipped:
        # A notice, not a warning. Running on the public inputs is supported,
        # and a red annotation every night would train the team to ignore this
        # workflow's output.
        print(f"::notice::{name} is not reachable and is omitted from this generation.")

    with open(args.inventory, "w", encoding="utf-8") as handle:
        json.dump({"included": included, "skipped": skipped}, handle, indent=2)
        handle.write("\n")

    # One argument per line, ready for `mapfile`, so the workflow needs no
    # nested heredoc inside a process substitution.
    with open(args.repo_args, "w", encoding="utf-8") as handle:
        for entry in included:
            handle.write("--repo\n")
            handle.write(f"{entry['name']}:{entry['branch']}:{entry['enrichment']}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
