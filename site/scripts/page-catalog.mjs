import { createHash } from 'node:crypto';
export const locales = ['de', 'en'];
export const sourceHash = text => createHash('sha256').update(text).digest('hex');
export function headingSlugs(md) {
 const seen=new Map(), out=[]; let fence;
 for(const line of md.split('\n')) {
  const marker=line.match(/^\s*(`{3,}|~{3,})/);
  if(marker){ if(!fence) fence=marker[1][0]; else if(fence===marker[1][0]) fence=undefined; continue; }
  if(fence) continue;
  const h=line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/); if(!h) continue;
  const base=h[1].replace(/`/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').trim().toLowerCase().replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g,'').replace(/ /g,'-');
  const n=seen.get(base)??0; seen.set(base,n+1); out.push(n?`${base}-${n}`:base);
 }
 return out;
}
export function sectionAliases(source, translation) {
 const canonical=headingSlugs(source), local=headingSlugs(translation); const result={};
 canonical.forEach((slug,i)=>{result[slug]=slug;if(local[i])result[local[i]]=slug;});
 return result;
}
function publicSource(path) {
 if(/^docs\/platform\/repo-graphs\/ORISO-(?:E2E|Infra)\.mdx?$/.test(path)) return false;
 return /^(?:docs\/platform\/|product\/|oriso-platform\/|site\/home\.mdx$|index\.mdx?$)/.test(path) && !path.split('/').includes('..') && /\.mdx?$/.test(path) && !/(?:secret|credential|private)/i.test(path);
}
export function mergeCatalog(catalog, generatedPages) {
 const pages=[...catalog.pages]; const ids=new Set(pages.map(p=>p.id)), routes=new Set(pages.map(p=>p.route));
 for(const page of generatedPages){
  if(ids.has(page.id)||routes.has(page.route))throw Error(`Generated page collides with editorial catalog: ${page.id}`);
  ids.add(page.id);routes.add(page.route);pages.push(page);
 }
 return {...catalog,pages};
}
function generatedSource(page,read) {
 if(!/^docs\/generated\/(?!locales\/)[A-Za-z0-9_/-]+\.md$/.test(page.source)||page.source.includes('..'))return false;
 const policy=read('tools/truth-chain/public-repositories.json');
 if(!policy)throw Error('Generated catalog requires the public repository policy');
 const allowed=new Set(JSON.parse(policy).repositories), g=page.graphSource;
 return page.id===page.source.replace(/\.md$/,'') && page.route==='graphs/'+page.id.slice(15) && g?.scope==='declared-source-refs' && typeof g.generationId==='string' && Number.isFinite(Date.parse(g.generatedAt)) && Array.isArray(g.sources) && g.sources.length>0 && g.sources.every(p=>allowed.has(p.repository)&&/^refs\/heads\/[A-Za-z0-9_/-]+$/.test(p.ref)&&!p.ref.includes('..')&&/^[a-f0-9]{40}$/.test(p.sourceSHA));
}
export function buildPageIndex(catalog, read) {
 const coverage={currentPages:0,completePairs:0,missing:[],stale:[]};
 const pages=[...catalog.pages].sort((a,b)=>a.id.localeCompare(b.id,'en')).map(page=>{
  if(!publicSource(page.source)&&!generatedSource(page,read))throw Error(`Not a public source: ${page.source}`);
  const raw=read(page.source); if(raw===undefined)throw Error(`Missing canonical source: ${page.source}`);
  const hash=sourceHash(raw); const states={};
  for(const locale of locales){
   const record=page.translations?.[locale]; const translated=record ? read(record.path) : undefined;
   const state=translated===undefined?'missing':record.sourceHash===hash?'current':'stale';
   states[locale]={available:translated!==undefined,translationState:state,sectionAliases:sectionAliases(raw,translated??raw)};
   if(page.lifecycle==='current' && state!=='current') coverage[state].push({id:page.id,locale});
  }
  if(page.lifecycle==='current'){coverage.currentPages++;if(locales.every(l=>states[l].translationState==='current'))coverage.completePairs++;}
  return {id:page.id,route:page.route,aliases:page.aliases,owner:page.owner,lifecycle:page.lifecycle,source:page.source,sourceHash:hash,...(page.graphSource ? {graphSource:page.graphSource} : {}),locales:states};
 });
 return {version:1,pages,coverage};
}
export function validateFullCurrent(index) {
 const c=index.coverage;
 if(c.currentPages!==c.completePairs || c.missing.length || c.stale.length)throw Error(`Current documentation translations incomplete: ${c.completePairs}/${c.currentPages} pairs, ${c.missing.length} missing, ${c.stale.length} stale`);
 return true;
}
