import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export function sourceLocation(graph, projectRoot, requestedPath, nodeId, repositories = {}) {
  const deny = (error, statusCode = 400, errorCode = 'SOURCE_INVALID') => ({error,statusCode,errorCode});
  const safe = p => typeof p === 'string' && p && !p.includes('\0') && !path.isAbsolute(p) && !p.split(/[\\/]/).includes('..');
  if (!safe(requestedPath)) return deny('Invalid source path');
  const supergraph = Array.isArray(graph.mergeMetadata?.sourceRepos) || ['oriso-platform','oriso-super-graph'].includes(graph.kind);
  let sourceRepo, sourceCommit;
  let root = projectRoot;
  const node = nodeId ? graph.nodes?.find(n => n.id === nodeId) : null;
  if (nodeId && (!node || node.filePath !== requestedPath)) return deny('Source node and path do not match');
  if (supergraph) {
    if (!node) return deny('Select a source node to identify its repository');
    const repo = node.sourceRepo ?? node.metadata?.sourceRepo;
    const identityError = () => deny('Source identity does not match this graph generation', 409, 'SOURCE_IDENTITY_MISMATCH');
    if ((graph.kind === 'oriso-platform' && !Array.isArray(graph.metadata?.sources)) ||
        (graph.kind === 'oriso-super-graph' && !Array.isArray(graph.mergeMetadata?.sourceRepos))) return identityError();
    const vector = graph.project?.sourceCommits;
    if (!vector || typeof vector !== 'object' || Array.isArray(vector) || !Object.keys(vector).length ||
        Object.entries(vector).some(([name, revision]) => !name || !/^[a-f0-9]{40}$/i.test(revision ?? ''))) return identityError();
    // The complete declared vector must agree; validating just the selected SHA
    // would allow a partial or mixed generation to advertise valid source.
    for (const records of [graph.mergeMetadata?.sourceRepos, graph.metadata?.sources]) {
      if (records == null) continue;
      if (!Array.isArray(records) || records.length !== Object.keys(vector).length ||
          new Set(records.map(s => s.repo)).size !== records.length ||
          records.some(s => !Object.hasOwn(vector, s.repo) || vector[s.repo] !== s.gitCommitHash)) return identityError();
    }
    const prefix = node.id?.includes('::') ? node.id.split('::')[0] : null;
    if (!repo || !Object.hasOwn(vector, repo) ||
        (node.sourceRepo && node.metadata?.sourceRepo && node.sourceRepo !== node.metadata.sourceRepo) ||
        (prefix && prefix !== repo) ||
        (node.metadata?.sourceCommit && node.metadata.sourceCommit !== vector[repo])) return identityError();
    sourceRepo = repo;
    sourceCommit = graph.project?.sourceCommits?.[repo];
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
    if (supergraph) {
      const git = (...args) => execFileSync('git', ['-C', realRoot, ...args], {stdio:['ignore','pipe','pipe']});
      try {
        if (git('rev-parse','HEAD').toString().trim() !== sourceCommit ||
            fs.realpathSync(git('rev-parse','--show-toplevel').toString().trim()) !== realRoot ||
            !git('show', `${sourceCommit}:${requestedPath}`).equals(fs.readFileSync(file)))
          return deny('Source checkout changed since this graph generation',409,'SOURCE_IDENTITY_MISMATCH');
      } catch { return deny('Source revision cannot be verified',409,'SOURCE_IDENTITY_MISMATCH'); }
    }
    return {absoluteFile:file,safeRelativePath:requestedPath,...(sourceRepo ? {sourceRepo, sourceCommit} : {})};
  } catch { return deny('File not found',404,'SOURCE_NOT_FOUND'); }
}
