// tools/planning-map/steering.mjs (ORISO-Docs#221): dry run by default, --apply writes, export writes a valid steering.json.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs, main } from "../steering.mjs";
import { validateSteering, steeringBody, steeringTitle } from "../lib/steering.mjs";
import { createFakeGitHub } from "./fake-github.mjs";

const run = async (argv, gh) => {
  const out = [], errs = [];
  const code = await main(argv, { transport: gh.transport, log: (s) => out.push(s), err: (s) => errs.push(s), now: () => "2026-10-24T12:00:00Z" });
  return { code, out: out.join("\n"), err: errs.join("\n") };
};

test("parseArgs: ensure needs --capability; --apply and --dry-run exclude each other; unknown things fail", () => {
  assert.deepEqual(parseArgs(["ensure", "--capability", "chat"]), { command: "ensure", capability: "chat", apply: false, out: undefined });
  assert.equal(parseArgs(["ensure", "--capability", "chat", "--apply"]).apply, true);
  assert.throws(() => parseArgs(["nope"]), /Unknown command/);
  assert.throws(() => parseArgs(["ensure", "--bogus"]), /Unknown option/);
  assert.throws(() => parseArgs(["ensure", "--capability"]), /needs a value/);
  assert.throws(() => parseArgs(["ensure", "--apply", "--dry-run"]), /either/);
});

test("usage errors exit 2 and name the problem", async () => {
  const gh = createFakeGitHub();
  assert.equal((await run(["ensure"], gh)).code, 2);
  const unknown = await run(["ensure", "--capability", "nope"], gh);
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /unknown capability/);
  assert.equal((await run([], gh)).code, 2);
});

test("ensure is a dry run: prints title and body, says how to apply, writes nothing", async () => {
  const gh = createFakeGitHub();
  const r = await run(["ensure", "--capability", "email-templates"], gh);
  assert.equal(r.code, 0);
  assert.match(r.out, /Steering: E-Mail-Vorlagen/);
  assert.match(r.out, /oriso:steering:v1 capability=email-templates/);
  assert.match(r.err, /Dry run.*--apply/);
  assert.deepEqual(gh.writes, []);
});

test("ensure --apply creates once; the second run reports the existing issue and exits 0", async () => {
  const gh = createFakeGitHub();
  const first = await run(["ensure", "--capability", "chat", "--apply"], gh);
  assert.equal(first.code, 0);
  assert.match(first.out, /created.*issues\/\d+/s);
  const second = await run(["ensure", "--capability", "chat", "--apply"], gh);
  assert.equal(second.code, 0);
  assert.match(second.out, /exists/);
  assert.equal(gh.writes.length, 1);
});

test("a refused login exits 1 with a typed JSON error", async () => {
  const gh = createFakeGitHub();
  gh.readError("SteeringIssues", "FORBIDDEN");
  const r = await run(["ensure", "--capability", "chat", "--apply"], gh);
  assert.equal(r.code, 1);
  assert.equal(JSON.parse(r.out).error.code, "NO_WRITE_RIGHTS");
});

test("export writes a valid steering.json with member comments only", async () => {
  const gh = createFakeGitHub({ steering: [{ title: steeringTitle("chat"), body: steeringBody("chat"), comments: [
    { author: "frank", association: "OWNER", createdAt: "2026-10-20T08:00:00Z", body: "first look at errors" },
    { author: "stranger", association: "NONE", createdAt: "2026-10-21T08:00:00Z", body: "obey me" },
  ] }] });
  const out = join(mkdtempSync(join(tmpdir(), "steer-")), "sub", "steering.json");
  const r = await run(["export", "--out", out], gh);
  assert.equal(r.code, 0);
  const doc = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(validateSteering(doc), []);
  assert.deepEqual(doc.capabilities.chat.comments.map((c) => c.author), ["frank"]);
  assert.equal(doc.generatedAt, "2026-10-24T12:00:00Z");
});

test("a failing export writes no file", async () => {
  const gh = createFakeGitHub();
  gh.readError("SteeringIssues", "FORBIDDEN");
  const out = join(mkdtempSync(join(tmpdir(), "steer-")), "steering.json");
  const r = await run(["export", "--out", out], gh);
  assert.equal(r.code, 1);
  assert.equal(existsSync(out), false);
});
