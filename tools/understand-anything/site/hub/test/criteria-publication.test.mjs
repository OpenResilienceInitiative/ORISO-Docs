// Health criteria become the optional map asset map/data/criteria.json (ORISO-Docs#217), like board and milestones.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {criteriaAsset} from '../publication.mjs';
const here=fileURLToPath(new URL('.',import.meta.url));
const platform=path.join(here,'../../../platform');
const dir=path.join(platform,'capabilities/health'),rules=path.join(platform,'capabilities/capability-rules.json');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'criteria-'));
const copy=(edit)=>{const d=fs.mkdtempSync(path.join(tmp,'d-'));for(const f of fs.readdirSync(dir))fs.writeFileSync(path.join(d,f),fs.readFileSync(path.join(dir,f)));edit?.(d);return d;};

test('the seed criteria become map/data/criteria.json and are announced as optional data',()=>{
 const r=criteriaAsset(dir,rules,Buffer.from(JSON.stringify({optional:['board.json']})));
 const doc=JSON.parse(r.criteria);
 assert.equal(doc.schemaVersion,1);
 assert.equal(doc.capabilities['email-templates'].effective.matched,'email');
 assert.deepEqual(JSON.parse(r.links).optional,['board.json','criteria.json']);
 assert.ok(r.criteria.endsWith('\n'));
 assert.equal(criteriaAsset(dir,rules,Buffer.from(r.links)).links,r.links,'announcing twice changes nothing');
});
test('a criteria set with an unknown metric or capability is refused, nothing half-published',()=>{
 const badMetric=copy(d=>fs.appendFileSync(path.join(d,'x.md'),'---\nscope: chat\nmetrics:\n  cyclomatic: {threshold: 1, weight: 1}\n---\nx'));
 assert.throws(()=>criteriaAsset(badMetric,rules,Buffer.from('{"optional":[]}')),/criteria invalid.*cyclomatic/);
 const badCap=copy(d=>fs.writeFileSync(path.join(d,'x.md'),'---\nscope: invented\n---\nx'));
 assert.throws(()=>criteriaAsset(badCap,rules,Buffer.from('{"optional":[]}')),/criteria invalid.*invented/);
});
