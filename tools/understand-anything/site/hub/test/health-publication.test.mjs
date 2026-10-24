// Health run records become the optional map asset map/data/health.json (ORISO-Docs#218): the latest record per scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {healthAsset} from '../publication.mjs';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord, runFile} from '../../../platform/lib/health-run.mjs';

const SHA = 'c'.repeat(40);
const crit = validateCriteriaSet([parseCriteriaFile('---\nscope: "*"\nmetrics:\n  size: {threshold: 400, weight: 1}\n---\nx', 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS});
const effective = resolveCriteria(crit, {capability: 'chat', path: 'ORISO-Frontend/'});
const record = (at, value) => buildRunRecord({
  manifest: createRunManifest({at, commits: {'ORISO-Frontend': SHA}}), scope: {capability: 'chat', repo: 'ORISO-Frontend', path: null},
  commit: SHA, effective, measurements: {size: {value, source: 'test', details: {}}}, model: null, startedAt: at,
});
function repoWith(...records) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'health-pub-'));
  for (const r of records) { const p = path.join(root, runFile(r)); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, JSON.stringify(r, null, 2) + '\n'); }
  return root;
}
const links = Buffer.from(JSON.stringify({optional: ['board.json']}));

test('the latest record per scope becomes map/data/health.json and is announced as optional data', () => {
  const root = repoWith(record('2026-09-01T08:00:00Z', 900), record('2026-10-24T10:15:00Z', 300));
  const r = healthAsset(root, links);
  const doc = JSON.parse(r.health);
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.records.length, 1);
  assert.equal(doc.records[0].startedAt, '2026-10-24T10:15:00Z');
  assert.equal(doc.records[0].metrics[0].value, 300);
  assert.deepEqual(JSON.parse(r.links).optional, ['board.json', 'health.json']);
  assert.ok(r.health.endsWith('\n'));
  assert.equal(healthAsset(root, Buffer.from(r.links)).links, r.links, 'announcing twice changes nothing');
});

test('no health folder yet: an empty but valid health.json (every square shows "no data")', () => {
  const r = healthAsset(fs.mkdtempSync(path.join(os.tmpdir(), 'health-empty-')), links);
  assert.deepEqual(JSON.parse(r.health), {schemaVersion: 1, records: []});
});

test('one invalid record stops the build; nothing half-published', () => {
  const root = repoWith(record('2026-10-24T10:15:00Z', 300));
  const file = path.join(root, runFile(record('2026-10-24T10:15:00Z', 300)));
  const bad = JSON.parse(fs.readFileSync(file, 'utf8')); bad.overall = 5;
  fs.writeFileSync(file, JSON.stringify(bad));
  assert.throws(() => healthAsset(root, links), /health runs invalid.*overall/s);
});

test('the allow-list, the producer inputs and the build ship health.json and its validator', () => {
  const src = fs.readFileSync(new URL('../publication.mjs', import.meta.url), 'utf8');
  assert.match(src, /data\\\/\([^)]*\|health\|ideas\|steering\)\\\.json/);
  assert.match(src, /platform\/lib\/health-run\.mjs/);
  assert.match(src, /platform\/health-run\.schema\.json/);
  assert.match(src, /healthAsset\(root/);
  assert.match(src, /--','health\/runs'/, 'committed run records are producer inputs');
});
