#!/usr/bin/env node
// oriso-ua-generate.mjs v2 — deterministic Understand-Anything graph generator.
// Reconstruction of the lost June driver, built around the plugin core's public API.
// Deterministic base for the A-lite hybrid rebuild (LLM enrichment merged separately).
//
// Usage: node ua-generate.mjs <repoDir> <projectName> <outDir>

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createJavaExtractor, createProjectExtraction, attachSourceEvidence } from './lib/extraction.mjs';

const CORE = process.env.UA_CORE ?? "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const [repoDir, projectName, outDir] = process.argv.slice(2);
if (!repoDir || !projectName || !outDir) {
  console.error("Usage: node ua-generate.mjs <repoDir> <projectName> <outDir>");
  process.exit(64);
}
mkdirSync(outDir, { recursive: true });

const gitHash = execFileSync('git', ['-C', repoDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const allFiles = execFileSync('git', ['-C', repoDir, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);

// --- file filtering (self-ingestion guard + binaries/locks) ---
const SKIP_RE = /^(\.understand-anything\/|\.ua\/|\.git)/;
const BIN_RE = /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|pdf|zip|jar|gz|mp4|webm|DS_Store)$/i;
const LOCK_RE = /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|\.lock|\.backup.*|\.bak)$/i;
const MAX_BYTES = 512 * 1024;

// --- optional per-repo ignore file (predev addition, upstream has no such
// mechanism: it only filters via the hardcoded regexes above against
// `git ls-files`). Format: one glob pattern per line, `*` = any run of
// characters, `#`-prefixed / blank lines ignored. Patterns are matched
// against the full repo-relative path. Looked up at `<repoDir>/.understandignore`.
let ignoreMatchers = [];
try {
  const ignoreFile = `${repoDir}/.understandignore`;
  if (existsSync(ignoreFile)) {
    ignoreMatchers = readFileSync(ignoreFile, "utf8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(pat => new RegExp("^" + pat.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (pat.endsWith("/") ? "" : "(/.*)?$")));
  }
} catch (e) { console.error(".understandignore read ERR:", e.message); }
function isIgnored(f) { return ignoreMatchers.some(re => re.test(f)); }

const files = allFiles.filter(f => !/(^|\/)node_modules\//.test(f) && !SKIP_RE.test(f) && !BIN_RE.test(f) && !LOCK_RE.test(f) && !f.endsWith(".DS_Store") && !isIgnored(f));

// --- registry: tree-sitter for code + all non-code parsers ---
const registry = new c.PluginRegistry();
c.registerAllParsers(registry);
const ts = new c.TreeSitterPlugin(c.builtinLanguageConfigs);
ts.registerExtractor(createJavaExtractor(c.builtinExtractors.find(extractor => extractor.languageIds.includes('java'))));
await ts.init();
registry.register(ts);

const builder = new c.GraphBuilder(projectName, gitHash);
const extraction = createProjectExtraction({ repoDir, files });

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

// --- OpenAPI endpoint extraction (indentation-scanning, no YAML dependency) ---
// Handles OpenAPI 3 and Swagger 2 YAML: finds the top-level `paths:` block,
// records `/route:` keys and their HTTP-method children. Method-level nodes:
// the builder derives node ids from `path`, so method+route go in together.
const HTTP_METHODS = new Set(["get", "post", "put", "delete", "patch", "head", "options", "trace"]);
function extractOpenApiEndpoints(content) {
  if (!/^\s*(openapi|swagger)\s*:/m.test(content) || !/^paths\s*:/m.test(content)) return null;
  const out = [];
  const lines = content.split("\n");
  let inPaths = false, curRoute = null, routeIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const m = raw.match(/^( *)([^\s:#][^:]*):(\s|$)/);
    if (!m) continue;
    const indent = m[1].length;
    const key = m[2].trim().replace(/^["']|["']$/g, "");
    if (indent === 0) { inPaths = key === "paths"; curRoute = null; continue; }
    if (!inPaths) continue;
    if (key.startsWith("/")) { curRoute = key; routeIndent = indent; continue; }
    if (curRoute && indent > routeIndent && HTTP_METHODS.has(key.toLowerCase())) {
      // encode the method into `path` so each method gets its own node id
      out.push({ method: "", path: `${key.toUpperCase()} ${curRoute}`, lineRange: [i + 1, i + 1] });
    }
  }
  return out;
}
let openApiEndpointCount = 0;

let analyzed = 0, skipped = 0, codeCount = 0;
const codeFiles = [];

for (const f of files) {
  let content;
  try {
    content = readFileSync(`${repoDir}/${f}`, "utf8");
    if (Buffer.byteLength(content) > MAX_BYTES) { skipped++; continue; }
  } catch { skipped++; continue; }
  const lines = content.split("\n").length;
  let analysis = null;
  try { analysis = registry.analyzeFile(f, content); } catch (e) { throw new Error(`Source analysis failed for ${f}`, { cause: e }); }

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
    } catch (e) { throw new Error(`Graph construction failed for ${f}`, { cause: e }); }
    const calls = registry.extractCallGraph?.(f, content) ?? [];
    extraction.addFile(f, content, analysis, calls);
  } else if (analysis) {
    const nodeType = nonCodeNodeType(f);
    const secs = (analysis.sections ?? []).length;
    // The generic YAML parser claims OpenAPI specs but yields no endpoints —
    // extract them here so every service's REST surface becomes graph nodes.
    const oaEndpoints = /\.(ya?ml|json)$/i.test(f) ? extractOpenApiEndpoints(content) : null;
    if (oaEndpoints?.length) openApiEndpointCount += oaEndpoints.length;
    try {
      builder.addNonCodeFileWithAnalysis(f, {
        summary: oaEndpoints?.length
          ? `OpenAPI specification: ${oaEndpoints.length} endpoints (${lines} lines).`
          : `${nodeType} file${secs ? ` with ${secs} sections` : ""} (${lines} lines).`,
        tags: oaEndpoints?.length ? ["openapi", "api", topDir(f)] : [nodeType, topDir(f)],
        complexity: complexityFor(lines),
        nodeType,
        definitions: analysis.definitions, services: analysis.services,
        endpoints: (analysis.endpoints?.length ? analysis.endpoints : oaEndpoints) ?? undefined,
        steps: analysis.steps,
        resources: analysis.resources, sections: analysis.sections,
      });
      analyzed++;
    } catch (e) { console.error(`addNonCodeFile ERR ${f}: ${e.message}`); skipped++; }
  } else { skipped++; }
}

let graph = extraction.complete(builder.build());
const callEdges = graph.relationCoverage.calls.emitted;

// layers + heuristic tour
try { const layers = c.detectLayers(graph); if (Array.isArray(layers) && layers.length) graph.layers = layers; } catch (e) { console.error("detectLayers ERR:", e.message); }

// dedicated API Endpoints layer (extracted OpenAPI operations)
try {
  const epIds = (graph.nodes ?? []).filter(n => n.type === "endpoint").map(n => n.id);
  if (epIds.length) {
    graph.layers ??= [];
    graph.layers.push({
      id: "layer:api-endpoints", name: "API Endpoints",
      description: "REST operations extracted from the OpenAPI specification (method + route).",
      nodeIds: epIds,
    });
  }
} catch (e) { console.error("endpoint layer ERR:", e.message); }

// stable architecture-first layer order (readability; enrich-merge re-sorts after
// adding Domain Concepts, so keep LAYER_ORDER in sync with ua-enrich-merge.mjs)
const LAYER_ORDER = [
  "Domain Concepts", "API Endpoints", "API Layer", "Service Layer", "Data Layer",
  "Middleware Layer", "External Services", "Background Tasks", "UI Layer",
  "Core", "Utility Layer", "Configuration Layer", "Test Layer",
];
function layerRank(name) { const i = LAYER_ORDER.indexOf(name); return i === -1 ? LAYER_ORDER.length : i; }
if (Array.isArray(graph.layers)) graph.layers.sort((a, b) => layerRank(a.name) - layerRank(b.name));

try { const tour = c.generateHeuristicTour(graph); if (tour) graph.tour = tour; } catch (e) { console.error("tour ERR:", e.message); }

attachSourceEvidence(graph, repoDir);
graph.schemaVersion = 'oriso.ua.graph/v1';
// Validation may report harmless legacy defaults, but must never publish a graph
// after silently dropping source symbols or relations.
const validation = c.validateGraph(graph);
console.error(`validate: success=${validation.success} issues=${(validation.issues ?? []).length}${validation.fatal ? ' FATAL ' + validation.fatal : ''}`);
const sanitized = validation.graph ?? validation.data;
if (!validation.success || !sanitized || sanitized.nodes.length !== graph.nodes.length || sanitized.edges.length !== graph.edges.length || validation.issues?.some(issue => issue.level === 'dropped')) {
  throw new Error(`Graph validation rejected extraction: ${validation.fatal ?? JSON.stringify(validation.issues?.filter(issue => issue.level === 'dropped').slice(0, 5))}`);
}

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
  relationCoverage: graph.relationCoverage,
}, null, 2) + "\n");

const typeCounts = {};
for (const n of graph.nodes ?? []) typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
const edgeCounts = {};
for (const e of graph.edges ?? []) edgeCounts[e.type] = (edgeCounts[e.type] ?? 0) + 1;
console.log(JSON.stringify({
  project: projectName, gitHash: gitHash.slice(0, 8),
  filesConsidered: files.length, analyzed, skipped, codeCount, callEdges, openApiEndpoints: openApiEndpointCount,
  nodes: (graph.nodes ?? []).length, edges: (graph.edges ?? []).length,
  layers: (graph.layers ?? []).length,
  tourSteps: Array.isArray(graph.tour) ? graph.tour.length : graph.tour?.steps?.length ?? 0,
  nodeTypes: typeCounts, edgeTypes: edgeCounts,
}, null, 2));
