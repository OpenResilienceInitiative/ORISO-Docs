import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sourceEvidence} from './source-evidence.mjs';
import {sourceHash} from '../page-catalog.mjs';
test('source commit evidence distinguishes local modified and uncommitted content',t=>{
 const root=mkdtempSync(join(tmpdir(),'oriso-source-evidence-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','ignore']});git('init');
 writeFileSync(join(root,'source.md'),'# Committed\n');git('add','source.md');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','fixture');
 const clean=sourceEvidence(root,'source.md',sourceHash('# Committed\n'));assert.equal(clean.sourceState,'committed');assert.match(clean.sourceRevision,/^[a-f0-9]{40}$/);
 const changed=sourceEvidence(root,'source.md',sourceHash('# Local\n'));assert.equal(changed.sourceState,'working-copy');assert.equal(changed.sourceRevision,clean.sourceRevision);
 assert.equal(sourceEvidence(root,'new.md',sourceHash('# New')).sourceRevision,null);
});
