import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assessSourceBinding} from '../source-bindings.mjs';
const reviewed='1'.repeat(40), next='2'.repeat(40), bytes=Buffer.from('Accepted decision\n');
const source={repository:'ORISO-Docs',path:'decisions/contract.md',binding:'reviewed',sourceRevision:reviewed,sourceHash:createHash('sha256').update(bytes).digest('hex')};
test('unchanged source bytes in a later release preserve original review provenance',()=>{
  const result=assessSourceBinding(source,{repository:'ORISO-Docs',revision:next,readSource:()=>bytes});
  assert.equal(result.state,'verified');
  assert.equal(result.reviewedRevision,reviewed);
  assert.equal(result.selectedRevision,next);
  assert.equal(result.reviewRevisionMatches,false);
});
test('changed or missing selected source cannot become current because the path still exists',()=>{
  assert.equal(assessSourceBinding(source,{repository:'ORISO-Docs',revision:next,readSource:()=>Buffer.from('Changed')}).state,'stale');
  assert.equal(assessSourceBinding(source,{repository:'ORISO-Docs',revision:next,readSource:()=>{throw new Error('missing');}}).state,'unavailable');
});
test('a mutable or unspecified selected revision cannot satisfy source binding',()=>{
  assert.equal(assessSourceBinding(source,{repository:'ORISO-Docs',revision:'dev',readSource:()=>bytes}).state,'unavailable');
});
