// propose-refactor: health finding -> planned refactoring task (ORISO-Docs#222, epic #213, spec stories 25 and 26).
// Seam: proposeRefactor(scope, epic, {record, dryRun, transport}) against the fake GitHub; no network.
import test from "node:test";
import assert from "node:assert/strict";
import { proposeRefactor, parseScope, REFACTORING_LABEL, ERROR_CODES } from "../lib/refactor.mjs";
import { createRefactorGitHub } from "./fake-refactor.mjs";
import { ORG } from "./fake-github.mjs";
import { createRunManifest } from "../lib/run-manifest.mjs";
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria } from "../../understand-anything/platform/lib/health-criteria.mjs";
import { CAPABILITY_IDS, CODE_REPOS } from "../../understand-anything/platform/lib/capabilities.mjs";
import { buildRunRecord, runFile } from "../../understand-anything/platform/lib/health-run.mjs";

const SHA = "c".repeat(40);
const AT = "2026-10-24T10:15:00Z";
const EPIC = `${ORG}/ORISO-Docs#50`;
const criteria = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
---
x`, "health/default.md")], { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
const record = (scope = { capability: "email-templates", repo: "ORISO-Frontend", path: "src/mails" }, over = {}) => buildRunRecord({
  manifest: createRunManifest({ at: AT, commits: { [scope.repo]: SHA }, trigger: "health-run" }), scope, commit: SHA,
  effective: resolveCriteria(criteria, { capability: scope.capability, path: scope.path === null ? `${scope.repo}/` : `${scope.repo}/${scope.path}/` }),
  measurements: {
    size: { value: 900, source: "size: 3 files", details: {} },
    "test-ratio": { value: 0.1, source: "test-ratio", details: {} },
    lint: { value: null, source: "eslint", details: { reason: "no linter configuration" } },
  },
  model: "claude-test", startedAt: AT,
  verdict: [{ criterion: "readability", score: 35, weight: 1, reasons: ["Templates mix markup and logic. Ping @someone about it #12"] }, { criterion: "naming", score: 90, weight: 1, reasons: ["Names are clear."] }],
  ...over,
});

test("parseScope reads capability[:repo[:path]] and refuses unknown parts", () => {
  assert.deepEqual(parseScope("email-templates"), { ok: true, scope: { capability: "email-templates", repo: null, path: null } });
  assert.deepEqual(parseScope("email-templates:ORISO-Frontend"), { ok: true, scope: { capability: "email-templates", repo: "ORISO-Frontend", path: null } });
  assert.deepEqual(parseScope("email-templates:ORISO-Frontend:src/mails/x"), { ok: true, scope: { capability: "email-templates", repo: "ORISO-Frontend", path: "src/mails/x" } });
  for (const bad of ["nope", "email-templates:Nope", "email-templates::src", "email-templates:ORISO-Frontend:../x", "email-templates:ORISO-Frontend:/x", "", "chat:ORISO-Frontend:a:b"]) {
    const r = parseScope(bad);
    assert.equal(r.ok, false, bad);
    assert.equal(r.error.code, "BAD_REQUEST", bad);
  }
});

test("dry run plans the task and writes nothing", async () => {
  const gh = createRefactorGitHub();
  const rec = record();
  const r = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: rec, dryRun: true, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.equal(r.action, "create");
  assert.equal(r.wrote, false);
  assert.deepEqual(r.scope, { capability: "email-templates", repo: "ORISO-Frontend", path: "src/mails" });
  assert.equal(r.issueType, "Task");
  assert.deepEqual(r.labels, [REFACTORING_LABEL]);
  assert.equal(r.repository, `${ORG}/ORISO-Docs`);
  assert.match(r.title, /^Refactor .*ORISO-Frontend\/src\/mails/);
  assert.deepEqual(gh.writes, []);
});

test("the body links the run record, lists the findings, carries the scope marker and the ORISO sections", async () => {
  const gh = createRefactorGitHub();
  const rec = record();
  const { body } = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: rec, dryRun: true, transport: gh.transport });
  assert.ok(body.includes(`https://github.com/${ORG}/ORISO-Docs/blob/dev/${runFile(rec)}`), "link to the run record file");
  assert.ok(body.includes(rec.run.runId));
  assert.ok(body.includes(rec.links.source), "link to the measured source");
  assert.match(body, /size/); // failed metric
  assert.match(body, /test-ratio/);
  assert.match(body, /lint[^\n]*not available/i); // not measured is named, not hidden
  assert.match(body, /readability[^\n]*35/); // verdict below 60
  assert.doesNotMatch(body, /naming/); // verdict 90 is not a finding
  assert.match(body, /<!-- oriso:refactor:v1 scope=email-templates:ORISO-Frontend:src\/mails -->/);
  for (const h of ["## Why", "## What to build", "## Acceptance", "### Reviewer test plan"]) assert.ok(body.includes(h), h);
  assert.doesNotMatch(body, /\bCloses\b/i); // agents never close issues
  assert.match(body, /- \[ \]/); // reviewer boxes stay unchecked
  assert.doesNotMatch(body, /- \[x\]/i);
});

test("text from the record cannot ping people or link issues", async () => {
  const gh = createRefactorGitHub();
  const { body } = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: record(), dryRun: true, transport: gh.transport });
  assert.doesNotMatch(body, /@someone/);
  assert.doesNotMatch(body, /(^|[^&\w])#12\b/);
});

test("without a record the task says so and still carries the scope", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("chat", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.match(r.body, /No run record attached/);
  assert.match(r.body, /<!-- oriso:refactor:v1 scope=chat -->/);
  assert.match(r.title, /^Refactor /);
});

test("the scope is filled from the record when it names only the capability", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("email-templates", EPIC, { record: record(), dryRun: true, transport: gh.transport });
  assert.deepEqual(r.scope, { capability: "email-templates", repo: "ORISO-Frontend", path: "src/mails" });
});

test("a record of another scope is refused", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("chat", EPIC, { record: record(), dryRun: true, transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "BAD_REQUEST");
  assert.match(r.error.message, /capability/);
  const r2 = await proposeRefactor("email-templates:ORISO-Frontend:src/other", EPIC, { record: record(), dryRun: true, transport: gh.transport });
  assert.equal(r2.error.code, "BAD_REQUEST");
  assert.deepEqual(gh.writes, []);
});

test("an invalid record is refused with its problems", async () => {
  const gh = createRefactorGitHub();
  const bad = record();
  bad.overall = 3;
  const r = await proposeRefactor("email-templates", EPIC, { record: bad, dryRun: true, transport: gh.transport });
  assert.equal(r.error.code, "BAD_REQUEST");
  assert.ok(r.error.detail.problems.length);
});

test("--apply creates the task: label, type Task, sub-issue of the epic, on the board", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: record(), dryRun: false, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.equal(r.wrote, true);
  assert.equal(r.action, "created");
  assert.deepEqual(gh.writes.map((w) => w.kind), ["task", "sub-issue", "board"]);
  const task = gh.writes[0].value;
  assert.deepEqual(task.labelIds, ["LA_ORISO-Docs"]);
  assert.equal(task.issueTypeId, "IT_0"); // Task
  assert.equal(task.title, r.title);
  assert.equal(task.body, r.body);
  assert.deepEqual(r.issue, { number: 700, url: `https://github.com/${ORG}/ORISO-Docs/issues/700`, repository: `${ORG}/ORISO-Docs` });
  assert.equal(gh.epic(EPIC).subIssues[0].number, 700);
});

test("a missing refactoring label is created on apply and announced in the dry run", async () => {
  const gh = createRefactorGitHub({ labelExists: false });
  const plan = await proposeRefactor("chat", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(plan.createsLabel, true);
  assert.deepEqual(gh.writes, []);
  const r = await proposeRefactor("chat", EPIC, { dryRun: false, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.deepEqual(gh.writes.map((w) => w.kind), ["label", "task", "sub-issue", "board"]);
  assert.equal(gh.writes[1].value.labelIds[0], "LA_new");
});

test("proposing the same scope again finds the open task instead of creating a second one", async () => {
  const gh = createRefactorGitHub();
  const first = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: record(), dryRun: false, transport: gh.transport });
  const again = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { record: record(), dryRun: false, transport: gh.transport });
  assert.equal(again.ok, true);
  assert.equal(again.action, "exists");
  assert.equal(again.wrote, false);
  assert.equal(again.issue.number, first.issue.number);
  assert.equal(gh.writes.filter((w) => w.kind === "task").length, 1);
  // another scope is a new task; a closed task of the same scope does not block a new proposal
  const other = await proposeRefactor("email-templates:ORISO-Frontend:src/other", EPIC, { dryRun: false, transport: gh.transport });
  assert.equal(other.action, "created");
  gh.epic(EPIC).subIssues[0].state = "CLOSED";
  const reopened = await proposeRefactor("email-templates:ORISO-Frontend:src/mails", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(reopened.action, "create");
});

test("the marker is found on later pages of the epic's sub-issues", async () => {
  const gh = createRefactorGitHub();
  const e = gh.epic(EPIC);
  for (let n = 1; n <= 5; n++) e.subIssues.push({ number: n, url: `https://github.com/${ORG}/ORISO-Docs/issues/${n}`, state: "OPEN", body: n === 5 ? "<!-- oriso:refactor:v1 scope=chat -->" : "x" });
  gh.pageSize = 2;
  const r = await proposeRefactor("chat", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(r.action, "exists");
  assert.equal(r.issue.number, 5);
});

// ───── typed errors, same shape as the planning API ─────
test("error codes extend the planning API's", () => {
  for (const c of ["NO_WRITE_RIGHTS", "NOT_FOUND", "PRIVATE_REPO", "BAD_REQUEST", "FIELD_MISSING", "TRANSPORT"]) assert.ok(ERROR_CODES.includes(c), c);
});

test("no write rights on the epic: NO_WRITE_RIGHTS, nothing written (dry run says so too)", async () => {
  const gh = createRefactorGitHub();
  gh.epic(EPIC).canUpdate = false;
  for (const dryRun of [true, false]) {
    const r = await proposeRefactor("chat", EPIC, { dryRun, transport: gh.transport });
    assert.equal(r.ok, false);
    assert.equal(r.error.code, "NO_WRITE_RIGHTS");
    assert.equal(r.error.issue, EPIC);
  }
  assert.deepEqual(gh.writes, []);
});

test("a token without rights answers NO_WRITE_RIGHTS at the write, with what was already created", async () => {
  const gh = createRefactorGitHub();
  gh.denySub = true;
  const r = await proposeRefactor("chat", EPIC, { dryRun: false, transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "NO_WRITE_RIGHTS");
  assert.deepEqual(r.applied, [`${ORG}/ORISO-Docs#700`]); // the orphan task is named so nobody creates it twice
  const denied = createRefactorGitHub();
  denied.denyCreate = true;
  const r2 = await proposeRefactor("chat", EPIC, { dryRun: false, transport: denied.transport });
  assert.equal(r2.error.code, "NO_WRITE_RIGHTS");
  assert.deepEqual(r2.applied, []);
});

test("epic not found: NOT_FOUND (missing issue, missing repository)", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("chat", `${ORG}/ORISO-Docs#999`, { dryRun: true, transport: gh.transport });
  assert.equal(r.error.code, "NOT_FOUND");
  const r2 = await proposeRefactor("chat", `${ORG}/ORISO-Nowhere#1`, { dryRun: true, transport: gh.transport });
  assert.equal(r2.error.code, "NOT_FOUND");
});

test("private repositories are refused: epic repository and scope repository", async () => {
  const gh = createRefactorGitHub({ epics: [{ repository: `${ORG}/ORISO-E2E`, number: 5 }, { repository: `${ORG}/ORISO-Docs`, number: 50 }] });
  const r = await proposeRefactor("chat", `${ORG}/ORISO-E2E#5`, { dryRun: true, transport: gh.transport });
  assert.equal(r.error.code, "PRIVATE_REPO");
  const r2 = await proposeRefactor("chat:ORISO-E2E", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(r2.error.code, "PRIVATE_REPO");
  assert.deepEqual(gh.writes, []);
  // a repository GitHub flags private, though the contract does not list it
  const flagged = createRefactorGitHub({ repos: { "ORISO-Docs": { isPrivate: true } } });
  const r3 = await proposeRefactor("chat", EPIC, { dryRun: true, transport: flagged.transport });
  assert.equal(r3.error.code, "PRIVATE_REPO");
});

test("a repository without the issue type Task: FIELD_MISSING", async () => {
  const gh = createRefactorGitHub({ issueTypes: ["Bug"] });
  const r = await proposeRefactor("chat", EPIC, { dryRun: true, transport: gh.transport });
  assert.equal(r.error.code, "FIELD_MISSING");
  assert.match(r.error.message, /Task/);
});

test("bad input: unknown scope, bad epic reference, no transport", async () => {
  const gh = createRefactorGitHub();
  assert.equal((await proposeRefactor("nope", EPIC, { dryRun: true, transport: gh.transport })).error.code, "BAD_REQUEST");
  assert.equal((await proposeRefactor("chat", "not-a-ref", { dryRun: true, transport: gh.transport })).error.code, "BAD_REQUEST");
  assert.equal((await proposeRefactor("chat", EPIC, { dryRun: true })).error.code, "BAD_REQUEST");
});

test("transport failures and odd answers become TRANSPORT / GITHUB_ERROR, never an exception", async () => {
  const gh = createRefactorGitHub();
  const r = await proposeRefactor("chat", EPIC, { dryRun: true, transport: async () => { throw new Error("socket hang up"); } });
  assert.equal(r.error.code, "TRANSPORT");
  gh.unauthorized("RefactorEpic");
  assert.equal((await proposeRefactor("chat", EPIC, { dryRun: true, transport: gh.transport })).error.code, "NO_WRITE_RIGHTS");
  const odd = createRefactorGitHub();
  odd.respond.RefactorEpic = () => ({ data: { repository: { id: "R", isPrivate: false } } }); // no issueTypes
  assert.equal((await proposeRefactor("chat", EPIC, { dryRun: true, transport: odd.transport })).ok, false);
});
