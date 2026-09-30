#!/usr/bin/env bash
# Historical overlay refresh is retired; it cannot preserve complete generations.
set -euo pipefail
printf '%s\n' 'Retired overlay command. Use ua-refresh.sh to build and validate a complete generation.' >&2
exit 2
