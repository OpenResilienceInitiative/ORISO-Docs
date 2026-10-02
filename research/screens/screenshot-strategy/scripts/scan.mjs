import { chromium } from '/Users/frankgerhardt/ORISO/ORISO-E2E/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const S = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad/';
const idx = JSON.parse(fs.readFileSync(S + 'idx-admin.json')).entries;
const all = Object.values(idx).filter((e) => e.type === 'story').map((e) => e.id);
const N = Number(process.argv[2] || 40);
const step = Math.floor(all.length / N);
const pick = Array.from({ length: N }, (_, i) => all[i * step]);
const t0 = Date.now();
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage();
let hits = [], fails = 0, els = 0;
for (const id of pick) {
  try {
    await p.goto('https://dev.oriso.org/storybook-admin/iframe.html?viewMode=story&id=' + id, { waitUntil: 'load' });
    await p.waitForSelector('#storybook-root > *, #storybook-root *', { timeout: 8000 });
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      let n = 0, hit = 0;
      for (const el of document.querySelectorAll('#storybook-root *, body [role="dialog"] *')) {
        n++;
        const cs = getComputedStyle(el);
        if ([cs.color, cs.backgroundColor, cs.borderTopColor, cs.fill].includes('rgb(65, 0, 1)')) hit++;
      }
      return { n, hit };
    });
    els += r.n;
    if (r.hit) hits.push(id + ' x' + r.hit);
  } catch (e) { fails++; }
}
await b.close();
const ms = Date.now() - t0;
console.log(JSON.stringify({ stories: N, of: all.length, ms, msPerStory: Math.round(ms / N), elements: els, fails, hits }, null, 1));
