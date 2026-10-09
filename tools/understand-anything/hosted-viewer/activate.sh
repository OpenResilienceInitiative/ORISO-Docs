#!/usr/bin/env bash
# Called only by the approved release consumer, inside activation.py's rollback boundary.
set -euo pipefail
printf 'installation\n' > "$RUNNER_TEMP/ua-activation-phase"
python3 tools/understand-anything/install.py --runtime-root "$UNDERSTAND_RUNTIME_ROOT"
python3 tools/understand-anything/hosted-viewer/consumer.py --generation "$RUNNER_TEMP/ua-artifact/generation" --source-root "$UNDERSTAND_SOURCE_ROOT"
node tools/understand-anything/hosted-viewer/production.mjs --install --artifact "$RUNNER_TEMP/ua-artifact/viewer" --destination "$UNDERSTAND_STATIC_ROOT" --current-link "$UNDERSTAND_STATIC_ROOT/current" --generation "$RUNNER_TEMP/ua-artifact/generation"
UA_STATIC_NODE_IMAGE=$(python3 -c 'import json;print(json.load(open("tools/understand-anything/toolchain.lock.json"))["nodeImage"])')
docker build --build-arg NODE_IMAGE="$UA_STATIC_NODE_IMAGE" -t "oriso-understand-static:$REVISION" -f tools/understand-anything/hosted-viewer/Dockerfile tools/understand-anything
python3 tools/understand-anything/hosted-viewer/configure-source-mounts.py --compose "$UNDERSTAND_COMPOSE_FILE" --source-root "$UNDERSTAND_SOURCE_ROOT/current" --runtime-root "$UNDERSTAND_RUNTIME_ROOT" --static-root "$UNDERSTAND_STATIC_ROOT" --bindings "$RUNNER_TEMP/ua-viewer-bindings.json" --manifest "$RUNNER_TEMP/ua-artifact/generation/manifest.json"
mapfile -t VIEWER_SERVICES < <(python3 -c 'import json,sys;print("\n".join(b["service"] for b in json.load(open(sys.argv[1]))))' "$RUNNER_TEMP/ua-viewer-bindings.json")
docker compose -f "$UNDERSTAND_COMPOSE_FILE" up -d --force-recreate "${VIEWER_SERVICES[@]}"
node tools/understand-anything/site/hub/publication.mjs --install --artifact "$RUNNER_TEMP/ua-artifact/hub" --destination "$UNDERSTAND_HUB_ROOT" --current-link "$UNDERSTAND_HUB_CURRENT" --origin https://understand.oriso.org --revision "$REVISION"
printf 'readback\n' > "$RUNNER_TEMP/ua-activation-phase"
node tools/understand-anything/site/hub/publication.mjs --readback --manifest "$RUNNER_TEMP/ua-artifact/hub/hub-manifest.json"
python3 tools/understand-anything/hosted-viewer/readback.py --source-root "$UNDERSTAND_SOURCE_ROOT" --bindings "$RUNNER_TEMP/ua-viewer-bindings.json"
printf 'complete\n' > "$RUNNER_TEMP/ua-activation-phase"
