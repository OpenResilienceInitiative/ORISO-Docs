// Builds one labelled "current state" contact sheet per redundancy issue by
// embedding the LIVE pre-dev Storybook story iframes and screenshotting the
// composed page. Live iframes (not re-rendered copies) so the evidence is the
// deployed component, not a local approximation.
//
// Run from the workspace root:
//   node _evidence/shoot.mjs
import pw from '/Users/kio/Documents/GitHub/ORISO/ORISO-Frontend/.ds-sync/node_modules/playwright/index.js';
const { chromium } = pw;
import { mkdirSync } from 'node:fs';

const SB = 'https://predev.oriso.org/storybook-admin';
const OUT = '/Users/kio/Documents/GitHub/ORISO/_evidence';
mkdirSync(OUT, { recursive: true });

const sheets = [
    {
        file: 'admin-821-buttons.png',
        title: 'ORISO-Admin — five button implementations in production today',
        note: 'Call sites (production files, stories and tests excluded): antd Button 26 · M3Button 22 · legacy button/Button 6 · EditButton 6 · MUI Button 3',
        cells: [
            { label: 'M3Button — KEEP candidate', sub: 'Atoms/M3Button', ids: ['atoms-m3button--filled', 'atoms-m3button--outlined', 'atoms-m3button--text'] },
            { label: 'Legacy button/Button', sub: 'Atoms/Button · 6 call sites', ids: ['atoms-button--primary', 'atoms-button--secondary', 'atoms-button--tertiary'] },
            { label: 'EditButton', sub: 'Atoms/EditButton · 6 call sites', ids: ['atoms-editbutton--default', 'atoms-editbutton--icon-only', 'atoms-editbutton--disabled'] },
            { label: 'IconButton', sub: 'Atoms/IconButton · only 2 variants, no outlined/tonal', ids: ['atoms-iconbutton--filled', 'atoms-iconbutton--standard', 'atoms-iconbutton--disabled'] },
        ],
    },
    {
        file: 'admin-822-switches.png',
        title: 'ORISO-Admin — the antd/M3 switch migration is frozen as a runtime flag',
        note: 'FormSwitchField/index.tsx:64 branches on switchVariant === "m3" AT RUNTIME. Both code paths must be maintained and tested forever.',
        cells: [
            { label: 'FormSwitchField — antd path', sub: 'switchVariant="antd"', ids: ['atoms-formswitchfield--antd-variant'] },
            { label: 'FormSwitchField — M3 path', sub: 'switchVariant="m3"', ids: ['atoms-formswitchfield--m-3-variant'] },
            { label: 'M3Switch — KEEP candidate', sub: 'Atoms/M3Switch', ids: ['atoms-m3switch--off', 'atoms-m3switch--on', 'atoms-m3switch--disabled'] },
        ],
    },
    {
        file: 'admin-823-textfields.png',
        title: 'ORISO-Admin — three generations of text field, side by side',
        note: 'Hand-built (3 files) → antd + floating label (FloatingLabelInput 10 / FormInputField 8) → MUI-v9-inside-antd-Form (MuiFormField 11), plus 13 files using raw antd Input.',
        cells: [
            { label: 'InputField — hand-built', sub: 'Atoms/InputField', ids: ['atoms-inputfield--default', 'atoms-inputfield--filled', 'atoms-inputfield--password'] },
            { label: 'FormInputField — antd + floating label', sub: 'Atoms/FormInputField', ids: ['atoms-forminputfield--default', 'atoms-forminputfield--required', 'atoms-forminputfield--disabled'] },
            { label: 'MuiFormField — KEEP candidate', sub: 'still antd-coupled via Form', ids: ['atoms-muiformfield-filled-filledleadingonly--input-text', 'atoms-muiformfield-filled-filledleadingonly--label-text'] },
            { label: 'FloatingLabelSelect', sub: 'Atoms/FloatingLabelSelect', ids: ['atoms-floatinglabelselect--resting', 'atoms-floatinglabelselect--filled'] },
        ],
    },
    {
        file: 'admin-1157-typography.png',
        title: 'ORISO — typography: 128 legacy call sites against 32 modern ones',
        note: 'Headline (52 call sites) uses NO M3 tokens. Text (76). Typography (32). Verdict deliberately left UNCLEAR: this is a project, and the canon decision is a human one.',
        cells: [
            { label: 'Headline — 52 call sites, no M3 tokens', sub: 'Atoms/Headline', ids: ['atoms-headline--level-1', 'atoms-headline--level-2', 'atoms-headline--level-3'] },
        ],
    },
];

const CSS = `
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background:#f6f6f7; color:#1b1b1f; }
  .page { padding: 28px 32px 36px; }
  h1 { font-size: 22px; margin: 0 0 6px; letter-spacing:-0.01em; }
  .note { font-size: 13px; line-height:1.5; color:#44474a; margin: 0 0 22px; max-width: 1180px; }
  .cell { background:#fff; border:1px solid #d7d8db; border-radius:14px; margin-bottom:16px; overflow:hidden; }
  .cellhead { padding: 10px 16px; border-bottom:1px solid #e6e7e9; }
  .cellhead .l { font-size: 14px; font-weight:600; }
  .cellhead .s { font-size: 12px; color:#6b6f73; margin-top:2px; }
  .row { display:flex; gap:0; flex-wrap:nowrap; }
  .shot { flex:1 1 0; min-width:0; border-right:1px solid #eceded; }
  .shot:last-child { border-right:0; }
  .shot iframe { width:100%; height:120px; border:0; display:block; background:#fff; }
  .cap { font-size:11px; color:#8a8e92; padding:6px 10px; border-top:1px solid #f0f0f1; font-family: ui-monospace, monospace; }
  .foot { font-size:11px; color:#8a8e92; margin-top:18px; }
`;

const html = (sheet) => `<style>${CSS}</style>
<div class="page">
  <h1>${sheet.title}</h1>
  <p class="note">${sheet.note}</p>
  ${sheet.cells
      .map(
          (c) => `<div class="cell">
      <div class="cellhead"><div class="l">${c.label}</div><div class="s">${c.sub}</div></div>
      <div class="row">
        ${c.ids
            .map(
                (id) => `<div class="shot">
              <iframe src="${SB}/iframe.html?id=${id}&viewMode=story" loading="eager"></iframe>
              <div class="cap">${id}</div>
            </div>`,
            )
            .join('')}
      </div>
    </div>`,
      )
      .join('')}
  <p class="foot">Live stories: ${SB}/ — captured ${process.argv[2] ?? 'on the deployed pre-dev Storybook'}</p>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

for (const sheet of sheets) {
    await page.setContent(html(sheet), { waitUntil: 'load' });
    // Give the embedded story iframes time to boot their own Storybook runtime.
    await page.waitForTimeout(6000);
    const box = await page.locator('.page').boundingBox();
    await page.screenshot({ path: `${OUT}/${sheet.file}`, clip: box });
    console.log('wrote', sheet.file);
}

await browser.close();
