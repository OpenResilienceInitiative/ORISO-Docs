import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../nightly-run.mjs");
const checkCli = resolve(here, "../run-manifest.mjs");
const mapInputs = resolve(here, "../../understand-anything/site/hub/test/fixtures/map-inputs");
const fixture = resolve(here, "../fixtures/project-export.json");
const SHA = (c) => c.repeat(40);
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

function workdir() {
  const dir = mkdtempSync(join(tmpdir(), "nightly-"));
  const graph = join(dir, "graph.json");
  writeFileSync(graph, JSON.stringify({ kind: "oriso-super-graph", project: { name: "ORISO", sourceCommits: { "ORISO-Frontend": SHA("a"), "ORISO-Admin": SHA("b") } }, nodes: [], edges: [] }));
  return { dir, graph, out: join(dir, "out") };
}
const run = (args) => spawnSync("node", [cli, ...args], { encoding: "utf8" });

test("one run stamps graph, board and map data identically and the check accepts the result", () => {
  const { graph, out } = workdir();
  const r = run(["--graph", graph, "--map-inputs", mapInputs, "--board-fixture", fixture, "--out", out, "--at", "2026-10-23T01:00:00Z", "--trigger", "schedule", "--commit", `ORISO-Docs=${SHA("d")}`]);
  assert.equal(r.status, 0, r.stderr);
  const manifest = read(join(out, "run.json"));
  assert.deepEqual(manifest.commits, { "ORISO-Admin": SHA("b"), "ORISO-Docs": SHA("d"), "ORISO-Frontend": SHA("a") });
  assert.equal(manifest.trigger, "schedule");
  assert.deepEqual(read(join(out, "oriso-super-graph.json")).project.run, manifest);
  assert.deepEqual(read(join(out, "map-data/board.json")).run, manifest);
  assert.deepEqual(read(join(out, "map-data/counts.json")).run, manifest);
  assert.deepEqual(read(join(out, "map-data/links.json")).optional, ["board.json"]);
  const c = spawnSync("node", [checkCli, "check", "--graph", join(out, "oriso-super-graph.json"), "--board", join(out, "map-data/board.json"), "--data-dir", join(out, "map-data")], { encoding: "utf8" });
  assert.equal(c.status, 0, c.stderr);
});

test("manual dispatch is the same script with another trigger", () => {
  const { graph, out } = workdir();
  const r = run(["--graph", graph, "--map-inputs", mapInputs, "--board-fixture", fixture, "--out", out, "--trigger", "workflow_dispatch"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(join(out, "run.json")).trigger, "workflow_dispatch");
});

test("a board file already stamped by another run is refused and nothing is written", () => {
  const { dir, graph, out } = workdir();
  const board = join(dir, "board.json");
  assert.equal(run(["--graph", graph, "--map-inputs", mapInputs, "--board-fixture", fixture, "--out", join(dir, "first"), "--at", "2026-10-22T01:00:00Z"]).status, 0);
  writeFileSync(board, readFileSync(join(dir, "first/map-data/board.json")));
  const r = run(["--graph", graph, "--map-inputs", mapInputs, "--board-file", board, "--out", out, "--at", "2026-10-23T01:00:00Z"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /already stamped by run/);
  assert.equal(existsSync(out), false);
});

test("a graph without source commits needs explicit commits", () => {
  const { dir, out } = workdir();
  const g = join(dir, "bare.json");
  writeFileSync(g, JSON.stringify({ project: {}, nodes: [], edges: [] }));
  const r = run(["--graph", g, "--map-inputs", mapInputs, "--board-fixture", fixture, "--out", out]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /commit/);
});
