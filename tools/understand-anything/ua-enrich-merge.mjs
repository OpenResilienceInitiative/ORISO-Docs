#!/usr/bin/env node
// ua-enrich-merge.mjs — merge coarse LLM enrichment (concepts/flows) into a staging graph.
// Usage: node ua-enrich-merge.mjs <stagingDir> <enrichment.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  resolveReference,
  resolveHistoricalReference,
  assessClaim,
  applyNodeSummary,
} from "./lib/semantic-claims.mjs";
import { addOrderedFlows } from "./lib/semantic-flows.mjs";

const CORE =
  process.env.UA_CORE ??
  "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const [stagingDir, enrPath] = process.argv.slice(2);
const graphPath = `${stagingDir}/knowledge-graph.json`;
let graph = JSON.parse(readFileSync(graphPath, "utf8"));
const enr = JSON.parse(readFileSync(enrPath, "utf8"));

const byId = new Map(graph.nodes.map((n) => [n.id, n]));
const resolveRef = (ref) => resolveReference(ref, graph);

let addedNodes = 0,
  addedEdges = 0,
  unresolved = [];
function addSemanticNode(item, type, edgeLabel) {
  if (byId.has(item.id)) return;
  const claim = assessClaim(item.claim, graph);
  const node = {
    id: item.id,
    type,
    name: item.name,
    summary:
      claim.status === "source-current"
        ? item.summary
        : `[Dated orientation; ${claim.status}] ${item.summary}`,
    tags: [...(item.tags ?? []), "enriched"],
    complexity: "moderate",
    metadata: {
      enrichment: enr.meta?.generatedAt ?? null,
      generatedBy: enr.meta?.generatedBy ?? "legacy",
      semanticClaim: {
        ...claim,
        generatedAt: item.claim?.generatedAt ?? enr.meta?.generatedAt ?? null,
      },
    },
  };
  graph.nodes.push(node);
  byId.set(node.id, node);
  addedNodes++;
  for (const ref of item.related ?? []) {
    const rid = resolveHistoricalReference(ref, graph, {
      trusted: !!item.claim,
      owner: item.id,
    });
    if (!rid) {
      unresolved.push(`${item.id} -> ${ref}`);
      continue;
    }
    graph.edges.push({
      id: `edge:${item.id}:${rid}`,
      source: item.id,
      target: rid,
      type: "related",
      label: edgeLabel,
      weight: 0.7,
      direction: "forward",
    });
    addedEdges++;
  }
}
for (const co of enr.concepts ?? [])
  addSemanticNode(co, "concept", "relates to");
for (const fl of enr.flows ?? []) addSemanticNode(fl, "flow", "involves");

// Domain Concepts layer
const semIds = [...(enr.concepts ?? []), ...(enr.flows ?? [])]
  .map((x) => x.id)
  .filter((id) => byId.has(id));
if (semIds.length) {
  graph.layers ??= [];
  const existing = graph.layers.find((l) => l.name === "Domain Concepts");
  if (existing)
    existing.nodeIds = [...new Set([...(existing.nodeIds ?? []), ...semIds])];
  else
    graph.layers.push({
      id: "layer:domain-concepts",
      name: "Domain Concepts",
      description:
        "High-level domain concepts and flows (coarse enrichment pass).",
      nodeIds: semIds,
    });
}
// optional layer descriptions
for (const [name, desc] of Object.entries(enr.layerDescriptions ?? {})) {
  const l = (graph.layers ?? []).find((l) => l.name === name);
  if (l) l.description = desc;
}

// keep the architecture-first layer order after adding Domain Concepts
// (must match LAYER_ORDER in ua-generate.mjs)
const LAYER_ORDER = [
  "Domain Concepts",
  "API Endpoints",
  "API Layer",
  "Service Layer",
  "Data Layer",
  "Middleware Layer",
  "External Services",
  "Background Tasks",
  "UI Layer",
  "Core",
  "Utility Layer",
  "Configuration Layer",
  "Test Layer",
];
const layerRank = (n) => {
  const i = LAYER_ORDER.indexOf(n);
  return i === -1 ? LAYER_ORDER.length : i;
};
if (Array.isArray(graph.layers))
  graph.layers.sort((a, b) => layerRank(a.name) - layerRank(b.name));

// optional guided tour: enr.tour or sibling tour-<key>.json (enrich-<key>.json -> tour-<key>.json)
{
  let tourSteps = Array.isArray(enr.tour) ? enr.tour : null;
  if (!tourSteps) {
    const tourPath = enrPath.replace(/enrich-([^/]+)\.json$/, "tour-$1.json");
    if (tourPath !== enrPath) {
      try {
        tourSteps = JSON.parse(readFileSync(tourPath, "utf8")).tour ?? null;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        tourSteps = null;
      }
    }
  }
  if (Array.isArray(tourSteps) && tourSteps.length) {
    graph.metadata ??= {};
    graph.metadata.quarantinedTourRefs = [];
    const resolveTour = (ref) => {
      const id = resolveHistoricalReference(ref, graph, {
        owner: "historical tour",
      });
      if (!id)
        graph.metadata.quarantinedTourRefs.push({
          ref,
          reason: "Unresolved historical tour reference",
        });
      return id;
    };
    const cleaned = tourSteps
      .filter(st => typeof st?.description === "string" && st.description.trim())
      .map((st, i) => ({
        order: st.order ?? i + 1,
        title: st.title,
        description: `[Dated orientation; source review required] ${st.description}`,
        nodeIds: (st.nodeIds ?? []).map(resolveTour).filter(Boolean),
      }))
      .filter((st) => st.title && st.nodeIds.length);
    if (cleaned.length) {
      graph.tour = cleaned;
      console.error(`tour: ${cleaned.length} steps applied`);
    }
  }
}

// optional per-node prose: enr.nodeSummaries or sibling summaries-<key>.json
// shape: { "<nodeId>": { "summary": "...", "tags": ["..."] } }
{
  let ns =
    enr.nodeSummaries && typeof enr.nodeSummaries === "object"
      ? enr.nodeSummaries
      : null;
  if (!ns) {
    const nsPath = enrPath.replace(
      /enrich-([^/]+)\.json$/,
      "summaries-$1.json",
    );
    if (nsPath !== enrPath) {
      try {
        const raw = JSON.parse(readFileSync(nsPath, "utf8"));
        ns = raw.nodeSummaries ?? raw;
        if (raw.meta && !ns.meta) ns = { meta: raw.meta, ...ns };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        ns = null;
      }
    }
  }
  if (ns) {
    let applied = 0,
      retained = 0,
      missing = 0;
    for (const [id, val] of Object.entries(ns)) {
      if (id === "meta") continue;
      const n = byId.get(
        resolveHistoricalReference(id, graph, {
          trusted: !!val?.claim,
          owner: "node summary",
        }),
      );
      if (
        !n ||
        !val ||
        typeof val.summary !== "string" ||
        !val.summary.trim()
      ) {
        missing++;
        graph.metadata ??= {};
        (graph.metadata.unresolvedSemanticSummaries ??= []).push({
          id,
          reason: "Historical summary reference or prose missing; not applied",
        });
        continue;
      }
      const assessment = applyNodeSummary(n, val, graph, ns.meta);
      if (assessment.status === "source-current") applied++;
      else retained++;
    }
    console.error(
      `nodeSummaries: currentApplied=${applied} datedRetained=${retained} unresolved=${missing}`,
    );
  }
}

const orderedPath = enrPath.replace(/enrich-([^/]+)\.json$/, "flows-$1.json");
let ordered = enr.orderedFlows ?? [];
if (!ordered.length && orderedPath !== enrPath) {
  try {
    ordered = JSON.parse(readFileSync(orderedPath, "utf8")).orderedFlows ?? [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
const walkthroughs = addOrderedFlows(graph, ordered);
if (walkthroughs.nodes.length) {
  graph.layers ??= [];
  let layer = graph.layers.find((l) => l.name === "Domain Concepts");
  if (!layer) {
    layer = {
      id: "layer:domain-concepts",
      name: "Domain Concepts",
      description: "Source-reviewed walkthroughs and dated orientation",
      nodeIds: [],
    };
    graph.layers.unshift(layer);
  }
  layer.nodeIds = [
    ...new Set([...layer.nodeIds, ...walkthroughs.nodes.map((n) => n.id)]),
  ];
}
graph.metadata ??= {};
graph.metadata.semanticCoverage = {
  sourceCurrent: 0,
  stale: 0,
  unbound: 0,
  runtimeVerified: false,
};
for (const n of graph.nodes) {
  const state = n.metadata?.semanticClaim?.status;
  if (state)
    graph.metadata.semanticCoverage[
      state === "source-current" ? "sourceCurrent" : state
    ]++;
}
graph.relationCoverage ??= {};
for (const type of new Set([
  ...graph.edges.map((e) => e.type),
  "flow_step",
  "contains_flow",
  "tested_by",
  "on_error",
  "compensates",
])) {
  const emitted = graph.edges.filter((e) => e.type === type).length;
  const previous = graph.relationCoverage[type];
  const unresolvedCount =
    (previous?.unresolved ?? 0) + (type === "related" ? unresolved.length : 0);
  graph.relationCoverage[type] = {
    ...previous,
    emitted,
    unresolved: unresolvedCount,
    unsupported: previous?.unsupported ?? 0,
    status: unresolvedCount ? "partial" : (previous?.status ?? "complete"),
  };
}
graph.schemaVersion = "oriso.ua.graph/v1";
const v = c.validateGraph(graph);
if (!v.success || v.fatal || v.issues?.length)
  throw new Error(
    `Enriched graph validation failed: ${JSON.stringify(v.issues ?? v.fatal)}`,
  );
console.error(
  `validate: success=${v.success} issues=${(v.issues ?? []).length}${v.fatal ? " FATAL " + v.fatal : ""}`,
);
if (v.graph) graph = v.graph;
else if (v.data) graph = v.data;

writeFileSync(graphPath, JSON.stringify(graph, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      stagingDir,
      addedNodes,
      addedEdges,
      unresolvedRefs: unresolved,
      totalNodes: graph.nodes.length,
      totalEdges: graph.edges.length,
      layers: graph.layers?.length,
    },
    null,
    2,
  ),
);
