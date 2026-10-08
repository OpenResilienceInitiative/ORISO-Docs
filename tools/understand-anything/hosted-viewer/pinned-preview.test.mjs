import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const tooling=fileURLToPath(new URL('../',import.meta.url));
test('pinned upstream applies schema, source-preview and call-relations and imports real safe resolver',()=>{
 const lock=JSON.parse(fs.readFileSync(path.join(tooling,'toolchain.lock.json')));assert.deepEqual(lock.patches.map(p=>p.path),['patches/oriso-schema-viewer-v1.patch','patches/oriso-public-source-preview-v1.patch','patches/oriso-call-relations-v1.patch']);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pinned-preview-'));
 try{
 execFileSync('git',['init','-q',temp]);execFileSync('git',['-C',temp,'fetch','--quiet','--depth=1',lock.upstream.url,lock.upstream.commit],{stdio:'pipe'});execFileSync('git',['-C',temp,'checkout','--quiet','--detach','FETCH_HEAD']);
 for(const p of lock.patches){const bytes=fs.readFileSync(path.join(tooling,p.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);execFileSync('git',['-C',temp,'apply','--check',path.join(tooling,p.path)]);execFileSync('git',['-C',temp,'apply',path.join(tooling,p.path)]);}
 const vite=fs.readFileSync(path.join(temp,'understand-anything-plugin/packages/dashboard/vite.config.ts'),'utf8');assert.ok(vite.includes('sourceLocation(graph'));assert.ok(vite.includes('url.searchParams.get("nodeId")'));
 const viewer=fs.readFileSync(path.join(temp,'understand-anything-plugin/packages/dashboard/src/components/CodeViewer.tsx'),'utf8');assert.ok(viewer.includes('SOURCE_UNAVAILABLE_REPO'));assert.ok(viewer.includes('node.id'));
 const body=viewer.match(/function fileContentUrl[^\n]*\{\n([\s\S]*?)\n\}/)[1];const sourceUrl=new Function('filePath','token','nodeId','window',body);for(const pathname of ['/users/','/users','/users/index.html'])assert.ok(sourceUrl('example.txt','synthetic','public',{location:{pathname}}).startsWith('/users/file-content.json?'));
 const nodeInfo=fs.readFileSync(path.join(temp,'understand-anything-plugin/packages/dashboard/src/components/NodeInfo.tsx'),'utf8');assert.ok(nodeInfo.includes('<OrisoCallRelations'));assert.ok(fs.existsSync(path.join(temp,'understand-anything-plugin/packages/dashboard/src/components/orisoCallModel.ts')));
 const app=fs.readFileSync(path.join(temp,'understand-anything-plugin/packages/dashboard/src/App.tsx'),'utf8');assert.ok(app.includes('const path = `${base.endsWith')); 
 const installer=fs.readFileSync(path.join(tooling,'install.py'),'utf8');assert.ok(installer.includes('hosted-viewer/source-location.mjs'));assert.ok(installer.includes('hosted-viewer/source-location.d.mts'));assert.ok(installer.includes("['--filter', '@understand-anything/dashboard', 'build']"));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
