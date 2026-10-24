// Health panel, "History" section in the rendered map: trend, past runs, "Compare with latest", links (ORISO-Docs#219). Strict CSP, same harness as map-health-render.test.mjs.
// health.json is built from real run records by the same builder the repository publishes with, so the page is tested against the real history format.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRunManifest} from '../../../../planning-map/lib/run-manifest.mjs';
import {parseCriteriaFile, validateCriteriaSet, resolveCriteria} from '../../../platform/lib/health-criteria.mjs';
import {CAPABILITY_IDS, CODE_REPOS} from '../../../platform/lib/capabilities.mjs';
import {buildRunRecord, buildHealthDoc} from '../../../platform/lib/health-run.mjs';

const hub = fileURLToPath(new URL('../', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures/map-data/', import.meta.url));
const playwrightPath = [process.env.UA_PLAYWRIGHT, '/opt/npm-tools/node_modules/playwright/index.mjs'].filter(Boolean).find(p => existsSync(p));
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json'};
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:";
const skip = playwrightPath ? false : 'Playwright not available (set UA_PLAYWRIGHT)';

const SHA1 = '1'.repeat(40), SHA2 = '2'.repeat(40), SHA3 = '3'.repeat(40);
const crit = validateCriteriaSet([parseCriteriaFile(`---
scope: "*"
metrics:
  size: {threshold: 400, weight: 1}
  test-ratio: {threshold: 0.5, weight: 2}
  lint: {threshold: 0, weight: 2}
  duplication: {threshold: 5, weight: 1}
---
x`, 'health/default.md')], {capabilityIds: CAPABILITY_IDS, repos: CODE_REPOS});
const effective = resolveCriteria(crit, {capability: 'chat', path: 'ORISO-Frontend/'});
const m = value => ({value, source: 'test', details: {}});
const rec = (capability, at, [size, ratio, lint, dup], commit, extra = {}) => buildRunRecord({
  manifest: createRunManifest({at, commits: {'ORISO-Frontend': commit}}), scope: {capability, repo: 'ORISO-Frontend', path: null}, commit, effective,
  measurements: {size: m(size), 'test-ratio': m(ratio), lint: m(lint), duplication: m(dup)}, model: extra.model ?? null, startedAt: at, verdict: extra.verdict ?? [],
});
const OLD = rec('chat', '2026-05-01T08:00:00Z', [900, 0.25, 4, 2.5], SHA1);
const MID = rec('chat', '2026-08-01T08:00:00Z', [600, 0.3, 2, 2.5], SHA2, {model: 'claude-test', verdict: [{criterion: 'maintainability', score: 40, weight: 1, reasons: ['Two 600 line files mix rendering and state.']}]});
const NEW = rec('chat', '2026-10-24T10:15:00Z', [300, 0.5, 0, 4], SHA3, {model: 'claude-test', verdict: [{criterion: 'maintainability', score: 70, weight: 1, reasons: ['Split into small files.']}]});
const SOLO = rec('case-handover', '2026-10-20T08:00:00Z', [900, 0.25, 4, 2.5], SHA1);
const HEALTH = JSON.stringify(buildHealthDoc([OLD, MID, NEW, SOLO]));

function serve({withHealth = true} = {}) {
  const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    res.setHeader('content-security-policy', CSP);
    if (url === '/map/data/health.json' && withHealth) { res.setHeader('content-type', types['.json']); return res.end(HEALTH); }
    if (url === '/map/data/links.json') {
      const links = JSON.parse(readFileSync(fixtures + 'links.json', 'utf8'));
      if (withHealth) links.optional = [...links.optional, 'health.json'];
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
  bare = await serve({withHealth: false}); bareOrigin = 'http://127.0.0.1:' + bare.address().port;
});
test.after(async () => { await browser?.close(); server?.close(); bare?.close(); });

const node = cap => '#view=health&node=' + encodeURIComponent('capability:' + cap);
const hist = page => page.locator('.hhist:visible').first();
async function showHistory(page, width) {
  if (width <= 980) await page.locator('#zbar [data-zdet]').click();
  await hist(page).waitFor();
}
const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const x = lum(rgb(a)), y = lum(rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('the trend renders under the strict CSP: one point per run, built by the page, no inline style, no console error', {skip}, async () => {
  const {page, context, problems} = await open(node('chat'), {lang: 'en'});
  await showHistory(page, 1440);
  const t = await page.evaluate(() => {
    const h = [...document.querySelectorAll('.hhist')].find(e => e.offsetParent !== null), svg = h.querySelector('svg.hh-svg'), r = svg.getBoundingClientRect();
    return {points: svg.querySelectorAll('circle.hh-pt').length, lines: svg.querySelectorAll('polyline.hh-line').length, w: r.width, hgt: r.height,
      inline: h.querySelectorAll('[style]').length, starts: [...svg.querySelectorAll('circle')].map(c => c.dataset.start),
      ys: [...svg.querySelectorAll('circle')].map(c => +c.getAttribute('cy')), fill: getComputedStyle(svg.querySelector('circle.hh-last')).fill,
      line: getComputedStyle(svg.querySelector('polyline')).stroke};
  });
  assert.equal(t.points, 3); assert.equal(t.lines, 1);
  assert.deepEqual(t.starts, [OLD.startedAt, MID.startedAt, NEW.startedAt]);
  assert.ok(t.w > 200 && t.hgt > 80, `the trend has a size: ${t.w}x${t.hgt}`);
  assert.ok(t.ys[0] > t.ys[2], 'the score rose from the first to the last run: the last point is higher on the page (smaller y)');
  assert.notEqual(t.fill, 'rgb(0, 0, 0)'); assert.notEqual(t.line, 'none');
  assert.equal(t.inline, 0);
  assert.deepEqual(problems, [], 'a CSP violation would show up as a console error');
  await context.close();
});

test('the list shows the runs newest first; each run links to its Understand node and to GitHub at its own commit', {skip}, async () => {
  const {page, context, problems} = await open(node('chat'), {lang: 'en'});
  await showHistory(page, 1440);
  const runs = await hist(page).locator('.hh-run').evaluateAll(els => els.map(e => ({
    start: e.dataset.runStart, text: e.querySelector('.hh-head').innerText, node: e.querySelector('[data-hh-node]')?.href, nodeRel: e.querySelector('[data-hh-node]')?.rel,
    src: e.querySelector('[data-hh-source]')?.href, target: e.querySelector('[data-hh-source]')?.target, cmp: !!e.querySelector('.hh-cmp'),
  })));
  assert.deepEqual(runs.map(r => r.start), [NEW.startedAt, MID.startedAt, OLD.startedAt]);
  assert.match(runs[0].text, /2026-10-24 10:15 UTC/); assert.match(runs[0].text, new RegExp(`Overall\\s+${NEW.overall}`)); assert.match(runs[0].text, /latest run/);
  for (const [r, sha] of [[runs[0], SHA3], [runs[1], SHA2], [runs[2], SHA1]]) {
    assert.match(r.node, /^https:\/\/understand\.oriso\.org\/supergraph\/\?token=[^&]+&node=capability%3Achat$/);
    assert.equal(r.src, `https://github.com/OpenResilienceInitiative/ORISO-Frontend/tree/${sha}`);
    assert.match(r.nodeRel, /noopener/); assert.equal(r.target, '_blank');
  }
  assert.deepEqual(runs.map(r => r.cmp), [false, true, true]);
  assert.deepEqual(problems, []);
  await context.close();
});

test('Compare with latest: the deltas in DE and EN, with direction and reasons', {skip}, async () => {
  for (const lang of ['en', 'de']) {
    const {page, context, problems} = await open(node('chat'), {lang});
    await showHistory(page, 1440);
    const mid = hist(page).locator('.hh-run[data-run-start="' + MID.startedAt + '"]');
    assert.equal(await mid.locator('details').evaluate(d => d.open), false, 'closed until asked for');
    await mid.locator('summary').click();
    const cmp = mid.locator('.hh-cmp');
    await cmp.locator('.hd-o').waitFor();
    const body = await cmp.innerText();
    assert.match(body, lang === 'en' ? /Compare with latest/ : /Mit letztem Lauf vergleichen/);
    const size = cmp.locator('[data-metric="size"]'), dup = cmp.locator('[data-metric="duplication"]'), read = cmp.locator('[data-criterion="maintainability"]');
    assert.equal(await size.getAttribute('data-direction'), 'better'); assert.equal(await dup.getAttribute('data-direction'), 'worse');
    assert.equal(await read.getAttribute('data-direction'), 'better');
    assert.match(await size.innerText(), /600 → 300/); assert.match(await size.innerText(), /−300/);
    assert.match(await size.innerText(), lang === 'en' ? /better/ : /besser/); assert.match(await dup.innerText(), lang === 'en' ? /worse/ : /schlechter/);
    assert.match(await dup.innerText(), lang === 'en' ? /2\.5 → 4/ : /2,5 → 4/);
    assert.match(await read.innerText(), /40 → 70/); assert.match(await read.innerText(), /\+30/);
    assert.match(await read.innerText(), /Split into small files\./);
    assert.match(await cmp.locator('.hd-o').innerText(), new RegExp(`${MID.overall}\\s*→\\s*${NEW.overall}`));
    assert.match(await cmp.locator('[data-cmp-counts]').innerText(), lang === 'en' ? /better, .* worse/ : /besser, .* schlechter/);
    assert.equal(await cmp.locator('[style]').count(), 0);
    assert.deepEqual(problems, []);
    await context.close();
  }
});

test('a square with a single run shows trend and run but nothing to compare; one without a record has no history; no health.json breaks nothing', {skip}, async () => {
  let o = await open(node('case-handover'), {lang: 'en'});
  await showHistory(o.page, 1440);
  assert.equal(await hist(o.page).locator('circle').count(), 1);
  assert.equal(await hist(o.page).locator('.hh-cmp').count(), 0);
  assert.match(await hist(o.page).innerText(), /No earlier run to compare with/);
  assert.deepEqual(o.problems, []); await o.context.close();
  o = await open(node('notifications'), {lang: 'en'});
  await o.page.waitForSelector('#panel #pdTitle');
  assert.equal(await o.page.locator('.hhist').count(), 0);
  await o.context.close();
  o = await open(node('chat'), {lang: 'en', base: bareOrigin});
  await o.page.waitForSelector('#panel #pdTitle');
  assert.equal(await o.page.locator('.hhist').count(), 0);
  assert.deepEqual(o.problems, []); await o.context.close();
});

test('the section fits 320, 390 and 1440 px, light and dark, DE and EN: no overflow, readable text, the compare view too', {skip}, async () => {
  for (const [width, lang, scheme] of [[320, 'en', 'light'], [320, 'de', 'dark'], [390, 'de', 'dark'], [390, 'en', 'light'], [1440, 'de', 'light'], [1440, 'en', 'dark']]) {
    const {page, context, problems} = await open(node('chat'), {width, lang, scheme});
    await showHistory(page, width);
    await hist(page).locator('.hh-run[data-run-start="' + OLD.startedAt + '"] summary').click();
    const o = await page.evaluate(() => {
      const h = [...document.querySelectorAll('.hhist')].find(e => e.offsetParent !== null), host = h.parentElement, score = h.querySelector('.hh-score'), line = h.querySelector('.hh-line');
      const svg = h.querySelector('svg').getBoundingClientRect(), pts = [...h.querySelectorAll('circle')].map(c => { const r = c.getBoundingClientRect(); return [r.left, r.right, r.top, r.bottom]; });
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth, box: h.scrollWidth - h.clientWidth, host: host.scrollWidth - host.clientWidth,
        inline: h.querySelectorAll('[style]').length, scoreBg: getComputedStyle(score).backgroundColor, scoreInk: getComputedStyle(score).color,
        boxBg: getComputedStyle(h).backgroundColor, boxInk: getComputedStyle(h).color, lineStroke: getComputedStyle(line).stroke,
        svgBg: getComputedStyle(h.querySelector('svg')).backgroundColor, inside: pts.every(([l, r, t, b]) => l >= svg.left - 1 && r <= svg.right + 1 && t >= svg.top - 1 && b <= svg.bottom + 1),
        label: getComputedStyle(h.querySelector('.hh-t')).fill, wide: [...h.querySelectorAll('.hh-run, .hd')].filter(e => e.scrollWidth > e.clientWidth + 1).length,
      };
    });
    const where = `${width}px ${lang} ${scheme}: ${JSON.stringify(o)}`;
    assert.ok(o.page <= 0 && o.box <= 0 && o.host <= 0 && o.wide === 0, where);
    assert.equal(o.inline, 0); assert.ok(o.inside, 'points stay inside the chart: ' + where);
    assert.ok(contrast(o.scoreInk, o.scoreBg) >= 4.5, `score chip ${where}`);
    assert.ok(contrast(o.boxInk, o.boxBg) >= 4.5, `panel text ${where}`);
    assert.ok(contrast(o.label, o.svgBg) >= 4.5, `axis labels ${where}`);
    assert.ok(contrast(o.lineStroke, o.svgBg) >= 3, `trend line ${where}`);
    assert.deepEqual(problems, []);
    await context.close();
  }
});
