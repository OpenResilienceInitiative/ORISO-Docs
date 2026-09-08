// Regex/bracket-scanner based extraction of frontend & admin URL maps and
// their callers. Deliberately NOT a full TS parser — these files have a
// stable, narrow shape (object literal of string/template/arrow-function
// values); a bracket-depth scanner over that shape is enough and needs zero
// npm dependencies. See README "Known limits" for what this can miss.

/** Split an object-literal body into top-level `key: value` entries. */
function splitTopLevelEntries(body) {
	const entries = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < body.length; i++) {
		const c = body[i];
		if ('{(['.includes(c)) depth++;
		else if ('})]'.includes(c)) depth--;
		else if (c === ',' && depth === 0) {
			entries.push(body.slice(start, i));
			start = i + 1;
		}
	}
	entries.push(body.slice(start));
	return entries
		.map((e) => e.trim())
		.filter((e) => e.length > 0 && !e.startsWith('//'));
}

function splitKeyValue(entry) {
	// key is a plain identifier (or quoted identifier) before the first
	// top-level ':' — arrow-function param type annotations like
	// `(token: string) =>` appear only after an opening '(', so the first
	// ':' before any '(' is always the key/value separator here.
	let depth = 0;
	for (let i = 0; i < entry.length; i++) {
		const c = entry[i];
		if ('{(['.includes(c)) depth++;
		else if ('})]'.includes(c)) depth--;
		else if (c === ':' && depth === 0) {
			const key = entry.slice(0, i).trim().replace(/^['"]|['"]$/g, '');
			const value = entry.slice(i + 1).trim();
			return [key, value];
		}
	}
	return [entry.trim(), ''];
}

/** Extract all string/template literal segments from a JS/TS expression, in order. */
function extractLiterals(value) {
	const literals = [];
	const re = /`([^`]*)`|'([^']*)'|"([^"]*)"/g;
	let m;
	while ((m = re.exec(value))) {
		literals.push(m[1] ?? m[2] ?? m[3] ?? '');
	}
	return literals;
}

function wildcardify(literal) {
	return literal.replace(/\$\{[^}]*\}/g, '{*}');
}

const KNOWN_ORIGINS = [
	'userServiceOrigin',
	'agencyServiceOrigin',
	'tenantServiceOrigin',
	'consultingTypeServiceOrigin',
	'keycloakOrigin',
	'apiUrl',
	// ORISO-Admin's src/appConfig.ts uses "*URL" instead of "*Origin"
	'userServiceURL',
	'agencyServiceURL',
	'tenantServiceURL',
	'consultingTypeServiceURL'
];

function detectOrigin(value) {
	for (const o of KNOWN_ORIGINS) {
		// word-boundary match so e.g. "apiUrl" doesn't match inside "consultingTypeServiceOrigin"-derived text
		if (new RegExp(`\\b${o}\\b`).test(value)) return o;
	}
	return null;
}

/**
 * Parse ORISO-Frontend's src/resources/scripts/endpoints.ts export const
 * endpoints = { ... } object into a flat list of {key, originVar, path}.
 * Nested objects (e.g. `messages: { get: ..., delete: ... }`) are flattened
 * with dot-separated keys.
 * @param {string} source full file text
 */
export function parseFrontendEndpoints(rawSource) {
	// Strip `//` line comments first — endpoints.ts has several multi-line
	// comment blocks between object-literal entries (e.g. above the `error`
	// key), and without this a comment line with no top-level comma gets
	// glued onto the following key by splitTopLevelEntries.
	const source = rawSource
		.split('\n')
		.map((line) => line.replace(/\/\/.*$/, ''))
		.join('\n');
	const start = source.indexOf('export const endpoints');
	if (start === -1) return { entries: [], unparsed: [] };
	const braceStart = source.indexOf('{', start);
	if (braceStart === -1) return { entries: [], unparsed: [] };
	// Find the matching closing brace for the endpoints object.
	let depth = 0;
	let end = -1;
	for (let i = braceStart; i < source.length; i++) {
		if (source[i] === '{') depth++;
		else if (source[i] === '}') {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return { entries: [], unparsed: [] };
	// Strip full-line `//` comments first — a comment line sitting between
	// two object entries (no comma of its own) would otherwise glue onto
	// whichever entry follows it and corrupt that entry's key.
	const body = source
		.slice(braceStart + 1, end)
		.replace(/^[ \t]*\/\/.*$/gm, '');
	return flattenEntries(splitTopLevelEntries(body), '');
}

function flattenEntries(rawEntries, prefix) {
	const entries = [];
	const unparsed = [];
	for (const raw of rawEntries) {
		const [key, value] = splitKeyValue(raw);
		if (!key) continue;
		const fullKey = prefix ? `${prefix}.${key}` : key;
		const trimmedValue = value.trim();
		if (trimmedValue.startsWith('{')) {
			// nested object literal
			const inner = trimmedValue.slice(1, trimmedValue.lastIndexOf('}'));
			const nested = flattenEntries(splitTopLevelEntries(inner), fullKey);
			entries.push(...nested.entries);
			unparsed.push(...nested.unparsed);
			continue;
		}
		const origin = detectOrigin(trimmedValue);
		const literals = extractLiterals(trimmedValue).filter((l) => l.includes('/'));
		if (literals.length === 0 || !origin) {
			unparsed.push({ key: fullKey, value: trimmedValue, reason: !origin ? 'no known origin variable found' : 'no path literal found' });
			continue;
		}
		// The path is the literal that actually looks like a URL path
		// (starts with '/', possibly after ${x}). Prefer the last such
		// literal (base + `.../` + interpolation pattern puts the fullest
		// path last for template literals; for `origin + 'literal'` there's
		// only one literal anyway).
		const pathLiteral = literals.find((l) => l.startsWith('/')) ?? literals[literals.length - 1];
		entries.push({ key: fullKey, originVar: origin, path: wildcardify(pathLiteral) });
	}
	return { entries, unparsed };
}

/** Split a file into one text block per top-level `export const NAME = ...` statement (block runs to the next top-level export or EOF). */
function splitExportBlocks(source) {
	const starts = [
		...source.matchAll(/^export\s+const\s+(\w+)\s*=/gm)
	].map((m) => ({ name: m[1], index: m.index }));
	const blocks = [];
	for (let i = 0; i < starts.length; i++) {
		const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
		blocks.push({ name: starts[i].name, text: source.slice(starts[i].index, end) });
	}
	return blocks;
}

/**
 * Parse an ORISO-Frontend src/api/*.ts caller file: for each exported
 * function, which endpoints.<key> it references and which
 * FETCH_METHODS.<VERB> it uses. Scoped per export block so a file with
 * several exported functions (e.g. apiCaseHandover.ts) doesn't cross-wire
 * one function's endpoint key with another's method.
 * @param {string} source
 * @returns {{fnName: string, endpointKeys: string[], method: string|null}[]}
 */
export function parseFrontendCallerFile(source) {
	const blocks = splitExportBlocks(source);
	const callers = [];
	for (const { name, text } of blocks) {
		const endpointKeys = [
			...new Set([...text.matchAll(/endpoints\.([\w.]+)/g)].map((m) => m[1]))
		];
		if (endpointKeys.length === 0) continue;
		const methodMatch = /FETCH_METHODS\.(\w+)/.exec(text);
		callers.push({ fnName: name, endpointKeys, method: methodMatch ? methodMatch[1] : null });
	}
	return callers;
}

/**
 * Parse ORISO-Admin's src/appConfig.ts style `export const xEndpoint = ...`
 * declarations into {key, originVar, path} entries. Same literal/origin
 * extraction as the frontend parser, applied per top-level `export const`
 * statement instead of one big object literal.
 * @param {string} source
 */
export function parseAdminEndpointConstants(source) {
	const entries = [];
	const unparsed = [];
	const re = /export const (\w+)\s*=\s*(\([^)]*\)\s*=>\s*)?([^;]+);/g;
	let m;
	while ((m = re.exec(source))) {
		const [, key, , valueRaw] = m;
		// Deliberately NOT filtered to /endpoint/i in the name — several real
		// URL-builder constants don't carry "endpoint" in their name (e.g.
		// `twoFactorAuth`, `twoFactorAuthApp`, `agencyDataAgencyId`). The
		// origin-variable + path-literal check below is what actually gates
		// entry, so non-URL constants (object/array literals, plain re-exports
		// of `runtimeConfig.*`) are excluded naturally rather than by name.
		const value = valueRaw.trim();
		const origin = detectOrigin(value);
		const literals = extractLiterals(value).filter((l) => l.includes('/'));
		if (!origin || literals.length === 0) {
			unparsed.push({ key, value, reason: !origin ? 'no known origin variable found' : 'no path literal found' });
			continue;
		}
		let pathLiteral = literals.find((l) => l.startsWith('/') || l.includes('${')) ?? literals[0];
		// ORISO-Admin's appConfig.ts interpolates the origin var INSIDE the
		// template literal itself (`${userServiceURL}/service/...`), unlike
		// Frontend's `originVar + '/service/...'` style where the literal
		// never contains the origin var at all. Strip that leading
		// interpolation so it isn't mistaken for a path-wildcard segment
		// (which would otherwise make every Admin path start with "/{*}" and
		// never match a real backend path).
		pathLiteral = pathLiteral.replace(new RegExp(`^\\$\\{\\s*${origin}\\s*\\}`), '');
		entries.push({ key, originVar: origin, path: wildcardify(pathLiteral) });
	}
	return { entries, unparsed };
}

/**
 * Extract the raw expression text following a `url:` object-literal key,
 * bracket/backtick-depth aware so it stops at the first top-level `,` or
 * the closing `}` of the enclosing object literal (not at a `,`/`}` inside
 * a template literal's `${...}` interpolation or a nested call).
 * @param {string} text
 * @returns {string|null}
 */
function extractUrlValueExpr(text) {
	const keyMatch = /\burl\s*:/.exec(text);
	if (!keyMatch) return null;
	let i = keyMatch.index + keyMatch[0].length;
	const start = i;
	let depth = 0;
	let inTemplate = false;
	for (; i < text.length; i++) {
		const c = text[i];
		if (c === '`') {
			inTemplate = !inTemplate;
			continue;
		}
		if (inTemplate) continue;
		if ('{(['.includes(c)) {
			depth++;
		} else if (c === ')' || c === ']') {
			depth--;
		} else if (c === '}') {
			if (depth === 0) break; // closing brace of the enclosing object literal
			depth--;
		} else if (c === ',' && depth === 0) {
			break;
		}
	}
	return text.slice(start, i).trim();
}

/**
 * Resolve the appConfig/local-helper identifier referenced by a `url:`
 * value expression. Handles three shapes seen in ORISO-Admin's
 * src/api/**\/*.ts callers:
 *  - a bare identifier, optionally called: `agencyDataAgencyId(agencyId)`,
 *    `accountInvitesEndpoint`
 *  - a template literal whose first interpolation is the identifier:
 *    `` `${accountInvitesEndpoint}?${search.toString()}` ``
 *  - a ternary between two such shapes (ternary condition or consequent
 *    identifiers are ignored): `kind ? `${x}?kind=${kind}` : x` — the first
 *    identifier found via either shape above, in expression order, wins;
 *    this is a heuristic, not a full evaluator.
 * @param {string} expr
 * @returns {string|null}
 */
function extractUrlIdentifier(expr) {
	if (!expr) return null;
	// template-literal interpolation: `${identifier...}`
	const templateMatch = /\$\{\s*([A-Za-z_]\w*)/.exec(expr);
	if (templateMatch) return templateMatch[1];
	// bare identifier, optionally a call: identifier(...)
	const bareMatch = /^([A-Za-z_]\w*)\s*(\(|$|,|\?)/.exec(expr);
	if (bareMatch) return bareMatch[1];
	return null;
}

/**
 * Parse an ORISO-Admin src/api/**\/*.ts caller file for fetchData(...) calls:
 * for each exported function, its `url: <expr>` identifier and
 * `method: FETCH_METHODS.<VERB>`. Because Admin builds URLs from imported
 * appConfig identifiers (or file-local helper functions — see
 * `parseAdminInlineUrlHelpers`) rather than string literals, this returns
 * the raw identifier referenced in `url:` (resolved against appConfig
 * entries, or the file-local helper map, by the caller of this function).
 * Scoped per export block for the same cross-wiring reason as
 * parseFrontendCallerFile.
 *
 * Also recognizes a second URL shape seen when widening the caller scan
 * beyond src/api/**: a caller that never goes through an appConfig.ts
 * constant or a file-local helper at all, instead inlining BOTH the origin
 * variable and the `/service/...` path literal directly in the `url:`
 * expression — `` url: `${userServiceURL}/service/users/${id}/foo` `` — only
 * recognized when the leading identifier is itself one of KNOWN_ORIGINS (not
 * an arbitrary appConfig name, which is Case 1 above). Returned as `inline:
 * {originVar, path}` instead of `urlIdentifier`, so the caller of this
 * function can synthesize a file-qualified endpoint-map entry for it (same
 * pattern as `parseAdminInlineUrlHelpers`'s file-local helpers).
 * Also returns the raw `urlExpr` text verbatim (even when `urlIdentifier`
 * resolves), so a caller of this function can run `resolveIndirectUrlValue`
 * against it: a template literal like
 * `` `${tenantAdminEndpoint}/${tenantId}/permission-policies` `` extracts
 * `urlIdentifier: "tenantAdminEndpoint"` here (the first interpolated
 * name), but everything after that interpolation — the real per-record
 * suffix the base constant's own appConfig path never contains — would
 * otherwise be silently dropped. Without resolving that suffix, a caller
 * like `getTenantPermissionPolicies` (real case, ORISO-Admin) would match
 * only the *base* `GET /tenantadmin` instead of
 * `GET /tenantadmin/{id}/permission-policies`.
 * @param {string} source
 * @returns {{fnName: string, urlIdentifier: string|null, urlExpr: string|null, inline: {originVar: string, path: string}|null, method: string|null}[]}
 */
export function parseAdminCallerFile(source) {
	const blocks = splitExportBlocks(source);
	const callers = [];
	for (const { name, text } of blocks) {
		const urlExpr = extractUrlValueExpr(text);
		if (!urlExpr) continue;
		const urlIdentifier = extractUrlIdentifier(urlExpr);

		let inline = null;
		if (urlIdentifier && KNOWN_ORIGINS.includes(urlIdentifier)) {
			const literals = extractLiterals(urlExpr).filter((l) => l.includes('/'));
			const pathLiteral = literals.find((l) => l.startsWith('/') || l.includes('${')) ?? literals[0];
			if (pathLiteral) {
				const p = pathLiteral.replace(new RegExp(`^\\$\\{\\s*${urlIdentifier}\\s*\\}`), '');
				if (p.includes('/')) inline = { originVar: urlIdentifier, path: wildcardify(p) };
			}
		}

		if (!urlIdentifier && !inline) continue;
		const methodMatch = /FETCH_METHODS\.(\w+)/.exec(text);
		callers.push({
			fnName: name,
			urlIdentifier: inline ? null : urlIdentifier,
			urlExpr,
			inline,
			method: methodMatch ? methodMatch[1] : null
		});
	}
	return callers;
}

/**
 * Second-hop resolution for a URL-builder value that references another
 * already-known appConfig/endpoint-map entry instead of a raw origin
 * variable directly — e.g. ORISO-Admin's
 * `const onboardingUrl = (t, suffix='') =>
 *   \`${publicAccountInvitesEndpoint}/${encodeURIComponent(t)}/onboarding${suffix}\`;`
 * where `publicAccountInvitesEndpoint` is itself an appConfig constant
 * (`` `${userServiceURL}/service/users/account-invites}` ``), not a raw
 * origin. `detectOrigin`/direct literal extraction can't see through that
 * one level of indirection, so this looks for a leading `${identifier}`
 * whose name is a key in `knownByKey`, and if found, splices that entry's
 * own already-resolved `{originVar, path}` onto the remaining literal
 * suffix. Only resolves one hop — a helper referencing another *inline*
 * helper (rather than an appConfig.ts-level entry) is not resolved.
 * @param {string} value raw expression text (as passed to detectOrigin)
 * @param {Map<string, {originVar: string, path: string}>} knownByKey
 * @returns {{originVar: string, path: string}|null}
 */
export function resolveIndirectUrlValue(value, knownByKey) {
	if (!knownByKey || knownByKey.size === 0) return null;
	for (const lit of extractLiterals(value)) {
		// `[\s\S]*` (not `.*`) — a real caller's template literal can wrap the
		// remaining query-string expression across multiple lines (e.g.
		// ORISO-Admin's `useTenantsData`: `` `${tenantAdminEndpoint}/search?
		// page=${page || 1}&...` `` with each `&...=` param on its own line);
		// `.` never matches `\n`, so `(.*)$` silently failed to match at all
		// for any such multi-line suffix, and the whole splice was dropped.
		const m = /^\$\{\s*([A-Za-z_]\w*)\s*\}([\s\S]*)$/.exec(lit);
		if (m && knownByKey.has(m[1])) {
			const base = knownByKey.get(m[1]);
			return { originVar: base.originVar, path: wildcardify(base.path + m[2]) };
		}
	}
	return null;
}

/**
 * Parse file-local (not necessarily `export`ed) URL-builder helpers defined
 * directly inside an ORISO-Admin src/api/**\/*.ts caller file — e.g.
 * `const onboardingUrl = (inviteToken, suffix = '') =>
 *   \`${userServiceURL}/service/useradmin/onboarding/${inviteToken}${suffix}\`;`
 * These never reach appConfig.ts at all, so `parseAdminEndpointConstants`
 * (which only scans appConfig.ts) cannot see them — callers reference them
 * by their local name, which this returns so the caller of this function
 * can inject a scoped, file-qualified endpoint-map entry.
 * @param {string} source
 * @param {Map<string, {originVar: string, path: string}>} [knownByKey]
 *   already-resolved appConfig entries, used as a one-hop fallback via
 *   `resolveIndirectUrlValue` when the helper's value references another
 *   appConfig constant instead of a raw origin variable.
 * @returns {{name: string, originVar: string, path: string}[]}
 */
export function parseAdminInlineUrlHelpers(source, knownByKey) {
	const rawDecls = [];
	const re = /(?:export\s+)?const\s+(\w+)\s*=\s*(\([^)]*\)\s*=>\s*)?([^;]+);/g;
	let m;
	while ((m = re.exec(source))) {
		const [, name, , valueRaw] = m;
		rawDecls.push({ name, value: valueRaw.trim() });
	}

	function tryResolveDirect(value) {
		const origin = detectOrigin(value);
		const literals = extractLiterals(value).filter((l) => l.includes('/'));
		if (origin && literals.length > 0) {
			let pathLiteral = literals.find((l) => l.startsWith('/') || l.includes('${')) ?? literals[0];
			pathLiteral = pathLiteral.replace(new RegExp(`^\\$\\{\\s*${origin}\\s*\\}`), '');
			if (pathLiteral.includes('/')) return { originVar: origin, path: wildcardify(pathLiteral) };
		}
		return null;
	}

	// Fixed-point iteration over the file's local `const` declarations, so a
	// helper chained through ANOTHER file-local helper (not just an
	// appConfig.ts-level entry via `knownByKey`) resolves too — e.g.
	// `const a = () => \`${userServiceURL}/x\`;` then
	// `const b = (id) => \`${a}/${id}/suffix\`;` (b references a, a hop away,
	// itself only reachable through a raw origin variable). Each pass can
	// resolve one more hop; capped at 4 passes (deep enough for any real
	// chain seen in this codebase, and bounded regardless).
	const resolved = new Map(); // name -> {originVar, path}
	let changed = true;
	let pass = 0;
	while (changed && pass < 4) {
		changed = false;
		pass++;
		for (const { name, value } of rawDecls) {
			if (resolved.has(name)) continue;
			let r = tryResolveDirect(value);
			if (!r) r = resolveIndirectUrlValue(value, knownByKey);
			if (!r && resolved.size > 0) r = resolveIndirectUrlValue(value, resolved);
			if (r) {
				resolved.set(name, r);
				changed = true;
			}
		}
	}

	return [...resolved.entries()].map(([name, r]) => ({ name, originVar: r.originVar, path: r.path }));
}

// ---------------------------------------------------------------------------
// Spring @RestController endpoint extraction
// ---------------------------------------------------------------------------

const MAPPING_ANNOTATION_METHOD = {
	GetMapping: 'GET',
	PostMapping: 'POST',
	PutMapping: 'PUT',
	DeleteMapping: 'DELETE',
	PatchMapping: 'PATCH'
};

/** Does this Java source declare a Spring `@RestController`/`@Controller` class? */
export function isSpringControllerSource(source) {
	return /@RestController\b/.test(source) || /@Controller\b/.test(source);
}

/**
 * Extract the balanced-paren argument text following an `@Annotation`,
 * starting the scan at `afterAnnotationIndex` (right after the annotation
 * name). Returns `{ args: null, endIndex: afterAnnotationIndex }` if `(`
 * isn't immediately next (bare annotation with no args), or
 * `{ args: <text between the matching parens>, endIndex: <index right after
 * the closing paren> }` otherwise.
 */
function extractParenArgs(source, afterAnnotationIndex) {
	let i = afterAnnotationIndex;
	while (i < source.length && /\s/.test(source[i])) i++;
	if (source[i] !== '(') return { args: null, endIndex: afterAnnotationIndex };
	let depth = 0;
	const start = i + 1;
	for (; i < source.length; i++) {
		if (source[i] === '(') depth++;
		else if (source[i] === ')') {
			depth--;
			if (depth === 0) return { args: source.slice(start, i), endIndex: i + 1 };
		}
	}
	return { args: source.slice(start), endIndex: source.length }; // unterminated (shouldn't happen in valid Java) — best effort
}

/**
 * Pull the `value = ...` / `path = ...` payload (or, absent those keys, the
 * whole args text) out of a mapping annotation's argument text, then
 * extract every string literal from it — skipping any literal that embeds
 * an unresolvable `${property.placeholder}` (Spring `@Value`-style
 * property references, not path template variables).
 * @param {string|null} argsText
 * @returns {string[]} raw path literals (may be empty)
 */
/**
 * Scan a single annotation-argument value starting at `start` (already
 * positioned at the value's first non-whitespace character), respecting
 * quoted-string contents so a `}` or `,` *inside* a path literal (e.g. the
 * `}` in `"/foo/{id}"`) never ends the scan early. Returns the raw text
 * span (delimiters included for `{...}` arrays, quotes included for a bare
 * string) plus the index right after it.
 */
function scanBalancedValue(text, start) {
	let i = start;
	while (i < text.length && /\s/.test(text[i])) i++;
	const open = text[i];
	if (open === '{') {
		let depth = 0;
		const valueStart = i;
		for (; i < text.length; i++) {
			const c = text[i];
			if (c === '"' || c === "'" || c === '`') {
				const quote = c;
				i++;
				while (i < text.length && text[i] !== quote) {
					if (text[i] === '\\') i++;
					i++;
				}
				continue;
			}
			if (c === '{') depth++;
			else if (c === '}') {
				depth--;
				if (depth === 0) return { text: text.slice(valueStart, i + 1), endIndex: i + 1 };
			}
		}
		return { text: text.slice(valueStart), endIndex: text.length };
	}
	if (open === '"' || open === "'" || open === '`') {
		const valueStart = i;
		i++;
		while (i < text.length && text[i] !== open) {
			if (text[i] === '\\') i++;
			i++;
		}
		return { text: text.slice(valueStart, i + 1), endIndex: i + 1 };
	}
	// bare non-string token (e.g. a RequestMethod.X constant) — not a path.
	return { text: '', endIndex: start };
}

function extractMappingPaths(argsText) {
	if (argsText == null || argsText.trim() === '') return [];
	let pathSpec = argsText;
	const kvMatch = /\b(?:value|path)\s*=\s*/.exec(argsText);
	if (kvMatch) {
		pathSpec = scanBalancedValue(argsText, kvMatch.index + kvMatch[0].length).text;
	} else if (/^\s*(method|produces|consumes|headers|params|name)\s*=/.test(argsText)) {
		// only keyword args present (e.g. `method = RequestMethod.POST`) and no
		// value=/path= — there is no path literal here at all.
		return [];
	}
	const literals = extractLiterals(pathSpec);
	// Drop unresolved Spring property placeholders like ${springfox.docuPath}.
	return literals.filter((l) => !l.includes('${') && (l === '' || l.startsWith('/') || /^[\w.-]/.test(l)));
}

function joinPath(base, extra) {
	let p = `/${base}/${extra}`;
	p = p.replace(/\/{2,}/g, '/');
	if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
	if (p === '') p = '/';
	return p;
}

/** Strip a leading `/service` path segment (see lib/matcher.mjs normalizePath). */
function stripLeadingService(p) {
	let out = p.replace(/^\/service(?=\/|$)/, '');
	if (out === '') out = '/';
	return out;
}

function lineOf(source, index) {
	return source.slice(0, index).split('\n').length;
}

/** Strip `@Annotation` / `@Annotation(...)` occurrences from a text span (used to find the method name after a mapping annotation without tripping over intervening annotations like `@ResponseStatus(HttpStatus.OK)`). */
function stripAnnotations(text) {
	let out = '';
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '@') {
			let j = i + 1;
			while (j < text.length && /[\w]/.test(text[j])) j++;
			while (j < text.length && /\s/.test(text[j])) j++;
			if (text[j] === '(') {
				let depth = 0;
				for (; j < text.length; j++) {
					if (text[j] === '(') depth++;
					else if (text[j] === ')') {
						depth--;
						if (depth === 0) {
							j++;
							break;
						}
					}
				}
			}
			i = j - 1;
			continue;
		}
		out += text[i];
	}
	return out;
}

/**
 * Extract Spring MVC endpoint candidates from one `@RestController`/
 * `@Controller` Java source file. Deliberately a regex/bracket scanner, not
 * a Java parser — see module doc comment.
 *
 * Handles: class-level `@RequestMapping` base path (single string, array,
 * `value=`/`path=`, or absent entirely), method-level
 * `@GetMapping`/`@PostMapping`/`@PutMapping`/`@DeleteMapping`/`@PatchMapping`
 * and `@RequestMapping(method = RequestMethod.X, ...)`, single or array
 * paths, bare annotations (path = class base path only), and dedupes a
 * `/service/...` variant against its non-`/service` twin (both normalize to
 * the same candidate — see `stripLeadingService`).
 *
 * @param {string} source full Java file text
 * @param {string} filePath repo-relative path, used only for the `file` field
 * @returns {{method: string|null, path: string, file: string, line: number, className: string, methodName: string}[]}
 */
export function parseSpringControllerFile(source, filePath) {
	if (!isSpringControllerSource(source)) return [];

	const classMatch = /\bclass\s+(\w+)/.exec(source);
	const className = classMatch ? classMatch[1] : 'UnknownClass';
	const classIndex = classMatch ? classMatch.index : source.length;

	// Class-level @RequestMapping: only search the header span (imports +
	// class-level annotations), never inside the class body, so a
	// method-level @RequestMapping never gets mistaken for the base path.
	let basePaths = [''];
	const classHeader = source.slice(0, classIndex);
	// Fully-qualified annotation names (`@org.springframework.web.bind.annotation.PostMapping(...)`)
	// show up occasionally (e.g. to dodge an import collision) — match those too.
	const classReqMapping = /@(?:[\w.]+\.)?RequestMapping\b/.exec(classHeader);
	if (classReqMapping) {
		const { args } = extractParenArgs(source, classReqMapping.index + classReqMapping[0].length);
		const paths = extractMappingPaths(args);
		if (paths.length > 0) basePaths = paths;
	}

	const candidates = [];
	const seen = new Map(); // "method|path" -> true, for /service dedup

	const methodAnnotationRe = /@(?:[\w.]+\.)?(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\b/g;
	let am;
	while ((am = methodAnnotationRe.exec(source))) {
		if (am.index < classIndex) continue; // skip the class-level one we already handled
		const annotationName = am[1];
		const argsIndex = am.index + am[0].length;
		const { args, endIndex } = extractParenArgs(source, argsIndex);

		let method = MAPPING_ANNOTATION_METHOD[annotationName] || null;
		if (annotationName === 'RequestMapping' && args) {
			const rm = /RequestMethod\.(\w+)/.exec(args);
			if (rm) method = rm[1];
		}

		let methodPaths = extractMappingPaths(args);
		// Property-placeholder-only annotations (e.g. CustomSwaggerUIController's
		// `@RequestMapping(value = "${springfox.docuPath}")`) resolve to zero
		// usable literals via extractMappingPaths' placeholder filter — that's
		// different from "no args at all" (bare annotation = just the base
		// path), so skip this candidate entirely rather than defaulting to [''].
		if (args && args.trim() !== '' && extractLiterals(args).length > 0 && methodPaths.length === 0) {
			continue;
		}
		if (methodPaths.length === 0) methodPaths = [''];

		// find the method name: scan forward from the end of this annotation
		// (past any further annotations like @Override/@ResponseStatus(...))
		// to the next `(`, which opens the Java method's parameter list.
		const windowEnd = source.indexOf('{', endIndex);
		if (windowEnd === -1) continue;
		const window = stripAnnotations(source.slice(endIndex, windowEnd));
		const methodNameMatch = /(\w+)\s*\(/.exec(window);
		if (!methodNameMatch) continue;
		const methodName = methodNameMatch[1];

		for (const base of basePaths) {
			for (const extra of methodPaths) {
				const joined = joinPath(base, extra);
				const candidatePath = stripLeadingService(joined);
				const key = `${method || ''}|${candidatePath}`;
				if (seen.has(key)) continue;
				seen.set(key, true);
				candidates.push({
					method,
					path: candidatePath,
					file: filePath,
					line: lineOf(source, am.index),
					className,
					methodName
				});
			}
		}
	}

	return candidates;
}

/** kind: Deployment name(s) found in a Helm template YAML file. */
export function parseHelmDeploymentName(yamlSource) {
	if (!/kind:\s*Deployment\b/.test(yamlSource)) return null;
	const m = /metadata:\s*\n\s*name:\s*([\w-]+)/.exec(yamlSource);
	return m ? m[1] : null;
}
