import fs from 'node:fs';
import path from 'node:path';
export function sourceLocation(graph, projectRoot, requestedPath, nodeId, repositories = {}) {
  const deny = (error, statusCode = 400, errorCode = 'SOURCE_INVALID') => ({error,statusCode,errorCode});
  const safe = p => typeof p === 'string' && p && !p.includes('\0') && !path.isAbsolute(p) && !p.split(/[\\/]/).includes('..');
  if (!safe(requestedPath)) return deny('Invalid source path');
  const supergraph = Array.isArray(graph.mergeMetadata?.sourceRepos);
  let root = projectRoot;
  const node = nodeId ? graph.nodes?.find(n => n.id === nodeId) : null;
  if (nodeId && (!node || node.filePath !== requestedPath)) return deny('Source node and path do not match');
  if (supergraph) {
    if (!node) return deny('Select a source node to identify its repository');
    const repo = node.metadata?.sourceRepo;
    if (!repo || !Object.hasOwn(repositories, repo)) return deny('Source preview is not available for this repository', 422, 'SOURCE_UNAVAILABLE_REPO');
    root = repositories[repo];
  } else if (!graph.nodes?.some(n => n.filePath === requestedPath)) {
    return deny('File is not in the knowledge graph', 404);
  }
  try {
    const realRoot = fs.realpathSync(root);
    const file = fs.realpathSync(path.resolve(realRoot,requestedPath));
    const relative = path.relative(realRoot,file);
    if (!relative || relative.startsWith('..'+path.sep) || relative==='..' || path.isAbsolute(relative)) return deny('Source must stay inside its repository');
    return {absoluteFile:file,safeRelativePath:requestedPath};
  } catch { return deny('File not found',404,'SOURCE_NOT_FOUND'); }
}
