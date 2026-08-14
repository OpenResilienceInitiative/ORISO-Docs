#!/usr/bin/env node
// ua-enrich-merge.mjs — merge coarse LLM enrichment (concepts/flows) into a staging graph.
// Usage: node ua-enrich-merge.mjs <stagingDir> <enrichment.json>
import { readFileSync, writeFileSync } from "node:fs";

const CORE = process.env.UA_CORE ?? "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const [stagingDir, enrPath] = process.argv.slice(2);
const graphPath = `${stagingDir}/knowledge-graph.json`;
let graph = JSON.parse(readFileSync(graphPath, "utf8"));
const enr = JSON.parse(readFileSync(enrPath, "utf8"));

const byId = new Map(graph.nodes.map(n => [n.id, n]));
function resolveRef(ref) {
  if (byId.has(ref)) return ref;
  const byPath = graph.nodes.find(n => n.filePath && (n.filePath === ref || n.filePath.endsWith(`/${ref}`)));
  if (byPath) return byPath.id;
  const byName = graph.nodes.find(n => n.name === ref);
  return byName?.id ?? null;
}

let addedNodes = 0, addedEdges = 0, unresolved = [];
function addSemanticNode(item, type, edgeLabel) {
  if (byId.has(item.id)) return;
  const node = {
    id: item.id, type, name: item.name,
    summary: item.summary,
    tags: [...(item.tags ?? []), "enriched"],
    complexity: "moderate",
    metadata: { enrichment: "a-lite-2026-07", generatedBy: "claude-operator-coarse-pass" },
  };
  graph.nodes.push(node); byId.set(node.id, node); addedNodes++;
  for (const ref of item.related ?? []) {
    const rid = resolveRef(ref);
    if (!rid) { unresolved.push(`${item.id} -> ${ref}`); continue; }
    graph.edges.push({
      id: `edge:${item.id}:${rid}`, source: item.id, target: rid,
      type: "related", label: edgeLabel, weight: 0.7, direction: "forward",
    });
    addedEdges++;
  }
}
for (const co of enr.concepts ?? []) addSemanticNode(co, "concept", "relates to");
for (const fl of enr.flows ?? []) addSemanticNode(fl, "flow", "involves");

// Domain Concepts layer
const semIds = [...(enr.concepts ?? []), ...(enr.flows ?? [])].map(x => x.id).filter(id => byId.has(id));
if (semIds.length) {
  graph.layers ??= [];
  const existing = graph.layers.find(l => l.name === "Domain Concepts");
  if (existing) existing.nodeIds = [...new Set([...(existing.nodeIds ?? []), ...semIds])];
  else graph.layers.push({ id: "layer:domain-concepts", name: "Domain Concepts", description: "High-level domain concepts and flows (coarse enrichment pass).", nodeIds: semIds });
}
// optional layer descriptions
for (const [name, desc] of Object.entries(enr.layerDescriptions ?? {})) {
  const l = (graph.layers ?? []).find(l => l.name === name);
  if (l) l.description = desc;
}

const v = c.validateGraph(graph);
console.error(`validate: success=${v.success} issues=${(v.issues ?? []).length}${v.fatal ? " FATAL " + v.fatal : ""}`);
if (v.graph) graph = v.graph; else if (v.data) graph = v.data;

writeFileSync(graphPath, JSON.stringify(graph, null, 2) + "\n");
console.log(JSON.stringify({
  stagingDir, addedNodes, addedEdges, unresolvedRefs: unresolved,
  totalNodes: graph.nodes.length, totalEdges: graph.edges.length, layers: graph.layers?.length,
}, null, 2));
