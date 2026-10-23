// The browser suite must not pass silently in the browser job (review of ORISO-Docs#210): without Playwright
// it skips, but fails when UA_PLAYWRIGHT_REQUIRED=1 (set by ua-tooling.yml, which installs Playwright).
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const suite = fileURLToPath(new URL('./map-render.test.mjs', import.meta.url));
const run = (extra) => {
  const env = {...process.env, UA_PLAYWRIGHT: '/nonexistent/playwright/index.mjs', ...extra};
  delete env.NODE_TEST_CONTEXT;
  if (!('UA_PLAYWRIGHT_REQUIRED' in extra)) delete env.UA_PLAYWRIGHT_REQUIRED;
  return spawnSync(process.execPath, ['--test', '--test-name-pattern=map renders the three groups', suite], {env, encoding: 'utf8'});
};

test('without Playwright the map-render suite is skipped (local runs and CI jobs without a browser)', () => {
  const r = run({CI: 'true'});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /# skipped [1-9]/);
});

test('without Playwright the map-render suite fails where a browser is required', () => {
  const r = run({UA_PLAYWRIGHT_REQUIRED: '1'});
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stdout + r.stderr, /Playwright/);
});
