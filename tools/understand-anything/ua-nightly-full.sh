#!/usr/bin/env bash
# Deprecated entry point retained for installed callers. Public refreshes are
# release-bound; an old cron invocation must never fall back to moving Dev tips.
set -euo pipefail
RELEASE_REQUIRED=false
RELEASE_MANIFEST=false
for ARGUMENT in "$@"; do
  [[ "$ARGUMENT" != '--require-release' ]] || RELEASE_REQUIRED=true
  [[ "$ARGUMENT" != '--release-manifest' ]] || RELEASE_MANIFEST=true
done
if [[ "$RELEASE_REQUIRED" != true || "$RELEASE_MANIFEST" != true ]]; then
  echo 'Nightly refresh retired: use the platform-release workflow with an exact release manifest.' >&2
  exit 2
fi
HERE="$(cd "$(dirname "$0")" && pwd)"
exec bash "$HERE/ua-refresh.sh" "$@"
