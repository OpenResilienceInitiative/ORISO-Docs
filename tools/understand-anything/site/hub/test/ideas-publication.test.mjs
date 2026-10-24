// Idea pages reach the published map as optional map/data/ideas.json (ORISO-Docs#223).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ideasAsset} from '../publication.mjs';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const hub = fileURLToPath(new URL('../', import.meta.url));
const links = Buffer.from(JSON.stringify({schemaVersion: 1, live: ['chat'], optional: ['board.json']}));

test('the real idea pages become ideas.json and are announced as optional data', () => {
  const r = ideasAsset(root, links);
  const doc = JSON.parse(r.ideas);
  assert.equal(doc.schemaVersion, 1);
  assert.ok(Array.isArray(doc.ideas));
  assert.deepEqual(JSON.parse(r.links).optional, ['board.json', 'ideas.json']);
  assert.deepEqual(JSON.parse(r.links).live, ['chat'], 'the rest of links.json is untouched');
  assert.ok(r.ideas.endsWith('\n'));
});

test('an invalid idea page fails publication', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ideas-pub-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  assert.throws(() => ideasAsset(dir, links));
});

test('the allow-list and the static inputs ship views.js and ideas.json (the Plan view needs both)', () => {
  const src = fs.readFileSync(hub + 'publication.mjs', 'utf8');
  assert.match(src, /map\\\/\(index\\\.html\|map\\\.css\|map\\\.js\|board-agg\\\.js\|jobs\\\.js\|plan-ui\\\.js\|views\\\.js\|data\\\/\([^)]*\|ideas\)/);
  assert.match(src, /'map\/views\.js'/);
  assert.match(src, /ideasAsset\(root/);
  assert.match(fs.readFileSync(hub + 'map/index.html', 'utf8'), /\/map\/views\.js/);
});
