import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {bindPlatformRelease, assertPlatformReleaseBinding} from './platform-release.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const publicSource = path => /^(docs\/platform\/|product\/|oriso-platform\/|site\/home\.mdx$|index\.mdx?$)/.test(path) && !path.split('/').includes('..') && !/(?:repo-graphs\/ORISO-(?:E2E|Infra)|secret|credential|private)/i.test(path);
const publicRepositories=new Set(JSON.parse(readFileSync(new URL('../truth-chain/public-repositories.json',import.meta.url),'utf8')).repositories);
function generatedSource(page) {
  const evidence=page?.graphSource;
  return /^docs\/generated\/(?!locales\/)[A-Za-z0-9_/-]+\.md$/.test(page?.source??'') && !page.source.split('/').includes('..') && evidence?.scope==='declared-source-refs' && typeof evidence.generationId==='string' && !Number.isNaN(Date.parse(evidence.generatedAt)) && Array.isArray(evidence.sources) && evidence.sources.length>0 && evidence.sources.every(source=>publicRepositories.has(source.repository) && /^[a-f0-9]{40}$/.test(source.sourceSHA) && typeof source.ref==='string');
}
const sourceBytes = (root,path,page) => {
  if (!publicSource(path) && !generatedSource(page)) throw Error(`Unapproved public source: ${path}`);
  return readFileSync(join(root,path));
};

export function snapshotSources(root,pages) {
  return Object.fromEntries(pages.filter(page=>!page.source.startsWith('docs/generated/')).map(page => [page.source,digest(sourceBytes(root,page.source))]));
}

export function assertSourcesUnchanged(root,snapshot) {
  for (const [path,hash] of Object.entries(snapshot)) {
    if (digest(sourceBytes(root,path)) !== hash) throw Error(`Editorial source changed during generation: ${path}`);
  }
}

function approvedOutput(path,pages,root) {
  const imported=path.match(/^_next\/static\/media\/([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+\.(png|jpe?g|webp|svg|gif)$/);
  if(imported) return ['logo','product/assets','oriso-platform/assets'].some(prefix=>{
    const original=join(root,prefix,`${imported[1]}.${imported[2]}`);
    return existsSync(original) && !lstatSync(original).isSymbolicLink() && digest(readFileSync(original))===digest(readFileSync(join(root,path)));
  });
  if (path==='api/search' || path==='404.html' || path==='404/index.html' || path==='favicon.svg') return true;
  if (/^_next\/static\/[A-Za-z0-9_./~+-]+\.(?:js|css|woff2?)$/.test(path)) return true;
  if (/^(?:logo|product\/assets|oriso-platform\/assets)\/[A-Za-z0-9_./~-]+\.(?:png|jpe?g|webp|svg|gif)$/.test(path)) return true;
  if (/^(?:de|en)\/llms(?:-full)?\.txt$/.test(path)) return true;
  const directory=path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';
  const filename=path.slice(directory?directory.length+1:0);
  const routes=new Set(['','_not-found']);
  for(const page of pages) {
    for(const alias of [page.route,...(page.aliases??[])]) routes.add(alias.replace(/^\/+|\/+$/g,''));
    for(const locale of ['de','en']) {
      const route=[locale,page.route].filter(Boolean).join('/');routes.add(route);
      if (path===`${locale}/llms.mdx/docs/${page.route? page.route+'/':''}content.md`) return true;
      if (path===`${locale}/og/docs/${page.route? page.route+'/':''}image.png`) return true;
    }
  }
  // Next exports the legacy /index alias under index/index when the root route also exists.
  if(routes.has('index'))routes.add('index/index');
  return routes.has(directory) && (filename==='index.html' || filename==='index.txt' || /^__next\.[^/]+\.txt$/.test(filename));
}

export function outputFiles(dir,root=dir,pages=[]) {
  return readdirSync(dir).sort().flatMap(name => {
    const path=join(dir,name), stat=lstatSync(path), rel=relative(root,path).replaceAll('\\','/');
    if (stat.isSymbolicLink()) throw Error(`Symlink not allowed in public output: ${rel}`);
    if (/(?:^|\/)(?:\.[^/]+|page-catalog\.json|evidence-status\.json|evidence-map\.[^/]+|[^/]*(?:secret|credential)[^/]*)$/i.test(rel) || rel.endsWith('.map')) throw Error(`Unapproved public output: ${rel}`);
    if (stat.isDirectory()) return outputFiles(path,root,pages);
    if (rel==='publication-manifest.json') return [];
    if (!approvedOutput(rel,pages,root)) throw Error(`Unapproved public output path: ${rel}`);
    return [{path:rel,sha256:digest(readFileSync(path)),bytes:stat.size}];
  });
}

export function buildManifest({root,outDir,index,revision,origin='https://docs.oriso.org',preview=false,releaseLock,generationManifest}) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw Error('A full source Git revision is required');
  const parsed=new URL(origin);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || !['https:','http:'].includes(parsed.protocol)) throw Error('Invalid public origin');
  const c=index.coverage;
  if (!c || !Number.isInteger(c.currentPages) || c.currentPages < 1 || !Array.isArray(c.missing) || !Array.isArray(c.stale)) throw Error('Missing coverage evidence');
  if (!preview && (c.completePairs!==c.currentPages || c.missing.length || c.stale.length)) throw Error('Current bilingual documentation incomplete');
  const files=outputFiles(outDir,outDir,index.pages);
  const available=new Set(files.map(file=>file.path));
  const pages=index.pages.map(page => {
    const actual=digest(sourceBytes(root,page.source,page));
    if (actual!==page.sourceHash) throw Error(`Catalog source hash mismatch: ${page.id}`);
    if (page.lifecycle==='current') {
      for (const locale of ['de','en']) {
        if (!preview && page.locales?.[locale]?.translationState!=='current') throw Error(`Current translation missing/stale: ${page.id}/${locale}`);
        const article=[locale,page.route,'index.html'].filter(Boolean).join('/');
        if (!available.has(article)) throw Error(`Published article missing: ${article}`);
      }
    }
    return {id:page.id,source:page.source,sourceHash:actual,route:page.route,aliases:page.aliases??[],lifecycle:page.lifecycle,...(page.graphSource?{graphSource:page.graphSource}:{})};
  });
  const graphSources=index.pages.find(page=>page.graphSource)?.graphSource.sources;
  const releaseBinding=releaseLock?bindPlatformRelease(releaseLock,revision,graphSources):undefined;
  if(!preview && !releaseBinding) throw Error('Platform release binding required; Dev builds are previews');
  if(!preview && (!generationManifest?.release || generationManifest.release.sha256!==releaseBinding.sha256)) throw Error('Verified release graph generation required');
  if(!preview) bindPlatformRelease(releaseLock,revision,generationManifest.sources);
  return {version:1,scope:'technical-docs',state:preview?'preview':'complete',sourceRevision:revision,origin:parsed.href.replace(/\/$/,''),...(releaseBinding?{releaseBinding}:{}),coverage:c,pages,files};
}

export async function verifyLive(manifest,{timeoutMs=15000,concurrency=8}={}) {
  if (manifest.state!=='complete') throw Error('Preview is not public acceptance evidence');
  assertPlatformReleaseBinding(manifest.releaseBinding,manifest.sourceRevision);
  const fetchBytes=async path => {
    const url=new URL(path,manifest.origin+'/');
    url.searchParams.set('sourceRevision',manifest.sourceRevision);
    const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
    if (!response.ok) throw Error(`Public readback failed ${response.status}: ${path}`);
    return Buffer.from(await response.arrayBuffer());
  };
  const remote=await fetchBytes('publication-manifest.json');
  if (digest(remote)!==digest(JSON.stringify(manifest)+'\n')) throw Error('Published manifest differs from the reviewed artifact');
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(concurrency,manifest.files.length)},async()=>{
    while(cursor<manifest.files.length){
      const file=manifest.files[cursor++];
      const bytes=await fetchBytes(file.path);
      if(bytes.length!==file.bytes || digest(bytes)!==file.sha256) throw Error(`Published content hash mismatch: ${file.path}`);
    }
  }));
  return {sourceRevision:manifest.sourceRevision,filesVerified:manifest.files.length,verifiedAt:new Date().toISOString()};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
  try {
    if (process.argv.includes('--verify-live')) {
      const manifest=JSON.parse(readFileSync(arg('--manifest','site/out/publication-manifest.json'),'utf8'));
      console.log(JSON.stringify(await verifyLive(manifest)));
    } else {
      const root=resolve(arg('--root','.')),outDir=resolve(root,arg('--out','site/out'));
      const index=JSON.parse(readFileSync(resolve(root,arg('--index','site/content/page-index.json')),'utf8'));
      const preview=process.argv.includes('--preview');
      if (!preview && execFileSync('git',['status','--porcelain','--','docs.json','docs/platform','product','oriso-platform','site/home.mdx','site/page-catalog.json','site/translations'],{cwd:root,encoding:'utf8'}).trim()) throw Error('Commit the reviewed source and translations before a full publication');
      const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
      const releasePath=arg('--release-manifest');
      const releaseLock=releasePath?JSON.parse(readFileSync(releasePath,'utf8')):undefined;
      const generationPath=arg('--generation');
      if(!preview && !generationPath) throw Error('Verified release graph generation required');
      if(!preview) execFileSync('python3',['-m','bundle','validate',resolve(generationPath)],{cwd:join(root,'tools/understand-anything'),env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
      const generationManifest=generationPath?JSON.parse(readFileSync(join(generationPath,'manifest.json'),'utf8')):undefined;
      const manifest=buildManifest({root,outDir,index,revision,preview,releaseLock,generationManifest,origin:arg('--origin','https://docs.oriso.org')});
      writeFileSync(join(outDir,'publication-manifest.json'),JSON.stringify(manifest)+'\n');
      console.log(JSON.stringify({state:manifest.state,sourceRevision:revision,pages:manifest.pages.length,files:manifest.files.length}));
    }
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
