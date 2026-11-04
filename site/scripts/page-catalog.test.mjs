import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageIndex, validateFullCurrent, sourceHash, sectionAliases } from './page-catalog.mjs';
const page = {id:'docs/platform/a', source:'docs/platform/a.md', route:'stable/a', aliases:['docs/platform/a.md'],owner:'ORISO-Docs',lifecycle:'current',translations:{de:{path:'site/translations/de/docs/platform/a.md',sourceHash:sourceHash('# Start\n')},en:{path:'site/translations/en/docs/platform/a.md',sourceHash:'old'}}};
test('coverage distinguishes missing and stale and refuses publication',()=>{
 const files={'docs/platform/a.md':'# Start\n','site/translations/de/docs/platform/a.md':'# Anfang\n','site/translations/en/docs/platform/a.md':'# Begin\n'};
 const index=buildPageIndex({version:1,pages:[page]},p=>files[p]);
 assert.equal(index.pages[0].locales.en.translationState,'stale');
 assert.equal(index.pages[0].locales.de.translationState,'current');
 assert.equal(index.coverage.completePairs,0);
 assert.throws(()=>validateFullCurrent(index),/incomplete/);
 delete files['site/translations/de/docs/platform/a.md'];
 assert.equal(buildPageIndex({pages:[page]},p=>files[p]).pages[0].locales.de.available,false);
});
test('localized headings map to canonical repeated anchors, excluding code',()=>{
 assert.deepEqual(sectionAliases('## Setup\n## Setup\n```\n## Ignore\n```','## Einrichtung\n## Einrichtung\n```\n## Ignorieren\n```'),{'setup':'setup','einrichtung':'setup','setup-1':'setup-1','einrichtung-1':'setup-1'});
});
test('source hashes bind exact bytes, catalog output is deterministic and safe',()=>{
 assert.notEqual(sourceHash('x'),sourceHash('x\n'));
 const files={'docs/platform/a.md':'# Start\n'};
 const first=buildPageIndex({pages:[page]},p=>files[p]);
 assert.deepEqual(first,buildPageIndex({pages:[page]},p=>files[p]));
 assert.equal(JSON.stringify(first).includes('site/translations'),false);
 assert.throws(()=>buildPageIndex({pages:[{...page,source:'../private.md'}]},p=>files[p]),/public source/);
});
import { makeLinkRewriter } from './catalog/link-rewriter.mjs';
test('original invalid md alias resolves and preserves query, fragment and literal code',()=>{
 const rewrite=makeLinkRewriter(new Map([['docs/platform/authentication-and-keycloak','/en/plattform/core-systems/authentication-and-keycloak'],['plattform/core-systems/authentication-and-keycloak','/en/plattform/core-systems/authentication-and-keycloak']]),()=>false,new Map([['docs/platform/authentication-and-keycloak',['21-keycloak']]]));
 const input='[Keycloak](./authentication-and-keycloak.md?resource=foo#2-1-keycloak)\n```sh\n[Keycloak](./authentication-and-keycloak.md)\n```';
 assert.equal(rewrite.rewrite(input,'docs/platform'),'[Keycloak](/en/plattform/core-systems/authentication-and-keycloak?resource=foo#21-keycloak)\n```sh\n[Keycloak](./authentication-and-keycloak.md)\n```');
 const localized=rewrite.rewrite('[Keycloak](/de/plattform/core-systems/authentication-and-keycloak)','docs/platform');
 assert.equal(localized,'[Keycloak](/en/plattform/core-systems/authentication-and-keycloak)');
});
test('exact historic Keycloak URL localizes without changing external URLs',()=>{
 const key='plattform/platform-flows/local-development/authentication-and-keycloak';
 const linker=makeLinkRewriter(new Map([[key,'/de/plattform/core-systems/authentication-and-keycloak']]),()=>false,new Map());
 const bad='https://docs.oriso.org/'+key+'.md';
 assert.equal(linker.rewrite(`[Keycloak](${bad})`,'docs/platform'),'[Keycloak](/de/plattform/core-systems/authentication-and-keycloak)');
 assert.equal(linker.rewrite('[Other](https://example.org/x.md)','docs/platform'),'[Other](https://example.org/x.md)');
});
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, cpSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
test('actual generator excludes private repository graph dumps from public index and files',t=>{
 const sandbox=mkdtempSync(join(tmpdir(),'oriso-catalog-generator-'));t.after(()=>rmSync(sandbox,{recursive:true,force:true}));
 mkdirSync(join(sandbox,'site/content/docs'),{recursive:true});
 for(const folder of ['docs','product','oriso-platform']) symlinkSync(join(repoRoot,folder),join(sandbox,folder));
 for(const file of ['docs.json','index.mdx']) cpSync(join(repoRoot,file),join(sandbox,file));
 for(const file of ['home.mdx','page-catalog.json']) cpSync(join(repoRoot,'site',file),join(sandbox,'site',file));
 cpSync(join(repoRoot,'site/scripts'),join(sandbox,'site/scripts'),{recursive:true});
 symlinkSync(join(repoRoot,'site/node_modules'),join(sandbox,'site/node_modules'));
 symlinkSync(join(repoRoot,'site/translations'),join(sandbox,'site/translations'));
 execFileSync(process.execPath,['site/scripts/sync-content.mjs'],{cwd:sandbox,stdio:'pipe'});
 const index=JSON.parse(readFileSync(join(sandbox,'site/content/page-index.json'),'utf8'));
 for(const name of ['ORISO-E2E','ORISO-Infra']) {
  assert.equal(index.pages.some(p=>p.source.includes('/repo-graphs/'+name)),false);
  for(const locale of ['de','en']) for(const ext of ['md','mdx'])
   assert.equal(existsSync(join(sandbox,`site/content/docs/plattform/archive/${name}.${locale}.${ext}`)),false);
  assert.throws(()=>buildPageIndex({pages:[{...page,source:`docs/platform/repo-graphs/${name}.md`}]},()=>''),/public source/);
 }
});
