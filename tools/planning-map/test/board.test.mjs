import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBoard, contract, driftCheck, fetchAll, liveOptions, validateBoard } from "../lib/board.mjs";
import { fixtureRunner, main } from "../export-board.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FX = resolve(here, "../fixtures/project-export.json");
const fixture = () => JSON.parse(readFileSync(FX, "utf8"));
const load = () => fetchAll(fixtureRunner(FX), { owner: "OpenResilienceInitiative", number: 1 });
const build = async () => buildBoard(await load(), { syncedAt: "2026-10-22T12:00:00Z" });

test("pagination follows cursors and collects every item", async () => {
  const calls = [];
  const run = fixtureRunner(FX);
  const data = await fetchAll((q, v) => { calls.push(v.after); return run(q, v); }, { owner: "o", number: 1 });
  assert.equal(data.items.length, 6);
  assert.deepEqual(calls, [undefined, null, "CUR1", "CUR2"]); // meta call has no `after`
});

test("fixture board validates against the v1 schema", async () => {
  const board = await build();
  assert.deepEqual(validateBoard(board), []);
  assert.equal(board.schemaVersion, 1);
});

test("schema rejects a wrong version and a missing field", async () => {
  const board = await build();
  assert.ok(validateBoard({ ...board, schemaVersion: 2 }).length > 0);
  const { items, ...rest } = board;
  assert.match(validateBoard(rest).join("\n"), /missing required "items"/);
});

test("maps Status, Readiness, issue type, parent, state and issue fields", async () => {
  const board = await build();
  const i = board.items.find((x) => x.number === 204);
  assert.deepEqual(
    { status: i.status, readiness: i.readiness, issueType: i.issueType, parent: i.parent, state: i.state, priority: i.priority, effort: i.effort, platformRelease: i.platformRelease, updatedAt: i.updatedAt },
    { status: "Ready", readiness: 6, issueType: "Task", parent: { repository: "OpenResilienceInitiative/ORISO-Docs", number: 197 }, state: "OPEN", priority: "High", effort: "M", platformRelease: "v2.0.12", updatedAt: "2026-10-20T10:00:00Z" });
});

test("status counts include private items; releases carry counts", async () => {
  const board = await build();
  assert.deepEqual(board.statusCounts, { Ready: 1, "In progress": 1, "QA internal": 1, Done: 2, Backlog: 1 });
  assert.deepEqual(board.totals, { items: 6, public: 5, private: 1 });
  assert.deepEqual(board.releases, [{ name: "v2.0.12", count: 2 }, { name: "v2.0.13", count: 1 }]);
});

test("private repo items are counts only: no title, url, id, or parent ref leaks", async () => {
  const board = await build();
  const json = JSON.stringify(board);
  assert.equal(json.includes("SECRET"), false);
  assert.equal(json.includes("ORISO-E2E/issues"), false);
  assert.equal(json.includes("PVTI_3"), false);
  assert.deepEqual(board.privateCounts, [{ repository: "OpenResilienceInitiative/ORISO-E2E", count: 1, byStatus: { "QA internal": 1 } }]);
  assert.equal(board.items.find((x) => x.number === 55).parent, null); // parent lives in a private repo
});

test("readiness is kept raw with no range error; min/max are recorded", async () => {
  const board = await build();
  assert.equal(board.items.find((x) => x.number === 197).readiness, 19);
  assert.deepEqual(board.readinessRange, { min: 2, max: 19 });
  assert.doesNotMatch(board.warnings.join("\n"), /Readiness/);
  assert.equal("min" in contract.fields.readiness, false);
});

test("Platform release is read from the multi-select issue field; more than one value warns", async () => {
  const board = await build();
  assert.equal(board.items.find((x) => x.number === 204).platformRelease, "v2.0.12");
  assert.match(board.warnings.join("\n"), /2 Platform release values .*issues\/197/);
  assert.deepEqual(liveOptions((await load()).meta).platformRelease, ["v2.0.12", "v2.0.13"]);
});

test("drift check passes on matching live options", async () => {
  const r = driftCheck(liveOptions((await load()).meta), {
    ...contract, fields: { ...contract.fields, platformRelease: { ...contract.fields.platformRelease, options: ["v2.0.12", "v2.0.13"] } } });
  assert.equal(r.ok, true);
});

test("drift check fails on a renamed status option with a clear message", async () => {
  const fx = fixture();
  fx.meta.data.organization.projectV2.fields.nodes[0].options[3].name = "Doing";
  const r = driftCheck(liveOptions(fx.meta.data.organization));
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /Status options drifted/);
  assert.match(r.problems[0], /"In progress"/);
  assert.match(r.problems[0], /"Doing"/);
});

test("drift check fails on a changed Platform release list once pinned", async () => {
  const pinned = { ...contract, fields: { ...contract.fields, platformRelease: { ...contract.fields.platformRelease, options: ["v2.0.12"] } } };
  const r = driftCheck(liveOptions((await load()).meta), pinned);
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /Platform release options drifted.*"v2\.0\.13"/);
});

test("unpinned Platform release warns by default and fails with strict", async () => {
  const live = liveOptions((await load()).meta);
  assert.equal(driftCheck(live).ok, true);
  assert.equal(driftCheck(live).unpinned.length, 1);
  assert.equal(driftCheck(live, contract, { strict: true }).ok, false);
});

test("drift check fails when Readiness is no longer a number field", async () => {
  const fx = fixture();
  fx.meta.data.organization.projectV2.fields.nodes[1].dataType = "TEXT";
  assert.match(driftCheck(liveOptions(fx.meta.data.organization)).problems[0], /Readiness: expected a NUMBER/);
});

test("CLI writes a valid board.json from the fixture", async () => {
  const out = join(mkdtempSync(join(tmpdir(), "board-")), "board.json");
  const log = console.log; console.log = () => {}; const warn = console.warn; console.warn = () => {};
  try { assert.equal(await main(["--fixture", FX, "--out", out]), 0); } finally { console.log = log; console.warn = warn; }
  assert.deepEqual(validateBoard(JSON.parse(readFileSync(out, "utf8"))), []);
});

test("CLI exits 2 on drift", async () => {
  const fx = fixture();
  fx.meta.data.organization.projectV2.fields.nodes[0].options[0].name = "Inbox";
  const dir = mkdtempSync(join(tmpdir(), "board-"));
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(dir, "fx.json"), JSON.stringify(fx));
  const err = console.error; console.error = () => {};
  try { assert.equal(await main(["--fixture", join(dir, "fx.json"), "--drift-only"]), 2); } finally { console.error = err; }
});
