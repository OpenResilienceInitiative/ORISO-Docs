import {readFileSync,existsSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const publicRepos=new Set(JSON.parse(readFileSync(new URL('../public-repositories.json',import.meta.url),'utf8')).repositories);
const templates=new Set(['architecture-tiers','endpoint-inventory','repository-map','backend-services','truth-chain-status','super-graph-index','super-graph-explorer','super-graph-detailed','understand-anything-inventory','graph-validation-report']);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function assert(ok,message){if(!ok)throw Error('Generated catalog rejected: '+message);}
function safeRead(root,path){let here=root;for(const part of path.split('/')){here=join(here,part);assert(!lstatSync(here).isSymbolicLink(),'symlink artifact');}return readFileSync(here);}
export function loadGeneratedCatalog(root) {
 const registryPath='docs/generated/page-catalog.json';
 if(!existsSync(join(root,registryPath)))return [];
 const registry=JSON.parse(safeRead(root,registryPath));
 assert(registry.version===1&&registry.generated===true&&typeof registry.generationId==='string'&&registry.generationId.length>0,'unmarked registry');
 assert(Array.isArray(registry.pages),'pages missing');const ids=new Set();
 for(const page of registry.pages) {
  assert(typeof page.source==='string'&&!page.source.split('/').includes('..'),'unsafe source');
  const stem=page.source.match(/^docs\/generated\/(.+)\.md$/)?.[1];
  assert(stem&&(templates.has(stem)||(/^repo-graphs\/(ORISO-[A-Za-z0-9]+)$/.test(stem)&&publicRepos.has(stem.slice(12)))),'unapproved generated source');
  assert(page.id==='docs/generated/'+stem&&!ids.has(page.id),'id mismatch/duplicate');ids.add(page.id);
  assert(page.route==='graphs/'+stem&&page.owner==='ORISO-Docs'&&['current','archived'].includes(page.lifecycle),'page routing/owner/lifecycle mismatch');
  const provenance=page.graphSource;
  assert(provenance?.generationId===registry.generationId&&provenance.scope==='declared-source-refs'&&Array.isArray(provenance.sources)&&provenance.sources.length>0,'generation provenance absent');
  assert(Number.isFinite(Date.parse(provenance.generatedAt)),'generation timestamp invalid');
  const repositories=new Set();
  for(const source of provenance.sources){assert(publicRepos.has(source.repository)&&!repositories.has(source.repository)&&/^(refs\/(heads|tags)\/[A-Za-z0-9_.+/-]+|[a-f0-9]{40})$/.test(source.ref)&&!source.ref.includes('..')&&/^[a-f0-9]{40}$/.test(source.sourceSHA),'private/unknown/unbound source metadata');repositories.add(source.repository);}
  const bytes=safeRead(root,page.source),content=bytes.toString('utf8'),frontmatter=content.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  assert(frontmatter&&/^generated: true$/m.test(frontmatter)&&/^generatedFrom: public-graph-export$/m.test(frontmatter),'unmarked source content');
  for(const locale of ['de','en']) {
   const record=page.translations?.[locale];assert(record?.path===`docs/generated/locales/${locale}/${stem}.md`&&record.sourceHash===hash(bytes),'locale source binding/path mismatch');
   const translation=safeRead(root,record.path).toString('utf8');assert(/^---\n[\s\S]*?\ngenerated: true\n/.test(translation),'unmarked generated locale');
  }
 }
 return registry.pages;
}
