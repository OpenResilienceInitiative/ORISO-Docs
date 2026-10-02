#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkEvidenceMap } from "./truth-chain/lib/decay-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const mapPath = resolve(arg("--map", resolve(repoRoot, "oriso-platform/dsfa-text/evidence-map.yaml")));
const metaPath = resolve(arg("--meta", resolve(repoRoot, ".understand-anything/meta.json")));
const reposRoot = resolve(arg("--repos-root", resolve(repoRoot, "..")));
const outPath = resolve(arg("--out", resolve(repoRoot, ".understand-anything/docs-export/evidence-status.json")));
const expectBroken = process.argv.includes("--expect-broken");
const failOnBroken = process.argv.includes("--fail-on-broken");

if (!existsSync(mapPath)) {
  console.error(`evidence-decay-check: map not found: ${mapPath}`);
  process.exit(1);
}

let commits = {};
if (existsSync(metaPath)) {
  try {
    commits = JSON.parse(readFileSync(metaPath, "utf8")).repos || {};
  } catch {
    commits = {};
  }
}

const result = checkEvidenceMap({
  mapText: readFileSync(mapPath, "utf8"),
  reposRoot,
  commits,
  canary: expectBroken,
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

const { counts } = result;
console.log(
  `OK evidence-decay total=${counts.total} ok=${counts.ok} drifted=${counts.drifted} broken=${counts.broken} unverified=${counts.unverified} → ${outPath}`
);

if (expectBroken) {
  if (counts.broken < 1) {
    console.error("canary: expected at least one broken claim, found none");
    process.exit(1);
  }
  console.log("OK canary flagged broken");
  process.exit(0);
}

if (failOnBroken && counts.broken > 0) {
  process.exit(1);
}
