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
    // board.json (optional data) is announced by a patched links.json and served from its own fixture.
    if (url === '/map/data/links.json' || url === '/map/data/epics.json') {
      const doc = JSON.parse(readFileSync(fixtures + url.slice('/map/data/'.length), 'utf8'));
      if (url.endsWith('links.json')) doc.optional = ['board.json']; else doc.epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']];
      res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(JSON.stringify(doc));
    }
    if (url === '/map/data/board.json') { res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(readFileSync(fixtures + '../board.json')); }
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

// ───── Status bars from board.json (ORISO-Docs#205) ─────
const GROUPS = ['neutral', 'progress', 'qa-internal', 'qa-external', 'done'];
async function segColours(page, id) {
  return page.evaluate(i => {
    const out = {};
    document.querySelectorAll(`#tm .blk[data-id="${i}"] .sbar .sseg`).forEach(s => { out[s.dataset.group] = out[s.dataset.group] || getComputedStyle(s).backgroundColor; });
    return out;
  }, id);
}

test('a block with board data shows a status bar under the strict CSP, widths set through the CSSOM', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  const segs = page.locator('#tm .blk[data-id="chat"] .sbar .sseg');
  assert.equal(await segs.count(), 8);
  assert.deepEqual(await segs.evaluateAll(a => a.map(s => s.dataset.status)), ['Backlog', 'Ready', 'On hold', 'In progress', 'In review', 'QA internal', 'QA external', 'Done']);
  await page.waitForFunction(() => document.querySelectorAll('#tm [data-css]').length === 0);
  const widths = await segs.evaluateAll(a => a.map(s => s.style.width));
  assert.deepEqual(widths, ['10%', '10%', '10%', '20%', '10%', '10%', '10%', '20%']);
  assert.equal(await page.locator('#tm .blk[data-id="chat"] .sbar[style]').count(), 0); // nothing but CSSOM on elements, no attribute left behind in markup
  assert.equal(await page.locator('#tm .blk[data-id="livechat"] .sbar').count(), 0); // no board data -> no bar
  assert.deepEqual(problems, []);
  await context.close();
});

for (const scheme of ['light', 'dark']) {
  test(`status groups use the shared tokens and stay distinct (${scheme})`, {skip}, async () => {
    const {page, context} = await open({scheme});
    const tokens = JSON.parse(readFileSync(hub + 'assets/tokens.json', 'utf8')).tokens;
    const rgb = hex => 'rgb(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
    const c = await segColours(page, 'chat');
    assert.deepEqual(Object.keys(c).sort(), [...GROUPS].sort());
    assert.equal(c['qa-internal'], rgb(tokens['status-qa-internal'][scheme].fill));
    assert.equal(c['qa-external'], rgb(tokens['status-qa-external'][scheme].fill));
    assert.equal(c.done, rgb(tokens['status-done'][scheme].fill));
    assert.equal(c.progress, rgb(tokens['plan-in-progress'][scheme].fill));
    assert.equal(c.neutral, rgb(tokens['plan-not-started'][scheme].fill));
    assert.equal(new Set(Object.values(c)).size, 5, 'five distinct colours: ' + JSON.stringify(c));
    await context.close();
  });
}

test('hover title and detail panel give counts per status, Urgent/High and readiness (EN)', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  const title = await page.locator('#tm .blk[data-id="chat"]').getAttribute('title');
  assert.match(title, /Done 2/);
  assert.match(title, /Urgent\/High 5/);
  assert.match(title, /Readiness 7\.6 of 19/);
  assert.match(title, /2 without score/);
  await page.locator('#tm .blk[data-id="chat"]').click();
  const box = page.locator('#panel .bstat');
  await box.waitFor();
  const text = await box.innerText();
  assert.match(text, /Urgent 3/); assert.match(text, /High 2/);
  assert.match(text, /7\.6 \/ 19/);
  assert.match(text, /2 without score/);
  assert.match(text, /QA internal\s*1/);
  assert.match(await page.locator('#stagefoot').innerText(), /Issues outside any capability: 1/);
  await context.close();
});

test('German labels and decimal comma', {skip}, async () => {
  const {page, context} = await open({lang: 'de'});
  const title = await page.locator('#tm .blk[data-id="chat"]').getAttribute('title');
  assert.match(title, /Dringend\/Hoch 5/);
  assert.match(title, /Reife 7,6 von 19/);
  assert.match(title, /2 ohne Wert/);
  await context.close();
});

test('on a 390 px phone the bar is visible in the tile and the legend wraps without overflow', {skip}, async () => {
  const {page, context} = await open({width: 390, lang: 'en'});
  const r = await page.locator('#tm .blk[data-id="chat"] .sbar').boundingBox();
  assert.ok(r && r.width >= 20 && r.height >= 3, JSON.stringify(r));
  const card = page.locator('#cards .card', {hasText: 'Chat and conversation list'});
  const cbar = await card.locator('.sbar').boundingBox();
  assert.ok(cbar && cbar.width >= 100 && cbar.height >= 6, JSON.stringify(cbar));
  assert.match(await card.locator('.cbadges').innerText(), /Urgent\/High 5[\s\S]*Readiness 7\.6 of 19 · 2 without score/);
  await card.click();
  await page.locator('#sheetBody .bstat').waitFor();
  const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}));
  assert.ok(m.s <= m.c);
  await context.close();
});
