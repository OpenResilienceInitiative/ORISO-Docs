import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { createRunManifest, stampBoard, stampGraph, stampMapData, checkSameRun, assertSameRun, describeStand } from "../lib/run-manifest.mjs";
import { buildBoard, validateBoard, fetchAll } from "../lib/board.mjs";
import { fixtureRunner } from "../export-board.mjs";
import { buildMapData, loadInputs } from "../../understand-anything/site/hub/map/build-map-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SHA_A = "a".repeat(40), SHA_B = "b".repeat(40), SHA_C = "c".repeat(40);
const commits = { "ORISO-Frontend": SHA_A, "ORISO-Docs": SHA_B };
const at = "2026-10-23T01:00:00Z";
const inputs = loadInputs(new URL("../../understand-anything/site/hub/test/fixtures/map-inputs/", import.meta.url));
const graph = () => ({ kind: "oriso-super-graph", project: { name: "ORISO" }, nodes: [], edges: [] });
const board = async () => buildBoard(await fetchAll(fixtureRunner(resolve(here, "../fixtures/project-export.json")), { owner: "o", number: 1 }), { syncedAt: at });
const stampedSet = async (m) => ({ graph: stampGraph(graph(), m), board: stampBoard(await board(), m), mapData: stampMapData(buildMapData(inputs), m) });

test("manifest carries one run id, one timestamp and the commit per repo", () => {
  const m = createRunManifest({ at, commits, trigger: "schedule" });
  assert.equal(m.generatedAt, at);
  assert.equal(m.runId, "20261023T010000Z-" + m.runId.split("-")[1]);
  assert.match(m.runId, /^\d{8}T\d{6}Z-[0-9a-f]{8}$/);
  assert.deepEqual(m.commits, commits);
  assert.equal(createRunManifest({ at, commits }).runId, m.runId, "same inputs, same id");
  assert.notEqual(createRunManifest({ at, commits: { ...commits, "ORISO-Docs": SHA_C } }).runId, m.runId);
});

test("manifest rejects a missing timestamp, empty commit set or malformed commit id", () => {
  assert.throws(() => createRunManifest({ commits }), /at/);
  assert.throws(() => createRunManifest({ at, commits: {} }), /commit/);
  assert.throws(() => createRunManifest({ at, commits: { X: "main" } }), /40-character/);
});

test("all three outputs carry the same run id, timestamp and commits", async () => {
  const m = createRunManifest({ at, commits });
  const s = await stampedSet(m);
  assert.deepEqual(s.graph.project.run, m);
  assert.deepEqual(s.board.run, m);
  for (const doc of Object.values(s.mapData)) assert.deepEqual(doc.run, m);
  assert.deepEqual(checkSameRun(s), { ok: true, problems: [], run: m });
  assert.deepEqual(validateBoard(s.board), [], "stamped board still matches the schema");
});

test("combining outputs from different runs fails", async () => {
  const m1 = createRunManifest({ at, commits });
  const m2 = createRunManifest({ at: "2026-10-24T01:00:00Z", commits: { ...commits, "ORISO-Frontend": SHA_C } });
  const s = await stampedSet(m1);
  const mixed = { ...s, board: stampBoard(await board(), m2) };
  const r = checkSameRun(mixed);
  assert.equal(r.ok, false);
  assert.match(r.problems.join("\n"), /board.*20261024T010000Z/s);
  assert.throws(() => assertSameRun(mixed), /different runs/);
  const oneFile = { ...s, mapData: { ...s.mapData, "counts.json": stampMapData({ "counts.json": {} }, m2)["counts.json"] } };
  assert.throws(() => assertSameRun(oneFile), /counts\.json/);
});

test("an unstamped output fails the check", async () => {
  const m = createRunManifest({ at, commits });
  const s = await stampedSet(m);
  assert.throws(() => assertSameRun({ ...s, board: await0(s.board) }), /board.*no run/s);
  function await0(b) { const { run, ...rest } = b; return rest; }
});

test("same run id with a different commit set is still a mismatch", async () => {
  const m = createRunManifest({ at, commits });
  const s = await stampedSet(m);
  s.board.run = { ...m, commits: { ...m.commits, "ORISO-Docs": SHA_C } };
  assert.throws(() => assertSameRun(s), /commits/);
});

test("stand text is one timestamp and lists commits", () => {
  const m = createRunManifest({ at, commits });
  const d = describeStand([m, m]);
  assert.equal(d.consistent, true);
  assert.equal(d.stand, "2026-10-23 01:00 UTC");
  assert.deepEqual(d.commits, [["ORISO-Docs", SHA_B.slice(0, 7)], ["ORISO-Frontend", SHA_A.slice(0, 7)]]);
  const m2 = createRunManifest({ at: "2026-10-24T01:00:00Z", commits });
  assert.equal(describeStand([m, m2]).consistent, false);
});

test("CLI: create, stamp board in place, check passes and then fails on mixed files", async () => {
  const dir = mkdtempSync(join(tmpdir(), "run-"));
  const cli = resolve(here, "../run-manifest.mjs");
  const mf = join(dir, "run.json");
  execFileSync("node", [cli, "create", "--out", mf, "--at", at, "--commit", `ORISO-Frontend=${SHA_A}`, "--commit", `ORISO-Docs=${SHA_B}`]);
  const m = JSON.parse(readFileSync(mf, "utf8"));
  const bf = join(dir, "board.json"), gf = join(dir, "graph.json");
  writeFileSync(bf, JSON.stringify(await board()));
  writeFileSync(gf, JSON.stringify(graph()));
  execFileSync("node", [cli, "stamp", "board", bf, "--manifest", mf]);
  execFileSync("node", [cli, "stamp", "graph", gf, "--manifest", mf]);
  assert.deepEqual(JSON.parse(readFileSync(bf, "utf8")).run, m);
  execFileSync("node", [cli, "check", "--board", bf, "--graph", gf]);
  const mf2 = join(dir, "run2.json");
  execFileSync("node", [cli, "create", "--out", mf2, "--at", "2026-10-24T01:00:00Z", "--commit", `ORISO-Frontend=${SHA_C}`]);
  execFileSync("node", [cli, "stamp", "graph", gf, "--manifest", mf2]);
  const r = spawnSync("node", [cli, "check", "--board", bf, "--graph", gf], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /different runs/);
});
