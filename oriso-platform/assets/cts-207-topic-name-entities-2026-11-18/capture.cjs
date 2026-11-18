const { chromium } = require('/Users/kio/Documents/GitHub/ORISO/ORISO-E2E/node_modules/playwright');
const out = process.argv[2];
const URL = 'https://dev.oriso.org/registration/topic-selection';
// Same mapping as changeset 0015 / the new InputSanitizer, applied to the live response.
const decode = (s) => s.replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&#43;/g, '+')
  .replace(/&#61;/g, '=').replace(/&#64;/g, '@').replace(/&#96;/g, '`')
  .replace(/&lt;|&gt;/g, '').replace(/&amp;/g, '&');
(async () => {
  const browser = await chromium.launch();
  const shoot = async (name, viewport, fixed) => {
    const ctx = await browser.newContext({ viewport, locale: 'de-DE' });
    const page = await ctx.newPage();
    const names = [];
    await page.route('**/service/topic-groups*', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      for (const item of body.data.items) { if (fixed) item.name = decode(item.name); names.push(item.name); }
      await route.fulfill({ response: res, json: body });
    });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.getByText(/Gesundheit/).first().waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/${name}.png` });
    const shown = await page.locator('body').innerText();
    console.log(name, JSON.stringify(names.filter(n => /Sucht|Krisen/.test(n))), 'pageHasAmpEntity=', shown.includes('&amp;'));
    await ctx.close();
  };
  await shoot('before-desktop-1440x900', { width: 1440, height: 900 }, false);
  await shoot('after-preview-desktop-1440x900', { width: 1440, height: 900 }, true);
  await shoot('after-preview-tablet-820x1180', { width: 820, height: 1180 }, true);
  await shoot('after-preview-mobile-390x844', { width: 390, height: 844 }, true);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
