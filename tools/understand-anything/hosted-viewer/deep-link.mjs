// Deep links into the hosted Understand viewer: ?node=<id>, and the way back to /map/#node=<id>.
// Pure helpers; installed next to the dashboard by install.py (see toolchain.lock.json).
const MAX_ID = 512;

export function parseNodeParam(search) {
  const raw = new URLSearchParams(search).get('node');
  if (raw === null) return null;
  const id = raw.trim();
  if (!id || id.length > MAX_ID || /[\u0000-\u001f\u007f]/.test(id)) return null;
  return id;
}

/** Exact id first; a `<repo>::<rest>` id also matches a single-repository graph that stores `<rest>`. */
export function resolveDeepLink(nodes, id) {
  const ids = new Set();
  for (const n of nodes ?? []) if (n && typeof n.id === 'string') ids.add(n.id);
  if (ids.has(id)) return {status: 'found', nodeId: id};
  const i = id.indexOf('::');
  if (i > 0) {
    const bare = id.slice(i + 2);
    if (ids.has(bare)) return {status: 'found', nodeId: bare};
  }
  return {status: 'not-found', id};
}

export function mapUrlForNode(nodeId) {
  return '/map/#node=' + encodeURIComponent(nodeId);
}
