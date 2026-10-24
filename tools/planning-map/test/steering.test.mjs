// Human steering (ORISO-Docs#221, epic #213): one steering issue per capability, member comments exported, agent input.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFakeGitHub } from "./fake-github.mjs";
import { ensureSteering, exportSteering, steeringFor, steeringTitle, steeringBody, parseMarker, validateSteering, MEMBER_ASSOCIATIONS, MAX_BODY, MAX_COMMENTS } from "../lib/steering.mjs";

const NOW = "2026-10-24T12:00:00Z";
const REPO = "OpenResilienceInitiative/ORISO-Docs";
const at = (d) => `2026-10-${String(d).padStart(2, "0")}T08:00:00Z`;
const c = (author, association, d, body = `text of ${author}`, extra = {}) => ({ author, association, createdAt: at(d), body, ...extra });
const issueFor = (id, comments = [], extra = {}) => ({ title: steeringTitle(id), body: steeringBody(id), comments, ...extra });

// ───── title and marker ─────
test("the title names the capability and the body carries a hidden marker with its id", () => {
  assert.equal(steeringTitle("email-templates"), "Steering: E-Mail-Vorlagen");
  assert.match(steeringBody("email-templates"), /<!-- oriso:steering:v1 capability=email-templates -->/);
  assert.equal(parseMarker(steeringBody("email-templates")), "email-templates");
  assert.equal(parseMarker("no marker here"), null);
  assert.equal(parseMarker("<!-- oriso:steering:v1 capability=Bad Id -->"), null);
  assert.throws(() => steeringTitle("not-a-capability"), /unknown capability/);
});

// ───── ensure ─────
test("ensure is a dry run by default: it says what it would create and writes nothing", async () => {
  const gh = createFakeGitHub();
  const r = await ensureSteering("email-templates", { transport: gh.transport });
  assert.equal(r.ok, true);
  assert.equal(r.action, "create");
  assert.equal(r.wrote, false);
  assert.equal(r.title, "Steering: E-Mail-Vorlagen");
  assert.equal(parseMarker(r.body), "email-templates");
  assert.deepEqual(gh.writes, []);
});

test("ensure --apply creates the issue with title, label and marker; a second call finds it and writes nothing", async () => {
  const gh = createFakeGitHub();
  const first = await ensureSteering("email-templates", { transport: gh.transport, dryRun: false });
  assert.equal(first.ok, true);
  assert.equal(first.action, "created");
  assert.equal(first.wrote, true);
  assert.match(first.issue.url, /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/\d+$/);
  assert.equal(gh.writes.length, 1);
  assert.equal(gh.writes[0].value.title, "Steering: E-Mail-Vorlagen");
  assert.equal(parseMarker(gh.writes[0].value.body), "email-templates");
  const again = await ensureSteering("email-templates", { transport: gh.transport, dryRun: false });
  assert.equal(again.action, "exists");
  assert.equal(again.issue.number, first.issue.number);
  assert.equal(gh.writes.length, 1, "no second issue");
});

test("lookup goes by the marker, not by the title: a renamed or closed issue is still the one", async () => {
  const gh = createFakeGitHub({ steering: [
    { number: 40, title: "Mail templates, the long thread", body: `Notes\n\n${steeringBody("email-templates")}`, state: "CLOSED" },
    { number: 41, ...issueFor("chat", []), title: "Steering: E-Mail-Vorlagen" }, // same title, other capability
  ] });
  const r = await ensureSteering("email-templates", { transport: gh.transport, dryRun: false });
  assert.equal(r.action, "exists");
  assert.equal(r.issue.number, 40);
  assert.equal(r.issue.state, "CLOSED");
  assert.deepEqual(gh.writes, []);
});

test("a missing label is created first on --apply and reported in the dry run", async () => {
  const gh = createFakeGitHub({ labelExists: false });
  const dry = await ensureSteering("chat", { transport: gh.transport });
  assert.equal(dry.createsLabel, true);
  assert.deepEqual(gh.writes, []);
  const r = await ensureSteering("chat", { transport: gh.transport, dryRun: false });
  assert.equal(r.ok, true);
  assert.deepEqual(gh.writes.map((w) => w.kind), ["label", "steering-issue"]);
});

test("ensure refuses an unknown capability and reports transport trouble as typed errors", async () => {
  const gh = createFakeGitHub();
  const bad = await ensureSteering("nope", { transport: gh.transport });
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, "BAD_REQUEST");
  gh.readError("SteeringIssues", "FORBIDDEN");
  const denied = await ensureSteering("chat", { transport: gh.transport, dryRun: false });
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, "NO_WRITE_RIGHTS");
  const boom = await ensureSteering("chat", { transport: async () => { throw new Error("offline"); } });
  assert.equal(boom.error.code, "TRANSPORT");
});

// ───── export ─────
test("export keeps only OWNER, MEMBER and COLLABORATOR comments, newest first, with author, date, url and association", async () => {
  const comments = [
    c("frank", "OWNER", 20), c("nikunj", "MEMBER", 21), c("hassan", "COLLABORATOR", 22),
    c("drive-by", "NONE", 23), c("newbie", "FIRST_TIME_CONTRIBUTOR", 23), c("first", "FIRST_TIMER", 23),
    c("patch-person", "CONTRIBUTOR", 23), c("ghosted", "MANNEQUIN", 23),
  ];
  const gh = createFakeGitHub({ steering: [issueFor("email-templates", comments)] });
  const { doc, warnings } = await exportSteering(gh.transport, { now: NOW });
  assert.deepEqual(warnings, []);
  assert.deepEqual(validateSteering(doc), []);
  const e = doc.capabilities["email-templates"];
  assert.deepEqual(e.comments.map((x) => x.author), ["hassan", "nikunj", "frank"]);
  assert.deepEqual(e.comments.map((x) => x.authorAssociation), ["COLLABORATOR", "MEMBER", "OWNER"]);
  assert.equal(e.comments[0].createdAt, at(22));
  assert.match(e.comments[0].url, /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/\d+#issuecomment-\d+$/);
  assert.equal(e.comments[0].body, "text of hassan");
  assert.equal(e.skipped, 5, "outside comments are counted, never shown");
  assert.equal(JSON.stringify(doc).includes("drive-by"), false, "no trace of an outside account");
  assert.deepEqual(MEMBER_ASSOCIATIONS, ["OWNER", "MEMBER", "COLLABORATOR"]);
});

test("bots, hidden (minimized) comments and deleted accounts are not steering, even with a member association", async () => {
  const gh = createFakeGitHub({ steering: [issueFor("chat", [
    c("github-actions", "MEMBER", 20, "ci", { bot: true }), c("frank", "OWNER", 21, "hidden spam", { minimized: true }),
    c("ghost", "MEMBER", 22, "deleted", { author: null }), c("frank", "OWNER", 23, "real"),
  ])] });
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  assert.deepEqual(doc.capabilities.chat.comments.map((x) => x.body), ["real"]);
});

test("long comments are cut at the cap and flagged; control characters are removed; markup stays text", async () => {
  const long = "x".repeat(MAX_BODY + 500);
  const gh = createFakeGitHub({ steering: [issueFor("chat", [c("frank", "OWNER", 20, long), c("frank", "OWNER", 21, "a\u0000b\u0007c\nline <img src=x onerror=alert(1)>")])] });
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  const [short, cut] = doc.capabilities.chat.comments;
  assert.equal(short.body, "abc\nline <img src=x onerror=alert(1)>");
  assert.equal(short.truncated, false);
  assert.equal(cut.truncated, true);
  assert.ok(cut.body.length <= MAX_BODY);
  assert.ok(cut.body.endsWith("…"));
});

test("paging: comments and issues beyond the first page are read; only the newest MAX_COMMENTS are kept", async () => {
  const many = Array.from({ length: MAX_COMMENTS + 7 }, (_, i) => c("frank", "OWNER", 1 + (i % 28), `n${i}`, { createdAt: `2026-09-${String(1 + Math.floor(i / 24)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00:00Z` }));
  const gh = createFakeGitHub({ steering: [issueFor("chat", many), issueFor("branding", [c("frank", "MEMBER", 20)]), issueFor("deletion", [c("hassan", "MEMBER", 20)])] });
  gh.commentPageSize = 3;
  gh.issuePageSize = 2;
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  assert.deepEqual(Object.keys(doc.capabilities).sort(), ["branding", "chat", "deletion"]);
  assert.equal(doc.capabilities.chat.comments.length, MAX_COMMENTS);
  assert.equal(doc.capabilities.chat.comments[0].body, `n${MAX_COMMENTS + 6}`, "newest first");
  assert.equal(doc.capabilities.chat.skipped, 0);
  assert.equal(doc.capabilities.chat.omitted, 7, "older member comments beyond the cap are counted");
});

test("issues without a valid marker, with an unknown capability or without the label are ignored with a warning; duplicates take the lowest number", async () => {
  const gh = createFakeGitHub({ steering: [
    { number: 50, title: "Steering: no marker", body: "nothing", comments: [c("frank", "OWNER", 20)] },
    { number: 51, title: "x", body: "<!-- oriso:steering:v1 capability=invented -->", comments: [c("frank", "OWNER", 20)] },
    { number: 52, ...issueFor("chat", [c("frank", "OWNER", 20, "second")]) },
    { number: 53, ...issueFor("chat", [c("frank", "OWNER", 20, "first")]) },
    { number: 54, ...issueFor("branding", [c("frank", "OWNER", 20)]), labels: [] },
  ] });
  const { doc, warnings } = await exportSteering(gh.transport, { now: NOW });
  assert.deepEqual(Object.keys(doc.capabilities), ["chat"]);
  assert.equal(doc.capabilities.chat.issue.number, 52);
  assert.equal(warnings.length, 3);
  assert.ok(warnings.some((w) => /#50/.test(w)) && warnings.some((w) => /invented/.test(w)) && warnings.some((w) => /#53/.test(w)));
});

test("an unreadable steering list is an error, not an empty export", async () => {
  const gh = createFakeGitHub();
  gh.readError("SteeringIssues", "FORBIDDEN");
  await assert.rejects(exportSteering(gh.transport, { now: NOW }), /FORBIDDEN|not accessible/i);
});

// ───── schema ─────
test("the schema refuses a tampered file: an outside association, a non-https link, an unknown capability", async () => {
  const gh = createFakeGitHub({ steering: [issueFor("chat", [c("frank", "OWNER", 20)])] });
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  const mutate = (f) => { const d = JSON.parse(JSON.stringify(doc)); f(d); return validateSteering(d); };
  assert.ok(mutate((d) => { d.capabilities.chat.comments[0].authorAssociation = "NONE"; }).length > 0);
  assert.ok(mutate((d) => { d.capabilities.chat.comments[0].url = "javascript:alert(1)"; }).length > 0);
  assert.ok(mutate((d) => { d.capabilities.chat.issue.url = "http://github.com/x/y/issues/1"; }).length > 0);
  assert.ok(mutate((d) => { d.capabilities.invented = d.capabilities.chat; }).length > 0);
  assert.ok(mutate((d) => { d.extra = 1; }).length > 0);
});

// ───── agent input ─────
test("steeringFor(capabilityId) returns the member comments of that capability, newest first, and [] when there is none", async () => {
  const gh = createFakeGitHub({ steering: [issueFor("chat", [c("frank", "OWNER", 20, "look at error handling first"), c("nikunj", "MEMBER", 22, "do not touch before the release")])] });
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  const got = steeringFor("chat", { doc });
  assert.deepEqual(got.map((x) => x.body), ["do not touch before the release", "look at error handling first"]);
  assert.deepEqual(Object.keys(got[0]).sort(), ["author", "authorAssociation", "body", "createdAt", "truncated", "url"]);
  assert.deepEqual(steeringFor("branding", { doc }), []);
  assert.throws(() => steeringFor("invented", { doc }), /unknown capability/);
});

test("steeringFor reads a steering.json file and never returns outside comments, even from a hand-edited file", async () => {
  const gh = createFakeGitHub({ steering: [issueFor("chat", [c("frank", "OWNER", 20)])] });
  const { doc } = await exportSteering(gh.transport, { now: NOW });
  const dir = mkdtempSync(join(tmpdir(), "steering-"));
  const file = join(dir, "steering.json");
  writeFileSync(file, JSON.stringify(doc));
  assert.equal(steeringFor("chat", { file }).length, 1);
  doc.capabilities.chat.comments.push({ ...doc.capabilities.chat.comments[0], author: "evil", authorAssociation: "NONE" });
  writeFileSync(file, JSON.stringify(doc));
  assert.throws(() => steeringFor("chat", { file }), /invalid/);
  assert.throws(() => steeringFor("chat", { file: join(dir, "missing.json") }), /steering\.json/);
  assert.throws(() => steeringFor("chat", {}), /steering\.json/, "no silent empty answer without a source");
});
