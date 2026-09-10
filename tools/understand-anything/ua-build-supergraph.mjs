#!/usr/bin/env node
// ua-build-supergraph.mjs — build the ORISO cross-repo super-graph from the
// per-repo Understand-Anything graphs. Replaces the lost one-off June builder;
// deterministic and committed so it cannot get lost again.
//
// v3 (2026-08-27): explicit microservice architecture — repos carry curated
// role descriptions, are grouped into architecture tiers (own layers), the
// per-repo layers are ordered architecture-first, and the tour walks the
// platform tier by tier before diving into per-repo domain concepts.
//
// Usage: node ua-build-supergraph.mjs [--install]
//   default: writes to /opt/oriso-understand/_rebuild/supergraph/knowledge-graph.json
//   --install: additionally backs up + installs into ORISO-Docs/.understand-anything/

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";

const CORE = process.env.UA_CORE ?? "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const BASE = process.env.UA_BASE ?? "/opt/oriso-understand";
const OUT = `${BASE}/_rebuild/supergraph`;
mkdirSync(OUT, { recursive: true });
const INSTALL = process.argv.includes("--install");

// The microservice map: repo -> architecture tier + curated one-line role.
// Order here IS the presentation order (tiers, then repos within a tier).
const REPO_INFO = [
  ["ORISO-Frontend", "User Interfaces", "User-facing counselling web app (React): registration, enquiries, sessions, chat, calls."],
  ["ORISO-Admin", "User Interfaces", "Admin panel (React/MUI): tenants, agencies, consultants, legal texts, statistics."],
  ["ORISO-UserService", "Backend Microservices", "Core backend (Java/Spring Boot): users, consultants, sessions, enquiries, messaging integration."],
  ["ORISO-AgencyService", "Backend Microservices", "Backend microservice (Java/Spring Boot): agencies, postcode ranges, agency admin."],
  ["ORISO-ConsultingTypeService", "Backend Microservices", "Backend microservice (Java/Spring Boot): consulting types, topics, application settings."],
  ["ORISO-TenantService", "Backend Microservices", "Backend microservice (Java/Spring Boot): tenants, theming, legal/privacy settings, feature flags."],
  ["ORISO-Keycloak", "Identity & Data", "Identity provider (Keycloak): realms, OIDC clients, 2FA, custom theme and realm config."],
  ["ORISO-Database", "Identity & Data", "Database schemas and baseline seed data (MariaDB/MongoDB)."],
  ["ORISO-ElementCall", "Communication & Media", "Video calls (Element Call fork) on the Matrix stack; widget and standalone modes."],
  ["ORISO-Livekit", "Communication & Media", "Media SFU backend (LiveKit) configuration serving the call stack."],
  ["ORISO-Helm", "Operations & Deployment", "Canonical Helm charts: deploys every service — ingress, Matrix stack, seeds, config."],
  ["ORISO-Kubernetes", "Operations & Deployment", "Legacy Kubernetes manifests (archived upstream; kept for analysis only)."],
  ["ORISO-Infra", "Operations & Deployment", "Infrastructure automation (Hetzner, k3s provisioning)."],
  ["ORISO-E2E", "Observability & Quality", "End-to-end Playwright quality gate across app and admin."],
  ["ORISO-HealthDashboard", "Observability & Quality", "Service health dashboard."],
  ["ORISO-SigNoz", "Observability & Quality", "Observability stack (SigNoz) configuration."],
  ["ORISO-Status", "Observability & Quality", "Public status page (repository archived on GitHub; graph is server-side only)."],
];
const REPOS = REPO_INFO.map(([r]) => r);
const TIERS = [...new Set(REPO_INFO.map(([, t]) => t))];
const infoOf = Object.fromEntries(REPO_INFO.map(([r, tier, desc]) => [r, { tier, desc }]));

// keyword -> owning repo, for deterministic cross-repo dependency inference
const SERVICE_KEYWORDS = [
  [/agency.?service|agencyadminservice/i, "ORISO-AgencyService"],
  [/consulting.?type.?service/i, "ORISO-ConsultingTypeService"],
  [/tenant.?service/i, "ORISO-TenantService"],
  [/user.?service|user.?admin.?service/i, "ORISO-UserService"],
  [/keycloak/i, "ORISO-Keycloak"],
  [/mariadb|mongodb/i, "ORISO-Database"],
  [/\bhelm\b/i, "ORISO-Helm"],
  [/playwright/i, "ORISO-E2E"],
  [/hetzner|\bk3s\b/i, "ORISO-Infra"],
  [/element.?call/i, "ORISO-ElementCall"],
  [/livekit/i, "ORISO-Livekit"],
  [/signoz/i, "ORISO-SigNoz"],
];

// architecture-first per-repo layer order (matches ua-generate.mjs / ua-enrich-merge.mjs)
const LAYER_ORDER = [
  "Domain Concepts", "API Endpoints", "API Layer", "Service Layer", "Data Layer",
  "Middleware Layer", "External Services", "Background Tasks", "UI Layer",
  "Core", "Utility Layer", "Configuration Layer", "Test Layer",
];
const layerRank = n => { const i = LAYER_ORDER.indexOf(n); return i === -1 ? LAYER_ORDER.length : i; };

const nodes = [], edges = [];
const mergeSources = [];

// Architecture layers: platform overview + one layer per tier
const archLayer = {
  id: "layer:microservice-architecture", name: "Microservice Architecture",
  description: "All ORISO repositories as one map: user interfaces, backend microservices, identity & data, communication, operations, observability. Edges between repositories are deterministic dependency inference.",
  nodeIds: [],
};
const tierLayers = TIERS.map((t, i) => ({
  id: `layer:tier-${i}`, name: `Architecture · ${t}`,
  description: `${t} — repositories of this tier and everything they contain.`,
  nodeIds: [],
}));
const tierLayerOf = Object.fromEntries(TIERS.map((t, i) => [t, tierLayers[i]]));

// evidence[srcRepo][dstRepo] = count of nodes referencing dst's service
const evidence = {};
const perRepoLayers = [];

for (const r of REPOS) {
  const gPath = `${BASE}/${r}/.understand-anything/knowledge-graph.json`;
  if (!existsSync(gPath)) { console.error(`SKIP ${r}: no graph`); continue; }
  const g = JSON.parse(readFileSync(gPath, "utf8"));
  let meta = {};
  try { meta = JSON.parse(readFileSync(`${BASE}/${r}/.understand-anything/meta.json`, "utf8")); } catch { }

  const info = infoOf[r];
  const repoNodeId = `repo:${r}`;
  const conceptCount = g.nodes.filter(n => n.type === "concept" || n.type === "flow").length;
  const endpointCount = g.nodes.filter(n => n.type === "endpoint").length;
  nodes.push({
    id: repoNodeId, type: "module", name: r,
    summary: `${info.desc} ${g.nodes.length} nodes, ${g.edges.length} edges` +
      (endpointCount ? `, ${endpointCount} API endpoints` : "") +
      (conceptCount ? `, ${conceptCount} domain concepts/flows` : "") +
      (meta.gitCommitHash ? `. Built from ${meta.gitCommitHash.slice(0, 8)}.` : "."),
    tags: ["repository", info.tier], complexity: "complex",
    metadata: { kind: "repo-root", tier: info.tier, gitCommitHash: meta.gitCommitHash ?? null, generator: meta.generator ?? null },
  });
  archLayer.nodeIds.push(repoNodeId);
  tierLayerOf[info.tier].nodeIds.push(repoNodeId);
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
  // per-repo layers, sorted architecture-first within the repo
  const sorted = [...(g.layers ?? [])].sort((a, b) => layerRank(a.name) - layerRank(b.name));
  for (const l of sorted) {
    perRepoLayers.push({ id: `${r}::${l.id ?? l.name}`, name: `${r} · ${l.name}`, description: l.description, nodeIds: (l.nodeIds ?? []).map(id => `${r}::${id}`) });
  }
}

// final layer order: platform map, tiers, then per-repo (repo order = REPO_INFO order)
const layers = [archLayer, ...tierLayers.filter(t => t.nodeIds.length), ...perRepoLayers];

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

// tour: platform map -> each tier -> each repo's domain concepts
const tour = [{
  order: 1, title: "ORISO Microservice Architecture",
  description: "The ORISO platform as a map of repositories. Dependency edges are aggregated deterministic inference (evidence count >= 2).",
  nodeIds: archLayer.nodeIds,
}];
let order = 2;
for (const t of tierLayers) {
  if (!t.nodeIds.length) continue;
  tour.push({ order: order++, title: t.name.replace("Architecture · ", ""), description: t.description, nodeIds: t.nodeIds });
}
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
    description: "Cross-repo super-graph merging the per-repo Understand-Anything graphs of the ORISO platform, organized as a microservice architecture map.",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: mergeSources.map(s => `${s.repo}@${(s.gitCommitHash ?? "?").slice(0, 8)}`).join(","),
  },
  nodes, edges, layers, tour,
  mergeMetadata: {
    mergedAt: new Date().toISOString(),
    generatedBy: "ua-build-supergraph.mjs v3 (deterministic, architecture tiers)",
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
  if (existsSync(`${live}/knowledge-graph.json`))
    copyFileSync(`${live}/knowledge-graph.json`, `${live}/knowledge-graph.json.bak-${ts}`);
  copyFileSync(`${OUT}/knowledge-graph.json`, `${live}/knowledge-graph.json`);
  copyFileSync(`${OUT}/knowledge-graph.json`, `${live}/oriso-super-graph.json`);
  writeFileSync(`${live}/oriso-super-graph-summary.md`,
    `# ORISO Super-Graph\n\nRebuilt ${new Date().toISOString()} by ua-build-supergraph.mjs v3 (deterministic, architecture tiers).\n\n` +
    TIERS.map(t => `## ${t}\n${REPO_INFO.filter(([, tier]) => tier === t).map(([r, , d]) => {
      const s = mergeSources.find(x => x.repo === r);
      return `- **${r}** — ${d}${s ? ` (${s.nodes} nodes / ${s.edges} edges @ ${(s.gitCommitHash ?? "?").slice(0, 8)})` : " (no graph)"}`;
    }).join("\n")}`).join("\n\n") +
    `\n\nCross-repo dependency edges: ${crossEdges} (keyword inference, evidence-count >= 2).\n`);
  writeFileSync(`${live}/meta.json`, JSON.stringify({
    lastAnalyzedAt: new Date().toISOString(),
    gitCommitHash: "supergraph",
    version: "1.0.0",
    analyzedNodes: graph.nodes.length,
    analyzedFiles: new Set(graph.nodes.map(n => n.filePath).filter(Boolean)).size,
    generator: "ua-build-supergraph.mjs v3 (deterministic cross-repo merge, architecture tiers)",
    repos: Object.fromEntries(mergeSources.map(s => [s.repo, (s.gitCommitHash ?? "?").slice(0, 9)])),
  }, null, 2) + "\n");
  console.log("INSTALLED into ORISO-Docs/.understand-anything/");
}
