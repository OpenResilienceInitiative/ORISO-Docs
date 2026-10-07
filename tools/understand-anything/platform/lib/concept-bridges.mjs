import {assessClaim} from '../../lib/semantic-claims.mjs';
// Cross-repo concept bridges (Docs#168). A bridge links a concept in one repo graph to the
// concept that owns the implementation in another repo, e.g. the UserService 2FA concept to the
// Keycloak otp-config SPI concepts (ADR-013). Repository calls qualify discovery
// links; direct owning-class routes require exact, current source-reviewed claims
// at both ends. The aggregate reuses those claims without inventing call evidence.
const RELATED_TYPES = new Set(['related']);
const fullSHA = /^[a-f0-9]{40}$/i;
const fingerprint = /^[a-f0-9]{64}$/i;
function reviewed(graph, id) {
    const claim = graph?.nodes?.find(n => n.id === id)?.metadata?.semanticClaim;
    return claim?.confidence === 'source-reviewed' && assessClaim(claim, graph).status === 'source-current';
}

function projectConcept(graphs, repo, conceptId, addNode, addEdge) {
    const graph = graphs[repo]?.graph;
    if (!graph) return null;
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const concept = byId.get(conceptId);
    if (!concept) return null;
    const id = `${repo}::${conceptId}`;
    addNode({ ...concept, id, sourceRepo: repo, tags: [...new Set([...(concept.tags || []), 'concept-bridge'])] });
    for (const e of graph.edges) {
        if (e.source !== conceptId || !RELATED_TYPES.has(e.type)) continue;
        const target = byId.get(e.target);
        if (!target) throw new Error(`Dangling concept relation ${repo}:${e.source} -> ${e.target}`);
        addNode({ ...target, id: `${repo}::${target.id}`, sourceRepo: repo });
        addEdge({ ...e, id: `${repo}::${e.id}`, source: id, target: `${repo}::${target.id}`, direction: 'forward' });
    }
    return id;
}

export function projectConceptBridges({ graphs, bridges, confirmedMatches = [], callerNodeIds = [], addNode, addEdge }) {
    const emitted = [];
    const skipped = [];
    for (const bridge of bridges) {
        const evidence = confirmedMatches.filter((m) => m.sourceRepo === bridge.from.repo && m.targetRepo === bridge.to.repo);
        if (!evidence.length && !(reviewed(graphs[bridge.from.repo]?.graph, bridge.from.concept) && bridge.to.concepts.some(id => reviewed(graphs[bridge.to.repo]?.graph, id)))) {
            skipped.push({ bridge: bridge.id, reason: 'no confirmed calls between the repos' });
            continue;
        }
        const fromId = projectConcept(graphs, bridge.from.repo, bridge.from.concept, addNode, addEdge);
        if (!fromId) {
            skipped.push({ bridge: bridge.id, reason: `missing ${bridge.from.repo}:${bridge.from.concept}` });
            continue;
        }
        const endpoints = [...new Set(evidence.map((m) => m.endpointNode.id))].sort();
        const nodeIds = [fromId];
        const implementationEdges = new Map();
        for (const conceptId of bridge.to.concepts) {
            if (!evidence.length && !reviewed(graphs[bridge.to.repo]?.graph, conceptId)) {
                skipped.push({bridge:bridge.id,reason:`source review required: ${bridge.to.repo}:${conceptId}`});
                continue;
            }
            const toId = projectConcept(graphs, bridge.to.repo, conceptId, addNode, addEdge);
            if (!toId) {
                skipped.push({ bridge: bridge.id, reason: `missing ${bridge.to.repo}:${conceptId}` });
                continue;
            }
            nodeIds.push(toId);
            const fromGraph = graphs[bridge.from.repo].graph;
            const toGraph = graphs[bridge.to.repo].graph;
            if (reviewed(fromGraph, bridge.from.concept) && reviewed(toGraph, conceptId)) {
                const targetClaim = toGraph.nodes.find(n => n.id === conceptId).metadata.semanticClaim;
                const evidenceIds = new Set(targetClaim.evidence.map(e => e.nodeId));
                for (const relation of toGraph.edges.filter(e => e.source === conceptId && e.type === 'related')) {
                    const target = toGraph.nodes.find(n => n.id === relation.target);
                    if (target?.type !== 'class' || !evidenceIds.has(target.id)) continue;
                    const targetId = `${bridge.to.repo}::${target.id}`;
                    const sourceCommit = toGraph.project?.gitCommitHash;
                    const sourceFingerprint = target.metadata?.sourceFingerprint;
                    if (!fullSHA.test(sourceCommit ?? '') || !fingerprint.test(sourceFingerprint ?? '')) continue;
                    const identity = `bridge:${bridge.id}:${fromId}->${targetId}`;
                    const edge = implementationEdges.get(identity) ?? {
                        id: identity, source: fromId, target: targetId, type: 'related', direction: 'forward', weight: 1,
                        label: bridge.implementationLabel ?? bridge.label,
                        metadata: {evidence: 'source-reviewed', decision: bridge.decision, sourceCommit, sourceFingerprint, runtimeVerified: false, provenance: []}
                    };
                    edge.metadata.provenance.push({conceptId, relationshipId: relation.id ?? null, evidence: targetClaim.evidence.filter(item => item.nodeId === target.id)});
                    implementationEdges.set(identity, edge);
                    nodeIds.push(targetId);
                }
            }
            addEdge({
                id: `bridge:${fromId}->${toId}`,
                source: fromId,
                target: toId,
                type: 'related',
                label: bridge.label,
                direction: 'forward',
                weight: 1,
                metadata: { evidence: evidence.length ? 'confirmed-calls' : 'source-reviewed', runtimeVerified: false, decision: bridge.decision, confirmedCalls: evidence.length, endpoints }
            });
        }
        for (const edge of implementationEdges.values()) addEdge(edge);
        // The concept also points at the source-repo methods that make those calls.
        for (const callerId of callerNodeIds.filter((id) => id.startsWith(`${bridge.from.repo}::`))) {
            addEdge({ source: fromId, target: callerId, type: 'related', label: 'calls through', direction: 'forward', weight: 0.7 });
            nodeIds.push(callerId);
        }
        emitted.push({ bridge: bridge.id, nodeIds: [...new Set(nodeIds)] });
    }
    return { emitted, skipped };
}
