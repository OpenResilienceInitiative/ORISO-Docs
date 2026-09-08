#!/usr/bin/env node
// Publication must pass the exact installed consumer, not just a parallel schema.
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
export function verifyConsumer(graph,validateGraph) {
  const result=validateGraph(graph);
  if (!result.success || result.issues.length || !isDeepStrictEqual(result.data,graph))
    throw new Error(`Consumer rejected or changed graph: ${result.fatal ?? JSON.stringify(result.issues)}`);
}
export async function verifyGeneration(directory,core) {
  const root=realpathSync(directory);
  const manifest=JSON.parse(readFileSync(resolve(root,'manifest.json'),'utf8'));
  const {validateGraph}=await import(pathToFileURL(core));
  for(const item of manifest.graphs) {
    const file=realpathSync(resolve(root,item.path));
    const rel=relative(root,file);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Consumer graph path escapes generation');
    const graph=JSON.parse(readFileSync(file,'utf8'));
    if(graph.schemaVersion!=='oriso.ua.graph/v1') throw new Error('ORISO strict consumer schema is required');
    try {verifyConsumer(graph,validateGraph);}
    catch(error){throw new Error(`${item.repository}: ${error.message}`);}
  }
  return {consumer:'pinned ORISO core',generationId:manifest.generationId,graphs:manifest.graphs.length,lossyRepairs:0};
}
if (process.argv[1] && import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href) {
  if(!process.argv[2] || !process.env.UA_CORE) throw new Error('Usage: UA_CORE=<pinned dist/index.js> node ua-validate-consumer.mjs <sealed-generation>');
  console.log(JSON.stringify(await verifyGeneration(process.argv[2],process.env.UA_CORE)));
}
