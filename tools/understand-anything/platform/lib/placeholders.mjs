// {{stats.<dotted.path>}} substitution against graph.metadata.stats — Problem
// B of the narrative apply script. Pure, no I/O, so it can be unit-tested
// directly instead of only through the full apply-platform-enrich.mjs run.

const PLACEHOLDER_RE = /\{\{stats\.([a-zA-Z0-9_.-]+)\}\}/g;

/**
 * Look a dotted path ("services.ORISO-UserService.endpointsOwn") up in an
 * object. Returns undefined if any segment is missing — never throws.
 * @param {object} obj
 * @param {string} dottedPath
 */
export function getPath(obj, dottedPath) {
	let cur = obj;
	for (const seg of dottedPath.split('.')) {
		if (cur == null || typeof cur !== 'object' || !(seg in cur)) return undefined;
		cur = cur[seg];
	}
	return cur;
}

/**
 * Replace every `{{stats.<path>}}` in `text` with the value at that path in
 * `stats` (String()-coerced). A missing path is never silently dropped: it
 * is replaced with a visible `[stat missing: <path>]` marker instead, and
 * its dotted path is recorded in `missing` (if provided) for the caller to
 * report.
 * @param {string} text
 * @param {object} stats
 * @param {string[]} [missing] optional array to push missing paths onto
 * @returns {string}
 */
export function substitute(text, stats, missing) {
	if (typeof text !== 'string') return text;
	return text.replace(PLACEHOLDER_RE, (whole, dottedPath) => {
		const value = getPath(stats, dottedPath);
		if (value === undefined || value === null) {
			if (missing) missing.push(dottedPath);
			return `[stat missing: ${dottedPath}]`;
		}
		return String(value);
	});
}
