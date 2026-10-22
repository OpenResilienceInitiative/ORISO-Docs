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
  assert.deepEqual(board.totals, { items: 6, public: 4, private: 1, drafts: 1 });
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
  assert.deepEqual(board.readinessRange, { min: 6, max: 19 }); // the draft (2) is not public
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

// Privacy (ORISO-Docs#204 review): what GitHub hides and drafts never reach the public file.
const PRIV = { owner: "OpenResilienceInitiative", number: 1, syncedAt: "2026-10-22T12:00:00Z" };
const withItems = async (items) => { const d = await load(); return buildBoard({ ...d, items, totalCount: items.length }, PRIV); };

test("redacted items and items without content are private: counted, never listed", async () => {
  const board = await withItems([
    { id: "PVTI_R1", type: "REDACTED", status: { name: "Ready" }, readiness: { number: 4 }, content: null },
    { id: "PVTI_R2", type: "ISSUE", status: { name: "Done" }, readiness: null, content: null },
    { id: "PVTI_R3", type: "REDACTED", status: null, readiness: null, content: { __typename: "Issue", title: "LEAK redacted", url: "https://github.com/x/y/issues/1" } },
  ]);
  assert.deepEqual(validateBoard(board), []);
  assert.deepEqual(board.items, []);
  const json = JSON.stringify(board);
  for (const leak of ["PVTI_R", "LEAK", "x/y/issues"]) assert.equal(json.includes(leak), false, leak);
  assert.deepEqual(board.hiddenCounts.redacted, { count: 3, byStatus: { Ready: 1, Done: 1, "(none)": 1 } });
  assert.deepEqual(board.totals, { items: 3, public: 0, private: 3, drafts: 0 });
  assert.deepEqual(board.readinessRange, { min: null, max: null });
});

test("draft issues are not public: counted by status, no title, no id", async () => {
  const board = await build();
  assert.equal(board.items.some((i) => i.contentType === "DraftIssue"), false);
  const json = JSON.stringify(board);
  assert.equal(json.includes("Idea: board filters"), false);
  assert.equal(json.includes("PVTI_5"), false);
  assert.deepEqual(board.hiddenCounts.drafts, { count: 1, byStatus: { Backlog: 1 } });
  assert.deepEqual(validateBoard(board), []);
});

test("the schema refuses a draft item; hiddenCounts is optional (additive)", async () => {
  const board = await build();
  const draft = { ...board.items[0], contentType: "DraftIssue" };
  assert.ok(validateBoard({ ...board, items: [draft] }).length > 0);
  const { hiddenCounts, ...old } = board;
  const { drafts, ...oldTotals } = board.totals;
  assert.deepEqual(validateBoard({ ...old, totals: oldTotals }), []);
});

test("assignees: issues and pull requests carry logins; content without an assignees field gives null, not []", async () => {
  const issue = (extra) => ({ id: "PVTI_A", type: "ISSUE", status: { name: "QA external" }, readiness: null,
    content: { __typename: "Issue", number: 1, title: "t", url: "https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/1", state: "OPEN", updatedAt: "2026-10-22T00:00:00Z", repository: { nameWithOwner: "OpenResilienceInitiative/ORISO-Docs", isPrivate: false }, ...extra } });
  const board = await withItems([
    issue({ assignees: { nodes: [{ login: "BjoernLudwig" }] } }),
    { ...issue({ __typename: "PullRequest", number: 2, url: "https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/2", assignees: { nodes: [{ login: "frank" }] } }), id: "PVTI_B" },
    { ...issue({ __typename: "PullRequest", number: 3, url: "https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/3" }), id: "PVTI_C" },
  ]);
  assert.deepEqual(board.items.map((i) => i.assignees), [["BjoernLudwig"], ["frank"], null]);
  assert.deepEqual(board.items.map((i) => i.findings.map((f) => f.rule)), [[], ["qa-external-no-bjoern"], []]);
  assert.deepEqual(validateBoard(board), []);
});

test("the items query asks for assignees on pull requests too", async () => {
  const { ITEMS_QUERY } = await import("../lib/queries.mjs");
  const pr = /\.\.\. on PullRequest \{([\s\S]*?)\n\s*\}/.exec(ITEMS_QUERY)?.[1] ?? "";
  assert.match(pr, /assignees\(first: \d+\) \{ nodes \{ login \} \}/);
});
