// Renders the map page in a real browser from fixture JSON (test/fixtures/map-data).
// Needs Playwright: set UA_PLAYWRIGHT to its index.mjs (CI installs it in ua-tooling.yml);
// without it the suite is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const CANDIDATES = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean);
const playwrightPath = CANDIDATES.find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
// Strictest policy the page must live under: no inline code or styles.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";

function serve() {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const file = url.startsWith('/map/data/') ? fixtures + url.slice('/map/data/'.length)
      : url === '/map/' ? hub + 'map/index.html' : hub + url.slice(1);
    if (!file.startsWith(hub) && !file.startsWith(fixtures) || !existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain');
    res.setHeader('content-security-policy', CSP);
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
let browser, server, origin;
async function open({width = 1440, scheme = 'light', lang = 'de'} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('requestfailed', r => problems.push('request failed ' + r.url()));
  await page.goto(origin + '/map/');
  await page.waitForSelector('#tm .blk');
  return {page, context, problems};
}

test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve();
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

test('map renders the three groups from fixture JSON without console errors', {skip}, async () => {
  const {page, problems, context} = await open();
  assert.equal(await page.locator('#tm .aud').count(), 3);
  assert.ok(await page.locator('#tm .blk').count() >= 20);
  assert.deepEqual(problems, []);
  await context.close();
});

test('clicking a capability zooms into it and Escape zooms out', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  const before = await page.locator('#tm .blk').count();
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.waitForFunction(() => document.querySelector('#zbar [aria-current]'));
  assert.match(await page.locator('#zbar [aria-current]').innerText(), /Chat and conversation list/);
  assert.match(await page.locator('#panel').innerText(), /Chat and conversation list/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#zbar [aria-current]') || document.querySelectorAll('#tm .blk').length > 0);
  assert.equal(await page.locator('#tm .blk').count(), before);
  await context.close();
});

test('DE/EN switch relabels the page and the map', {skip}, async () => {
  const {page, context} = await open({lang: 'de'});
  assert.equal(await page.locator('html').getAttribute('data-lang'), 'de');
  assert.equal(await page.locator('h1:visible').innerText(), 'Was man mit ORISO heute tun kann – was vorher da war und was als Nächstes kommt');
  const deLabel = await page.locator('#tm .blk[data-id="chat"]').getAttribute('title');
  await page.click('.langswitch button[data-lang="en"]');
  assert.equal(await page.locator('html').getAttribute('data-lang'), 'en');
  assert.equal(await page.locator('h1:visible').innerText(), 'What people can do with ORISO today – what was already there and what comes next');
  assert.notEqual(await page.locator('#tm .blk[data-id="chat"]').getAttribute('title'), deLabel);
  assert.equal(await page.title(), 'ORISO Capability map — ORISO Understand');
  await context.close();
});

for (const width of [320, 390, 1440]) {
  for (const scheme of ['light', 'dark']) {
    test(`no horizontal overflow at ${width}px (${scheme})`, {skip}, async () => {
      for (const lang of ['de', 'en']) {
        const {page, problems, context} = await open({width, scheme, lang});
        const metrics = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}));
        assert.ok(metrics.scroll <= metrics.client, `${lang}: page scrolls horizontally ${metrics.scroll} > ${metrics.client}`);
        await page.locator('#tm .blk[data-id="chat"]').click();
        await page.waitForTimeout(150);
        const after = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth}));
        assert.ok(after.scroll <= after.client, `${lang}: zoomed view scrolls horizontally ${after.scroll} > ${after.client}`);
        assert.deepEqual(problems, []);
        await context.close();
      }
    });
  }
}
