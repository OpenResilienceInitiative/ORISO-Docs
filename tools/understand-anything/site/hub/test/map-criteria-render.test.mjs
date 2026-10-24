// Health view in the rendered map: the criteria box (ORISO-Docs#217). Strict CSP, same harness as map-views-render.test.mjs.
// criteria.json is built from the real seed files at test time, so the test follows what the repository publishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {loadCriteria, buildCriteriaDoc} from '../../../platform/lib/health-criteria.mjs';
import {loadRules, CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
const CRITERIA = JSON.stringify(buildCriteriaDoc(loadCriteria(undefined, {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS}), loadRules()));
const MAIL = 'capability:email-templates', CHAT = 'capability:chat';

function serve({withCriteria = true} = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    if (url === '/map/data/criteria.json' && withCriteria) { res.setHeader('content-type', types['.json']); return res.end(CRITERIA); }
    if (url === '/map/data/links.json') {
      const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));
      if (withCriteria) links.optional = [...links.optional, 'criteria.json'];
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
  bare = await serve({withCriteria: false}); bareOrigin = 'http://127.0.0.1:' + bare.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); bare?.close(); });

const box = page => page.locator('.crit:visible').first();
// Up to 980 px the area detail lives in a bottom sheet that the Details button opens.
async function showBox(page, width) {
  if (width <= 980) await page.locator('#zbar [data-zdet]').click();
  await box(page).waitFor();
}

test('Health, a frontend area: the box lists CRAP with its threshold and the file it comes from, plus an Edit link', {skip}, async () => {
  const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(CHAT), {lang: 'en'});
  await box(page).waitFor();
  const crap = page.locator('.crit .crit-in .crit-m li', {hasText: 'crap'});
  assert.equal(await crap.count(), 1);
  const t = await crap.innerText();
  assert.match(t, /≤ 30/); assert.match(t, /frontend\.md/);
  const edit = page.locator('.crit [data-crit-edit="frontend"]');
  assert.equal(await edit.getAttribute('href'), 'https://github.com/OpenResilienceInitiative/ORISO-Docs/edit/dev/tools/understand-anything/platform/capabilities/health/frontend.md');
  assert.equal(await edit.innerText(), 'Edit');
  assert.equal(await edit.getAttribute('target'), '_blank');
  assert.match(await edit.getAttribute('rel'), /noopener/);
  assert.match(await page.locator('.crit-m').first().innerText(), /default\.md/, 'inherited keys name the default file');
  assert.deepEqual(problems, []);
  await context.close();
});

test('Health, the e-mail area: render, links and languages from email.md, the rest from default.md, DE labels', {skip}, async () => {
  const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(MAIL), {lang: 'de'});
  await box(page).waitFor();
  const body = await page.locator('.crit').first().innerText();
  for (const n of ['email-render', 'email-links', 'email-languages']) assert.match(body, new RegExp(n));
  assert.match(body, /E-Mail-Darstellung/); assert.match(body, /Gewicht/); assert.match(body, /Prüfanweisung/i);
  assert.match(body, /email\.md/); assert.match(body, /default\.md/);
  assert.doesNotMatch(await page.locator('.crit-m').first().innerText(), /crap/);
  assert.equal(await page.locator('.crit [data-crit-edit]').first().innerText(), 'Bearbeiten');
  assert.match(await page.locator('.crit-instr').innerText(), /recipient receives/, 'reviewer instruction is shown as text');
  assert.deepEqual(problems, []);
  await context.close();
});

test('the box shows in Health only; the squares stay neutral', {skip}, async () => {
  const {page, context} = await open('#view=health', {lang: 'en'});
  await page.waitForSelector('#tm .blk', {state: 'attached'});
  const fills = await page.evaluate(() => [...document.querySelectorAll('#tm .blk')].map(b => b.style.getPropertyValue('--view-fill')));
  assert.ok(fills.length >= 20 && fills.every(f => f === 'var(--neutral)'));
  await page.locator('#tm .blk[data-id]').first().click();
  await box(page).waitFor();
  await page.click('#viewSwitch [data-mview="state"]');
  assert.equal(await page.locator('.crit').count(), 0);
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.equal(await page.locator('.crit').count(), 0);
  await page.click('#viewSwitch [data-mview="health"]');
  await box(page).waitFor();
  await context.close();
});

test('without a published criteria.json the panel says so and nothing breaks', {skip}, async () => {
  const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(MAIL), {lang: 'en', base: bareOrigin});
  await page.waitForSelector('#panel #pdTitle');
  assert.equal(await page.locator('.crit').count(), 0);
  assert.match(await page.locator('#panel').innerText(), /No criteria published/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the box fits 320, 390 and 1440 px, light and dark, DE and EN, without overflow or inline styles', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [390, 'de', 'dark'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(CHAT), {width, lang, scheme});
    await showBox(page, width);
    const o = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.crit')].find(e => e.offsetParent !== null), host = c.parentElement;
      return {page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        box: c.scrollWidth - c.clientWidth, host: host.scrollWidth - host.clientWidth, inline: c.querySelectorAll('[style]').length,
        bg: getComputedStyle(c).backgroundColor, ink: getComputedStyle(c).color};
    });
    assert.ok(o.page <= 0 && o.box <= 0 && o.host <= 0, `${width}px: ${JSON.stringify(o)}`);
    assert.equal(o.inline, 0);
    assert.notEqual(o.bg, o.ink, 'text differs from its background');
    assert.deepEqual(problems, []);
    await context.close();
  }
});
