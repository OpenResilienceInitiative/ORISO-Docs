#!/usr/bin/env node
// oriso-ua-generate.mjs v2 — deterministic Understand-Anything graph generator.
// Reconstruction of the lost June driver, built around the plugin core's public API.
// Deterministic base for the A-lite hybrid rebuild (LLM enrichment merged separately).
//
// Usage: node ua-generate.mjs <repoDir> <projectName> <outDir>

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const CORE = "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const [repoDir, projectName, outDir] = process.argv.slice(2);
if (!repoDir || !projectName || !outDir) {
  console.error("Usage: node ua-generate.mjs <repoDir> <projectName> <outDir>");
  process.exit(64);
}
mkdirSync(outDir, { recursive: true });

const gitHash = execSync(`git -C ${repoDir} rev-parse HEAD`, { encoding: "utf8" }).trim();
const allFiles = execSync(`git -C ${repoDir} ls-files`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);

// --- file filtering (self-ingestion guard + binaries/locks) ---
const SKIP_RE = /^(\.understand-anything\/|\.ua\/|\.git)/;
const BIN_RE = /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|pdf|zip|jar|gz|mp4|webm|DS_Store)$/i;
const LOCK_RE = /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.lock|\.backup.*|\.bak)$/i;
const MAX_BYTES = 512 * 1024;

const files = allFiles.filter(f => !SKIP_RE.test(f) && !BIN_RE.test(f) && !LOCK_RE.test(f) && !f.endsWith(".DS_Store"));

// --- registry: tree-sitter for code + all non-code parsers ---
const registry = new c.PluginRegistry();
c.registerAllParsers(registry);
const ts = new c.TreeSitterPlugin(c.builtinLanguageConfigs);
await ts.init();
registry.register(ts);

const builder = new c.GraphBuilder(projectName, gitHash);

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|java|py|go|rs|rb|php|c|cpp|cs)$/;
const NODE_TYPE_BY_EXT = [
  [/\.(ya?ml|json|toml|env|properties|conf|ini|xml)$/i, "config"],
  [/\.(md|markdown|txt|adoc)$/i, "document"],
  [/\.(sql)$/i, "schema"],
  [/\.(graphql|proto)$/i, "schema"],
  [/\.(tf)$/i, "resource"],
  [/(Dockerfile|Makefile|\.mk)$/i, "config"],
];
function nonCodeNodeType(f) {
  for (const [re, t] of NODE_TYPE_BY_EXT) if (re.test(f)) return t;
  return "file";
}
function complexityFor(lines) {
  return lines < 100 ? "simple" : lines < 400 ? "moderate" : "complex";
}
function topDir(f) {
  const i = f.indexOf("/");
  return i === -1 ? "root" : f.slice(0, i);
}

let analyzed = 0, skipped = 0, codeCount = 0;
const codeFiles = [];
const fileSet = new Set(files);
const exportIndex = new Map(); // exported symbol name -> file
const classIndex = new Map(); // class name -> file
// dotted-path index for package-style imports (Java etc.):
// src/main/java/com/vi/x/Foo.java -> "com.vi.x.Foo"
const dottedIndex = new Map();
for (const f of files) {
  const m = f.match(/^(?:src\/(?:main|test)\/java\/|src\/|lib\/)?(.+)\.(java|kt|ts|tsx|js|jsx|py|go)$/);
  if (m) dottedIndex.set(m[1].replace(/\//g, "."), f);
}
const pendingCalls = []; // [file, callerFn, calleeName]
const pendingImports = []; // [file, source]
let dumpedImportShape = false, dumpedCallShape = false;

for (const f of files) {
  let content;
  try {
    content = readFileSync(`${repoDir}/${f}`, "utf8");
    if (Buffer.byteLength(content) > MAX_BYTES) { skipped++; continue; }
  } catch { skipped++; continue; }
  const lines = content.split("\n").length;
  let analysis = null;
  try { analysis = registry.analyzeFile(f, content); } catch (e) { console.error(`analyze ERR ${f}: ${e.message}`); }

  if (CODE_RE.test(f) && analysis) {
    codeCount++; codeFiles.push(f);
    const lang = registry.getLanguageForFile?.(f) ?? "code";
    const fns = analysis.functions ?? [], cls = analysis.classes ?? [];
    const summaries = {};
    for (const fn of fns) summaries[fn.name] = `Function ${fn.name}(${(fn.params ?? []).join(", ")})`;
    for (const cl of cls) summaries[cl.name] = `Class ${cl.name}${cl.methods?.length ? ` with ${cl.methods.length} methods` : ""}`;
    const fileSummary = `${lang} source: ${fns.length} functions, ${cls.length} classes, ${(analysis.imports ?? []).length} imports.`;
    try {
      builder.addFileWithAnalysis(f, analysis, {
        summary: fileSummary, fileSummary, summaries,
        tags: [String(lang), topDir(f)],
        complexity: complexityFor(lines),
      });
      analyzed++;
    } catch (e) { console.error(`addFileWithAnalysis ERR ${f}: ${e.message}`); skipped++; continue; }
    for (const ex of analysis.exports ?? []) if (ex?.name) exportIndex.set(ex.name, f);
    for (const cl of cls) if (cl?.name) classIndex.set(cl.name, f);
    // import edges
    try {
      const imps = registry.resolveImports?.(f, content) ?? ts.resolveImports(f, content) ?? [];
      if (imps.length && !dumpedImportShape) { console.error("IMPORT SHAPE SAMPLE:", JSON.stringify(imps[0])); dumpedImportShape = true; }
      for (const im of imps) {
        const target = im.resolvedPath ?? im.resolved ?? im.targetFile ?? im.source ?? null;
        if (!target) continue;
        if (fileSet.has(target)) { builder.addImportEdge(f, target); continue; }
        // package-style import (Java etc.): com.vi.x.Foo -> src/main/java/com/vi/x/Foo.java
        const viaDotted = dottedIndex.get(target);
        if (viaDotted && viaDotted !== f) { builder.addImportEdge(f, viaDotted); continue; }
        // relative import without extension: try common resolutions
        if (target.startsWith(".")) {
          const base = target.replace(/^\.\//, f.includes("/") ? f.slice(0, f.lastIndexOf("/") + 1) : "");
          for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`, `${base}/index.js`]) {
            if (fileSet.has(cand)) { builder.addImportEdge(f, cand); break; }
          }
        }
      }
    } catch { /* best-effort */ }
    // call graph (resolved after all exports indexed)
    try {
      const calls = registry.extractCallGraph?.(f, content) ?? ts.extractCallGraph(f, content) ?? [];
      if (calls.length && !dumpedCallShape) { console.error("CALL SHAPE SAMPLE:", JSON.stringify(calls[0])); dumpedCallShape = true; }
      for (const call of calls) {
        const caller = call.caller ?? call.callerFunction ?? call.from ?? "";
        const callee = call.callee ?? call.calleeFunction ?? call.to ?? call.name ?? null;
        if (callee) pendingCalls.push([f, caller, callee]);
      }
    } catch { /* best-effort */ }
  } else if (analysis) {
    const nodeType = nonCodeNodeType(f);
    const secs = (analysis.sections ?? []).length;
    try {
      builder.addNonCodeFileWithAnalysis(f, {
        summary: `${nodeType} file${secs ? ` with ${secs} sections` : ""} (${lines} lines).`,
        tags: [nodeType, topDir(f)],
        complexity: complexityFor(lines),
        nodeType,
        definitions: analysis.definitions, services: analysis.services,
        endpoints: analysis.endpoints, steps: analysis.steps,
        resources: analysis.resources, sections: analysis.sections,
      });
      analyzed++;
    } catch (e) { console.error(`addNonCodeFile ERR ${f}: ${e.message}`); skipped++; }
  } else { skipped++; }
}

// resolve cross-file call edges via export/class indexes (best effort, dedup in builder)
let callEdges = 0;
for (const [f, caller, callee] of pendingCalls) {
  // "Foo.bar" style: resolve via class name prefix; plain names via exports/classes
  const dot = callee.indexOf(".");
  const head = dot === -1 ? callee : callee.slice(0, dot);
  const target = exportIndex.get(callee) ?? classIndex.get(callee) ?? classIndex.get(head) ?? exportIndex.get(head);
  if (target && target !== f) { try { builder.addCallEdge(f, caller || "?", target, callee); callEdges++; } catch { } }
}

let graph = builder.build();

// layers + heuristic tour
try { const layers = c.detectLayers(graph); if (Array.isArray(layers) && layers.length) graph.layers = layers; } catch (e) { console.error("detectLayers ERR:", e.message); }
try { const tour = c.generateHeuristicTour(graph); if (tour) graph.tour = tour; } catch (e) { console.error("tour ERR:", e.message); }

// validate / sanitize
try {
  const v = c.validateGraph(graph);
  console.error(`validate: success=${v.success} issues=${(v.issues ?? []).length}${v.fatal ? " FATAL " + v.fatal : ""}`);
  if (v.graph) graph = v.graph; else if (v.data) graph = v.data;
} catch (e) { console.error("validate ERR:", e.message); }

// fingerprints BEFORE meta (pipeline ordering guard)
try {
  const store = c.buildFingerprintStore(repoDir, codeFiles, registry, gitHash);
  writeFileSync(`${outDir}/fingerprints.json`, JSON.stringify(store, null, 2) + "\n");
} catch (e) { console.error("fingerprints ERR:", e.message); }

writeFileSync(`${outDir}/knowledge-graph.json`, JSON.stringify(graph, null, 2) + "\n");
writeFileSync(`${outDir}/meta.json`, JSON.stringify({
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash: gitHash,
  version: "1.0.0",
  analyzedFiles: analyzed,
  generator: "oriso-ua-generate.mjs v2 (deterministic A-lite base, rebuilt 2026-07)",
}, null, 2) + "\n");

const typeCounts = {};
for (const n of graph.nodes ?? []) typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
const edgeCounts = {};
for (const e of graph.edges ?? []) edgeCounts[e.type] = (edgeCounts[e.type] ?? 0) + 1;
console.log(JSON.stringify({
  project: projectName, gitHash: gitHash.slice(0, 8),
  filesConsidered: files.length, analyzed, skipped, codeCount, callEdges,
  nodes: (graph.nodes ?? []).length, edges: (graph.edges ?? []).length,
  layers: (graph.layers ?? []).length,
  tourSteps: Array.isArray(graph.tour) ? graph.tour.length : graph.tour?.steps?.length ?? 0,
  nodeTypes: typeCounts, edgeTypes: edgeCounts,
}, null, 2));
