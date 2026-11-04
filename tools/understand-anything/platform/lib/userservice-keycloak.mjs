import { parseKeycloakOtpCallers } from './parseSources.mjs';
import { matchEndpoint } from './matcher.mjs';

// UserService -> Keycloak otp-config SPI (ADR-013). Source-evidenced: KeycloakService builds each
// URL from an ENDPOINT_OTP_* constant under the base `identity.otp-url` and picks the HTTP verb
// through the keycloakClient helper, so every match is an exact verb + path match against the
// SPI's own endpoint nodes. A method that cannot be tied to exactly one function node is skipped.
export function loadUserServiceKeycloakCallers({ files, read, userGraph, keycloakEndpoints }) {
	const callers = [];
	const matches = [];
	const file = files.find((f) => f.endsWith('/adapters/keycloak/KeycloakService.java'));
	const source = file && read(file);
	if (!source || !keycloakEndpoints?.length) return { callers, matches };
	const properties = read('src/main/resources/application.properties') || '';
	const otpUrl = properties.match(/^identity\.otp-url\s*=\s*(.+)$/m)?.[1] ?? '';
	const basePath = otpUrl.match(/\}(\/[\w-]+)\s*$/)?.[1];
	if (!basePath) return { callers, matches };
	const functions = (userGraph?.graph.nodes || []).filter((n) => n.type === 'function' && n.id.startsWith(`function:${file}:`));
	for (const { methodName, method, path: subPath } of parseKeycloakOtpCallers(source)) {
		const candidates = functions.filter((n) => n.id.includes(`.${methodName}(`));
		if (candidates.length !== 1) continue;
		const result = matchEndpoint({ path: basePath + subPath, method }, keycloakEndpoints);
		if (!result || result.methodConfidence !== 'exact' || result.matchQuality !== 'exact') continue;
		callers.push({ file, fnName: methodName, functionId: candidates[0].id, granularity: 'function', existsInGraph: true, sourceRepo: 'ORISO-UserService' });
		matches.push({ functionId: candidates[0].id, endpointNode: result.node, methodConfidence: 'exact', matchQuality: 'exact', sourceRepo: 'ORISO-UserService', targetRepo: 'ORISO-Keycloak' });
	}
	return { callers, matches };
}
