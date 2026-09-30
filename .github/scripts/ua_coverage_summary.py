#!/usr/bin/env python3
"""Report what a generation actually establishes, split by how it was earned.

A graph carries two kinds of knowledge and they age differently:

  structural -- files, symbols, call relationships. Re-derived from source on
                every run, so it is current the moment the run is green.

  semantic   -- the hand-written summaries in tools/understand-anything/
                enrichments/*.json. `lib/semantic-claims.mjs` only promotes one
                to `source-current` when it carries a reviewed source binding
                (sourceCommit, reviewedAt, confidence and evidence whose line
                ranges and fingerprints still match the node). A changed source
                makes it `stale`; a missing binding makes it `unbound`. Either
                way the summary still appears, prefixed with
                "[Dated orientation; <status> - verify current source]".

Printing only "generation published" would let a green run imply the prose is
current too. It is not, and the gap is human work, not compute.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

KEYS = ("sourceCurrent", "stale", "unbound")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generation", required=True)
    args = parser.parse_args()

    rows, totals = [], dict.fromkeys(KEYS, 0)
    for name in sorted(os.listdir(args.generation)):
        path = os.path.join(
            args.generation, name, ".understand-anything/knowledge-graph.json"
        )
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as handle:
            graph = json.load(handle)
        coverage = (graph.get("metadata") or {}).get("semanticCoverage")
        if coverage:
            for key in KEYS:
                totals[key] += coverage.get(key, 0)
        rows.append(
            (name, len(graph.get("nodes", [])), len(graph.get("edges", [])), coverage)
        )

    if not rows:
        print("::error::The generation holds no graphs.")
        return 1

    print("### Graph generation\n")
    print("| Repository | Nodes | Edges | source-current | stale | unbound |")
    print("| --- | ---: | ---: | ---: | ---: | ---: |")
    for name, nodes, edges, coverage in rows:
        c = coverage or {}
        print(
            f"| {name} | {nodes} | {edges} | {c.get('sourceCurrent', '–')} "
            f"| {c.get('stale', '–')} | {c.get('unbound', '–')} |"
        )

    claims = sum(totals.values())
    print(
        f"\n**Semantic claims:** {totals['sourceCurrent']} source-current, "
        f"{totals['stale']} stale, {totals['unbound']} unbound "
        f"(of {claims})."
    )
    if claims and not totals["sourceCurrent"]:
        print(
            "\n> The structural graph is current. **No** semantic claim is bound to "
            "current source, so every hand-written summary renders as dated "
            "orientation. Re-running this workflow cannot change that: a claim "
            "becomes `source-current` only when a person re-reviews it and records "
            "the source binding in the enrichment file."
        )
    elif totals["stale"]:
        print(
            f"\n> {totals['stale']} claim(s) went stale because their bound source "
            "changed. Each needs re-review; until then it renders as dated "
            "orientation."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
