#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocsExport } from "../truth-chain/lib/export-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const graphPath = resolve(arg("--graph", resolve(repoRoot, ".understand-anything/oriso-super-graph.json")));
const metaPath = resolve(arg("--meta", resolve(repoRoot, ".understand-anything/meta.json")));
const outDir = resolve(arg("--out", resolve(repoRoot, ".understand-anything/docs-export")));

if (!existsSync(graphPath)) {
  console.error(`ua-export-docs: graph not found: ${graphPath}`);
  process.exit(1);
}

const graph = JSON.parse(readFileSync(graphPath, "utf8"));
let meta = {};
if (existsSync(metaPath)) meta = JSON.parse(readFileSync(metaPath, "utf8"));

const exp = buildDocsExport(graph, meta);
mkdirSync(outDir, { recursive: true });

const files = {
  "export.json": exp,
  "repos.json": { generatedAt: exp.generatedAt, commits: exp.commits, repos: exp.repos },
  "endpoints.json": { generatedAt: exp.generatedAt, endpoints: exp.endpoints },
  "depends-on.json": { generatedAt: exp.generatedAt, dependsOn: exp.dependsOn },
  "tiers.json": { generatedAt: exp.generatedAt, tiers: exp.tiers },
};

for (const [name, body] of Object.entries(files)) {
  writeFileSync(resolve(outDir, name), JSON.stringify(body, null, 2) + "\n");
}

const bytes = Object.keys(files).reduce((n, name) => n + JSON.stringify(files[name]).length, 0);
console.log(`OK docs-export ${outDir} files=${Object.keys(files).length} bytes≈${bytes} repos=${exp.repos.length} endpoints=${exp.endpoints.length}`);
