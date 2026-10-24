// sendHealthCheck (ORISO-Docs#220, epic #213; spec stories 22 and 29): seam 2 against the fake GitHub, and plan.mjs health-check.
import test from "node:test";
import assert from "node:assert/strict";
import { criteriaVersion } from "../../understand-anything/platform/lib/health-run.mjs";
import { sendHealthCheck, healthCheckMarker, healthCheckCommand, healthRunCommand, parseHealthCheckMarker, ERROR_CODES } from "../lib/planning-api.mjs";
import { main, parseArgs } from "../plan.mjs";
import { createFakeGitHub } from "./fake-github.mjs";

const criteria = { matched: "frontend", version: "0123456789ab", chain: ["frontend", "default"], metrics: { crap: { threshold: 30, weight: 2 }, size: { threshold: 400, weight: 1 } }, tests: { list: [] }, instruction: { text: "Judge by the numbers." } };
const scope = { capability: "chat", repo: "ORISO-Frontend", path: "src/components/chat" };

test("dry run plans the issue and writes nothing", async () => {
  const gh = createFakeGitHub();
  const r = await sendHealthCheck(scope, criteria, { transport: gh.transport, dryRun: true });
  assert.equal(r.ok, true);
  assert.deepEqual([r.action, r.wrote, r.dryRun], ["create", false, true]);
  assert.equal(r.title, "Health check: chat / ORISO-Frontend / src/components/chat");
  assert.deepEqual(gh.writes, []);
});

test("it creates one issue in ORISO-Docs that names the scope, the criteria version and the exact command", async () => {
  const gh = createFakeGitHub();
  const r = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  assert.deepEqual([r.ok, r.action, r.wrote], [true, "created", true]);
  assert.match(r.issue.url, /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/\d+$/);
  assert.equal(gh.writes.length, 1);
  const body = gh.writes[0].value.body;
  assert.equal(parseHealthCheckMarker(body), "chat/ORISO-Frontend/src/components/chat");
  assert.ok(body.includes(`Criteria version: \`${criteriaVersion(criteria).slice(0, 12)}\``));
  assert.match(body, /crap/);
  assert.ok(body.includes(healthRunCommand(scope)));
  assert.match(body, /steering/i);
  assert.deepEqual(r.results.map((x) => [x.role, x.changed, x.wrote]), [["health-check", true, true]]);
});

test("asking twice for the same scope finds the open issue and writes nothing; another scope gets its own", async () => {
  const gh = createFakeGitHub();
  const a = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  const again = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  assert.deepEqual([again.ok, again.action, again.wrote, again.issue.number], [true, "exists", false, a.issue.number]);
  assert.equal(gh.writes.length, 1);
  const other = await sendHealthCheck({ ...scope, path: null }, criteria, { transport: gh.transport });
  assert.equal(other.action, "created");
  assert.equal(gh.writes.length, 2);
});

test("a closed request does not block a new one (the old check is done)", async () => {
  const gh = createFakeGitHub();
  const a = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  gh.healthIssues.find((i) => i.number === a.issue.number).state = "CLOSED";
  const b = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  assert.equal(b.action, "created");
  assert.notEqual(b.issue.number, a.issue.number);
});

test("a marker in someone else's text for another scope is not mistaken for the request (search is fuzzy)", async () => {
  const gh = createFakeGitHub({ healthIssues: [{ number: 700, title: "Health check: chat / ORISO-Frontend", body: `${healthCheckMarker({ capability: "chat", repo: "ORISO-Frontend", path: null })}` }] });
  const r = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  assert.equal(r.action, "created");
});

test("bad scopes are refused before any call: unknown capability, unknown repository, path that leaves the repository", async () => {
  const gh = createFakeGitHub();
  for (const bad of [{ ...scope, capability: "nope" }, { ...scope, repo: "ORISO-E2E" }, { ...scope, path: "../etc" }, { ...scope, path: "/abs" }, { ...scope, path: "a b" }, null, { capability: "chat" }]) {
    const r = await sendHealthCheck(bad, criteria, { transport: gh.transport });
    assert.equal(r.ok, false); assert.equal(r.error.code, "BAD_REQUEST");
  }
  assert.deepEqual(gh.calls, []);
  assert.equal((await sendHealthCheck(scope, criteria, {})).error.code, "BAD_REQUEST");
  assert.equal((await sendHealthCheck(scope, null, { transport: gh.transport })).error.code, "BAD_REQUEST");
});

test("typed errors from GitHub: no rights, transport failure", async () => {
  const gh = createFakeGitHub();
  gh.respond.PlanHealthCheckCreate = () => ({ data: null, errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }] });
  const denied = await sendHealthCheck(scope, criteria, { transport: gh.transport });
  assert.equal(denied.error.code, "NO_WRITE_RIGHTS");
  const down = await sendHealthCheck(scope, criteria, { transport: async () => { throw new Error("offline"); } });
  assert.equal(down.error.code, "TRANSPORT");
  assert.ok(ERROR_CODES.includes(down.error.code));
});

test("the run command in the request body names the scope (healthRunCommand)", () => {
  assert.equal(healthRunCommand({ capability: "chat", repo: "ORISO-Frontend", path: null }),
    "node tools/understand-anything/platform/health-run.mjs run --capability chat --repo ORISO-Frontend --checkout <path to your ORISO-Frontend checkout>");
  assert.equal(healthRunCommand(scope),
    "node tools/understand-anything/platform/health-run.mjs run --capability chat --repo ORISO-Frontend --path src/components/chat --checkout <path to your ORISO-Frontend checkout>");
});

// ---- plan.mjs health-check ----
const run = async (argv, gh) => {
  const lines = [], errs = [];
  const code = await main(argv, { transport: gh.transport, log: (s) => lines.push(s), err: (s) => errs.push(s) });
  return { code, lines, errs, out: lines.length && lines[0].startsWith("{") ? JSON.parse(lines.join("\n")) : null };
};

test("parseArgs reads the health-check flags", () => {
  assert.deepEqual(parseArgs(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend", "--path", "src/x", "--apply"]),
    { command: "health-check", capability: "chat", repo: "ORISO-Frontend", path: "src/x", apply: true });
  assert.deepEqual(parseArgs(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend"]).path, null);
  assert.throws(() => parseArgs(["health-check", "--issue", "x#1"]), /Unknown option|not for/);
});

test("plan.mjs health-check is a dry run by default and --apply writes", async () => {
  const gh = createFakeGitHub();
  const dry = await run(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend", "--path", "src/components/chat"], gh);
  assert.equal(dry.code, 0);
  assert.equal(dry.out.dryRun, true); assert.equal(dry.out.result.action, "create");
  assert.deepEqual(gh.writes, []);
  const wet = await run(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend", "--path", "src/components/chat", "--apply"], gh);
  assert.equal(wet.code, 0);
  assert.equal(wet.out.result.action, "created");
  assert.equal(gh.writes.length, 1);
});

test("plan.mjs health-check: missing flags and unknown scopes are usage errors (exit 2), GitHub errors exit 1", async () => {
  const gh = createFakeGitHub();
  assert.equal((await run(["health-check", "--capability", "chat"], gh)).code, 2);
  assert.equal((await run(["health-check", "--capability", "nope", "--repo", "ORISO-Frontend"], gh)).code, 2);
  gh.respond.PlanHealthCheckFind = () => ({ data: null, errors: [{ type: "FORBIDDEN", message: "Resource not accessible" }] });
  const denied = await run(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend"], gh);
  assert.equal(denied.code, 1); assert.equal(denied.out.result.error.code, "NO_WRITE_RIGHTS");
});

test("the dry run uses the real effective criteria of the scope", async () => {
  const gh = createFakeGitHub();
  const r = await run(["health-check", "--capability", "chat", "--repo", "ORISO-Frontend"], gh);
  assert.match(r.out.result.body, /Criteria version: `[0-9a-f]{12}`/);
  assert.match(r.out.result.body, /crap/, "frontend criteria add CRAP");
});

// ORISO-Docs#213 review (finding 16): the map shows the plan.mjs command that files the request; planning-api builds the same text,
// and plan.mjs parses it back into the same scope. (The comment in planning-api claimed this test existed; now it does.)
test("healthCheckCommand (the filing command) is the text the map shows, and plan.mjs parses it back", async () => {
  const { readFileSync } = await import("node:fs");
  const vm = await import("node:vm");
  const { parseArgs } = await import("../plan.mjs");
  const sandbox = {}; sandbox.self = sandbox;
  vm.runInNewContext(readFileSync(new URL("../../understand-anything/site/hub/map/views.js", import.meta.url), "utf8"), sandbox);
  for (const s of [{ capability: "chat", repo: "ORISO-Frontend", path: null }, scope, { capability: "email-templates", repo: "ORISO-UserService", path: "src/main/resources/templates" }]) {
    for (const apply of [false, true]) {
      const text = healthCheckCommand(s, apply);
      assert.equal(sandbox.MapViews.healthCheckCommand(s, apply), text, JSON.stringify(s));
      const o = parseArgs(text.replace(/^node tools\/planning-map\/plan\.mjs /, "").split(" "));
      assert.deepEqual([o.command, o.capability, o.repo, o.path ?? null, o.apply], ["health-check", s.capability, s.repo, s.path ?? null, apply]);
    }
  }
});
