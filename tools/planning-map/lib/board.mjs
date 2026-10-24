import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS_QUERY, META_QUERY } from "./queries.mjs";
import { validate } from "./schema.mjs";
import { evaluateItem } from "./watchers.mjs";
import { buildWork } from "./work.mjs";
import { parseSection } from "./job.mjs";
import { hasRefactoringLabel, parseMarker } from "./refactor-marker.mjs";

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
    if (!name) continue;
    const values = n.options ? n.options.map((o) => o.name) : [n.name ?? n.value ?? null];
    out[name.toLowerCase()] = values.filter((v) => v != null);
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
    gate: single("Gate"), // null until a project admin creates the field (gate-options.json)
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
  if (live.gate != null && ct.fields.gate) checkOptions("gate", "Gate"); // optional field: only once it exists
  if (ct.driftChecked.includes("readiness")) {
    if (!live.readiness) problems.push("Readiness: field not found on the live board");
    else if (live.readiness.dataType && live.readiness.dataType !== "NUMBER") problems.push(`Readiness: expected a NUMBER field, live is ${live.readiness.dataType}`);
  }
  if (strict) problems.push(...unpinned.splice(0).map((u) => `${u} (strict)`));
  return { ok: problems.length === 0, problems, unpinned };
}

export function buildBoard({ meta, items: rawItems, totalCount, title }, { syncedAt = new Date().toISOString(), owner, number, ct = contract, branchIndex = new Map() } = {}) {
  const privateRepos = new Set(ct.privateRepositories);
  const warnings = [];
  const items = [];
  const privateMap = new Map();
  const statusCounts = {};
  const releaseCounts = new Map();
  const findingCounts = {};
  let readinessMin = null;
  let readinessMax = null;
  // Not public, counted only: items GitHub redacts (no content or type REDACTED) and draft issues.
  const hidden = { redacted: { count: 0, byStatus: {} }, drafts: { count: 0, byStatus: {} } };
  const hide = (bucket, status) => { bucket.count++; bucket.byStatus[status ?? "(none)"] = (bucket.byStatus[status ?? "(none)"] ?? 0) + 1; };

  for (const raw of rawItems) {
    const status = raw.status?.name ?? null;
    const readiness = raw.readiness?.number ?? null;
    const c = raw.content;
    const repo = c?.repository?.nameWithOwner ?? null;
    const isPrivate = !!c?.repository?.isPrivate || (repo && privateRepos.has(repo));
    statusCounts[status ?? "(none)"] = (statusCounts[status ?? "(none)"] ?? 0) + 1;

    if (c == null || raw.type === "REDACTED" || !c.__typename) { hide(hidden.redacted, status); continue; }
    if (c.__typename === "DraftIssue" || raw.type === "DRAFT_ISSUE") { hide(hidden.drafts, status); continue; }
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
    if (readiness != null) {
      readinessMin = readinessMin == null ? readiness : Math.min(readinessMin, readiness);
      readinessMax = readinessMax == null ? readiness : Math.max(readinessMax, readiness);
    }
    const releases = f["platform release"] ?? [];
    if (releases.length > 1) warnings.push(`${releases.length} Platform release values (${releases.join(", ")}) on ${c?.url ?? raw.id}; expected one, using the first`);
    const item = {
      id: raw.id,
      contentType: c.__typename,
      repository: repo,
      number: c?.number ?? null,
      title: c?.title ?? "",
      url: c?.url ?? null,
      state: c?.state ?? null,
      updatedAt: c?.updatedAt ?? null,
      status,
      gate: raw.gate?.name ?? null,
      readiness,
      issueType: c?.issueType?.name ?? null,
      parent,
      priority: f.priority?.[0] ?? null,
      effort: f.effort?.[0] ?? null,
      platformRelease: releases[0] ?? null,
      // null = not known for this content type (the watcher then does not guess); [] = known to be unassigned.
      assignees: c.assignees ? (c.assignees.nodes ?? []).map((a) => a.login) : null,
    };
    if (c.__typename === "Issue") item.work = buildWork(c, repo, { branchIndex, isHidden: (r, flag) => !!flag || privateRepos.has(r) });
    if (c.__typename === "Issue" && typeof c.body === "string" && c.body.includes("oriso:job:")) {
      // ORISO-Docs#216. Only the parsed, validated section leaves this function; the description itself never does.
      const parsed = parseSection(c.body);
      if (parsed?.job) item.job = parsed.job;
      else if (parsed) warnings.push(`Job section on ${c.url ?? raw.id} ignored: ${parsed.problems.join("; ")}`);
    }
    // ORISO-Docs#222. The category is the label `refactoring`; only its scope (from the body marker) leaves this function.
    if (c.__typename === "Issue" && hasRefactoringLabel(c.labels?.nodes)) item.refactor = { scope: parseMarker(c.body) };
    item.findings = evaluateItem(item, { now: syncedAt });
    for (const f of item.findings) findingCounts[f.rule] = (findingCounts[f.rule] ?? 0) + 1;
    if (item.platformRelease) releaseCounts.set(item.platformRelease, (releaseCounts.get(item.platformRelease) ?? 0) + 1);
    items.push(item);
  }

  const live = liveOptions(meta);
  const privateCount = [...privateMap.values()].reduce((s, p) => s + p.count, 0) + hidden.redacted.count;
  if (totalCount != null && totalCount !== rawItems.length) warnings.push(`Project reports ${totalCount} items but ${rawItems.length} were fetched`);
  const releaseNames = live.platformRelease ?? [...releaseCounts.keys()];
  return {
    schemaVersion: SCHEMA_VERSION,
    syncedAt,
    source: { owner: owner ?? ct.project.owner, projectNumber: number ?? ct.project.number, title: title ?? ct.project.title },
    totals: { items: rawItems.length, public: items.length, private: privateCount, drafts: hidden.drafts.count },
    fieldOptions: {
      status: live.status ?? [],
      gate: live.gate ?? [],
      priority: live.priority ?? ct.fields.priority.options,
      effort: live.effort ?? ct.fields.effort.options,
      platformRelease: releaseNames,
    },
    statusCounts,
    findingCounts,
    readinessRange: { min: readinessMin, max: readinessMax },
    releases: releaseNames.map((name) => ({ name, count: releaseCounts.get(name) ?? 0 })),
    privateCounts: [...privateMap.values()].sort((a, b) => a.repository.localeCompare(b.repository)),
    hiddenCounts: hidden,
    items,
    warnings,
  };
}
