import {releaseFixture} from './release-fixture.mjs';
import {bindPlatformRelease} from '../platform-release.mjs';
const releaseBinding=revision=>bindPlatformRelease(releaseFixture(revision),revision);
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { installRelease } from '../release.mjs';

test('activation retains old release bytes and refuses modified current artifacts',t=>{
  const root=mkdtempSync(join(tmpdir(),'oriso-release-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const artifactDir=join(root,'artifact');mkdirSync(artifactDir);
  const destinationRoot=join(root,'published');
  const expectedOrigin='https://docs.oriso.org'; let expectedRevision='a'.repeat(40);
  const write=text=>{
    writeFileSync(join(artifactDir,'index.html'),text);
    const manifest={state:'complete',scope:'technical-docs',origin:expectedOrigin,sourceRevision:expectedRevision,releaseBinding:releaseBinding(expectedRevision),files:[{path:'index.html',bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')}]};
    writeFileSync(join(artifactDir,'publication-manifest.json'),JSON.stringify(manifest)+'\n');
  };
  write('first');const first=installRelease({artifactDir,destinationRoot,expectedOrigin,expectedRevision});
  expectedRevision='b'.repeat(40);write('second');const second=installRelease({artifactDir,destinationRoot,expectedOrigin,expectedRevision});
  assert.equal(second.previous,first.current);
  assert.equal(readFileSync(join(destinationRoot,first.current,'index.html'),'utf8'),'first');
  assert.equal(readlinkSync(join(destinationRoot,'current')),second.current);
  writeFileSync(join(artifactDir,'index.html'),'corrupt');
  assert.throws(()=>installRelease({artifactDir,destinationRoot,expectedOrigin,expectedRevision}),/content hash/);
  assert.equal(readlinkSync(join(destinationRoot,'current')),second.current);
  writeFileSync(join(artifactDir,'.env'),'unlisted internal fixture');
  assert.throws(()=>installRelease({artifactDir,destinationRoot,expectedOrigin,expectedRevision}),/public output/);
  assert.equal(readlinkSync(join(destinationRoot,'current')),second.current);
});

import {symlinkSync} from 'node:fs';
test('activation uses the existing nginx symlink and preserves historical direct releases',t=>{
 const root=mkdtempSync(join(tmpdir(),'oriso-existing-root-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const destinationRoot=join(root,'docs-releases'), currentLink=join(root,'docs-site'), artifactDir=join(root,'artifact');
 mkdirSync(join(destinationRoot,'historic'),{recursive:true});mkdirSync(artifactDir);writeFileSync(join(destinationRoot,'historic/index.html'),'historic');symlinkSync(join(destinationRoot,'historic'),currentLink);
 const bytes=Buffer.from('new');writeFileSync(join(artifactDir,'index.html'),bytes);
 const expectedOrigin='https://docs.oriso.org',expectedRevision='a'.repeat(40);
 writeFileSync(join(artifactDir,'publication-manifest.json'),JSON.stringify({state:'complete',scope:'technical-docs',origin:expectedOrigin,sourceRevision:expectedRevision,releaseBinding:releaseBinding(expectedRevision),files:[{path:'index.html',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]}));
 const result=installRelease({artifactDir,destinationRoot,currentLink,expectedOrigin,expectedRevision});
 assert.equal(result.previous,join(destinationRoot,'historic'));
 assert.equal(readFileSync(join(currentLink,'index.html'),'utf8'),'new');
 assert.equal(readFileSync(join(destinationRoot,'historic/index.html'),'utf8'),'historic');
});
