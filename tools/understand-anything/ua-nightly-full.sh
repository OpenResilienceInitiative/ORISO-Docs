#!/usr/bin/env bash
# Compatibility entry point: nightly and manual runs use the same atomic producer.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
exec bash "$HERE/ua-refresh.sh" "$@"
