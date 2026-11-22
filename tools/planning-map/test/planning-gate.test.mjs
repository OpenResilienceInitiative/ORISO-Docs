import test from "node:test";
import assert from "node:assert/strict";
import { setGate } from "../lib/planning-api.mjs";
import { GATE_NAMES } from "../lib/gate.mjs";
import { createFakeGitHub, ORG, PROJECT_ID } from "./fake-github.mjs";

const FE = `${ORG}/ORISO-Frontend`;
const world = (over = {}) =>
  createFakeGitHub({
    gateOptions: GATE_NAMES,
    issues: [
      { repository: FE, number: 1, gate: "P3 Sliced" },
      { repository: FE, number: 2, gate: null },
      { repository: FE, number: 3, onBoard: false },
      { repository: FE, number: 4, canUpdate: false, gate: "R1 Checks green" },
    ],
    ...over,
  });

test("setGate sets the single-select Gate on the project item; the result reports before and after", async () => {
  const gh = world();
  const r = await setGate(`${FE}#1`, "R3 Human review", { transport: gh.transport });
  assert.deepEqual(r, { ok: true, gate: "R3 Human review", dryRun: false, results: [{ issue: `${FE}#1`, role: "issue", before: "P3 Sliced", after: "R3 Human review", changed: true, wrote: true }] });
  assert.deepEqual(gh.writes, [{ kind: "gate", issue: `${FE}#1`, value: "R3 Human review" }]);
});

test("the write is updateProjectV2ItemFieldValue with the item id, field id and option id", async () => {
  const gh = world();
  await setGate(`${FE}#2`, "P4 Ready for agent", { transport: gh.transport });
  const w = gh.calls.find((c) => c.op === "PlanSetGate");
  assert.deepEqual(w.variables, { projectId: PROJECT_ID, itemId: "PVTI_2", fieldId: "PVTSSF_gate", optionId: "OPT_G3" });
});

test("an issue that already has the gate is left alone", async () => {
  const gh = world();
  const r = await setGate(`${FE}#1`, "P3 Sliced", { transport: gh.transport });
  assert.deepEqual([r.ok, r.results[0].changed, r.results[0].wrote], [true, false, false]);
  assert.deepEqual(gh.writes, []);
});

test("the Gate field does not exist yet (today's board): FIELD_MISSING, nothing written", async () => {
  const gh = world({ gateOptions: null });
  const r = await setGate(`${FE}#1`, "P4 Ready for agent", { transport: gh.transport });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, "FIELD_MISSING");
  assert.match(r.error.message, /gate-options\.json/);
  assert.deepEqual(gh.writes, []);
});

test("a gate value the board does not have is UNKNOWN_GATE and lists the live names", async () => {
  const gh = world();
  const r = await setGate(`${FE}#1`, "R9 Nonsense", { transport: gh.transport });
  assert.equal(r.error.code, "UNKNOWN_GATE");
  assert.deepEqual(r.error.detail.known, GATE_NAMES);
});

test("an issue that is not on the ORISO Roadmap is NOT_ON_BOARD", async () => {
  const r = await setGate(`${FE}#3`, "P1 Framed", { transport: world().transport });
  assert.equal(r.error.code, "NOT_ON_BOARD");
});

test("an unknown issue is NOT_FOUND", async () => {
  assert.equal((await setGate(`${FE}#99`, "P1 Framed", { transport: world().transport })).error.code, "NOT_FOUND");
});

test("no write rights on the project: typed NO_WRITE_RIGHTS from the write itself", async () => {
  const gh = world();
  const r = await setGate(`${FE}#4`, "R2 AI review", { transport: gh.transport });
  assert.equal(r.error.code, "NO_WRITE_RIGHTS");
  assert.equal(r.error.issue, `${FE}#4`);
  assert.deepEqual(r.applied, []);
  assert.deepEqual(gh.writes, []);
});

test("conflict: GitHub has another gate than the one the board showed", async () => {
  const gh = world();
  const r = await setGate(`${FE}#1`, "R1 Checks green", { expectedGate: "P4 Ready for agent", transport: gh.transport });
  assert.equal(r.error.code, "CONFLICT");
  assert.deepEqual(r.error.detail, { expected: "P4 Ready for agent", actual: "P3 Sliced" });
  assert.deepEqual(gh.writes, []);
  assert.equal((await setGate(`${FE}#2`, "P1 Framed", { expectedGate: null, transport: gh.transport })).ok, true);
});

test("dry run reads and plans without calling the write", async () => {
  const gh = world();
  const r = await setGate(`${FE}#1`, "R2 AI review", { dryRun: true, transport: gh.transport });
  assert.deepEqual([r.ok, r.dryRun, r.results[0].changed, r.results[0].wrote], [true, true, true, false]);
  assert.ok(!gh.calls.some((c) => c.op === "PlanSetGate"));
});

test("transport failure and bad references are typed", async () => {
  assert.equal((await setGate(`${FE}#1`, "P1 Framed", { transport: async () => { throw new Error("offline"); } })).error.code, "TRANSPORT");
  assert.equal((await setGate("nonsense", "P1 Framed", { transport: world().transport })).error.code, "BAD_REQUEST");
});
