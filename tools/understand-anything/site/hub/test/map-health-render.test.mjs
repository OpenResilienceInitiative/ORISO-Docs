// Health view in the rendered map: colours, badge, run panel, "no data" (ORISO-Docs#218). Strict CSP, same harness as map-criteria-render.test.mjs.
// health.json is built from real run records (the same builder the CLI uses), so the page is tested against what the repository publishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord, buildHealthDoc} from '../../../platform/lib/health-run.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';

const SHA = 'e'.repeat(40);
const crit = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
---
x`, 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS});
const effective = resolveCriteria(crit, {capability: 'chat', path: 'ORISO-Frontend/'});
const rec = (capability, at, m, extra = {}) => buildRunRecord({
  manifest: createRunManifest({at, commits: {'ORISO-Frontend': SHA}}), scope: {capability, repo: 'ORISO-Frontend', path: extra.path ?? null}, commit: SHA,
  effective, measurements: m, model: extra.model ?? null, startedAt: at, verdict: extra.verdict ?? [],
});
const FAIR = {
  size: {value: 300, source: 'health-run size: 12 files', details: {}}, 'test-ratio': {value: 0.25, source: 'health-run test-ratio', details: {}},
  lint: {value: null, source: 'eslint', details: {reason: 'no linter configuration (eslint) in the checkout'}}, duplication: {value: 2.5, source: 'health-run duplication', details: {}},
};
const BAD = {size: {value: 1200, source: 'health-run size', details: {}}, 'test-ratio': {value: 0.1, source: 'health-run test-ratio', details: {}}, lint: {value: 40, source: 'eslint', details: {}}, duplication: {value: 20, source: 'health-run duplication', details: {}}};
const CHAT = rec('chat', '2026-10-24T10:15:00Z', FAIR, {model: 'claude-test', verdict: [{criterion: 'maintainability', score: 40, weight: 1, reasons: ['Two 600 line files mix rendering and state.']}]});
const OLD_CHAT = rec('chat', '2026-09-01T08:00:00Z', BAD);
const HANDOVER = rec('case-handover', '2026-10-20T08:00:00Z', BAD);
const RECORDS = [OLD_CHAT, CHAT, HANDOVER];
const HEALTH = JSON.stringify(buildHealthDoc(RECORDS));

function serve({withHealth = true} = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    if (url === '/map/data/health.json' && withHealth) { res.setHeader('content-type', types['.json']); return res.end(HEALTH); }
    if (url === '/map/data/links.json') {
      const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));
      if (withHealth) links.optional = [...links.optional, 'health.json'];
      res.setHeader('content-type', types['.json']); return res.end(JSON.stringify(links));
    }
    const file = url.startsWith('/map/data/') ? fixtures + url.slice('/map/data/'.length) : url === '/map/' ? hub + 'map/index.html' : hub + url.slice(1);
    if (!file.startsWith(hub) && !file.startsWith(fixtures) || !existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain');
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, origin, bare, bareOrigin;
async function open(hash, {width = 1440, lang = 'de', scheme = 'light', base = origin} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) problems.push(m.text()); });
  await page.goto(base + '/map/' + hash);
  await page.waitForSelector('#viewSwitch button', {state: 'attached'});
  if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
  return {page, context, problems};
}
test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve(); origin = 'http://127.0.0.1:' + server.address().port;
  bare = await serve({withHealth: false}); bareOrigin = 'http://127.0.0.1:' + bare.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); bare?.close(); });

const node = cap => '#view=health&node=' + encodeURIComponent('capability:' + cap);
const run = page => page.locator('.hrun:visible').first();
async function showRun(page, width) {
  if (width <= 980) await page.locator('#zbar [data-zdet]').click();
  await run(page).waitFor();
}
const squares = page => page.evaluate(() => [...document.querySelectorAll('#tm .blk[data-id]')].map(b => ({
  id: b.dataset.id, fill: b.style.getPropertyValue('--view-fill'), band: b.dataset.hband ?? null, score: b.dataset.hs ?? null,
  badge: getComputedStyle(b, '::after').content, bg: getComputedStyle(b).backgroundColor,
})));

test('squares with a record are coloured by the overall score and carry the number; all others stay neutral grey', {skip}, async () => {
  const {page, context, problems} = await open('#view=health', {lang: 'en'});
  await page.waitForSelector('#tm .blk[data-id]', {state: 'attached'});
  const sq = await squares(page), by = Object.fromEntries(sq.map(s => [s.id, s]));
  assert.equal(by.chat.fill, 'var(--ua-health-' + (CHAT.overall >= 80 ? 'good' : CHAT.overall >= 60 ? 'fair' : CHAT.overall >= 40 ? 'weak' : 'poor') + ')');
  assert.equal(by.chat.score, String(CHAT.overall)); assert.equal(by.chat.badge, '"' + CHAT.overall + '"');
  assert.equal(by.handover.fill, 'var(--ua-health-poor)'); assert.equal(by.handover.score, String(HANDOVER.overall));
  const rest = sq.filter(s => s.id !== 'chat' && s.id !== 'handover');
  assert.ok(rest.length >= 18);
  assert.ok(rest.every(s => s.fill === 'var(--neutral)' && s.score === null && s.band === null), 'no record: grey, no number');
  assert.notEqual(by.chat.bg, rest[0].bg, 'a coloured square differs from the grey one');
  assert.match(await page.locator('#stagefoot').innerText(), /Grey: no data/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the badge shows the number of the NEWEST record of the capability, not an older one', {skip}, async () => {
  const {page, context} = await open('#view=health', {lang: 'en'});
  await page.waitForSelector('#tm .blk[data-id]', {state: 'attached'});
  const chat = (await squares(page)).find(s => s.id === 'chat');
  assert.equal(chat.score, String(CHAT.overall)); assert.notEqual(chat.score, String(OLD_CHAT.overall));
  await context.close();
});

// every [data-from] element equals its record field; no digit outside them
async function traceInPage(page, record) {
  return page.evaluate(rec => {
    const box = [...document.querySelectorAll('.hrun')].find(e => e.offsetParent !== null);
    const at = (o, p) => p.split(/[.\[\]]+/).filter(Boolean).reduce((x, k) => (x == null ? undefined : x[k]), o);
    const out = {checked: 0, wrong: [], digitsOutside: null};
    const main = box.querySelector('.hrun > dl') && box;
    for (const el of box.querySelectorAll('[data-from]')) {
      if (el.closest('[data-rec-start]')) continue; // other runs: traced in the unit test
      const v = at(rec, el.dataset.from); out.checked++;
      const t = el.textContent;
      const lang = document.documentElement.lang;
      const shown = typeof v === 'number' ? (lang === 'de' ? String(v).replace('.', ',') : String(v))
        : el.dataset.from === 'startedAt' ? v.slice(0, 10) + ' ' + v.slice(11, 16) + ' UTC'
        : el.dataset.from === 'commit' ? v.slice(0, 7) : el.dataset.from === 'criteriaVersion' ? v.slice(0, 12) : v;
      if (v === undefined || (v !== null && t !== shown)) out.wrong.push([el.dataset.from, t, shown]);
    }
    const clone = box.cloneNode(true);
    clone.querySelectorAll('[data-from], [data-rec-start]').forEach(e => e.remove());
    const m = clone.textContent.match(/.{0,25}\d.{0,25}/);
    out.digitsOutside = m ? m[0] : null;
    void main;
    return out;
  }, record);
}

test('No invented data in the browser: the run panel of a square shows only record fields, in DE and EN', {skip}, async () => {
  for (const lang of ['de', 'en']) {
    const {page, context, problems} = await open(node('chat'), {lang});
    await showRun(page, 1440);
    const t = await traceInPage(page, CHAT);
    assert.ok(t.checked >= 20, 'many values traced: ' + t.checked);
    assert.deepEqual(t.wrong, []); assert.equal(t.digitsOutside, null);
    const body = await run(page).innerText();
    assert.match(body, lang === 'de' ? /Letzter Prüflauf/ : /Latest health run/);
    assert.match(body, /2026-10-24 10:15 UTC/); assert.match(body, /claude-test/); assert.match(body, new RegExp('eeeeeee'));
    assert.match(body, lang === 'de' ? /Wert 0,25/ : /Value 0\.25/);
    assert.match(body, /no linter configuration \(eslint\) in the checkout/);
    assert.match(body, /Two 600 line files mix rendering and state\./);
    const src = page.locator('.hrun [data-health-source]');
    assert.equal(await src.getAttribute('href'), `https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${SHA}`);
    assert.match(await src.getAttribute('rel'), /noopener/);
    assert.equal(await page.locator('.hrun [style]').count(), 0);
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('a square without a record says "no data" in the panel and has no number; the criteria box still follows', {skip}, async () => {
  const {page, context, problems} = await open(node('notifications'), {lang: 'en'});
  await page.waitForSelector('#panel #pdTitle');
  assert.equal(await page.locator('.hrun').count(), 0);
  assert.match(await page.locator('#panel').innerText(), /No health run for this capability: no data/);
  assert.doesNotMatch(await page.locator('.hno').innerText(), /\d/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('without a published health.json every square is grey and the legend says so; nothing breaks', {skip}, async () => {
  const {page, context, problems} = await open('#view=health', {lang: 'de', base: bareOrigin});
  await page.waitForSelector('#tm .blk[data-id]', {state: 'attached'});
  const sq = await squares(page);
  assert.ok(sq.length >= 20 && sq.every(s => s.fill === 'var(--neutral)' && s.score === null));
  assert.match(await page.locator('#stagefoot').innerText(), /Noch kein Prüflauf veröffentlicht/);
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.waitForSelector('#panel #pdTitle');
  assert.match(await page.locator('#panel').innerText(), /Kein Prüflauf für diese Fähigkeit: keine Daten/);
  assert.deepEqual(problems, []);
  await context.close();
});

const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('the panel and the squares fit 320, 390 and 1440 px, light and dark, DE and EN: no overflow, no inline style, readable text', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [390, 'de', 'dark'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open(node('chat'), {width, lang, scheme});
    await showRun(page, width);
    const o = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.hrun')].find(e => e.offsetParent !== null), host = c.parentElement, chip = c.querySelector('.hband');
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth, box: c.scrollWidth - c.clientWidth, host: host.scrollWidth - host.clientWidth,
        inline: c.querySelectorAll('[style]').length, chipBg: getComputedStyle(chip).backgroundColor, chipInk: getComputedStyle(chip).color,
        boxBg: getComputedStyle(c).backgroundColor, boxInk: getComputedStyle(c).color,
      };
    });
    assert.ok(o.page <= 0 && o.box <= 0 && o.host <= 0, `${width}px ${lang} ${scheme}: ${JSON.stringify(o)}`);
    assert.equal(o.inline, 0);
    assert.ok(contrast(o.chipInk, o.chipBg) >= 4.5, `score chip ${scheme}: ${contrast(o.chipInk, o.chipBg).toFixed(2)}`);
    assert.ok(contrast(o.boxInk, o.boxBg) >= 4.5, `panel text ${scheme}`);
    assert.deepEqual(problems, []);
    await context.close();
  }
  // squares on the overview: the number is readable on its badge in light and dark
  for (const scheme of ['light', 'dark']) {
    const {page, context} = await open('#view=health', {width: 390, lang: 'en', scheme});
    await page.waitForSelector('#tm .blk[data-hs]', {state: 'attached'});
    const c = await page.evaluate(() => { const b = document.querySelector('#tm .blk[data-hs]'), s = getComputedStyle(b, '::after'); return {ink: s.color, bg: s.backgroundColor, over: document.documentElement.scrollWidth - document.documentElement.clientWidth}; });
    assert.ok(contrast(c.ink, c.bg) >= 4.5, `badge ${scheme}`); assert.ok(c.over <= 0);
    await context.close();
  }
});
