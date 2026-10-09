#!/usr/bin/env bash
set -euo pipefail
# Preserve the public shell entrypoint; one manifest governs doctor and startup.
SCRIPT_DIR="${BASH_SOURCE[0]%/*}"
if ! command -v python3 >/dev/null 2>&1; then
  if [[ "${1:-}" == doctor && " $* " == *" --json "* ]]; then
    printf '%s\n' '{"schema_version":1,"ready":false,"errors":["Missing tool: python3"],"tools":{},"repositories":{},"ports":{},"selected_services":[],"capabilities":{}}'
  else
    printf '%s\n' '[oriso-local] ERROR: Missing tool: python3' >&2
  fi
  exit 1
fi
exec python3 "${SCRIPT_DIR}/local_development.py" "$@"
