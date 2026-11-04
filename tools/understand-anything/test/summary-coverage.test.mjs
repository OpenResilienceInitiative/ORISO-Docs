import test from "node:test";
import assert from "node:assert/strict";
import {
  listFolders, selectTopFiles, selectTargets, parseCommits, stampSummary,
  validateSummaryFile, coverageReport, formatReport, buildRequests, ingestResponses,
} from "../lib/summary-coverage.mjs";

const f = (path, lines) => ({ id: `file:${path}`, type: "file", filePath: path, summary: `file (${lines} lines).` });
const graph = {
  nodes: [f("src/a/One.java", 10), f("src/a/Two.java", 300), f("src/b/c/Three.java", 50), f("README.md", 5), f("src/a/Four.java", 20)],
  edges: [
    { source: "file:src/a/One.java", target: "file:src/a/Two.java" },
    { source: "file:src/a/One.java", target: "file:src/b/c/Three.java" },
    { source: "file:src/a/Four.java", target: "file:src/a/Two.java" },
  ],
  layers: [
    { name: "API", nodeIds: ["file:src/a/One.java", "file:src/a/Two.java", "file:src/a/Four.java", "file:README.md"] },
    { name: "Core", nodeIds: ["file:src/b/c/Three.java", "file:src/a/Two.java"] },
  ],
};

test("folders include every ancestor and the root", () => {
  assert.deepEqual(listFolders(graph), [".", "src", "src/a", "src/b", "src/b/c"]);
});

test("top files per capability ranked by edges, then size", () => {
  const top = selectTopFiles(graph, { topFilesPerCapability: 2 });
  // API: Two (2 edges, 300 lines) and One (2 edges, 10 lines) beat Four (1 edge)
  assert.deepEqual(top.filter((t) => t.capability === "API").map((t) => t.id), ["file:src/a/Two.java", "file:src/a/One.java"]);
  // Core: Three; Two already chosen under API so it is not duplicated
  assert.deepEqual(top.filter((t) => t.capability === "Core").map((t) => t.id), ["file:src/b/c/Three.java"]);
});

test("targets combine folders and files", () => {
  const t = selectTargets(graph, { topFilesPerCapability: 1 });
  assert.equal(t.folders.length, 5);
  assert.deepEqual(t.files, ["file:src/a/Two.java", "file:src/b/c/Three.java"]);
});

test("commit parsing handles multi-repo and bare shas", () => {
  assert.deepEqual(parseCommits("A@41e53197,B@9fdb4a7e"), { A: "41e53197", B: "9fdb4a7e" });
  assert.deepEqual(parseCommits("deadbeef1"), { "": "deadbeef1" });
  assert.deepEqual(parseCommits("A@nothex"), {});
});

test("stamping requires a valid commit", () => {
  assert.deepEqual(stampSummary({ de: "d", en: "e" }, "abc1234", "t"), { de: "d", en: "e", commit: "abc1234", generatedAt: "t" });
  assert.throws(() => stampSummary({ de: "d", en: "e" }, "", "t"));
});

test("schema rejects missing language or commit", () => {
  const ok = { schemaVersion: 1, meta: { generatedBy: "m" }, summaries: { "folder:src": { de: "a", en: "b", commit: "abc1234", generatedAt: "t" } } };
  assert.deepEqual(validateSummaryFile(ok), []);
  const bad = { ...ok, summaries: { x: { de: "a", en: " ", generatedAt: "t" } } };
  const errs = validateSummaryFile(bad);
  assert.ok(errs.some((e) => e.includes("en summary missing")));
  assert.ok(errs.some((e) => e.includes("commit")));
});

test("coverage counts only complete DE+EN+commit entries and reports missing", () => {
  const targets = { folders: ["folder:.", "folder:src"], files: ["file:x"] };
  const summaries = {
    "folder:.": { de: "a", en: "b", commit: "abc1234" },
    "folder:src": { de: "a", commit: "abc1234" },
  };
  const r = coverageReport(targets, summaries);
  assert.equal(r.folders.covered, 1);
  assert.deepEqual(r.folders.missing, ["folder:src"]);
  const lines = formatReport(r);
  assert.equal(lines[0], "summaries(de+en): folders 1/2 (50.0%), top files 0/1 (0.0%)");
  assert.ok(lines.includes("summaries MISSING folder: folder:src"));
  assert.ok(lines.includes("summaries MISSING file: file:x"));
  assert.ok(lines.some((l) => l.includes("WARN")));
});

test("full coverage emits no MISSING or WARN lines", () => {
  const e = { de: "a", en: "b", commit: "abc1234" };
  const lines = formatReport(coverageReport({ folders: ["folder:."], files: [] }, { "folder:.": e }));
  assert.equal(lines.length, 1);
});

test("request list covers only what is missing, with the commit", () => {
  const targets = selectTargets(graph, { topFilesPerCapability: 1 });
  const report = coverageReport(targets, {});
  const reqs = buildRequests(graph, targets, report, { "": "abc1234" });
  assert.equal(reqs.length, 7);
  const src = reqs.find((r) => r.id === "folder:src/a");
  assert.equal(src.fileCount, 3);
  assert.equal(src.commit, "abc1234");
});

test("ingest stamps every answer and validates", () => {
  const file = ingestResponses({ "folder:src": { de: "Quelltext", en: "Source" } }, "abc1234", "2026-10-22T00:00:00Z", { generatedBy: "m" });
  assert.equal(file.summaries["folder:src"].commit, "abc1234");
  assert.throws(() => ingestResponses({ "folder:src": { de: "x" } }, "abc1234", "t", { generatedBy: "m" }));
});

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync as wf, readFileSync as rf } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("CLI: report lists missing, ingest stamps, report then passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "sumcov-"));
  const g = { ...graph, project: { gitCommitHash: "abc1234" } };
  wf(join(dir, "g.json"), JSON.stringify(g));
  const cli = new URL("../ua-summary-coverage.mjs", import.meta.url).pathname;
  const r1 = spawnSync("node", [cli, "report", "--graph", join(dir, "g.json"), "--requests", join(dir, "req.json")], { encoding: "utf8" });
  assert.match(r1.stderr, /summaries MISSING folder: folder:src\/a/);
  const reqs = JSON.parse(rf(join(dir, "req.json"), "utf8"));
  const answers = Object.fromEntries(reqs.map((q) => [q.id, { de: "de", en: "en" }]));
  wf(join(dir, "ans.json"), JSON.stringify(answers));
  const noModel = spawnSync("node", [cli, "ingest", "--responses", join(dir, "ans.json"), "--commit", "abc1234", "--out", join(dir, "s.json")], { encoding: "utf8", env: { ...process.env, UA_SUMMARY_MODEL: "" } });
  assert.equal(noModel.status, 2);
  execFileSync("node", [cli, "ingest", "--responses", join(dir, "ans.json"), "--commit", "abc1234", "--out", join(dir, "s.json")], { env: { ...process.env, UA_SUMMARY_MODEL: "fixture" }, stdio: "pipe" });
  const r2 = spawnSync("node", [cli, "report", "--graph", join(dir, "g.json"), "--summaries", join(dir, "s.json")], { encoding: "utf8" });
  assert.doesNotMatch(r2.stderr, /MISSING|WARN/);
  assert.match(r2.stderr, /folders 5\/5 \(100\.0%\)/);
});
