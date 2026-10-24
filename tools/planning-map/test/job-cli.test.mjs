// tools/planning-map/job.mjs report (ORISO-Docs#216): dry run by default, merge on what is there, typed exits.
import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, main } from "../job.mjs";
import { diffText, parseSection, START } from "../lib/job.mjs";
import { createFakeGitHub, ORG } from "./fake-github.mjs";

const REPO = `${ORG}/ORISO-Docs`;
const REF = `${REPO}#216`;
const NOW = "2026-10-24T09:30:00Z";
const world = (body = "Problem\n\nText\n") => createFakeGitHub({ issues: [{ repository: REPO, number: 216, body }] });
const run = async (argv, gh, now = NOW) => {
  const out = [];
  const errs = [];
  const code = await main(argv, { transport: gh.transport, log: (s) => out.push(s), err: (s) => errs.push(s), now: () => now });
  return { code, out: out.join("\n"), err: errs.join("\n") };
};

test("parseArgs reads the report flags; --branch and --pr repeat", () => {
  assert.deepEqual(parseArgs(["report", "--issue", "ORISO-Docs#216", "--state", "running", "--branch", "a", "--branch", "b", "--pr", "#5", "--report", "https://x.org/r", "--next", "tests", "--model", "m", "--machine", "mac", "--runner", "cloud", "--apply"]), {
    command: "report", issue: "ORISO-Docs#216", state: "running", branches: ["a", "b"], prs: ["#5"], report: "https://x.org/r", next: "tests", model: "m", machine: "mac", runner: "cloud",
    apply: true, expectUpdatedAt: undefined, expectHash: undefined,
  });
});

test("parseArgs rejects unknown commands and flags, a missing value, --apply with --dry-run", () => {
  assert.throws(() => parseArgs(["nope"]), /Unknown command/);
  assert.throws(() => parseArgs(["report", "--bogus"]), /Unknown option/);
  assert.throws(() => parseArgs(["report", "--state"]), /needs a value/);
  assert.throws(() => parseArgs(["report", "--apply", "--dry-run"]), /either/);
});

test("default is a dry run: prints the body diff and writes nothing", async () => {
  const gh = world();
  const { code, out, err } = await run(["report", "--issue", REF, "--state", "running", "--model", "claude-opus-5-5", "--next", "write tests"], gh);
  assert.equal(code, 0);
  assert.match(out, /appended/);
  assert.ok(out.split("\n").some((l) => l === "+" + START));
  assert.ok(out.split("\n").some((l) => l === "+state: running"));
  assert.ok(!out.split("\n").some((l) => /^-/.test(l)), "nothing is removed from the description");
  assert.match(err, /Dry run/);
  assert.deepEqual(gh.writes, []);
});

test("--apply writes the section and the rest of the description stays", async () => {
  const gh = world();
  const { code } = await run(["report", "--issue", REF, "--state", "running", "--branch", "feat/213-216-jobs", "--apply"], gh);
  assert.equal(code, 0);
  const body = gh.issue(REF).body;
  assert.ok(body.startsWith("Problem\n\nText\n\n" + START));
  const j = parseSection(body).job;
  assert.deepEqual([j.state, j.runner, j.machine, j.started, j.updated, j.branches], ["running", "local", null, NOW, NOW, ["feat/213-216-jobs"]]);
});

test("a later report keeps started, adds branches and prs without duplicates, and refreshes updated", async () => {
  const gh = world();
  await run(["report", "--issue", REF, "--state", "running", "--branch", "a", "--model", "m1", "--next", "step 1", "--apply"], gh);
  const r = await run(["report", "--issue", REF, "--state", "waiting-human", "--branch", "a", "--branch", "b", "--pr", `${REPO}#7`, "--next", "needs review", "--apply"], gh, "2026-10-24T12:00:00Z");
  assert.equal(r.code, 0);
  const j = parseSection(gh.issue(REF).body).job;
  assert.deepEqual([j.state, j.started, j.updated, j.branches, j.prs, j.model, j.next], ["waiting-human", NOW, "2026-10-24T12:00:00Z", ["a", "b"], [`${REPO}#7`], "m1", "needs review"]);
  assert.match(r.out, /replaced/);
  assert.ok(r.out.split("\n").some((l) => l === "-state: running") && r.out.split("\n").some((l) => l === "+state: waiting-human"));
});

test("a secret or host name in a flag is refused with exit 1 and nothing is written", async () => {
  for (const argv of [["--next", "token=abc123"], ["--machine", "box.fritz.box"], ["--report", "http://x.org"]]) {
    const gh = world();
    const { code, out } = await run(["report", "--issue", REF, "--state", "running", ...argv, "--apply"], gh);
    assert.equal(code, 1);
    assert.equal(JSON.parse(out).error.code, "BAD_REQUEST");
    assert.deepEqual(gh.writes, []);
  }
});

test("--expect-updated-at turns a changed description into a conflict (exit 1)", async () => {
  const gh = world();
  const { code, out } = await run(["report", "--issue", REF, "--state", "running", "--expect-updated-at", "2020-01-01T00:00:00Z", "--apply"], gh);
  assert.equal(code, 1);
  assert.equal(JSON.parse(out).error.code, "CONFLICT");
  assert.deepEqual(gh.writes, []);
});

test("usage errors are exit 2 and say why", async () => {
  const gh = world();
  assert.equal((await run(["report", "--state", "running"], gh)).code, 2);
  assert.match((await run(["report", "--issue", REF], gh)).err, /--state/);
  assert.match((await run(["report", "--issue", REF, "--state", "flying"], gh)).err, /state/);
  assert.equal((await run(["report", "--issue", "nope", "--state", "running"], gh)).code, 2);
});

test("diffText shows changed lines with two lines of context", () => {
  const a = "1\n2\n3\n4\n5\n6\n7\n";
  const b = "1\n2\n3\nX\n5\n6\n7\n";
  assert.equal(diffText(a, b), [" 2", " 3", "-4", "+X", " 5", " 6"].join("\n"));
  assert.equal(diffText(a, a), "");
});
