#!/usr/bin/env bash
# Pull/verify complete generations in an external cache. --help lists supported routes.
set -euo pipefail
UA_TOOL_ROOT="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve().parent)' "${BASH_SOURCE[0]}")"
export PYTHONPATH="$UA_TOOL_ROOT${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONDONTWRITEBYTECODE=1
exec python3 -m bundle pull "$@"
