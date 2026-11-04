// Plan view with ideas in the rendered map (ORISO-Docs#223): highlighting, flow, links, the "Show ideas" toggle.
// Same harness as map-views-render.test.mjs (Playwright, strict CSP, fixture JSON); ideas.json is routed in per test.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const ideasFixture = JSON.parse(readFileSync(new URL('./fixtures/ideas.json', import.meta.url), 'utf8'));
const CANDIDATES = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean);
const playwrightPath = CANDIDATES.find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';

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
async function open(hash = '', {width = 1440, lang = 'de', scheme = 'light', ideas = ideasFixture} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  if (ideas) {
    const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8')); links.optional = ['ideas.json'];
    await context.route('**/map/data/links.json', r => r.fulfill({json: links, headers: {'content-security-policy': CSP}}));
    await context.route('**/map/data/ideas.json', r => r.fulfill({json: ideas, headers: {'content-security-policy': CSP}}));
  }
  await page.goto(origin + '/map/' + hash);
  await page.waitForSelector('#tm .blk', {state: 'attached'});
  if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
  return {page, context, problems};
}
const marked = page => page.evaluate(() => [...document.querySelectorAll('#tm .blk.vmark')].map(b => b.dataset.id).sort());
const idea = (page, id) => page.locator(`#viewTools [data-idea="${id}"]`);

test.before(async () => {
  if (skip) return;
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve();
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

test('Plan lists the ideas with their status, in German and English', {skip}, async () => {
  const {page, context, problems} = await open('#view=plan', {lang: 'de'});
  assert.equal(await page.locator('#viewTools [data-idea]').count(), 2);
  const text = await page.locator('#viewTools').innerText();
  assert.match(text, /Übergabe mit Erinnerung/); assert.match(text, /Besprochen/); assert.match(text, /Nachtdienst/);
  await page.click('.langswitch button[data-lang="en"]');
  const en = await page.locator('#viewTools').innerText();
  assert.match(en, /Handover with reminder/); assert.match(en, /Discussed/);
  assert.deepEqual(await marked(page), [], 'nothing is highlighted before an idea is picked');
  assert.deepEqual(problems, []);
  await context.close();
});

test('picking an idea highlights exactly its capabilities, picking another moves it, again clears it', {skip}, async () => {
  const {page, context, problems} = await open('#view=plan', {lang: 'en'});
  await idea(page, 'handover-v2').click();
  assert.deepEqual(await marked(page), ['handover', 'notify']);
  assert.equal(await idea(page, 'handover-v2').getAttribute('aria-pressed'), 'true');
  const fills = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#tm .blk[data-id]')].map(b => [b.dataset.id, b.style.getPropertyValue('--view-fill')])));
  assert.equal(fills.handover, 'var(--brand-wash)'); assert.equal(fills.chat, 'var(--neutral)');
  await idea(page, 'night-shift').click();
  assert.deepEqual(await marked(page), ['livechat']);
  assert.equal(await idea(page, 'handover-v2').getAttribute('aria-pressed'), 'false');
  await idea(page, 'night-shift').click();
  assert.deepEqual(await marked(page), []);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the selected idea shows its flow status, both page links and the epic link with the draft count', {skip}, async () => {
  const {page, context} = await open('#view=plan', {lang: 'en'});
  await idea(page, 'night-shift').click();
  const steps = await page.locator('#viewTools .iflow-step').allInnerTexts();
  assert.equal(steps.length, 4);
  assert.equal(await page.locator('#viewTools .iflow-step[aria-current="step"] .ifn').innerText(), 'Epic');
  assert.equal(await page.locator('#viewTools .iflow-step.is-done').count(), 3);
  const boxes = await page.locator('#viewTools .iflow-step').evaluateAll(l => l.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.right]; }));
  assert.ok(boxes.every(([w, h, right]) => w > 20 && h > 10 && right <= 1440), 'every step is visible: ' + JSON.stringify(boxes));
  const hrefs = await page.locator('#viewTools .ilinks a').evaluateAll(a => a.map(x => [x.href, x.target, x.rel]));
  assert.deepEqual(hrefs.map(h => h[0]), ['https://docs.oriso.org/de/produkt/ideas/night-shift', 'https://docs.oriso.org/en/produkt/ideas/night-shift', 'https://github.com/OpenResilienceInitiative/ORISO-Frontend/issues/42']);
  assert.ok(hrefs.every(h => h[1] === '_blank' && /noopener/.test(h[2])));
  assert.match(await page.locator('#viewTools .ilinks').innerText(), /3 draft items/);
  await idea(page, 'handover-v2').click();
  assert.equal(await page.locator('#viewTools .iflow-step[aria-current="step"] .ifn').innerText(), 'Discussed');
  assert.equal(await page.locator('#viewTools .ilinks a').count(), 2, 'no epic, no epic link');
  await context.close();
});

test('State and Health hide ideas by default; "Show ideas" marks the touched squares and survives a view change', {skip}, async () => {
  const {page, context, problems} = await open('', {lang: 'en'});
  assert.deepEqual(await marked(page), []);
  assert.equal(await page.locator('#viewTools [data-idea]').count(), 0, 'the idea list belongs to Plan');
  const toggle = page.locator('#viewTools [data-ideatoggle]');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.match(await toggle.innerText(), /Show ideas/);
  await toggle.click();
  assert.deepEqual(await marked(page), ['handover', 'livechat', 'notify']);
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.click('#viewSwitch [data-mview="health"]');
  assert.deepEqual(await marked(page), ['handover', 'livechat', 'notify'], 'Health marks them too');
  await page.click('#viewSwitch [data-mview="state"]');
  await page.locator('#viewTools [data-ideatoggle]').click();
  assert.deepEqual(await marked(page), []);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the toggle switches in German too, and State squares keep their layers when marked', {skip}, async () => {
  const {page, context} = await open('', {lang: 'de'});
  assert.match(await page.locator('#viewTools [data-ideatoggle]').innerText(), /Ideen anzeigen/);
  const before = await page.evaluate(() => document.querySelector('#tm .blk[data-id="handover"]').innerHTML);
  await page.locator('#viewTools [data-ideatoggle]').click();
  assert.equal(await page.evaluate(() => document.querySelector('#tm .blk[data-id="handover"]').innerHTML), before);
  assert.equal(await page.locator('#tm.vview').count(), 0);
  await context.close();
});

test('without ideas.json there is no tool row, no toggle and Plan says so', {skip}, async () => {
  const {page, context, problems} = await open('', {lang: 'en', ideas: null});
  assert.equal(await page.locator('#viewTools').isVisible(), false);
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.match(await page.locator('#viewTools').innerText(), /No ideas yet/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('a malformed ideas.json cannot break the map', {skip}, async () => {
  const {page, context, problems} = await open('#view=plan', {lang: 'en', ideas: {schemaVersion: 1, ideas: [{id: 'x', status: 'nope'}, null, 5, {id: 'ok', status: 'idea', capabilities: ['chat'], title: {de: 'A', en: 'B'}}]}});
  assert.equal(await page.locator('#viewTools [data-idea]').count(), 1);
  assert.deepEqual(problems, []);
  await context.close();
});

test('keyboard: the idea buttons work with Enter and keep focus; no inline style or script in the tool row', {skip}, async () => {
  const {page, context, problems} = await open('#view=plan', {lang: 'en'});
  await idea(page, 'handover-v2').focus();
  await page.keyboard.press('Enter');
  assert.deepEqual(await marked(page), ['handover', 'notify']);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.idea), 'handover-v2', 'focus stays on the button');
  assert.equal(await page.locator('#viewTools [style], #viewTools script, #viewTools [onclick]').count(), 0);
  assert.deepEqual(problems, [], 'no CSP violation');
  await context.close();
});

test('the capability panel in Plan names the ideas that touch it', {skip}, async () => {
  const {page, context} = await open('#view=plan&node=' + encodeURIComponent('capability:case-handover'), {lang: 'en'});
  await page.waitForSelector('#panel #pdTitle');
  assert.match(await page.locator('#panel .ipanel').innerText(), /Handover with reminder/);
  await context.close();
});

test('no horizontal overflow at 320, 390 and 1440 px with an idea open, light and dark, DE and EN; marks stay visible', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [390, 'de', 'dark'], [1440, 'en', 'dark'], [1440, 'de', 'light']]) {
    for (const view of ['plan', 'state']) {
      const {page, context, problems} = await open('#view=' + view, {width, lang, scheme});
      if (view === 'plan') await idea(page, 'night-shift').click(); else await page.locator('#viewTools [data-ideatoggle]').click();
      const o = await page.evaluate(() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        tw: document.querySelector('#viewTools').scrollWidth, tc: document.querySelector('#viewTools').clientWidth,
        outline: getComputedStyle(document.querySelector('#tm .blk.vmark')).outlineStyle}));
      assert.ok(o.sw <= o.cw, `${view}@${width}: page ${o.sw} > ${o.cw}`);
      assert.ok(o.tw <= o.tc, `${view}@${width}: tool row overflows`);
      assert.notEqual(o.outline, 'none', 'a marked square has a visible frame, not colour alone');
      assert.deepEqual(problems, []);
      await context.close();
    }
  }
});

test('Plan keeps zoom and selection like the other views', {skip}, async () => {
  const {page, context} = await open('#view=plan&node=' + encodeURIComponent('capability:case-handover'), {lang: 'en'});
  await idea(page, 'handover-v2').click();
  await page.waitForSelector('#panel #pdTitle');
  assert.equal(await page.locator('#panel #pdTitle').innerText(), 'Case handover');
  assert.equal(await page.evaluate(() => location.hash), '#view=plan&node=capability%3Acase-handover');
  await context.close();
});
