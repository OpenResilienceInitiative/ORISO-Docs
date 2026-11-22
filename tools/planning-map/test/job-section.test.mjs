// Job section in the issue description (ORISO-Docs#216): pure text seam. No GitHub involved.
import test from "node:test";
import assert from "node:assert/strict";
import { START, END, applySection, parseSection, renderSection, validateJob, bodyHash } from "../lib/job.mjs";

const job = (over = {}) => ({
  state: "running", runner: "local", machine: "mac-frank", started: "2026-10-24T08:00:00Z", updated: "2026-10-24T09:30:00Z",
  model: "claude-opus-5-5", branches: ["feat/213-216-jobs"], prs: ["OpenResilienceInitiative/ORISO-Docs#230"], next: "Run the hub tests", report: "https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/230", ...over,
});

test("render then parse gives the same job back", () => {
  const sec = renderSection(job());
  assert.ok(sec.startsWith(START + "\n") && sec.endsWith(END));
  assert.deepEqual(parseSection(`intro\n\n${sec}\n`).job, job());
});

test("the section is a readable summary plus a fenced yaml block", () => {
  const sec = renderSection(job());
  assert.match(sec, /Agent job: running/);
  assert.match(sec, /```yaml\nstate: running\nrunner: local\n/);
  assert.match(sec, /\n```\n/);
});

test("replacing keeps every byte outside the markers (LF and CRLF, unicode, trailing text)", () => {
  for (const nl of ["\n", "\r\n"]) {
    const before = `# Titel ä€ 😀${nl}${nl}Text mit  doppelten  Leerzeichen\t und Tab${nl}${nl}`;
    const after = `${nl}${nl}## Tail${nl}- [ ] x${nl}no final newline`;
    const body = before + renderSection(job({ state: "running" })).replace(/\n/g, nl) + after;
    const r = applySection(body, renderSection(job({ state: "done", updated: "2026-10-24T10:00:00Z" })));
    assert.equal(r.ok, true);
    assert.equal(r.mode, "replaced");
    assert.ok(r.body.startsWith(before) && r.body.endsWith(after));
    assert.equal(parseSection(r.body).job.state, "done");
    if (nl === "\r\n") assert.ok(!/[^\r]\n/.test(r.body), "new section uses the body's line endings");
  }
});

test("missing markers append the section and leave the old text as a prefix", () => {
  const body = "Problem\n\n- a\n";
  const r = applySection(body, renderSection(job()));
  assert.equal(r.mode, "appended");
  assert.ok(r.body.startsWith(body));
  assert.equal(r.body, body + "\n" + renderSection(job()));
  assert.equal(applySection("", renderSection(job())).body, renderSection(job()));
  assert.equal(applySection("no newline", renderSection(job())).body, "no newline\n\n" + renderSection(job()));
});

test("writing the same section twice changes nothing the second time", () => {
  const once = applySection("Text\n", renderSection(job())).body;
  const twice = applySection(once, renderSection(job()));
  assert.equal(twice.body, once);
  assert.equal(twice.mode, "unchanged");
});

test("markers that are only mentioned in text or in a fenced code block are not markers", () => {
  const body = `Use \`${START}\` and \`${END}\` as markers.\n\n\`\`\`md\n${START}\nexample\n${END}\n\`\`\`\n`;
  const r = applySection(body, renderSection(job()));
  assert.equal(r.mode, "appended");
  assert.ok(r.body.startsWith(body));
  assert.equal(parseSection(body), null);
});

test("broken markers refuse instead of guessing", () => {
  for (const body of [`a\n${START}\nno end`, `${END}\n${START}\n`, `${START}\n${END}\n${START}\n${END}\n`, `<!-- oriso:job:start v2 -->\nx\n${END}\n`]) {
    const r = applySection(body, renderSection(job()));
    assert.equal(r.ok, false, body);
    assert.equal(r.error.code, "BAD_MARKERS");
  }
});

test("parseSection: no section is null; a damaged yaml block reports problems, never throws", () => {
  assert.equal(parseSection("nothing here"), null);
  const bad = parseSection(`${START}\n\`\`\`yaml\nstate: flying\n\`\`\`\n${END}`);
  assert.equal(bad.job, null);
  assert.ok(bad.problems.some((p) => /state/.test(p)));
  assert.equal(parseSection(`${START}\ntext only\n${END}`).job, null);
});

test("validation: closed lists, no secrets, no hostnames, https report link", () => {
  assert.deepEqual(validateJob(job()), []);
  const bad = (over, re) => assert.ok(validateJob(job(over)).some((p) => re.test(p)), JSON.stringify(over));
  bad({ state: "flying" }, /state/);
  bad({ runner: "laptop" }, /runner/);
  bad({ updated: "yesterday" }, /updated/);
  bad({ machine: "frank-mbp.fritz.box" }, /machine/);
  bad({ machine: "10.0.0.5" }, /machine/);
  bad({ machine: "root@box" }, /machine/);
  bad({ next: "use ghp_abcdefghijklmnopqrstuvwxyz0123456789 to push" }, /secret/);
  bad({ next: "export GITHUB_TOKEN=abc123" }, /secret/);
  bad({ model: "sk-ant-api03-abcdefghijklmnop" }, /secret/);
  bad({ report: "http://example.org/r" }, /report/);
  bad({ report: "https://user:pw@example.org/r" }, /report/);
  bad({ report: "https://example.org/r?token=abc" }, /report/);
  bad({ branches: ["has space"] }, /branches/);
  bad({ prs: ["not a pr"] }, /prs/);
  bad({ next: "a\nb" }, /next/);
  bad({ next: "x <!-- oriso:job:end --> y" }, /next/);
  bad({ extra: 1 }, /extra/);
  assert.deepEqual(validateJob(job({ machine: null, model: null, next: null, report: null, branches: [], prs: [] })), []);
});

test("renderSection refuses an invalid job instead of writing it", () => {
  assert.throws(() => renderSection(job({ state: "flying" })), /state/);
});

test("bodyHash is stable and sensitive to every byte", () => {
  assert.equal(bodyHash("a"), bodyHash("a"));
  assert.notEqual(bodyHash("a"), bodyHash("a "));
  assert.match(bodyHash(""), /^[0-9a-f]{64}$/);
});

// ───── review of #216 (epic #213) ─────
test("a body that ends inside an open code fence is refused with BAD_MARKERS instead of appending into the fence", () => {
  for (const fence of ["```", "~~~~", "   ```js"]) {
    const body = `Intro\n\n${fence}\nconsole.log(1)\n`;
    const r = applySection(body, renderSection(job()));
    assert.equal(r.ok, false, fence);
    assert.equal(r.error.code, "BAD_MARKERS");
    assert.match(r.error.message, /open code fence/);
  }
  // a closed fence is fine, and so is a fence that only mentions the markers
  const closed = applySection("Intro\n\n```\ncode\n```\n", renderSection(job()));
  assert.equal(closed.ok, true);
  assert.equal(closed.mode, "appended");
});

test("markers indented by one to three spaces are markers (CommonMark): they are replaced, never a second section", () => {
  for (const pad of [" ", "  ", "   "]) {
    const body = `Intro\n\n${renderSection(job()).split("\n").map((l) => (l === START || l === END ? pad + l : l)).join("\n")}\n\nTail\n`;
    const r = applySection(body, renderSection(job({ state: "done", updated: "2026-10-24T10:00:00Z" })));
    assert.equal(r.ok, true, JSON.stringify(pad));
    assert.equal(r.mode, "replaced");
    assert.equal(r.body.split("oriso:job:start").length, 2, "exactly one section");
    assert.ok(r.body.startsWith("Intro\n\n") && r.body.endsWith("\n\nTail\n"));
    assert.equal(parseSection(r.body).job.state, "done");
  }
  // four spaces is an indented code block, not a marker
  const code = `Intro\n\n    ${START}\n    ${END}\n`;
  assert.equal(parseSection(code), null);
});

test("yaml comments after a value are stripped (outside quotes); a # inside quotes stays", () => {
  const sec = [START, "```yaml",
    "state: running            # running | stopped | waiting-human | done | failed",
    "runner: local             # local | cloud",
    'machine: "mac-frank"      # free label',
    "started: 2026-10-24T08:00:00Z # first report",
    "updated: 2026-10-24T09:30:00Z",
    'model: "claude-opus-5-5"',
    'branches: ["feat/213-216-jobs"] # list',
    "prs: [] # none",
    'next: "fix #12 then run tests" # trailing',
    "report: null # none yet",
    "```", END].join("\n");
  const r = parseSection(sec);
  assert.deepEqual(r.problems, []);
  assert.equal(r.job.state, "running");
  assert.equal(r.job.runner, "local");
  assert.equal(r.job.machine, "mac-frank");
  assert.equal(r.job.next, "fix #12 then run tests");
  assert.deepEqual(r.job.branches, ["feat/213-216-jobs"]);
  assert.equal(r.job.report, null);
});

test("the example documented at the top of lib/job.mjs parses into a valid job", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../lib/job.mjs", import.meta.url), "utf8");
  const head = src.split("\n").filter((l) => l.startsWith("//")).map((l) => l.replace(/^\/\/ {0,3}/, ""));
  const from = head.indexOf(START), to = head.indexOf(END);
  assert.ok(from >= 0 && to > from, "the header shows a whole section");
  const r = parseSection(head.slice(from, to + 1).join("\n"));
  assert.deepEqual(r.problems, []);
  assert.equal(r.job.state, "running");
});
