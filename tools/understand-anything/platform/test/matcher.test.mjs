import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	normalizePath,
	pathsEqual,
	resolveRepoForCall,
	matchEndpoint,
	ownEndpointCoversPath,
	parseEndpointName
} from '../lib/matcher.mjs';

test('normalizePath strips /service prefix', () => {
	assert.equal(normalizePath('/service/users/data'), '/users/data');
});

test('normalizePath collapses ${x} template params to {}', () => {
	assert.equal(
		normalizePath('/service/agencies/${agencyId}/topics/${topicId}/legal'),
		'/agencies/{}/topics/{}/legal'
	);
});

test('normalizePath collapses {x} openapi params to {}', () => {
	assert.equal(normalizePath('/appointments/{id}'), '/appointments/{}');
});

test('pathsEqual treats ${agencyId} and {id} as the same wildcard', () => {
	const a = normalizePath('/service/appointments/${sessionId}/enquiry/new');
	const b = normalizePath('/appointments/{sessionId}/enquiry/new');
	assert.equal(pathsEqual(a, b), true);
});

test('normalizePath drops trailing slash', () => {
	assert.equal(normalizePath('/service/messages/'), '/messages');
});

test('normalizePath drops query string', () => {
	assert.equal(
		normalizePath('/service/users/sessions/consultants?status=2&'),
		'/users/sessions/consultants'
	);
});

test('normalizePath keeps root slash', () => {
	assert.equal(normalizePath('/'), '/');
	assert.equal(normalizePath(''), '/');
});

test('resolveRepoForCall: origin variable takes precedence over path prefix', () => {
	// path itself would hit the /agencies prefix (AgencyService), but the
	// explicit userServiceOrigin variable must win.
	const repo = resolveRepoForCall({
		originVar: 'userServiceOrigin',
		path: '/service/agencies/by-tenant'
	});
	assert.equal(repo, 'ORISO-UserService');
});

test('resolveRepoForCall: falls back to path-prefix table for the proxy origin', () => {
	const repo = resolveRepoForCall({
		originVar: undefined,
		path: '/service/useradmin/agencies/123/consultants'
	});
	assert.equal(repo, 'ORISO-UserService');
});

test('resolveRepoForCall: agencyadmin prefix maps to AgencyService', () => {
	const repo = resolveRepoForCall({
		originVar: undefined,
		path: '/service/agencyadmin/agencies/42'
	});
	assert.equal(repo, 'ORISO-AgencyService');
});

test('parseEndpointName splits method and normalized path', () => {
	const { method, path } = parseEndpointName('GET /appointments/{id}');
	assert.equal(method, 'GET');
	assert.equal(path, '/appointments/{}');
});

test('matchEndpoint finds an exact method+path match', () => {
	const backendEndpoints = [
		{
			method: 'GET',
			path: '/appointments/{}',
			node: { id: 'endpoint:x:GET /appointments/{id}' }
		},
		{
			method: 'PUT',
			path: '/appointments/{}',
			node: { id: 'endpoint:x:PUT /appointments/{id}' }
		}
	];
	const result = matchEndpoint(
		{ method: 'GET', path: '/service/appointments/${id}' },
		backendEndpoints
	);
	assert.equal(result.node.id, 'endpoint:x:GET /appointments/{id}');
	assert.equal(result.methodConfidence, 'exact');
});

test('matchEndpoint falls back to path-only when method is unknown', () => {
	const backendEndpoints = [
		{
			method: 'DELETE',
			path: '/users/data',
			node: { id: 'endpoint:x:DELETE /users/data' }
		}
	];
	const result = matchEndpoint(
		{ method: undefined, path: '/service/users/data' },
		backendEndpoints
	);
	assert.equal(result.node.id, 'endpoint:x:DELETE /users/data');
	assert.equal(result.methodConfidence, 'path-only');
});

test('matchEndpoint returns undefined when nothing matches', () => {
	const backendEndpoints = [
		{
			method: 'GET',
			path: '/users/data',
			node: { id: 'endpoint:x:GET /users/data' }
		}
	];
	const result = matchEndpoint(
		{ method: 'GET', path: '/service/does/not/exist' },
		backendEndpoints
	);
	assert.equal(result, undefined);
});

// ---------------------------------------------------------------------------
// Wildcard precision (fixes the fetchAgencyConsultantList false-positive:
// GET /service/users/consultants was matching GET /users/{username} because
// pathsEqual treated the backend's "{username}" as a wildcard for ANY
// literal segment, including the literal resource name "consultants").
// ---------------------------------------------------------------------------

test('matchEndpoint: a call literal that is also a real resource-name segment elsewhere in the repo is NOT matched to a {id}-shaped wildcard endpoint', () => {
	// mirrors the real bug: fetchAgencyConsultantList -> GET /service/users/consultants
	// must not match GET /users/{username}, because "consultants" appears as a
	// literal segment in another endpoint of the same repo (/useradmin/consultants).
	const backendEndpoints = [
		{ method: 'GET', path: '/users/{}', node: { id: 'endpoint:x:GET /users/{username}' } },
		{ method: 'GET', path: '/useradmin/consultants', node: { id: 'endpoint:x:GET /useradmin/consultants' } }
	];
	const result = matchEndpoint(
		{ method: 'GET', path: '/service/users/consultants' },
		backendEndpoints
	);
	assert.equal(result, undefined, 'must be classified no-such-endpoint, not a false wildcard match');
});

test('matchEndpoint: a genuine id-shaped call (no sibling literal collision) still matches the wildcard endpoint, tagged matchQuality "wildcard"', () => {
	const backendEndpoints = [
		{ method: 'GET', path: '/users/{}', node: { id: 'endpoint:x:GET /users/{username}' } }
	];
	// a real (hardcoded/example) username literal, not a known resource word,
	// and nothing else in the repo claims that literal segment.
	const result = matchEndpoint(
		{ method: 'GET', path: '/service/users/jdoe123' },
		backendEndpoints
	);
	assert.ok(result, 'expected a wildcard match');
	assert.equal(result.node.id, 'endpoint:x:GET /users/{username}');
	assert.equal(result.matchQuality, 'wildcard');
});

test('matchEndpoint: an exact-literal candidate is preferred over a co-existing wildcard candidate', () => {
	const backendEndpoints = [
		{ method: 'GET', path: '/users/{}', node: { id: 'endpoint:x:GET /users/{username}' } },
		{ method: 'GET', path: '/users/consultants', node: { id: 'endpoint:x:GET /users/consultants' } }
	];
	const result = matchEndpoint(
		{ method: 'GET', path: '/service/users/consultants' },
		backendEndpoints
	);
	assert.equal(result.node.id, 'endpoint:x:GET /users/consultants');
	assert.equal(result.matchQuality, 'exact');
});

test('matchEndpoint: method fallback (path-only pass) still applies the same wildcard-disqualification rule', () => {
	const backendEndpoints = [
		{ method: 'DELETE', path: '/users/{}', node: { id: 'endpoint:x:DELETE /users/{username}' } },
		{ method: 'PUT', path: '/useradmin/consultants', node: { id: 'endpoint:x:PUT /useradmin/consultants' } }
	];
	// no method known on the call side, so pass 2 (path-only) runs; the
	// literal-sibling disqualification must still apply there.
	const result = matchEndpoint(
		{ method: undefined, path: '/service/users/consultants' },
		backendEndpoints
	);
	assert.equal(result, undefined);
});

// ---------------------------------------------------------------------------
// ownEndpointCoversPath (dead-frontend-calls.md fix, Problem 2)
// ---------------------------------------------------------------------------

test('ownEndpointCoversPath: a bare base-URL constant is COVERED (prefix, not dead) when a longer own endpoint starts with the same segments', () => {
	const own = [
		{ method: 'GET', path: '/users/sessions/{}/enquiry/new' },
		{ method: 'GET', path: '/users/account' }
	];
	// real case: sessionBase = /users/sessions
	const result = ownEndpointCoversPath('/users/sessions', own);
	assert.equal(result.covered, true);
	// no SAME-LENGTH own endpoint at /users/sessions itself, so exactMethods is empty
	assert.deepEqual(result.exactMethods, []);
});

test('ownEndpointCoversPath: an exact-length own endpoint exists but for a different method -> covered, exactMethods lists the real method(s)', () => {
	const own = [{ method: 'GET', path: '/users/sessions' }];
	const result = ownEndpointCoversPath('/users/sessions', own);
	assert.equal(result.covered, true);
	assert.deepEqual(result.exactMethods, ['GET']);
});

test('ownEndpointCoversPath: genuinely nothing under this path -> not covered', () => {
	const own = [{ method: 'GET', path: '/users/account' }];
	const result = ownEndpointCoversPath('/service/messages/', own);
	assert.equal(result.covered, false);
	assert.deepEqual(result.exactMethods, []);
});

test('ownEndpointCoversPath: a raw service path with a trailing slash covers the normalized own endpoint', () => {
	const own = [{ method: 'GET', path: '/messages' }];
	const result = ownEndpointCoversPath('/service/messages/', own);
	assert.equal(result.covered, true);
	assert.deepEqual(result.exactMethods, ['GET']);
});

test('ownEndpointCoversPath: method is ignored for the coverage decision itself (only exactMethods communicates method info)', () => {
	const own = [{ method: 'DELETE', path: '/users/chat/room/{}' }];
	const result = ownEndpointCoversPath('/users/chat/room', own);
	assert.equal(result.covered, true, 'a longer own endpoint under the same prefix covers the base constant regardless of its method');
});
