import {reasonOutcome} from './reasons.mjs';
import {createHash} from 'node:crypto';
/** Bind immutable selected bytes without rewriting the original editorial provenance. */
export function assessSourceBinding(source, selected) {
  const result={reviewedRevision:source.sourceRevision,selectedRevision:selected?.revision ?? null,reviewRevisionMatches:source.sourceRevision===selected?.revision};
  if(source.binding==='external') return {...result,state:'external',...reasonOutcome('external-authority')};
  if(!selected || !/^[a-f0-9]{40}$/.test(selected.revision) || selected.repository!==source.repository || typeof selected.readSource!=='function') return {...result,state:'unavailable',...reasonOutcome('source-reader-unavailable')};
  let bytes;
  try { bytes=selected.readSource(source.path); } catch { return {...result,state:'unavailable',...reasonOutcome('source-path-absent')}; }
  if(typeof bytes!=='string'&&!Buffer.isBuffer(bytes)&&!(bytes instanceof Uint8Array)) return {...result,state:'unavailable',...reasonOutcome('source-bytes-unavailable')};
  const selectedHash=createHash('sha256').update(bytes).digest('hex');
  if(selectedHash!==source.sourceHash) return {...result,state:'stale',selectedHash,...reasonOutcome('source-content-changed')};
  return {...result,state:'verified',selectedHash,...reasonOutcome(result.reviewRevisionMatches?'source-review-matches':'source-content-unchanged')};
}
