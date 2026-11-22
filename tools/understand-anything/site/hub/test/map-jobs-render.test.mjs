// Agent jobs in the rendered map under the strict CSP (ORISO-Docs#216): badges, pop-up, Jobs filter.
// Same harness as map-render.test.mjs (Playwright via UA_PLAYWRIGHT; skipped without it unless UA_PLAYWRIGHT_REQUIRED=1).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const CANDIDATES = process.env.UA_PLAYWRIGHT ? [process.env.UA_PLAYWRIGHT] : ['/opt/npm-tools/node_modules/playwright/index.mjs'];
const playwrightPath = CANDIDATES.find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const required = process.env.UA_PLAYWRIGHT_REQUIRED === '1';
const skip = playwrightPath || required ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
const runFixture = JSON.parse(readFileSync(new URL('./fixtures/run.json', import.meta.url), 'utf8'));

function serve() {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const send = (body) => { res.setHeader('content-type', types['.json']); res.setHeader('content-security-policy', CSP); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
    if (url === '/map/data/links.json' || url === '/map/data/epics.json') {
      const doc = JSON.parse(readFileSync(fixtures + url.slice('/map/data/'.length), 'utf8'));
      if (url.endsWith('links.json')) doc.optional = ['board.json', 'milestones.json']; else { doc.epics.epics[0].subs = [[1, 900, 'Mapped through the epic sub-issue list', 'o']]; doc.epics.epics[0].hid = 2; }
      return send(doc);
    }
    if (url === '/map/data/milestones.json') return send(readFileSync(fileURLToPath(new URL('../../../../planning-map/milestones.json', import.meta.url))).toString());
    if (url === '/map/data/board.json') return send({...JSON.parse(readFileSync(fixtures + '../board.json', 'utf8')), run: runFixture});
    const file = url.startsWith('/map/data/') ? fixtures + url.slice('/map/data/'.length) : url === '/map/' ? hub + 'map/index.html' : hub + url.slice(1);
    if (!file.startsWith(hub) && !file.startsWith(fixtures) || !existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', types[path.extname(file)] || 'text/plain');
    res.setHeader('content-security-policy', CSP);
    res.end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

let browser, server, origin;
async function open({width = 1440, scheme = 'light', lang = 'de', board} = {}) {
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme: scheme, locale: lang === 'de' ? 'de-DE' : 'en-GB', reducedMotion: 'reduce'});
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
  if (!playwrightPath) throw new Error('Playwright is required in CI: set UA_PLAYWRIGHT to playwright/index.mjs');
  const {chromium} = await import(pathToFileURL(playwrightPath));
  browser = await chromium.launch();
  server = await serve();
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); });

const FR = 'OpenResilienceInitiative/ORISO-Frontend';
const job = (state, over = {}) => ({state, runner: 'local', machine: 'mac-frank', started: '2026-10-23T08:00:00Z', updated: '2026-10-24T09:30:00Z', model: 'claude-opus-5-5', branches: ['feat/1801-x'], prs: ['#7'], next: 'run the hub tests', report: 'https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/230', ...over});
const stale = {rule: 'job-stale', severity: 'warn', detail: {hours: 30, threshold: 24}};
const JOBS = doc => {
  const set = (repo, n, j, findings) => { const i = doc.items.find(x => x.repository.endsWith(repo) && x.number === n); i.job = j; i.findings = findings || []; return i; };
  set('ORISO-Frontend', 1734, job('running', {updated: '2026-10-23T03:00:00Z'}), [stale]);
  set('ORISO-Frontend', 1801, job('running')).work = {branches: [{name: 'feat/1801-x', repository: FR, source: 'linked', lastCommitDate: '2026-10-20T10:00:00Z', url: 'https://github.com/' + FR + '/tree/feat/1801-x', prs: []}], prs: [], hidden: 0};
  set('ORISO-Frontend', 1802, job('waiting-human', {next: 'needs a decision on the queue size', report: null, model: null, branches: [], prs: []}));
  set('ORISO-Frontend', 1803, job('stopped', {runner: 'cloud', machine: null}));
  set('ORISO-Frontend', 1804, job('done'));
  set('ORISO-Admin', 900, job('running'));
};
const EPIC = '#pgrid .epic';
const JB = '[data-job-state].jobbadge';
const text = async loc => (await loc.innerText()).replace(/\s+/g, ' ').trim();
async function openEpic(page) { await page.locator(EPIC).first().click(); await page.locator('.pd .estat').waitFor(); }

test('epic card, epic header and tasks show job badges next to the branch badges; no job, no badge (EN)', {skip}, async () => {
  const {page, context, problems} = await open({lang: 'en', board: JOBS});
  assert.equal(await text(page.locator(`#pgrid ${JB}[data-work="epic:0"]`)), 'Jobs: 3 running · 1 stale · 1 waiting for a human · 1 stopped');
  await openEpic(page);
  assert.equal(await text(page.locator(`#panel ${JB}[data-work="epic:0"]`)), 'Jobs: 3 running · 1 stale · 1 waiting for a human · 1 stopped');
  assert.equal(await text(page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1801"]`)), 'Job: running');
  assert.equal(await text(page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1802"]`)), 'Job: waiting for a human');
  assert.equal(await page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1806"]`).count(), 0);
  assert.equal(await page.locator('#panel li:has([data-work="item:ORISO-Frontend#1801"]) .wkbadges > .wkbadge').count(), 2, 'branch badge and job badge sit together');
  assert.deepEqual(problems, []);
  await context.close();
  const plain = await open({lang: 'en'});
  assert.equal(await plain.page.locator('.jobbadge').count(), 0);
  await plain.page.locator(EPIC).first().click();
  assert.equal(await plain.page.locator('.jfilters').count(), 0);
  await plain.context.close();
});

test('German labels', {skip}, async () => {
  const {page, context} = await open({lang: 'de', board: JOBS});
  assert.equal(await text(page.locator(`#pgrid ${JB}[data-work="epic:0"]`)), 'Jobs: 3 laufend · 1 veraltet · 1 wartend auf Mensch · 1 gestoppt');
  await openEpic(page);
  assert.equal(await text(page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1802"]`)), 'Job: wartet auf Mensch');
  await context.close();
});

test('a job without branches opens the pop-up: state, where, when, model, next step, report link; focus returns (EN)', {skip}, async () => {
  const {page, context, problems} = await open({lang: 'en', board: JOBS});
  await openEpic(page);
  const badge = page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1803"]`);
  await badge.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('#workdlg[open]');
  const t = await text(page.locator('#workdlg'));
  assert.match(t, /#1803/);
  assert.match(t, /stopped/);
  assert.match(t, /Where cloud/);
  assert.match(t, /Started 2026-10-23 08:00 UTC/);
  assert.match(t, /Updated 2026-10-24 09:30 UTC/);
  assert.match(t, /Model claude-opus-5-5/);
  assert.match(t, /Next step run the hub tests/);
  assert.doesNotMatch(t, /No branches or pull requests/);
  const links = await page.locator('#workdlg a').evaluateAll(a => a.map(x => [x.getAttribute('href'), x.rel, x.target]));
  assert.deepEqual(links, [['https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/230', 'noopener', '_blank']]);
  assert.equal(await page.locator('#workdlg [style]').count(), 0);
  assert.ok(await page.locator('#panel .estat').isVisible(), 'the epic stays visible');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-work')), 'item:ORISO-Frontend#1803');
  assert.deepEqual(problems, []);
  await context.close();
});

test('stale is named in the pop-up; the epic pop-up lists every job and the branches as well', {skip}, async () => {
  const {page, context} = await open({lang: 'en', board: JOBS});
  await openEpic(page);
  await page.locator(`#panel ${JB}[data-work="epic:0"]`).click();
  await page.waitForSelector('#workdlg[open]');
  assert.equal(await page.locator('#workdlg .jobcard').count(), 6);
  assert.match(await text(page.locator('#workdlg')), /stale: no update for 30 h \(limit 24 h\)/);
  assert.equal(await page.locator('#workdlg .jobcard[data-job-state="waiting-human"]').count(), 1);
  await context.close();
});

test('hostile texts stay text; a report link that is not https is not a link', {skip}, async () => {
  const {page, context, problems} = await open({lang: 'en', board: doc => {
    JOBS(doc);
    const i = doc.items.find(x => x.number === 1801);
    i.job.next = '<img src=x onerror=alert(1)>'; i.job.machine = '<b>box</b>'; i.job.report = 'javascript:alert(1)'; i.job.model = '"><script>alert(2)</script>';
  }});
  await openEpic(page);
  await page.locator(`#panel ${JB}[data-work="item:ORISO-Frontend#1801"]`).click();
  await page.waitForSelector('#workdlg[open]');
  assert.equal(await page.locator('#workdlg img, #workdlg b, #workdlg script').count(), 0);
  assert.equal(await page.locator('#workdlg a[href^="javascript"]').count(), 0);
  const t = await page.locator('#workdlg').innerText();
  assert.match(t, /<img src=x onerror=alert\(1\)>/);
  assert.match(t, /javascript:alert\(1\)/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('Jobs filter: running, stopped, waiting for a human, stale; counts follow the status filter; All restores', {skip}, async () => {
  const {page, context, problems} = await open({lang: 'en', board: JOBS});
  await openEpic(page);
  const chip = f => page.locator(`#panel [data-jfilter="${f}"]`);
  assert.deepEqual(await page.locator('#panel [data-jfilter]').evaluateAll(a => a.map(x => x.dataset.jfilter)), ['all', 'running', 'stopped', 'waiting-human', 'stale']);
  assert.equal(await chip('all').getAttribute('aria-pressed'), 'true');
  const listed = () => page.locator('#panel .egroup li a').evaluateAll(a => a.map(x => x.textContent));
  const all = (await listed()).length;
  await chip('stale').click();
  assert.equal(await chip('stale').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await listed(), []); // the stale job is the epic itself: it is not one of its own sub-issues
  await chip('waiting-human').click();
  assert.deepEqual(await listed(), ['Child b']); // #1802
  assert.equal((await listed()).length, 1);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-jfilter')), 'waiting-human', 'focus stays on the chip after the redraw');
  await chip('running').click();
  assert.equal((await listed()).length, 2); // 1801 and Admin 900
  await chip('stopped').click();
  assert.equal((await listed()).length, 1);
  await chip('all').click();
  assert.equal((await listed()).length, all);
  assert.deepEqual(problems, []);
  await context.close();
});

test('Jobs filter combines with the status filter and shows the empty state', {skip}, async () => {
  const {page, context} = await open({lang: 'en', board: JOBS});
  await openEpic(page);
  await page.locator('#panel [data-efilter="accepted"]').click();
  await page.locator('#panel [data-jfilter="running"]').click();
  assert.equal(await page.locator('#panel .egroup').count(), 0);
  assert.equal(await page.locator('#panel .estat').count(), 1);
  assert.ok(await page.locator('#panel .dmeta').first().isVisible());
  await context.close();
});

test('job-stale appears with a readable reason in the findings of the capability (EN, DE)', {skip}, async () => {
  for (const [lang, re] of [['en', /Agent job says running, but no update for 30 h \(limit 24 h\)/], ['de', /Agent-Job meldet "läuft", aber seit 30 Std\. keine Aktualisierung \(Grenze 24 Std\.\)/]]) {
    const {page, context} = await open({lang, board: JOBS});
    await page.locator('#tm .blk[data-id="chat"]').click();
    const box = page.locator('#panel .flist');
    await box.waitFor();
    assert.match(await box.innerText(), re);
    await context.close();
  }
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: badges, filter and pop-up fit, no horizontal overflow (light DE, dark EN)`, {skip}, async () => {
    for (const [scheme, lang] of [['light', 'de'], ['dark', 'en']]) {
      const {page, context, problems} = await open({width, scheme, lang, board: JOBS});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'cards: no overflow');
      await page.locator(EPIC).first().click();
      await page.locator('.pd .estat, #sheet .estat').first().waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'epic view: no overflow');
      const filt = page.locator('.jfilters').first();
      const box = await filt.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'filter row inside the viewport');
      await page.locator('[data-work^="epic:"].jobbadge').last().click();
      await page.waitForSelector('#workdlg[open]');
      const d = await page.locator('#workdlg').boundingBox();
      assert.ok(d.x >= 0 && d.x + d.width <= width + 1, 'dialog inside the viewport');
      assert.ok(await page.locator('#wkBody').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'dialog content does not overflow sideways');
      if (process.env.UA_SHOTS) await page.screenshot({path: `${process.env.UA_SHOTS}/jobs-${width}-${scheme}-${lang}.png`});
      await page.keyboard.press('Escape');
      assert.deepEqual(problems, []);
      await context.close();
    }
  });
}
