import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateItem, watchConfig, RULES } from "../lib/watchers.mjs";
import { buildBoard, fetchAll, validateBoard } from "../lib/board.mjs";
import { fixtureRunner } from "../export-board.mjs";
import { GATE_NAMES } from "../lib/gate.mjs";
import { contract } from "../lib/board.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NOW = "2026-10-23T00:00:00Z";
const cfg = { stalledDays: { "In progress": 14, "In review": 7, "QA internal": 7, "QA external": 7, Ready: 60 }, qaExternalAssignee: "BjoernLudwig", gate: { allowedStatuses: { "Gate 1": ["Backlog", "Ready"] } } };
const base = { contentType: "Issue", state: "OPEN", status: "In progress", updatedAt: "2026-10-22T00:00:00Z", readiness: 5, issueType: "Task", assignees: ["BjoernLudwig"], gate: null };
const rulesOf = (item) => evaluateItem({ ...base, ...item }, { now: NOW, config: cfg }).map((f) => f.rule);
const daysAgo = (n) => new Date(Date.parse(NOW) - n * 86400000).toISOString();

const CASES = [
  // [name, item overrides, expected rules]
  ["clean item has no findings", {}, []],
  ["stalled: In progress older than its threshold", { updatedAt: daysAgo(15) }, ["stalled"]],
  ["stalled: exactly at the threshold is not stalled", { updatedAt: daysAgo(14) }, []],
  ["stalled: threshold is per status (In review = 7)", { status: "In review", updatedAt: daysAgo(8) }, ["stalled"]],
  ["stalled: status without threshold (Backlog) never stalls", { status: "Backlog", updatedAt: daysAgo(900) }, []],
  ["stalled: Done never stalls", { status: "Done", state: "CLOSED", updatedAt: daysAgo(900) }, []],
  ["stalled: closed item is not stalled", { status: "Done", state: "CLOSED", updatedAt: daysAgo(900) }, []],
  ["stalled: missing updatedAt gives no finding", { updatedAt: null }, []],
  ["closed but not Done: CLOSED + In review", { state: "CLOSED", status: "In review" }, ["closed-not-done"]],
  ["closed but not Done: CLOSED + no status", { state: "CLOSED", status: null }, ["closed-not-done"]],
  ["closed but not Done: CLOSED + Done is fine", { state: "CLOSED", status: "Done" }, []],
  ["closed but not Done: MERGED pull request not Done", { contentType: "PullRequest", state: "MERGED", status: "In review" }, ["closed-not-done"]],
  ["closed but not Done: OPEN + Done is not this rule", { state: "OPEN", status: "Done" }, []],
  ["QA external without Bjoern: assigned to someone else", { status: "QA external", assignees: ["someone"] }, ["qa-external-no-bjoern"]],
  ["QA external without Bjoern: nobody assigned", { status: "QA external", assignees: [] }, ["qa-external-no-bjoern"]],
  ["QA external with Bjoern (case-insensitive) is fine", { status: "QA external", assignees: ["x", "bjoernludwig"] }, []],
  ["QA external: assignees unknown (not exported) gives no finding", { status: "QA external", assignees: undefined }, []],
  ["other status without Bjoern is fine", { status: "QA internal", assignees: [] }, []],
  ["epic without Readiness", { issueType: "Epic", readiness: null }, ["epic-no-readiness"]],
  ["epic with Readiness 0 counts as set", { issueType: "Epic", readiness: 0 }, []],
  ["closed epic without Readiness is ignored", { issueType: "Epic", readiness: null, state: "CLOSED", status: "Done" }, []],
  ["non-epic without Readiness is fine", { readiness: null }, []],
  ["Gate/Status mismatch: no Gate field yet is a no-op", { gate: null, status: "Done" }, []],
  ["Gate/Status mismatch: gate value outside the allowed statuses", { gate: "Gate 1", status: "In progress" }, ["gate-status-mismatch"]],
  ["Gate/Status match is fine", { gate: "Gate 1", status: "Ready" }, []],
  ["Gate/Status: unknown gate value is a no-op", { gate: "Gate 9", status: "Done" }, []],
  ["draft issues are only checked for epics/stalls via fields, not closed rule", { contentType: "DraftIssue", state: null, status: "Backlog" }, []],
  ["several rules at once keep rule order", { issueType: "Epic", readiness: null, state: "OPEN", status: "In progress", updatedAt: daysAgo(30) }, ["stalled", "epic-no-readiness"]],
];
for (const [name, over, want] of CASES) test(`watcher: ${name}`, () => assert.deepEqual(rulesOf(over), want));

test("finding detail carries what the UI needs", () => {
  const [f] = evaluateItem({ ...base, updatedAt: daysAgo(20) }, { now: NOW, config: cfg });
  assert.deepEqual(f, { rule: "stalled", severity: "warn", detail: { status: "In progress", days: 20, threshold: 14 } });
  const [c] = evaluateItem({ ...base, state: "CLOSED", status: "QA internal" }, { now: NOW, config: cfg });
  assert.deepEqual(c, { rule: "closed-not-done", severity: "error", detail: { status: "QA internal" } });
});

test("thresholds live in one config file and cover every rule", () => {
  const file = JSON.parse(readFileSync(resolve(here, "../watchers.config.json"), "utf8"));
  assert.deepEqual(watchConfig, file);
  assert.equal(typeof file.stalledDays["In progress"], "number");
  assert.equal(file.qaExternalAssignee, "BjoernLudwig");
  assert.deepEqual(RULES, ["stalled", "closed-not-done", "qa-external-no-bjoern", "epic-no-readiness", "gate-status-mismatch"]);
});

test("export writes findings per item into board.json, valid against the schema, never for private items", async () => {
  const data = await fetchAll(fixtureRunner(resolve(here, "../fixtures/project-export.json")), { owner: "o", number: 1 });
  const board = buildBoard(data, { syncedAt: NOW });
  assert.deepEqual(validateBoard(board), []);
  const by = (n) => board.items.find((i) => i.number === n);
  assert.deepEqual(by(55).findings.map((f) => f.rule), []); // closed + Done
  assert.deepEqual(by(204).assignees, ["frank"]);
  assert.ok(board.items.every((i) => Array.isArray(i.findings) && Array.isArray(i.assignees)));
  assert.equal(JSON.stringify(board).includes("SECRET"), false);
  assert.ok(board.items.some((i) => i.findings.length > 0), "fixture exercises at least one finding");
  assert.equal(typeof board.findingCounts, "object");
});

test("schema stays additive: a v1 board without assignees/findings still validates", async () => {
  const old = JSON.parse(readFileSync(resolve(here, "../fixtures/board.sample.json"), "utf8"));
  for (const i of old.items) { delete i.assignees; delete i.findings; }
  delete old.findingCounts;
  assert.deepEqual(validateBoard(old), []);
});

// ───── Gate/Status mismatch with the reviewed mapping (ORISO-Docs#211) ─────
// Literal truth table, written out by hand: gate -> statuses it may sit in. Not derived from the config.
const STATUS_ORDER = ["Backlog", "Ready", "On hold", "In progress", "In review", "QA internal", "QA external", "Done"];
const OK = {
  "P1 Framed": ["Backlog", "On hold"],
  "P2 Specified": ["Backlog", "On hold"],
  "P3 Sliced": ["Backlog", "On hold"],
  "P4 Ready for agent": ["Ready", "In progress", "On hold"],
  "R1 Checks green": ["In review", "On hold"],
  "R2 AI review": ["In review", "On hold"],
  "R3 Human review": ["In review", "On hold"],
  "R4 Verified on Dev": ["QA internal", "QA external", "Done", "On hold"],
};
const flagged = (gate, status) => evaluateItem({ ...base, gate, status, state: status === "Done" ? "CLOSED" : "OPEN", updatedAt: "2026-10-22T00:00:00Z" }, { now: NOW, config: watchConfig }).some((f) => f.rule === "gate-status-mismatch");

for (const [gate, allowed] of Object.entries(OK)) {
  for (const status of STATUS_ORDER) {
    test(`gate/status table: ${gate} + ${status} is ${allowed.includes(status) ? "fine" : "flagged"}`, () => assert.equal(flagged(gate, status), !allowed.includes(status)));
  }
  test(`gate/status table: ${gate} + no status is flagged`, () => assert.equal(flagged(gate, null), true));
}

test("gate/status: spec pairs hold (R4 with QA internal, P4 with Ready, R1-R3 with In review)", () => {
  assert.equal(flagged("R4 Verified on Dev", "QA internal"), false);
  assert.equal(flagged("P4 Ready for agent", "Ready"), false);
  for (const g of ["R1 Checks green", "R2 AI review", "R3 Human review"]) assert.equal(flagged(g, "In review"), false);
  assert.equal(flagged("R3 Human review", "Backlog"), true);
  assert.equal(flagged("P3 Sliced", "In review"), true);
});

test("gate/status: no Gate means no finding, whatever the status", () => {
  for (const status of [...STATUS_ORDER, null]) assert.equal(flagged(null, status), false);
});

test("the reviewed mapping covers exactly the Gate options and only real Status options", () => {
  const gates = Object.keys(watchConfig.gate.allowedStatuses);
  assert.deepEqual(gates, GATE_NAMES);
  for (const list of Object.values(watchConfig.gate.allowedStatuses)) for (const s of list) assert.ok(contract.fields.status.options.includes(s), s);
  assert.deepEqual(watchConfig.gate.allowedStatuses, OK);
});
