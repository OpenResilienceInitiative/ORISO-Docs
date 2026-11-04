import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {boardAsset} from '../publication.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const board=JSON.parse(fs.readFileSync(path.join(here,'../../../../planning-map/fixtures/board.sample.json'),'utf8'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'board-'));
const write=(o)=>{const f=path.join(tmp,Math.random()+'.json');fs.writeFileSync(f,JSON.stringify(o));return f;};

test('a valid board becomes map/data/board.json and is announced as optional data',()=>{
 const links={schemaVersion:1,live:['case-handover'],optional:[]};
 const r=boardAsset(write(board),Buffer.from(JSON.stringify(links)));
 assert.equal(JSON.parse(r.board).syncedAt,board.syncedAt);
 assert.deepEqual(JSON.parse(r.links).optional,['board.json']);
 assert.deepEqual(JSON.parse(r.links).live,['case-handover']);
});
test('an invalid board is refused, nothing half-published',()=>{
 assert.throws(()=>boardAsset(write({...board,schemaVersion:2}),Buffer.from('{"optional":[]}')),/board\.json invalid/);
});
test('private items never carry titles into the published file',()=>{
 const dirty=structuredClone(board);dirty.items[0].repository='OpenResilienceInitiative/ORISO-E2E';
 assert.throws(()=>boardAsset(write(dirty),Buffer.from('{"optional":[]}')),/private/i);
});
test('only repositories on the public list are published, everything else is refused',()=>{
 for(const repository of ['OpenResilienceInitiative/ORISO-Unlisted','SomeoneElse/ORISO-Frontend','ORISO-Frontend',null]){
  const dirty=structuredClone(board);dirty.items[0].repository=repository;
  assert.throws(()=>boardAsset(write(dirty),Buffer.from('{"optional":[]}')),/not public|private|invalid/i,String(repository));
 }
});
test('a parent reference outside the public list is refused as well',()=>{
 const dirty=structuredClone(board);const i=dirty.items.find(x=>x.parent);i.parent={repository:'OpenResilienceInitiative/ORISO-E2E',number:1};
 assert.throws(()=>boardAsset(write(dirty),Buffer.from('{"optional":[]}')),/not public|private/i);
});
