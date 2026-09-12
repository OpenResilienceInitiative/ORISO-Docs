import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackendIndex, resolveConsumedEndpoints, resolveOwnerWithOverlap } from '../ua-platform-graph.mjs';

function epNode(id, name, filePath) {
	return { id, type: 'endpoint', name, filePath, summary: `Endpoint: ${name}`, tags: [] };
}

// A small synthetic two-repo world: ORISO-UserService owns GET /users/{id};
// ORISO-AgencyService both duplicates that exact route under a bundled
// services/userservice.yaml AND bundles a services/userservice.yaml route
// that UserService does NOT itself expose (drift), plus a
// services/mailservice.yaml route that no repo in this graph owns (external).
function makeGraphs() {
	return {
		'ORISO-UserService': {
			graph: {
				nodes: [epNode('endpoint:api/userservice.yaml:GET /users/{id}', 'GET /users/{id}', 'api/userservice.yaml')]
			},
			meta: {}
		},
		'ORISO-AgencyService': {
			graph: {
				nodes: [
					epNode('endpoint:services/userservice.yaml:GET /users/{id}', 'GET /users/{id}', 'services/userservice.yaml'),
					epNode('endpoint:services/userservice.yaml:GET /users/{id}/drift', 'GET /users/{id}/drift', 'services/userservice.yaml'),
					epNode('endpoint:services/mailservice.yaml:POST /mails/send', 'POST /mails/send', 'services/mailservice.yaml')
				]
			},
			meta: {}
		},
		'ORISO-TenantService': { graph: { nodes: [] }, meta: {} },
		'ORISO-ConsultingTypeService': { graph: { nodes: [] }, meta: {} },
		'ORISO-Keycloak': { graph: { nodes: [] }, meta: {} }
	};
}

test('buildBackendIndex: classifies api/ as own and services/ as consumed, and builds the ownSpecOwner map from own endpoints only', () => {
	const graphs = makeGraphs();
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints, openapiOwnCount, openapiConsumedCount } = buildBackendIndex(graphs);

	assert.equal(ownByRepo['ORISO-UserService'].length, 1);
	assert.equal(ownByRepo['ORISO-AgencyService'].length, 0);
	assert.equal(consumedByRepo['ORISO-AgencyService'].length, 3);
	assert.equal(ownSpecOwner.get('userservice'), 'ORISO-UserService');
	assert.equal(ownSpecOwner.has('mailservice'), false);
	assert.equal(openapiOwnCount, 1);
	assert.equal(openapiConsumedCount, 3);
});

test('resolveConsumedEndpoints: a consumed endpoint that matches an owner own endpoint (wildcard-equal) becomes a `consumes` reference to that SAME node, no duplicate node created', () => {
	const graphs = makeGraphs();
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const { driftNodesByRepo, consumesRefs } = resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints);

	const dupRef = consumesRefs.find((r) => r.kind === 'duplicate');
	assert.ok(dupRef, 'expected one duplicate-kind consumes reference');
	assert.equal(dupRef.consumerRepo, 'ORISO-AgencyService');
	assert.equal(dupRef.ownerRepo, 'ORISO-UserService');
	// the target is the OWNER's own node — not a new node under AgencyService
	assert.equal(dupRef.targetNode.id, ownByRepo['ORISO-UserService'][0].node.id);
	// and no drift node was created for the owner from this reference
	assert.equal(driftNodesByRepo['ORISO-UserService'].some((d) => d.node.id.includes('drift-should-not-exist')), false);
});

test('resolveConsumedEndpoints: a consumed endpoint whose owner is in the graph but has no matching own route is spec drift — one deduped node attributed to the OWNER, tagged consumed-spec-only, plus a spec-drift.md row', () => {
	const graphs = makeGraphs();
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const { driftNodesByRepo, consumesRefs, specDriftRows } = resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints);

	const driftRef = consumesRefs.find((r) => r.kind === 'drift');
	assert.ok(driftRef, 'expected one drift-kind consumes reference');
	assert.equal(driftRef.ownerRepo, 'ORISO-UserService');
	assert.equal(driftRef.targetNode.sourceRepo, 'ORISO-UserService');
	assert.equal(driftRef.targetNode.metadata.source, 'consumed-spec-only');
	assert.equal(driftNodesByRepo['ORISO-UserService'].length, 1);

	assert.equal(specDriftRows.length, 1);
	assert.equal(specDriftRows[0].consumer, 'ORISO-AgencyService');
	assert.equal(specDriftRows[0].owner, 'ORISO-UserService');
	assert.equal(specDriftRows[0].endpoint, 'GET /users/{id}/drift');
});

test('resolveConsumedEndpoints: a consumed endpoint whose spec basename matches no repo in the graph is external — attributed to the CONSUMER, metadata.external=true, no owner', () => {
	const graphs = makeGraphs();
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const { externalByRepo, consumesRefs } = resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints);

	const extRef = consumesRefs.find((r) => r.kind === 'external');
	assert.ok(extRef, 'expected one external-kind consumes reference');
	assert.equal(extRef.ownerRepo, null);
	assert.equal(extRef.targetNode.sourceRepo, 'ORISO-AgencyService');
	assert.equal(extRef.targetNode.metadata.external, true);
	assert.equal(externalByRepo['ORISO-AgencyService'].length, 1);
});

test('resolveConsumedEndpoints: two consumers bundling the SAME drifted endpoint from the same owner collapse onto one node (deduped by owner+method+path), but each still gets its own spec-drift.md row', () => {
	const graphs = makeGraphs();
	// add a second consumer bundling the exact same drift endpoint
	graphs['ORISO-TenantService'].graph.nodes.push(
		epNode('endpoint:services/userservice.yaml:GET /users/{id}/drift', 'GET /users/{id}/drift', 'services/userservice.yaml')
	);
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const { driftNodesByRepo, specDriftRows } = resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints);

	assert.equal(driftNodesByRepo['ORISO-UserService'].length, 1, 'one deduped drift node, not two');
	const driftRows = specDriftRows.filter((r) => r.endpoint === 'GET /users/{id}/drift');
	assert.equal(driftRows.length, 2, 'both consumer references are still recorded as rows');
});

// ---------------------------------------------------------------------------
// Owner-overlap check (Problem 3 fix): basename collision must not attribute
// an unrelated consumed spec to a same-named own spec, and must never
// produce a repo->itself self-edge.
// ---------------------------------------------------------------------------

function epNode2(id, name, filePath) {
	return { id, type: 'endpoint', name, filePath, summary: `Endpoint: ${name}`, tags: [] };
}

// Mirrors the real bug: ORISO-UserService owns its own api/appointmentservice.yaml
// (2 real endpoints, /appointments/*) AND consumes services/appointmentService.yaml
// (the retired Cal.com contract, 2 endpoints, /consultants/*, no repo in this
// graph really owns it) — same basename after lowercasing, completely disjoint
// paths. The consumer here is UserService ITSELF, so a naive basename-only
// lookup would produce a UserService -> UserService self-edge.
function makeCollisionGraphs() {
	return {
		'ORISO-UserService': {
			graph: {
				nodes: [
					epNode2('endpoint:api/appointmentservice.yaml:GET /appointments', 'GET /appointments', 'api/appointmentservice.yaml'),
					epNode2('endpoint:api/appointmentservice.yaml:GET /appointments/{id}', 'GET /appointments/{id}', 'api/appointmentservice.yaml'),
					epNode2('endpoint:services/appointmentService.yaml:POST /consultants', 'POST /consultants', 'services/appointmentService.yaml'),
					epNode2('endpoint:services/appointmentService.yaml:GET /consultants/{id}/eventTypes', 'GET /consultants/{id}/eventTypes', 'services/appointmentService.yaml')
				]
			},
			meta: {}
		},
		'ORISO-AgencyService': { graph: { nodes: [] }, meta: {} },
		'ORISO-TenantService': { graph: { nodes: [] }, meta: {} },
		'ORISO-ConsultingTypeService': { graph: { nodes: [] }, meta: {} },
		'ORISO-Keycloak': { graph: { nodes: [] }, meta: {} }
	};
}

test('resolveOwnerWithOverlap: 0% overlap between an own spec and a same-named-by-coincidence consumed spec fails the 50% bar -> null (external), not owner-attributed', () => {
	const { ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(makeCollisionGraphs());
	assert.equal(ownSpecOwner.get('appointmentservice'), 'ORISO-UserService', 'candidate owner is still found by basename');
	const consumedEntries = [
		{ method: 'POST', path: '/consultants' },
		{ method: 'GET', path: '/consultants/{}/eventTypes' }
	];
	const owner = resolveOwnerWithOverlap('appointmentservice', consumedEntries, ownSpecOwner, ownSpecEndpoints);
	assert.equal(owner, null, 'disjoint path sets must not attribute ownership');
});

test('resolveConsumedEndpoints: the basename-collision case produces NO depends_on/consumes self-edge — the consumed group is external instead', () => {
	const graphs = makeCollisionGraphs();
	const { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const { externalByRepo, consumesRefs, specDriftRows } = resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints);

	// no self-referential consumes ref at all
	assert.equal(consumesRefs.some((r) => r.consumerRepo === r.ownerRepo), false, 'must never emit a repo -> itself consumes reference');
	assert.equal(specDriftRows.length, 0, 'no false spec-drift rows from the collision');
	assert.equal(externalByRepo['ORISO-UserService'].length, 2, 'both retired-Cal.com endpoints land as external, attributed to the consumer (itself)');
	assert.ok(consumesRefs.every((r) => r.kind === 'external'));
});

test('resolveOwnerWithOverlap: a real >= 50% overlap (genuinely the same spec) IS attributed to the owner', () => {
	const graphs = {
		'ORISO-UserService': {
			graph: { nodes: [epNode2('endpoint:api/userservice.yaml:GET /users/{id}', 'GET /users/{id}', 'api/userservice.yaml')] },
			meta: {}
		},
		'ORISO-AgencyService': {
			graph: { nodes: [epNode2('endpoint:services/userservice.yaml:GET /users/{id}', 'GET /users/{id}', 'services/userservice.yaml')] },
			meta: {}
		},
		'ORISO-TenantService': { graph: { nodes: [] }, meta: {} },
		'ORISO-ConsultingTypeService': { graph: { nodes: [] }, meta: {} },
		'ORISO-Keycloak': { graph: { nodes: [] }, meta: {} }
	};
	const { ownSpecOwner, ownSpecEndpoints } = buildBackendIndex(graphs);
	const owner = resolveOwnerWithOverlap('userservice', [{ method: 'GET', path: '/users/{}' }], ownSpecOwner, ownSpecEndpoints);
	assert.equal(owner, 'ORISO-UserService');
});
