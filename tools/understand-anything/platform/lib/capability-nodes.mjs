// Emit capability concept nodes + `contains` edges to folders (ORISO-Docs#198).
// Pure function over a graph's file nodes and the reviewed rules; no I/O.
// Integration point: ua-build-supergraph.mjs calls emitCapabilityNodes() after the
// per-repo nodes are merged and before decoratePlatform()/validateGraph().
import { resolveFile, SHARED, CODE_REPOS, isProductionFile } from './capabilities.mjs';

export const capabilityNodeId = id => `capability:${id}`;
export const folderNodeId = (repo, dir) => `${repo}::folder:${dir}`;

function folderOf(via, match, path) {
  if (via === 'rule' || match.endsWith('/')) return match.replace(/\/$/, '');
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

/**
 * @param {{nodes: object[]}} graph  merged graph; file nodes carry filePath and metadata.sourceRepo
 * @param {object} rules             validated capability rules
 * @returns {{nodes: object[], edges: object[], unmatched: string[], files: number}}
 *  Nodes: one `concept` per capability (all 22, even if empty), one `module` folder node per
 *  distinct (repo, folder) that holds mapped production files. Edges: capability -contains-> folder.
 *  Files that match no rule are reported, never guessed.
 */
export function emitCapabilityNodes(graph, rules) {
  const folders = new Map(); // folderNodeId -> {repo, dir}
  const members = new Map(Object.keys(rules.capabilities).map(id => [id, new Map()])); // cap -> Map(folderId -> fileCount)
  const unmatched = [];
  let files = 0;
  for (const n of graph.nodes) {
    if (n.type !== 'file' || !n.filePath) continue;
    const repo = n.metadata?.sourceRepo;
    if (!CODE_REPOS.includes(repo) || !isProductionFile(repo, n.filePath)) continue;
    files++;
    let r;
    try { r = resolveFile(rules, repo, n.filePath); } catch (e) {
      if (e.code === 'unmatched' || e.code === 'ambiguous') { unmatched.push(`${repo}:${n.filePath}`); continue; }
      throw e;
    }
    const dir = folderOf(r.via, r.match, n.filePath);
    const fid = folderNodeId(repo, dir);
    folders.set(fid, { repo, dir });
    const m = members.get(r.capability);
    m.set(fid, (m.get(fid) ?? 0) + 1);
  }
  const nodes = [], edges = [];
  for (const [id, meta] of Object.entries(rules.capabilities)) {
    const folderMap = members.get(id);
    const fileCount = [...folderMap.values()].reduce((a, b) => a + b, 0);
    nodes.push({
      id: capabilityNodeId(id), type: 'concept', name: meta.label,
      summary: id === SHARED
        ? `Explicit shared bucket: ${fileCount} production files in ${folderMap.size} folders that belong to no single capability.`
        : `Capability ${id} (${meta.label}): ${fileCount} production files in ${folderMap.size} folders, assigned by the reviewed capability rules.`,
      tags: ['capability', id], complexity: 'moderate',
      metadata: { kind: 'capability', capabilityId: id, featureSlug: id, files: fileCount, folders: folderMap.size },
    });
    for (const fid of [...folderMap.keys()].sort()) {
      edges.push({
        source: capabilityNodeId(id), target: fid, type: 'contains', direction: 'forward',
        description: `Capability ${id} contains ${fid.split('::folder:')[1] || '(repo root)'} (${folderMap.get(fid)} files).`,
        weight: 0.5, generatedBy: 'capability-rules',
      });
    }
  }
  for (const [fid, { repo, dir }] of [...folders].sort(([a], [b]) => (a < b ? -1 : 1))) {
    nodes.push({
      id: fid, type: 'module', name: dir || '(repo root)', filePath: dir || undefined,
      summary: `Folder ${dir || '(repo root)'} in ${repo}.`, tags: ['folder', repo], complexity: 'simple',
      metadata: { kind: 'folder', sourceRepo: repo },
    });
  }
  return { nodes, edges, unmatched, files };
}
