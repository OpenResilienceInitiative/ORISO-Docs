// Deep links between the capability map and the Understand viewer (ORISO-Docs#199).
// Same browser harness as map-render.test.mjs (Playwright, strict CSP, fixture JSON).
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
const FOLDER = 'ORISO-UserService::folder:src/main/java/x';
const FILE = 'ORISO-UserService::file:src/main/java/x/A.java';
const TESTFILE = 'ORISO-UserService::file:src/test/java/x/ATest.java';

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
async function open(hash = '', {width = 1440, lang = 'de'} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  await page.goto(origin + '/map/' + hash);
  await page.waitForSelector('#tm .blk', {state: 'attached'});
  if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
  return {page, context, problems};
}
const panelText = page => page.locator('#panel').innerText();

test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve();
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

test('#node=capability:<slug> zooms to that capability', {skip}, async () => {
  const {page, context, problems} = await open('#node=' + encodeURIComponent(CAP), {lang: 'en'});
  await page.waitForSelector('#panel #pdTitle');
  assert.equal(await page.locator('#panel #pdTitle').innerText(), 'Case handover');
  assert.match(await page.locator('#zbar [aria-current]').innerText(), /Case handover/);
  assert.equal(await page.locator('.map-notfound').count(), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

test('#node=<repo>::folder:<dir> zooms to that folder', {skip}, async () => {
  const {page, context} = await open('#node=' + encodeURIComponent(FOLDER), {lang: 'en'});
  await page.waitForSelector('#panel #pdTitle');
  assert.equal(await page.locator('#panel #pdTitle').innerText(), 'UserService · api/service');
  await context.close();
});

test('#node=<repo>::file:<path> zooms to that file, tests included', {skip}, async () => {
  for (const [id, name] of [[FILE, 'A.java'], [TESTFILE, 'ATest.java']]) {
    const {page, context} = await open('#node=' + encodeURIComponent(id));
    await page.waitForSelector('#panel #pdTitle');
    assert.equal(await page.locator('#panel #pdTitle').innerText(), name);
    assert.equal(await page.locator('#tm .blk.on').count(), 1, 'the file tile is selected');
    await context.close();
  }
});

test('an unknown id shows a clear not-found state and leaves the overview intact', {skip}, async () => {
  for (const [lang, text] of [['de', /nicht gefunden/], ['en', /not found/]]) {
    const {page, context, problems} = await open('#node=' + encodeURIComponent('ORISO-UserService::file:nope.java'), {lang});
    const note = page.locator('.map-notfound');
    assert.equal(await note.count(), 1);
    assert.equal(await note.getAttribute('role'), 'status');
    assert.match(await note.innerText(), text);
    assert.match(await note.innerText(), /nope\.java/);
    assert.ok(await page.locator('#tm .blk').count() >= 20);
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('changing the hash on the open page moves the map; a later valid id clears the notice', {skip}, async () => {
  const {page, context} = await open('#node=capability%3Anope', {lang: 'en'});
  assert.equal(await page.locator('.map-notfound').count(), 1);
  await page.evaluate(id => { location.hash = '#node=' + encodeURIComponent(id); }, FILE);
  await page.waitForFunction(() => document.querySelector('#panel #pdTitle')?.textContent === 'A.java');
  assert.equal(await page.locator('.map-notfound').count(), 0);
  await context.close();
});

test('map links carry the node id: capability, folder, file', {skip}, async () => {
  const {page, context} = await open('#node=' + encodeURIComponent(FILE), {lang: 'en'});
  await page.waitForSelector('#panel #pdTitle');
  const fileLink = await page.locator('#panel a.ua').getAttribute('href');
  assert.match(fileLink, /\/user-service\/\?token=[^&]+&node=ORISO-UserService%3A%3Afile%3Asrc%2Fmain%2Fjava%2Fx%2FA\.java$/);
  await page.evaluate(id => { location.hash = '#node=' + encodeURIComponent(id); }, FOLDER);
  await page.waitForFunction(() => document.querySelector('#panel #pdTitle')?.textContent === 'UserService · api/service');
  assert.match(await page.locator('#panel a.ua').getAttribute('href'), /\/user-service\/\?token=[^&]+&node=ORISO-UserService%3A%3Afolder%3Asrc%2Fmain%2Fjava%2Fx$/);
  await page.evaluate(id => { location.hash = '#node=' + encodeURIComponent(id); }, CAP);
  await page.waitForFunction(() => document.querySelector('#panel #pdTitle')?.textContent === 'Case handover');
  const cap = await page.locator('#panel a.ua').getAttribute('href');
  assert.match(cap, /\/supergraph\/\?token=[^&]+&node=capability%3Acase-handover$/);
  await context.close();
});

test('links stay inside a 390 px phone without horizontal scroll', {skip}, async () => {
  for (const id of ['capability:nope', FILE]) {
    const {page, context} = await open('#node=' + encodeURIComponent(id), {width: 390});
    const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}));
    assert.ok(m.s <= m.c, `${id}: ${m.s} > ${m.c}`);
    await context.close();
  }
});
