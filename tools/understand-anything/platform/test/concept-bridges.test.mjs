import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectConceptBridges } from '../lib/concept-bridges.mjs';

const { bridges } = JSON.parse(readFileSync(new URL('../narrative/concept-bridges.json', import.meta.url), 'utf8'));
const SPI = 'file:keycloak-image/otp-config-spi/src/main/java/de/onlineberatung/RealmOtpResourceProvider.java';
const MAIL = 'file:keycloak-image/otp-config-spi/src/main/java/de/onlineberatung/authenticator/OtpMailAuthenticator.java';
const KS = 'file:src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java';
const CALLER = 'ORISO-UserService::function:src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java:KeycloakService.setUpOtpCredential()';

function graphs() {
	return {
		'ORISO-UserService': { graph: {
			nodes: [{ id: 'concept:identity-authentication-2fa', type: 'concept', name: '2FA', tags: ['2fa'] }, { id: KS, type: 'file', name: 'KeycloakService.java' }],
			edges: [{ id: 'edge:a', source: 'concept:identity-authentication-2fa', target: KS, type: 'related' }]
		} },
		'ORISO-Keycloak': { graph: {
			nodes: [
				{ id: 'concept:otp-config-rest-api', type: 'concept', name: 'otp-config REST API' },
				{ id: 'concept:email-otp-second-factor', type: 'concept', name: 'E-mail OTP' },
				{ id: SPI, type: 'file', name: 'RealmOtpResourceProvider.java' },
				{ id: MAIL, type: 'file', name: 'OtpMailAuthenticator.java' }
			],
			edges: [
				{ id: 'edge:b', source: 'concept:otp-config-rest-api', target: SPI, type: 'related' },
				{ id: 'edge:c', source: 'concept:email-otp-second-factor', target: MAIL, type: 'related' }
			]
		} }
	};
}
const match = { sourceRepo: 'ORISO-UserService', targetRepo: 'ORISO-Keycloak', endpointNode: { id: 'endpoint:ORISO-Keycloak:PUT /otp-config/setup-otp/{username}' } };

function run(confirmedMatches, g = graphs()) {
	const nodes = new Map();
	const edges = [];
	const result = projectConceptBridges({ graphs: g, bridges, confirmedMatches, callerNodeIds: [CALLER, 'ORISO-Frontend::function:x'], addNode: (n) => nodes.set(n.id, n), addEdge: (e) => edges.push(e) });
	return { nodes, edges, result };
}
const from = 'ORISO-UserService::concept:identity-authentication-2fa';
const out = (edges, id) => edges.filter((e) => e.source === id).map((e) => e.target);

test('2FA concept reaches the Keycloak SPI classes through one bridge edge', () => {
	const { nodes, edges, result } = run([match]);
	assert.deepEqual(result.skipped, []);
	const targets = out(edges, from);
	assert.ok(targets.includes('ORISO-Keycloak::concept:otp-config-rest-api'));
	assert.ok(targets.includes('ORISO-Keycloak::concept:email-otp-second-factor'));
	assert.deepEqual(out(edges, 'ORISO-Keycloak::concept:otp-config-rest-api'), [`ORISO-Keycloak::${SPI}`]);
	assert.deepEqual(out(edges, 'ORISO-Keycloak::concept:email-otp-second-factor'), [`ORISO-Keycloak::${MAIL}`]);
	assert.equal(nodes.get(`ORISO-Keycloak::${SPI}`).sourceRepo, 'ORISO-Keycloak');
	const bridge = edges.find((e) => e.target === 'ORISO-Keycloak::concept:otp-config-rest-api');
	assert.equal(bridge.metadata.evidence, 'confirmed-calls');
	assert.equal(bridge.metadata.decision, 'ADR-013');
	assert.deepEqual(bridge.metadata.endpoints, [match.endpointNode.id]);
});

test('UserService stays visible as the client', () => {
	const { edges } = run([match]);
	const targets = out(edges, from);
	assert.ok(targets.includes(`ORISO-UserService::${KS}`));
	assert.ok(targets.includes(CALLER));
	assert.ok(!targets.includes('ORISO-Frontend::function:x'));
});

test('no confirmed calls means no bridge, not a text-only link', () => {
	const { nodes, edges, result } = run([{ ...match, targetRepo: 'ORISO-AgencyService' }]);
	assert.equal(nodes.size, 0);
	assert.equal(edges.length, 0);
	assert.equal(result.skipped[0].reason, 'no confirmed calls between the repos');
});

test('a missing target concept is reported, the rest still bridges', () => {
	const g = graphs();
	g['ORISO-Keycloak'].graph.nodes = g['ORISO-Keycloak'].graph.nodes.filter((n) => n.id !== 'concept:email-otp-second-factor');
	g['ORISO-Keycloak'].graph.edges = g['ORISO-Keycloak'].graph.edges.filter((e) => e.source !== 'concept:email-otp-second-factor');
	const { edges, result } = run([match], g);
	assert.ok(out(edges, from).includes('ORISO-Keycloak::concept:otp-config-rest-api'));
	assert.match(result.skipped[0].reason, /email-otp-second-factor/);
});
