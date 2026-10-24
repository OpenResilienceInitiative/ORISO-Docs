// writeJobSection (ORISO-Docs#216): seam 2, against the fake GitHub.
import test from "node:test";
import assert from "node:assert/strict";
import { writeJobSection, ERROR_CODES } from "../lib/planning-api.mjs";
import { START, END, bodyHash, parseSection } from "../lib/job.mjs";
import { createFakeGitHub, ORG } from "./fake-github.mjs";

const REPO = `${ORG}/ORISO-Docs`;
const REF = `${REPO}#216`;
const job = (over = {}) => ({ state: "running", runner: "local", machine: "mac-frank", started: "2026-10-24T08:00:00Z", updated: "2026-10-24T09:00:00Z", model: "claude-opus-5-5", branches: ["feat/213-216-jobs"], prs: [], next: "tests", report: null, ...over });
const world = (body = "Problem\n\nText\n", extra = {}) => createFakeGitHub({ issues: [{ repository: REPO, number: 216, body, ...extra }] });

test("appends the section to a description without markers; the rest stays", async () => {
  const gh = world();
  const r = await writeJobSection(REF, job(), { transport: gh.transport });
  assert.equal(r.ok, true);
  assert.deepEqual([r.mode, r.changed, r.wrote, r.dryRun], ["appended", true, true, false]);
  const body = gh.issue(REF).body;
  assert.ok(body.startsWith("Problem\n\nText\n\n" + START));
  assert.equal(parseSection(body).job.state, "running");
  assert.deepEqual(gh.writes.map((w) => w.kind), ["body"]);
  assert.equal(r.after.bodyHash, bodyHash(body));
});

test("replaces only the marked section; text before and after is byte-identical", async () => {
  const first = world("Head ä\n\n");
  await writeJobSection(REF, job(), { transport: first.transport });
  const withTail = first.issue(REF).body + "\n\n## Tail\nmore  text";
  const gh = world(withTail);
  const r = await writeJobSection(REF, job({ state: "done", updated: "2026-10-24T10:00:00Z" }), { transport: gh.transport });
  assert.equal(r.mode, "replaced");
  const body = gh.issue(REF).body;
  assert.ok(body.startsWith("Head ä\n\n" + START) && body.endsWith(END + "\n\n## Tail\nmore  text"));
  assert.equal(parseSection(body).job.state, "done");
});

test("dry run reads, plans and writes nothing", async () => {
  const gh = world();
  const r = await writeJobSection(REF, job(), { transport: gh.transport, dryRun: true });
  assert.equal(r.ok, true);
  assert.deepEqual([r.changed, r.wrote, r.dryRun], [true, false, true]);
  assert.ok(r.bodyAfter.includes(START) && r.bodyBefore === "Problem\n\nText\n");
  assert.deepEqual(gh.writes, []);
});

test("an unchanged section is not written again", async () => {
  const gh = world();
  await writeJobSection(REF, job(), { transport: gh.transport });
  const r = await writeJobSection(REF, job(), { transport: gh.transport });
  assert.deepEqual([r.ok, r.mode, r.changed, r.wrote], [true, "unchanged", false, false]);
  assert.equal(gh.writes.length, 1);
});

test("a job function gets the section already on the issue (merge, heartbeat)", async () => {
  const gh = world();
  await writeJobSection(REF, job(), { transport: gh.transport });
  const seen = [];
  const r = await writeJobSection(REF, (existing) => { seen.push(existing); return { ...existing, updated: "2026-10-24T11:00:00Z" }; }, { transport: gh.transport });
  assert.equal(seen[0].state, "running");
  assert.equal(parseSection(gh.issue(REF).body).job.updated, "2026-10-24T11:00:00Z");
  assert.equal(r.job.updated, "2026-10-24T11:00:00Z");
  const none = world();
  let first;
  await writeJobSection(REF, (e) => { first = e; return job(); }, { transport: none.transport });
  assert.equal(first, null);
});

test("refuses when the description changed since the caller read it (updatedAt or hash)", async () => {
  const gh = world();
  const r1 = await writeJobSection(REF, job(), { transport: gh.transport, expectedUpdatedAt: "2026-10-23T00:00:00Z" });
  assert.deepEqual([r1.ok, r1.error.code], [false, "CONFLICT"]);
  const r2 = await writeJobSection(REF, job(), { transport: gh.transport, expectedBodyHash: bodyHash("other") });
  assert.equal(r2.error.code, "CONFLICT");
  assert.deepEqual(gh.writes, []);
  const ok = await writeJobSection(REF, job(), { transport: gh.transport, expectedUpdatedAt: "2026-10-24T08:00:00Z", expectedBodyHash: bodyHash("Problem\n\nText\n") });
  assert.equal(ok.ok, true);
});

test("refuses when someone edits between our read and our write", async () => {
  const gh = world();
  let reads = 0;
  gh.hooks.PlanJobIssue = () => { if (++reads === 2) { const i = gh.issue(REF); i.body += "late edit by a human\n"; i.updatedAt = "2026-10-24T08:00:30Z"; } };
  const r = await writeJobSection(REF, job(), { transport: gh.transport });
  assert.deepEqual([r.ok, r.error.code], [false, "CONFLICT"]);
  assert.deepEqual(gh.writes, []);
  assert.ok(gh.issue(REF).body.endsWith("late edit by a human\n"));
});

test("typed errors: bad markers, invalid job, no rights, missing issue, bad reference, no transport", async () => {
  const broken = world(`x\n${START}\nno end`);
  const a = await writeJobSection(REF, job(), { transport: broken.transport });
  assert.deepEqual([a.ok, a.error.code], [false, "BAD_MARKERS"]);
  const b = await writeJobSection(REF, job({ state: "flying" }), { transport: world().transport });
  assert.equal(b.error.code, "BAD_REQUEST");
  assert.ok(b.error.detail.problems.some((p) => /state/.test(p)));
  const c = await writeJobSection(REF, job(), { transport: world("x", { canUpdate: false }).transport });
  assert.equal(c.error.code, "NO_WRITE_RIGHTS");
  const d = await writeJobSection(`${REPO}#999`, job(), { transport: world().transport });
  assert.equal(d.error.code, "NOT_FOUND");
  assert.equal((await writeJobSection("nope", job(), { transport: world().transport })).error.code, "BAD_REQUEST");
  assert.equal((await writeJobSection(REF, job(), {})).error.code, "BAD_REQUEST");
  for (const code of ["BAD_MARKERS"]) assert.ok(ERROR_CODES.includes(code));
});

test("GitHub failing on read or write is a typed error, never an exception", async () => {
  const gh = world();
  gh.readError("PlanJobIssue", "FORBIDDEN");
  assert.equal((await writeJobSection(REF, job(), { transport: gh.transport })).error.code, "NO_WRITE_RIGHTS");
  const gh2 = world();
  gh2.respond.PlanSetBody = () => ({ data: null, errors: [{ type: "INTERNAL", message: "boom" }] });
  const r = await writeJobSection(REF, job(), { transport: gh2.transport });
  assert.deepEqual([r.ok, r.error.code], [false, "GITHUB_ERROR"]);
  const gh3 = world();
  gh3.transport = async () => { throw new Error("offline"); };
  assert.equal((await writeJobSection(REF, job(), { transport: gh3.transport })).error.code, "TRANSPORT");
});
