// Refactoring in the rendered Health view (ORISO-Docs#222): marker on the squares, section in the panel. Strict CSP, same harness style as map-health-render.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {validateBoard} from '../../../../planning-map/lib/board.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
const SHOTS = process.env.REFACTOR_SHOTS;

const DOCS = 'OpenResilienceInitiative/ORISO-Docs', FE = 'OpenResilienceInitiative/ORISO-Frontend';
const base = JSON.parse(readFileSync(fixtures + '../board.json', 'utf8'));
let n = 5000;
const {work: _w, job: _j, ...issueShape} = base.items.find(i => i.contentType === 'Issue');
const task = (status, scope, over = {}) => ({
  ...issueShape, id: 'PVTI_rf' + n, repository: DOCS, number: n++, title: 'Refactor part ' + (n - 1),
  url: `https://github.com/${DOCS}/issues/${n - 1}`, state: 'OPEN', status, parent: null, assignees: [], findings: [], refactor: {scope}, ...over,
});
const withRefactoring = () => {
  const b = JSON.parse(JSON.stringify(base));
  b.items.push(
    task('Ready', 'email-templates:ORISO-Frontend:src/mails'), task('In progress', 'email-templates:ORISO-Frontend:src/mails'), task('Done', 'email-templates'),
    task('QA external', 'chat:ORISO-Frontend'),
    task('Backlog', 'case-handover:ORISO-UserService'),
    task('In review', null, {repository: FE, parent: {repository: FE, number: 1734}}), // no scope: epic 1734 maps to the block "chat"
    task('Ready', 'supervision', {url: 'https://evil.example/x'}), // a link that fails the guard
  );
  return b;
};
const BOARD = withRefactoring();

function serve({board = true} = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    if (url === '/map/data/links.json') {
      const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));
      if (board) links.optional = [...links.optional, 'board.json'];
      res.setHeader('content-type', types['.json']); return res.end(JSON.stringify(links));
    }
    if (url === '/map/data/board.json' && board) { res.setHeader('content-type', types['.json']); return res.end(JSON.stringify(BOARD)); }
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
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', e => console.error('CSP: ' + e.violatedDirective)));
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
  bare = await serve({board: false}); bareOrigin = 'http://127.0.0.1:' + bare.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); bare?.close(); });

const node = cap => '#view=health&node=' + encodeURIComponent('capability:' + cap);
const squares = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#tm .blk[data-id]')].map(b => [b.dataset.id, {
  small: b.classList.contains('xs') || b.classList.contains('sm'), rf: b.dataset.rf ?? null, rft: b.dataset.rft ?? null, rfw: b.dataset.rfw ?? null, before: getComputedStyle(b, '::before').content,
}])));

test('the fixture board is a valid board.json with refactoring items', () => {
  assert.deepEqual(validateBoard(BOARD), []);
});

test('Health: squares carry the state as a word; State view and squares without tasks have no marker', {skip}, async () => {
  const {page, context, problems} = await open('#view=health', {lang: 'en'});
  await page.waitForSelector('#tm .blk[data-id]', {state: 'attached'});
  const sq = await squares(page);
  assert.deepEqual([sq.mailadmin.rf, sq.mailadmin.rft, sq.mailadmin.rfw], ['running', 'Refactoring: running (3)', 'running']);
  for (const s of Object.values(sq).filter(x => x.rf)) assert.equal(s.before, JSON.stringify(s.small ? s.rfw : s.rft), 'the word is drawn, not only an attribute (small squares: the state word alone)');
  assert.deepEqual([sq.chat.rf, sq.chat.rft], ['running', 'Refactoring: running (2)']); // scope chat (QA external = done) + epic-mapped task In review (running)
  assert.deepEqual([sq.handover.rf, sq.handover.rft], ['planned', 'Refactoring: planned']);
  assert.equal(sq.supervision.rf, 'planned');
  const rest = Object.entries(sq).filter(([id]) => !['mailadmin', 'chat', 'handover', 'supervision'].includes(id));
  assert.ok(rest.length >= 15 && rest.every(([, s]) => s.rf === null && s.before === 'none'), 'no task, no marker');
  assert.match(await page.locator('#stagefoot').innerText(), /Refactoring: a marker in the square says planned, running or done/);
  await page.click('#viewSwitch button:nth-child(1)');
  assert.ok(Object.values(await squares(page)).every(s => s.rf === null), 'State view: no marker');
  assert.deepEqual(problems, []);
  await context.close();
});

test('German words and language switch redraw the marker', {skip}, async () => {
  const {page, context} = await open('#view=health', {lang: 'de'});
  await page.waitForSelector('#tm .blk[data-id]', {state: 'attached'});
  let sq = await squares(page);
  assert.equal(sq.mailadmin.rft, 'Refactoring: läuft (3)'); assert.equal(sq.handover.rft, 'Refactoring: geplant');
  await page.click('.langswitch button[data-lang="en"]');
  sq = await squares(page);
  assert.equal(sq.mailadmin.rft, 'Refactoring: running (3)');
  await context.close();
});

test('the panel lists the tasks of the square with GitHub links and the exact command', {skip}, async () => {
  const {page, context, problems} = await open(node('email-templates'), {lang: 'en'});
  await page.waitForSelector('#panel [data-refactor], #zbar [data-zdet]', {state: 'attached'});
  const box = page.locator('[data-refactor]:visible').first();
  await box.waitFor();
  const t = await box.innerText();
  assert.match(t, /planned 1/i); assert.match(t, /running 1/i); assert.match(t, /done 1/i);
  const links = await box.locator('a[data-rf-link]').evaluateAll(a => a.map(x => [x.getAttribute('href'), x.getAttribute('rel'), x.getAttribute('target')]));
  assert.equal(links.length, 3);
  assert.ok(links.every(([h, r, g]) => /^https:\/\/github\.com\/OpenResilienceInitiative\/ORISO-Docs\/issues\/\d+$/.test(h) && /noopener/.test(r) && g === '_blank'));
  assert.equal((await box.locator('[data-rf-cmd]').innerText()).trim(), 'node tools/planning-map/plan.mjs propose-refactor --scope email-templates --epic <Org/Repo#n> [--apply]');
  assert.equal(await box.locator('[style]').count(), 0);
  assert.deepEqual(problems, []);
  await context.close();
});

test('a task whose link fails the https guard is listed as text', {skip}, async () => {
  const {page, context} = await open(node('supervision'), {lang: 'en'});
  const box = page.locator('[data-refactor]:visible').first();
  await box.waitFor();
  assert.equal(await box.locator('li[data-rf-task]').count(), 1);
  assert.equal(await box.locator('a').count(), 0);
  assert.match(await box.innerText(), /planned/i);
  await context.close();
});

test('a square without tasks says so and still offers the command; the board-less page says the state is unknown', {skip}, async () => {
  const a = await open(node('notifications'), {lang: 'de'});
  const box = a.page.locator('[data-refactor]:visible').first();
  await box.waitFor();
  assert.match(await box.innerText(), /Noch keine Refactoring-Aufgabe/);
  assert.match(await box.locator('[data-rf-cmd]').innerText(), /--scope notifications /);
  await a.context.close();
  const b = await open(node('chat'), {lang: 'en', base: bareOrigin});
  const nb = b.page.locator('[data-refactor]:visible').first();
  await nb.waitFor();
  assert.match(await nb.innerText(), /Board not synced yet/);
  assert.doesNotMatch(await nb.innerText(), /planned\s*0|running\s*0/);
  await b.page.click('#viewSwitch button:nth-child(2)').catch(() => {});
  assert.ok(Object.values(await squares(b.page)).every(s => s.rf === null), 'no board: no marker');
  assert.deepEqual(b.problems, []);
  await b.context.close();
});

const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('320, 390 and 1440 px, light and dark, DE and EN: marker inside its square and readable, no horizontal scroll, panel section fits', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [320, 'de', 'dark'], [390, 'de', 'dark'], [390, 'en', 'light'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open('#view=health', {width, lang, scheme});
    await page.waitForSelector('#tm .blk[data-id="mailadmin"]', {state: 'attached'});
    const m = await page.evaluate(() => {
      const out = [];
      for (const b of document.querySelectorAll('#tm .blk[data-rf]')) {
        const r = b.getBoundingClientRect(), cs = getComputedStyle(b, '::before');
        out.push({id: b.dataset.id, w: r.width, h: r.height, content: cs.content, color: cs.color, bg: cs.backgroundColor, maxW: cs.maxWidth, fs: cs.fontSize, top: cs.top, left: cs.left});
      }
      return {out, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth};
    });
    assert.ok(m.out.length >= 4, `markers at ${width}`);
    assert.ok(m.scrollW <= m.innerW, `no horizontal scroll at ${width}: ${m.scrollW} > ${m.innerW}`);
    for (const x of m.out) {
      assert.notEqual(x.content, 'none'); assert.notEqual(x.content, 'normal');
      assert.ok(x.w > 0 && x.h > 0);
      const bgA = /rgba\(.*,\s*(0?\.\d+)\)/.exec(x.bg);
      assert.ok(!bgA || Number(bgA[1]) >= 0.85, 'marker background is (nearly) opaque: ' + x.bg);
      assert.ok(contrast(x.color, x.bg) >= 4.5, `contrast ${contrast(x.color, x.bg).toFixed(1)} at ${width} ${scheme} (${x.color} on ${x.bg})`);
    }
    if (SHOTS) { mkdirSync(SHOTS, {recursive: true}); for (const id of ['chat', 'mailadmin', 'handover']) await page.locator(`#tm .blk[data-id="${id}"]`).screenshot({path: path.join(SHOTS, `sq-${id}-${width}-${lang}-${scheme}.png`)}); }
    // panel
    await page.goto(origin + '/map/' + node('email-templates'));
    if (lang === 'en') await page.click('.langswitch button[data-lang="en"]');
    if (width <= 980) await page.locator('#zbar [data-zdet]').click();
    const box = page.locator('[data-refactor]:visible').first();
    await box.waitFor();
    const fit = await page.evaluate(() => {
      const b = [...document.querySelectorAll('[data-refactor]')].find(e => e.offsetParent !== null), r = b.getBoundingClientRect(), p = b.parentElement.getBoundingClientRect();
      return {l: r.left, r: r.right, pl: p.left, pr: p.right, sw: b.scrollWidth, cw: b.clientWidth, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth};
    });
    assert.ok(fit.r <= fit.pr + 1 && fit.l >= fit.pl - 1, `section inside its column at ${width}`);
    assert.ok(fit.sw <= fit.cw + 1, `section content does not overflow at ${width}`);
    assert.ok(fit.scrollW <= fit.innerW, `no horizontal scroll with the panel at ${width}`);
    if (SHOTS) await box.screenshot({path: path.join(SHOTS, `panel-${width}-${lang}-${scheme}.png`)});
    assert.deepEqual(problems, [], `${width} ${lang} ${scheme}`);
    await context.close();
  }
});
