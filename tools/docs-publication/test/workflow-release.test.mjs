import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {parse}=createRequire(new URL('../../../site/package.json',import.meta.url))('yaml');
const workflow=name=>parse(readFileSync(new URL(`../../../.github/workflows/${name}.yml`,import.meta.url),'utf8'));
test('public workflows have no clock triggers and require a platform release input',()=>{
 for(const name of ['docs-publication','ua-public-site','ua-graph-refresh']){
  const w=workflow(name);assert.equal(w.on.schedule,undefined,name);assert.deepEqual(w.on.repository_dispatch.types,['platform-release-published']);assert.equal(w.on.workflow_dispatch.inputs.release_manifest.required,true);
 }
});
test('Dev checks cannot activate Docs or the hub and released code checkout is exact',()=>{
 for(const [name,activation,producer] of [['docs-publication','activate-and-readback','artifact'],['ua-public-site','produce','produce']]){
  const w=workflow(name);assert.equal(w.jobs[activation].if,"github.event_name == 'repository_dispatch' || github.event_name == 'workflow_dispatch'");
  const steps=w.jobs[producer].steps;
  assert(steps.some(s=>s.run==='python3 .github/scripts/release_event.py'));
  assert(steps.some(s=>s.with?.ref==='${{ steps.release-input.outputs.documentation-revision }}'));
  assert(steps.some(s=>s.run?.includes('--require-release')));
 }
 const steps=workflow('docs-publication').jobs.artifact.steps;
 assert(steps.some(s=>s.run?.includes('--preview --origin http://127.0.0.1:3000')));
 assert(steps.some(s=>s.run?.includes('--release-manifest "$RUNNER_TEMP/platform-release.json" --generation "$RUNNER_TEMP/docs-ua-published/current" --origin https://docs.oriso.org')));
});

test('the containerized graph refresh uses Bash for pipeline checks and arrays', () => {
 const job = workflow('ua-graph-refresh').jobs.refresh;
 assert(job.container, 'the producer runs in a job container');
 for (const step of job.steps.filter(step => /pipefail|mapfile/.test(step.run ?? ''))) {
  assert.equal(step.shell ?? job.defaults?.run?.shell, 'bash', step.name);
 }
});

test('the public Understand artifact retains the hidden graph and metadata directories', () => {
 const upload = workflow('ua-public-site').jobs.produce.steps.find(step => step.uses?.startsWith('actions/upload-artifact@'));
 assert.equal(upload?.with?.['include-hidden-files'], true);
});
