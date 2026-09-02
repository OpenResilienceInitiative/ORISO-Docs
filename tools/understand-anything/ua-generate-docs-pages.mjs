#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderGeneratedPages, writeGeneratedPages } from "../truth-chain/lib/generate-pages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(arg("--repo", resolve(here, "../..")));
const exportPath = resolve(arg("--export", resolve(repoRoot, ".understand-anything/docs-export/export.json")));
const statusPath = resolve(arg("--status", resolve(repoRoot, ".understand-anything/docs-export/evidence-status.json")));
const canaryPath = resolve(arg("--canary", resolve(repoRoot, ".understand-anything/docs-export/canary-status.json")));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

if (!existsSync(exportPath)) {
  console.error(`ua-generate-docs-pages: export not found: ${exportPath}`);
  process.exit(1);
}

const exp = JSON.parse(readFileSync(exportPath, "utf8"));
const evidenceStatus = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, "utf8")) : {};
if (existsSync(canaryPath)) {
  const canary = JSON.parse(readFileSync(canaryPath, "utf8"));
  const finding = (canary.findings || []).find((f) => f.status === "broken");
  evidenceStatus.canary = finding
    ? { slug: finding.slug, status: finding.status }
    : { slug: null, status: "not-flagged" };
}
const files = renderGeneratedPages(exp, { evidenceStatus });
const { written, skipped } = writeGeneratedPages(repoRoot, files, {
  dryRun: process.argv.includes("--dry-run"),
});
console.log(`OK docs-pages written=${written.length} skipped=${skipped.length}`);
if (skipped.length) console.log("skipped (hand-written protect):", skipped.join(", "));
