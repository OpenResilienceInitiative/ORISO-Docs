import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const wf = readFileSync(resolve(here, "../../../.github/workflows/planning-board-sync.yml"), "utf8");

test("runs hourly and on demand", () => {
  assert.match(wf, /schedule:\s*\n\s*- cron: '\d{1,2} \* \* \* \*'/);
  assert.match(wf, /workflow_dispatch:/);
});

test("least permissions: read-only token, no write scope anywhere", () => {
  assert.match(wf, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.doesNotMatch(wf, /:\s*write\b/);
  assert.doesNotMatch(wf, /persist-credentials: true/);
});

test("live export uses the board read secret only through GH_TOKEN env", () => {
  assert.match(wf, /GH_TOKEN: \$\{\{ secrets\.ORISO_BOARD_READ_TOKEN \}\}/);
  assert.equal((wf.match(/secrets\.ORISO_BOARD_READ_TOKEN/g) || []).length, 1);
  assert.match(wf, /node tools\/planning-map\/export-board\.mjs/);
});

test("without the secret it runs the recorded fixture and never publishes it", () => {
  assert.match(wf, /--fixture tools\/planning-map\/fixtures\/project-export\.json/);
  assert.match(wf, /mode=dry-run/);
  assert.match(wf, /if: steps\.export\.outputs\.mode == 'live'/);
});

test("exit code 2 is reported as drift and fails the job", () => {
  assert.match(wf, /\[ "\$code" -eq 2 \]/);
  assert.match(wf, /::error[^\n]*[Dd]rift/);
  assert.match(wf, /exit "\$code"/);
});

test("actions use the repo's version pins, the board is an artifact, not a commit", () => {
  assert.match(wf, /actions\/upload-artifact@v4/);
  assert.match(wf, /name: planning-board/);
  assert.doesNotMatch(wf, /git (add|commit|push)/);
});

// Provenance (ORISO-Docs#208): only a board exported from a protected branch (dev, or main where
// GitHub runs the hourly schedule because it is the default branch) may reach the public hub.
const site = readFileSync(resolve(here, "../../../.github/workflows/ua-public-site.yml"), "utf8");
const job = (name) => {
  const m = new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, "m").exec(wf);
  return m ? m[1] : "";
};

test("the sync job only runs on the protected branches dev and main", () => {
  const cond = /^\s+if: (.*)$/m.exec(job("sync"))[1];
  assert.match(cond, /\(github\.ref == 'refs\/heads\/dev' \|\| github\.ref == 'refs\/heads\/main'\)/);
  assert.equal((cond.match(/refs\/heads\//g) || []).length, 2);
});

test("the hub publication only downloads planning-board artifacts of runs on dev or main", () => {
  const lines = site.split("\n").filter((l) => /gh run list --workflow planning-board-sync\.yml/.test(l));
  assert.ok(lines.length >= 1);
  for (const l of lines) {
    assert.match(l, /select\(\.headBranch == "dev" or \.headBranch == "main"\)/);
    assert.doesNotMatch(l, /--branch /);
  }
});

test("the Understand contract workflow runs when tools/planning-map changes (the hub imports it)", () => {
  const tooling = readFileSync(resolve(here, "../../../.github/workflows/ua-tooling.yml"), "utf8");
  const blocks = tooling.split(/^  (?:pull_request|push):\s*$/m).slice(1);
  assert.equal(blocks.length, 2);
  for (const b of blocks) assert.match(b.split(/^permissions:/m)[0], /- 'tools\/planning-map\/\*\*'/);
});

test("steering.json is exported with the board (live only) and a failing steering export does not fail the job (ORISO-Docs#221)", () => {
  assert.match(wf, /node tools\/planning-map\/steering\.mjs export --out "\$OUT_DIR\/steering\.json" \|\| echo "::warning/);
  assert.match(wf, /path: \$\{\{ runner\.temp \}\}\/planning-board\/\n/);
});
