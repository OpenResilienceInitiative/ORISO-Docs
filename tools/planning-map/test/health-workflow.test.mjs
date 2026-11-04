// .github/workflows/health-runs.yml (ORISO-Docs#220, epic #213): scheduled and on-demand health runs.
// The workflow is parsed (test/workflow-yaml.mjs, the repository's yaml package), so the tests see jobs, steps and keys.
import test from "node:test";
import assert from "node:assert/strict";
import { readWorkflow, workflowNames, stepsOf, runsOf, stepWith } from "./workflow-yaml.mjs";

const wf = readWorkflow("health-runs.yml");
const { measure, propose, tests } = wf.jobs;
const PROTECTED = "(github.ref == 'refs/heads/dev' || github.ref == 'refs/heads/main')";
const envOf = (step) => step?.env ?? {};
const at = (job, re) => { const s = stepWith(job, re); assert.ok(s, String(re)); return s.index; };

test("runs on a schedule and on demand, the dispatch takes an optional scope", () => {
  assert.match(wf.on.schedule[0].cron, /^\d{1,2} \d{1,2} \* \* \*$/);
  const scope = wf.on.workflow_dispatch.inputs.scope;
  assert.equal(scope.required, false);
  assert.equal(scope.type, "string");
  assert.match(scope.description, /<capability>\/<repo>/);
});

test("both jobs only run on the protected branches dev and main of the docs repository", () => {
  for (const [name, j] of [["measure", measure], ["propose", propose]]) {
    assert.ok(j.if.includes("github.repository == 'OpenResilienceInitiative/ORISO-Docs'"), name);
    assert.ok(j.if.includes(PROTECTED), name);
    assert.equal((j.if.match(/refs\/heads\//g) || []).length, 2, name);
  }
});

test("least privilege: the workflow default is read-only, only the propose job may write, and only contents and pull requests", () => {
  assert.deepEqual(wf.permissions, { contents: "read" });
  assert.ok(Object.values(measure.permissions).every((v) => v === "read"));
  assert.deepEqual(Object.entries(propose.permissions).map(([k, v]) => `${k}: ${v}`).sort(), ["contents: write", "pull-requests: write"]);
  assert.equal(tests.permissions, undefined, "the PR tests inherit the read-only default");
});

test("the model secret exists in the measure job only, as one env entry of the measuring step, never in a run line or the propose job", () => {
  const all = JSON.stringify(wf);
  assert.equal((all.match(/secrets\.HEALTH_MODEL_API_KEY/g) || []).length, 1);
  const judge = stepWith(measure, /health-run\.mjs run-selected/);
  assert.equal(envOf(judge).HEALTH_MODEL_API_KEY, "${{ secrets.HEALTH_MODEL_API_KEY }}");
  for (const v of ["HEALTH_MODEL", "HEALTH_MODEL_PROVIDER", "HEALTH_MODEL_BASE_URL"]) assert.equal(envOf(judge)[v], `\${{ vars.${v} }}`);
  assert.doesNotMatch(JSON.stringify(propose), /HEALTH_MODEL/);
  for (const job of Object.values(wf.jobs)) for (const s of stepsOf(job)) assert.doesNotMatch(s.run, /\$\{\{\s*secrets\./);
});

test("private content never goes to the model from CI: the allow-private switch is not set anywhere", () => {
  assert.doesNotMatch(JSON.stringify(wf), /HEALTH_MODEL_ALLOW_PRIVATE/);
});

test("without the secret the run is metrics only and says so (no failure)", () => {
  const judge = stepWith(measure, /health-run\.mjs run-selected/);
  assert.match(judge.run, /HEALTH_MODEL_API_KEY is not set/);
  assert.match(judge.run, /::notice/);
});

test("source repositories are the public code repositories from health-run.mjs repos, cloned without a token, full history, branch dev", () => {
  const clone = stepWith(measure, /git clone/);
  assert.match(clone.run, /health-run\.mjs repos/);
  assert.match(clone.run, /git clone[^\n]*--filter=blob:none[^\n]*--branch dev[^\n]*https:\/\/github\.com\/OpenResilienceInitiative\//);
  assert.doesNotMatch(runsOf(measure), /--depth|x-access-token|GITHUB_TOKEN@|TOKEN@|ORISO-E2E|ORISO-Infra/);
});

test("steps run in order: detect, then metrics and verdict, then validate; a failing steering export only warns", () => {
  assert.ok(at(measure, /health-run\.mjs detect/) < at(measure, /health-run\.mjs run-selected/));
  assert.ok(at(measure, /health-run\.mjs run-selected/) < at(measure, /health-run\.mjs validate/));
  assert.match(stepWith(measure, /steering\.mjs export/).run, /steering\.mjs export --out "[^"]*steering\.json" \|\| echo "::warning/);
  const detect = stepWith(measure, /health-run\.mjs detect/);
  assert.match(detect.run, /--scope "\$SCOPE"/);
  assert.equal(envOf(detect).SCOPE, "${{ inputs.scope }}", "the input goes through env, not into the script text");
  for (const job of Object.values(wf.jobs)) for (const s of stepsOf(job)) assert.doesNotMatch(s.run, /\$\{\{\s*inputs\./);
});

// Finding 1: a scheduled run checks out main (the default branch) but proposes to dev. The records it compares against must
// be the ones of dev, or every night measures the same scopes again. Tooling (the code that runs) stays the trusted ref.
test("records come from dev: a second, data-only checkout of dev is the --root of detect and run-selected; the tooling stays the trusted ref", () => {
  const steps = stepsOf(measure);
  const checkouts = steps.filter((s) => /^actions\/checkout@/.test(s.uses ?? ""));
  assert.equal(checkouts.length, 2, "one checkout of the trusted ref (tooling), one of dev (records)");
  const [tooling, records] = checkouts;
  assert.equal(tooling.with?.ref, undefined, "the tooling is the ref that started the run (dev or main, guarded by the job condition)");
  assert.equal(tooling.with?.path, undefined);
  assert.equal(records.with.ref, "dev");
  assert.equal(records.with["persist-credentials"], false);
  assert.ok(records.with.path, "the records checkout has its own folder");
  assert.equal(String(records.with["sparse-checkout"]).trim(), "health", "only the records, no code of dev is even on disk");
  assert.ok(tooling.index < records.index, "the second checkout comes after the first (actions/checkout cleans the workspace)");

  const root = measure.env.HEALTH_RECORDS;
  assert.equal(root, "${{ github.workspace }}/" + records.with.path, "HEALTH_RECORDS names the records checkout");
  for (const cmd of ["detect", "run-selected"]) {
    const s = stepWith(measure, new RegExp(`health-run\\.mjs ${cmd}`));
    assert.ok(s.index > records.index, `${cmd} runs after the records checkout`);
    assert.match(s.run, /--root "\$HEALTH_RECORDS"/, `${cmd} reads the records of dev`);
  }
  // Every script that runs is the trusted one: nothing is executed from the records checkout.
  for (const s of steps) {
    for (const line of s.run.split("\n").filter((l) => /\bnode\b/.test(l))) {
      assert.match(line, /node tools\//, `runs the trusted tooling: ${line.trim()}`);
      assert.doesNotMatch(line, /node "?\$HEALTH_RECORDS/, line);
    }
  }
});

test("the new records are collected from the records checkout (untracked files under health/runs) and validated before upload", () => {
  const collect = stepWith(measure, /health-run\.mjs validate/);
  assert.match(collect.run, /health-run\.mjs validate --root "\$HEALTH_RECORDS"/);
  assert.match(collect.run, /git -C "\$HEALTH_RECORDS" ls-files --others --exclude-standard -- health\/runs/);
  assert.match(collect.run, /health-out/);
  assert.equal(collect.id, "collect");
});

test("an open health-runs pull request stops the run before any work (no pile of duplicate PRs)", () => {
  const guard = stepsOf(measure)[0];
  assert.equal(guard.id, "guard");
  assert.match(guard.run, /gh pr list[^\n]*--state open/);
  assert.match(guard.run, /startswith\("bot\/health-runs-"\)/);
  assert.match(guard.run, /skip=true/);
  assert.equal(measure.permissions["pull-requests"], "read");
  for (const s of stepsOf(measure).slice(1)) assert.match(String(s.if), /steps\.guard\.outputs\.skip != 'true'/, s.name ?? s.uses);
});

test("measure hands the new record files to propose as an artifact, nothing else", () => {
  const up = stepWith(measure, /actions\/upload-artifact@v4/);
  assert.equal(up.with.name, "health-runs");
  assert.equal(up.with.path, "${{ runner.temp }}/health-out/health/runs/");
  assert.equal(propose.needs, "measure");
  assert.ok(propose.if.includes("needs.measure.outputs.records != '0'"));
  assert.ok(stepWith(propose, /actions\/download-artifact@v4/));
});

test("propose opens a pull request against dev from a bot branch, adds only health/runs, and uses Refs, never Closes", () => {
  assert.equal(stepWith(propose, /actions\/checkout@/).with.ref, "dev");
  const open = stepWith(propose, /gh pr create/);
  assert.match(open.run, /branch="bot\/health-runs-\$\{GITHUB_RUN_ID\}"/);
  assert.match(open.run, /git checkout -b "\$branch"/);
  assert.match(open.run, /git add health\/runs\//);
  assert.doesNotMatch(open.run, /git add (-A|\.)/);
  assert.match(open.run, /gh pr create[^\n]*--base dev/);
  assert.match(open.run, /Refs OpenResilienceInitiative\/ORISO-Docs#213/);
  const all = Object.values(wf.jobs).map(runsOf).join("\n");
  assert.doesNotMatch(all, /\b(Closes|Fixes|Resolves) /i);
  assert.doesNotMatch(all, /gh pr merge|--auto|git push[^\n]*(--force|-f\b)|git stash/);
});

test("propose validates the records before it pushes anything", () => {
  const open = stepWith(propose, /gh pr create/);
  const v = open.run.search(/health-run\.mjs validate/), p = open.run.search(/git push/);
  assert.ok(v >= 0 && p > v);
});

// Finding 3: pull request runs must not queue behind (or block) a scheduled measure run, and measure runs stay one at a time.
test("concurrency: measure runs share one group and never cancel; pull request runs get their own group per ref", () => {
  assert.equal(wf.concurrency["cancel-in-progress"], false);
  assert.equal(wf.concurrency.group, "health-runs-${{ github.event_name == 'pull_request' && github.ref || 'measure' }}");
});

// Finding 2: the platform tests need typescript (crap metric), the workflow tests need yaml: both come from npm ci.
test("pull requests that touch the health tooling install the tooling dependencies, then run the platform and planning tests", () => {
  assert.ok(wf.on.pull_request.paths.includes("tools/understand-anything/platform/**"));
  assert.ok(wf.on.pull_request.paths.includes(".github/workflows/health-runs.yml"));
  assert.equal(tests.if, "github.event_name == 'pull_request'");
  const install = stepWith(tests, /^npm ci\b/);
  assert.ok(install, "npm ci");
  assert.equal(install["working-directory"], "tools/understand-anything");
  const run = stepWith(tests, /node --test/);
  assert.match(run.run, /node --test tools\/understand-anything\/platform\/test\/\*\.test\.mjs tools\/planning-map\/test\/\*\.test\.mjs/);
  assert.ok(install.index < run.index);
  assert.match(measure.if, /^github\.event_name != 'pull_request' &&/, "measure never runs on a pull request");
});

// Finding 2, every workflow: a job that runs the platform or planning tests installs tools/understand-anything first.
test("every workflow job that runs platform or planning tests runs npm ci in tools/understand-anything before them", () => {
  const offenders = [];
  for (const name of workflowNames()) {
    for (const [id, job] of Object.entries(readWorkflow(name).jobs ?? {})) {
      const steps = stepsOf(job);
      const uses = steps.find((s) => /node --test[^\n]*(platform\/test|planning-map\/test)/.test(s.run));
      if (!uses) continue;
      const installed = steps.some((s) => s.index < uses.index && (
        (/^npm ci\b/m.test(s.run) && s["working-directory"] === "tools/understand-anything") || /cd tools\/understand-anything\s*\n\s*npm ci/.test(s.run)));
      if (!installed) offenders.push(`${name}#${id}`);
    }
  }
  assert.deepEqual(offenders, []);
});

// Finding 10: the scheduled job holds the model secret, so it never executes code of the measured checkouts (their eslint).
test("the measuring step never installs or runs the tools of a checked-out code repository", () => {
  const judge = stepWith(measure, /health-run\.mjs run-selected/);
  assert.match(judge.run, /--no-checkout-tools/);
  assert.doesNotMatch(runsOf(measure), /npm (ci|install)|pnpm|yarn|npx|eslint/);
});

test("the Understand contract workflow still watches tools/planning-map (the hub imports it)", () => {
  const tooling = readWorkflow("ua-tooling.yml");
  assert.ok(tooling.on.pull_request.paths.includes("tools/planning-map/**"));
});
