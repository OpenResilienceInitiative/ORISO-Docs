import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decoratePlatform } from '../lib/platform-navigation.mjs';

const sha = 'a'.repeat(40);
function fixture() {
  const repos = ['ORISO-Frontend', 'ORISO-Admin', 'ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-Keycloak', 'ORISO-ElementCall', 'ORISO-Livekit', 'ORISO-Helm', 'ORISO-Docs'];
  return {
    project: { sourceCommits: Object.fromEntries(repos.map(repo => [repo, sha])) },
    nodes: repos.map(repo => ({ id: `service:${repo}`, type: 'service', name: repo })),
    edges: [], layers: [], tour: [],
  };
}

test('platform tour has six small purposeful steps, with repository detail routes and honest coverage', () => {
  const graph = fixture();
  for (let i = 0; i < 1000; i++) graph.nodes.push({ id: `ORISO-UserService::function:noise${i}`, type: 'function', name: 'noise', sourceRepo: 'ORISO-UserService' });
  decoratePlatform(graph, { expectedRepositories: ['ORISO-Frontend', 'ORISO-Admin', 'ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-Keycloak', 'ORISO-ElementCall', 'ORISO-Livekit', 'ORISO-Helm', 'ORISO-Docs', 'ORISO-Infra'] });
  assert.deepEqual(graph.tour.map(step => step.title), ['Entry points', 'Core domain', 'Authentication and two factor', 'Messaging boundary', 'Operations and decisions', 'Evidence and coverage']);
  assert.ok(graph.tour.every(step => step.nodeIds.length <= 6 && step.nodeIds.every(id => graph.nodes.some(node => node.id === id))));
  assert.equal(graph.metadata.platformNavigation.repositories.find(repo => repo.repository === 'ORISO-UserService').detailHref, '/user-service/');
  assert.equal(graph.metadata.platformNavigation.repositories.find(repo => repo.repository === 'ORISO-Docs').detailHref, '/docs/');
  assert.equal(graph.metadata.platformNavigation.repositories.find(repo => repo.repository === 'ORISO-Infra').status, 'unavailable');
  assert.equal(graph.metadata.platformNavigation.repositories.find(repo => repo.repository === 'ORISO-Infra').detailHref, null);
  assert.match(graph.metadata.platformTour.steps[3].locales.en.description, /not runtime/);
  assert.match(graph.metadata.platformTour.steps[3].locales.de.description, /Laufzeit/);
});

test('the reported 27 UserService semantic entries are individually dispositioned without blessing missing or changed evidence', () => {
  const graph = fixture();
  const claim = { sourceCommit: sha, generationId: 'reviewed-fixture', generatedAt: '2026-10-01T00:00:00Z', reviewedAt: '2026-10-02T00:00:00Z', confidence: 'source-reviewed', evidence: [{ nodeId: 'class:OtpClient', sourceCommit: sha, kind: 'source', sourceRange: [1, 3], sourceFingerprint: 'b'.repeat(64) }] };
  const sourceGraph = { project: { gitCommitHash: sha }, nodes: [{ id: 'concept:identity-authentication-2fa', type: 'concept', metadata: { semanticClaim: claim } }, { id: 'concept:case-handover', type: 'concept', metadata: { semanticClaim: { ...claim, sourceCommit: 'c'.repeat(40) } } }, { id: 'class:OtpClient', lineRange: [1, 3], metadata: { sourceFingerprint: 'b'.repeat(64) } }] };
  decoratePlatform(graph, { repositoryGraphs: { 'ORISO-UserService': { graph: sourceGraph } } });
  const disposition = graph.metadata.semanticDispositions.filter(entry => entry.repository === 'ORISO-UserService');
  assert.equal(disposition.length, 27);
  assert.equal(disposition.find(entry => entry.nodeId === 'concept:identity-authentication-2fa').status, 'source-current');
  assert.equal(disposition.find(entry => entry.nodeId === 'concept:case-handover').status, 'stale');
  assert.equal(disposition.find(entry => entry.nodeId === 'flow:matrix-message-roundtrip').status, 'awaiting-review');
  assert.ok(disposition.every(entry => entry.runtimeVerified === false));
  sourceGraph.project.gitCommitHash = 'd'.repeat(40);
  decoratePlatform(graph, { repositoryGraphs: { 'ORISO-UserService': { graph: sourceGraph } } });
  assert.equal(graph.metadata.semanticDispositions.find(entry => entry.nodeId === 'concept:identity-authentication-2fa').status, 'stale');
});
