import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const run=(args)=>execFileSync('python3',[new URL('../audit.py',import.meta.url).pathname,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
test('audit export preserves uncertain candidates, compatibility history and targeted reviewed mistakes',()=>{
  const root=mkdtempSync(join(tmpdir(),'glossary-audit-'));
  try {
    const repo=join(root,'ORISO-Example');mkdirSync(join(repo,'src/locales/en'),{recursive:true});
    mkdirSync(join(repo,'src/migrations'),{recursive:true});
    writeFileSync(join(repo,'src/locales/en/translation.json'),'{"centre":"Agency Unit","provider":"Tenant"}\n');
    writeFileSync(join(repo,'src/migrations/001.sql'),'CREATE TABLE agency (tenant_id INT);\n');
    execFileSync('git',['init','-q',repo]);execFileSync('git',['-C',repo,'add','.']);
    execFileSync('git',['-C',repo,'-c','user.name=Test','-c','user.email=test@example.org','commit','-qm','fixture']);
    const revision=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const policy={schemaVersion:1,scope:{directories:['src/'],extensions:['.json','.sql'],exclude:[]},repositories:{'ORISO-Example':revision},families:[{id:'agency',roots:['agency']},{id:'tenant',roots:['tenant']}],findings:[{repository:'ORISO-Example',path:'src/locales/en/translation.json',line:1,family:'agency',classification:'copy-correction',reason:'Agency Unit is a verified display mistranslation.'}]};
    const policyPath=join(root,'policy.json');writeFileSync(policyPath,JSON.stringify(policy));
    run(['--repositories',root,'--policy',policyPath,'--out',join(root,'report')]);
    const occurrences=readFileSync(join(root,'report/occurrences.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(occurrences.find(x=>x.path.endsWith('translation.json')&&x.family==='agency').disposition,'copy-correction');
    assert.equal(occurrences.find(x=>x.path.endsWith('translation.json')&&x.family==='tenant').disposition,'unresolved');
    assert.equal(occurrences.find(x=>x.path.endsWith('001.sql')).disposition,'historical');
    assert.ok(occurrences.every(x=>x.sourceRevision===revision&&x.sourceHash.length===64&&x.matches[0].column>=1));
    const report=JSON.parse(readFileSync(join(root,'report/summary.json')));
    assert.equal(report.files,2);assert.equal(report.families.agency.repositories['ORISO-Example'],2);
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('audit refuses mutable source refs and cannot falsely certify an empty declared gate',()=>{
  const root=mkdtempSync(join(tmpdir(),'glossary-audit-ref-'));
  try {
    const repo=join(root,'ORISO-Example');mkdirSync(repo);
    execFileSync('git',['init','-q',repo]);writeFileSync(join(repo,'README.md'),'out of gate\n');execFileSync('git',['-C',repo,'add','.']);
    execFileSync('git',['-C',repo,'-c','user.name=Test','-c','user.email=test@example.org','commit','-qm','fixture']);
    const revision=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const policy={schemaVersion:1,scope:{directories:['src/'],extensions:['.json']},repositories:{'ORISO-Example':'dev'},families:[{id:'agency',roots:['agency']}],findings:[]};
    const policyPath=join(root,'policy.json');writeFileSync(policyPath,JSON.stringify(policy));
    assert.throws(()=>run(['--repositories',root,'--policy',policyPath,'--out',join(root,'mutable')]),/immutable 40-character/);
    policy.repositories['ORISO-Example']=revision;writeFileSync(policyPath,JSON.stringify(policy));
    assert.throws(()=>run(['--repositories',root,'--policy',policyPath,'--out',join(root,'empty')]),/declared gate yielded no tracked source/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
