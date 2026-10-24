// Page contract of the milestone / release panel (ORISO-Docs#209).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {milestonesAsset} from '../publication.mjs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const page = read('map/index.html'), js = read('map/map.js'), css = read('map/map.css');

test('the page has a left panel and a drawer button, both labelled in DE and EN', () => {
  assert.match(page, /<aside[^>]*id="relpanel"[^>]*aria-label=/);
  assert.match(page, /<button[^>]*id="relopen"[^>]*aria-controls="relpanel"[^>]*aria-expanded="false"/);
  assert.match(page, /id="relbody"/);
  assert.match(page, /lang="de">Releases/);
});

test('milestones.json is optional data, loaded only when announced', () => {
  assert.match(js, /OPTIONAL_DATA\s*=\s*\[\s*'board\.json'\s*,\s*'milestones\.json'\s*,\s*'criteria\.json'\s*,\s*'health\.json'\s*,\s*'ideas\.json'\s*\]/);
  assert.match(js, /MEAS\.milestones/);
  assert.match(js, /BoardAgg\.milestones\(/);
});

test('the panel adds no inline style and no script handler', () => {
  assert.ok(!/\sstyle\s*=/i.test(page));
  assert.ok(!/style="/.test(js));
});

test('mobile: below 1560px the panel is a drawer that opens with a class, not a style', () => {
  assert.match(css, /@media \(max-width:1560px\)/);
  assert.match(css, /\.relpanel\.open/);
  assert.match(js, /classList\.(add|toggle)\('open'/);
  assert.match(js, /Escape/);
});

test('the release filter highlights capability tiles by class', () => {
  assert.match(css, /\.tm\.relf \.blk:not\(\.relhit\)/);
  assert.match(js, /relhit/);
});

test('publication ships the reviewed config as map/data/milestones.json and announces it', () => {
  const links = Buffer.from(JSON.stringify({schemaVersion: 1, live: [], optional: ['board.json']}));
  const cfgPath = new URL('../../../../planning-map/milestones.json', import.meta.url).pathname;
  const r = milestonesAsset(cfgPath, links);
  assert.equal(JSON.parse(r.milestones).schemaVersion, 1);
  assert.deepEqual(JSON.parse(r.links).optional, ['board.json', 'milestones.json']);
  assert.throws(() => milestonesAsset(new URL('./fixtures/milestones-bad.json', import.meta.url).pathname, links));
});
