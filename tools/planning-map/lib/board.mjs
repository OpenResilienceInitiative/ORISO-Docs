import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS_QUERY, META_QUERY } from "./queries.mjs";
import { validate } from "./schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_VERSION = 1;
export const contract = JSON.parse(readFileSync(resolve(here, "../board-contract.json"), "utf8"));
export const schema = JSON.parse(readFileSync(resolve(here, "../board.schema.json"), "utf8"));

export const validateBoard = (board) => validate(schema, board);

// run(query, variables) -> parsed GraphQL JSON ({data}); injected so tests use recorded fixtures.
export async function fetchAll(run, { owner, number }) {
  const meta = (await run(META_QUERY, { owner, number })).data.organization;
  const items = [];
  let after = null;
  let title = meta.projectV2.title;
  let totalCount = null;
  for (;;) {
    const conn = (await run(ITEMS_QUERY, { owner, number, after })).data.organization.projectV2;
    title = conn.title ?? title;
    totalCount = conn.items.totalCount;
    items.push(...conn.items.nodes);
    if (!conn.items.pageInfo.hasNextPage) break;
    after = conn.items.pageInfo.endCursor;
  }
  return { meta, items, totalCount, title };
}

function normalizeIssueFieldValues(nodes = []) {
  const out = {};
  for (const n of nodes) {
    const name = n?.field?.name;
    const value = n?.name ?? n?.value ?? null;
    if (name) out[name.toLowerCase()] = value;
  }
  return out;
}

// Live option lists, from the META_QUERY response.
export function liveOptions(meta) {
  const fields = meta.projectV2.fields.nodes;
  const single = (name) => fields.find((f) => f.name === name && f.options)?.options.map((o) => o.name) ?? null;
  const readiness = fields.find((f) => f.name === "Readiness");
  const issueFields = (meta.issueFields?.nodes ?? []).filter((f) => f.options);
  const issueOpts = (name) => issueFields.find((f) => f.name === name)?.options.map((o) => o.name) ?? null;
  return {
    status: single("Status"),
    readiness: readiness ? { dataType: readiness.dataType ?? null } : null,
    priority: issueOpts("Priority"),
    effort: issueOpts("Effort"),
    platformRelease: issueOpts("Platform release"),
  };
}

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Returns {ok, problems[], unpinned[]}. Option ORDER counts: it is the board's column order.
export function driftCheck(live, ct = contract, { strict = false } = {}) {
  const problems = [];
  const unpinned = [];
  const checkOptions = (key, label) => {
    const want = ct.fields[key].options;
    const got = live[key];
    if (got == null) return problems.push(`${label}: field not found on the live board`);
    if (want.length === 0) return unpinned.push(`${label}: contract has no pinned options yet; live = ${JSON.stringify(got)}`);
    if (same(want, got)) return;
    const missing = want.filter((o) => !got.includes(o));
    const added = got.filter((o) => !want.includes(o));
    const parts = [];
    if (missing.length) parts.push(`missing/renamed from live: ${missing.map((o) => JSON.stringify(o)).join(", ")}`);
    if (added.length) parts.push(`new in live: ${added.map((o) => JSON.stringify(o)).join(", ")}`);
    if (!parts.length) parts.push(`order changed: live = ${JSON.stringify(got)}`);
    problems.push(`${label} options drifted (${parts.join("; ")}). Update tools/planning-map/board-contract.json deliberately.`);
  };
  if (ct.driftChecked.includes("status")) checkOptions("status", "Status");
  if (ct.driftChecked.includes("platformRelease")) checkOptions("platformRelease", "Platform release");
  if (ct.driftChecked.includes("readiness")) {
    if (!live.readiness) problems.push("Readiness: field not found on the live board");
    else if (live.readiness.dataType && live.readiness.dataType !== "NUMBER") problems.push(`Readiness: expected a NUMBER field, live is ${live.readiness.dataType}`);
  }
  if (strict) problems.push(...unpinned.splice(0).map((u) => `${u} (strict)`));
  return { ok: problems.length === 0, problems, unpinned };
}

export function buildBoard({ meta, items: rawItems, totalCount, title }, { syncedAt = new Date().toISOString(), owner, number, ct = contract } = {}) {
  const privateRepos = new Set(ct.privateRepositories);
  const warnings = [];
  const items = [];
  const privateMap = new Map();
  const statusCounts = {};
  const releaseCounts = new Map();

  for (const raw of rawItems) {
    const status = raw.status?.name ?? null;
    const readiness = raw.readiness?.number ?? null;
    const c = raw.content;
    const repo = c?.repository?.nameWithOwner ?? null;
    const isPrivate = !!c?.repository?.isPrivate || (repo && privateRepos.has(repo));
    statusCounts[status ?? "(none)"] = (statusCounts[status ?? "(none)"] ?? 0) + 1;

    if (isPrivate) {
      const p = privateMap.get(repo) ?? { repository: repo, count: 0, byStatus: {} };
      p.count++;
      p.byStatus[status ?? "(none)"] = (p.byStatus[status ?? "(none)"] ?? 0) + 1;
      privateMap.set(repo, p);
      continue; // counts only: no id, title, url
    }

    const f = normalizeIssueFieldValues(c?.issueFieldValues?.nodes);
    const par = c?.parent;
    const parent = par && !par.repository?.isPrivate && !privateRepos.has(par.repository?.nameWithOwner)
      ? { repository: par.repository.nameWithOwner, number: par.number }
      : null;
    if (readiness != null && (readiness < ct.fields.readiness.min || readiness > ct.fields.readiness.max)) {
      warnings.push(`Readiness ${readiness} outside contract range ${ct.fields.readiness.min}-${ct.fields.readiness.max} on ${c?.url ?? raw.id} (kept as-is)`);
    }
    const item = {
      id: raw.id,
      contentType: c?.__typename ?? "DraftIssue",
      repository: repo,
      number: c?.number ?? null,
      title: c?.title ?? "",
      url: c?.url ?? null,
      state: c?.state ?? null,
      updatedAt: c?.updatedAt ?? null,
      status,
      readiness,
      issueType: c?.issueType?.name ?? null,
      parent,
      priority: f.priority ?? null,
      effort: f.effort ?? null,
      platformRelease: f["platform release"] ?? null,
    };
    if (item.platformRelease) releaseCounts.set(item.platformRelease, (releaseCounts.get(item.platformRelease) ?? 0) + 1);
    items.push(item);
  }

  const live = liveOptions(meta);
  const privateCount = [...privateMap.values()].reduce((s, p) => s + p.count, 0);
  if (totalCount != null && totalCount !== rawItems.length) warnings.push(`Project reports ${totalCount} items but ${rawItems.length} were fetched`);
  const releaseNames = live.platformRelease ?? [...releaseCounts.keys()];
  return {
    schemaVersion: SCHEMA_VERSION,
    syncedAt,
    source: { owner: owner ?? ct.project.owner, projectNumber: number ?? ct.project.number, title: title ?? ct.project.title },
    totals: { items: rawItems.length, public: items.length, private: privateCount },
    fieldOptions: {
      status: live.status ?? [],
      priority: live.priority ?? ct.fields.priority.options,
      effort: live.effort ?? ct.fields.effort.options,
      platformRelease: releaseNames,
    },
    statusCounts,
    releases: releaseNames.map((name) => ({ name, count: releaseCounts.get(name) ?? 0 })),
    privateCounts: [...privateMap.values()].sort((a, b) => a.repository.localeCompare(b.repository)),
    items,
    warnings,
  };
}
