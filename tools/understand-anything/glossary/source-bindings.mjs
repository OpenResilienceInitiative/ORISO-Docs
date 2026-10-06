import {createHash} from 'node:crypto';
/** Bind immutable selected bytes without rewriting the original editorial provenance. */
export function assessSourceBinding(source, selected) {
  const result={reviewedRevision:source.sourceRevision,selectedRevision:selected?.revision ?? null,reviewRevisionMatches:source.sourceRevision===selected?.revision};
  if(source.binding==='external') return {...result,state:'external',reason:'External authority is not a selected repository source.'};
  if(!selected || !/^[a-f0-9]{40}$/.test(selected.revision) || selected.repository!==source.repository || typeof selected.readSource!=='function') return {...result,state:'unavailable',reason:'Repository or selected immutable source reader is unavailable.'};
  let bytes;
  try { bytes=selected.readSource(source.path); } catch { return {...result,state:'unavailable',reason:'Reviewed path is absent from the selected source revision.'}; }
  if(typeof bytes!=='string'&&!Buffer.isBuffer(bytes)&&!(bytes instanceof Uint8Array)) return {...result,state:'unavailable',reason:'Selected source reader did not return immutable file bytes.'};
  const selectedHash=createHash('sha256').update(bytes).digest('hex');
  if(selectedHash!==source.sourceHash) return {...result,state:'stale',selectedHash,reason:'Selected source content differs from the reviewed content hash; reconciliation is required.'};
  return {...result,state:'verified',selectedHash,reason:result.reviewRevisionMatches?'Reviewed content and revision match selected source.':'Content is unchanged; original review revision remains historical provenance.'};
}
