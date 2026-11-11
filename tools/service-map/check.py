#!/usr/bin/env python3
"""Fail when ORISO-Helm deploys a component the service map does not cover.

Usage: python3 tools/service-map/check.py --helm-dir <ORISO-Helm checkout>
"""
import argparse
import json
import re
import sys
from pathlib import Path

import yaml  # PyYAML; the workflow installs it, and a missing parser must fail loudly

ROOT = Path(__file__).resolve().parents[2]
COVERAGE = Path(__file__).with_name("coverage.json")
MAP_HTML = ROOT / "site/public/service-map/index.html"


def helm_components(helm_dir: Path) -> set[str]:
    """Template directories plus Chart.yaml dependency names."""
    names = {p.name for p in (helm_dir / "templates").iterdir() if p.is_dir()}
    chart = yaml.safe_load((helm_dir / "Chart.yaml").read_text()) or {}
    names |= {str(dep["name"]) for dep in chart.get("dependencies") or []}
    return names


def map_node_ids(html: str) -> set[str]:
    """Ids of boxes whose kind is one of the rendered LAYERS (others never show)."""
    layers = set(re.findall(r'\["(\w+)", "[^"]+"\]', html.split("const LAYERS", 1)[1].split("];", 1)[0]))
    return {i for i, k in re.findall(r'^\s*(\w+): \{ k: "(\w+)"', html, re.M) if k in layers}


def problems(components: set[str], coverage: dict, node_ids: set[str]) -> list[str]:
    mapped, excluded = coverage["mapped"], coverage["excluded"]
    out = []
    for name in sorted(components - mapped.keys() - excluded.keys()):
        out.append(
            f"ORISO-Helm deploys '{name}', but the service map does not cover it. "
            f"Add a box to {MAP_HTML.relative_to(ROOT)} and map it in "
            f"{COVERAGE.relative_to(ROOT)}, or list it under 'excluded' with a reason."
        )
    for name, node in sorted(mapped.items()):
        if node not in node_ids:
            out.append(f"coverage.json maps '{name}' to box '{node}', which is not in the map.")
    for name in sorted((mapped.keys() | excluded.keys()) - components):
        out.append(f"coverage.json lists '{name}', which ORISO-Helm no longer deploys. Remove it.")
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--helm-dir", required=True, type=Path)
    args = ap.parse_args()
    found = problems(
        helm_components(args.helm_dir),
        json.loads(COVERAGE.read_text()),
        map_node_ids(MAP_HTML.read_text()),
    )
    for p in found:
        print(f"::error::{p}")
    if not found:
        print("Service map covers every ORISO-Helm component.")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
