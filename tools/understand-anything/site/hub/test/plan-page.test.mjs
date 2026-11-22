// Page contract of the planning moves (ORISO-Docs#210): shipped, CSP-clean, accessible.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const page = read('map/index.html'), js = read('map/map.js'), ui = read('map/plan-ui.js'), pub = read('publication.mjs');

test('plan-ui.js loads before map.js and is published with the map', () => {
  assert.ok(page.indexOf('/map/plan-ui.js') > 0 && page.indexOf('/map/plan-ui.js') < page.indexOf('/map/map.js'));
  assert.match(pub, /plan-ui\\\.js/); // allowed pattern
  assert.match(pub, /'map\/plan-ui\.js'/); // static input
});

test('the move dialog is labelled and the log is a polite live region, all without inline style or script', () => {
  assert.match(page, /<dialog id="movedlg" aria-labelledby="mvTitle"/);
  assert.match(page, /id="planlog" role="status" aria-live="polite"/);
  assert.ok(!/\sstyle\s*=/i.test(page));
  assert.ok(!/style="/.test(js) && !/style="/.test(ui));
  assert.ok(!/eval\(|new Function|innerHTML\s*=\s*[^;]*onclick/.test(js + ui));
});

test('the page itself never talks to GitHub: writes go through window.PlanningTransport only', () => {
  assert.match(js, /window\.PlanningTransport/);
  assert.ok(!/api\.github\.com|graphql/i.test(js + ui));
});

test('both ways in reach the same dialog: drop on a release card and the "Move to release…" button', () => {
  assert.match(js, /addEventListener\('drop'[\s\S]{0,200}openMove\(/);
  assert.match(js, /data-move=/);
  assert.match(js, /Move to release…/);
});
