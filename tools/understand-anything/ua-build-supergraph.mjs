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
// Usage: UA_BASE=<staged inputs> node ua-build-supergraph.mjs --out <staged output>
// Output is explicit (--out or UA_SUPERGRAPH_OUT); publication belongs to bundle/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const CORE = process.env.UA_CORE ?? "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

const BASE = process.env.UA_BASE ?? "/opt/oriso-understand";
const outIndex = process.argv.indexOf("--out");
const OUT = outIndex >= 0 ? process.argv[outIndex + 1] : process.env.UA_SUPERGRAPH_OUT;
if (!OUT || process.argv.includes("--install")) throw new Error("Use --out <staged-directory>; publication belongs to ua-refresh");
mkdirSync(OUT, { recursive: true });

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
  ["ORISO-Docs", "Operations & Deployment", "Developer documentation site (Next.js) and Architecture Decision Records for the ORISO platform."],
];
const REPOS = process.env.UA_REPOSITORIES?.split(",") ?? REPO_INFO.map(([r]) => r);
if (REPOS.some(repo => !REPO_INFO.some(([name]) => name === repo))) throw new Error("Unknown source repository");
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
  if (!existsSync(gPath)) throw new Error(`Missing required graph: ${r}`);
  const g = JSON.parse(readFileSync(gPath, "utf8"));
  const meta = JSON.parse(readFileSync(`${BASE}/${r}/.understand-anything/meta.json`, "utf8"));
  if (!/^[a-f0-9]{40}$/.test(meta.gitCommitHash ?? "") || meta.gitCommitHash !== g.project.gitCommitHash)
    throw new Error(`Inconsistent full source SHA: ${r}`);

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
      if (target !== r && REPOS.includes(target) && re.test(hay)) {
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
  version: "1.0.0", kind: "oriso-super-graph", schemaVersion: "oriso.ua.graph/v1",
  project: {
    name: "ORISO",
    languages: [...allLanguages].sort(),
    frameworks: [],
    description: "Cross-repo super-graph merging the per-repo Understand-Anything graphs of the ORISO platform, organized as a microservice architecture map.",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: null,
    sourceCommits: Object.fromEntries(mergeSources.map(s => [s.repo, s.gitCommitHash])),
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
if (!v.success || v.issues?.length) throw new Error(`Supergraph validation failed: ${JSON.stringify(v.issues)} ${v.fatal ?? ""}`);

writeFileSync(`${OUT}/knowledge-graph.json`, JSON.stringify(graph) + "\n");
console.log(JSON.stringify({
  nodes: graph.nodes.length, edges: graph.edges.length, layers: graph.layers.length,
  tourSteps: tour.length, crossRepoEdges: crossEdges,
  evidence,
  sizeMB: (Buffer.byteLength(JSON.stringify(graph)) / 1e6).toFixed(1),
}, null, 2));

writeFileSync(`${OUT}/meta.json`, JSON.stringify({
  lastAnalyzedAt: graph.project.analyzedAt, gitCommitHash: null, version: graph.version,
  sourceCommits: graph.project.sourceCommits, generator: "ua-build-supergraph.mjs",
}, null, 2) + "\n");
