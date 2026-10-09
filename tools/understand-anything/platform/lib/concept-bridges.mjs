// Cross-repo concept bridges (Docs#168). A bridge links a concept in one repo graph to the
// concept that owns the implementation in another repo, e.g. the UserService 2FA concept to the
// Keycloak otp-config SPI concepts (ADR-013). A bridge is only emitted when confirmed `calls`
// matches (exact verb + exact path) exist from the source repo to the target repo, so the edge is
// source-evidenced, never a text pointer. Both concepts are projected with their own `related`
// targets (the SPI classes), which makes the owning classes reachable from the source concept.
const RELATED_TYPES = new Set(['related']);

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

export function projectConceptBridges({ graphs, bridges, confirmedMatches, callerNodeIds = [], addNode, addEdge }) {
	const emitted = [];
	const skipped = [];
	for (const bridge of bridges) {
		const evidence = confirmedMatches.filter((m) => m.sourceRepo === bridge.from.repo && m.targetRepo === bridge.to.repo);
		if (!evidence.length) {
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
		for (const conceptId of bridge.to.concepts) {
			const toId = projectConcept(graphs, bridge.to.repo, conceptId, addNode, addEdge);
			if (!toId) {
				skipped.push({ bridge: bridge.id, reason: `missing ${bridge.to.repo}:${conceptId}` });
				continue;
			}
			nodeIds.push(toId);
			addEdge({
				id: `bridge:${fromId}->${toId}`,
				source: fromId,
				target: toId,
				type: 'related',
				label: bridge.label,
				direction: 'forward',
				weight: 1,
				metadata: { evidence: 'confirmed-calls', decision: bridge.decision, confirmedCalls: evidence.length, endpoints }
			});
		}
		// The concept also points at the source-repo methods that make those calls.
		for (const callerId of callerNodeIds.filter((id) => id.startsWith(`${bridge.from.repo}::`))) {
			addEdge({ source: fromId, target: callerId, type: 'related', label: 'calls through', direction: 'forward', weight: 0.7 });
			nodeIds.push(callerId);
		}
		emitted.push({ bridge: bridge.id, nodeIds });
	}
	return { emitted, skipped };
}
