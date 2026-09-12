// Pure, deterministic matching helpers for ua-platform-graph.mjs.
// No I/O here — keep this file importable by tests without touching fixtures.

/**
 * Normalize a URL path for cross-service comparison.
 *  - strips a leading "/service" segment (frontend/admin URLs are proxied
 *    under /service/*, backend OpenAPI paths are not)
 *  - collapses `${expr}` and `{expr}` path params to a single `{}` wildcard
 *    segment
 *  - drops query string and hash
 *  - drops a trailing slash (except root "/")
 *  - collapses multiple slashes
 *
 * @param {string} rawPath
 * @returns {string} normalized path, always starting with "/"
 */
export function normalizePath(rawPath) {
	if (!rawPath) return '/';
	let p = String(rawPath);

	// drop query string / hash
	p = p.split('?')[0].split('#')[0];

	// collapse multiple slashes
	p = p.replace(/\/{2,}/g, '/');

	// ensure leading slash
	if (!p.startsWith('/')) p = '/' + p;

	// strip a leading /service prefix (frontend/admin proxy convention)
	p = p.replace(/^\/service(?=\/|$)/, '');
	if (p === '') p = '/';

	// collapse template placeholders: ${x}, {x}, :x -> {}
	p = p.replace(/\$\{[^}]+\}/g, '{}');
	p = p.replace(/\{[^}]+\}/g, '{}');
	p = p.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, '{}');

	// drop trailing slash (unless root)
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

	return p;
}

/**
 * Compare two normalized paths segment-by-segment; each "{}" wildcard
 * segment matches any single segment on the other side.
 * @param {string} a already-normalized path
 * @param {string} b already-normalized path
 */
export function pathsEqual(a, b) {
	if (a === b) return true;
	const segA = a.split('/').filter((s) => s.length > 0 || a === '/');
	const segB = b.split('/').filter((s) => s.length > 0 || b === '/');
	if (segA.length !== segB.length) return false;
	for (let i = 0; i < segA.length; i++) {
		if (segA[i] === '{}' || segB[i] === '{}') continue;
		if (segA[i] !== segB[i]) return false;
	}
	return true;
}

/**
 * Map an origin variable name (as declared in ORISO-Frontend/ORISO-Admin
 * origin-resolution modules) to the backend repo it addresses. Returns
 * undefined for origins with no direct repo (e.g. matrix, element-call,
 * apiUrl/proxy which needs the path-prefix fallback instead).
 */
export const ORIGIN_VAR_TO_REPO = {
	userServiceOrigin: 'ORISO-UserService',
	userServiceURL: 'ORISO-UserService',
	agencyServiceOrigin: 'ORISO-AgencyService',
	agencyServiceURL: 'ORISO-AgencyService',
	tenantServiceOrigin: 'ORISO-TenantService',
	tenantServiceURL: 'ORISO-TenantService',
	consultingTypeServiceOrigin: 'ORISO-ConsultingTypeService',
	consultingTypeServiceURL: 'ORISO-ConsultingTypeService',
	keycloakOrigin: 'ORISO-Keycloak',
	keycloakURL: 'ORISO-Keycloak'
};

/**
 * Path-prefix fallback table used only when the URL is built from the
 * generic proxy origin (apiUrl / mainURL) rather than a service-specific
 * origin variable. Ordered — first matching prefix wins, so put longer /
 * more specific prefixes first.
 * Prefixes are given WITHOUT the leading "/service" (already normalized).
 */
export const PATH_PREFIX_TO_REPO = [
	['/useradmin', 'ORISO-UserService'],
	['/users', 'ORISO-UserService'],
	['/consultants', 'ORISO-UserService'],
	['/askers', 'ORISO-UserService'],
	['/conversations', 'ORISO-UserService'],
	['/messages', 'ORISO-UserService'],
	['/appointments', 'ORISO-UserService'],
	['/matrix', 'ORISO-UserService'],
	['/error-reports', 'ORISO-UserService'],
	['/agencyadmin', 'ORISO-AgencyService'],
	['/agencies', 'ORISO-AgencyService'],
	['/agency', 'ORISO-AgencyService'],
	['/appointservice', 'ORISO-AgencyService'],
	['/topicadmin', 'ORISO-AgencyService'],
	['/tenantadmin', 'ORISO-TenantService'],
	['/tenant', 'ORISO-TenantService'],
	['/consultingtypes', 'ORISO-ConsultingTypeService'],
	['/consultingtypesadmin', 'ORISO-ConsultingTypeService'],
	['/settingsadmin', 'ORISO-ConsultingTypeService'],
	['/settings', 'ORISO-ConsultingTypeService'],
	['/topic-groups', 'ORISO-ConsultingTypeService'],
	['/topic', 'ORISO-ConsultingTypeService']
];

/**
 * Resolve the repo a frontend/admin call targets.
 * @param {{originVar?: string, path: string}} call
 * @returns {string|undefined}
 */
export function resolveRepoForCall(call) {
	if (call.originVar && ORIGIN_VAR_TO_REPO[call.originVar]) {
		return ORIGIN_VAR_TO_REPO[call.originVar];
	}
	// path-prefix fallback (apiUrl / proxy / unknown origin)
	const normalized = normalizePath(call.path);
	for (const [prefix, repo] of PATH_PREFIX_TO_REPO) {
		if (normalized === prefix || normalized.startsWith(prefix + '/')) {
			return repo;
		}
	}
	return undefined;
}

function segmentsOf(p) {
	return p.split('/').filter((s) => s.length > 0 || p === '/');
}

/**
 * Classify how a call's normalized path lines up against one candidate
 * endpoint's normalized path, segment by segment.
 *  - `null`            — different segment count, or a literal-vs-literal
 *                         mismatch at some position: not a candidate at all.
 *  - `{quality: 'exact', wildcardPositions: []}` — every segment is either a
 *    literal-equal pair, or a "{}"-vs-"{}" pair (both sides already agree
 *    it's a path parameter, e.g. `/users/{username}` <- `/users/${username}`).
 *  - `{quality: 'wildcard', wildcardPositions: [i, ...]}` — at least one
 *    position has the backend endpoint's "{}" lined up against a call-side
 *    LITERAL segment (the call supplied a concrete value/word where the
 *    backend declared a path parameter) — `wildcardPositions` lists those
 *    indices, used by the caller to check for literal-resource-name
 *    disqualification (see `matchEndpoint`).
 */
function classifyPathMatch(callSegs, epSegs) {
	if (callSegs.length !== epSegs.length) return null;
	let quality = 'exact';
	const wildcardPositions = [];
	for (let i = 0; i < callSegs.length; i++) {
		const c = callSegs[i];
		const e = epSegs[i];
		if (c === e) continue;
		if (c === '{}' && e === '{}') continue; // both sides agree: real path param
		if (e === '{}' && c !== '{}') {
			// backend declared a path param, call supplied a literal word —
			// candidate, but only "wildcard" confidence until we know the
			// literal isn't actually a resource-name segment elsewhere.
			quality = 'wildcard';
			wildcardPositions.push(i);
			continue;
		}
		if (c === '{}' && e !== '{}') {
			// call side is a dynamic template value, backend side is a fixed
			// literal — still a plausible match (e.g. a legacy/looser OpenAPI
			// literal), but never upgrade to "exact".
			quality = 'wildcard';
			continue;
		}
		return null; // literal-vs-literal mismatch: not this endpoint
	}
	return { quality, wildcardPositions };
}

/**
 * Try to match a frontend/admin call against a list of backend endpoint
 * descriptors ({method, path, node}) for the resolved repo.
 *
 * Path-parameter wildcards ("{}") are matched literally-conservatively: a
 * call-side literal segment lined up against a backend "{}" is only accepted
 * when no OTHER endpoint in the same repo has a literal at that same
 * position (same total segment count) — otherwise the literal is almost
 * certainly a resource-name segment (e.g. "consultants" in
 * `/service/users/consultants`) rather than a genuine id value, and matching
 * it to `/users/{username}` would be a false positive. Surviving wildcard
 * matches are tagged `matchQuality: 'wildcard'`; full literal (or
 * param-to-param) matches are tagged `matchQuality: 'exact'`. Exact
 * candidates are always preferred over wildcard candidates when both exist.
 *
 * @returns {{node: object, methodConfidence: 'exact'|'path-only', matchQuality: 'exact'|'wildcard'}|undefined}
 */
export function matchEndpoint(call, backendEndpoints) {
	const normCallPath = normalizePath(call.path);
	const callSegs = segmentsOf(normCallPath);
	const method = call.method ? call.method.toUpperCase() : undefined;

	function literalSiblingExists(idx, totalLen) {
		const literal = callSegs[idx];
		for (const ep of backendEndpoints) {
			const epSegs = segmentsOf(ep.path);
			if (epSegs.length !== totalLen) continue;
			if (epSegs[idx] === literal) return true;
		}
		return false;
	}

	function disqualified(classification) {
		return classification.wildcardPositions.some((idx) => literalSiblingExists(idx, callSegs.length));
	}

	function pickFrom(candidates, methodConfidence) {
		const exactCand = candidates.find((c) => c.classification.quality === 'exact');
		if (exactCand) {
			return { node: exactCand.ep.node, methodConfidence, matchQuality: 'exact' };
		}
		const wildcardCand = candidates.find(
			(c) => c.classification.quality === 'wildcard' && !disqualified(c.classification)
		);
		if (wildcardCand) {
			return { node: wildcardCand.ep.node, methodConfidence, matchQuality: 'wildcard' };
		}
		return undefined;
	}

	// pass 1: method + path
	if (method) {
		const candidates = [];
		for (const ep of backendEndpoints) {
			if (ep.method !== method) continue;
			const classification = classifyPathMatch(callSegs, segmentsOf(ep.path));
			if (classification) candidates.push({ ep, classification });
		}
		const result = pickFrom(candidates, 'exact');
		if (result) return result;
	}

	// pass 2: path-only (method unknown, or no exact method match found)
	const candidates = [];
	for (const ep of backendEndpoints) {
		const classification = classifyPathMatch(callSegs, segmentsOf(ep.path));
		if (classification) candidates.push({ ep, classification });
	}
	return pickFrom(candidates, 'path-only');
}

/**
 * Does ANY endpoint in `ownEndpoints` (own OpenAPI-yaml or Spring-annotation
 * endpoints only — never a consumed/external node) "cover" `rawCallPath`,
 * either as a full same-length wildcard-aware match, or because
 * `rawCallPath` is itself a shorter PREFIX of a real endpoint's path (the
 * "base constant" case — `sessionBase` = `/users/sessions` is never itself a
 * route, it's a prefix a caller concatenates a runtime suffix onto before
 * hitting `/users/sessions/{sessionId}/enquiry/new`)? Method is ignored here
 * on purpose — this answers "does the backend serve anything under this
 * path at all", not "does it serve this exact verb"; see
 * `dead-frontend-calls.md`'s method-mismatch vs. no-such-endpoint split for
 * where method comes back in.
 *
 * @param {string} rawCallPath
 * @param {{method?: string, path: string}[]} ownEndpoints already-normalized
 *   {method, path} pairs (as stored in `backendByRepo[repo]`/
 *   `callMatchByRepo[repo]`)
 * @returns {{covered: boolean, exactMethods: string[]}} `exactMethods` lists
 *   the HTTP methods of every SAME-LENGTH (not just prefix) match found —
 *   used to tell "method-mismatch" (some exact-length match exists, just not
 *   for this method) apart from "prefix-only" (only a longer sibling route
 *   exists, e.g. the base-constant case).
 */
export function ownEndpointCoversPath(rawCallPath, ownEndpoints) {
	const callSegs = segmentsOf(normalizePath(rawCallPath));
	let covered = false;
	const exactMethods = [];
	for (const ep of ownEndpoints) {
		const epSegs = segmentsOf(ep.path);
		if (epSegs.length < callSegs.length) continue;
		let ok = true;
		for (let i = 0; i < callSegs.length; i++) {
			const c = callSegs[i];
			const e = epSegs[i];
			if (c === e) continue;
			if (c === '{}' || e === '{}') continue;
			ok = false;
			break;
		}
		if (!ok) continue;
		covered = true;
		if (epSegs.length === callSegs.length && ep.method) exactMethods.push(ep.method);
	}
	return { covered, exactMethods };
}

/**
 * Parse a backend endpoint node's `name` field ("GET /appointments/{id}")
 * into {method, path}.
 */
export function parseEndpointName(name) {
	const m = /^([A-Z]+)\s+(.+)$/.exec(name || '');
	if (!m) return { method: undefined, path: normalizePath(name || '/') };
	return { method: m[1], path: normalizePath(m[2]) };
}
