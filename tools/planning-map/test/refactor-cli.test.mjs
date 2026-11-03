// plan.mjs propose-refactor (ORISO-Docs#222): flags, dry run by default, exit codes, record file.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs, main, COMMANDS } from "../plan.mjs";
import { createRefactorGitHub } from "./fake-refactor.mjs";
import { ORG } from "./fake-github.mjs";
import { createRunManifest } from "../lib/run-manifest.mjs";
import { parseCriteriaFile, validateCriteriaSet, resolveCriteria } from "../../understand-anything/platform/lib/health-criteria.mjs";
import { CAPABILITY_IDS, CODE_REPOS } from "../../understand-anything/platform/lib/capabilities.mjs";
import { buildRunRecord } from "../../understand-anything/platform/lib/health-run.mjs";

const EPIC = `${ORG}/ORISO-Docs#50`;
const SHA = "d".repeat(40);
const crit = validateCriteriaSet([parseCriteriaFile("---\nscope: \"*\"\nmetrics:\n  size: {threshold: 400, weight: 1}\n---\nx", "health/default.md")], { capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS });
const scope = { capability: "chat", repo: "ORISO-Frontend", path: null };
const rec = buildRunRecord({
  manifest: createRunManifest({ at: "2026-10-24T10:00:00Z", commits: { "ORISO-Frontend": SHA } }), scope, commit: SHA,
  effective: resolveCriteria(crit, { capability: "chat", path: "ORISO-Frontend/" }), measurements: { size: { value: 900, source: "size", details: {} } }, startedAt: "2026-10-24T10:00:00Z",
});
const recFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "refactor-cli-")), "run.json");
fs.writeFileSync(recFile, JSON.stringify(rec));

const run = async (argv, gh) => {
  const lines = [], errs = [];
  const code = await main(argv, { transport: gh.transport, log: (s) => lines.push(s), err: (s) => errs.push(s) });
  return { code, out: lines.length ? JSON.parse(lines.join("\n")) : null, errs: errs.join("\n") };
};

test("propose-refactor is a command and parses its flags", () => {
  assert.ok(COMMANDS.includes("propose-refactor"));
  assert.deepEqual(parseArgs(["propose-refactor", "--scope", "chat:ORISO-Frontend", "--epic", EPIC, "--record", "r.json"]),
    { command: "propose-refactor", scope: "chat:ORISO-Frontend", epic: EPIC, record: "r.json", apply: false });
  assert.deepEqual(parseArgs(["propose-refactor", "--scope", "chat", "--epic", EPIC, "--apply"]),
    { command: "propose-refactor", scope: "chat", epic: EPIC, record: null, apply: true });
  assert.throws(() => parseArgs(["propose-refactor", "--apply", "--dry-run"]), /either/);
  assert.throws(() => parseArgs(["propose-refactor", "--issue", "x#1"]), /Unknown option/);
});

test("the other commands keep their parsed shape", () => {
  assert.deepEqual(parseArgs(["set-gate", "--issue", "ORISO-Frontend#2", "--gate", "P1 Framed"]), { command: "set-gate", issues: ["ORISO-Frontend#2"], gate: "P1 Framed", apply: false });
});

test("scope and epic are required: usage error, exit code 2", async () => {
  const gh = createRefactorGitHub();
  const a = await run(["propose-refactor", "--epic", EPIC], gh);
  assert.equal(a.code, 2);
  assert.match(a.errs, /--scope/);
  const b = await run(["propose-refactor", "--scope", "chat"], gh);
  assert.equal(b.code, 2);
  assert.match(b.errs, /--epic/);
});

test("default is a dry run: the plan is printed, nothing is written, exit 0", async () => {
  const gh = createRefactorGitHub();
  const { code, out, errs } = await run(["propose-refactor", "--scope", "chat:ORISO-Frontend", "--epic", EPIC, "--record", recFile], gh);
  assert.equal(code, 0);
  assert.equal(out.ok, true);
  assert.equal(out.dryRun, true);
  assert.equal(out.command, "propose-refactor");
  assert.equal(out.runs[0].action, "create");
  assert.match(out.runs[0].body, new RegExp(rec.run.runId));
  assert.deepEqual(gh.writes, []);
  assert.match(errs, /Dry run: nothing was written/);
});

test("--apply creates the task and says where it is", async () => {
  const gh = createRefactorGitHub();
  const { code, out } = await run(["propose-refactor", "--scope", "chat:ORISO-Frontend", "--epic", EPIC, "--record", recFile, "--apply"], gh);
  assert.equal(code, 0);
  assert.equal(out.dryRun, false);
  assert.equal(out.runs[0].action, "created");
  assert.equal(out.runs[0].issue.number, 700);
  assert.deepEqual(gh.writes.map((w) => w.kind), ["task", "sub-issue", "board"]);
});

test("a planning error is printed as typed JSON with exit code 1", async () => {
  const gh = createRefactorGitHub();
  gh.epic(EPIC).canUpdate = false;
  const { code, out } = await run(["propose-refactor", "--scope", "chat", "--epic", EPIC, "--apply"], gh);
  assert.equal(code, 1);
  assert.equal(out.ok, false);
  assert.equal(out.runs[0].error.code, "NO_WRITE_RIGHTS");
  assert.deepEqual(gh.writes, []);
});

test("a record file that cannot be read or is not JSON is a usage error", async () => {
  const gh = createRefactorGitHub();
  const missing = await run(["propose-refactor", "--scope", "chat", "--epic", EPIC, "--record", "/nonexistent/run.json"], gh);
  assert.equal(missing.code, 2);
  assert.match(missing.errs, /record/);
  const junk = path.join(path.dirname(recFile), "junk.json");
  fs.writeFileSync(junk, "{nope");
  const bad = await run(["propose-refactor", "--scope", "chat", "--epic", EPIC, "--record", junk], gh);
  assert.equal(bad.code, 2);
  assert.deepEqual(gh.writes, []);
});

test("a transport crash is still typed JSON and exit code 1", async () => {
  const lines = [];
  const code = await main(["propose-refactor", "--scope", "chat", "--epic", EPIC], { transport: async () => { throw new Error("boom"); }, log: (s) => lines.push(s), err: () => {} });
  assert.equal(code, 1);
  assert.equal(JSON.parse(lines.join("\n")).runs[0].error.code, "TRANSPORT");
});
