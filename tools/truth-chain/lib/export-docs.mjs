import { repoFromNodeId, tierForRepo, tiersFromLayers, DEFAULT_TIERS } from "./tiers.mjs";

const EXPORT_VERSION = 1;

/**
 * Build the small docs-export contract from a supergraph JSON object.
 * Does not retain node/edge arrays — only aggregates.
 */
export function buildDocsExport(graph, meta = {}, { generatedAt = new Date().toISOString() } = {}) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const layers = graph.layers || [];
  const repoNodes = nodes.filter((n) => typeof n.id === "string" && n.id.startsWith("repo:"));
  const tiers = tiersFromLayers(layers);

  const repos = repoNodes.map((n) => {
    const name = n.name || n.id.slice("repo:".length);
    const commit = commitFor(name, n, meta);
    return {
      name,
      commit,
      summary: n.summary || "",
      nodeCount: n.nodeCount ?? countPrefixed(nodes, name),
      edgeCount: n.edgeCount ?? null,
      endpointCount: nodes.filter((x) => x.type === "endpoint" && sourceRepo(x) === name).length,
      tier: tierForRepo(name, tiers.length ? mapTiers(tiers) : DEFAULT_TIERS),
    };
  });

  const endpoints = nodes
    .filter((n) => n.type === "endpoint")
    .map((n) => {
      const parsed = parseEndpointName(n.name || n.label || n.id);
      return {
        id: n.id,
        repo: sourceRepo(n),
        name: parsed.name,
        method: parsed.method,
        path: parsed.path,
      };
    });

  const dependsOn = aggregateDependsOn(edges);

  return {
    version: EXPORT_VERSION,
    generatedAt,
    generator: "ua-export-docs.mjs",
    graphKind: graph.kind || null,
    analyzedAt: meta.lastAnalyzedAt || graph.mergeMetadata?.generatedAt || null,
    analyzedNodes: meta.analyzedNodes || nodes.length,
    analyzedEdges: (graph.edges || []).length,
    commits: {
      ...(meta.repos || {}),
      ...Object.fromEntries(repos.map((r) => [r.name, r.commit]).filter(([, c]) => c)),
    },
    repos,
    endpoints,
    dependsOn,
    tiers: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      repos: t.repos,
      source: t.source || "unknown",
    })),
  };
}

function mapTiers(tiers) {
  return tiers.map((t) => ({ id: t.id, name: t.name, repos: t.repos || [] }));
}

function sourceRepo(node) {
  return node.sourceRepo || node.metadata?.sourceRepo || repoFromNodeId(node.id);
}

function commitFor(name, node, meta) {
  return (
    meta.repos?.[name] ||
    node.metadata?.gitCommitHash ||
    null
  );
}

function countPrefixed(nodes, repo) {
  const prefix = `${repo}::`;
  return nodes.filter((n) => n.id === `repo:${repo}` || (n.id && n.id.startsWith(prefix))).length;
}

function parseEndpointName(name) {
  const http = name.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)/i);
  if (http) return { method: http[1].toUpperCase(), path: http[2], name };
  const split = name.match(/^(\S+)\s+(\/\S.*)$/);
  if (split) return { method: null, path: split[2], name: split[1] };
  return { method: null, path: null, name };
}

/**
 * Cross-repo depends_on aggregated to repo pairs.
 * Prefers edges between repo: nodes; otherwise aggregates file-level edges.
 */
export function aggregateDependsOn(edges) {
  const counts = new Map();
  for (const e of edges || []) {
    if ((e.type || e.kind) !== "depends_on") continue;
    const from = repoFromNodeId(e.source || e.from);
    const to = repoFromNodeId(e.target || e.to);
    if (!from || !to || from === to) continue;
    const key = `${from}\t${to}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, weight]) => {
      const [from, to] = key.split("\t");
      return { from, to, weight };
    })
    .sort((a, b) => b.weight - a.weight || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}
