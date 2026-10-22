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
