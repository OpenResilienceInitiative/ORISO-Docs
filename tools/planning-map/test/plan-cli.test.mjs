import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, main, ghTransport } from "../plan.mjs";
import { createFakeGitHub, ORG } from "./fake-github.mjs";
import { GATE_NAMES } from "../lib/gate.mjs";

const FE = `${ORG}/ORISO-Frontend`;
const world = () => createFakeGitHub({ issues: [{ repository: FE, number: 2, release: null }, { repository: FE, number: 3, release: "v2.0.12" }] });
const run = async (argv, gh) => {
  const lines = [];
  const code = await main(argv, { transport: gh.transport, log: (s) => lines.push(s) });
  return { code, out: lines.length ? JSON.parse(lines.join("\n")) : null };
};

test("parseArgs reads the assign-release flags", () => {
  assert.deepEqual(parseArgs(["assign-release", "--issue", "ORISO-Frontend#2", "--issue", `${FE}#3`, "--release", "v2.0.12", "--with-sub-issues", "--expect", "none"]), {
    command: "assign-release", issues: ["ORISO-Frontend#2", `${FE}#3`], release: "v2.0.12", withSubIssues: true, expect: null, apply: false,
  });
});

test("parseArgs rejects --apply together with --dry-run and unknown flags", () => {
  assert.throws(() => parseArgs(["assign-release", "--apply", "--dry-run"]), /either/);
  assert.throws(() => parseArgs(["assign-release", "--bogus"]), /Unknown option/);
  assert.throws(() => parseArgs(["nope"]), /Unknown command/);
});

test("default is a dry run: it plans and writes nothing", async () => {
  const gh = world();
  const { code, out } = await run(["assign-release", "--issue", "ORISO-Frontend#2", "--release", "v2.0.13"], gh);
  assert.equal(code, 0);
  assert.equal(out.dryRun, true);
  assert.deepEqual(out.runs[0].results.map((r) => [r.changed, r.wrote]), [[true, false]]);
  assert.deepEqual(gh.writes, []);
});

test("--apply writes", async () => {
  const gh = world();
  const { code, out } = await run(["assign-release", "--issue", "ORISO-Frontend#2", "--release", "v2.0.13", "--apply"], gh);
  assert.equal(code, 0);
  assert.equal(out.dryRun, false);
  assert.deepEqual(gh.writes.map((w) => w.issue), [`${FE}#2`]);
});

test("--expect turns a stale board into a conflict and exit code 1", async () => {
  const gh = world();
  const { code, out } = await run(["assign-release", "--issue", "ORISO-Frontend#3", "--release", "v2.0.13", "--expect", "none", "--apply"], gh);
  assert.equal(code, 1);
  assert.equal(out.runs[0].error.code, "CONFLICT");
  assert.deepEqual(gh.writes, []);
});

test("a usage error is exit code 2 and prints the reason", async () => {
  const errs = [];
  const code = await main(["assign-release", "--release", "v1"], { transport: world().transport, log: () => {}, err: (s) => errs.push(s) });
  assert.equal(code, 2);
  assert.match(errs.join(""), /--issue/);
});

test("ghTransport shells out to `gh api graphql` with the request body on stdin, no shell involved", async () => {
  const seen = [];
  const t = ghTransport({ exec: (file, args, opts) => { seen.push({ file, args, opts }); return JSON.stringify({ data: { ok: 1 } }); } });
  assert.deepEqual(await t("query Q { x }", { a: 1 }), { data: { ok: 1 } });
  assert.equal(seen[0].file, "gh");
  assert.deepEqual(seen[0].args, ["api", "graphql", "--input", "-"]);
  assert.deepEqual(JSON.parse(seen[0].opts.input), { query: "query Q { x }", variables: { a: 1 } });
});

test("ghTransport hands back GraphQL errors that gh reports with a non-zero exit", async () => {
  const t = ghTransport({ exec: () => { const e = new Error("exit 1"); e.stdout = JSON.stringify({ data: null, errors: [{ type: "FORBIDDEN", message: "nope" }] }); throw e; } });
  assert.equal((await t("q", {})).errors[0].type, "FORBIDDEN");
});

// ───── set-gate (ORISO-Docs#211) ─────
const gateWorld = () => createFakeGitHub({ gateOptions: GATE_NAMES, issues: [{ repository: FE, number: 2, gate: null }] });

test("parseArgs reads the set-gate flags", () => {
  assert.deepEqual(parseArgs(["set-gate", "--issue", "ORISO-Frontend#2", "--gate", "R3 Human review", "--expect", "none"]), {
    command: "set-gate", issues: ["ORISO-Frontend#2"], gate: "R3 Human review", expect: null, apply: false,
  });
});

test("set-gate is a dry run by default and writes only with --apply", async () => {
  const gh = gateWorld();
  let r = await run(["set-gate", "--issue", "ORISO-Frontend#2", "--gate", "P4 Ready for agent"], gh);
  assert.deepEqual([r.code, r.out.dryRun, gh.writes.length], [0, true, 0]);
  r = await run(["set-gate", "--issue", "ORISO-Frontend#2", "--gate", "P4 Ready for agent", "--apply"], gh);
  assert.deepEqual([r.code, gh.writes], [0, [{ kind: "gate", issue: `${FE}#2`, value: "P4 Ready for agent" }]]);
});

test("set-gate without the Gate field exits 1 with FIELD_MISSING", async () => {
  const gh = createFakeGitHub({ gateOptions: null, issues: [{ repository: FE, number: 2 }] });
  const r = await run(["set-gate", "--issue", "ORISO-Frontend#2", "--gate", "P1 Framed", "--apply"], gh);
  assert.equal(r.code, 1);
  assert.equal(r.out.runs[0].error.code, "FIELD_MISSING");
});

test("set-gate needs --gate", async () => {
  const errs = [];
  assert.equal(await main(["set-gate", "--issue", "x#1"], { transport: gateWorld().transport, log: () => {}, err: (s) => errs.push(s) }), 2);
  assert.match(errs.join(""), /--gate/);
});
