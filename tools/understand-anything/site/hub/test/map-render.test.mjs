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
      if (url.endsWith('links.json')) doc.optional = ['board.json', 'milestones.json']; else { doc.epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']]; doc.epics.epics[0].hid = 2; }
      res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(JSON.stringify(doc));
    }
    if (url === '/map/data/milestones.json') { res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); return res.end(readFileSync(fileURLToPath(new URL('../../../../planning-map/milestones.json', import.meta.url)))); }
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
