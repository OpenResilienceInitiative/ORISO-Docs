import {releaseFixture} from './release-fixture.mjs';
import {bindPlatformRelease} from '../platform-release.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { buildManifest, snapshotSources, assertSourcesUnchanged, verifyLive } from '../publication.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'oriso-docs-publication-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'out/de/article'), { recursive: true });
  mkdirSync(join(root, 'out/en/article'), { recursive: true });
  mkdirSync(join(root, 'docs/platform'), { recursive: true });
  writeFileSync(join(root, 'docs/platform/article.md'), '# Source\n');
  writeFileSync(join(root, 'out/de/article/index.html'), '<html lang="de">Deutsch</html>');
  writeFileSync(join(root, 'out/en/article/index.html'), '<html lang="en">English</html>');
  const index = { version: 1, coverage: { currentPages: 1, completePairs: 1, missing: [], stale: [] }, pages: [{ id: 'article', source: 'docs/platform/article.md', route: 'article', lifecycle: 'current', sourceHash: createHash('sha256').update('# Source\n').digest('hex'), locales: {de:{translationState:'current'},en:{translationState:'current'}} }] };
  const result={ root, outDir: join(root, 'out'), index, revision: 'a'.repeat(40), origin: 'https://docs.oriso.org', releaseLock:releaseFixture('a'.repeat(40)) };
  result.generationManifest={sources:result.releaseLock.sources,release:{sha256:bindPlatformRelease(result.releaseLock,result.revision).sha256}};
  return result;
}

test('full publication rejects missing/stale pairs and unresolved source binding', t => {
  const f = fixture(t);
  f.index.pages[0].sourceHash = '6e';
  assert.throws(() => buildManifest(f), /source hash/i);
  f.index.coverage.completePairs = 0; f.index.coverage.missing.push({ id:'article',locale:'en' });
  assert.throws(() => buildManifest(f), /incomplete/i);
});

test('internal output and editorial mutation cannot enter publication', t => {
  const f = fixture(t);
  const snapshot = snapshotSources(f.root, f.index.pages);
  writeFileSync(join(f.root, 'docs/platform/article.md'), '# Rewritten editorial\n');
  assert.throws(() => assertSourcesUnchanged(f.root, snapshot), /editorial/i);
  writeFileSync(join(f.outDir, '.env'), 'internal fixture');
  assert.throws(() => buildManifest({ ...f, preview:true }), /public output/i);
});

test('actual HTTP readback detects changed bytes despite 200 responses', async t => {
  const f = fixture(t);
  const { createHash } = await import('node:crypto');
  f.index.pages[0].sourceHash = createHash('sha256').update('# Source\n').digest('hex');
  let altered = false; let manifest;
  const server = createServer((req,res) => {
    if (req.url.split('?')[0] === '/publication-manifest.json') res.end(JSON.stringify(manifest)+'\n');
    else { res.end(req.url.startsWith('/de/') ? '<html lang="de">Deutsch</html>' : altered ? 'stale server bytes' : '<html lang="en">English</html>'); }
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  manifest = buildManifest({ ...f, origin: `http://127.0.0.1:${server.address().port}` });
  const result = await verifyLive(manifest);
  assert.equal(result.filesVerified, 2);
  altered = true;
  await assert.rejects(() => verifyLive(manifest), /content hash/i);
});


test('public inventory rejects ordinary-extension internal evidence',t=>{
 const f=fixture(t);
 writeFileSync(join(f.outDir,'internal-evidence.json'),'internal fixture');
 assert.throws(()=>buildManifest({...f,preview:true}),/public output/);
 rmSync(join(f.outDir,'internal-evidence.json'));
 writeFileSync(join(f.outDir,'private-report.pdf'),'internal fixture');
 assert.throws(()=>buildManifest({...f,preview:true}),/public output/);
});

test('framework imported images require an identical approved public source asset',t=>{
 const f=fixture(t);mkdirSync(join(f.outDir,'oriso-platform/assets'),{recursive:true});mkdirSync(join(f.outDir,'_next/static/media'),{recursive:true});
 writeFileSync(join(f.outDir,'oriso-platform/assets/architecture-overview.png'),'public image fixture');
 writeFileSync(join(f.outDir,'_next/static/media/architecture-overview.hash123.png'),'public image fixture');
 assert.doesNotThrow(()=>buildManifest({...f,preview:true}));
 writeFileSync(join(f.outDir,'_next/static/media/architecture-overview.hash123.png'),'unapproved different image');
 assert.throws(()=>buildManifest({...f,preview:true}),/public output/);
});

test('Dev/source-only artifacts cannot be activated as release artifacts',t=>{const f=fixture(t);delete f.releaseLock;assert.throws(()=>buildManifest(f),/Platform release binding/);assert.equal(buildManifest({...f,preview:true}).state,'preview');});
