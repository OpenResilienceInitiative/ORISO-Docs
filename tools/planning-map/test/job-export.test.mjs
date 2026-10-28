// Job sections in the export + the job-stale watcher (ORISO-Docs#216; seam 1).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBoard, validateBoard } from "../lib/board.mjs";
import { evaluateItem, watchConfig, RULES } from "../lib/watchers.mjs";
import { renderSection } from "../lib/job.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NOW = "2026-10-24T12:00:00Z";
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600000).toISOString().replace(".000Z", "Z");
const REPO = "OpenResilienceInitiative/ORISO-Docs";
const job = (over = {}) => ({ state: "running", runner: "local", machine: "mac-frank", started: hoursAgo(30), updated: hoursAgo(2), model: "claude-opus-5-5", branches: ["feat/216"], prs: ["#230"], next: "run tests", report: "https://github.com/o/r/pull/230", ...over });

// ───── watcher table ─────
const cfg = { jobStaleHours: 24, stalledDays: {} };
const rules = (j, config = cfg) => evaluateItem({ contentType: "Issue", state: "OPEN", status: "Backlog", updatedAt: NOW, readiness: 1, issueType: "Task", assignees: [], gate: null, ...(j === undefined ? {} : { job: j }) }, { now: NOW, config }).map((f) => f.rule);
const CASES = [
  ["running, updated 25 h ago", job({ updated: hoursAgo(25) }), ["job-stale"]],
  ["running, updated exactly 24 h ago", job({ updated: hoursAgo(24) }), []],
  ["running, updated 23 h ago", job({ updated: hoursAgo(23) }), []],
  ["running, updated now", job({ updated: NOW }), []],
  ["running, updated in the future", job({ updated: hoursAgo(-5) }), []],
  ["stopped for a week is not stale (it is stopped)", job({ state: "stopped", updated: hoursAgo(170) }), []],
  ["waiting-human for a week is not stale", job({ state: "waiting-human", updated: hoursAgo(170) }), []],
  ["done long ago", job({ state: "done", updated: hoursAgo(900) }), []],
  ["failed long ago", job({ state: "failed", updated: hoursAgo(900) }), []],
  ["no job at all", undefined, []],
];
for (const [name, j, want] of CASES) test(`job-stale: ${name}`, () => assert.deepEqual(rules(j), want));

test("job-stale: the limit comes from the config; the default file says 24 hours", () => {
  assert.equal(watchConfig.jobStaleHours, 24);
  assert.deepEqual(rules(job({ updated: hoursAgo(5) }), { jobStaleHours: 4 }), ["job-stale"]);
  assert.deepEqual(rules(job({ updated: hoursAgo(5) }), { jobStaleHours: 6 }), []);
  assert.deepEqual(rules(job({ updated: hoursAgo(500) }), {}), ["job-stale"], "a config without the key falls back to 24 h");
});

test("job-stale finding carries hours and limit; it is the last rule", () => {
  const [f] = evaluateItem({ contentType: "Issue", state: "OPEN", status: "Backlog", updatedAt: NOW, issueType: "Task", job: job({ updated: hoursAgo(30) }) }, { now: NOW, config: cfg });
  assert.deepEqual(f, { rule: "job-stale", severity: "warn", detail: { hours: 30, threshold: 24 } });
  assert.equal(RULES.at(-1), "job-stale");
});

test("job-stale: a closed issue is not flagged", () => {
  assert.deepEqual(evaluateItem({ contentType: "Issue", state: "CLOSED", status: "Done", job: job({ updated: hoursAgo(100) }) }, { now: NOW, config: cfg }).map((f) => f.rule), []);
});

// ───── export ─────
const meta = { projectV2: { title: "T", fields: { nodes: [] } } };
const issue = (number, body, { repo = REPO, isPrivate = false, type = "ISSUE", typename = "Issue" } = {}) => ({
  id: `PVTI_${number}`, type, status: { name: "In progress" }, readiness: null,
  content: typename === "DraftIssue" ? { __typename: "DraftIssue", title: "draft", body }
    : { __typename: typename, number, title: `Issue ${number}`, url: `https://github.com/${repo}/issues/${number}`, state: "OPEN", updatedAt: NOW, body,
      repository: { nameWithOwner: repo, isPrivate }, issueType: { name: "Task" }, assignees: { nodes: [] }, parent: null, issueFieldValues: { nodes: [] } },
});
const build = (items) => buildBoard({ meta, items, totalCount: items.length, title: "T" }, { syncedAt: NOW });
const item = (board, n) => board.items.find((i) => i.number === n);
const SECRET_TEXT = "PRIVATE-TEXT-DO-NOT-EXPORT";

test("a public issue with a job section exports the parsed job and passes the schema", () => {
  const b = build([issue(216, `Intro ${SECRET_TEXT}\n\n${renderSection(job())}\n`)]);
  assert.deepEqual(item(b, 216).job, job());
  assert.deepEqual(validateBoard(b), []);
  assert.ok(!JSON.stringify(b).includes(SECRET_TEXT), "the description itself is never exported");
  assert.ok(!("body" in item(b, 216)));
});

test("a stale running job becomes a job-stale finding and is counted", () => {
  const b = build([issue(1, renderSection(job({ updated: hoursAgo(40) }))), issue(2, renderSection(job({ updated: hoursAgo(1) }))), issue(3, "no section")]);
  assert.deepEqual(item(b, 1).findings.map((f) => f.rule), ["job-stale"]);
  assert.deepEqual(item(b, 2).findings, []);
  assert.equal(b.findingCounts["job-stale"], 1);
  assert.equal(item(b, 3).job, undefined);
  assert.deepEqual(validateBoard(b), []);
});

test("an invalid or broken section exports no job and a warning with the issue link only", () => {
  const damaged = renderSection(job()).replace("state: running", "state: flying");
  const b = build([issue(4, `${SECRET_TEXT}\n${damaged}`), issue(5, "<!-- oriso:job:start v1 -->\nno end")]);
  assert.equal(item(b, 4).job, undefined);
  assert.equal(item(b, 5).job, undefined);
  assert.equal(b.warnings.filter((w) => /job section/i.test(w)).length, 2);
  assert.ok(b.warnings.some((w) => w.includes("issues/4")));
  assert.ok(!JSON.stringify(b).includes(SECRET_TEXT));
  assert.deepEqual(validateBoard(b), []);
});

test("private repositories, drafts and redacted items export no job content at all", () => {
  const sec = renderSection(job({ next: "PRIVATE-NEXT", branches: ["secret/private-branch"] }));
  const b = build([
    issue(7, sec, { repo: "O/Priv", isPrivate: true }),
    issue(8, sec, { typename: "DraftIssue", type: "DRAFT_ISSUE" }),
    { id: "PVTI_r", type: "REDACTED", content: null },
    issue(9, "plain"),
  ]);
  const json = JSON.stringify(b);
  for (const leak of ["PRIVATE-NEXT", "secret/private-branch", "mac-frank"]) assert.ok(!json.includes(leak), leak);
  assert.equal(b.items.length, 1);
  assert.equal(b.totals.private, 2);
  assert.deepEqual(b.findingCounts, {});
  assert.deepEqual(validateBoard(b), []);
});

test("a pull request board item never gets a job", () => {
  const b = build([issue(10, renderSection(job()), { typename: "PullRequest", type: "PULL_REQUEST" })]);
  assert.equal(item(b, 10).job, undefined);
});

test("schema: a board without any job still validates, and a job with an unknown state does not", () => {
  const b = build([issue(11, renderSection(job()))]);
  assert.deepEqual(validateBoard(b), []);
  item(b, 11).job.state = "flying";
  assert.ok(validateBoard(b).some((e) => /job\.state/.test(e)));
  item(b, 11).job = { ...job(), extra: 1 };
  assert.ok(validateBoard(b).some((e) => /extra/.test(e)));
});

test("the default watcher config file carries the limit", () => {
  assert.equal(JSON.parse(readFileSync(resolve(here, "../watchers.config.json"), "utf8")).jobStaleHours, 24);
});
