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
