#!/usr/bin/env bash
# Fetch all inputs, build in isolation and atomically publish one validated generation.
set -euo pipefail
UA_TOOL_ROOT="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve().parent)' "${BASH_SOURCE[0]}")"
export PYTHONPATH="$UA_TOOL_ROOT${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONDONTWRITEBYTECODE=1
exec python3 -m bundle refresh "$@"
