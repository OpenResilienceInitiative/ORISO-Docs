// publication.mjs checks that the producer code it runs is the committed bytes of the selected Docs revision (producerInputs).
// A module that a producer imports but that is not listed there escapes that check (ORISO-Docs#213 review). This test walks the
// local import graph of the producer modules (and the JSON files they read next to themselves) and asserts every file is listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {producerInputs, staticInputs, hubSourcePrefix} from '../publication.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const rel = p => relative(ROOT, p).split('\\').join('/');
const STARTS = ['tools/understand-anything/site/hub/publication.mjs', 'tools/planning-map/lib/board.mjs', 'tools/planning-map/lib/steering.mjs',
  'tools/planning-map/lib/ideas.mjs', 'tools/planning-map/lib/milestones.mjs', 'tools/understand-anything/platform/lib/health-run.mjs',
  'tools/understand-anything/platform/lib/health-criteria.mjs'];

// Relative specifiers of static imports and re-exports, plus files read relative to the module
// (new URL('x', import.meta.url), resolve(here, 'x')), which is how the producers load their JSON.
function localDeps(file) {
  const src = readFileSync(file, 'utf8'), dir = dirname(file), out = new Set();
  for (const m of src.matchAll(/(?:^|[;\s])(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) out.add(resolve(dir, m[1]));
  for (const m of src.matchAll(/(?:^|[;\s])import\s*['"](\.{1,2}\/[^'"]+)['"]/g)) out.add(resolve(dir, m[1]));
  for (const m of src.matchAll(/new URL\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) out.add(resolve(dir, m[1]));
  for (const m of src.matchAll(/resolve\(\s*here\s*,\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) out.add(resolve(dir, m[1]));
  return [...out].filter(p => existsSync(p) && statSync(p).isFile());
}
function graph() {
  const seen = new Set(), todo = STARTS.map(p => resolve(ROOT, p));
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (/\.m?js$/.test(f)) todo.push(...localDeps(f));
  }
  return [...seen].map(rel).sort();
}

test('the walk finds the modules that were missing before (sanity of the walker)', () => {
  const g = graph();
  for (const f of ['tools/planning-map/lib/work.mjs', 'tools/planning-map/lib/refactor-marker.mjs', 'tools/planning-map/lib/watchers.mjs', 'tools/planning-map/watchers.config.json']) assert.ok(g.includes(f), f);
});

test('every local file the producer modules import or read is in producerInputs (or a static hub input, checked the same way)', () => {
  const listed = new Set([...producerInputs, ...staticInputs.map(p => hubSourcePrefix + p)]);
  assert.deepEqual(graph().filter(f => !listed.has(f)), []);
});

test('producerInputs names only files that exist', () => {
  assert.deepEqual(producerInputs.filter(f => !existsSync(resolve(ROOT, f))), []);
});
