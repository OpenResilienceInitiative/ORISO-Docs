import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {applyNodeSummary} from '../../../lib/semantic-claims.mjs';
test('imported PR118 historical summaries stay unbound and retain original evidence',()=>{
 const root=new URL('../../../enrichments/',import.meta.url);
 const files=readdirSync(root).filter(x=>/^summaries-/.test(x));assert.equal(files.length,6);
 for(const file of files){
  const data=JSON.parse(readFileSync(new URL(file,root)));assert.ok(data.meta.generatedAt.startsWith('2026-09-04'));
  const [id,value]=Object.entries(data.nodeSummaries)[0];const node={id,type:'file',summary:'structural'};const graph={nodes:[node],edges:[]};
  applyNodeSummary(node,value,graph,data.meta);
  assert.equal(node.metadata.semanticClaim.status,'unbound');assert.equal(node.metadata.semanticClaim.priorSummary,value.summary);assert.match(node.summary,/Dated orientation/);
 }
});
