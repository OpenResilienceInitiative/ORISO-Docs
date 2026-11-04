import { readFileSync, existsSync, mkdirSync, cpSync, symlinkSync, renameSync, readlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { outputFiles } from './publication.mjs';
import {assertPlatformReleaseBinding} from './platform-release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function installRelease({ artifactDir, destinationRoot, expectedOrigin, expectedRevision, currentLink }) {
  const bytes=readFileSync(join(artifactDir,'publication-manifest.json'));
  const manifest=JSON.parse(bytes);
  if (manifest.state!=='complete' || manifest.scope!=='technical-docs') throw Error('Only complete technical-docs artifacts can be installed');
  if (!/^[a-f0-9]{40}$/.test(manifest.sourceRevision) || manifest.sourceRevision!==expectedRevision) throw Error('Reviewed source revision mismatch');
  assertPlatformReleaseBinding(manifest.releaseBinding,expectedRevision);
  if (manifest.origin!==expectedOrigin) throw Error('Public origin mismatch');
  const verify=directory=>{
    const actualFiles=outputFiles(directory,directory,manifest.pages??[]);
    if (actualFiles.length!==manifest.files.length || actualFiles.some(file=>!manifest.files.some(expected=>expected.path===file.path && expected.sha256===file.sha256 && expected.bytes===file.bytes))) throw Error('Artifact content hash or inventory mismatch');
    for (const file of manifest.files) {
      if (file.path.startsWith('/') || file.path.split('/').includes('..')) throw Error('Invalid artifact path');
      const actual=readFileSync(join(directory,file.path));
      if (actual.length!==file.bytes || hash(actual)!==file.sha256) throw Error(`Artifact content hash mismatch: ${file.path}`);
    }
  };
  verify(artifactDir);
  const releaseId=manifest.sourceRevision+'-'+hash(bytes).slice(0,16);
  const target=join(destinationRoot,'releases',releaseId);
  mkdirSync(join(destinationRoot,'releases'),{recursive:true});
  if (existsSync(target)) {
    if (!readFileSync(join(target,'publication-manifest.json')).equals(bytes)) throw Error('Immutable release manifest was changed');
    verify(target);
  } else {
    // A failed copy is never activated; existing releases are never overwritten.
    const staged=target+'.staging';
    if (existsSync(staged)) throw Error('Incomplete staged release requires operator inspection');
    cpSync(artifactDir,staged,{recursive:true,errorOnExist:true,force:false});
    verify(staged);
    renameSync(staged,target);
  }
  const current=currentLink ? resolve(currentLink) : join(destinationRoot,'current');
  const previous=existsSync(current)?readlinkSync(current):null;
  const pending=current+'.pending';
  if (existsSync(pending)) throw Error('Pending activation requires operator inspection');
  const linkTarget=currentLink ? resolve(target) : join('releases',releaseId);
  symlinkSync(linkTarget,pending);
  renameSync(pending,current);
  return {releaseId,previous,current:linkTarget};
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const arg=name=>{const i=process.argv.indexOf(name); if(i<0 || !process.argv[i+1]) throw Error(`Required ${name}`);return process.argv[i+1];};
  try {console.log(JSON.stringify(installRelease({artifactDir:arg('--artifact'),destinationRoot:arg('--destination'),expectedOrigin:arg('--origin'),expectedRevision:arg('--revision'),currentLink:process.argv.includes('--current-link') ? arg('--current-link') : undefined})));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
