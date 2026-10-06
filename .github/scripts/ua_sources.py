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
        env["UA_GRAPH_TOKEN"] = token
    return env


def git(args, token: str | None, **kwargs):
    command = ["git"]
    if token:
        command += [
            "-c",
            "credential.helper=",
            "-c",
            'credential.helper=!f() { echo username=x-access-token; echo password="$UA_GRAPH_TOKEN"; }; f',
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
    parser.add_argument("--release-manifest")
    parser.add_argument("--require-release", action="store_true")
    parser.add_argument("--documentation-revision")
    args = parser.parse_args()

    if args.require_release and not args.release_manifest:
        print("::error::release manifest required; no branch-tip fallback")
        return 1
    token = os.environ.get("UA_GRAPH_TOKEN") or None
    included, skipped = [], []

    entries=load_inventory(args.tooling)
    release_evidence=None
    if args.require_release or args.release_manifest:
        if args.owner != OWNER_DEFAULT:raise ValueError("Release sources require the canonical public owner")
        if args.require_release and not args.documentation_revision:raise ValueError("Exact documentation revision required for public release inputs")
        from bundle.release_inputs import load_release
        release_evidence=load_release(args.release_manifest,args.documentation_revision)
        enrichments={e['name']:e['enrichment'] for e in entries}
        entries=[{'name':s['repository'],'branch':s['ref'],'sourceSHA':s['sourceSHA'],'enrichment':enrichments[s['repository']]} for s in release_evidence['lock']['sources']]
        token=None # The release path is public-only; no private graph credential used.
    for entry in entries:
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
        if release_evidence:
            os.makedirs(target,exist_ok=False)
            for command in [['init','--quiet',target],['-C',target,'remote','add','origin',f"https://github.com/{args.owner}/{entry['name']}"]]:
                result=git(command,None,capture_output=True,text=True,timeout=90)
                if result.returncode:raise ValueError('Exact release source preparation failed: '+entry['name'])
            from bundle.pipeline import fetch_source
            sha=fetch_source(target,entry['branch'],expected_sha=entry['sourceSHA'])
            result=git(['-C',target,'checkout','--quiet','--detach',sha],None,capture_output=True,text=True,timeout=90)
        else:
            result=git(['clone','--quiet','--single-branch','--branch',entry['branch'],f"https://github.com/{args.owner}/{entry['name']}",target],token,capture_output=True,text=True,timeout=900)
        if result.returncode != 0:
            print(f"::error::Failed to clone {entry['name']} ({entry['branch']}).")
            return 1
        print(f"INPUT {entry['name']} {entry['branch']}")

    for name in skipped:
        # A notice, not a warning. Running on the public inputs is supported,
        # and a red annotation every night would train the team to ignore this
        # workflow's output.
        print(f"::notice::{name} is not reachable and is omitted from this generation.")

    with open(args.inventory, "w", encoding="utf-8") as handle:
        json.dump({"included": included, "skipped": skipped,"release":release_evidence,"mode":"released-inputs" if release_evidence else "non-activatable-branch-preview"}, handle, indent=2)
        handle.write("\n")

    # One argument per line, ready for `mapfile`, so the workflow needs no
    # nested heredoc inside a process substitution.
    with open(args.repo_args, "w", encoding="utf-8") as handle:
        if release_evidence:
            handle.write("--require-release\n--release-manifest\n"+os.path.abspath(args.release_manifest)+"\n")
            if args.documentation_revision:handle.write("--documentation-revision\n"+args.documentation_revision+"\n")
        for entry in included:
            handle.write("--repo\n")
            handle.write(f"{entry['name']}:{entry['branch']}:{entry['enrichment']}\n")

    return 0


if __name__ == "__main__":
    try:sys.exit(main())
    except Exception:
        print("::error::Release/source input verification failed; inspect declared lock/ref agreement. No fallback performed.")
        sys.exit(1)
