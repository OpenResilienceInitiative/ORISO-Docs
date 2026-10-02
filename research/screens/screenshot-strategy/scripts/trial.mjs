import { chromium } from '/Users/frankgerhardt/ORISO/ORISO-E2E/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const S = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad/trial/';
fs.mkdirSync(S, { recursive: true });
const BASE = 'https://dev.oriso.org/storybook-admin/iframe.html?viewMode=story&id=';
const stories = ['molecules-sidescrollerfooter--both-active', 'molecules-sidescrollerfooter--forward-only', 'molecules-sidescrollerfooter--header-rail'];
const viewports = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } };
const SWAP = 'button[class*="_active_"]{background:var(--admin-nav-indicator-surface) !important}';
const CONTROL = 'button[class*="_active_"]{background:#4a0a0b !important}';
const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke', 'box-shadow', 'text-decoration-color', 'opacity', 'caret-color'];

const snap = (sel) => {
  const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke', 'box-shadow', 'text-decoration-color', 'opacity', 'caret-color'];
  const out = {};
  const root = document.querySelector(sel);
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of PROPS) o[p] = cs.getPropertyValue(p);
    out[path] = o;
    [...el.children].forEach((c, i) => walk(c, path + '/' + c.tagName.toLowerCase() + '[' + i + ']'));
  };
  walk(root, 'root');
  return out;
};

const t0 = Date.now();
const b = await chromium.launch();
const tLaunch = Date.now() - t0;
const results = [];
for (const [vpName, vp] of Object.entries(viewports)) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const id of stories) {
    const t = Date.now();
    await p.goto(BASE + id, { waitUntil: 'load' });
    await p.waitForSelector('#storybook-root *');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.addStyleTag({ content: '*,*::before,*::after{transition:none !important;animation:none !important;caret-color:transparent !important}' });
    const tLoad = Date.now() - t;
    const name = id.split('--')[1] + '-' + vpName;
    const t1 = Date.now();
    const before = await p.evaluate(snap, '#storybook-root');
    await p.screenshot({ path: S + name + '-before.png' });
    const tBefore = Date.now() - t1;
    for (const [variant, css] of [['after', SWAP], ['control', CONTROL]]) {
      const t2 = Date.now();
      const h = await p.addStyleTag({ content: css });
      await p.waitForTimeout(50);
      const after = await p.evaluate(snap, '#storybook-root');
      await p.screenshot({ path: S + name + '-' + variant + '.png' });
      await h.evaluate((n) => n.remove());
      const diffs = [];
      for (const k of Object.keys(before)) for (const pr of PROPS) if (before[k][pr] !== after[k]?.[pr]) diffs.push({ k, pr, from: before[k][pr], to: after[k]?.[pr] });
      results.push({ story: name, variant, elements: Object.keys(before).length, styleDiffs: diffs, ms: { load: tLoad, before: tBefore, afterAndDiff: Date.now() - t2 } });
    }
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(S + 'results.json', JSON.stringify({ totalMs: Date.now() - t0, launchMs: tLaunch, results }, null, 1));
console.log('total ms', Date.now() - t0, 'launch', tLaunch);
for (const r of results) console.log(r.story, r.variant, 'elements', r.elements, 'styleDiffs', r.styleDiffs.length, JSON.stringify(r.ms), r.styleDiffs[0] ? JSON.stringify(r.styleDiffs[0]) : '');
