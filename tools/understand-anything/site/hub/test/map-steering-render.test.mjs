// Health panel, Steering section in the rendered map under the strict CSP (ORISO-Docs#221): XSS, layout, DE/EN, light/dark.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {loadCriteria, buildCriteriaDoc} from '../../../platform/lib/health-criteria.mjs';
import {loadRules, CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';
const CRITERIA = JSON.stringify(buildCriteriaDoc(loadCriteria(undefined, {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS}), loadRules()));
const CHAT = 'capability:chat', MAIL = 'capability:email-templates';
const ISSUE = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/300';
const PAYLOAD = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script><a href="javascript:window.__xss=3">x</a>"\'&amp;';
const cm = (author, d, body, over = {}) => ({author, createdAt: `2026-10-${d}T08:30:00Z`, url: `${ISSUE}#issuecomment-${d}`, authorAssociation: 'MEMBER', body, truncated: false, ...over});
const STEERING = JSON.stringify({schemaVersion: 1, generatedAt: '2026-10-24T12:00:00Z', source: {repository: 'OpenResilienceInitiative/ORISO-Docs', label: 'area-steering', allowedAssociations: ['OWNER', 'MEMBER', 'COLLABORATOR']},
  capabilities: {chat: {issue: {number: 300, url: ISSUE, title: 'Steering: Chat', state: 'OPEN'}, skipped: 2, omitted: 0, comments: [
    cm('frank', '20', 'Look at error handling first. ' + 'verylongwordwithoutbreaks'.repeat(12)), cm('nikunj', '22', PAYLOAD), cm('hassan', '21', 'middle note', {authorAssociation: 'COLLABORATOR'}),
    cm('outsider', '23', 'outside voice must not show', {authorAssociation: 'NONE'})]}}, warnings: []});

function serve({withSteering = true} = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    if (url === '/map/data/criteria.json') { res.setHeader('content-type', types['.json']); return res.end(CRITERIA); }
    if (url === '/map/data/steering.json' && withSteering) { res.setHeader('content-type', types['.json']); return res.end(STEERING); }
    if (url === '/map/data/links.json') {
      const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));
      links.optional = [...links.optional, 'criteria.json', ...(withSteering ? ['steering.json'] : [])];
      res.setHeader('content-type', types['.json']); return res.end(JSON.stringify(links));
    }
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
  bare = await serve({withSteering: false}); bareOrigin = 'http://127.0.0.1:' + bare.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); bare?.close(); });

const sec = page => page.locator('.steer:visible').first();
async function showSection(page, width) {
  if (width <= 980) await page.locator('#zbar [data-zdet]').click();
  await sec(page).waitFor();
}

test('member comments render newest first, escaped; an outside comment never shows; no script ran', {skip}, async () => {
  const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(CHAT), {lang: 'en'});
  await sec(page).waitFor();
  const authors = await page.locator('.steer .steer-m strong').allInnerTexts();
  assert.deepEqual(authors, ['nikunj', 'hassan', 'frank']);
  const body = await sec(page).innerText();
  assert.match(body, /<img src=x onerror="window\.__xss=1">/, 'markup is visible as text');
  assert.doesNotMatch(body, /outside voice/);
  assert.equal(await page.locator('.steer img, .steer script, .steer a[href^="javascript"]').count(), 0);
  assert.equal(await page.evaluate(() => window.__xss), undefined, 'no payload executed');
  assert.match(await page.locator('.steer .steer-m').first().innerText(), /2026-10-22/);
  const add = page.locator('.steer [data-steer-add]');
  assert.equal(await add.getAttribute('href'), ISSUE + '#new_comment_field');
  assert.equal(await add.getAttribute('target'), '_blank'); assert.match(await add.getAttribute('rel'), /noopener/);
  assert.equal((await add.innerText()).replace(' ↗', ''), 'Add a comment on GitHub');
  assert.deepEqual(problems, []);
  await context.close();
});

test('German labels and date; the criteria box comes first and the steering section follows it', {skip}, async () => {
  const {page, context} = await open('#view=health&node=' + encodeURIComponent(CHAT), {lang: 'de'});
  await sec(page).waitFor();
  const t = await sec(page).innerText();
  assert.match(t, /Steuerung/); assert.match(t, /22\.10\.2026/); assert.match(t, /Kommentar auf GitHub hinzufügen/);
  const order = await page.evaluate(() => { const c = document.querySelector('.crit'), s = document.querySelector('.steer'); return !!(c.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); });
  assert.equal(order, true);
  await context.close();
});

test('an area without a steering issue shows the exact command and no link', {skip}, async () => {
  const {page, context} = await open('#view=health&node=' + encodeURIComponent(MAIL), {lang: 'en'});
  await sec(page).waitFor();
  assert.equal((await page.locator('.steer [data-steer-cmd]').innerText()), 'node tools/planning-map/steering.mjs ensure --capability email-templates --apply');
  assert.equal(await page.locator('.steer [data-steer-add]').count(), 0);
  await context.close();
});

test('without a published steering.json the section still shows the command and nothing breaks', {skip}, async () => {
  const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(CHAT), {lang: 'en', base: bareOrigin});
  await sec(page).waitFor();
  assert.match(await page.locator('.steer [data-steer-cmd]').innerText(), /ensure --capability chat --apply/);
  assert.deepEqual(problems, []);
  await context.close();
});

test('the section is only in Health', {skip}, async () => {
  const {page, context} = await open('#view=health&node=' + encodeURIComponent(CHAT), {lang: 'en'});
  await sec(page).waitFor();
  await page.click('#viewSwitch [data-mview="state"]');
  assert.equal(await page.locator('.steer').count(), 0);
  await page.click('#viewSwitch [data-mview="plan"]');
  assert.equal(await page.locator('.steer').count(), 0);
  await context.close();
});

test('fits 320, 390 and 1440 px, light and dark, DE and EN, no overflow, no inline styles', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [390, 'de', 'dark'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open('#view=health&node=' + encodeURIComponent(CHAT), {width, lang, scheme});
    await showSection(page, width);
    const o = await page.evaluate(() => {
      const s = [...document.querySelectorAll('.steer')].find(e => e.offsetParent !== null), host = s.parentElement;
      const b = s.querySelector('.steer-b');
      return {page: document.documentElement.scrollWidth - document.documentElement.clientWidth, box: s.scrollWidth - s.clientWidth, host: host.scrollWidth - host.clientWidth,
        inline: s.querySelectorAll('[style]').length, bg: getComputedStyle(s).backgroundColor, ink: getComputedStyle(b).color,
        cbg: getComputedStyle(s.querySelector('.steer-c')).backgroundColor, tap: s.querySelector('[data-steer-add]').getBoundingClientRect().height};
    });
    assert.ok(o.page <= 0 && o.box <= 0 && o.host <= 0, `${width}px: ${JSON.stringify(o)}`);
    assert.equal(o.inline, 0);
    assert.notEqual(o.cbg, o.ink, 'text differs from its background');
    assert.ok(o.tap >= 32, 'the link is tappable');
    assert.deepEqual(problems, []);
    await context.close();
  }
});
