import test from "node:test";
import assert from "node:assert/strict";
import { assignRelease, PLATFORM_RELEASE_FIELD_ID } from "../lib/planning-api.mjs";
import { createFakeGitHub, ORG } from "./fake-github.mjs";

const FE = `${ORG}/ORISO-Frontend`;
const AD = `${ORG}/ORISO-Admin`;
const world = (extra = {}) =>
  createFakeGitHub({
    issues: [
      { repository: FE, number: 1, release: "v2.0.12" },
      { repository: FE, number: 2, release: null },
      { repository: FE, number: 10, release: "v2.0.12", subIssues: [`${FE}#11`, `${FE}#12`, `${AD}#5`] },
      { repository: FE, number: 11, release: null },
      { repository: FE, number: 12, release: "v2.0.13" },
      { repository: AD, number: 5, release: "v2.0.12" },
      { repository: FE, number: 20, canUpdate: false, release: null },
      { repository: FE, number: 30, release: null, subIssues: [`${FE}#31`] },
      { repository: FE, number: 31, release: null, canUpdate: false },
    ],
    ...extra,
  });

test("the platform release field is the org multi-select issue field", () => {
  assert.equal(PLATFORM_RELEASE_FIELD_ID, "IFMS_kgDOArcqMA");
});

test("a single issue gets the release; the result reports before and after", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#2`, "v2.0.13", { transport: gh.transport });
  assert.deepEqual(r, { ok: true, release: "v2.0.13", dryRun: false, results: [{ issue: `${FE}#2`, role: "issue", before: null, after: "v2.0.13", changed: true, wrote: true }] });
  assert.deepEqual(gh.writes, [{ kind: "release", issue: `${FE}#2`, value: ["v2.0.13"] }]);
  assert.deepEqual(gh.issue(`${FE}#2`).release, ["v2.0.13"]);
});

test("accepts a {repository, number} reference and a bare repo name in the default org", async () => {
  const gh = world();
  const r = await assignRelease({ repository: "ORISO-Frontend", number: 2 }, "v2.0.12", { transport: gh.transport });
  assert.equal(r.ok, true);
  assert.equal(r.results[0].issue, `${FE}#2`);
});

test("an issue already in the release is left alone: no write", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#1`, "v2.0.12", { transport: gh.transport });
  assert.equal(r.ok, true);
  assert.deepEqual(r.results.map((x) => [x.changed, x.wrote]), [[false, false]]);
  assert.deepEqual(gh.writes, []);
});

test("withSubIssues moves the parent and every sub-issue, across repositories, paging through them", async () => {
  const gh = world();
  gh.pageSize = 2;
  const r = await assignRelease(`${FE}#10`, "v2.0.13", { withSubIssues: true, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.deepEqual(r.results.map((x) => [x.issue, x.role, x.before, x.changed]), [
    [`${FE}#10`, "issue", "v2.0.12", true],
    [`${FE}#11`, "sub-issue", null, true],
    [`${FE}#12`, "sub-issue", "v2.0.13", false],
    [`${AD}#5`, "sub-issue", "v2.0.12", true],
  ]);
  assert.deepEqual(gh.writes.map((w) => w.issue), [`${FE}#10`, `${FE}#11`, `${AD}#5`]);
  assert.deepEqual(gh.issue(`${AD}#5`).release, ["v2.0.13"]);
});

test("without withSubIssues the sub-issues are not touched", async () => {
  const gh = world();
  await assignRelease(`${FE}#10`, "v2.0.13", { transport: gh.transport });
  assert.deepEqual(gh.writes.map((w) => w.issue), [`${FE}#10`]);
  assert.ok(!gh.calls.some((c) => c.op === "PlanSubIssues"));
});

test("no write rights on the issue: typed error, nothing written", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#20`, "v2.0.12", { transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "NO_WRITE_RIGHTS");
  assert.equal(r.error.issue, `${FE}#20`);
  assert.deepEqual(r.applied, []);
  assert.deepEqual(gh.writes, []);
});

test("no write rights on one sub-issue: refused before any write, so nothing is half-moved", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#30`, "v2.0.12", { withSubIssues: true, transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "NO_WRITE_RIGHTS");
  assert.equal(r.error.issue, `${FE}#31`);
  assert.deepEqual(gh.writes, []);
});

test("a rights error raised by the write itself is typed as well, and lists what was already written", async () => {
  const gh = world();
  gh.hooks.PlanSetRelease = (vars) => { if (vars.input.issueId === gh.issue(`${AD}#5`).id) gh.issue(`${AD}#5`).canUpdate = false; };
  gh.issue(`${AD}#5`).canUpdate = true; // preflight passes; the right is revoked between read and write
  const r = await assignRelease(`${FE}#10`, "v2.0.13", { withSubIssues: true, transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "NO_WRITE_RIGHTS");
  assert.equal(r.error.issue, `${AD}#5`);
  assert.deepEqual(r.applied, [`${FE}#10`, `${FE}#11`]);
});

test("conflict: the board showed another release than GitHub has now", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#1`, "v2.0.13", { expectedRelease: "v2.0.13", transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "CONFLICT");
  assert.deepEqual(r.error.detail, { expected: "v2.0.13", actual: "v2.0.12" });
  assert.deepEqual(gh.writes, []);
});

test("expectedRelease null means 'was unassigned'; a match writes", async () => {
  const gh = world();
  assert.equal((await assignRelease(`${FE}#2`, "v2.0.12", { expectedRelease: null, transport: gh.transport })).ok, true);
  const stale = await assignRelease(`${FE}#2`, "v2.0.13", { expectedRelease: null, transport: gh.transport });
  assert.equal(stale.error.code, "CONFLICT");
});

test("an unknown issue is NOT_FOUND", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#999`, "v2.0.12", { transport: gh.transport });
  assert.equal(r.error.code, "NOT_FOUND");
});

test("an unknown release is UNKNOWN_RELEASE and lists the live names; nothing is written", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#2`, "v9.9.9", { transport: gh.transport });
  assert.equal(r.error.code, "UNKNOWN_RELEASE");
  assert.deepEqual(r.error.detail, { release: "v9.9.9", known: ["v2.0.12", "v2.0.13"] });
  assert.deepEqual(gh.writes, []);
});

test("dry run reads and plans but never calls the write operation", async () => {
  const gh = world();
  const r = await assignRelease(`${FE}#10`, "v2.0.13", { withSubIssues: true, dryRun: true, transport: gh.transport });
  assert.equal(r.ok, true);
  assert.equal(r.dryRun, true);
  assert.deepEqual(r.results.map((x) => [x.changed, x.wrote]), [[true, false], [true, false], [false, false], [true, false]]);
  assert.ok(!gh.calls.some((c) => c.op === "PlanSetRelease"));
});

test("a transport that throws becomes a TRANSPORT error, never an exception", async () => {
  const r = await assignRelease(`${FE}#2`, "v2.0.12", { transport: async () => { throw new Error("socket hang up"); } });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "TRANSPORT");
  assert.match(r.error.message, /socket hang up/);
});

test("a malformed issue reference is BAD_REQUEST", async () => {
  const gh = world();
  assert.equal((await assignRelease("nonsense", "v2.0.12", { transport: gh.transport })).error.code, "BAD_REQUEST");
});

test("the write uses SetIssueFieldValue on the multi-select field with the option id", async () => {
  const gh = world();
  await assignRelease(`${FE}#2`, "v2.0.13", { transport: gh.transport });
  const call = gh.calls.find((c) => c.op === "PlanSetRelease");
  assert.deepEqual(call.variables.input, { issueId: gh.issue(`${FE}#2`).id, issueFields: [{ fieldId: "IFMS_kgDOArcqMA", multiSelectOptionIds: ["OPT_R1"] }] });
});
