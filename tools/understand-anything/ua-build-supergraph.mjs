#!/usr/bin/env node
// ua-build-supergraph.mjs — build the ORISO cross-repo super-graph from the
// per-repo Understand-Anything graphs. Replaces the lost one-off June builder;
// deterministic and committed so it cannot get lost again.
//
// Usage: node ua-build-supergraph.mjs [--install]
//   default: writes to /opt/oriso-understand/_rebuild/supergraph/knowledge-graph.json
//   --install: additionally backs up + installs into ORISO-Docs/.understand-anything/

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

const CORE = "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const BASE = "/opt/oriso-understand";
const OUT = `${BASE}/_rebuild/supergraph`;
mkdirSync(OUT, { recursive: true });
const INSTALL = process.argv.includes("--install");

const REPOS = [
  "ORISO-Frontend", "ORISO-Admin", "ORISO-UserService", "ORISO-AgencyService",
  "ORISO-ConsultingTypeService", "ORISO-TenantService", "ORISO-Database",
  "ORISO-Keycloak", "ORISO-Kubernetes",
];

// keyword -> owning repo, for deterministic cross-repo dependency inference
const SERVICE_KEYWORDS = [
  [/agency.?service|agencyadminservice/i, "ORISO-AgencyService"],
  [/consulting.?type.?service/i, "ORISO-ConsultingTypeService"],
  [/tenant.?service/i, "ORISO-TenantService"],
  [/user.?service|user.?admin.?service/i, "ORISO-UserService"],
  [/keycloak/i, "ORISO-Keycloak"],
  [/mariadb|mongodb/i, "ORISO-Database"],
];

const nodes = [], edges = [], layers = [];
const mergeSources = [];

// Repositories layer + repo nodes
const repoLayer = {
  id: "layer:repositories", name: "Repositories",
  description: "Top-level repository nodes included in this ORISO graph explorer.",
  nodeIds: [],
};

// evidence[srcRepo][dstRepo] = count of nodes referencing dst's service
const evidence = {};

for (const r of REPOS) {
  const gPath = `${BASE}/${r}/.understand-anything/knowledge-graph.json`;
  if (!existsSync(gPath)) { console.error(`SKIP ${r}: no graph`); continue; }
  const g = JSON.parse(readFileSync(gPath, "utf8"));
  let meta = {};
  try { meta = JSON.parse(readFileSync(`${BASE}/${r}/.understand-anything/meta.json`, "utf8")); } catch { }

  const repoNodeId = `repo:${r}`;
  const conceptCount = g.nodes.filter(n => n.type === "concept" || n.type === "flow").length;
  nodes.push({
    id: repoNodeId, type: "module", name: r,
    summary: `Repository ${r} — ${g.nodes.length} nodes, ${g.edges.length} edges` +
      (meta.gitCommitHash ? `, built from ${meta.gitCommitHash.slice(0, 8)}` : "") +
      (conceptCount ? `, ${conceptCount} domain concepts/flows` : "") + ".",
    tags: ["repository"], complexity: "complex",
    metadata: { kind: "repo-root", gitCommitHash: meta.gitCommitHash ?? null, generator: meta.generator ?? null },
  });
  repoLayer.nodeIds.push(repoNodeId);
  mergeSources.push({ repo: r, gitCommitHash: meta.gitCommitHash ?? null, nodes: g.nodes.length, edges: g.edges.length });

  for (const n of g.nodes) {
    nodes.push({ ...n, id: `${r}::${n.id}`, metadata: { ...(n.metadata ?? {}), sourceRepo: r } });
    // repo containment (mirrors the June super-graph's repo-node-containment edges)
    edges.push({
      source: repoNodeId, target: `${r}::${n.id}`, type: "contains", direction: "forward",
      description: `${r} contains graph node ${n.id}.`, weight: 0.25,
      sourceRepo: r, generatedBy: "repo-node-containment",
    });
    // cross-repo evidence scan (skip generic self-matches)
    const hay = `${n.filePath ?? ""} ${n.name ?? ""}`;
    for (const [re, target] of SERVICE_KEYWORDS) {
      if (target !== r && re.test(hay)) {
        evidence[r] ??= {}; evidence[r][target] = (evidence[r][target] ?? 0) + 1;
      }
    }
  }
  for (const e of g.edges) {
    edges.push({ ...e, id: e.id ? `${r}::${e.id}` : undefined, source: `${r}::${e.source}`, target: `${r}::${e.target}`, sourceRepo: r });
  }
  for (const l of g.layers ?? []) {
    layers.push({ id: `${r}::${l.id ?? l.name}`, name: `${r} · ${l.name}`, description: l.description, nodeIds: (l.nodeIds ?? []).map(id => `${r}::${id}`) });
  }
}
layers.unshift(repoLayer);

// aggregated deterministic cross-repo dependency edges
let crossEdges = 0;
for (const [src, targets] of Object.entries(evidence)) {
  for (const [dst, count] of Object.entries(targets)) {
    if (count < 2) continue; // require at least 2 referencing nodes to avoid noise
    edges.push({
      source: `repo:${src}`, target: `repo:${dst}`, type: "depends_on", direction: "forward",
      label: `references ${dst.replace("ORISO-", "")}`,
      description: `${src} references ${dst} in ${count} graph nodes (file paths / symbol names) — API clients, configs, or deploy manifests.`,
      weight: Math.min(1, 0.3 + count / 100), generatedBy: "cross-repo-keyword-inference", evidenceCount: count,
    });
    crossEdges++;
  }
}

// simple overview tour: repositories first, then each repo's domain concepts
const tour = [{
  order: 1, title: "ORISO Platform Overview",
  description: "The nine ORISO repositories and how they depend on each other (aggregated deterministic inference).",
  nodeIds: repoLayer.nodeIds,
}];
let order = 2;
for (const r of REPOS) {
  const concepts = nodes.filter(n => n.metadata?.sourceRepo === r && (n.type === "concept" || n.type === "flow")).map(n => n.id);
  if (concepts.length) tour.push({ order: order++, title: `${r} — Domain Concepts`, description: `High-level concepts and flows of ${r}.`, nodeIds: concepts });
}

// union of all source-repo languages for the project block
const allLanguages = new Set();
for (const r of REPOS) {
  try {
    const g = JSON.parse(readFileSync(`${BASE}/${r}/.understand-anything/knowledge-graph.json`, "utf8"));
    for (const l of g.project?.languages ?? []) allLanguages.add(l);
  } catch { }
}

let graph = {
  version: "1.0.0", kind: "oriso-super-graph",
  project: {
    name: "ORISO",
    languages: [...allLanguages].sort(),
    frameworks: [],
    description: "Cross-repo super-graph merging the per-repo Understand-Anything graphs of the ORISO platform.",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: mergeSources.map(s => `${s.repo}@${(s.gitCommitHash ?? "?").slice(0, 8)}`).join(","),
  },
  nodes, edges, layers, tour,
  mergeMetadata: {
    mergedAt: new Date().toISOString(),
    generatedBy: "ua-build-supergraph.mjs (deterministic, 2026-07)",
    sourceRepos: mergeSources, crossRepoEdges: crossEdges,
  },
};

const v = c.validateGraph(graph);
console.error(`validate: success=${v.success} issues=${(v.issues ?? []).length}${v.fatal ? " FATAL " + v.fatal : ""}`);
if (v.graph) { v.graph.mergeMetadata = graph.mergeMetadata; graph = v.graph; }

writeFileSync(`${OUT}/knowledge-graph.json`, JSON.stringify(graph) + "\n");
console.log(JSON.stringify({
  nodes: graph.nodes.length, edges: graph.edges.length, layers: graph.layers.length,
  tourSteps: tour.length, crossRepoEdges: crossEdges,
  evidence,
  sizeMB: (Buffer.byteLength(JSON.stringify(graph)) / 1e6).toFixed(1),
}, null, 2));

if (INSTALL) {
  const live = `${BASE}/ORISO-Docs/.understand-anything`;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  copyFileSync(`${live}/knowledge-graph.json`, `${live}/knowledge-graph.json.bak-prerebuild-${ts}`);
  copyFileSync(`${OUT}/knowledge-graph.json`, `${live}/knowledge-graph.json`);
  copyFileSync(`${OUT}/knowledge-graph.json`, `${live}/oriso-super-graph.json`);
  writeFileSync(`${live}/oriso-super-graph-summary.md`,
    `# ORISO Super-Graph\n\nRebuilt ${new Date().toISOString()} by ua-build-supergraph.mjs (deterministic).\n\n` +
    mergeSources.map(s => `- ${s.repo}: ${s.nodes} nodes / ${s.edges} edges @ ${(s.gitCommitHash ?? "?").slice(0, 8)}`).join("\n") +
    `\n\nCross-repo dependency edges: ${crossEdges} (keyword inference, evidence-count >= 2).\n`);
  console.log("INSTALLED into ORISO-Docs/.understand-anything/");
}
