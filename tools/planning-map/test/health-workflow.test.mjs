// Security and provenance contract for scheduled Health runs (#218, #220).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readWorkflow, workflowNames, stepsOf, stepWith } from './workflow-yaml.mjs';

const wf = readWorkflow('health-runs.yml');
const { prepare, measure, judge, propose, tests } = wf.jobs;
const all = job => JSON.stringify(job);
const protectedRef = "(github.ref == 'refs/heads/dev' || github.ref == 'refs/heads/main')";

test('scheduled and manual runs are restricted to protected Docs branches; pull requests run tests only', () => {
  assert.match(wf.on.schedule[0].cron, /^\d+ \d+ \* \* \*$/);
  assert.equal(wf.on.workflow_dispatch.inputs.scope.type, 'string');
  for (const job of [prepare, measure, judge, propose]) {
    assert.ok(job.if.includes("github.repository == 'OpenResilienceInitiative/ORISO-Docs'"));
    assert.ok(job.if.includes(protectedRef));
  }
  assert.equal(tests.if, "github.event_name == 'pull_request'");
  assert.match(prepare.if, /^github\.event_name != 'pull_request'/);
});

test('only the isolated verdict step sees the model key, and only propose has write permissions', () => {
  assert.deepEqual(wf.permissions, { contents: 'read' });
  for (const job of [prepare, measure, judge]) assert.ok(Object.values(job.permissions).every(v => v === 'read'));
  assert.deepEqual(propose.permissions, { contents: 'write', 'pull-requests': 'write' });
  assert.doesNotMatch(all(prepare) + all(measure) + all(propose), /HEALTH_MODEL_API_KEY|secrets\./);
  const step = stepWith(judge, /health-batch\.mjs judge/);
  assert.equal(step.env.HEALTH_MODEL_API_KEY, '${{ secrets.HEALTH_MODEL_API_KEY }}');
  assert.equal((JSON.stringify(wf).match(/secrets\.HEALTH_MODEL_API_KEY/g) || []).length, 1);
  assert.doesNotMatch(all(judge), /health-batch\.mjs (checkout|measure)|npm run (test|lint)|--checkouts/);
  assert.doesNotMatch(JSON.stringify(wf), /HEALTH_MODEL_ALLOW_PRIVATE/);
});

test('preparation pins selected public dev checkouts independently of measurement', () => {
  const detect = stepWith(prepare, /health-run\.mjs detect/);
  assert.equal(detect.env.SCOPE, '${{ inputs.scope }}');
  assert.match(detect.run, /--scope "\$SCOPE"/);
  assert.match(detect.run, /health-batch\.mjs plan/);
  assert.match(detect.run, /--run "\$GITHUB_RUN_ID"/);
  assert.match(stepWith(prepare, /git clone/).run, /--branch dev/);
  assert.match(all(prepare), /name:health-plan|"name":"health-plan"/);
  assert.equal(stepsOf(prepare)[0].id, 'guard');
  assert.match(stepsOf(prepare)[0].run, /gh pr list/);
});

test('measurement uses a fresh pinned checkout, installs without lifecycle scripts and generates coverage without secrets', () => {
  assert.equal(measure.needs, 'prepare');
  assert.match(stepWith(measure, /health-batch\.mjs checkout/).run, /--plan/);
  assert.doesNotMatch(all(measure), /npm run (test|lint)|npm ci --legacy-peer-deps/);
  assert.match(stepWith(measure, /health-batch\.mjs measure/).run, /--plan/);
  for (const step of stepsOf(measure)) assert.notEqual(step.with?.['persist-credentials'], true);
});

test('verdict downloads plan separately and validates before proposing records', () => {
  assert.deepEqual(judge.needs, ['prepare', 'measure']);
  assert.ok(stepsOf(judge).some(s => s.with?.name === 'health-plan'));
  assert.ok(stepsOf(judge).some(s => s.with?.name === 'health-measurements'));
  assert.ok(stepWith(judge, /health-batch\.mjs judge/).index < stepWith(judge, /health-run\.mjs validate/).index);
  assert.equal(propose.needs, 'judge');
  assert.ok(propose.if.includes("needs.judge.outputs.records != '0'"));
  const open = stepWith(propose, /gh pr create/).run;
  assert.ok(open.indexOf('health-run.mjs validate') < open.indexOf('git push'));
  assert.match(open, /git add health\/runs\//);
  assert.match(open, /gh pr create[^\n]*--base dev/);
  assert.doesNotMatch(open, /gh pr merge|--force|git add (-A|\.)/);
});

test('the open-PR guard, data-only history baseline and concurrency are preserved', () => {
  assert.match(stepsOf(prepare)[0].run, /startswith\("bot\/health-runs-"\)/);
  for (const job of [prepare, judge]) {
    const data = stepsOf(job).find(s => s.with?.path === '.health-records');
    assert.equal(data.with.ref, 'dev');
    assert.equal(data.with['persist-credentials'], false);
    assert.equal(data.with['sparse-checkout'], 'health');
  }
  assert.equal(wf.concurrency['cancel-in-progress'], false);
  assert.match(wf.concurrency.group, /pull_request/);
});


test('every workflow running platform or planning tests installs trusted tooling first', () => {
  const offenders = [];
  for (const name of workflowNames()) for (const [id, job] of Object.entries(readWorkflow(name).jobs ?? {})) {
    const steps = stepsOf(job);
    const run = steps.find(s => /node --test[^\n]*(platform\/test|planning-map\/test)/.test(s.run));
    if (run && !steps.some(s => s.index < run.index && (/^npm ci\b/m.test(s.run) && s['working-directory'] === 'tools/understand-anything' || /cd tools\/understand-anything\s*\n\s*npm ci/.test(s.run)))) offenders.push(`${name}#${id}`);
  }
  assert.deepEqual(offenders, []);
});

test('the Understand contract workflow continues to watch planning-map', () => {
  assert.ok(readWorkflow('ua-tooling.yml').on.pull_request.paths.includes('tools/planning-map/**'));
});
