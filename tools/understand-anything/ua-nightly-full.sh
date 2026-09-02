#!/usr/bin/env bash
# Nightly FULL rebuild of all Understand-Anything graphs (replaces the
# overlay/baseline approach of refresh-understand-ultralite-local.sh).
# Deterministic pipeline, ~3s/repo: advance clone -> generate -> enrich ->
# install -> supergraph. Dashboards read graphs from disk per request, so no
# container restarts are needed.
set -uo pipefail
BASE=/opt/oriso-understand
RB=$BASE/_rebuild
LOCK=/tmp/ua-nightly-full.lock
exec 9>"$LOCK"; flock -n 9 || { echo "$(date -Is) another run active, exiting"; exit 0; }
STAMP=$(date +%Y-%m-%dT%H-%M-%S)
echo "=== ua-nightly-full $STAMP ==="

# repo:enrichment (enrichment empty = none)
REPOS=(
  "ORISO-Admin:enrich-admin.json"
  "ORISO-AgencyService:enrich-agencyservice.json"
  "ORISO-ConsultingTypeService:enrich-cts.json"
  "ORISO-Database:enrich-database.json"
  "ORISO-Frontend:enrich-frontend.json"
  "ORISO-Keycloak:enrich-keycloak.json"
  "ORISO-Kubernetes:enrich-kubernetes.json"
  "ORISO-TenantService:enrich-tenantservice.json"
  "ORISO-UserService:enrich-userservice.json"
  "ORISO-Helm:enrich-helm.json"
  "ORISO-E2E:enrich-e2e.json"
  "ORISO-Infra:enrich-infra.json"
)

FAIL=0
# advance the ORISO-Docs clone too (hosts the supergraph + docs file views)
for spec in "${REPOS[@]}" "ORISO-Docs:"; do
  R=${spec%%:*}
  cd "$BASE/$R" || { echo "MISSING $R"; FAIL=1; continue; }
  B=$(git rev-parse --abbrev-ref HEAD)
  git fetch -q origin "$B" 2>/dev/null && git reset -q --hard "origin/$B" \
    || echo "WARN: fetch/advance failed for $R (keeping local tip)"
done

for spec in "${REPOS[@]}"; do
  R=${spec%%:*}; E=${spec#*:}
  cd "$RB" || exit 1
  if ! node ua-generate.mjs "$BASE/$R" "$R" "./$R" > "/tmp/ua-gen-$R.log" 2>&1; then
    echo "GEN FAIL $R:"; tail -3 "/tmp/ua-gen-$R.log"; FAIL=1; continue
  fi
  if [ -n "$E" ] && [ -f "$RB/$E" ]; then
    if ! node ua-enrich-merge.mjs "./$R" "$E" > "/tmp/ua-enr-$R.log" 2>&1; then
      echo "ENRICH FAIL $R:"; tail -3 "/tmp/ua-enr-$R.log"; FAIL=1; continue
    fi
  fi
  LIVE=$BASE/$R/.understand-anything
  mkdir -p "$LIVE"
  [ -f "$LIVE/knowledge-graph.json" ] && cp "$LIVE/knowledge-graph.json" "$LIVE/knowledge-graph.json.bak-$STAMP"
  cp "./$R/knowledge-graph.json" "./$R/meta.json" "./$R/fingerprints.json" "$LIVE/" || { echo "INSTALL FAIL $R"; FAIL=1; continue; }
  echo "OK $R $(git -C "$BASE/$R" rev-parse --short HEAD)"
done

cd "$RB" && node ua-build-supergraph.mjs --install > /tmp/ua-supergraph.log 2>&1 \
  && echo "OK supergraph" || { echo "SUPERGRAPH FAIL:"; tail -5 /tmp/ua-supergraph.log; FAIL=1; }

# Daily truth chain (#106): graph → JSON export → decay check → generated docs.
# Docs clone hosts the scripts after the fetch/advance loop above.
DOCS="$BASE/ORISO-Docs"
EXPORT_JS="$DOCS/tools/understand-anything/ua-export-docs.mjs"
if [ -f "$EXPORT_JS" ]; then
  if node "$EXPORT_JS" \
      --graph "$DOCS/.understand-anything/oriso-super-graph.json" \
      --meta "$DOCS/.understand-anything/meta.json" \
      --out "$DOCS/.understand-anything/docs-export" \
      > /tmp/ua-docs-export.log 2>&1; then
    echo "OK docs-export"
  else
    echo "DOCS-EXPORT FAIL:"; tail -5 /tmp/ua-docs-export.log; FAIL=1
  fi

  if node "$DOCS/tools/evidence-decay-check.mjs" \
      --map "$DOCS/oriso-platform/dsfa-text/evidence-map.yaml" \
      --meta "$DOCS/.understand-anything/meta.json" \
      --repos-root "$BASE" \
      --out "$DOCS/.understand-anything/docs-export/evidence-status.json" \
      --fail-on-broken \
      > /tmp/ua-decay.log 2>&1; then
    echo "OK evidence-decay"
  else
    echo "EVIDENCE-DECAY FAIL:"; tail -8 /tmp/ua-decay.log; FAIL=1
  fi

  if node "$DOCS/tools/evidence-decay-check.mjs" \
      --map "$DOCS/tools/truth-chain/fixtures/evidence-map.yaml" \
      --repos-root "$DOCS/tools/truth-chain/fixtures/clones" \
      --expect-broken \
      --out "$DOCS/.understand-anything/docs-export/canary-status.json" \
      > /tmp/ua-canary.log 2>&1; then
    echo "OK evidence-canary"
  else
    echo "EVIDENCE-CANARY FAIL:"; tail -8 /tmp/ua-canary.log; FAIL=1
  fi

  if node "$DOCS/tools/understand-anything/ua-generate-docs-pages.mjs" \
      --repo "$DOCS" \
      --export "$DOCS/.understand-anything/docs-export/export.json" \
      --status "$DOCS/.understand-anything/docs-export/evidence-status.json" \
      > /tmp/ua-docs-pages.log 2>&1; then
    echo "OK docs-pages"
  else
    echo "DOCS-PAGES FAIL:"; tail -5 /tmp/ua-docs-pages.log; FAIL=1
  fi

  if [ -f "$DOCS/site/package.json" ]; then
    if ( cd "$DOCS/site" && pnpm build:root > /tmp/ua-docs-build.log 2>&1 ); then
      echo "OK docs-build"
    else
      echo "DOCS-BUILD FAIL:"; tail -8 /tmp/ua-docs-build.log; FAIL=1
    fi
  else
    echo "SKIP docs-build (no site/package.json on this branch)"
  fi
else
  echo "SKIP truth-chain (scripts not in ORISO-Docs clone yet)"
fi

echo "=== done $(date -Is) fail=$FAIL ==="
exit $FAIL
