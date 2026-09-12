#!/usr/bin/env bash
# Show the validated generation through the pinned ORISO-compatible dashboard.
set -euo pipefail
TOOLING="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve().parent)' "$0")"
RUNTIME="$(dirname "$TOOLING")"
PLUGIN="$RUNTIME/upstream/understand-anything-plugin"
[ -f "$RUNTIME/installed.json" ] || { echo 'Install the pinned toolchain first with install.py.' >&2; exit 1; }
for argument in "$@"; do
  if [[ "$argument" == --help || "$argument" == -h ]]; then
    echo 'Usage: ua-dashboard [ua-pull source/cache options] [--platform-only]'
    echo 'Verifies one immutable generation and opens its pinned source-evidence viewer.'
    exit 0
  fi
done
STATUS_JSON="$(bash "$TOOLING/ua-pull.sh" "$@" --verify --status-json)"
GRAPH_PATH="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["graphDirectory"])' <<< "$STATUS_JSON")"
export ORISO_UA_STATUS_JSON="$STATUS_JSON"
export GRAPH_DIR="$(dirname "$GRAPH_PATH")"
cd "$PLUGIN/packages/dashboard"
exec node "$PLUGIN/packages/dashboard/node_modules/vite/bin/vite.js" --host 127.0.0.1
