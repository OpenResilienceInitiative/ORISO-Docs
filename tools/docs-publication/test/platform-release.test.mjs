import {releaseFixture} from './release-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPlatformRelease, assertPlatformReleaseBinding} from '../platform-release.mjs';
const revision='a'.repeat(40);
const lock=()=>releaseFixture(revision);
test('release binding retains exact released source vector and catches tampering',()=>{
 const release=bindPlatformRelease(lock(),revision,lock().sources);assert.equal(assertPlatformReleaseBinding(release,revision),release);
 assert.throws(()=>assertPlatformReleaseBinding({...release,version:'v2.0.8'},revision),/version|hash/);
 assert.throws(()=>assertPlatformReleaseBinding(undefined,revision),/Dev previews/);
 assert.throws(()=>bindPlatformRelease(lock(),'b'.repeat(40)),/revision/);
 assert.throws(()=>bindPlatformRelease(lock(),revision,[{...lock().sources[0],sourceSHA:'b'.repeat(40)}]),/source vector/);
});
test('mutable tips, private inputs and invented release identities rejected',()=>{
 for(const ref of ['dev','refs/heads/dev','refs/heads/main'])assert.throws(()=>bindPlatformRelease({...lock(),sources:[{...lock().sources[0],ref}]},revision),/Immutable/);
 assert.throws(()=>bindPlatformRelease({...lock(),sources:[...lock().sources,{repository:'ORISO-E2E',ref:'refs/tags/v1',sourceSHA:revision}]},revision),/Immutable/);
 assert.throws(()=>bindPlatformRelease({...lock(),releaseUrl:'https://github.com/OpenResilienceInitiative/ORISO-Helm/releases/tag/v2.0.8'},revision),/version/);
 assert.throws(()=>bindPlatformRelease({...lock(),sources:[...lock().sources,...lock().sources]},revision),/Immutable/);
});

test("activation refuses incomplete release vectors and origins outside that vector",()=>{const incomplete=lock();incomplete.sources=incomplete.sources.filter(s=>s.repository!=="ORISO-Helm");assert.throws(()=>bindPlatformRelease(incomplete,revision),/source vector\/origin/);const invalid=lock();invalid.releaseUrl="https://github.com/OpenResilienceInitiative/ORISO-Other/releases/tag/v2.0.9";assert.throws(()=>bindPlatformRelease(invalid,revision),/source vector\/origin/);});

test('other public release origins fail with an otherwise complete sixteen-source lock',()=>{for(const repository of ['ORISO-Frontend','ORISO-Docs','ORISO-UserService']){const invalid=lock();invalid.releaseUrl=invalid.releaseUrl.replace('/ORISO-Helm/','/'+repository+'/');assert.throws(()=>bindPlatformRelease(invalid,revision),/source vector\/origin/);}});
