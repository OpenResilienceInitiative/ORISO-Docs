import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

export const GENERATED_MARKER = "generated: true";

// A filename is never authority to overwrite an editorial document. Only
// explicit generated frontmatter inside the dedicated output tree is writable.
export function mayOverwrite(repoRelativePath, existingContent) {
 const norm=repoRelativePath.replaceAll("\\","/");
 if(!norm.startsWith("docs/generated/") || norm.split("/").includes("..")) return false;
 const frontmatter=existingContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
 return Boolean(frontmatter && /^generated: true\s*$/m.test(frontmatter));
}

export function renderGeneratedPages(exp, { evidenceStatus = null } = {}) {
  const files = new Map();
  const commits = exp.commits || {};
  const stamp = exp.generatedAt || "";
  const hashLine = Object.entries(commits)
    .map(([repo, sha]) => `\`${repo}@${sha || "unknown"}\``)
    .join(", ");

  files.set("docs/generated/architecture-tiers.md", architectureTiersPage(exp, hashLine, stamp));
  files.set("docs/generated/endpoint-inventory.md", endpointInventoryPage(exp, hashLine, stamp));
  files.set("docs/generated/repository-map.md", repositoryMapPage(exp, hashLine, stamp));
  files.set("docs/generated/backend-services.md", backendServicesPage(exp, hashLine, stamp));
  files.set("docs/generated/truth-chain-status.md", statusPage(exp, evidenceStatus, hashLine, stamp));
  files.set("docs/generated/super-graph-index.md", redirectStub("Super graph index", "architecture-tiers", stamp));
  files.set("docs/generated/super-graph-explorer.md", redirectStub("Super graph explorer", "architecture-tiers", stamp));
  files.set("docs/generated/super-graph-detailed.md", redirectStub("Super graph detailed", "architecture-tiers", stamp));
  files.set("docs/generated/understand-anything-inventory.md", redirectStub("Understand-Anything inventory", "truth-chain-status", stamp));
  files.set("docs/generated/graph-validation-report.md", validationPage(exp, stamp));

  for (const repo of exp.repos || []) {
    const md = repoPage(repo, exp, stamp);
    files.set(`docs/generated/repo-graphs/${repo.name}.md`, md);
  }

  if(exp.graphSource) {
    const source=exp.graphSource;
    const rows=source.sources.map(s=>`| ${s.repository} | \`${s.ref}\` | \`${s.sourceSHA}\` |`).join("\n");
    const block=`\n\n## Source generation provenance\n\nGeneration: \`${source.generationId}\`\n\nThese are the producer's declared source refs. A Dev or mixed Dev/main generation does not prove a released-main artifact, live deployment or legal approval.\n\n| Repository | Source ref | Source SHA |\n| --- | --- | --- |\n${rows}\n`;
    for(const [path,content] of files) files.set(path,content+block);
  }
  return files;
}

export function writeGeneratedPages(repoRoot, files, { dryRun = false } = {}) {
  const written = [];
  const skipped = [];
  for (const [rel, content] of files) {
    if (!rel.startsWith("docs/generated/") || rel.split("/").includes("..")) throw new Error(`Unapproved generated destination: ${rel}`);
    const abs = join(repoRoot, rel);
    const existing = existsSync(abs) ? readFileSync(abs, "utf8") : "";
    if (existing && !mayOverwrite(rel, existing)) {
      skipped.push(rel);
      continue;
    }
    if (!dryRun) {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
    written.push(rel);
  }
  return { written, skipped };
}

function frontmatter(title, description, stamp) {
  return `---
title: ${yamlEscape(title)}
description: ${yamlEscape(description)}
${GENERATED_MARKER}
generatedFrom: public-graph-export
generatedAt: ${stamp}
---
`;
}

function yamlEscape(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function banner() {
  return `> This page is **generated** from the Understand-Anything source export. Do not edit — changes will be overwritten. Editorial documentation is maintained separately and is never overwritten.
`;
}

function architectureTiersPage(exp, hashLine, stamp) {
  const rows = (exp.tiers || [])
    .map((t) => `| ${t.name} | ${(t.repos || []).join(", ") || "—"} | ${t.source || ""} |`)
    .join("\n");
  const deps = (exp.dependsOn || [])
    .slice(0, 40)
    .map((d) => `| ${d.from} | ${d.to} | ${d.weight} |`)
    .join("\n");
  return `${frontmatter("Architecture tiers", "Generated platform tiers and cross-repo depends_on.", stamp)}
${banner()}

# Architecture tiers

Last export: \`${stamp}\`

Commit tips: ${hashLine || "_(no meta.json commits — export used repo-node metadata)_"}

| Tier | Repositories | Source |
| --- | --- | --- |
${rows || "| — | — | — |"}

## Cross-repo \`depends_on\` (aggregated)

| From | To | Weight |
| --- | --- | --- |
${deps || "| — | — | — |"}

Live graphs: [understand.oriso.org](https://understand.oriso.org/).
`;
}

function endpointInventoryPage(exp, hashLine, stamp) {
  const byRepo = new Map();
  for (const e of exp.endpoints || []) {
    if (!byRepo.has(e.repo)) byRepo.set(e.repo, []);
    byRepo.get(e.repo).push(e);
  }
  const sections = [...byRepo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([repo, list]) => {
      const rows = list
        .slice()
        .sort((a, b) => (a.path || a.name || "").localeCompare(b.path || b.name || ""))
        .map((e) => `| ${e.method || "—"} | \`${e.path || e.name}\` |`)
        .join("\n");
      return `## ${repo} (${list.length})\n\n| Method | Path / operation |\n| --- | --- |\n${rows}\n`;
    })
    .join("\n");
  return `${frontmatter("Endpoint inventory", "Generated API endpoint inventory from the nightly graph.", stamp)}
${banner()}

# Endpoint inventory

${(exp.endpoints || []).length} endpoints. ${hashLine}

${sections || "_No endpoint nodes in this export._"}
`;
}

function repositoryMapPage(exp, hashLine, stamp) {
  const rows = (exp.repos || [])
    .map(
      (r) =>
        `| [${r.name}](repo-graphs/${r.name}.md) | ${r.tier} | \`${r.commit || "—"}\` | ${r.nodeCount ?? "—"} | ${r.endpointCount ?? 0} |`
    )
    .join("\n");
  return `${frontmatter("Repository map", "Generated repository table from the nightly graph.", stamp)}
${banner()}

# Repository map

${hashLine}

| Repository | Tier | Commit | Nodes | Endpoints |
| --- | --- | --- | --- | --- |
${rows}
`;
}

function backendServicesPage(exp, hashLine, stamp) {
  const backends = (exp.repos || []).filter((r) => /Service$/.test(r.name));
  const blocks = backends
    .map((r) => {
      const eps = (exp.endpoints || []).filter((e) => e.repo === r.name).length;
      const deps = (exp.dependsOn || []).filter((d) => d.from === r.name).map((d) => `${d.to} (${d.weight})`);
      return `## ${r.name}\n\n- Commit: \`${r.commit || "—"}\`\n- Nodes: ${r.nodeCount ?? "—"}\n- Endpoints: ${eps}\n- Depends on: ${deps.join(", ") || "—"}\n`;
    })
    .join("\n");
  return `${frontmatter("Backend services", "Generated backend service inventory from the nightly graph.", stamp)}
${banner()}

# Backend services

${hashLine}

${blocks}
`;
}

function statusPage(exp, evidenceStatus, hashLine, stamp) {
  const ev = evidenceStatus || {};
  const counts = ev.counts || {};
  const canary = ev.canary || null;
  return `${frontmatter("Truth chain status", "Nightly graph→docs→DPIA verification status.", stamp)}
${banner()}

# Truth chain status

| Field | Value |
| --- | --- |
| Export generated at | \`${stamp}\` |
| Graph analyzed at | \`${exp.analyzedAt || "—"}\` |
| Repos in export | ${(exp.repos || []).length} |
| Endpoints | ${(exp.endpoints || []).length} |
| Cross-repo depends_on pairs | ${(exp.dependsOn || []).length} |
| Evidence claims checked | ${counts.total ?? "not run"} |
| ok / drifted / broken / unverified | ${counts.ok ?? "—"} / ${counts.drifted ?? "—"} / ${counts.broken ?? "—"} / ${counts.unverified ?? "—"} |
| Canary (expected broken) | ${canary ? `${canary.status} (\`${canary.slug}\`)` : "not run"} |
| Evidence verified at | \`${ev.verifiedAt || "—"}\` |

Commit tips: ${hashLine || "—"}

DPIA chapter text is **not** auto-rewritten. Broken or drifted claims are flagged here and in \`.understand-anything/docs-export/evidence-status.json\` for human review.
`;
}

function validationPage(exp, stamp) {
  return `${frontmatter("Graph validation report", "Generated high-level graph counts from the nightly export.", stamp)}
${banner()}

# Graph validation report

- Nodes: ${exp.analyzedNodes ?? "—"}
- Edges: ${exp.analyzedEdges ?? "—"}
- Repos: ${(exp.repos || []).length}
- Endpoints: ${(exp.endpoints || []).length}
- Generated at: \`${stamp}\`
`;
}

function redirectStub(title, target, stamp) {
  return `${frontmatter(title, `Retired generated stub — see ${target}.`, stamp)}
${banner()}

# ${title}

This page was a stale hand-maintained graph dump. It is **retired** in favour of the generated page:

**[${target}](${target}.md)**
`;
}

function repoPage(repo, exp, stamp) {
  const eps = (exp.endpoints || []).filter((e) => e.repo === repo.name);
  const deps = (exp.dependsOn || []).filter((d) => d.from === repo.name);
  const incoming = (exp.dependsOn || []).filter((d) => d.to === repo.name);
  const epRows = eps
    .slice(0, 80)
    .map((e) => `| ${e.method || "—"} | \`${e.path || e.name}\` |`)
    .join("\n");
  return `${frontmatter(repo.name, `Generated graph summary for ${repo.name}.`, stamp)}
${banner()}

# ${repo.name}

| Field | Value |
| --- | --- |
| Commit | \`${repo.commit || "—"}\` |
| Tier | ${repo.tier} |
| Nodes | ${repo.nodeCount ?? "—"} |
| Endpoints | ${repo.endpointCount ?? eps.length} |
| Dashboard | [understand.oriso.org](https://understand.oriso.org/) |

${repo.summary ? `## Source evidence quotation (original language)\n\n> ${repo.summary.replaceAll("\n", "\n> ")}\n` : ""}

## Depends on

${deps.length ? deps.map((d) => `- ${d.to} (weight ${d.weight})`).join("\n") : "_None aggregated._"}

## Depended on by

${incoming.length ? incoming.map((d) => `- ${d.from} (weight ${d.weight})`).join("\n") : "_None aggregated._"}

## Endpoints${eps.length > 80 ? ` (first 80 of ${eps.length})` : ""}

${eps.length ? `| Method | Path / operation |\n| --- | --- |\n${epRows}` : "_No endpoint nodes._"}
`;
}

function fumadocsWrap(md, title) {
  if (md.includes("generated: true")) return md;
  return md.replace(/^---\n/, `---\ntitle: ${yamlEscape(title)}\n`);
}
