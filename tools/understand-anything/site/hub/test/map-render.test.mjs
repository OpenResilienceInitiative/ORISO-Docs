// Renders the map page in a real browser from fixture JSON (test/fixtures/map-data).
// Needs Playwright: set UA_PLAYWRIGHT to its index.mjs. The browser job in ua-tooling.yml installs it and
// sets UA_PLAYWRIGHT_REQUIRED=1, so there the suite FAILS instead of skipping when Playwright is missing.
// Other CI jobs (contracts without a browser) and local runs skip it.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
// An explicit UA_PLAYWRIGHT is the only candidate; otherwise the local tool install.
const CANDIDATES = process.env.UA_PLAYWRIGHT ? [process.env.UA_PLAYWRIGHT] : ['/opt/npm-tools/node_modules/playwright/index.mjs'];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
// Strictest policy the page must live under: no inline code or styles.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";

// Tests can replace or add served data files ({'board.json': {...}}); reset after use.
let overrides = {};
function serve() {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const name = url.startsWith('/map/data/') ? url.slice('/map/data/'.length) : null;
    if (name && name in overrides) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(overrides[name])); }
    // board.json (optional data) is announced by a patched links.json and served from its own fixture.
    if (url === '/map/data/links.json' || url === '/map/data/epics.json') {
      const doc = JSON.parse(readFileSync(fixtures + url.slice('/map/data/'.length), 'utf8'));
      if (url.endsWith('links.json')) doc.optional = ['board.json', 'milestones.json']; else { doc.epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']]; doc.epics.epics[0].hid = 2; }
      res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(JSON.stringify(doc));
    }
    if (url === '/map/data/milestones.json') { res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(readFileSync(fileURLToPath(new URL('../../../../planning-map/milestones.json', import.meta.url)))); }
    // The board of a unified run carries the same run manifest as the map data files (#201).
    if (url === '/map/data/board.json') { res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(JSON.stringify({...JSON.parse(readFileSync(fixtures + '../board.json', 'utf8')), run: runFixture})); }
    const file = url.startsWith('/map/data/') ? fixtures + url.slice('/map/data/'.length)
      : url === '/map/' ? hub + 'map/index.html' : hub + url.slice(1);
    if (!file.startsWith(hub) && !file.startsWith(fixtures) || !existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain');
    res.setHeader('content-security-policy', CSP);
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const required = process.env.UA_PLAYWRIGHT_REQUIRED === '1';
const skip = playwrightPath || required ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
let browser, server, origin;
async function open({width = 1440, scheme = 'light', lang = 'de', init, board} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  if (init) await context.addInitScript(init);
  if (board) await context.route('**/map/data/board.json', async route => { const response = await route.fetch(); const doc = await response.json(); board(doc); await route.fulfill({response, json: doc}); });
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
  if (!playwrightPath) throw new Error('Playwright is required in CI: set UA_PLAYWRIGHT to playwright/index.mjs (' + CANDIDATES.join(', ') + ' not found)');
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

test('the footer shows when the board was synced, read from board.json (EN)', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  const line = page.locator('#boardSync');
  await line.waitFor();
  assert.match(await line.innerText(), /Board synced .*2026/);
  assert.doesNotMatch(await line.innerText(), /not synced yet/);
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

// ───── Watcher findings from board.json (ORISO-Docs#207) ─────
test('a block with findings shows a badge with the count; blocks without any show none (EN)', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  const badge = page.locator('#tm .blk[data-id="chat"] .fbadge');
  assert.equal(await badge.count(), 1);
  assert.match(await badge.innerText(), /2/);
  assert.match(await page.locator('#tm .blk[data-id="chat"]').getAttribute('title'), /2 findings/);
  assert.equal(await page.locator('#tm .blk[data-id="livechat"] .fbadge').count(), 0);
  assert.equal(await page.locator('#tm [style]').evaluateAll(a => a.filter(e => e.classList.contains('fbadge')).length), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

// ───────── Epic side view (ORISO-Docs#206) ─────────
const EPIC = '#pgrid .epic';
async function openEpic(page) {
  await page.locator(EPIC).first().click();
  await page.locator('.pd .estat').waitFor();
}
const listed = page => page.locator('.pd .egroup li a').evaluateAll(a => a.map(x => x.textContent));

test('clicking an epic opens the side view: sub-issues by status, stacked bar, GitHub links, private items as a count', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  await openEpic(page);
  assert.equal(await page.locator('#sheet[open]').count(), 0); // desktop: the side panel, not the sheet
  assert.deepEqual(await page.locator('#panel .estat .sbar .sseg').evaluateAll(a => a.map(s => s.dataset.status)), ['Backlog', 'Ready', 'On hold', 'In progress', 'In review', 'QA internal', 'QA external', 'Done']);
  await page.waitForFunction(() => document.querySelectorAll('#panel [data-css]').length === 0);
  assert.deepEqual(await page.locator('#panel .estat .sbar .sseg').evaluateAll(a => a.map(s => s.style.width)), ['11.11%', '11.11%', '11.11%', '11.11%', '11.11%', '11.11%', '11.11%', '22.22%']);
  assert.deepEqual((await page.locator('#panel .egroup h5 > span:first-child').allInnerTexts()).map(x => x.trim()), ['Backlog', 'Ready', 'On hold', 'In progress', 'In review', 'QA internal', 'QA external', 'Done']);
  const links = await page.locator('#panel .egroup li a').evaluateAll(a => a.map(x => [x.getAttribute('href'), x.rel, x.target]));
  assert.equal(links.length, 9);
  assert.ok(links.every(([h, rel, t]) => /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-(Frontend|Admin)\/issues\/\d+$/.test(h) && /noopener/.test(rel) && t === '_blank'));
  assert.match(await page.locator('#panel .epriv').innerText(), /2 sub-issue\(s\) in a private repository.*count/i);
  assert.equal(await page.locator('#panel').getByText('E2E').count(), 0);
  assert.equal(await page.locator('#panel [style]').evaluateAll(a => a.filter(x => !x.classList.contains('sseg') && !x.closest('.prog') && !x.closest('.em')).length), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the detail panel lists the flagged issues with their finding, in English and German', {skip}, async () => {
  for (const [lang, a, b] of [['en', /Stalled in QA internal: 30 days \(limit 7\)/, /QA external without BjoernLudwig/], ['de', /Stillstand in QA intern: 30 Tage \(Grenze 7\)/, /QA extern ohne BjoernLudwig/]]) {
    const {page, context} = await open({lang});
    await page.locator('#tm .blk[data-id="chat"]').click();
    const box = page.locator('#panel .flist');
    await box.waitFor();
    const text = await box.innerText();
    assert.match(text, a); assert.match(text, b);
    assert.match(text, /#1805/); assert.match(text, /#1806/);
    assert.equal(await box.locator('a[href*="ORISO-Frontend/issues/1806"]').count(), 1);
    await context.close();
  }
});

test('on a phone the findings badge shows on the card and the sheet lists them', {skip}, async () => {
  const {page, context} = await open({width: 390, lang: 'en'});
  const card = page.locator('#cards .card', {hasText: 'Chat and conversation list'});
  assert.match(await card.locator('.fbadge').innerText(), /2/);
  await card.click();
  await page.locator('#sheetBody .flist').waitFor();
  const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}));
  assert.ok(m.s <= m.c);
  await context.close();
});

test('each filter keeps only its items: accepted, developed on Dev, on Staging, open', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  await openEpic(page);
  const pick = async name => { await page.locator('#panel .efilters button', {hasText: name}).click(); await page.waitForSelector('#panel .efilters [aria-pressed="true"]'); };
  await pick('Accepted');
  assert.deepEqual(await listed(page), ['Child g', 'Child h']);
  await pick('Developed on Dev');
  assert.deepEqual(await listed(page), ['Child e']);
  await pick('On Staging');
  assert.deepEqual(await listed(page), ['Child f']);
  await pick('Open');
  assert.equal((await listed(page)).length, 7);
  assert.equal(await page.locator('#panel .egroup h5', {hasText: 'Done'}).count(), 0);
  await pick('All');
  assert.equal((await listed(page)).length, 9);
  assert.equal(await page.locator('#panel .efilters [aria-pressed="true"]').count(), 1);
  assert.match(await page.locator('#panel .efilters [aria-pressed="true"]').innerText(), /All\s*9/);
  await context.close();
});

test('keyboard: arrow keys move between filters, Enter picks one and keeps focus, Escape closes the side view', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  await openEpic(page);
  await page.locator('#panel .efilters button').first().focus();
  await page.keyboard.press('ArrowRight');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Accepted/);
  await page.keyboard.press('Enter');
  assert.deepEqual(await listed(page), ['Child g', 'Child h']);
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Accepted/); // focus survives the re-render
  await page.keyboard.press('End');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /Open/);
  await page.keyboard.press('Home');
  assert.match(await page.evaluate(() => document.activeElement.textContent), /All/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#panel .estat').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('epic')), true); // focus returns to the epic card
  await context.close();
});

for (const width of [390, 320]) {
  test(`on a ${width} px phone the epic opens as a bottom sheet that closes with Escape and with a swipe down`, {skip}, async () => {
    const {page, context, problems} = await open({width, lang: 'en'});
    await openEpic(page);
    await page.locator('#sheet[open]').waitFor();
    const box = await page.locator('#sheet .sheet-in').boundingBox();
    assert.ok(Math.abs(box.y + box.height - 900) <= 1, 'sheet sits at the bottom edge: ' + JSON.stringify(box));
    assert.ok(box.width <= width);
    await page.locator('#sheet .efilters button', {hasText: 'Developed on Dev'}).click();
    assert.deepEqual(await listed(page), ['Child e']);
    const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, e: document.getElementById('sheetIn').scrollWidth, ec: document.getElementById('sheetIn').clientWidth}));
    assert.ok(m.s <= m.c && m.e <= m.ec, JSON.stringify(m));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sheet[open]').count(), 0);
    await openEpic(page);
    await page.locator('#sheet[open]').waitFor();
    await page.evaluate(() => {
      const t = (type, y) => document.getElementById('sheetIn').dispatchEvent(new TouchEvent(type, {bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [new Touch({identifier: 1, target: document.getElementById('sheetIn'), clientX: 100, clientY: y})], changedTouches: [new Touch({identifier: 1, target: document.getElementById('sheetIn'), clientX: 100, clientY: y})]}));
      t('touchstart', 500); t('touchmove', 600); t('touchend', 640);
    });
    await page.waitForFunction(() => !document.getElementById('sheet').open);
    assert.deepEqual(problems, []);
    await context.close();
  });
}

test('German labels, and the epic bar uses the shared status tokens in dark mode', {skip}, async () => {
  const {page, context} = await open({lang: 'de', scheme: 'dark'});
  await openEpic(page);
  assert.deepEqual(await page.locator('#panel .efilters button').allInnerTexts().then(a => a.map(x => x.replace(/\s+/g, ' ').trim())),
    ['Alle 9', 'Abgenommen (Fertig) 2', 'Auf Dev entwickelt (QA intern) 1', 'Auf Staging (QA extern) 1', 'Offen 7']);
  assert.match(await page.locator('#panel .epriv').innerText(), /2 Teilaufgabe\(n\) in einem privaten Repository/);
  const tokens = JSON.parse(readFileSync(hub + 'assets/tokens.json', 'utf8')).tokens;
  const rgb = hex => 'rgb(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
  const done = await page.locator('#panel .estat .sbar .sseg[data-status="Done"]').evaluate(e => getComputedStyle(e).backgroundColor);
  assert.equal(done, rgb(tokens['status-done'].dark.fill));
  await context.close();
});

test('1440 px: the epic panel stays beside the map, no horizontal overflow', {skip}, async () => {
  const {page, context} = await open({width: 1440, lang: 'en'});
  await openEpic(page);
  const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}));
  assert.ok(m.s <= m.c);
  const r = await page.locator('#panel').boundingBox();
  assert.ok(r.x > 700 && r.x + r.width <= 1440, JSON.stringify(r));
  await context.close();
});

test('desktop: the milestone panel lists releases with counts and effort; picking one highlights its capabilities', {skip}, async () => {
  const {page, problems, context} = await open({width: 1920, lang: 'en'});
  assert.ok(await page.locator('#relpanel').isVisible());
  assert.ok(!(await page.locator('#relopen').isVisible()));
  assert.match(await page.locator('#relpanel .mh').first().innerText(), /Platform 2\.0/);
  const card = page.locator('#relbody .relc[data-release="v2.0.12"]');
  const text = await card.innerText();
  assert.match(text, /3 issues/); assert.match(text, /In progress 1/); assert.match(text, /High 2/); assert.match(text, /14 person-days/); assert.match(text, /1 capability/);
  await card.click();
  assert.equal(await card.getAttribute('aria-pressed'), 'true');
  assert.ok(await page.locator('#tm.relf').count() === 1);
  assert.deepEqual(await page.locator('#tm .blk.relhit').evaluateAll(n => n.map(e => e.dataset.id)), ['chat']);
  assert.ok(await page.locator('#tm .blk:not(.relhit)').count() > 5);
  assert.match(await page.locator('#rellive').innerText(), /v2\.0\.12: 1 capability/);
  await page.locator('#relclear').click();
  assert.equal(await page.locator('#tm .blk.relhit').count(), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: the panel is a drawer that opens, filters, closes with Escape and does not overflow`, {skip}, async () => {
    for (const [scheme, lang] of [['light', 'de'], ['dark', 'en']]) {
      const {page, problems, context} = await open({width, scheme, lang});
      assert.ok(!(await page.locator('#relpanel').isVisible()));
      await page.locator('#relopen').click();
      await page.waitForSelector('#relpanel.open');
      assert.equal(await page.locator('#relopen').getAttribute('aria-expanded'), 'true');
      assert.ok(await page.locator('#relpanel').isVisible());
      const box = await page.locator('#relpanel').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'drawer inside the viewport');
      if (process.env.UA_SHOTS) await page.screenshot({path: `${process.env.UA_SHOTS}/panel-${width}-${scheme}-${lang}.png`});
      await page.locator('#relbody .relc[data-release="v2.0.13"]').click();
      assert.ok(!(await page.locator('#relpanel.open').count()), 'picking a release closes the drawer');
      assert.deepEqual(await page.locator('#tm .blk.relhit').evaluateAll(n => n.map(e => e.dataset.id)), ['chat']);
      await page.locator('#relopen').click();
      await page.keyboard.press('Escape');
      assert.ok(!(await page.locator('#relpanel.open').count()));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'relopen');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow');
      assert.deepEqual(problems, []);
      await context.close();
    }
  });
}

// ───── Planning moves: drag / keyboard, optimistic update, rollback (ORISO-Docs#210) ─────
// A transport that waits until the test answers, so the optimistic state can be observed.
const HELD = () => {
  window.__calls = [];
  window.PlanningTransport = {assignRelease: intent => new Promise(res => { window.__calls.push(intent); window.__answer = res; })};
};
const relCount = (page, name) => page.locator(`#relbody .relc[data-release="${name}"] .rcount`).textContent();
const VIEWBOX = ":is(#panel, #sheetBody)"; // side panel on desktop, bottom sheet on phones
async function openEpicList(page) {
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.locator(`${VIEWBOX} .navrow[data-view="epics"]:visible`).waitFor();
  await page.locator(`${VIEWBOX} .navrow[data-view="epics"]:visible`).click();
  await page.locator(`${VIEWBOX} .epic:visible`).first().waitFor();
}
async function openEpicForMove(page) {
  await page.locator('#pgrid .epic').first().click();
  await page.locator(`${VIEWBOX} [data-move="epic"]:visible`).waitFor();
}
async function dragEpicToRelease(page, name) {
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await page.dispatchEvent('#panel .epic', 'dragstart', {dataTransfer: dt});
  await page.waitForSelector('#relpanel', {state: 'visible'});
  await page.dispatchEvent(`#relbody .relc[data-release="${name}"]`, 'dragover', {dataTransfer: dt});
  assert.ok(await page.locator(`#relbody .relc[data-release="${name}"].dropok`).count(), 'drop target is marked');
  await page.dispatchEvent(`#relbody .relc[data-release="${name}"]`, 'drop', {dataTransfer: dt});
  await page.dispatchEvent('#panel .epic', 'dragend', {dataTransfer: dt});
}

test('drag an epic onto a release: optimistic at once, then kept once the transport confirms', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', init: HELD});
  await openEpicList(page);
  await dragEpicToRelease(page, 'v2.0.13');
  await page.waitForSelector('#movedlg[open]');
  assert.match(await page.locator('#mvWhat').innerText(), /Shared waiting room · now: v2\.0\.12/);
  assert.equal(await page.locator('#mvrel').inputValue(), 'v2.0.13', 'the drop target is preselected');
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.pending');
  const calls = await page.evaluate(() => window.__calls);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, 'assignRelease'); assert.equal(calls[0].release, 'v2.0.13'); assert.equal(calls[0].withSubIssues, false);
  assert.deepEqual(calls[0].issues, [{repository: 'OpenResilienceInitiative/ORISO-Frontend', number: 1734, expect: 'v2.0.12'}]);
  assert.match(await relCount(page, 'v2.0.13'), /^2 issues/, 'moved before the answer');
  assert.match(await relCount(page, 'v2.0.12'), /^2 issues/);
  await page.evaluate(() => window.__answer({ok: true}));
  await page.waitForSelector('#planlog .plrow.confirmed');
  assert.match(await page.locator('#planlog').innerText(), /Saved on GitHub/);
  assert.match(await relCount(page, 'v2.0.13'), /^2 issues/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('ROLLBACK: a refused write puts the card back and shows the reason', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', init: HELD});
  await openEpicList(page);
  await dragEpicToRelease(page, 'v2.0.13');
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.pending');
  assert.match(await relCount(page, 'v2.0.13'), /^2 issues/);
  await page.evaluate(() => window.__answer({ok: false, error: {code: 'NO_WRITE_RIGHTS', message: 'Resource not accessible by integration', issue: 'OpenResilienceInitiative/ORISO-Frontend#1734'}, applied: []}));
  await page.waitForSelector('#planlog .plrow.failed');
  const msg = await page.locator('#planlog').innerText();
  assert.match(msg, /Not saved, rolled back/); assert.match(msg, /No write rights on GitHub/); assert.match(msg, /Resource not accessible/);
  assert.match(await relCount(page, 'v2.0.13'), /^1 issue/, 'rolled back');
  assert.match(await relCount(page, 'v2.0.12'), /^3 issues/);
  assert.equal(await page.evaluate(() => document.activeElement.className), 'pmsg', 'focus lands on the reason');
  await page.locator('#planlog .plb').click();
  assert.ok(await page.locator('#planlog').isHidden());
  assert.deepEqual(problems, []);
  await context.close();
});

test('without a transport the move stays as a command to copy, and Undo takes it back', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'de'});
  await openEpicForMove(page);
  await page.locator(`${VIEWBOX} [data-move="epic"]:visible`).click();
  await page.waitForSelector('#movedlg[open]');
  await page.locator('#mvrel').selectOption('v2.0.13');
  await page.locator('#mvsubs').check();
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.command');
  assert.equal(await page.locator('#planlog .plcmd').innerText(),
    "node tools/planning-map/plan.mjs assign-release --issue 'OpenResilienceInitiative/ORISO-Frontend#1734=v2.0.12' --release v2.0.13 --with-sub-issues");
  assert.match(await page.locator('#planlog').innerText(), /noch nicht auf GitHub/);
  assert.match(await relCount(page, 'v2.0.13'), /^10 Aufgaben/, 'the epic and its 9 sub-issues (8 with a parent link, 1 from the epic list) move on the map');
  await page.locator('#planlog .plb', {hasText: 'Zurücknehmen'}).click();
  assert.match(await relCount(page, 'v2.0.13'), /^1 Aufgabe/);
  assert.ok(await page.locator('#planlog').isHidden());
  assert.deepEqual(problems, []);
  await context.close();
});

test('keyboard path: "Move to release…" opens a labelled dialog, Escape cancels and returns focus', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  await openEpicForMove(page);
  const btn = page.locator('#panel [data-move="epic"]');
  await btn.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#movedlg[open]');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'mvrel');
  assert.equal(await page.locator('#movedlg').getAttribute('aria-labelledby'), 'mvTitle');
  await page.keyboard.press('Escape');
  assert.ok(!(await page.locator('#movedlg[open]').count()));
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-move')), 'epic');
  assert.equal(await page.locator('#planlog .plrow').count(), 0, 'cancel plans nothing');
  assert.deepEqual(problems, []);
  await context.close();
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: the move dialog and the planning log fit and do not overflow (light DE, dark EN)`, {skip}, async () => {
    for (const [scheme, lang] of [['light', 'de'], ['dark', 'en']]) {
      const {page, problems, context} = await open({width, scheme, lang});
      await openEpicForMove(page);
      await page.locator(`${VIEWBOX} [data-move="epic"]:visible`).click();
      await page.waitForSelector('#movedlg[open]');
      const box = await page.locator('#movedlg').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'dialog inside the viewport');
      if (process.env.UA_SHOTS) await page.screenshot({path: `${process.env.UA_SHOTS}/move-${width}-${scheme}-${lang}.png`});
      await page.locator('#mvgo').click();
      await page.waitForSelector('#planlog .plrow.command');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow');
      if (process.env.UA_SHOTS) await page.screenshot({path: `${process.env.UA_SHOTS}/planlog-${width}-${scheme}-${lang}.png`});
      assert.deepEqual(problems, []);
      await context.close();
    }
  });
}

// ───── Gate step indicator and gate filter in the epic view (ORISO-Docs#211) ─────
const GATED = doc => { const g = {1801: 'P2 Specified', 1804: 'R3 Human review', 1805: 'R3 Human review', 1806: 'R4 Verified on Dev'}; doc.items.forEach(i => { if (g[i.number]) i.gate = g[i.number]; }); };

test('each gated sub-issue shows its step along the eight gates, with a spoken label and the criteria on hover', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', board: GATED});
  await openEpic(page);
  const row = page.locator('.pd .egroup li', {hasText: 'Child d'});
  const steps = row.locator('.gsteps');
  assert.equal(await steps.getAttribute('aria-label'), 'Gate R3 Human review, step 7 of 8');
  assert.match(await steps.getAttribute('title'), /^R3 Human review: A human reviewed the code/);
  assert.equal(await steps.locator('.gs').count(), 8);
  assert.equal(await steps.locator('.gs.on').count(), 6);
  assert.deepEqual(await steps.locator('.gs.cur').evaluateAll(n => n.map(e => e.dataset.phase)), ['review']);
  assert.equal(await page.locator('.pd .egroup li', {hasText: 'Child b'}).locator('.gsteps').count(), 0, 'no gate, no indicator');
  assert.deepEqual(problems, []);
  await context.close();
});

test('FILTER by gate: "R3 Human review" keeps only the issues waiting there; the select is keyboard-operable', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', board: GATED});
  await openEpic(page);
  const sel = page.locator('.pd select[data-gfilter]');
  assert.equal(await page.locator('.pd label[for="gsel"]').innerText(), 'GATE');
  assert.match(await sel.locator('option[value="R3 Human review"]').innerText(), /R3 Human review \(2\)/);
  await sel.focus();
  await sel.selectOption('R3 Human review');
  assert.deepEqual((await listed(page)).sort(), ['Child d', 'Child e']);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'gsel', 'focus stays on the select');
  await page.locator('.pd .efilt', {hasText: 'Developed on Dev'}).click(); // combines with the status filter
  assert.deepEqual(await listed(page), ['Child e']);
  await page.locator('.pd select[data-gfilter]').selectOption('none');
  assert.ok(!(await listed(page)).includes('Child d'));
  assert.deepEqual(problems, []);
  await context.close();
});

test('no Gate value on the board: no gate filter and no indicator (the field does not exist yet)', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  await openEpic(page);
  assert.equal(await page.locator('.pd select[data-gfilter]').count(), 0);
  assert.equal(await page.locator('.pd .gsteps').count(), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: gate indicators and filter fit in light and dark, DE and EN`, {skip}, async () => {
    for (const [scheme, lang] of [['light', 'de'], ['dark', 'en']]) {
      const {page, problems, context} = await open({width, scheme, lang, board: GATED});
      await openEpic(page);
      await page.locator('.pd .gsteps').first().waitFor();
      const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, e: document.getElementById('sheetIn').scrollWidth, ec: document.getElementById('sheetIn').clientWidth}));
      assert.ok(m.s <= m.c && m.e <= m.ec, `no horizontal overflow ${JSON.stringify(m)}`);
      if (process.env.UA_SHOTS) await page.locator('.pd .egroup:has(.gsteps)').first().screenshot({path: `${process.env.UA_SHOTS}/gate-${width}-${scheme}-${lang}.png`}).catch(() => {});
      assert.deepEqual(problems, []);
      await context.close();
    }
  });
}

// ───── Review of #210/#209: expectations, focus, redraws, drag on phones, drawer, XSS ─────
const TWO_EPICS = async (context) => context.route('**/map/data/epics.json', async route => {
  const response = await route.fetch(); const doc = await response.json();
  doc.epics.epics.push({r: 0, n: 1806, t: 'Second chat epic', s: 'o', tot: 0, done: 0, b: 'chat', pr: 'Low', ef: 'S', rl: 'v2.0.13', u: '2026-10-20', subs: []});
  await route.fulfill({response, json: doc});
});
const planCmds = page => page.locator('#planlog .plcmd').allInnerTexts();

test('the expectation comes from the synced board, not from a move still waiting to be written', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  for (const target of ['v2.0.13', 'v2.0.12']) {
    await openEpicForMove(page);
    await page.locator(`${VIEWBOX} [data-move="epic"]:visible`).click();
    await page.waitForSelector('#movedlg[open]');
    await page.locator('#mvrel').selectOption(target);
    await page.locator('#mvgo').click();
  }
  const cmds = await planCmds(page);
  assert.equal(cmds.length, 2);
  for (const c of cmds) assert.match(c, /--issue 'OpenResilienceInitiative\/ORISO-Frontend#1734=v2\.0\.12'/, c);
  assert.deepEqual(problems, []);
  await context.close();
});

test('moving a capability with several epics carries one expectation per epic', {skip}, async () => {
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce', locale: 'en-GB'});
  await TWO_EPICS(context);
  await context.addInitScript(HELD);
  const page = await context.newPage(); const problems = []; page.on('pageerror', e => problems.push(String(e)));
  await page.goto(origin + '/map/'); await page.waitForSelector('#tm .blk');
  await page.evaluate(() => document.documentElement.setAttribute('data-lang', 'en'));
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.locator('#panel .navrow[data-view="epics"]').click();
  await page.locator('#panel [data-move="block"]').click();
  await page.waitForSelector('#movedlg[open]');
  await page.locator('#mvrel').selectOption('v2.0.13');
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.pending');
  const [call] = await page.evaluate(() => window.__calls);
  assert.equal(call.expect, undefined);
  assert.deepEqual(call.issues, [
    {repository: 'OpenResilienceInitiative/ORISO-Frontend', number: 1734, expect: 'v2.0.12'},
    {repository: 'OpenResilienceInitiative/ORISO-Frontend', number: 1806, expect: 'v2.0.13'}]);
  assert.deepEqual(problems, []);
  await context.close();
});

test('keyboard move: after submitting, focus is back on the "Move to release…" button of the redrawn panel', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  await openEpicForMove(page);
  await page.locator('#panel [data-move="epic"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#movedlg[open]');
  await page.locator('#mvrel').selectOption('v2.0.13');
  await page.locator('#mvgo').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#planlog .plrow.command');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-move')), 'epic');
  assert.ok(await page.evaluate(() => document.getElementById('panel').contains(document.activeElement)));
  assert.deepEqual(problems, []);
  await context.close();
});

test('a move redraws "Planned work" too: the epic card shows the new release', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  assert.match(await page.locator('#pgrid .epic[data-epic="0"]').innerText(), /v2\.0\.12/);
  await openEpicForMove(page);
  await page.locator('#panel [data-move="epic"]').click();
  await page.locator('#mvrel').selectOption('v2.0.13');
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.command');
  assert.match(await page.locator('#pgrid .epic[data-epic="0"]').innerText(), /v2\.0\.13/);
  await page.locator('#planlog .plb', {hasText: 'Undo'}).click();
  assert.match(await page.locator('#pgrid .epic[data-epic="0"]').innerText(), /v2\.0\.12/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('phones (bottom sheet): nothing is draggable; desktop: epics and blocks are', {skip}, async () => {
  for (const [width, want] of [[390, false], [1440, true]]) {
    const {page, problems, context} = await open({width, lang: 'en'});
    const n = await page.locator('#pgrid .epic[draggable="true"], #tm .blk[draggable="true"]').count();
    assert.equal(n > 0, want, `${width}px: ${n} drag sources`);
    if (!want) {
      await page.locator('#pgrid .epic').first().click();
      await page.locator('#sheet[open]').waitFor();
      assert.equal(await page.locator('#sheetBody [draggable="true"]').count(), 0);
    }
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('a move with sub-issues names the ones that sit in another release (dry-run message)', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en'});
  await openEpicForMove(page);
  await page.locator('#panel [data-move="epic"]').click();
  await page.locator('#mvrel').selectOption('v2.0.13');
  await page.locator('#mvsubs').check();
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow.command');
  const msg = await page.locator('#planlog .pmsg').innerText();
  assert.match(msg, /in another release/i);
  assert.match(msg, /#1801 \(v2\.0\.12\)/); assert.match(msg, /#1804 \(v2\.0\.12\)/);
  assert.doesNotMatch(msg, /#1806/, 'already in the target release');
  assert.deepEqual(problems, []);
  await context.close();
});

test('1200px drawer: the rest of the page is inert while it is open, and Escape closes the drawer before zooming out', {skip}, async () => {
  const {page, problems, context} = await open({width: 1200, lang: 'en'});
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.waitForFunction(() => document.querySelector('#zbar [aria-current]'));
  await page.locator('#relopen').click();
  await page.waitForSelector('#relpanel.open');
  assert.ok(await page.evaluate(() => !!document.getElementById('tm').closest('[inert]')), 'map is inert');
  assert.ok(await page.evaluate(() => !!document.querySelector('footer').closest('[inert]')), 'footer is inert');
  assert.ok(await page.evaluate(() => !document.getElementById('relpanel').closest('[inert]') && !document.getElementById('relback').closest('[inert]')));
  // An Escape that reaches the map (e.g. focus left there) still closes only the drawer.
  await page.evaluate(() => document.querySelector('.stage').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})));
  assert.ok(!(await page.locator('#relpanel.open').count()), 'drawer closed');
  assert.match(await page.locator('#zbar [aria-current]').innerText(), /Chat/, 'still zoomed into the capability');
  assert.equal(await page.locator('[inert]').count(), 0, 'inert removed');
  assert.deepEqual(problems, []);
  await context.close();
});

test('XSS: hostile titles, release names, finding details, milestone titles and a javascript: URL stay text', {skip}, async () => {
  const X = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
  const context = await browser.newContext({viewport: {width: 1920, height: 900}, reducedMotion: 'reduce', locale: 'en-GB'});
  await context.route('**/map/data/board.json', async route => {
    const response = await route.fetch(); const doc = await response.json();
    const evil = 'v6' + X;
    doc.fieldOptions.platformRelease.push(evil); doc.releases.push({name: evil, count: 1});
    doc.items.forEach(i => { i.title = i.title + X; });
    const sub = doc.items.find(i => i.number === 1805); sub.url = 'javascript:window.__xss=3';
    const flagged = doc.items.find(i => i.number === 1806); flagged.platformRelease = evil;
    flagged.findings = [{rule: 'qa-external-no-bjoern', severity: 'warn', detail: {expected: X}}, {rule: 'gate-status-mismatch', severity: 'warn', detail: {gate: X, status: X}}, {rule: X, severity: 'warn', detail: {}}];
    doc.findingCounts = {'qa-external-no-bjoern': 1};
    await route.fulfill({response, json: doc});
  });
  await context.route('**/map/data/milestones.json', route => route.fulfill({json: {schemaVersion: 1, milestones: [{id: 'evil', title: {de: X, en: X}, releases: ['v2.0.12', 'v6' + X]}]}}));
  const page = await context.newPage(); const problems = []; page.on('pageerror', e => problems.push(String(e)));
  await page.goto(origin + '/map/'); await page.waitForSelector('#tm .blk');
  await page.locator('#tm .blk[data-id="chat"]').click();
  await page.locator('#panel .navrow[data-view="epics"]').click();
  await page.locator('#panel .epic').first().click();
  await page.locator('#panel .estat').waitFor();
  await page.locator('#relbody .relc').last().click();
  await page.locator('#panel [data-move="epic"]').click();
  await page.waitForSelector('#movedlg[open]');
  await page.locator('#mvrel').selectOption('v6' + X);
  await page.locator('#mvgo').click();
  await page.waitForSelector('#planlog .plrow');
  const found = await page.evaluate(() => ({
    xss: window.__xss,
    injected: document.querySelectorAll('img[src="x"], body script:not([src]), [onerror]').length,
    js: [...document.querySelectorAll('a[href]')].filter(a => /^\s*javascript:/i.test(a.getAttribute('href'))).length,
  }));
  assert.deepEqual(found, {xss: undefined, injected: 0, js: 0});
  assert.match(await page.locator('#relbody').innerText(), /<img src=x/, 'the hostile text is shown as text');
  assert.deepEqual(problems, []);
  await context.close();
});

const runFixture = JSON.parse(readFileSync(new URL('./fixtures/run.json', import.meta.url), 'utf8'));
const fixtureLinks = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));

test('footer shows one Stand from the run manifest with the commit of each repo and no warning', {skip}, async () => {
  const {page, context} = await open({lang: 'en'});
  const meas = await page.locator('#meas').innerText();
  assert.equal((meas.match(/As of/g) || []).length, 1);
  assert.match(meas, /As of 2026-10-23 01:00 UTC/);
  assert.match(meas, /ORISO-Frontend 3333333/);
  assert.match(meas, /ORISO-Admin 1111111/);
  assert.equal(await page.locator('#stand-warning').count(), 0);
  assert.equal((await page.locator('body').innerText()).match(/\bAs of\b/g).length, 1);
  await context.close();
});

test('German page says Stand exactly once', {skip}, async () => {
  const {page, context} = await open({lang: 'de'});
  assert.equal(((await page.locator('body').innerText()).match(/\bStand\b/g) || []).length, 1);
  assert.match(await page.locator('#meas').innerText(), /Stand 2026-10-23 01:00 UTC/);
  await context.close();
});

test('a board.json from another run raises a visible warning naming the file', {skip}, async () => {
  const other = {...runFixture, runId: '20261022T010000Z-deadbeef', generatedAt: '2026-10-22T01:00:00Z'};
  overrides = {'links.json': {...fixtureLinks, optional: ['board.json']}, 'board.json': {...JSON.parse(readFileSync(fixtures + '../board.json', 'utf8')), run: other}};
  try {
    const {page, context, problems} = await open({lang: 'en'});
    const w = page.locator('#stand-warning');
    assert.equal(await w.count(), 1);
    assert.match(await w.innerText(), /different runs/i);
    assert.match(await w.innerText(), /board\.json/);
    assert.deepEqual(problems, []);
    await context.close();
  } finally { overrides = {}; }
});

test('a data file without a run is reported as unstamped', {skip}, async () => {
  const {run, ...bare} = JSON.parse(readFileSync(fixtures + 'zoom.json', 'utf8'));
  overrides = {'zoom.json': bare};
  try {
    const {page, context} = await open({lang: 'en'});
    assert.match(await page.locator('#stand-warning').innerText(), /zoom\.json/);
    await context.close();
  } finally { overrides = {}; }
});

// ───── Branches and pull requests: badge and pop-up on task and epic cards (ORISO-Docs#215) ─────
const FR = 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/';
const WORK = doc => {
  const br = (name, source, prs = [], url = FR + 'tree/' + name) => ({name, repository: 'OpenResilienceInitiative/ORISO-Frontend', source, lastCommitDate: '2026-10-20T10:00:00Z', url, prs});
  const w = {
    1734: {branches: [br('feat/1734-a', 'linked')], prs: [], hidden: 0},
    1801: {branches: [br('feat/1801-x', 'pr', [7]), br('fix/1801-y', 'name')], prs: [{number: 7, repository: 'OpenResilienceInitiative/ORISO-Frontend', title: 'Add waiting room', url: FR + 'pull/7', state: 'OPEN', isDraft: true, checks: 'FAILURE', reviewDecision: 'REVIEW_REQUIRED', updatedAt: '2026-10-21T10:00:00Z', branch: 'feat/1801-x'}], hidden: 0},
    1802: {branches: [br('wip/1802', 'name')], prs: [], hidden: 1},
  };
  doc.items.forEach(i => { if (i.repository.endsWith('ORISO-Frontend') && w[i.number]) i.work = w[i.number]; });
};
const BADGE = '[data-work]';
const badgeText = async loc => (await loc.innerText()).replace(/\s+/g, ' ').trim();

test('epic card and epic header show the sum; a task shows its own badge; no work data, no badge (EN)', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', board: WORK});
  assert.equal(await badgeText(page.locator(`#pgrid ${BADGE}[data-work="epic:0"]`)), '4 branches · 1 PR');
  await openEpic(page);
  assert.equal(await badgeText(page.locator(`#panel ${BADGE}[data-work="epic:0"]`)), '4 branches · 1 PR');
  assert.equal(await badgeText(page.locator(`#panel ${BADGE}[data-work="item:ORISO-Frontend#1801"]`)), '2 branches · 1 PR');
  assert.equal(await badgeText(page.locator(`#panel ${BADGE}[data-work="item:ORISO-Frontend#1802"]`)), '1 branch · 0 PRs');
  assert.equal(await page.locator(`#panel ${BADGE}[data-work="item:ORISO-Frontend#1803"]`).count(), 0);
  assert.deepEqual(problems, []);
  await context.close();
  const plain = await open({lang: 'en'});
  assert.equal(await plain.page.locator(BADGE).count(), 0);
  await plain.context.close();
});

test('German badge', {skip}, async () => {
  const {page, context} = await open({lang: 'de', board: WORK});
  assert.equal(await badgeText(page.locator(`#pgrid ${BADGE}[data-work="epic:0"]`)), '4 Branches · 1 PR');
  await context.close();
});

test('the badge opens a pop-up with branches and PRs; the epic stays; Escape closes it and focus returns (EN)', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', board: WORK});
  await openEpic(page);
  const badge = page.locator(`#panel ${BADGE}[data-work="epic:0"]`);
  const before = await page.locator('#panel').innerHTML();
  await badge.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#workdlg[open]');
  assert.equal(await page.locator('#workdlg').getAttribute('aria-labelledby'), 'wkTitle');
  assert.ok(await page.locator('#panel .estat').isVisible(), 'the epic stays visible');
  const links = await page.locator('#workdlg a').evaluateAll(a => a.map(x => [x.textContent.trim(), x.getAttribute('href'), x.rel, x.target]));
  assert.ok(links.length >= 4 && links.every(([, h, rel, t]) => /^https:\/\//.test(h) && /noopener/.test(rel) && t === '_blank'));
  const text = await page.locator('#workdlg').innerText();
  assert.match(text, /feat\/1734-a/);
  assert.match(text, /fix\/1801-y[\s\S]*matched by name only/i);
  assert.match(text, /#7[\s\S]*Add waiting room/);
  assert.match(text, /draft/i);
  assert.match(text, /checks failing/i);
  assert.equal(await page.locator('#workdlg [style]').count(), 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#workdlg[open]').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-work')), 'epic:0');
  assert.equal(await page.locator('#panel').innerHTML(), before, 'the epic view was not redrawn');
  assert.ok(await page.locator('#panel .estat').isVisible());
  assert.deepEqual(problems, []);
  await context.close();
});

test('a badge on the planned-work card opens the pop-up without opening the epic', {skip}, async () => {
  const {page, context} = await open({lang: 'en', board: WORK});
  await page.locator(`#pgrid ${BADGE}[data-work="epic:0"]`).click();
  await page.waitForSelector('#workdlg[open]');
  assert.equal(await page.locator('#panel .estat').count(), 0);
  await page.locator('#wkclose').click();
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-work')), 'epic:0');
  await context.close();
});

test('private references are a count; hostile names and a javascript: URL stay text', {skip}, async () => {
  const {page, problems, context} = await open({lang: 'en', board: doc => {
    WORK(doc);
    const i = doc.items.find(x => x.number === 1801);
    i.work.branches[1].name = '<img src=x onerror=alert(1)>';
    i.work.branches[1].url = 'javascript:alert(1)';
    i.work.prs[0].title = '<b>bold</b>';
  }});
  await openEpic(page);
  await page.locator(`#panel ${BADGE}[data-work="epic:0"]`).click();
  await page.waitForSelector('#workdlg[open]');
  assert.equal(await page.locator('#workdlg img, #workdlg b').count(), 0);
  assert.equal(await page.locator('#workdlg a[href^="javascript"]').count(), 0);
  assert.match(await page.locator('#workdlg').innerText(), /<img src=x onerror=alert\(1\)>/);
  assert.match(await page.locator('#workdlg').innerText(), /1 reference in a private repository, counted only/);
  assert.equal(await page.locator('#workdlg').getByText('wip/1802').count(), 1); // public branch of a public issue
  assert.deepEqual(problems, []);
  await context.close();
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: badge and pop-up fit, no horizontal overflow (light DE, dark EN)`, {skip}, async () => {
    for (const [scheme, lang] of [['light', 'de'], ['dark', 'en']]) {
      const {page, problems, context} = await open({width, scheme, lang, board: WORK});
      await page.locator(`#pgrid ${BADGE}[data-work="epic:0"]`).click();
      await page.waitForSelector('#workdlg[open]');
      const box = await page.locator('#workdlg').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'dialog inside the viewport');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow');
      const inner = await page.locator('#wkBody').evaluate(e => e.scrollWidth <= e.clientWidth + 1);
      assert.ok(inner, 'dialog content does not overflow sideways');
      if (process.env.UA_SHOTS) await page.screenshot({path: `${process.env.UA_SHOTS}/work-${width}-${scheme}-${lang}.png`});
      await page.keyboard.press('Escape');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.deepEqual(problems, []);
      await context.close();
    }
  });
}
