import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPath, substitute } from '../lib/placeholders.mjs';

test('getPath: resolves a dotted path', () => {
	assert.equal(getPath({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
});

test('getPath: missing path returns undefined, never throws', () => {
	assert.equal(getPath({ a: 1 }, 'a.b.c'), undefined);
	assert.equal(getPath(null, 'a.b'), undefined);
});

test('substitute: replaces a single {{stats.<path>}} placeholder', () => {
	const stats = { endpointsOwn: 179, endpointsConsumed: 144 };
	assert.equal(
		substitute('{{stats.endpointsOwn}} of {{stats.endpointsOwn}} own endpoints', stats),
		'179 of 179 own endpoints'
	);
});

test('substitute: resolves a nested dotted path', () => {
	const stats = { services: { 'ORISO-UserService': { endpointsOwn: 179 } } };
	assert.equal(
		substitute('own: {{stats.services.ORISO-UserService.endpointsOwn}}', stats),
		'own: 179'
	);
});

test('substitute: missing path leaves a visible marker, never silently blanks', () => {
	const stats = { endpointsOwn: 179 };
	assert.equal(
		substitute('gap: {{stats.doesNotExist}}', stats),
		'gap: [stat missing: doesNotExist]'
	);
});

test('substitute: missing path is recorded in the optional `missing` array', () => {
	const stats = {};
	const missing = [];
	substitute('{{stats.a.b}} and {{stats.c}}', stats, missing);
	assert.deepEqual(missing, ['a.b', 'c']);
});

test('substitute: non-string input is returned unchanged', () => {
	assert.equal(substitute(42, {}), 42);
	assert.equal(substitute(undefined, {}), undefined);
});

test('substitute: text with no placeholders is unchanged', () => {
	assert.equal(substitute('plain prose, no braces here', { x: 1 }), 'plain prose, no braces here');
});

test('substitute: a stat value of 0 is printed as "0", not treated as missing', () => {
	assert.equal(substitute('{{stats.specDrift}}', { specDrift: 0 }), '0');
});
