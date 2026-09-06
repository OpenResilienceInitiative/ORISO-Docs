// Pure classification helpers for endpoint nodes pulled from a per-repo
// Understand-Anything graph — Problem A of the ua-platform-graph.mjs rework.
//
// The rule (verified against fixtures/*/.understand-anything/knowledge-graph.json
// before being written down here — do not change it without re-checking the
// per-repo endpoint filePath tables):
//
//   own      — the endpoint node's filePath has an "api" path segment
//              (e.g. "api/userservice.yaml", or the deeper
//              "keycloak-image/otp-config-spi/api/keycloakextension.yaml").
//              This is true REGARDLESS of whether the spec's basename
//              matches the repo's own name — ORISO-UserService bundles
//              api/appointmentservice.yaml and api/conversationservice.yaml
//              under its own api/ folder too, and those count as "own" by
//              this rule (they inflate UserService's own-endpoint count,
//              which is why UserService 179 own = 111 api/*.yaml + 68
//              Spring-annotation-recovered, not 111 + Spring minus the
//              appointment/conversation nodes).
//   consumed — the endpoint node's filePath has a "services" path segment
//              (e.g. "services/tenantadminservice.yaml") — an OpenAPI spec a
//              backend bundles to *consume* another service, not to serve
//              its own routes.
//   unknown  — neither segment present (should not happen for the backend
//              repos in this graph; treated as "consumed" defensively by the
//              caller so it is never silently `exposes`d).
//
// A Spring-annotation-derived endpoint (metadata.source === 'spring-annotation',
// added later by mergeSpringEndpoints) is always "own" — it is read directly
// out of the repo's own Java controllers, there is no consumed/own ambiguity.

/**
 * @param {string|null|undefined} filePath
 * @returns {'own'|'consumed'|'unknown'}
 */
export function classifyFilePath(filePath) {
	if (!filePath) return 'unknown';
	const segs = String(filePath).split('/');
	if (segs.includes('api')) return 'own';
	if (segs.includes('services')) return 'consumed';
	return 'unknown';
}

/**
 * Lower-cased spec basename with the .yaml/.yml extension stripped —
 * "services/tenantAdminservice.YML" -> "tenantadminservice". Used both to
 * build the ownSpecName -> owning-repo map (from each repo's OWN endpoints)
 * and to look a consumed endpoint's spec up in that map.
 * @param {string|null|undefined} filePath
 * @returns {string}
 */
export function specBasename(filePath) {
	if (!filePath) return '';
	const base = filePath.split('/').pop() || '';
	return base.replace(/\.ya?ml$/i, '').toLowerCase();
}
