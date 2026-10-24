import {graphMappingType} from '../../glossary/validate.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {bindPlatformRelease,assertPlatformReleaseBinding} from '../../../docs-publication/platform-release.mjs';
import {isDeepStrictEqual} from 'node:util';
import {renderFeatures} from './render-features.mjs';
import {renderGlossary} from './render-glossary.mjs';
import {validateGlossarySources} from '../../lib/glossary-projection.mjs';
import {immutableSource} from '../../ua-glossary-project.mjs';
import {validateBoard,contract as boardContract} from '../../../planning-map/lib/board.mjs';
import {validateMilestones} from '../../../planning-map/lib/milestones.mjs';
import {loadCriteria,buildCriteriaDoc} from '../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS,CODE_REPOS} from '../../platform/lib/capabilities.mjs';
import {loadRuns,buildHealthDoc} from '../../platform/lib/health-run.mjs';
import {buildIdeas,ideaFiles} from '../../../planning-map/lib/ideas.mjs';
import {validateSteering} from '../../../planning-map/lib/steering.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const allowed=p=>/^(index\.html|status\.json|operator-snapshot\.json|assets\/(hub\.css|tokens\.(css|json)|lang\.js|status\.js|glossary\.js)|glossary\/(index\.html|catalog\.json|bindings\.json|sources\/(seed|bjorn-reconciliation|naming-audit)\.md)|features\/(index|de|en|case-handover)\.html|map\/(index\.html|map\.css|map\.js|board-agg\.js|jobs\.js|plan-ui\.js|views\.js|data\/(counts|descriptions|drill|epics|links|zoom|board|milestones|criteria|health|ideas|steering)\.json))$/.test(p);
function files(root){return fs.readdirSync(root,{recursive:true}).filter(p=>{const stat=fs.lstatSync(path.join(root,p));if(stat.isSymbolicLink())throw Error('Hub symlinks are forbidden');return stat.isFile();}).sort();}
const hubSourcePrefix='tools/understand-anything/site/hub/';
const staticInputs=['index.html','assets/hub.css','assets/tokens.css','assets/tokens.json','assets/lang.js','assets/status.js','assets/glossary.js','glossary/index.html','features/index.html','features/de.html','features/en.html','features/case-handover.html','map/index.html','map/map.css','map/refactor.css','map/map.js','map/board-agg.js','map/jobs.js','map/plan-ui.js','map/views.js',...['counts','descriptions','drill','epics','links','zoom'].map(n=>`map/data/${n}.json`)];
const producerInputs=['render-glossary.mjs','render-features.mjs','publication.mjs'].map(p=>hubSourcePrefix+p).concat([
 'tools/understand-anything/glossary/validate.mjs','tools/understand-anything/glossary/source-bindings.mjs','tools/understand-anything/glossary/reasons.mjs','tools/understand-anything/lib/glossary-projection.mjs','tools/understand-anything/ua-glossary-project.mjs',
 'tools/docs-publication/platform-release.mjs','tools/planning-map/lib/board.mjs','tools/planning-map/lib/job.mjs','tools/planning-map/lib/queries.mjs','tools/planning-map/lib/schema.mjs','tools/planning-map/lib/milestones.mjs','tools/planning-map/lib/ideas.mjs','tools/planning-map/lib/steering.mjs','tools/planning-map/steering.schema.json','tools/planning-map/milestones.json','tools/understand-anything/platform/lib/health-criteria.mjs','tools/understand-anything/platform/lib/health-metrics.mjs','tools/understand-anything/platform/lib/health-run.mjs','tools/understand-anything/platform/health-run.schema.json','tools/understand-anything/platform/lib/capabilities.mjs','tools/understand-anything/platform/capabilities/capability-rules.json','tools/planning-map/board-contract.json','tools/planning-map/board.schema.json','tools/public_operator_snapshot.py','tools/truth-chain/public-repositories.json','tools/understand-anything/site/hub/features/catalog.json','site/page-catalog.json'
]);
function publicationSources(root) {
 files(path.join(root,hubSourcePrefix));
 const docs=immutableSource(root,'ORISO-Docs'),assets=new Map(staticInputs.map(p=>[p,docs.readSource(hubSourcePrefix+p)]));
 const healthDir='tools/understand-anything/platform/capabilities/health';
 const inputs=[...producerInputs,...ideaFiles(root),...execFileSync('git',['ls-tree','-r','--name-only',docs.revision,'--',healthDir],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.md')),...execFileSync('git',['ls-tree','-r','--name-only',docs.revision,'--','health/runs'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.json')),...execFileSync('git',['ls-tree','-r','--name-only',docs.revision,'--','tools/understand-anything/bundle'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>p.endsWith('.py'))];
 for(const relative of inputs) {
  const selected=docs.readSource(relative);
  // The imported producer must be the same bytes as the claimed Docs source root.
  const loadedRoot=fileURLToPath(new URL('../../../../',import.meta.url));
  if(!fs.readFileSync(path.join(loadedRoot,relative)).equals(selected))throw Error('Loaded hub producer differs from selected Git bytes: '+relative);
 }
 const features=JSON.parse(docs.readSource(hubSourcePrefix+'features/catalog.json')),pages=JSON.parse(docs.readSource('site/page-catalog.json'));
 for(const feature of features.features) {
  docs.readSource(feature.source);
  const page=pages.pages.find(p=>p.id===feature.id);
  for(const locale of ['de','en'])docs.readSource(page.translations[locale].path);
 }
 return assets;
}
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
 const graphMappings=report.graphMappings.map(outcome=>{
  if(outcome.state==='unavailable')return outcome;
  const graph=JSON.parse(fs.readFileSync(path.join(generation,outcome.repository,'.understand-anything/knowledge-graph.json'))),nodes=graph.nodes.filter(n=>n.id===outcome.nodeId);
  if(nodes.length!==1 || nodes[0].type!==graphMappingType(outcome) || !nodes[0].metadata?.glossary?.mappings.some(m=>m.conceptId===outcome.conceptId&&m.state===outcome.state&&m.selectedRevision===outcome.selectedRevision))throw Error('Hub glossary graph mapping differs: '+outcome.nodeId);
  if(outcome.state!=='verified')return outcome;
  if(outcome.repository==='ORISO-Docs') {
   // Docs now has its own repository viewer; its validated native IDs are not aggregate IDs.
   return routes.has(outcome.repository)?{...outcome,href:routes.get(outcome.repository),viewerNodeId:outcome.nodeId}:outcome;
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
// Optional planning board (ORISO-Docs#208): an exported board.json is validated, must not carry private
// repositories, and is announced to the map through links.json "optional". Absent: the map shows no board.
export function boardAsset(boardPath,linksBytes){
 const board=JSON.parse(fs.readFileSync(boardPath,'utf8')),errors=validateBoard(board);
 if(errors.length)throw Error('board.json invalid: '+errors.join('; '));
 // Allow-list, not deny-list: only repositories of the public policy, in the board's organisation, may be named.
 const priv=new Set(boardContract.privateRepositories),org=boardContract.project.owner+'/';
 const pub=new Set(JSON.parse(fs.readFileSync(new URL('../../../truth-chain/public-repositories.json',import.meta.url),'utf8')).repositories.map(r=>org+r));
 const isPublic=r=>typeof r==='string'&&r.startsWith(org)&&pub.has(r)&&!priv.has(r);
 for(const i of board.items){
  if(priv.has(i.repository)||priv.has(i.parent?.repository))throw Error('board.json carries an item of a private repository');
  if(!isPublic(i.repository)||(i.parent&&!isPublic(i.parent.repository)))throw Error('board.json names a repository that is not public: '+String(i.parent&&!isPublic(i.parent.repository)?i.parent.repository:i.repository));
 }
 const links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'board.json'])].sort();
 return {board:JSON.stringify(board)+'\n',links:JSON.stringify(links)+'\n'};
}
// Optional steering comments (ORISO-Docs#221): an exported steering.json is validated (member comments only, ORISO-Docs links only)
// and announced to the map through links.json "optional". Absent: the Health panel shows the command to create a steering issue.
export function steeringAsset(steeringPath,linksBytes){
 const doc=JSON.parse(fs.readFileSync(steeringPath,'utf8')),errors=validateSteering(doc);
 if(!errors.length&&doc.source.repository!=='OpenResilienceInitiative/ORISO-Docs')errors.push('$.source.repository: expected OpenResilienceInitiative/ORISO-Docs');
 for(const [id,c] of Object.entries(errors.length?{}:doc.capabilities)){const own=u=>u.startsWith('https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/');if(!own(c.issue.url)||c.comments.some(x=>!own(x.url)))errors.push(`$.capabilities.${id}: links must point to OpenResilienceInitiative/ORISO-Docs issues`);}
 if(errors.length)throw Error('steering.json invalid: '+errors.join('; '));
 const links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'steering.json'])].sort();
 return {steering:JSON.stringify(doc)+'\n',links:JSON.stringify(links)+'\n'};
}
// Reviewed milestone config (ORISO-Docs#209): validated, published as map/data/milestones.json, announced as optional data.
export function milestonesAsset(configPath,linksBytes){
 const cfg=JSON.parse(fs.readFileSync(configPath,'utf8')),errors=validateMilestones(cfg);
 if(errors.length)throw Error('milestones.json invalid: '+errors.join('; '));
 const links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'milestones.json'])].sort();
 return {milestones:JSON.stringify(cfg)+'\n',links:JSON.stringify(links)+'\n'};
}
// Health criteria files (ORISO-Docs#217): validated against the capability rules, published as map/data/criteria.json
// and announced as optional data. An unknown metric name, capability id or repository refuses the build.
export function criteriaAsset(criteriaDir,rulesPath,linksBytes){
 const rules=JSON.parse(fs.readFileSync(rulesPath,'utf8'));let doc;
 try{doc=buildCriteriaDoc(loadCriteria(criteriaDir,{capabilityIds:CAPABILITY_IDS,repos:CODE_REPOS}),rules);}catch(e){throw Error('criteria invalid: '+e.message);}
 const links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'criteria.json'])].sort();
 return {criteria:JSON.stringify(doc)+'\n',links:JSON.stringify(links)+'\n'};
}
// Health run records (ORISO-Docs#218): health/runs/**.json are validated one by one (schema, scores, path) and the latest record
// per scope is published as map/data/health.json. No record yet is a valid, empty file: every square then shows "no data".
export function healthAsset(root,linksBytes){
 let records;
 try{records=loadRuns(root).map(r=>r.record);}catch(e){throw Error('health runs invalid: '+e.message);}
 const links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'health.json'])].sort();
 return {health:JSON.stringify(buildHealthDoc(records))+'\n',links:JSON.stringify(links)+'\n'};
}
// Idea pages (ORISO-Docs#223): product/ideas/*.mdx are validated (unknown capability ids fail) and published as map/data/ideas.json.
export function ideasAsset(root,linksBytes){
 const doc=buildIdeas(root),links=JSON.parse(linksBytes);links.optional=[...new Set([...(links.optional||[]),'ideas.json'])].sort();
 return {ideas:JSON.stringify(doc)+'\n',links:JSON.stringify(links)+'\n'};
}
export function buildHub({root,out,generation,origin,revision,releaseLock,operatorSnapshot,operatorConfirmation,board,steering}){
 validateSources(root);const url=new URL(origin);if(url.username||url.password||url.search||url.hash||!['https:','http:'].includes(url.protocol))throw Error('Invalid hub origin');if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Exact source revision required');if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==revision)throw Error('Hub producer source revision mismatch');
 const staticBytes=publicationSources(root);
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
 for(const [p,bytes] of staticBytes){fs.mkdirSync(path.dirname(path.join(out,p)),{recursive:true});fs.writeFileSync(path.join(out,p),bytes);}
 if(board){const asset=boardAsset(board,staticBytes.get('map/data/links.json'));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/board.json'),asset.board);}
 if(steering){const asset=steeringAsset(steering,fs.readFileSync(path.join(out,'map/data/links.json')));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/steering.json'),asset.steering);}
 {const asset=milestonesAsset(path.join(root,'tools/planning-map/milestones.json'),fs.readFileSync(path.join(out,'map/data/links.json')));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/milestones.json'),asset.milestones);}
 {const asset=criteriaAsset(path.join(root,'tools/understand-anything/platform/capabilities/health'),path.join(root,'tools/understand-anything/platform/capabilities/capability-rules.json'),fs.readFileSync(path.join(out,'map/data/links.json')));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/criteria.json'),asset.criteria);}
 {const asset=healthAsset(root,fs.readFileSync(path.join(out,'map/data/links.json')));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/health.json'),asset.health);}
 {const asset=ideasAsset(root,fs.readFileSync(path.join(out,'map/data/links.json')));fs.writeFileSync(path.join(out,'map/data/links.json'),asset.links);fs.writeFileSync(path.join(out,'map/data/ideas.json'),asset.ideas);}
 fs.mkdirSync(path.join(out,'glossary/sources'),{recursive:true});for(const filename of ['seed.md','bjorn-reconciliation.md','naming-audit.md'])fs.writeFileSync(path.join(out,'glossary/sources',filename),immutableSource(root,'ORISO-Docs').readSource('tools/understand-anything/glossary/sources/'+filename));fs.writeFileSync(path.join(out,'glossary/catalog.json'),glossary.bytes);fs.writeFileSync(path.join(out,'glossary/bindings.json'),JSON.stringify(glossary.report)+'\n');fs.writeFileSync(path.join(out,'glossary/index.html'),renderGlossary(glossary.data,glossary.report));
 fs.writeFileSync(path.join(out,'operator-snapshot.json'),JSON.stringify(operator.snapshot)+'\n');
 for(const file of ['index.html','features/index.html','features/de.html','features/en.html']){const target=path.join(out,file),locale=file==='features/en.html'?'en':'de';const section=file==='index.html'?operator.html.de+operator.html.en:operator.html[locale];fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('</body>',section+'</body>'));}
 const sources=manifest.sources.map(source=>{const graph=JSON.parse(fs.readFileSync(path.join(generation,source.repository,'.understand-anything/knowledge-graph.json')));return {...source,name:source.repository,branch:source.ref.replace(/^refs\/heads\//,''),nodes:graph.nodes.length,calls:callCoverage(graph)};});
 const aggregates=['ORISO-Platform','ORISO-Supergraph'].map(repository=>{const graph=JSON.parse(fs.readFileSync(path.join(generation,repository,'.understand-anything/knowledge-graph.json')));const sourceCommits=graph.project.sourceCommits;return {repository,name:repository,nodes:graph.nodes.length,sourceCommits,coverage:graph.metadata?.platformNavigation?.repositories||Object.keys(sourceCommits).sort().map(repository=>({repository,status:'included',sourceCommit:sourceCommits[repository]}))};});
 fs.writeFileSync(path.join(out,'status.json'),JSON.stringify({operatorSnapshotHash:operator.snapshot.snapshotHash,operatorStatus:operator.snapshot.status,operatorFieldsConfirmed:operator.operatorFieldsConfirmed,releaseVersion:releaseBinding?.version,releasedAt:manifest.release?.publishedAt,releaseSources:releaseBinding?.sources,branch:refs.join(','),generatedAt:manifest.generatedAt,generationId:manifest.generationId,repositories:sources.length,sources,aggregates,nodes:sources.reduce((n,s)=>n+s.nodes,0)})+'\n');
 const result={operatorSnapshotHash:operator.snapshot.snapshotHash,operatorFieldsConfirmed:operator.operatorFieldsConfirmed,glossary:{catalogHash:hash(glossary.bytes),documentationRevision:glossary.documentationRevision,sourceVector:glossary.report.sourceVector,sourceBindings:glossary.sourceBindings.length,graphMappings:glossary.report.graphMappings.length},version:1,scope:'understand-hub',state:releaseBinding?'complete':'preview',releaseBinding,origin,sourceRevision:revision,graphGenerationId:manifest.generationId,files:files(out).map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(out,p)))}))};
 fs.writeFileSync(path.join(out,'hub-manifest.json'),JSON.stringify(result)+'\n');return result;
}
// Call extraction coverage per repository (Docs#167): confirmed, possible and unresolved calls,
// so an empty caller list in the viewer can be read against what extraction could not resolve.
export function callCoverage(graph){const count=type=>graph.edges.filter(e=>e.type===type).length,calls=graph.relationCoverage?.calls;return {confirmed:count('calls'),possible:count('calls_unconfirmed'),unresolved:Number.isInteger(calls?.unresolved)?calls.unresolved:null,status:typeof calls?.status==='string'?calls.status:null};}
function verify(root,m){if(!m.glossary || m.glossary.documentationRevision!==m.sourceRevision || m.glossary.catalogHash!==hash(fs.readFileSync(path.join(root,'glossary/catalog.json'))))throw Error('Hub glossary artifact binding mismatch');const bindings=JSON.parse(fs.readFileSync(path.join(root,'glossary/bindings.json')));if(bindings.catalogHash!==m.glossary.catalogHash||bindings.documentationRevision!==m.sourceRevision||!isDeepStrictEqual(bindings.sourceVector,m.glossary.sourceVector))throw Error('Hub glossary selected source vector mismatch');if(m.releaseBinding && Object.entries(bindings.sourceVector).some(([name,sha])=>!m.releaseBinding.sources.some(s=>s.repository===name&&s.sourceSHA===sha)))throw Error('Hub glossary release source vector mismatch');const expected=m.files.map(f=>f.path).concat('hub-manifest.json').sort();if(JSON.stringify(files(root))!==JSON.stringify(expected))throw Error('Unexpected hub inventory');for(const f of m.files){if(!allowed(f.path)||hash(fs.readFileSync(path.join(root,f.path)))!==f.sha256)throw Error('Hub artifact hash/inventory mismatch');}}
export function installHub({artifact,destination,currentLink,origin,revision}){
 if(!destination||!currentLink||!path.isAbsolute(destination)||!path.isAbsolute(currentLink))throw Error('Missing explicit Understand hub destination/current-link binding');
 const bytes=fs.readFileSync(path.join(artifact,'hub-manifest.json')),m=JSON.parse(bytes);if(!/^[a-f0-9]{40}$/.test(revision)||m.scope!=='understand-hub'||m.state!=='complete'||m.origin!==origin||m.sourceRevision!==revision)throw Error('Hub artifact binding mismatch');assertPlatformReleaseBinding(m.releaseBinding,revision);verify(artifact,m);
 const release=path.join(destination,'releases',revision+'-'+hash(bytes).slice(0,16));fs.mkdirSync(path.dirname(release),{recursive:true});if(fs.existsSync(release)){if(!fs.readFileSync(path.join(release,'hub-manifest.json')).equals(bytes))throw Error('Immutable hub changed');verify(release,m);}else{const staged=release+'.staging';if(fs.existsSync(staged))throw Error('Pending hub staging requires inspection');fs.cpSync(artifact,staged,{recursive:true,errorOnExist:true,force:false});verify(staged,m);fs.renameSync(staged,release);}
 if(fs.existsSync(currentLink)&&!fs.lstatSync(currentLink).isSymbolicLink())throw Error('Preserve existing hub path; explicit operator migration needed');fs.mkdirSync(path.dirname(currentLink),{recursive:true});const previous=fs.existsSync(currentLink)?fs.realpathSync(currentLink):undefined;if(previous){const previousLink=path.join(destination,'previous'),tempPrevious=previousLink+'.pending';fs.symlinkSync(previous,tempPrevious);fs.renameSync(tempPrevious,previousLink);}
 const pending=currentLink+'.pending';fs.symlinkSync(release,pending);fs.renameSync(pending,currentLink);return release;
}
export async function readbackHub(manifest,fetcher=fetch,manifestBytes=Buffer.from(JSON.stringify(manifest)+'\n')){if(manifest.state!=='complete')throw Error('Release binding required; preview is non-activatable');assertPlatformReleaseBinding(manifest.releaseBinding,manifest.sourceRevision);const publicManifest=await fetcher(new URL('hub-manifest.json',manifest.origin+'/'),{cache:'no-store'});if(!publicManifest.ok||hash(Buffer.from(await publicManifest.arrayBuffer()))!==hash(manifestBytes))throw Error('Public hub manifest readback binding/hash mismatch');for(const f of manifest.files){const r=await fetcher(new URL(f.path,manifest.origin+'/'),{cache:'no-store'});if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==f.sha256)throw Error('Public hub readback mismatch: '+f.path);}}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=n=>{let i=process.argv.indexOf(n);if(i<0)throw Error('Required '+n);return process.argv[i+1];};try{if(process.argv.includes('--install'))console.log(installHub({artifact:arg('--artifact'),destination:arg('--destination'),currentLink:arg('--current-link'),origin:arg('--origin'),revision:arg('--revision')}));else if(process.argv.includes('--readback'))await readbackHub(JSON.parse(fs.readFileSync(arg('--manifest'))),fetch,fs.readFileSync(arg('--manifest')));else console.log(JSON.stringify(buildHub({root:arg('--root'),out:arg('--out'),generation:arg('--generation'),origin:arg('--origin'),revision:arg('--revision'),operatorConfirmation:process.argv.includes('--operator-confirmation')?arg('--operator-confirmation'):undefined,operatorSnapshot:process.argv.includes('--operator-snapshot')?arg('--operator-snapshot'):undefined,board:process.argv.includes('--board')?arg('--board'):undefined,steering:process.argv.includes('--steering')?arg('--steering'):undefined,releaseLock:process.argv.includes('--release-manifest')?JSON.parse(fs.readFileSync(arg('--release-manifest'))):undefined})));}catch(e){console.error(e.message);process.exitCode=1;}}
