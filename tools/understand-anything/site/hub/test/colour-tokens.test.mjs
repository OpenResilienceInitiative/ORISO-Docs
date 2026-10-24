// Contract for the shared colour tokens (ORISO-Docs#202): text contrast on every fill,
// lightness steps along each ramp (also under colour-vision-deficiency simulation),
// and the generated CSS staying in sync with the JSON export.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contrast, lightness, simulate} from './colour-math.mjs';
import {renderTokensCss} from '../build-tokens.mjs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const tokens = JSON.parse(read('../assets/tokens.json'));
const MODES = ['light', 'dark'];
const resolve = (name, mode) => {
  let t = tokens.tokens[name];
  while (t.alias) t = tokens.tokens[t.alias];
  return t[mode];
};
const names = Object.keys(tokens.tokens);

test('every token group from the ticket is present', () => {
  for (const n of ['origin-unchanged', 'origin-reworked', 'origin-commissioned', 'origin-additional',
    'test-new', 'test-old', 'deleted', 'plan-not-started', 'plan-in-progress',
    'status-backlog', 'status-ready', 'status-on-hold', 'status-in-progress', 'status-in-review',
    'status-qa-internal', 'status-qa-external', 'status-done']) assert.ok(tokens.tokens[n], n);
});

test('board statuses: neutral ones share the planned grey, blue ones the planned blue', () => {
  for (const n of ['status-backlog', 'status-ready', 'status-on-hold']) assert.equal(tokens.tokens[n].alias, 'plan-not-started');
  for (const n of ['status-in-progress', 'status-in-review']) assert.equal(tokens.tokens[n].alias, 'plan-in-progress');
});

for (const mode of MODES) {
  const surface = tokens.surface[mode];
  test(`${mode}: text on every solid fill reaches WCAG AA (4.5:1)`, () => {
    for (const n of names) {
      const t = resolve(n, mode);
      if (tokens.tokens[n].kind === 'hatch') continue;
      assert.ok(contrast(t.on, t.fill) >= 4.5, `${n} ${mode}: ${t.on} on ${t.fill} = ${contrast(t.on, t.fill).toFixed(2)}`);
    }
  });
  test(`${mode}: hatch stripes and edges reach 3:1 against the surface (WCAG 1.4.11)`, () => {
    for (const n of names) {
      const t = resolve(n, mode);
      if (tokens.tokens[n].kind === 'hatch') assert.ok(contrast(t.fill, surface) >= 3, `${n} stripe ${contrast(t.fill, surface).toFixed(2)}`);
      if (t.edge) assert.ok(contrast(t.edge, surface) >= 3, `${n} edge ${contrast(t.edge, surface).toFixed(2)}`);
    }
  });
  test(`${mode}: ink on the surface reaches AA`, () => {
    assert.ok(contrast(tokens.ink[mode], surface) >= 4.5);
  });
}

// Minimum CIE L* difference between neighbouring steps of one ramp.
const MIN_STEP = 12;
for (const [ramp, steps] of Object.entries(tokens.ramps)) {
  for (const mode of MODES) {
    for (const sim of [null, 'deuteranopia', 'protanopia']) {
      test(`ramp ${ramp} (${mode}${sim ? ', ' + sim : ''}): neighbouring steps differ by >= ${MIN_STEP} L*, direction is monotone`, () => {
        const L = steps.map(n => lightness(sim ? simulate(resolve(n, mode).fill, sim) : resolve(n, mode).fill));
        const dir = Math.sign(L[1] - L[0]);
        for (let i = 1; i < L.length; i++) {
          assert.equal(Math.sign(L[i] - L[i - 1]), dir, `${ramp} ${mode} not monotone: ${L.map(v => v.toFixed(0))}`);
          assert.ok(Math.abs(L[i] - L[i - 1]) >= MIN_STEP, `${steps[i - 1]} -> ${steps[i]} ${mode} ${sim}: ${Math.abs(L[i] - L[i - 1]).toFixed(1)} L*`);
        }
      });
    }
  }
}

test('ramps only reference existing tokens, and the origin ramp is ordered old to additional', () => {
  for (const steps of Object.values(tokens.ramps)) for (const n of steps) assert.ok(tokens.tokens[n], n);
  assert.deepEqual(tokens.ramps.origin, ['origin-unchanged', 'origin-reworked', 'origin-commissioned', 'origin-additional']);
  assert.deepEqual(tokens.ramps.board, ['status-qa-internal', 'status-qa-external', 'status-done']);
});

test('tokens.css is generated from tokens.json (no drift) and defines light, dark and forced-dark', () => {
  const css = read('../assets/tokens.css');
  assert.equal(css, renderTokensCss(tokens));
  assert.match(css, /@media \(prefers-color-scheme: dark\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  for (const n of names) assert.ok(css.includes(`--ua-${n}`), n);
});

test('every token has DE and EN labels for the hub legend', () => {
  for (const n of names) for (const l of ['de', 'en']) assert.ok(tokens.tokens[n].label?.[l], `${n} ${l}`);
});

test('the hub loads the token file before hub.css and documents the scheme in DE and EN', () => {
  const html = read('../index.html');
  assert.ok(html.indexOf('/assets/tokens.css') > -1 && html.indexOf('/assets/tokens.css') < html.indexOf('/assets/hub.css'));
  assert.match(html, /id="colour-scheme"/);
  for (const n of names) assert.ok(html.includes(`--ua-${n}`) || html.includes(`data-token="${n}"`), `legend lacks ${n}`);
  assert.match(html, /<span lang="de">Farbschema<\/span>/);
  assert.match(html, /<span lang="en">Colour scheme<\/span>/);
});
