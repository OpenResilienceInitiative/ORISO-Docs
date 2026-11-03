import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {DATA_FILES} from '../map/build-map-data.mjs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const page = read('map/index.html');

test('map page is CSP-clean: no inline script, style, handler or style attribute', () => {
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(page), 'inline script');
  assert.ok(!/<style[\s>]/i.test(page), 'style element');
  assert.ok(!/\son[a-z]+\s*=/i.test(page), 'inline event handler');
  assert.ok(!/\sstyle\s*=/i.test(page), 'style attribute');
  assert.ok(!/javascript:/i.test(page));
  const js = read('map/map.js');
  assert.ok(!/style="/.test(js), 'map.js must not emit style attributes');
  assert.ok(!/\beval\(|new Function\(/.test(js));
});

test('map page loads hub language handling, own assets and only same-origin scripts', () => {
  assert.match(page, /<script src="\/assets\/lang\.js"><\/script>/);
  assert.match(page, /<script src="\/map\/map\.js" defer><\/script>/);
  assert.match(page, /<link rel="stylesheet" href="\/map\/map\.css">/);
  for (const src of page.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) assert.ok(src[1].startsWith('/'), src[1]);
  assert.match(page, /<html lang="de" data-lang="de" data-title-de="[^"]+" data-title-en="[^"]+">/);
  assert.match(page, /<button type="button" data-lang="de" aria-pressed="true">DE<\/button>/);
  assert.match(page, /<button type="button" data-lang="en" aria-pressed="false">EN<\/button>/);
  assert.match(page, /name="viewport"/);
});

test('hub home links to the map in both languages', () => {
  const home = read('index.html');
  assert.match(home, /<a [^>]*href="\/map\/"[^>]*>[\s\S]*?Fähigkeiten-Karte[\s\S]*?Capability map/);
});

test('page loads exactly the generated data files, and they are shipped next to it', () => {
  const js = read('map/map.js');
  for (const file of DATA_FILES) assert.ok(js.includes("'" + file + "'"), file);
  assert.match(js, /OPTIONAL_DATA\s*=\s*\[\s*'board\.json'\s*,\s*'milestones\.json'\s*,\s*'criteria\.json'\s*,\s*'ideas\.json'\s*,\s*'health\.json'\s*,\s*'steering\.json'\s*\]/);
  for (const file of DATA_FILES) assert.ok(existsSync(new URL('../map/data/' + file, import.meta.url)), file);
});

test('committed data files are the generator schema', () => {
  for (const file of DATA_FILES) assert.equal(JSON.parse(read('map/data/' + file)).schemaVersion, 1, file);
});

test('footer shows the board sync time and a sync link, without a token', () => {
  const js = read('map/map.js');
  assert.match(js, /MEAS\.syncedAt/);
  assert.match(js, /Stand '/);
  assert.match(js, /Jetzt synchronisieren/);
  assert.match(js, /actions\/workflows\/planning-board-sync\.yml/);
  assert.doesNotMatch(js, /ghp_|github_pat_|Authorization/i);
});
