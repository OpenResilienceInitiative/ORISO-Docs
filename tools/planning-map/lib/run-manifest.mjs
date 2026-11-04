// Run manifest: one run id, one timestamp and the commit per repository, stamped
// into every output of the nightly run (super-graph, board.json, map data files).
// Integration point for the board sync workflow (#208): after export-board has
// written board.json, call `stampBoard(board, manifest)` or
// `node tools/planning-map/run-manifest.mjs stamp board <file> --manifest run.json`.
import { createHash } from "node:crypto";

export const MANIFEST_VERSION = 1;
const SHA = /^[0-9a-f]{40}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function createRunManifest({ at, commits, trigger } = {}) {
  if (!ISO.test(at ?? "")) throw new Error(`run manifest needs "at" as UTC ISO time (got ${at})`);
  const entries = Object.entries(commits ?? {});
  if (!entries.length) throw new Error("run manifest needs at least one repository commit");
  const sorted = {};
  for (const [repo, sha] of entries.sort(([a], [b]) => a.localeCompare(b))) {
    if (!SHA.test(sha)) throw new Error(`commit of ${repo} must be a 40-character lowercase hex id (got ${sha})`);
    sorted[repo] = sha;
  }
  const compact = at.replace(/\.\d+Z$/, "Z").replace(/[-:]/g, "");
  const digest = createHash("sha256").update(JSON.stringify([at, sorted])).digest("hex").slice(0, 8);
  const m = { schemaVersion: MANIFEST_VERSION, runId: `${compact}-${digest}`, generatedAt: at, commits: sorted };
  if (trigger) m.trigger = trigger;
  return m;
}

export const stampBoard = (board, manifest) => ({ ...board, run: manifest });
export function stampGraph(graph, manifest) {
  return { ...graph, project: { ...(graph.project ?? {}), run: manifest } };
}
export function stampMapData(files, manifest) {
  return Object.fromEntries(Object.entries(files).map(([name, doc]) => [name, { ...doc, run: manifest }]));
}

// { graph?, board?, mapData?: {file: doc} } -> every present output with its run (or null).
export function collectRuns({ graph, board, mapData } = {}) {
  const runs = [];
  if (graph) runs.push(["super-graph", graph.project?.run ?? null]);
  if (board) runs.push(["board.json", board.run ?? null]);
  for (const [name, doc] of Object.entries(mapData ?? {})) runs.push([`map data ${name}`, doc.run ?? null]);
  return runs;
}

export function checkSameRun(outputs) {
  const runs = collectRuns(outputs);
  const problems = [];
  const stamped = runs.filter(([name, r]) => { if (!r) problems.push(`${name} has no run manifest (unstamped)`); return r; });
  const [, first] = stamped[0] ?? [];
  for (const [name, r] of stamped.slice(1)) {
    if (r.runId !== first.runId) problems.push(`${name} is from run ${r.runId} (${r.generatedAt}), expected ${first.runId} (${first.generatedAt})`);
    else if (JSON.stringify(r.commits) !== JSON.stringify(first.commits) || r.generatedAt !== first.generatedAt) problems.push(`${name} has the same run id but different commits or timestamp`);
  }
  return { ok: !problems.length && stamped.length > 0, problems, run: problems.length ? null : first ?? null };
}

export function assertSameRun(outputs) {
  const r = checkSameRun(outputs);
  if (!r.ok) throw new Error(`outputs from different runs cannot be combined:\n- ${r.problems.join("\n- ") || "no outputs given"}`);
  return r.run;
}

// What the map shows: one "Stand" plus the commit list; consistent=false means warn.
export function describeStand(runs) {
  const valid = runs.filter(Boolean);
  const first = valid[0];
  const consistent = valid.length === runs.length && valid.length > 0 && valid.every((r) => r.runId === first.runId && r.generatedAt === first.generatedAt);
  const stand = first ? first.generatedAt.replace("T", " ").replace(/:\d{2}(\.\d+)?Z$/, " UTC") : null;
  const commits = first ? Object.entries(first.commits).map(([repo, sha]) => [repo, sha.slice(0, 7)]).sort(([a], [b]) => a.localeCompare(b)) : [];
  return { consistent, stand, commits };
}
