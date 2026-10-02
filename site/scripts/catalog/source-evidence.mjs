import { execFileSync } from 'node:child_process';
import { sourceHash } from '../page-catalog.mjs';

export function sourceEvidence(repo, source, currentHash) {
  try {
    const revision = execFileSync('git', ['log', '-1', '--format=%H', '--', source], {cwd:repo,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    if (!/^[a-f0-9]{40}$/.test(revision)) return {sourceRevision:null,sourceState:'working-copy',factsStatus:'source-only'};
    const committed = execFileSync('git',['show',`${revision}:${source}`],{cwd:repo,stdio:['ignore','pipe','ignore']});
    return {sourceRevision:revision,sourceState:sourceHash(committed)===currentHash?'committed':'working-copy',factsStatus:'source-only'};
  } catch {
    return {sourceRevision:null,sourceState:'working-copy',factsStatus:'source-only'};
  }
}
