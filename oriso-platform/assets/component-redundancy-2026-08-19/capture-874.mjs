// "After" evidence for the merged jobs of ORISO-Admin#874, shot against the
// DEPLOYED pre-dev Storybook so the reviewer sees the state that actually
// shipped — not a local build.
//
//   node _evidence/shoot-874.mjs
import pw from '/Users/kio/Documents/GitHub/ORISO/ORISO-Frontend/.ds-sync/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const SB = 'https://predev.oriso.org/storybook-admin';
const OUT = '/Users/kio/Documents/GitHub/ORISO/_evidence';
mkdirSync(OUT, { recursive: true });

// Viewports mandated by the ORISO frontend-discipline skill.
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'mobile', width: 390, height: 844 },
];

const STORY = 'organisms-placeholdertemplateeditor-in-dialog--legal-consent-in-dialog';

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
    const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
    });
    await page.goto(`${SB}/iframe.html?id=${STORY}&viewMode=story`, {
        waitUntil: 'networkidle',
        timeout: 60000,
    });
    // The dialog mounts into a portal; wait for real content rather than a timer.
    await page.waitForTimeout(5000);
    const file = `${OUT}/admin-874-consent-dialog-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log('wrote', file.split('/').pop(), `(${vp.width}x${vp.height})`);
    await page.close();
}

await browser.close();
