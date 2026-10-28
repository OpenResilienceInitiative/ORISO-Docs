/** Mutable, sanitized operational receipt. Never appended to a sealed installed hub. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const phases=['preflight','generation','installation','readback','complete'];
const phaseCodes={preflight:'PREFLIGHT_FAILED',generation:'GENERATION_FAILED',installation:'INSTALLATION_FAILED',readback:'READBACK_FAILED',complete:'NONE'};
const codes=Object.values(phaseCodes);
const revision=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s)?s:null;
const version=s=>typeof s==='string'&&/^v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(s)?s:null;
const identity=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]{1,120}$/.test(s)?s:null;
function resolvedPath(value){
 let existing=path.resolve(value),tail=[];
 while(!fs.existsSync(existing)){
  // Dangling symlinks do not define a usable operator binding.
  if(fs.lstatSync(existing,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Independent explicit attempt receipt binding required');
  const parent=path.dirname(existing);if(parent===existing)throw Error('Independent explicit attempt receipt binding required');tail.unshift(path.basename(existing));existing=parent;
 }
 return path.join(fs.realpathSync(existing),...tail);
}
export function recordAttempt({output,current,input}){
 if(!path.isAbsolute(output)||!path.isAbsolute(current))throw Error('Independent explicit attempt receipt binding required');
 const destination=resolvedPath(output),installedRoot=resolvedPath(current);if(destination===installedRoot||destination.startsWith(installedRoot+path.sep))throw Error('Independent explicit attempt receipt binding required');
 if(!['failed','succeeded'].includes(input.state)||!identity(input.attemptId)||!phases.includes(input.phase))throw Error('Invalid attempt identity/state/phase');
 if(!codes.includes(input.errorCode)||phaseCodes[input.phase]!==input.errorCode||input.state==='failed'&&input.errorCode==='NONE'||input.state==='succeeded'&&(input.errorCode!=='NONE'||input.phase!=='complete'))throw Error('Invalid sanitized error code');
 const time=new Date(input.attemptedAt);if(!Number.isFinite(time.getTime()))throw Error('Valid attempt time required');
 let installed=null;
 try{const s=JSON.parse(fs.readFileSync(path.join(current,'status.json')));installed={generationId:identity(s.generationId),releaseVersion:version(s.releaseVersion),documentationRevision:revision(s.sources?.find(r=>r.repository==='ORISO-Docs')?.sourceSHA)};}catch{}
 const receipt={schemaVersion:'oriso.refresh-attempt/v1',state:input.state,attemptId:input.attemptId,attemptedAt:time.toISOString(),releaseVersion:version(input.releaseVersion),documentationRevision:revision(input.documentationRevision),phase:input.phase,errorCode:input.errorCode,installed};
 fs.mkdirSync(path.dirname(output),{recursive:true});if(fs.existsSync(output)&&fs.lstatSync(output).isSymbolicLink())throw Error('Attempt receipt cannot be a symlink');
 const pending=output+'.pending';fs.writeFileSync(pending,JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o644});fs.renameSync(pending,output);return receipt;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const arg=(key,fallback)=>{const i=process.argv.indexOf(key);if(i>=0)return process.argv[i+1];if(fallback!==undefined)return fallback;throw Error('Required '+key);};
 try{
  let input;
  if(process.argv.includes('--from-workflow')){
   let lock={};try{const event=JSON.parse(fs.readFileSync(arg('--event')));lock=event.client_payload?.release_manifest||JSON.parse(event.inputs?.release_manifest||'{}');}catch{}
   let phase=process.env.CONTRACT_RESULT!=='success'||process.env.BINDING_RESULT!=='success'||lock.schemaVersion!=='oriso.platform-release/v1'?'preflight':process.env.PRODUCER_RESULT!=='success'?'generation':process.env.CONSUMER_RESULT!=='success'?(['readback','complete'].includes(process.env.CONSUMER_PHASE)?'readback':'installation'):'complete';
   input={state:phase==='complete'?'succeeded':'failed',attemptId:arg('--attempt-id'),attemptedAt:new Date().toISOString(),releaseVersion:lock.version,documentationRevision:lock.documentationRevision,phase,errorCode:phaseCodes[phase]};
  }else input={state:arg('--state'),attemptId:arg('--attempt-id'),attemptedAt:arg('--time',new Date().toISOString()),releaseVersion:arg('--release',''),documentationRevision:arg('--revision',''),phase:arg('--phase'),errorCode:arg('--error-code')};
  recordAttempt({output:arg('--output'),current:arg('--current'),input});console.log('Sanitized refresh receipt recorded');
 }catch{console.error('Refresh receipt binding/validation failed');process.exitCode=1;}
}
