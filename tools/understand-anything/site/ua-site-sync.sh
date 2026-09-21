#!/usr/bin/env bash
# Install the current published graph generation on understand.oriso.org.
#
# The website builds nothing. GitHub Actions (ua-graph-refresh.yml) builds one
# generation a day from every public repository's `main` branch and publishes it
# on the ORISO-Docs release `ua-graph-latest`. This script, run once a day by
# cron on the website server, downloads that generation and swaps it in
# (ORISO-Docs#129). It replaces the old ua-nightly-full.sh, which rebuilt the
# graphs on the server itself from `dev` with an older pipeline.
#
# Per archive it:
#   1. checks the SHA-256 against the digest GitHub records for the asset,
#   2. unpacks into a staging directory and validates meta.json,
#   3. moves the repository clone the dashboard reads source files from to the
#      exact commit the graph was built from, so graph and file view agree,
#   4. replaces the graph files with a same-directory rename.
# Only after every archive has passed steps 1-2 is anything installed, so a
# broken download leaves yesterday's generation in place instead of a mix.
#
# It also reassembles the complete generation under $WWW/ua/ (current ->
# generations/<id>), the layout `ua-pull --via-https` reads: developer hooks and
# agents fetch the same generation the website shows, with no PreDev involved.
#
# Finally it writes status.json into the web root; the start page reads its
# date and counts from there instead of static text.
#
# Installed as /opt/oriso-understand/_site/ua-site-sync.sh, root crontab:
#   15 4 * * * /opt/oriso-understand/_site/ua-site-sync.sh >> /var/log/ua-site-sync.log 2>&1
#
# Usage:  ua-site-sync.sh                 # from the release
#         UA_SOURCE_DIR=/path ua-site-sync.sh   # from local archives (bootstrap/test)
set -euo pipefail

OWNER=${UA_OWNER:-OpenResilienceInitiative}
REPO=${UA_RELEASE_REPO:-ORISO-Docs}
TAG=${UA_RELEASE_TAG:-ua-graph-latest}
BASE=${UA_BASE:-/opt/oriso-understand}
WWW=${UA_WWW:-/var/www/understand}
SOURCE_DIR=${UA_SOURCE_DIR:-}
# Aggregates have no repository clone of their own.
AGGREGATES=" ORISO-Supergraph ORISO-Platform "
# Never installed, whatever the channel carries: private repositories.
PRIVATE=" ORISO-E2E ORISO-Infra "

exec 9>/tmp/ua-site-sync.lock
flock -n 9 || { echo "$(date -Is) another sync is running, exiting"; exit 0; }

echo "=== ua-site-sync $(date -Is) ==="
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/dl" "$work/stage"

sha256() { sha256sum "$1" | cut -d' ' -f1; }

# --- 1. Obtain the archives ----------------------------------------------------
if [ -n "$SOURCE_DIR" ]; then
  cp "$SOURCE_DIR"/*.tar.gz "$work/dl/"
  [ -f "$SOURCE_DIR/manifest.json" ] && cp "$SOURCE_DIR/manifest.json" "$work/dl/"
  echo "source: local directory $SOURCE_DIR"
else
  curl -fsSL --retry 3 --max-time 60 \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$OWNER/$REPO/releases/tags/$TAG" -o "$work/release.json"
  # name<TAB>url<TAB>digest for every .tar.gz asset
  python3 - "$work/release.json" > "$work/assets.tsv" <<'PY'
import json, sys
release = json.load(open(sys.argv[1]))
for asset in release.get("assets", []):
    if asset["name"].endswith(".tar.gz") or asset["name"] == "manifest.json":
        print("\t".join([asset["name"], asset["browser_download_url"], asset.get("digest") or ""]))
PY
  grep -q '\.tar\.gz' "$work/assets.tsv" || { echo "FAIL release $TAG has no archives"; exit 1; }
  while IFS=$'\t' read -r name url digest; do
    curl -fsSL --retry 3 --max-time 300 "$url" -o "$work/dl/$name"
    if [ -n "$digest" ]; then
      [ "sha256:$(sha256 "$work/dl/$name")" = "$digest" ] \
        || { echo "FAIL $name: digest does not match the release record"; exit 1; }
    else
      echo "WARN $name: release records no digest, integrity unchecked"
    fi
  done < "$work/assets.tsv"
  echo "source: release $OWNER/$REPO@$TAG ($(wc -l < "$work/assets.tsv") archives)"
fi

# --- 2. Unpack and validate everything before touching the live tree -----------
names=()
for archive in "$work"/dl/*.tar.gz; do
  name=$(basename "$archive" .tar.gz)
  case "$PRIVATE" in *" $name "*) echo "SKIP $name: private repository"; continue;; esac
  tar -xzf "$archive" -C "$work/stage"
  dir="$work/stage/$name/.understand-anything"
  for file in knowledge-graph.json meta.json; do
    [ -s "$dir/$file" ] || { echo "FAIL $name: $file missing"; exit 1; }
  done
  aggregate=0; case "$AGGREGATES" in *" $name "*) aggregate=1;; esac
  generation=$(python3 - "$dir/meta.json" "$aggregate" <<'PY'
import json, sys
m = json.load(open(sys.argv[1]))
if sys.argv[2] == "0":  # aggregates span many commits and carry none of their own
    assert isinstance(m.get("gitCommitHash"), str) and len(m["gitCommitHash"]) == 40, "commit"
assert m.get("lastAnalyzedAt"), "timestamp"
print(m.get("generationId") or "")
PY
  ) || { echo "FAIL $name: meta.json invalid"; exit 1; }
  # The release replaces its assets one by one; a sync during a publication
  # could otherwise pick up two generations at once.
  if [ -n "$generation" ]; then
    [ -z "${expected_generation:-}" ] && expected_generation=$generation
    [ "$generation" = "$expected_generation" ] \
      || { echo "FAIL $name: generation $generation, others $expected_generation - retry later"; exit 1; }
  fi
  names+=("$name")
done
[ ${#names[@]} -gt 0 ] || { echo "FAIL nothing to install"; exit 1; }

# --- 3./4. Install ---------------------------------------------------------------
fail=0
for name in "${names[@]}"; do
  src="$work/stage/$name/.understand-anything"
  commit=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["gitCommitHash"] or "")' "$src/meta.json")
  live="$BASE/$name"
  case "$AGGREGATES" in
    *" $name "*) mkdir -p "$live" ;;
    *)
      if [ ! -d "$live/.git" ]; then
        git clone -q --no-checkout "https://github.com/$OWNER/$name.git" "$live" \
          || { echo "FAIL $name: clone"; fail=1; continue; }
      fi
      # The graph describes exactly this commit; show exactly its files.
      git -C "$live" fetch -q origin "$commit" 2>/dev/null || git -C "$live" fetch -q origin main \
        || { echo "FAIL $name: fetch"; fail=1; continue; }
      git -C "$live" checkout -q -f --detach "$commit" \
        || { echo "FAIL $name: checkout $commit"; fail=1; continue; }
      ;;
  esac
  mkdir -p "$live/.understand-anything"
  for file in "$src"/*; do
    base=$(basename "$file")
    cp -r "$file" "$live/.understand-anything/.$base.new"
    rm -rf "$live/.understand-anything/$base.old"
    [ -e "$live/.understand-anything/$base" ] && mv "$live/.understand-anything/$base" "$live/.understand-anything/$base.old"
    mv "$live/.understand-anything/.$base.new" "$live/.understand-anything/$base"
    rm -rf "$live/.understand-anything/$base.old"
  done
  echo "OK $name ${commit:-aggregate}"
done

# --- 5a. Generation store for ua-pull ----------------------------------------------
if [ -f "$work/dl/manifest.json" ]; then
  gen=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["generationId"])' "$work/dl/manifest.json")
  case "$gen" in *[!A-Za-z0-9._-]*|"") echo "FAIL invalid generation id"; exit 1;; esac
  store="$WWW/ua"
  mkdir -p "$store/generations"
  if [ ! -d "$store/generations/$gen" ]; then
    tmpgen="$store/generations/.$gen.new"
    rm -rf "$tmpgen"; mkdir -p "$tmpgen"
    cp "$work/dl/manifest.json" "$tmpgen/manifest.json"
    for name in "${names[@]}"; do cp -R "$work/stage/$name" "$tmpgen/"; done
    # Every file the manifest promises must be present, or ua-pull would fail later.
    python3 - "$tmpgen" <<'PY' || { echo "FAIL generation $gen incomplete"; rm -rf "$tmpgen"; exit 1; }
import json, os, sys
root = sys.argv[1]
missing = [f["path"] for f in json.load(open(os.path.join(root, "manifest.json")))["files"]
           if not os.path.isfile(os.path.join(root, f["path"]))]
assert not missing, missing[:5]
PY
    mv "$tmpgen" "$store/generations/$gen"
  fi
  ln -sfn "generations/$gen" "$store/.current.new" && mv -T "$store/.current.new" "$store/current"
  # Keep today's and yesterday's generation; ua-pull --rollback needs one previous.
  ls -1t "$store/generations" | grep -v '^\.' | tail -n +3 | while read -r old; do rm -rf "$store/generations/$old"; done
  echo "OK ua-pull store $gen"
else
  echo "WARN no manifest.json on the channel: ua-pull store left unchanged"
fi

# --- 5. status.json for the start page --------------------------------------------
python3 - "$work/stage" "$WWW/status.json" "$work/dl/manifest.json" "${names[@]}" <<'PY'
import datetime, json, os, sys
stage, target, manifest_path, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
refs = {}
if os.path.isfile(manifest_path):
    for source in json.load(open(manifest_path)).get("sources", []):
        refs[source.get("repository")] = (source.get("ref") or "").removeprefix("refs/heads/")
sources, analyzed = [], []
for name in sorted(names):
    d = os.path.join(stage, name, ".understand-anything")
    meta = json.load(open(os.path.join(d, "meta.json")))
    graph = json.load(open(os.path.join(d, "knowledge-graph.json")))
    sources.append({
        "name": name,
        "branch": refs.get(name),
        "commit": meta["gitCommitHash"],
        "analyzedAt": meta["lastAnalyzedAt"],
        "nodes": len(graph.get("nodes", [])),
        "edges": len(graph.get("edges", [])),
    })
    analyzed.append(meta["lastAnalyzedAt"])
repos = [s for s in sources if s["name"] not in ("ORISO-Supergraph", "ORISO-Platform")]
branches = sorted({s["branch"] for s in repos if s["branch"]})
status = {
    # "main" when every repository was built from main; otherwise the honest mix.
    "branch": branches[0] if len(branches) == 1 else ",".join(branches) or None,
    "generatedAt": max(analyzed),
    "installedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "repositories": len(repos),
    "nodes": sum(s["nodes"] for s in repos),
    "sources": sources,
}
tmp = target + ".new"
with open(tmp, "w") as handle:
    json.dump(status, handle, indent=1)
os.replace(tmp, target)
print(f"status: {status['repositories']} repositories, {status['nodes']} nodes, built {status['generatedAt']}")
PY

# --- 6. Start page -------------------------------------------------------------------
# The hub pages live beside this script in ORISO-Docs, so they ship with the same
# `main` commit the ORISO-Docs graph was built from. Only the hub's own files are
# copied; legal pages, status.json and anything else in the web root stay.
hub="$BASE/ORISO-Docs/tools/understand-anything/site/hub"
if [ -f "$hub/index.html" ]; then
  cp -R "$hub/." "$WWW/"
  echo "OK hub from ORISO-Docs $(git -C "$BASE/ORISO-Docs" rev-parse --short HEAD)"
fi

# --- 7. Keep this script itself current -----------------------------------------
# Cron runs a copy under $BASE/_site/ (it has to exist before the first
# generation). After a successful run, adopt the version that ships with the
# ORISO-Docs `main` commit just installed, so the script stays reviewed code.
shipped="$BASE/ORISO-Docs/tools/understand-anything/site/ua-site-sync.sh"
self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
if [ "$fail" = 0 ] && [ -f "$shipped" ] && [ "$self" != "$shipped" ] && ! cmp -s "$shipped" "$self"; then
  bash -n "$shipped" && install -m 755 "$shipped" "$self.new" && mv "$self.new" "$self" \
    && echo "OK sync script updated from ORISO-Docs $(git -C "$BASE/ORISO-Docs" rev-parse --short HEAD)"
fi

echo "=== done $(date -Is) fail=$fail ==="
exit $fail
