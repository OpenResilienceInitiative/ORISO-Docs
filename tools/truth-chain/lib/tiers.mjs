/** Architecture tiers used when the supergraph has no "Architecture · …" layers (pre-#105 graphs). */
export const DEFAULT_TIERS = [
  {
    id: "user-interfaces",
    name: "User Interfaces",
    repos: ["ORISO-Frontend", "ORISO-Admin", "ORISO-ElementCall", "ORISO-Status", "ORISO-HealthDashboard"],
  },
  {
    id: "backend-microservices",
    name: "Backend Microservices",
    repos: ["ORISO-UserService", "ORISO-AgencyService", "ORISO-TenantService", "ORISO-ConsultingTypeService"],
  },
  {
    id: "identity-data",
    name: "Identity & Data",
    repos: ["ORISO-Keycloak", "ORISO-Database"],
  },
  {
    id: "communication-media",
    name: "Communication & Media",
    repos: ["ORISO-Livekit"],
  },
  {
    id: "operations-deployment",
    name: "Operations & Deployment",
    repos: ["ORISO-Helm", "ORISO-Kubernetes", "ORISO-Infra", "ORISO-Docs"],
  },
  {
    id: "observability-quality",
    name: "Observability & Quality",
    repos: ["ORISO-SigNoz", "ORISO-E2E"],
  },
];

export function tierForRepo(repo, tiers = DEFAULT_TIERS) {
  const hit = tiers.find((t) => t.repos.includes(repo));
  return hit ? hit.name : "Unassigned";
}

export function tiersFromLayers(layers = []) {
  const arch = layers.filter((l) => /^Architecture/i.test(l.name || l.label || ""));
  if (arch.length === 0) return DEFAULT_TIERS.map((t) => ({ ...t, source: "curated-default" }));
  return arch.map((l) => ({
    id: l.id || slug(l.name),
    name: l.name,
    repos: uniqueReposFromNodeIds(l.nodeIds || []),
    source: "supergraph-layer",
  }));
}

function uniqueReposFromNodeIds(ids) {
  const out = [];
  for (const id of ids) {
    const repo = repoFromNodeId(id);
    if (repo && !out.includes(repo)) out.push(repo);
  }
  return out;
}

export function repoFromNodeId(id = "") {
  if (id.startsWith("repo:")) return id.slice("repo:".length);
  const idx = id.indexOf("::");
  return idx > 0 ? id.slice(0, idx) : id;
}

function slug(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
