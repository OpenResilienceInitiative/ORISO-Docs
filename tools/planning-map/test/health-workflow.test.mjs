// .github/workflows/health-runs.yml (ORISO-Docs#220, epic #213): scheduled and on-demand health runs.
// The workflow is YAML text; these tests pin the properties that matter, in the style of workflow.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const wf = readFileSync(resolve(here, "../../../.github/workflows/health-runs.yml"), "utf8");
const job = (name) => {
  const m = new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, "m").exec(wf);
  return m ? m[1] : "";
};
const header = wf.split(/^jobs:/m)[0];
const measure = job("measure"), propose = job("propose");

test("runs on a schedule and on demand, the dispatch takes an optional scope", () => {
  assert.match(header, /schedule:\s*\n\s*- cron: '\d{1,2} \d{1,2} \* \* \*'/);
  assert.match(header, /workflow_dispatch:\s*\n\s+inputs:\s*\n\s+scope:/);
  const scope = /scope:\n([\s\S]*?)(?=\n\S|\n  \w+:\n|\npermissions)/.exec(header)[1];
  assert.match(scope, /required: false/);
  assert.match(scope, /<capability>\/<repo>/);
});

test("both jobs only run on the protected branches dev and main of the docs repository", () => {
  for (const [name, j] of [["measure", measure], ["propose", propose]]) {
    const cond = /^\s+if: (.*)$/m.exec(j)?.[1] ?? "";
    assert.match(cond, /github\.repository == 'OpenResilienceInitiative\/ORISO-Docs'/, name);
    assert.match(cond, /\(github\.ref == 'refs\/heads\/dev' \|\| github\.ref == 'refs\/heads\/main'\)/, name);
    assert.equal((cond.match(/refs\/heads\//g) || []).length, 2, name);
  }
});

test("least privilege: the workflow default is read-only, only the propose job may write, and only contents and pull requests", () => {
  assert.match(header, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.doesNotMatch(measure, /:\s*write\b/);
  const perms = /permissions:\n((?:\s{6}[\w-]+: \w+\n)+)/.exec(propose)[1];
  assert.deepEqual(perms.trim().split("\n").map((l) => l.trim()).sort(), ["contents: write", "pull-requests: write"]);
});

test("the model secret exists in the measure job only, as one env entry, never in a run line or the propose job", () => {
  assert.equal((wf.match(/secrets\.HEALTH_MODEL_API_KEY/g) || []).length, 1);
  assert.match(measure, /HEALTH_MODEL_API_KEY: \$\{\{ secrets\.HEALTH_MODEL_API_KEY \}\}/);
  assert.doesNotMatch(propose, /HEALTH_MODEL/);
  assert.doesNotMatch(wf, /run:[^\n]*\$\{\{\s*secrets\./);
  for (const v of ["HEALTH_MODEL", "HEALTH_MODEL_PROVIDER", "HEALTH_MODEL_BASE_URL"]) assert.match(measure, new RegExp(`${v}: \\$\\{\\{ vars\\.${v} \\}\\}`));
});

test("private content never goes to the model from CI: the allow-private switch is not set anywhere", () => {
  assert.doesNotMatch(wf, /HEALTH_MODEL_ALLOW_PRIVATE/);
});

test("without the secret the run is metrics only and says so (no failure)", () => {
  assert.match(measure, /HEALTH_MODEL_API_KEY is not set/);
  assert.match(measure, /::notice/);
});

test("source repositories are the public code repositories from health-run.mjs repos, cloned without a token, full history, branch dev", () => {
  assert.match(measure, /health-run\.mjs repos/);
  assert.match(measure, /git clone[^\n]*--filter=blob:none[^\n]*--branch dev[^\n]*https:\/\/github\.com\/OpenResilienceInitiative\//);
  assert.doesNotMatch(measure, /--depth/);
  assert.doesNotMatch(measure, /x-access-token|GITHUB_TOKEN@|TOKEN@/);
  assert.doesNotMatch(measure, /ORISO-E2E|ORISO-Infra/);
});

test("steps run in order: detect, then metrics and verdict, then validate; a failing steering export only warns", () => {
  const at = (re) => { const i = measure.search(re); assert.ok(i >= 0, String(re)); return i; };
  assert.ok(at(/health-run\.mjs detect/) < at(/health-run\.mjs run-selected/));
  assert.ok(at(/health-run\.mjs run-selected/) < at(/health-run\.mjs validate/));
  assert.match(measure, /steering\.mjs export --out "[^"]*steering\.json" \|\| echo "::warning/);
  assert.match(measure, /--scope "\$SCOPE"/);
  assert.match(measure, /SCOPE: \$\{\{ inputs\.scope \}\}/, "the input goes through env, not into the script text");
  assert.doesNotMatch(wf, /run:[^\n]*\$\{\{\s*inputs\./);
});

test("an open health-runs pull request stops the run before any work (no pile of duplicate PRs)", () => {
  assert.match(measure, /gh pr list[^\n]*--state open/);
  assert.match(measure, /startswith\("bot\/health-runs-"\)/);
  assert.match(measure, /pull-requests: read/);
  assert.match(measure, /skip=true/);
});

test("measure hands the new record files to propose as an artifact, nothing else", () => {
  assert.match(measure, /actions\/upload-artifact@v4/);
  assert.match(measure, /name: health-runs/);
  assert.match(measure, /path: \$\{\{ runner\.temp \}\}\/health-out\/health\/runs\//);
  assert.match(propose, /needs: measure/);
  assert.match(propose, /needs\.measure\.outputs\.records != '0'/);
  assert.match(propose, /actions\/download-artifact@v4/);
});

test("propose opens a pull request against dev from a bot branch, adds only health/runs, and uses Refs, never Closes", () => {
  assert.match(propose, /ref: dev/);
  assert.match(propose, /branch="bot\/health-runs-\$\{GITHUB_RUN_ID\}"/);
  assert.match(propose, /git checkout -b "\$branch"/);
  assert.match(propose, /git add health\/runs\//);
  assert.doesNotMatch(propose, /git add (-A|\.)/);
  assert.match(propose, /gh pr create[^\n]*--base dev/);
  assert.match(propose, /Refs OpenResilienceInitiative\/ORISO-Docs#213/);
  assert.doesNotMatch(wf, /\b(Closes|Fixes|Resolves) /i);
  assert.doesNotMatch(wf, /gh pr merge|--auto|git push[^\n]*(--force|-f\b)/);
  assert.doesNotMatch(wf, /git stash/);
});

test("propose validates the records before it pushes anything", () => {
  const v = propose.search(/health-run\.mjs validate/), p = propose.search(/git push/);
  assert.ok(v >= 0 && p > v);
});

test("one run at a time, never cancelled half way", () => {
  assert.match(header, /concurrency:\s*\n\s+group: health-runs\s*\n\s+cancel-in-progress: false/);
});

test("pull requests that touch the health tooling run the platform and planning tests", () => {
  assert.match(header, /pull_request:\s*\n\s+paths: \[[^\]]*platform\/\*\*[^\]]*health-runs\.yml/);
  const t = job("tests");
  assert.match(t, /if: github\.event_name == 'pull_request'/);
  assert.match(t, /node --test tools\/understand-anything\/platform\/test\/\*\.test\.mjs tools\/planning-map\/test\/\*\.test\.mjs/);
  assert.match(measure, /if: github\.event_name != 'pull_request' &&/, "measure never runs on a pull request");
});

test("the Understand contract workflow still watches tools/planning-map (the hub imports it)", () => {
  const tooling = readFileSync(resolve(here, "../../../.github/workflows/ua-tooling.yml"), "utf8");
  assert.match(tooling, /tools\/planning-map\/\*\*/);
});
