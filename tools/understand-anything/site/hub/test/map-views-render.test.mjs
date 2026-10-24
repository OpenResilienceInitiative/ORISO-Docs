// View switch State | Health | Plan in the rendered map (ORISO-Docs#214). Same harness as map-deeplink.test.mjs.
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
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';

const CAP = 'capability:case-handover';
const FILE = 'ORISO-UserService::file:src/main/java/x/A.java';

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

let browser, server, origin;
async function open(hash = '', {width = 1440, lang = 'de', scheme = 'light'} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  await page.goto(origin + '/map/' + hash);
  await page.waitForSelector('#tm .blk', {state: 'attached'});
  if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
  return {page, context, problems};
}
const pressed = page => page.locator('#viewSwitch [aria-pressed="true"]').getAttribute('data-mview');
const title = page => page.locator('#panel #pdTitle').innerText();
const hashOf = page => page.evaluate(() => location.hash);
async function waitTitle(page, text) { await page.waitForFunction(t => document.querySelector('#panel #pdTitle')?.textContent === t, text); }

test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve();
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

test('the switch offers State | Health | Plan, State is on by default, labels follow the language', {skip}, async () => {
  const {page, context, problems} = await open('');
  assert.deepEqual(await page.locator('#viewSwitch button').allInnerTexts(), ['Zustand', 'Gesundheit', 'Plan']);
  assert.equal(await pressed(page), 'state');
  assert.equal(await page.locator('#tm.vview').count(), 0, 'State is today\'s map');
  await page.click('.langswitch button[data-lang="en"]');
  assert.deepEqual(await page.locator('#viewSwitch button').allInnerTexts(), ['State', 'Health', 'Plan']);
  assert.deepEqual(problems, []);
  await context.close();
});

test('Health and Plan show neutral squares and a one-line note (Plan without ideas says so)', {skip}, async () => {
  for (const [view, lang, note] of [['health', 'en', /Health is coming/], ['plan', 'de', /Noch keine Ideen/]]) {
    const {page, context, problems} = await open('#view=' + view, {lang});
    assert.equal(await pressed(page), view);
    assert.equal(await page.locator('#tm.vview').count(), 1);
    assert.match(await page.locator('#stagefoot').innerText(), note);
    const fills = await page.evaluate(() => [...document.querySelectorAll('#tm .blk')].map(b => b.style.getPropertyValue('--view-fill')));
    assert.ok(fills.length >= 20 && fills.every(f => f === 'var(--neutral)'), 'every square carries the neutral fill');
    assert.equal(await page.locator('#layerTogs').isVisible(), false, 'State layer toggles are hidden');
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('zoom and selection are kept when the view changes, and the hash follows', {skip}, async () => {
  const {page, context} = await open('#view=health', {lang: 'en'});
  await page.locator('#tm .blk[data-id]').first().click();
  await page.waitForSelector('#panel #pdTitle');
  const first = await title(page);
  assert.match(await hashOf(page), /^#view=health&node=capability%3A/);
  await page.click('#viewSwitch [data-mview="state"]');
  assert.equal(await title(page), first, 'same capability stays open in State');
  assert.match(await hashOf(page), /^#node=capability%3A/, 'State keeps the #199 link form');
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.equal(await title(page), first);
  assert.match(await hashOf(page), /^#view=plan&node=capability%3A/);
  assert.match(await page.locator('#stagefoot').innerText(), /No ideas yet/);
  await context.close();
});

test('zoom path to a file survives all three views; zooming out updates the hash', {skip}, async () => {
  const {page, context} = await open('#view=plan&node=' + encodeURIComponent(FILE), {lang: 'en'});
  await waitTitle(page, 'A.java');
  for (const v of ['health', 'state', 'plan']) {
    await page.click('#viewSwitch [data-mview="' + v + '"]');
    assert.equal(await title(page), 'A.java');
    assert.equal(await page.locator('#tm .blk.on').count(), 1, 'the file square stays selected');
    assert.equal(decodeURIComponent((await hashOf(page)).match(/node=(.+)$/)[1]), FILE);
  }
  await page.locator('#zbar [data-zout]').click();
  assert.equal(decodeURIComponent((await hashOf(page)).match(/node=(.+)$/)[1]), CAP, 'one level up is the capability');
  await page.locator('#zbar [data-zout]').click();
  assert.equal(await hashOf(page), '#view=plan', 'overview: no node left');
  await context.close();
});

test('reload restores view and zoom from the hash', {skip}, async () => {
  const {page, context} = await open('#view=health&node=' + encodeURIComponent(CAP), {lang: 'en'});
  await waitTitle(page, 'Case handover');
  await page.reload();
  await page.waitForSelector('#tm .blk', {state: 'attached'});
  await waitTitle(page, 'Case handover');
  assert.equal(await pressed(page), 'health');
  await context.close();
});

test('#node= deep links from #199 still open the State view', {skip}, async () => {
  const {page, context, problems} = await open('#node=' + encodeURIComponent(FILE), {lang: 'en'});
  await waitTitle(page, 'A.java');
  assert.equal(await pressed(page), 'state');
  await page.evaluate(id => { location.hash = '#view=health&node=' + encodeURIComponent(id); }, CAP);
  await waitTitle(page, 'Case handover');
  assert.equal(await pressed(page), 'health');
  await page.evaluate(id => { location.hash = '#node=' + encodeURIComponent(id); }, FILE);
  await waitTitle(page, 'A.java');
  assert.equal(await pressed(page), 'state', 'a link without view is State');
  assert.deepEqual(problems, []);
  await context.close();
});

test('browser back returns to the previous view', {skip}, async () => {
  const {page, context} = await open('#node=' + encodeURIComponent(CAP), {lang: 'en'});
  await waitTitle(page, 'Case handover');
  await page.click('#viewSwitch [data-mview="health"]');
  assert.equal(await pressed(page), 'health');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#viewSwitch [aria-pressed="true"]')?.dataset.mview === 'state');
  assert.equal(await title(page), 'Case handover');
  await context.close();
});

test('an unknown node keeps the notice, the view and the link', {skip}, async () => {
  const {page, context} = await open('#view=health&node=capability%3Anope', {lang: 'en'});
  assert.equal(await page.locator('.map-notfound').count(), 1);
  assert.equal(await pressed(page), 'health');
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.equal(await hashOf(page), '#view=plan&node=capability%3Anope');
  await context.close();
});

test('no horizontal overflow at 320, 390 and 1440 px in any view, light and dark, DE and EN', {skip}, async () => {
  for (const width of [320, 390, 1440]) for (const view of ['state', 'health', 'plan']) {
    const lang = width === 320 ? 'en' : 'de', scheme = width === 390 ? 'dark' : 'light';
    const {page, context, problems} = await open('#view=' + view + '&node=' + encodeURIComponent(CAP), {width, lang, scheme});
    const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      sw2: document.querySelector('.controls').scrollWidth, cw2: document.querySelector('.controls').clientWidth}));
    assert.ok(o.sw <= o.cw, `${view}@${width}: page ${o.sw} > ${o.cw}`);
    assert.ok(o.sw2 <= o.cw2, `${view}@${width}: controls overflow`);
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('the switch is a labelled group of buttons with a visible focus order', {skip}, async () => {
  const {page, context} = await open('', {lang: 'en'});
  assert.equal(await page.locator('#viewSwitch').getAttribute('role'), 'group');
  assert.ok(await page.locator('#viewSwitch').getAttribute('aria-label'));
  assert.equal(await page.locator('#viewSwitch button').count(), 3);
  await context.close();
});
