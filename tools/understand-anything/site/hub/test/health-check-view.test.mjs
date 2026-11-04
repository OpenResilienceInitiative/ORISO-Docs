// Health panel, "Send health check" section (ORISO-Docs#220). views.js is a classic script; this runs it like the browser does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseArgs} from '../../../../planning-map/plan.mjs';

const sandbox = {}; sandbox.self = sandbox;
vm.runInNewContext(readFileSync(new URL('../map/views.js', import.meta.url), 'utf8'), sandbox);
const {MapViews} = sandbox;
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const cap = (over = {}) => ({capability: 'chat', repo: 'ORISO-Frontend', path: null, kind: 'capability', ...over});
const cmds = h => [...h.matchAll(/<code data-hcheck-cmd>([^<]*)<\/code>/g)].map(m => m[1]);

test('a capability gets the exact plan.mjs command for its repository, a dry run first', () => {
  const h = MapViews.healthCheck([cap()], 'en');
  assert.deepEqual(cmds(h), ['node tools/planning-map/plan.mjs health-check --capability chat --repo ORISO-Frontend']);
  assert.match(text(h), /Send health check/);
  assert.match(text(h), /dry run/i);
});

test('a folder adds --path, and the displayed command is parsed by the real CLI parser into the same scope', () => {
  const s = cap({path: 'src/components/chat', kind: 'folder'});
  const [c] = cmds(MapViews.healthCheck([s], 'en'));
  assert.equal(c, 'node tools/planning-map/plan.mjs health-check --capability chat --repo ORISO-Frontend --path src/components/chat');
  const o = parseArgs(c.replace('node tools/planning-map/plan.mjs ', '').split(' '));
  assert.deepEqual([o.command, o.capability, o.repo, o.path, o.apply], ['health-check', 'chat', 'ORISO-Frontend', 'src/components/chat', false]);
});

test('Copy buttons carry the command with and without --apply; the second one parses with apply true', () => {
  const h = MapViews.healthCheck([cap({path: 'src/x', kind: 'folder'})], 'en');
  const copies = [...h.matchAll(/data-copy="([^"]*)"/g)].map(m => m[1]);
  assert.equal(copies.length, 2);
  assert.equal(copies[0], cmds(h)[0]);
  assert.equal(copies[1], cmds(h)[0] + ' --apply');
  assert.equal(parseArgs(copies[1].replace('node tools/planning-map/plan.mjs ', '').split(' ')).apply, true);
  assert.match(text(h), /Copy command/); assert.match(text(h), /Copy with --apply/);
  assert.equal((h.match(/<button type="button"/g) || []).length, 2, 'real buttons');
});

test('several repositories give one command each', () => {
  const h = MapViews.healthCheck([cap(), cap({repo: 'ORISO-Admin'})], 'en');
  assert.deepEqual(cmds(h).map(c => c.split(' --repo ')[1]), ['ORISO-Frontend', 'ORISO-Admin']);
  assert.equal((h.match(/data-hcheck-scope=/g) || []).length, 2);
});

test('a file is checked as its folder, and the section says so; a file in the repository root is the whole capability in that repository', () => {
  const h = MapViews.healthCheck([cap({path: 'src/components/chat', kind: 'file', file: 'Chat.tsx'})], 'en');
  assert.match(text(h), /Chat\.tsx/); assert.match(text(h), /checked as its folder/);
  assert.match(cmds(h)[0], /--path src\/components\/chat$/);
  assert.doesNotMatch(cmds(MapViews.healthCheck([cap({path: null, kind: 'file', file: 'index.ts'})], 'en'))[0], /--path/);
});

test('German texts', () => {
  const t = text(MapViews.healthCheck([cap({path: 'src/x', kind: 'folder'})], 'de'));
  assert.match(t, /Gesundheitsprüfung senden/); assert.match(t, /Befehl kopieren/); assert.match(t, /Mit --apply kopieren/); assert.match(t, /Probelauf/);
});

test('a scope that is not a plain capability, repository and folder gets no command (nothing is built from untrusted text)', () => {
  for (const bad of [cap({path: '../etc'}), cap({path: '/abs'}), cap({path: 'a b'}), cap({path: 'x"; rm -rf /'}), cap({capability: 'Chat'}), cap({capability: 'chat --apply'}), cap({repo: 'a b'}), cap({repo: '$(x)'})]) {
    const h = MapViews.healthCheck([bad], 'en');
    assert.deepEqual(cmds(h), [], JSON.stringify(bad));
    assert.doesNotMatch(h, /data-copy/);
  }
  assert.equal(MapViews.healthCheck([], 'en'), '');
  assert.equal(MapViews.healthCheck(null, 'en'), '');
});

test('everything in the section is escaped', () => {
  const h = MapViews.healthCheck([cap({path: 'src/x', kind: 'file', file: '<img src=x onerror=1>.ts'})], 'en');
  assert.doesNotMatch(h, /<img/);
  assert.match(h, /&lt;img/);
});

test('MapViews.healthCheckCommand is the single source of the text', () => {
  assert.equal(MapViews.healthCheckCommand(cap(), true), 'node tools/planning-map/plan.mjs health-check --capability chat --repo ORISO-Frontend --apply');
  assert.equal(MapViews.healthCheckCommand(cap({capability: 'x y'})), null);
});
