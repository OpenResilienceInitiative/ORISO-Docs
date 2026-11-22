// Health panel, "Send health check" section in the rendered map under the strict CSP (ORISO-Docs#220):
// capability, folder and file scopes, Copy, only in Health, DE/EN, light/dark, 320/390/1440 px.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from '../../../../planning-map/plan.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
const CAP = 'capability:case-handover';
const FOLDER = 'ORISO-UserService::folder:src/main/java/x';
const FILE = 'ORISO-UserService::file:src/main/java/x/A.java';
const RUNNER = 'node tools/planning-map/plan.mjs ';

function serve() {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    const file = url.startsWith('/map/data/') ? fixtures + url.slice('/map/data/'.length) : url === '/map/' ? hub + 'map/index.html' : hub + url.slice(1);
    if (!file.startsWith(hub) && !file.startsWith(fixtures) || !existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain');
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, origin;
async function open(hash, {width = 1440, lang = 'de', scheme = 'light'} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) problems.push(m.text()); });
  await page.goto(origin + '/map/' + hash);
  await page.waitForSelector('#viewSwitch button', {state: 'attached'});
  if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
  return {page, context, problems};
}
test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve(); origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

const sec = page => page.locator('.hcheck:visible').first();
async function show(page, width) {
  if (width <= 980) {
    const det = page.locator('#zbar [data-zdet]');
    if (await det.count()) await det.click();
  }
  await sec(page).waitFor();
}
const hash = (view, node) => '#view=' + view + '&node=' + encodeURIComponent(node);
const cmdsOf = page => page.locator('.hcheck:visible [data-hcheck-cmd]').allInnerTexts();

test('a capability shows the exact command for each repository it has code in; the CLI parser reads it back', {skip}, async () => {
  const {page, context, problems} = await open(hash('health', CAP), {lang: 'en'});
  await sec(page).waitFor();
  const cmds = await cmdsOf(page);
  assert.deepEqual(cmds, [RUNNER + 'health-check --capability case-handover --repo ORISO-UserService']);
  const o = parseArgs(cmds[0].replace(RUNNER, '').split(' '));
  assert.deepEqual([o.capability, o.repo, o.path, o.apply], ['case-handover', 'ORISO-UserService', null, false]);
  assert.match(await sec(page).innerText(), /Send health check/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('a folder adds --path; a file is checked as its folder and says so', {skip}, async () => {
  const f = await open(hash('health', FOLDER), {lang: 'en'});
  await sec(f.page).waitFor();
  assert.deepEqual(await cmdsOf(f.page), [RUNNER + 'health-check --capability case-handover --repo ORISO-UserService --path src/main/java/x']);
  assert.equal(await f.page.locator('#panel #pdTitle').count() + await f.page.locator('#sheetBody #pdTitle').count() > 0, true, 'the folder view is still there');
  await f.context.close();
  const g = await open(hash('health', FILE), {lang: 'en'});
  await sec(g.page).waitFor();
  assert.deepEqual(await cmdsOf(g.page), [RUNNER + 'health-check --capability case-handover --repo ORISO-UserService --path src/main/java/x']);
  assert.match(await sec(g.page).innerText(), /A\.java[\s\S]*checked as its folder/);
  const title = await g.page.evaluate(() => document.querySelector('#pdTitle').nextElementSibling.className);
  assert.match(title, /hcheck/, 'the section sits right after the title of the view');
  assert.deepEqual(g.problems, []);
  await g.context.close();
});

test('Copy puts the command on the clipboard, Copy with --apply adds --apply, and the button says so', {skip}, async () => {
  const {page, context} = await open(hash('health', FOLDER), {lang: 'en'});
  await sec(page).waitFor();
  const [plain, apply] = await page.locator('.hcheck:visible .hcheck-copy').all();
  await plain.click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), RUNNER + 'health-check --capability case-handover --repo ORISO-UserService --path src/main/java/x');
  assert.equal(await plain.innerText(), 'Copied');
  await apply.click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), / --path src\/main\/java\/x --apply$/);
  await context.close();
});

test('German labels', {skip}, async () => {
  const {page, context} = await open(hash('health', CAP), {lang: 'de'});
  await sec(page).waitFor();
  const t = await sec(page).innerText();
  assert.match(t, /Gesundheitsprüfung senden/); assert.match(t, /Befehl kopieren/); assert.match(t, /Mit --apply kopieren/);
  await context.close();
});

test('the section is only in Health', {skip}, async () => {
  const {page, context} = await open(hash('health', CAP), {lang: 'en'});
  await sec(page).waitFor();
  await page.click('#viewSwitch [data-mview="state"]');
  assert.equal(await page.locator('.hcheck').count(), 0);
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.equal(await page.locator('.hcheck').count(), 0);
  await page.click('#viewSwitch [data-mview="health"]');
  await sec(page).waitFor();
  await context.close();
});

test('fits 320, 390 and 1440 px, light and dark, DE and EN: no overflow, no inline styles, readable, tappable', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [390, 'de', 'dark'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open(hash('health', FOLDER), {width, lang, scheme});
    await show(page, width);
    const o = await page.evaluate(() => {
      const s = [...document.querySelectorAll('.hcheck')].find(e => e.offsetParent !== null), host = s.parentElement;
      const cmd = s.querySelector('.hcheck-cmd'), btn = s.querySelector('.hcheck-copy');
      return {page: document.documentElement.scrollWidth - document.documentElement.clientWidth, box: s.scrollWidth - s.clientWidth, host: host.scrollWidth - host.clientWidth,
        cmd: cmd.scrollWidth - cmd.clientWidth, inline: s.querySelectorAll('[style]').length, bg: getComputedStyle(s).backgroundColor, ink: getComputedStyle(cmd).color,
        cbg: getComputedStyle(cmd).backgroundColor, tap: btn.getBoundingClientRect().height, tapW: btn.getBoundingClientRect().width};
    });
    assert.ok(o.page <= 0 && o.box <= 0 && o.host <= 0 && o.cmd <= 0, `${width}px: ${JSON.stringify(o)}`);
    assert.equal(o.inline, 0);
    assert.notEqual(o.cbg, o.ink, 'text differs from its background');
    assert.notEqual(o.bg, 'rgba(0, 0, 0, 0)', 'the section has its own background');
    assert.ok(o.tap >= 44 && o.tapW >= 44, 'the buttons are tappable');
    assert.deepEqual(problems, []);
    await context.close();
  }
});
