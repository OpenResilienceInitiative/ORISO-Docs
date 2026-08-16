#!/usr/bin/env bash
set -euo pipefail

BASE="/opt/oriso-understand"
TMP_BASE="/tmp/oriso-understand-dev-snapshots-ultralite"
LOG_PREFIX="[understand-ultralite]"

REPOS=(
  ORISO-Admin
  ORISO-AgencyService
  ORISO-ConsultingTypeService
  ORISO-Database
  ORISO-Docs
  ORISO-Frontend
  ORISO-Keycloak
  ORISO-Kubernetes
  ORISO-TenantService
  ORISO-UserService
)

mkdir -p "$TMP_BASE"

cd "$BASE"

for repo in "${REPOS[@]}"; do
  echo "$LOG_PREFIX === $repo ==="

  LOCAL_REPO="$BASE/$repo"
  SNAPSHOT="$TMP_BASE/$repo"

  BRANCH="dev"
  case "$repo" in
    ORISO-Docs|ORISO-Keycloak|ORISO-Database)
      BRANCH="main"
      ;;
  esac

  if [ ! -d "$LOCAL_REPO/.git" ]; then
    echo "$LOG_PREFIX skip: missing git repo $LOCAL_REPO"
    continue
  fi

  if [ ! -f "$LOCAL_REPO/.understand-anything/knowledge-graph.json" ]; then
    echo "$LOG_PREFIX skip: missing knowledge-graph.json for $repo"
    continue
  fi

  if ! REMOTE_URL="$(git -C "$LOCAL_REPO" remote get-url origin 2>/dev/null)"; then
    echo "$LOG_PREFIX skip: no origin remote for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  if ! LOCAL_HEAD="$(git -C "$LOCAL_REPO" rev-parse HEAD 2>/dev/null)"; then
    echo "$LOG_PREFIX skip: cannot read local HEAD for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  rm -rf "$SNAPSHOT"
  if ! git clone --branch "$BRANCH" "$REMOTE_URL" "$SNAPSHOT" >/dev/null 2>&1; then
    echo "$LOG_PREFIX skip: cannot clone $BRANCH branch for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  if ! DEV_HEAD="$(git -C "$SNAPSHOT" rev-parse HEAD 2>/dev/null)"; then
    echo "$LOG_PREFIX skip: cannot read dev HEAD for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  if ! git -C "$SNAPSHOT" cat-file -e "$LOCAL_HEAD^{commit}" 2>/dev/null; then
    echo "$LOG_PREFIX skip: local commit $LOCAL_HEAD is not present in dev history for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  # ua-cron-fix-2026-07-16: the overlay baseline is the commit the installed
  # graph describes (meta.json), not the clone HEAD - clones now advance nightly.
  META_HASH=$(node -e 'try{console.log(require(process.argv[1]).gitCommitHash||"")}catch(e){console.log("")}' "$LOCAL_REPO/.understand-anything/meta.json" 2>/dev/null || true)
  if [ -n "$META_HASH" ] && git -C "$SNAPSHOT" cat-file -e "$META_HASH^{commit}" 2>/dev/null; then
    LOCAL_HEAD="$META_HASH"
  fi

  echo "$LOG_PREFIX local=$LOCAL_HEAD"
  echo "$LOG_PREFIX dev=$DEV_HEAD"

  # ua-cron-fix-2026-07-16: advance the local clone so mounted file views stay
  # current; preserve .understand-anything (installed graphs are tracked-modified
  # files that a bare reset --hard would destroy).
  TMP_KEEP="/tmp/ua-keep-$repo"
  if rm -rf "$TMP_KEEP" && cp -a "$LOCAL_REPO/.understand-anything" "$TMP_KEEP" \
     && git -C "$LOCAL_REPO" fetch origin "$BRANCH" >/dev/null 2>&1 \
     && git -C "$LOCAL_REPO" reset --hard "origin/$BRANCH" >/dev/null 2>&1; then
    rm -rf "$LOCAL_REPO/.understand-anything"
    mv "$TMP_KEEP" "$LOCAL_REPO/.understand-anything"
    echo "$LOG_PREFIX advanced clone to origin/$BRANCH ($(git -C "$LOCAL_REPO" rev-parse --short HEAD))"
  else
    rm -rf "$TMP_KEEP"
    echo "$LOG_PREFIX clone advance failed (non-fatal)"
  fi

  if [ "$LOCAL_HEAD" = "$DEV_HEAD" ]; then
    echo "$LOG_PREFIX no dev changes for $repo"
    echo "$LOG_PREFIX tokens used for $repo: 0"
    continue
  fi

  mkdir -p "$LOCAL_REPO/.understand-anything"

  COMMITS_FILE="/tmp/${repo}-commits.txt"
  FILES_FILE="/tmp/${repo}-files.txt"
  STAT_FILE="/tmp/${repo}-stat.txt"

  git -C "$SNAPSHOT" log --oneline --max-count=30 "$LOCAL_HEAD..HEAD" > "$COMMITS_FILE" || true
  git -C "$SNAPSHOT" diff --name-only "$LOCAL_HEAD..HEAD" > "$FILES_FILE" || true
  git -C "$SNAPSHOT" diff --shortstat "$LOCAL_HEAD..HEAD" > "$STAT_FILE" || true

  LOCAL_REPO="$LOCAL_REPO" LOCAL_HEAD="$LOCAL_HEAD" DEV_HEAD="$DEV_HEAD" COMMITS_FILE="$COMMITS_FILE" FILES_FILE="$FILES_FILE" STAT_FILE="$STAT_FILE" node <<'NODE'
const fs = require("fs");

const repo = process.env.LOCAL_REPO;
const baseline = process.env.LOCAL_HEAD;
const head = process.env.DEV_HEAD;
const commitsFile = process.env.COMMITS_FILE;
const filesFile = process.env.FILES_FILE;
const statFile = process.env.STAT_FILE;

const files = fs.readFileSync(filesFile, "utf8").trim().split("\n").filter(Boolean);
const commits = fs.readFileSync(commitsFile, "utf8").trim().split("\n").filter(Boolean);
const statText = fs.readFileSync(statFile, "utf8").trim();

const flows = [];

if (files.some(f => f.includes("controller") || f.includes("/api/") || f.startsWith("api/"))) {
  flows.push("API/controller behavior likely changed");
}
if (files.some(f => f.includes("facade") || f.includes("service") || f.includes("Service"))) {
  flows.push("Service/facade flow likely changed");
}
if (files.some(f => f.includes("repository") || f.includes("Repository"))) {
  flows.push("Persistence/repository flow likely changed");
}
if (files.some(f => f.includes("db/changelog") || f.endsWith(".sql") || f.endsWith(".xml"))) {
  flows.push("Database/schema migration likely changed");
}
if (files.some(f => f.includes("test") || f.includes("Test"))) {
  flows.push("Test coverage changed");
}
if (files.some(f => f.includes("workflow") || f.includes("Workflow"))) {
  flows.push("Workflow behavior likely changed");
}
if (files.some(f => f.endsWith(".yaml") || f.endsWith(".yml") || f.endsWith(".properties") || f.endsWith(".json"))) {
  flows.push("Configuration/API contract likely changed");
}
if (files.some(f => f.toLowerCase().includes("matrix"))) {
  flows.push("Matrix integration likely changed");
}
if (files.some(f => f.toLowerCase().includes("tenant"))) {
  flows.push("Tenant/admin controls likely changed");
}
if (files.some(f => f.toLowerCase().includes("session") || f.toLowerCase().includes("conversation"))) {
  flows.push("Session/conversation flow likely changed");
}
if (files.some(f => f.includes("src/components") || f.endsWith(".tsx") || f.endsWith(".scss"))) {
  flows.push("Frontend UI flow likely changed");
}

const uniqueFlows = [...new Set(flows)];

const overlay = {
  baseline,
  head,
  summary: commits.length
    ? `Incremental update from ${baseline.slice(0, 8)} to ${head.slice(0, 8)} based on ${commits.length} commits and ${files.length} changed files.`
    : "No incremental changes detected.",
  commits,
  files,
  changedFlows: uniqueFlows,
  stat: {
    text: statText,
    filesChanged: files.length
  },
  generatedBy: "deterministic-ultralite-local-script"
};

fs.writeFileSync(`${repo}/.understand-anything/diff-overlay.json`, JSON.stringify(overlay, null, 2) + "\n");

fs.writeFileSync(`${repo}/.understand-anything/LATEST-CHANGES.md`,
`# Latest Changes

Baseline: \`${baseline}\`
Dev HEAD: \`${head}\`

## Summary

${overlay.summary}

## Commits

${commits.map(c => `- ${c}`).join("\n") || "- None"}

## Changed Files

${files.map(f => `- \`${f}\``).join("\n") || "- None"}

## Likely Changed Flows

${uniqueFlows.map(f => `- ${f}`).join("\n") || "- None"}

## Stat

${statText || "No diff stat."}
`);

fs.writeFileSync(`${repo}/.understand-anything/latest-dev-head.txt`, head + "\n");

console.log(JSON.stringify({
  commits: commits.length,
  files: files.length,
  flows: uniqueFlows.length
}, null, 2));
NODE

  echo "$LOG_PREFIX tokens used for $repo: 0"
  echo "$LOG_PREFIX generated local overlay for $repo"

  node "$BASE/merge-diff-overlay-into-graph.js" "$LOCAL_REPO"

  echo "$LOG_PREFIX merged overlay into knowledge-graph.json for $repo"
  git -C "$LOCAL_REPO" status --short .understand-anything | head -40 || true
done

cd "$BASE"
docker compose up -d --force-recreate

echo "$LOG_PREFIX done"
