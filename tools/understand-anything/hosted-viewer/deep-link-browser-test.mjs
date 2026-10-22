// Real pinned dashboard (Vite dev server) with a synthetic graph: ?node= deep links (ORISO-Docs#199).
// node deep-link-browser-test.mjs --upstream DIR --playwright PATH/index.mjs
// Not run in CI (needs the installed upstream); the pure helpers are covered by deep-link.test.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const option = key => { const i = process.argv.indexOf(key); if (i < 0 || !process.argv[i + 1]) throw Error(`${key} required`); return path.resolve(process.argv[i + 1]); };
const upstream = fs.realpathSync(option('--upstream'));
const {chromium} = await import(pathToFileURL(option('--playwright')));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'deep-link-'));
const graphDir = path.join(temp, 'graph');
fs.mkdirSync(path.join(graphDir, '.understand-anything'), {recursive: true});

const FILE = 'ORISO-UserService::file:src/main/java/x/A.java';
const FOLDER = 'ORISO-UserService::folder:src/main/java/x';
const CAP = 'capability:case-handover';
const node = (id, type, name, extra = {}) => ({id, type, name, summary: 'Synthetic deep-link fixture.', tags: [], complexity: 'simple', ...extra});
const graph = {
  version: '1.0.0',
  project: {name: 'fixture', description: 'Synthetic', languages: [], frameworks: [], analyzedAt: '2026-10-23T00:00:00Z', gitCommitHash: null},
  nodes: [node(CAP, 'concept', 'Fallübergabe'), node(FOLDER, 'module', 'x'), node(FILE, 'file', 'A.java', {filePath: 'src/main/java/x/A.java'})],
  edges: [{source: CAP, target: FOLDER, type: 'contains', direction: 'forward', weight: 1}, {source: FOLDER, target: FILE, type: 'contains', direction: 'forward', weight: 1}],
  layers: [], tour: []
};
fs.writeFileSync(path.join(graphDir, '.understand-anything/knowledge-graph.json'), JSON.stringify(graph));
const port = 19000 + Math.floor(Math.random() * 10000), token = 'synthetic-deep-link';
const child = spawn('npm', ['exec', '--yes', '--package=pnpm@10.6.2', '--', 'pnpm', '--dir', upstream, '--filter', '@understand-anything/dashboard', 'dev', '--host', '127.0.0.1', '--port', String(port)],
  {stdio: 'ignore', detached: true, env: {...process.env, UNDERSTAND_ACCESS_TOKEN: token, GRAPH_DIR: graphDir}});
let browser;
try {
  for (let n = 0; n < 150; n++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
  browser = await chromium.launch({headless: true});
  const open = async (query, width = 1280) => {
    const page = await browser.newPage({viewport: {width, height: 900}});
    await page.goto(`http://127.0.0.1:${port}/?token=${token}${query}`);
    return page;
  };
  for (const [id, name] of [[FILE, 'A.java'], [FOLDER, 'x'], [CAP, 'Fallübergabe']]) {
    const page = await open('&node=' + encodeURIComponent(id));
    await page.getByRole('heading', {name, exact: true}).first().waitFor({timeout: 20000}).catch(async e => { console.error((await page.locator('body').innerText()).slice(0, 800)); throw e; });
    const link = page.getByRole('link', {name: /Auf der Karte zeigen/});
    await link.waitFor({timeout: 8000}).catch(async e => { console.error((await page.locator('body').innerText()).slice(0, 1500)); await page.screenshot({path: '/tmp/claude-0/-home-claude/2e7f3ff0-2896-5c0d-bef2-60d39474d338/scratchpad/dl.png'}); throw e; });
    assert.equal(await link.getAttribute('href'), '/map/#node=' + encodeURIComponent(id));
    assert.equal(await page.getByTestId('deep-link-not-found').count(), 0);
    await page.close();
  }
  for (const width of [390, 1280]) {
    const page = await open('&node=' + encodeURIComponent('ORISO-UserService::file:nope.java'), width);
    const note = page.getByTestId('deep-link-not-found');
    await note.waitFor({timeout: 20000});
    assert.match(await note.innerText(), /nicht gefunden \/ Node not found/);
    assert.match(await note.innerText(), /nope\.java/);
    const m = await page.evaluate(() => ({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth}));
    assert.ok(m.s <= m.c, `horizontal scroll at ${width}`);
    await page.close();
  }
  console.log('Deep links: capability, folder and file ids focus their node and link back to the map; unknown id shows a not-found notice at 390 and 1280 px.');
} finally {
  await browser?.close();
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  fs.rmSync(temp, {recursive: true, force: true});
}
