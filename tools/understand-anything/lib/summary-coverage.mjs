// summary-coverage.mjs — selection, schema, commit stamping and coverage report
// for bilingual (DE/EN) "Was ist das?" summaries. Pure functions, no model calls.
export const LANGS = ["de", "en"];
export const DEFAULTS = { topFilesPerCapability: 5, minFolderCoverage: 0.9 };
export const SCHEMA_VERSION = 1;

const SHA = /^[a-f0-9]{7,40}$/;

export const folderKey = (dir) => `folder:${dir}`;
export const dirOf = (filePath) => {
  const i = filePath.lastIndexOf("/");
  return i < 0 ? "." : filePath.slice(0, i);
};

// Every ancestor directory of every file node ("a/b/c.js" -> "a", "a/b"); root is ".".
export function listFolders(graph) {
  const out = new Set();
  for (const n of graph.nodes ?? []) {
    if (n.type !== "file" || !n.filePath) continue;
    const parts = dirOf(n.filePath).split("/");
    if (parts[0] === ".") { out.add("."); continue; }
    out.add(".");
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join("/"));
  }
  return [...out].sort();
}

function fileSize(n) {
  const lr = n.lineRange;
  if (Array.isArray(lr) && lr.length === 2) return lr[1] - lr[0] + 1;
  const m = /\((\d+) lines\)/.exec(n.summary ?? "");
  return m ? Number(m[1]) : 0;
}

// Top N files per capability (graph layer), ranked by edge count, then size, then id.
export function selectTopFiles(graph, { topFilesPerCapability = DEFAULTS.topFilesPerCapability } = {}) {
  const degree = new Map();
  for (const e of graph.edges ?? []) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const byId = new Map((graph.nodes ?? []).map((n) => [n.id, n]));
  const chosen = new Map(); // id -> capability name
  for (const layer of graph.layers ?? []) {
    const files = (layer.nodeIds ?? [])
      .map((id) => byId.get(id))
      .filter((n) => n && n.type === "file" && !chosen.has(n.id))
      .sort(
        (a, b) =>
          (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
          fileSize(b) - fileSize(a) ||
          (a.id < b.id ? -1 : 1),
      )
      .slice(0, topFilesPerCapability);
    for (const f of files) if (!chosen.has(f.id)) chosen.set(f.id, layer.name);
  }
  return [...chosen].map(([id, capability]) => ({ id, capability }));
}

export function selectTargets(graph, options = {}) {
  return {
    folders: listFolders(graph).map(folderKey),
    files: selectTopFiles(graph, options).map((f) => f.id),
  };
}

// "Repo@abc1234,Other@def5678" or a bare sha -> { Repo: sha } / { "": sha }
export function parseCommits(hash) {
  const out = {};
  for (const part of String(hash ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const [repo, sha] = part.includes("@") ? part.split("@") : ["", part];
    if (SHA.test(sha)) out[repo] = sha;
  }
  return out;
}

export function stampSummary(entry, commit, generatedAt) {
  if (!SHA.test(commit ?? "")) throw new Error(`stampSummary: invalid commit "${commit}"`);
  return { de: entry.de, en: entry.en, commit, generatedAt };
}

// Returns a list of problems; empty = valid.
export function validateSummaryFile(file) {
  const errs = [];
  if (!file || typeof file !== "object") return ["file must be an object"];
  if (file.schemaVersion !== SCHEMA_VERSION) errs.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (!file.meta?.generatedBy) errs.push("meta.generatedBy missing");
  const entries = file.summaries;
  if (!entries || typeof entries !== "object") return [...errs, "summaries must be an object"];
  for (const [id, e] of Object.entries(entries)) {
    for (const l of LANGS)
      if (typeof e?.[l] !== "string" || !e[l].trim()) errs.push(`${id}: ${l} summary missing`);
    if (!SHA.test(e?.commit ?? "")) errs.push(`${id}: commit missing or invalid`);
    if (!e?.generatedAt) errs.push(`${id}: generatedAt missing`);
  }
  return errs;
}

// A summary counts as covered only if both languages and a commit are present.
const covered = (e) => !!e && LANGS.every((l) => typeof e[l] === "string" && e[l].trim()) && SHA.test(e.commit ?? "");

export function coverageReport(targets, summaries = {}) {
  const part = (ids) => {
    const missing = ids.filter((id) => !covered(summaries[id]));
    return { total: ids.length, covered: ids.length - missing.length, missing, ratio: ids.length ? (ids.length - missing.length) / ids.length : 1 };
  };
  return { folders: part(targets.folders), files: part(targets.files) };
}

export function formatReport(report, { minFolderCoverage = DEFAULTS.minFolderCoverage, limit = 20 } = {}) {
  const pct = (r) => `${r.covered}/${r.total} (${(r.ratio * 100).toFixed(1)}%)`;
  const lines = [
    `summaries(de+en): folders ${pct(report.folders)}, top files ${pct(report.files)}`,
  ];
  for (const [label, r] of [["folder", report.folders], ["file", report.files]]) {
    for (const id of r.missing.slice(0, limit)) lines.push(`summaries MISSING ${label}: ${id}`);
    if (r.missing.length > limit) lines.push(`summaries MISSING ${label}: ... and ${r.missing.length - limit} more`);
  }
  if (report.folders.ratio < minFolderCoverage)
    lines.push(`summaries WARN: folder coverage below ${(minFolderCoverage * 100).toFixed(0)}% target`);
  return lines;
}

// Work list for whoever runs the model: only what is missing, with context to prompt from.
export function buildRequests(graph, targets, report, commits) {
  const byId = new Map((graph.nodes ?? []).map((n) => [n.id, n]));
  const commit = Object.values(commits)[0] ?? null;
  const reqs = [];
  for (const id of report.folders.missing) {
    const dir = id.slice("folder:".length);
    const files = (graph.nodes ?? []).filter((n) => n.type === "file" && n.filePath && (dir === "." || dir === dirOf(n.filePath) || dirOf(n.filePath).startsWith(dir + "/")));
    reqs.push({ id, kind: "folder", path: dir, commit, fileCount: files.length, sampleFiles: files.slice(0, 15).map((f) => f.filePath) });
  }
  for (const id of report.files.missing) {
    const n = byId.get(id);
    reqs.push({ id, kind: "file", path: n?.filePath ?? null, commit, structuralSummary: n?.summary ?? null });
  }
  return reqs;
}

// Ingest model answers ({id:{de,en}}) -> stamped summary file body.
export function ingestResponses(responses, commit, generatedAt, meta) {
  const summaries = {};
  for (const [id, r] of Object.entries(responses)) summaries[id] = stampSummary(r, commit, generatedAt);
  const file = { schemaVersion: SCHEMA_VERSION, meta: { ...meta, generatedAt }, summaries };
  const errs = validateSummaryFile(file);
  if (errs.length) throw new Error(`invalid summaries: ${errs.join("; ")}`);
  return file;
}
