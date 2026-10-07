/** Static production viewer. No Vite middleware, arbitrary file serving or build-time source access. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sourceLocation} from './source-location.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const staticPath=p=>p==='index.html'||/^assets\/[a-zA-Z0-9_./-]+\.(js|css|svg|png|woff2?)$/.test(p)||/^[a-zA-Z0-9_-]+\.(svg|png|ico)$/.test(p);
const mime=p=>({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json; charset=utf-8','svg':'image/svg+xml','png':'image/png','ico':'image/x-icon','woff':'font/woff','woff2':'font/woff2'}[p.split('.').pop()]||'application/octet-stream');
function inventory(root){return fs.readdirSync(root,{recursive:true}).filter(p=>{const s=fs.lstatSync(path.join(root,p));if(s.isSymbolicLink())throw Error('Static artifact symlinks forbidden');return s.isFile();}).sort();}
export function buildViewerArtifact({dist,out,revision}){
 if(!/^[a-f0-9]{40}$/.test(revision||''))throw Error('Exact documentation revision required');
 const names=inventory(dist);if(!names.includes('index.html')||names.some(p=>!staticPath(p)))throw Error('Unexpected production build inventory');
 if(/@vite\/client|react-refresh/.test(fs.readFileSync(path.join(dist,'index.html'),'utf8')))throw Error('Production build required');
 if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Production artifact output must be empty');
 fs.mkdirSync(out,{recursive:true});fs.cpSync(dist,path.join(out,'static'),{recursive:true});
 for(const file of ['production.mjs','source-location.mjs'])fs.copyFileSync(path.join(here,file),path.join(out,file));
 const manifest={schemaVersion:'oriso.static-viewer/v1',sourceRevision:revision,files:inventory(out).map(p=>({path:p,sha256:digest(fs.readFileSync(path.join(out,p)))}))};
 fs.writeFileSync(path.join(out,'viewer-manifest.json'),JSON.stringify(manifest)+'\n');return manifest;
}
function verifyArtifact(root){
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'viewer-manifest.json')));
 if(manifest.schemaVersion!=='oriso.static-viewer/v1'||JSON.stringify(inventory(root))!==JSON.stringify([...manifest.files.map(f=>f.path),'viewer-manifest.json'].sort()))throw Error('Production artifact inventory mismatch');
 for(const f of manifest.files)if(!(f.path==='production.mjs'||f.path==='source-location.mjs'||f.path.startsWith('static/')&&staticPath(f.path.slice(7)))||digest(fs.readFileSync(path.join(root,f.path)))!==f.sha256)throw Error('Production artifact hash mismatch');
 // The launched server and source adapter must be exactly the artifact's reviewed versions.
 for(const f of ['production.mjs','source-location.mjs'])if(digest(fs.readFileSync(path.join(here,f)))!==digest(fs.readFileSync(path.join(root,f))))throw Error('Production runtime adapter mismatch');
 return manifest;
}
function cleanSource(root,source){
 try{return execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()===source.sourceSHA&&!execFileSync('git',['-C',root,'status','--porcelain','--ignored'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return false;}
}
export async function startViewer({artifact,sourceRoot,repository,basePath='/',port=3000,host='127.0.0.1',tooling=path.dirname(here),token}){
 const staticManifest=verifyArtifact(artifact);
 if(!/^\/(?:[a-z0-9-]+\/)*$/.test(basePath))throw Error('Explicit safe viewer base path required');
 sourceRoot=fs.realpathSync(sourceRoot);const generation=path.join(sourceRoot,'graph-generation');
 execFileSync('python3',['-m','bundle','validate',generation],{cwd:tooling,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['ignore','pipe','ignore']});
 const manifest=JSON.parse(fs.readFileSync(path.join(generation,'manifest.json')));
 const allowed=JSON.parse(fs.readFileSync(path.join(tooling,'../truth-chain/public-repositories.json'))).repositories;
 if(!manifest.release||manifest.sources.some(s=>!allowed.includes(s.repository)))throw Error('Complete public released generation required');
 if(!manifest.sources.some(s=>s.repository===repository)&&!['ORISO-Platform','ORISO-Supergraph'].includes(repository))throw Error('Selected graph absent from release vector');
 if(manifest.sources.find(s=>s.repository==='ORISO-Docs')?.sourceSHA!==staticManifest.sourceRevision)throw Error('Static build documentation revision differs from the installed release');
 const repositories={};for(const source of manifest.sources){const root=path.join(sourceRoot,source.repository);if(!cleanSource(root,source))throw Error('Released source checkout is dirty or mismatched: '+source.repository);repositories[source.repository]=root;}
 const dataRoot=path.join(generation,repository,'.understand-anything'),graph=JSON.parse(fs.readFileSync(path.join(dataRoot,'knowledge-graph.json'))),responses=new Map();
 // Preserve sealed graph bytes: gzip is a transport encoding, never a rewritten graph.
 for(const name of ['knowledge-graph.json','meta.json','config.json','diff-overlay.json','domain-graph.json']){const file=path.join(dataRoot,name);if(fs.existsSync(file)){const bytes=fs.readFileSync(file);responses.set(name,{bytes,gzip:gzipSync(bytes),type:mime(name)});}}
 for(const f of inventory(path.join(artifact,'static'))){let bytes=fs.readFileSync(path.join(artifact,'static',f));if(f==='index.html')bytes=Buffer.from(bytes.toString().replace(/(["'])\/(assets\/[^"']+)/g,'$1'+basePath+'$2'));responses.set(f,{bytes,gzip:gzipSync(bytes),type:mime(f)});}
 const server=http.createServer((req,res)=>{
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':mime('json'),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   if(!['GET','HEAD'].includes(req.method))return json(405,{errorCode:'METHOD_NOT_ALLOWED'});
   const url=new URL(req.url,'http://localhost');let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return json(400,{errorCode:'INVALID_ROUTE'});}
   if(!pathname.startsWith(basePath))return json(404,{errorCode:'ROUTE_NOT_FOUND'});
   const route=pathname.slice(basePath.length)||'index.html';if(route.includes('..')||route.includes('\\')||route.includes('\0'))return json(400,{errorCode:'INVALID_ROUTE'});
   if(token&&url.searchParams.get('token')!==token)return json(403,{errorCode:'TOKEN_REQUIRED'});
   if(route==='file-content.json'){
    if(manifest.sources.some(s=>!cleanSource(repositories[s.repository],s)))return json(503,{errorCode:'SOURCE_CHECKOUT_CHANGED',error:'Installed sources are unavailable; the source checkout changed'});
    const located=sourceLocation(graph,repositories[repository],url.searchParams.get('path'),url.searchParams.get('nodeId'),repositories);
    if(located.error)return json(located.statusCode,{error:located.error,errorCode:located.errorCode});
    const stat=fs.statSync(located.absoluteFile);if(!stat.isFile())return json(422,{errorCode:'SOURCE_NOT_FILE'});if(stat.size>1048576)return json(413,{errorCode:'SOURCE_TOO_LARGE'});
    const bytes=fs.readFileSync(located.absoluteFile);if(bytes.includes(0))return json(415,{errorCode:'SOURCE_BINARY'});let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return json(415,{errorCode:'SOURCE_ENCODING'});}
    return json(200,{path:located.safeRelativePath,content,sizeBytes:bytes.length,lineCount:content?content.split(/\r\n|\n|\r/).length:0,language:({'ts':'typescript','tsx':'tsx','js':'javascript','java':'java','py':'python','json':'json','md':'markdown','yml':'yaml','yaml':'yaml'}[located.safeRelativePath.split('.').pop()]||'text')});
   }
   const response=responses.get(route);if(!response)return json(404,{errorCode:'ROUTE_NOT_FOUND'});
   const accepts=(req.headers['accept-encoding']||'').split(',').some(v=>/^\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?\s*$)[0-9.]+)?\s*$/.test(v));const body=accepts?response.gzip:response.bytes;
   res.writeHead(200,{'Content-Type':response.type,'Content-Length':body.length,'Cache-Control':'no-cache','Vary':'Accept-Encoding','X-Content-Type-Options':'nosniff',...(accepts?{'Content-Encoding':'gzip'}:{}),'ETag':'"'+digest(response.bytes)+'"'});res.end(req.method==='HEAD'?undefined:body);
  }catch{json(500,{errorCode:'VIEWER_REQUEST_FAILED',error:'Viewer request failed'});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const arg=(name,fallback)=>{const i=process.argv.indexOf(name);if(i<0){if(fallback!==undefined)return fallback;throw Error('Required '+name);}return process.argv[i+1];};
 try{if(process.argv.includes('--build'))buildViewerArtifact({dist:arg('--dist'),out:arg('--out'),revision:arg('--revision')});else{const server=await startViewer({artifact:arg('--artifact'),sourceRoot:arg('--source-root'),repository:arg('--repository'),basePath:arg('--base-path','/'),tooling:arg('--tooling'),port:Number(arg('--port','3000')),host:arg('--host','0.0.0.0'),token:process.env.UNDERSTAND_ACCESS_TOKEN});console.log('Static production viewer listening on '+server.address().port);}}catch{console.error('Production viewer validation/startup failed; inspect approved artifact and source bindings privately');process.exitCode=1;}
}
