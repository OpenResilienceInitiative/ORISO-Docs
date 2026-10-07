import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {recordAttempt} from '../attempt.mjs';
test('failed refresh publishes only a sanitized attempt receipt and keeps installed generation bytes intact',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'refresh-attempt-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const current=path.join(root,'current');fs.mkdirSync(current);const installed=JSON.stringify({generationId:'installed-fixture',releaseVersion:'v2.0.7',sources:[{repository:'ORISO-Docs',sourceSHA:'a'.repeat(40)}]});fs.writeFileSync(path.join(current,'status.json'),installed);
 const receipt=path.join(root,'operational/refresh-attempt.json');
 const result=recordAttempt({output:receipt,current,input:{state:'failed',attemptId:'12345-1',attemptedAt:'2026-10-07T14:00:00Z',releaseVersion:'v2.0.8',documentationRevision:'b'.repeat(40),phase:'generation',errorCode:'GENERATION_FAILED',error:'SECRET_SENTINEL ?token=secret',stack:'PRIVATE_STACK'}});
 assert.equal(result.state,'failed');assert.equal(result.installed.generationId,'installed-fixture');assert.equal(result.installed.releaseVersion,'v2.0.7');assert.equal(result.releaseVersion,'v2.0.8');assert.equal(result.errorCode,'GENERATION_FAILED');assert.ok(!fs.readFileSync(receipt,'utf8').includes('SECRET_SENTINEL'));assert.equal(fs.readFileSync(path.join(current,'status.json'),'utf8'),installed);
 assert.throws(()=>recordAttempt({output:receipt,current,input:{...result,errorCode:'SECRET_SENTINEL'}}),/error code/);assert.equal(JSON.parse(fs.readFileSync(receipt)).attemptId,'12345-1');
});
test('symlinked ancestor cannot place the mutable attempt receipt inside the installed hub',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'attempt-containment-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const current=path.join(root,'installed');fs.mkdirSync(current);fs.symlinkSync(current,path.join(root,'alias'));
 assert.throws(()=>recordAttempt({output:path.join(root,'alias/ops/receipt.json'),current,input:{state:'failed',attemptId:'1',attemptedAt:'2026-10-07T14:00:00Z',phase:'generation',errorCode:'GENERATION_FAILED'}}),/Independent explicit/);
 assert.ok(!fs.existsSync(path.join(current,'ops')));
});
