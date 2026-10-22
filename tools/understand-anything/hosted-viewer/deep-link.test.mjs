import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNodeParam, resolveDeepLink, mapUrlForNode} from './deep-link.mjs';

const graph = {nodes: [
  {id: 'capability:case-handover'},
  {id: 'ORISO-UserService::folder:src/main/java/x'},
  {id: 'ORISO-UserService::file:src/main/java/x/A.java'},
  {id: 'file:src/only/Single.ts'}
]};

test('parseNodeParam reads the node id from a query string', () => {
  assert.equal(parseNodeParam('?node=capability%3Acase-handover'), 'capability:case-handover');
  assert.equal(parseNodeParam('?token=t&node=ORISO-UserService%3A%3Afile%3Aa%2Fb.ts'), 'ORISO-UserService::file:a/b.ts');
});

test('parseNodeParam ignores absent, empty, oversized or control-character values', () => {
  for (const s of ['', '?', '?token=t', '?node=', '?node=%20%20', '?node=a%00b', '?node=' + 'x'.repeat(513)]) assert.equal(parseNodeParam(s), null, s);
});

test('resolveDeepLink finds capability, folder and file ids exactly', () => {
  for (const n of graph.nodes.slice(0, 3)) assert.deepEqual(resolveDeepLink(graph.nodes, n.id), {status: 'found', nodeId: n.id});
});

test('resolveDeepLink maps a repository-prefixed id onto a single-repository graph', () => {
  assert.deepEqual(resolveDeepLink(graph.nodes, 'ORISO-Frontend::file:src/only/Single.ts'), {status: 'found', nodeId: 'file:src/only/Single.ts'});
});

test('resolveDeepLink reports unknown ids instead of guessing', () => {
  assert.deepEqual(resolveDeepLink(graph.nodes, 'capability:nope'), {status: 'not-found', id: 'capability:nope'});
  assert.deepEqual(resolveDeepLink(graph.nodes, 'ORISO-UserService::file:src/other.ts'), {status: 'not-found', id: 'ORISO-UserService::file:src/other.ts'});
  assert.deepEqual(resolveDeepLink([], 'x'), {status: 'not-found', id: 'x'});
});

test('mapUrlForNode builds a same-origin /map/ hash link', () => {
  assert.equal(mapUrlForNode('ORISO-UserService::file:src/A b.java'), '/map/#node=ORISO-UserService%3A%3Afile%3Asrc%2FA%20b.java');
  assert.equal(mapUrlForNode('capability:chat'), '/map/#node=capability%3Achat');
});
