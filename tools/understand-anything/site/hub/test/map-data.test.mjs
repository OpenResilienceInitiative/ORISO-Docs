import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildMapData, loadInputs, DATA_FILES} from '../map/build-map-data.mjs';

const inputs = loadInputs(new URL('./fixtures/map-inputs/', import.meta.url));

test('generator splits measurements into the named data files the page loads', () => {
  const files = buildMapData(inputs);
  assert.deepEqual(Object.keys(files).sort(), [...DATA_FILES].sort());
  assert.deepEqual(DATA_FILES, ['counts.json', 'descriptions.json', 'drill.json', 'epics.json', 'links.json', 'zoom.json']);
  for (const doc of Object.values(files)) assert.equal(doc.schemaVersion, 1);
});

test('totals are the sum over all capability blocks', () => {
  const {tot, agg, rel} = buildMapData(inputs)['counts.json'];
  assert.deepEqual(tot, {new_l: 1450, new_t: 29, old_l: 700, old_t: 7});
  assert.deepEqual(Object.keys(agg), ['base', 'chat', 'upload']);
  assert.deepEqual(rel, [['chat', 'upload', 12]]);
});

test('related issues exclude epics already shown and are mapped to their capability block', () => {
  const {reliss, epics, planned} = buildMapData(inputs)['epics.json'];
  assert.deepEqual(reliss, {upload: [['ORISO-Admin', 366, 'Virus scan for uploads']], branding: [['ORISO-Docs', 92, 'Design tokens']]});
  assert.equal(epics.epics.length, 1);
  assert.equal(planned.f, 104);
});

test('graph links carry the live feature pages; optional data files are listed only when produced', () => {
  const links = buildMapData(inputs)['links.json'];
  assert.deepEqual(links.live, ['chat', 'upload']);
  assert.deepEqual(links.optional, []);
  assert.deepEqual(buildMapData({...inputs, optional: ['board.json']})['links.json'].optional, ['board.json']);
});

test('generator output is deterministic and CLI writes one JSON file per data file', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'map-data-'));
  const cli = fileURLToPath(new URL('../map/build-map-data.mjs', import.meta.url));
  const args = [cli, '--inputs', fileURLToPath(new URL('./fixtures/map-inputs/', import.meta.url)), '--out', out];
  execFileSync('node', args);
  const first = DATA_FILES.map(f => readFileSync(path.join(out, f), 'utf8'));
  execFileSync('node', args);
  assert.deepEqual(DATA_FILES.map(f => readFileSync(path.join(out, f), 'utf8')), first);
  assert.deepEqual(readdirSync(out).sort(), [...DATA_FILES].sort());
});

test('missing input is a hard error, not an empty page', () => {
  assert.throws(() => buildMapData({...inputs, agg: undefined}), /agg/);
});
import {fileURLToPath} from 'node:url';

test('committed render fixtures are exactly what the generator produces from the fixture inputs', () => {
  const files = buildMapData(inputs);
  for (const name of DATA_FILES) {
    const committed = readFileSync(new URL('./fixtures/map-data/' + name, import.meta.url), 'utf8');
    assert.equal(committed, JSON.stringify(files[name]) + '\n', name);
  }
});
