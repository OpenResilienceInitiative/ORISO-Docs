#!/usr/bin/env python3
"""Fail when a tracked file names an ORISO production host outside the allowlist.

Generic instructions must use placeholder hosts (`app.example.org`), otherwise a
copied command or config silently targets ORISO's own installation. Pages that
genuinely document that installation are listed, with a reason, in
`.github/production-hosts-allowlist.txt`.

Usage: python3 .github/scripts/check_production_hosts.py [--root DIR] [--allowlist FILE]
"""

import argparse
import fnmatch
import re
import subprocess
import sys
from pathlib import Path

HOST_PATTERN = re.compile(r"\b(?:[a-z0-9-]+\.)*oriso\.org\b", re.IGNORECASE)
DEFAULT_ALLOWLIST = ".github/production-hosts-allowlist.txt"


def read_allowlist(path):
    patterns = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        entry = raw.split("#", 1)[0].strip()
        if entry:
            patterns.append(entry)
    return patterns


def tracked_files(root):
    output = subprocess.run(
        ["git", "ls-files", "-z"], cwd=root, check=True, capture_output=True
    ).stdout
    return [name for name in output.decode("utf-8").split("\0") if name]


def find_problems(root, allowlist):
    root = Path(root)
    allowlist = Path(allowlist)
    patterns = read_allowlist(allowlist)
    files = tracked_files(root)
    problems = []

    used = set()
    for name in files:
        matching = [pattern for pattern in patterns if fnmatch.fnmatchcase(name, pattern)]
        if matching:
            used.update(matching)
            continue
        data = (root / name).read_bytes() if (root / name).is_file() else b""
        if b"\0" in data:
            continue
        text = data.decode("utf-8", errors="replace")
        for number, line in enumerate(text.splitlines(), start=1):
            for match in HOST_PATTERN.finditer(line):
                problems.append(f"{name}:{number}: {match.group(0)}")

    try:
        allowlist_name = allowlist.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        allowlist_name = str(allowlist)
    for pattern in patterns:
        if pattern not in used:
            problems.append(f"{allowlist_name}: entry '{pattern}' matches no tracked file")
    return problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".")
    parser.add_argument("--allowlist")
    args = parser.parse_args(argv)
    root = Path(args.root)
    allowlist = Path(args.allowlist) if args.allowlist else root / DEFAULT_ALLOWLIST

    problems = find_problems(root, allowlist)
    if not problems:
        print("No ORISO production hosts outside the allowlist.")
        return 0
    print("ORISO production hosts found. Use a placeholder such as app.example.org, or, if the")
    print(f"page documents ORISO's own installation, add it with a reason to {DEFAULT_ALLOWLIST}:")
    for problem in problems:
        print(f"  {problem}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
