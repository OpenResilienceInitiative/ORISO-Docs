#!/usr/bin/env python3
"""Compatibility entrypoint; delegates to the exact publisher/consumer contract.

Usage: ua-verify.py BASE TOOLING [repo:branch ...]
       ua-verify.py --base BASE --publish-root STORE [--repo repo:branch]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bundle.cli import main

args = sys.argv[1:]
if args and not args[0].startswith("-"):
    if len(args) < 2:
        print("Usage: ua-verify.py BASE TOOLING [repo:branch ...]", file=sys.stderr)
        raise SystemExit(2)
    base, tools, *specs = args
    args = ["--base", base, "--tools", tools] + [
        item for spec in specs for item in ("--repo", spec)
    ]
raise SystemExit(main(["refresh", "verify", *args]))
