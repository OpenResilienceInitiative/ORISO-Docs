#!/usr/bin/env python3
"""Preserve explicit release inputs before checking out their documentation SHA."""
import json
import os
import re
from pathlib import Path


def release_input(event_name, event):
    if event_name == "repository_dispatch":
        if event.get("action") != "platform-release-published":
            raise ValueError("Unexpected release dispatch type")
        lock = event.get("client_payload", {}).get("release_manifest")
    elif event_name == "workflow_dispatch":
        value = event.get("inputs", {}).get("release_manifest")
        if not isinstance(value, str) or not value.strip():
            raise ValueError("Manual publication requires a platform release manifest")
        lock = json.loads(value)
    else:
        raise ValueError("Publication requires an explicit platform release event")
    if not isinstance(lock, dict) or lock.get("schemaVersion") != "oriso.platform-release/v1":
        raise ValueError("Missing platform release manifest")
    revision = lock.get("documentationRevision")
    if not isinstance(revision, str) or not re.fullmatch(r"[a-f0-9]{40}", revision):
        raise ValueError("An exact documentation commit is required")
    return lock, revision


if __name__ == "__main__":
    try:
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        lock, revision = release_input(os.environ["GITHUB_EVENT_NAME"], event)
        destination = Path(os.environ["RUNNER_TEMP"]) / "platform-release.json"
        destination.write_text(json.dumps(lock, sort_keys=True, separators=(",", ":")) + "\n")
        with open(os.environ["GITHUB_OUTPUT"], "a") as output:
            output.write(f"documentation-revision={revision}\n")
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(f"Release input rejected: {error}")
