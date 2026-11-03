import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRules, CAPABILITY_IDS } from '../lib/capabilities.mjs';
import { emitCapabilityNodes, capabilityNodeId, folderNodeId } from '../lib/capability-nodes.mjs';

const caps = Object.fromEntries(CAPABILITY_IDS.map(id => [id, { label: `L-${id}` }]));
const rules = validateRules({
  schemaVersion: 1, capabilities: caps,
  rules: [
    { repo: 'ORISO-Frontend', prefix: 'src/handover/', capability: 'case-handover' },
    { repo: 'ORISO-Frontend', prefix: 'src/common/', capability: 'shared' },
    { repo: 'ORISO-UserService', prefix: 'src/main/java/x/notify/', capability: 'notifications' },
  ],
  overrides: [{ repo: 'ORISO-Frontend', path: 'src/common/HandoverBadge.tsx', capability: 'case-handover', reason: 't' }],
});
const file = (repo, filePath) => ({ id: `${repo}::file:${filePath}`, type: 'file', name: filePath.split('/').pop(), filePath, metadata: { sourceRepo: repo } });
const graph = { nodes: [
  file('ORISO-Frontend', 'src/handover/Dialog.tsx'),
  file('ORISO-Frontend', 'src/handover/Dialog.test.tsx'),       // test: ignored
  file('ORISO-Frontend', 'src/common/util.ts'),
  file('ORISO-Frontend', 'src/common/HandoverBadge.tsx'),       // override
  file('ORISO-UserService', 'src/main/java/x/notify/Push.java'),
  file('ORISO-Frontend', 'src/orphan/Lost.tsx'),                // no rule
  file('ORISO-Helm', 'chart/values.yaml'),                      // not a code repo
  { id: 'repo:ORISO-Frontend', type: 'module', name: 'ORISO-Frontend' },
] };

test('emits one concept node per capability id, including empty ones', () => {
  const { nodes } = emitCapabilityNodes(graph, rules);
  const concepts = nodes.filter(n => n.type === 'concept');
  assert.equal(concepts.length, 22);
  const h = concepts.find(n => n.id === capabilityNodeId('case-handover'));
  assert.equal(h.name, 'L-case-handover');
  assert.equal(h.metadata.featureSlug, 'case-handover');
  assert.equal(concepts.find(n => n.id === capabilityNodeId('chat')).metadata.files, 0);
});

test('capability contains exactly the folders of its files (override folder = file dirname)', () => {
  const { edges } = emitCapabilityNodes(graph, rules);
  const targets = id => edges.filter(e => e.source === capabilityNodeId(id)).map(e => e.target).sort();
  assert.deepEqual(targets('case-handover'), [
    folderNodeId('ORISO-Frontend', 'src/common'), folderNodeId('ORISO-Frontend', 'src/handover')]);
  assert.deepEqual(targets('shared'), [folderNodeId('ORISO-Frontend', 'src/common')]);
  assert.deepEqual(targets('notifications'), [folderNodeId('ORISO-UserService', 'src/main/java/x/notify')]);
  assert.ok(edges.every(e => e.type === 'contains'));
});

test('every contains edge target exists as a folder node; no dangling, no duplicates', () => {
  const { nodes, edges } = emitCapabilityNodes(graph, rules);
  const ids = nodes.map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of edges) assert.ok(ids.includes(e.target), e.target);
  assert.equal(new Set(edges.map(e => e.source + e.target)).size, edges.length);
});

test('unmatched production files are reported, not guessed; tests and non-code repos are ignored', () => {
  const r = emitCapabilityNodes(graph, rules);
  assert.deepEqual(r.unmatched, ['ORISO-Frontend:src/orphan/Lost.tsx']);
  assert.equal(r.files, 5);
});

test('output is deterministic', () => {
  assert.deepEqual(emitCapabilityNodes(graph, rules), emitCapabilityNodes(graph, rules));
});
