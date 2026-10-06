import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {bindPlatformRelease,assertPlatformReleaseBinding} from '../../../docs-publication/platform-release.mjs';
import {isDeepStrictEqual} from 'node:util';
import {renderFeatures} from './render-features.mjs';
import {renderGlossary} from './render-glossary.mjs';
import {validateGlossarySources} from '../../lib/glossary-projection.mjs';
import {immutableSource} from '../../ua-glossary-project.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=p=>/^(index\.html|status\.json|operator-snapshot\.json|assets\/(hub\.css|lang\.js|status\.js|glossary\.js)|glossary\/(index\.html|catalog\.json|bindings\.json|sources\/(seed|bjorn-reconciliation|naming-audit)\.md)|features\/(index|de|en|case-handover)\.html)$/.test(p);
function files(root){return fs.readdirSync(root,{recursive:true}).filter(p=>{const stat=fs.lstatSync(path.join(root,p));if(stat.isSymbolicLink())throw Error('Hub symlinks are forbidden');return stat.isFile();}).sort();}
function glossarySources(root) {
 const docs=immutableSource(root,'ORISO-Docs'),bytes=docs.readSource('tools/understand-anything/glossary/catalog.json'),data=JSON.parse(bytes);
 const sourceBindings=validateGlossarySources(data,[docs]);
 const index=path.join(root,'tools/understand-anything/site/hub/glossary/index.html');
 if(fs.readFileSync(index,'utf8')!==renderGlossary(data))throw Error('Hub glossary renderer output differs');
 return {data,bytes,sourceBindings,documentationRevision:docs.revision};
}
function glossaryArtifact(root,generation,manifest) {
 const authored=glossarySources(root),info=manifest.glossary;
 if(!info || info.catalogPath!=='glossary/catalog.json'||info.bindingsPath!=='glossary/bindings.json')throw Error('Generation glossary artifact binding required');
 const bytes=fs.readFileSync(path.join(generation,info.catalogPath)),report=JSON.parse(fs.readFileSync(path.join(generation,info.bindingsPath)));
 const vector=Object.fromEntries(manifest.sources.map(s=>[s.repository,s.sourceSHA]));
 if(!bytes.equals(authored.bytes)||report.catalogHash!==hash(bytes)||report.documentationRevision!==authored.documentationRevision||vector['ORISO-Docs']!==authored.documentationRevision||!isDeepStrictEqual(report.sourceVector,vector)||!isDeepStrictEqual(report.sourceBindings,authored.sourceBindings))throw Error('Hub glossary selected source binding differs');
 const home=fs.readFileSync(path.join(root,'tools/understand-anything/site/hub/index.html'),'utf8'),routes=new Map();
 for(const match of home.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
  const repository=match[2].match(/data-ua-nodes="([^"]+)"/)?.[1];if(repository)routes.set(repository,match[1]);
 }
 // The deployed Docs route is the Supergraph. Exact IDs are displayed, not invented node-selection queries.
 const superRoute=[...home.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].find(m=>m[2].includes('Supergraph')&&m[1].startsWith('/docs/'))?.[1];
 const graphMappings=report.graphMappings.map(outcome=>{
  if(outcome.state==='unavailable')return outcome;
  const graph=JSON.parse(fs.readFileSync(path.join(generation,outcome.repository,'.understand-anything/knowledge-graph.json'))),nodes=graph.nodes.filter(n=>n.id===outcome.nodeId);
  if(nodes.length!==1 || nodes[0].type!==(outcome.mode==='domain-concept'?'concept':'file') || !nodes[0].metadata?.glossary?.mappings.some(m=>m.conceptId===outcome.conceptId&&m.state===outcome.state&&m.selectedRevision===outcome.selectedRevision))throw Error('Hub glossary graph mapping differs: '+outcome.nodeId);
  if(outcome.state!=='verified')return outcome;
  if(outcome.repository==='ORISO-Docs') {
   const supergraph=JSON.parse(fs.readFileSync(path.join(generation,'ORISO-Supergraph/.understand-anything/knowledge-graph.json'))),viewerNodeId='ORISO-Docs::'+outcome.nodeId;
   return supergraph.nodes.some(n=>n.id===viewerNodeId)&&superRoute?{...outcome,href:superRoute,viewerNodeId}:outcome;
  }
  return routes.has(outcome.repository)?{...outcome,href:routes.get(outcome.repository)}:outcome;
 });
 const sourceBindings=authored.sourceBindings.map(binding=>binding.path?.startsWith('tools/understand-anything/glossary/sources/')?{...binding,href:'/glossary/sources/'+path.basename(binding.path)}:binding);
 return {...authored,report:{...report,sourceBindings,graphMappings}};
}
export function validateSources(root){
 const hub=path.join(root,'tools/understand-anything/site/hub'),data=JSON.parse(fs.readFileSync(path.join(hub,'features/catalog.json')));
 for(const f of data.features){
  if(!/^product\/features\/[a-z-]+\.mdx$/.test(f.source)||hash(fs.readFileSync(path.join(root,f.source)))!==f.sourceHash)throw Error('Stale hub source binding: '+f.id);
  const page=JSON.parse(fs.readFileSync(path.join(root,'site/page-catalog.json'))).pages.find(p=>p.id===f.id);if(!page||page.route!==f.route)throw Error('Hub canonical route differs: '+f.id);
  for(const locale of ['de','en']){const binding=page.translations[locale];if(!binding||binding.sourceHash!==f.sourceHash)throw Error('Hub translation binding stale: '+f.id+'/'+locale);const text=fs.readFileSync(path.join(root,binding.path),'utf8');for(const [key,stored] of [['title',f[locale].title],['description',f[locale].summary]]){const match=text.match(new RegExp('^'+key+':\\s*"(.*?)"\\s*$','m'));if(!match||match[1]!==stored)throw Error('Hub locale summary differs: '+f.id+'/'+locale);}}
  const revision=execFileSync('git',['log','-1','--format=%H','--',f.source],{cwd:root,encoding:'utf8'}).trim();if(revision!==f.sourceRevision)throw Error('Stale hub source revision: '+f.id);
 }
 for(const locale of ['de','en'])if(fs.readFileSync(path.join(hub,`features/${locale}.html`),'utf8')!==renderFeatures(data,locale))throw Error('Hub renderer output differs: '+locale);
 if(fs.readFileSync(path.join(hub,'features/index.html'),'utf8')!==renderFeatures(data,'de'))throw Error('Hub renderer output differs: index');
 glossarySources(root);return data;
}
export function buildHub({root,out,generation,origin,revision,releaseLock,operatorSnapshot,operatorConfirmation}){
 validateSources(root);const url=new URL(origin);if(url.username||url.password||url.search||url.hash||!['https:','http:'].includes(url.protocol))throw Error('Invalid hub origin');if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Exact source revision required');if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==revision)throw Error('Hub producer source revision mismatch');
 const manifest=JSON.parse(fs.readFileSync(path.join(generation,'manifest.json'))),policy=JSON.parse(fs.readFileSync(path.join(root,'tools/truth-chain/public-repositories.json'))).repositories;
 // The actual pinned bundle validates hashes, source fingerprints, inventory and age.
 execFileSync('python3',['-m','bundle','validate',generation],{cwd:path.join(root,'tools/understand-anything'),env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:'pipe'});
 if(manifest.sources.some(s=>!policy.includes(s.repository)))throw Error('Non-public hub generation');
 const releaseBinding=releaseLock?bindPlatformRelease(releaseLock,revision,manifest.sources):undefined;
 if(releaseBinding&&manifest.release?.sha256!==releaseBinding.sha256)throw Error('Graph generation lacks matching verified platform release evidence');
 const operator=JSON.parse(execFileSync('python3',[path.join(root,'tools/public_operator_snapshot.py'),'--bundle',...(operatorSnapshot?['--snapshot',operatorSnapshot]:[]),...(operatorConfirmation?['--confirmation',operatorConfirmation]:[])],{encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','pipe']}));
 const glossary=glossaryArtifact(root,generation,manifest);
 const refs=[...new Set(manifest.sources.map(s=>s.ref.replace(/^refs\/heads\//,'')))].sort();
 fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('Hub artifact output must be empty');
 const hub=path.join(root,'tools/understand-anything/site/hub');for(const p of files(hub).filter(allowed)){fs.mkdirSync(path.dirname(path.join(out,p)),{recursive:true});fs.copyFileSync(path.join(hub,p),path.join(out,p));}
 fs.mkdirSync(path.join(out,'glossary/sources'),{recursive:true});for(const filename of ['seed.md','bjorn-reconciliation.md','naming-audit.md'])fs.writeFileSync(path.join(out,'glossary/sources',filename),immutableSource(root,'ORISO-Docs').readSource('tools/understand-anything/glossary/sources/'+filename));fs.writeFileSync(path.join(out,'glossary/catalog.json'),glossary.bytes);fs.writeFileSync(path.join(out,'glossary/bindings.json'),JSON.stringify(glossary.report)+'\n');fs.writeFileSync(path.join(out,'glossary/index.html'),renderGlossary(glossary.data,glossary.report));
 fs.writeFileSync(path.join(out,'operator-snapshot.json'),JSON.stringify(operator.snapshot)+'\n');
 for(const file of ['index.html','features/index.html','features/de.html','features/en.html']){const target=path.join(out,file),locale=file==='features/en.html'?'en':'de';const section=file==='index.html'?operator.html.de+operator.html.en:operator.html[locale];fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('</body>',section+'</body>'));}
 const sources=manifest.sources.map(source=>{const graph=JSON.parse(fs.readFileSync(path.join(generation,source.repository,'.understand-anything/knowledge-graph.json')));return {...source,name:source.repository,branch:source.ref.replace(/^refs\/heads\//,''),nodes:graph.nodes.length};});
 fs.writeFileSync(path.join(out,'status.json'),JSON.stringify({operatorSnapshotHash:operator.snapshot.snapshotHash,operatorStatus:operator.snapshot.status,operatorFieldsConfirmed:operator.operatorFieldsConfirmed,releaseVersion:releaseBinding?.version,releasedAt:manifest.release?.publishedAt,releaseSources:releaseBinding?.sources,branch:refs.join(','),generatedAt:manifest.generatedAt,generationId:manifest.generationId,repositories:sources.length,sources,nodes:sources.reduce((n,s)=>n+s.nodes,0)})+'\n');
 const result={operatorSnapshotHash:operator.snapshot.snapshotHash,operatorFieldsConfirmed:operator.operatorFieldsConfirmed,glossary:{catalogHash:hash(glossary.bytes),documentationRevision:glossary.documentationRevision,sourceVector:glossary.report.sourceVector,sourceBindings:glossary.sourceBindings.length,graphMappings:glossary.report.graphMappings.length},version:1,scope:'understand-hub',state:releaseBinding?'complete':'preview',releaseBinding,origin,sourceRevision:revision,graphGenerationId:manifest.generationId,files:files(out).map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(out,p)))}))};
 fs.writeFileSync(path.join(out,'hub-manifest.json'),JSON.stringify(result)+'\n');return result;
}
function verify(root,m){if(!m.glossary || m.glossary.documentationRevision!==m.sourceRevision || m.glossary.catalogHash!==hash(fs.readFileSync(path.join(root,'glossary/catalog.json'))))throw Error('Hub glossary artifact binding mismatch');const bindings=JSON.parse(fs.readFileSync(path.join(root,'glossary/bindings.json')));if(bindings.catalogHash!==m.glossary.catalogHash||bindings.documentationRevision!==m.sourceRevision||!isDeepStrictEqual(bindings.sourceVector,m.glossary.sourceVector))throw Error('Hub glossary selected source vector mismatch');if(m.releaseBinding && Object.entries(bindings.sourceVector).some(([name,sha])=>!m.releaseBinding.sources.some(s=>s.repository===name&&s.sourceSHA===sha)))throw Error('Hub glossary release source vector mismatch');const expected=m.files.map(f=>f.path).concat('hub-manifest.json').sort();if(JSON.stringify(files(root))!==JSON.stringify(expected))throw Error('Unexpected hub inventory');for(const f of m.files){if(!allowed(f.path)||hash(fs.readFileSync(path.join(root,f.path)))!==f.sha256)throw Error('Hub artifact hash/inventory mismatch');}}
export function installHub({artifact,destination,currentLink,origin,revision}){
 if(!destination||!currentLink||!path.isAbsolute(destination)||!path.isAbsolute(currentLink))throw Error('Missing explicit Understand hub destination/current-link binding');
 const bytes=fs.readFileSync(path.join(artifact,'hub-manifest.json')),m=JSON.parse(bytes);if(!/^[a-f0-9]{40}$/.test(revision)||m.scope!=='understand-hub'||m.state!=='complete'||m.origin!==origin||m.sourceRevision!==revision)throw Error('Hub artifact binding mismatch');assertPlatformReleaseBinding(m.releaseBinding,revision);verify(artifact,m);
 const release=path.join(destination,'releases',revision+'-'+hash(bytes).slice(0,16));fs.mkdirSync(path.dirname(release),{recursive:true});if(fs.existsSync(release)){if(!fs.readFileSync(path.join(release,'hub-manifest.json')).equals(bytes))throw Error('Immutable hub changed');verify(release,m);}else{const staged=release+'.staging';if(fs.existsSync(staged))throw Error('Pending hub staging requires inspection');fs.cpSync(artifact,staged,{recursive:true,errorOnExist:true,force:false});verify(staged,m);fs.renameSync(staged,release);}
 if(fs.existsSync(currentLink)&&!fs.lstatSync(currentLink).isSymbolicLink())throw Error('Preserve existing hub path; explicit operator migration needed');fs.mkdirSync(path.dirname(currentLink),{recursive:true});const previous=fs.existsSync(currentLink)?fs.realpathSync(currentLink):undefined;if(previous){const previousLink=path.join(destination,'previous'),tempPrevious=previousLink+'.pending';fs.symlinkSync(previous,tempPrevious);fs.renameSync(tempPrevious,previousLink);}
 const pending=currentLink+'.pending';fs.symlinkSync(release,pending);fs.renameSync(pending,currentLink);return release;
}
export async function readbackHub(manifest,fetcher=fetch,manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n')){if(manifest.state!=='complete')throw Error('Release binding required; preview is non-activatable');assertPlatformReleaseBinding(manifest.releaseBinding,manifest.sourceRevision);const publicManifest=await fetcher(new URL('hub-manifest.json',manifest.origin+'/'),{cache:'no-store'});if(!publicManifest.ok||hash(Buffer.from(await publicManifest.arrayBuffer()))!==hash(manifestBytes))throw Error('Public hub manifest readback binding/hash mismatch');for(const f of manifest.files){const r=await fetcher(new URL(f.path,manifest.origin+'/'),{cache:'no-store'});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('Public hub readback mismatch: '+f.path);}}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=n=>{let i=process.argv.indexOf(n);if(i<0)throw Error('Required '+n);return process.argv[i+1];};try{if(process.argv.includes('--install'))console.log(installHub({artifact:arg('--artifact'),destination:arg('--destination'),currentLink:arg('--current-link'),origin:arg('--origin'),revision:arg('--revision')}));else if(process.argv.includes('--readback'))await readbackHub(JSON.parse(fs.readFileSync(arg('--manifest'))),fetch,fs.readFileSync(arg('--manifest')));else console.log(JSON.stringify(buildHub({root:arg('--root'),out:arg('--out'),generation:arg('--generation'),origin:arg('--origin'),revision:arg('--revision'),operatorConfirmation:process.argv.includes('--operator-confirmation')?arg('--operator-confirmation'):undefined,operatorSnapshot:process.argv.includes('--operator-snapshot')?arg('--operator-snapshot'):undefined,releaseLock:process.argv.includes('--release-manifest')?JSON.parse(fs.readFileSync(arg('--release-manifest'))):undefined})));}catch(e){console.error(e.message);process.exitCode=1;}}
