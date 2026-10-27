// Metric runner: one fixture repository per metric (ORISO-Docs#218, epic #213).
// Seam: measureScope() in lib/health-measure/index.mjs, plus the pure helpers of the CRAP and e-mail checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync as require_exists } from 'node:fs';
import { mkRepo, lines, RULES } from './health-fixture.mjs';
import { measureScope } from '../lib/health-measure/index.mjs';
import { functionsOf } from '../lib/health-measure/crap.mjs';
import { checkHtml, checkText, linksOf } from '../lib/health-measure/email.mjs';
import { tokenize } from '../lib/health-measure/duplication.mjs';

const base = { repo: 'ORISO-Frontend', rules: RULES };
const run = (root, metrics, extra = {}) => measureScope({ ...base, root, scope: { capability: 'chat', path: null }, metrics, ...extra });

// ---------------------------------------------------------------- size and test ratio
test('size: the largest production file of the capability, in lines; other capabilities, tests and styles do not count', () => {
  const root = mkRepo({
    'src/chat/a.ts': lines(10), 'src/chat/b.ts': lines(25), 'src/chat/b.test.ts': lines(900), 'src/chat/b.scss': lines(900, i => `.a${i}{}`),
    'src/other/x.ts': lines(500), 'README.md': lines(900, () => 'x'),
  });
  const r = run(root, ['size']);
  assert.equal(r.size.value, 25);
  assert.deepEqual(r.size.details.largest, [{ file: 'src/chat/b.ts', lines: 25 }, { file: 'src/chat/a.ts', lines: 10 }]);
  assert.equal(r.size.details.files, 2);
  assert.match(r.size.source, /size/);
});

test('a folder scope narrows the files', () => {
  const root = mkRepo({ 'src/chat/a.ts': lines(10), 'src/chat/sub/b.ts': lines(25) });
  const r = measureScope({ ...base, root, scope: { capability: 'chat', path: 'src/chat/sub' }, metrics: ['size'] });
  assert.equal(r.size.value, 25); assert.equal(r.size.details.files, 1);
});

test('size: no production file is "not available", never 0', () => {
  const root = mkRepo({ 'src/chat/readme.md': 'x', 'src/other/a.ts': lines(5) });
  const r = run(root, ['size', 'test-ratio']);
  assert.equal(r.size.value, null); assert.match(r.size.details.reason, /no production code/);
  assert.equal(r['test-ratio'].value, null);
});

test('test-ratio: test lines per production line; no tests at all is a measured 0', () => {
  const root = mkRepo({ 'src/chat/a.ts': lines(20), 'src/chat/b.ts': lines(20), 'src/chat/a.test.ts': lines(6), 'src/chat/__tests__/b.ts': lines(4), 'src/other/z.test.ts': lines(99) });
  const r = run(root, ['test-ratio']);
  assert.equal(r['test-ratio'].value, 0.25);
  assert.deepEqual([r['test-ratio'].details.productionLines, r['test-ratio'].details.testLines], [40, 10]);
  const none = run(mkRepo({ 'src/chat/a.ts': lines(20) }), ['test-ratio']);
  assert.equal(none['test-ratio'].value, 0);
});

// ---------------------------------------------------------------- lint
const FAKE_ESLINT = `#!/usr/bin/env node
// stand-in for eslint: one finding per line that contains "debugger", JSON format like eslint --format json
const fs = require('fs');
const files = process.argv.slice(process.argv.indexOf('--') + 1);
const out = files.map(f => ({ filePath: f, messages: fs.readFileSync(f, 'utf8').split('\\n').filter(l => l.includes('debugger')).map((_, i) => ({ ruleId: 'no-debugger', severity: 2, line: i + 1 })), errorCount: 0, warningCount: 0 }));
process.stdout.write(JSON.stringify(out));
process.exitCode = out.some(o => o.messages.length) ? 1 : 0;
`;
test('lint: without a linter configuration the metric is not available, never 0', () => {
  const r = run(mkRepo({ 'src/chat/a.ts': 'debugger;\n' }), ['lint']);
  assert.equal(r.lint.value, null); assert.match(r.lint.details.reason, /no linter configuration/);
});
test('lint: a configuration without an installed eslint is not available and says so', () => {
  const r = run(mkRepo({ '.eslintrc.json': '{}', 'src/chat/a.ts': 'debugger;\n' }), ['lint']);
  assert.equal(r.lint.value, null); assert.match(r.lint.details.reason, /eslint is not installed/);
});
test('lint: with configuration and eslint, findings of the scope files are counted (other capabilities are not linted)', () => {
  const root = mkRepo({
    'eslint.config.js': 'export default [];', 'node_modules/.bin/eslint': FAKE_ESLINT,
    'src/chat/a.ts': 'debugger;\nok();\ndebugger;\n', 'src/chat/b.tsx': 'debugger;\n', 'src/chat/c.ts': 'fine();\n', 'src/chat/D.java': 'debugger;\n', 'src/other/x.ts': 'debugger;\n',
  });
  const r = run(root, ['lint']);
  assert.equal(r.lint.value, 3);
  assert.equal(r.lint.details.files, 3);
  assert.deepEqual(r.lint.details.worst, [{ file: 'src/chat/a.ts', findings: 2 }, { file: 'src/chat/b.tsx', findings: 1 }]);
});
test('lint: zero findings with a working linter is a measured 0; a linter that crashes is not available', () => {
  const clean = mkRepo({ '.eslintrc.json': '{}', 'node_modules/.bin/eslint': FAKE_ESLINT, 'src/chat/a.ts': 'ok();\n' });
  assert.equal(run(clean, ['lint']).lint.value, 0);
  const crash = mkRepo({ '.eslintrc.json': '{}', 'node_modules/.bin/eslint': '#!/usr/bin/env node\nconsole.error("Oops, config broken");process.exit(2);', 'src/chat/a.ts': 'ok();\n' });
  const r = run(crash, ['lint']);
  assert.equal(r.lint.value, null); assert.match(r.lint.details.reason, /Oops, config broken/);
});

// ORISO-Docs#213 review, finding 10: the scheduled job holds the model secret, so the checkout's own eslint (code of the
// measured repository) is never executed there. checkoutTools: false makes lint "not available" with that reason.
test('lint: with checkoutTools false the checkout\'s eslint is never executed; the metric is not available and says why', () => {
  const root = mkRepo({ '.eslintrc.json': '{}', 'node_modules/.bin/eslint': '#!/usr/bin/env node\nrequire("fs").writeFileSync(__dirname + "/../../RAN", "x");process.stdout.write("[]");', 'src/chat/a.ts': 'debugger;\n' });
  const r = run(root, ['lint'], { checkoutTools: false });
  assert.equal(r.lint.value, null);
  assert.match(r.lint.details.reason, /not run in the scheduled workflow/);
  assert.equal(r.lint.details.state, 'ci-setup');
  assert.ok(!require_exists(path.join(root, 'RAN')), 'the stand-in eslint did not run');
});
// ---------------------------------------------------------------- duplication
const block = (n, tag) => lines(n, i => `x${i} = call${i}(arg${i});`).replace(/^/, `// ${tag}\n`);
test('duplication: a block of 20 lines that appears in two files is 40 of 80 code lines', () => {
  const root = mkRepo({
    'src/chat/a.ts': block(20, 'one') + lines(10, i => `uniqueA${i}();`),
    'src/chat/b.ts': '/* different comment */\n' + block(20, 'two') + lines(30, i => `uniqueB${i}();`),
    'src/other/c.ts': block(20, 'three'),
  });
  const r = run(root, ['duplication']);
  assert.equal(r.duplication.value, 50);
  assert.deepEqual([r.duplication.details.duplicatedLines, r.duplication.details.codeLines], [40, 80]);
  assert.equal(r.duplication.details.windowTokens, 50);
});
test('duplication: nothing repeated is a measured 0; a short repeat below the window is not a duplicate', () => {
  const root = mkRepo({ 'src/chat/a.ts': lines(30, i => `a${i}();`), 'src/chat/b.ts': lines(30, i => `b${i}();`) + 'shared(1, 2);\n' });
  assert.equal(run(root, ['duplication']).duplication.value, 0);
  assert.equal(run(mkRepo({ 'src/chat/a.md': 'x' }), ['duplication']).duplication.value, null);
});
test('duplication: code repeating inside one file counts, but a window does not match itself', () => {
  const rep = lines(20, i => `y${i} = f${i}(z${i});`);
  assert.equal(run(mkRepo({ 'src/chat/a.ts': rep + 'sep();\n' + rep }), ['duplication']).duplication.value > 0, true);
  assert.equal(run(mkRepo({ 'src/chat/a.ts': 'q();\n'.repeat(30) }), ['duplication']).duplication.value > 0, true, 'a repeated statement is a repeat');
  assert.equal(run(mkRepo({ 'src/chat/a.ts': 'q();\n'.repeat(5) }), ['duplication']).duplication.value, 0, 'five repeats are shorter than one window');
});
test('tokenizer drops comments and whitespace and keeps strings whole', () => {
  assert.deepEqual(tokenize('a = "x y"; // note\n/* c */ b(1)').map(t => t.t), ['a', '=', '"x y"', ';', 'b', '(', '1', ')']);
  assert.deepEqual(tokenize('a\n\nb').map(t => t.line), [1, 3]);
});

// ---------------------------------------------------------------- crap
test('complexity: cyclomatic number per function from the AST; nested functions count for themselves only', () => {
  const src = [
    'export function simple(a){ return a+1; }',
    'export function branchy(a,b){',
    '  if(a&&b){ return 1; }',
    '  for(let i=0;i<a;i++){ if(i%2){ b++; } }',
    '  return a||b ? 1 : 2;',
    '}',
    'class C { m(x){ switch(x){ case 1: return 1; case 2: return 2; default: return 0; } } }',
    'const f = (a) => a ?? 3;',
    'function outer(a){ if(a){ return () => { if(a>1){ return 1; } return 2; }; } return 0; }',
  ].join('\n');
  const fns = Object.fromEntries(functionsOf(src, 'x.ts').map(f => [f.name, f]));
  assert.deepEqual([fns.simple.complexity, fns.simple.line, fns.simple.endLine], [1, 1, 1]);
  assert.deepEqual([fns.branchy.complexity, fns.branchy.line, fns.branchy.endLine], [7, 2, 6]);
  assert.equal(fns.m.complexity, 3);
  assert.equal(fns.f.complexity, 2);
  assert.equal(fns.outer.complexity, 2);
  assert.equal(functionsOf(src, 'x.ts').find(f => f.name === '<anonymous>').complexity, 2);
  assert.deepEqual(functionsOf('const el = <div onClick={() => { if (a) go(); }} />;', 'x.tsx').map(f => f.complexity), [2]);
});

const CRAP_SRC = [
  'export function simple(a){ return a+1; }',
  'export function branchy(a,b){',
  '  if(a&&b){ return 1; }',
  '  for(let i=0;i<a;i++){ if(i%2){ b++; } }',
  '  return a||b ? 1 : 2;',
  '}', '',
].join('\n');
const lcov = root => `TN:\nSF:${root}/src/chat/a.ts\nDA:1,1\nDA:3,1\nDA:4,0\nDA:5,0\nDA:6,1\nend_of_record\n`;
test('crap: complexity against line coverage from an lcov file; the value is the worst function', () => {
  const root = mkRepo({ 'src/chat/a.ts': CRAP_SRC, 'src/chat/a.test.ts': 'it();' });
  const cov = path.join(root, 'coverage-lcov.info');
  require_write(cov, lcov(root));
  const r = run(root, ['crap'], { coverage: cov });
  // branchy: complexity 7, 2 of 4 lines covered: 7^2 * 0.5^3 + 7 = 13.125
  assert.equal(r.crap.value, 13.13);
  assert.deepEqual(r.crap.details.worst[0], { file: 'src/chat/a.ts', name: 'branchy', line: 2, complexity: 7, coverage: 50, crap: 13.13 });
  assert.deepEqual(r.crap.details.worst[1], { file: 'src/chat/a.ts', name: 'simple', line: 1, complexity: 1, coverage: 100, crap: 1 });
  assert.equal(r.crap.details.functions, 2);
  assert.match(r.crap.source, /coverage-lcov\.info/);
});
test('crap: istanbul coverage-final.json gives the same result; relative paths work too', () => {
  const root = mkRepo({ 'src/chat/a.ts': CRAP_SRC });
  const stmt = (line, hits, id) => [id, { start: { line, column: 0 }, end: { line, column: 5 } }, hits];
  const rows = [stmt(1, 1, '0'), stmt(3, 1, '1'), stmt(4, 0, '2'), stmt(5, 0, '3'), stmt(6, 1, '4')];
  const file = { path: 'src/chat/a.ts', statementMap: Object.fromEntries(rows.map(([id, loc]) => [id, loc])), s: Object.fromEntries(rows.map(([id, , h]) => [id, h])), fnMap: {}, f: {}, branchMap: {}, b: {} };
  const cov = path.join(root, 'coverage-final.json');
  require_write(cov, JSON.stringify({ [path.join(root, 'src/chat/a.ts')]: file }));
  assert.equal(run(root, ['crap'], { coverage: cov }).crap.value, 13.13);
  require_write(cov, JSON.stringify({ 'src/chat/a.ts': file }));
  assert.equal(run(root, ['crap'], { coverage: cov }).crap.value, 13.13);
});
test('crap: no coverage file is the "no coverage" state, not a score; files the report does not know are listed, not zeroed', () => {
  const root = mkRepo({ 'src/chat/a.ts': CRAP_SRC, 'src/chat/b.ts': 'export function lone(a){ if(a){ return 1; } return 2; }\n' });
  const none = run(root, ['crap']);
  assert.equal(none.crap.value, null); assert.match(none.crap.details.reason, /no coverage/);
  assert.equal(none.crap.details.state, 'no-coverage');
  const cov = path.join(root, 'cov.info'); require_write(cov, lcov(root));
  const r = run(root, ['crap'], { coverage: cov });
  assert.equal(r.crap.value, 13.13);
  assert.deepEqual(r.crap.details.filesWithoutCoverage, ['src/chat/b.ts']);
  const missing = run(root, ['crap'], { coverage: path.join(root, 'nope.info') });
  assert.equal(missing.crap.value, null); assert.match(missing.crap.details.reason, /cannot read/);
});
test('crap: a coverage report that knows none of the files is not available', () => {
  const root = mkRepo({ 'src/chat/a.ts': CRAP_SRC });
  const cov = path.join(root, 'cov.info'); require_write(cov, 'SF:/elsewhere/z.ts\nDA:1,1\nend_of_record\n');
  const r = run(root, ['crap'], { coverage: cov });
  assert.equal(r.crap.value, null); assert.match(r.crap.details.reason, /no function with coverage data/);
});
import fs from 'node:fs';
function require_write(p, c) { fs.writeFileSync(p, c); }

// ---------------------------------------------------------------- e-mail templates
const GOOD_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Hello [[\${name}]]</title>
<!--[if mso]><style>td{font-family:Arial}</style><![endif]-->
<style>a{color:red}</style></head>
<body><table><tr><td th:if="\${a > b}"><img src="logo.png" alt=""><br>
<a href="https://example.org/start">Start</a> <a href="[[\${link}]]">Link</a> <a href="#" th:href="@{\${url}}">Url</a>
<a href="mailto:help@example.org">Help</a></td></tr></table></body></html>
`;
const mailRepo = files => mkRepo(Object.fromEntries(Object.entries(files).map(([k, v]) => ['src/emails/dist/thymeleaf/' + k, v])));
const mail = (root, metrics) => measureScope({ ...base, root, scope: { capability: 'notifications', path: null }, metrics });
const MAILS = ['email-render', 'email-links', 'email-languages'];

test('email html: well-formed templates pass (comments, void tags, quotes holding ">", style blocks)', () => {
  assert.deepEqual(checkHtml(GOOD_HTML), []);
});
test('email html: unclosed tags, stray closing tags, broken placeholders and empty files fail', () => {
  assert.match(checkHtml('<table><tr><td>x</td></tr>').join(), /<table> is not closed/);
  assert.match(checkHtml('<p>x</p></div>').join(), /unexpected <\/div>/);
  assert.match(checkHtml('<p>[[${name}</p>').join(), /placeholder/);
  assert.match(checkHtml('<p>${name</p>').join(), /placeholder/);
  assert.match(checkHtml('<#if a><p>x</p>').join(), /<#if>/);
  assert.deepEqual(checkHtml('<#if a><p>${a}</p><#else><p>b</p></#if>'), []);
  assert.match(checkHtml('  \n').join(), /empty/);
  assert.match(checkText('Hello ${name').join(), /placeholder/);
  assert.deepEqual(checkText('Hello [[${name}]]'), []);
});
test('email links: placeholders are fine, empty, "#", relative, javascript: and malformed links are broken', () => {
  const html = (...hrefs) => hrefs.map(h => `<a href="${h}">x</a>`).join('');
  const bad = hrefs => linksOf(html(...hrefs), 'html').filter(l => l.problem).map(l => l.problem);
  assert.deepEqual(bad(['https://example.org/a', '[[${u}]]', '${u}', 'mailto:a@b.org', 'tel:+4930123']), []);
  assert.equal(bad(['']).length, 1); assert.equal(bad(['#']).length, 1); assert.equal(bad(['/relative']).length, 1);
  assert.equal(bad(['javascript:void(0)']).length, 1); assert.equal(bad(['https://exa mple.org']).length, 1);
  assert.equal(bad(['https://example.org/undefined']).length, 1);
  assert.deepEqual(linksOf('<a href="#" th:href="@{${u}}">x</a>', 'html').map(l => l.problem), [null], 'th:href replaces the static fallback');
  assert.deepEqual(linksOf('See https://example.org/x and https://exa mple.org', 'txt').map(l => l.url), ['https://example.org/x', 'https://exa']);
});
test('email metrics over a template folder: failing templates, broken links, language variants', () => {
  const root = mailRepo({
    'en/welcome.html': GOOD_HTML, 'en/welcome.txt': 'Hello [[${name}]] https://example.org/start',
    'de-du/welcome.html': GOOD_HTML, 'de-du/welcome.txt': 'Hallo ${name',
    'de-sie/welcome.html': GOOD_HTML.replace('</table>', '').replace('href="https://example.org/start"', 'href=""'),
  });
  const r = mail(root, MAILS);
  assert.equal(r['email-render'].value, 2); // de-du txt (placeholder) and de-sie html (table not closed)
  assert.deepEqual(r['email-render'].details.failures.map(f => f.file).sort(), ['src/emails/dist/thymeleaf/de-du/welcome.txt', 'src/emails/dist/thymeleaf/de-sie/welcome.html']);
  assert.equal(r['email-render'].details.templates, 5);
  assert.equal(r['email-links'].value, 1);
  assert.deepEqual(r['email-links'].details.broken[0], { file: 'src/emails/dist/thymeleaf/de-sie/welcome.html', link: '', reason: 'empty link' });
  assert.equal(r['email-languages'].value, 3);
  assert.deepEqual(r['email-languages'].details.present, ['de-du', 'de-sie', 'en']);
  assert.deepEqual(r['email-languages'].details.missing, { welcome: ['fr', 'ru', 'ti', 'tr'] });
  assert.match(r['email-render'].source, /static/);
});
test('email languages: templates outside any variant folder are not a count of 0 variants', () => {
  const r = mail(mailRepo({ 'welcome.html': GOOD_HTML }), MAILS);
  assert.equal(r['email-render'].value, 0);
  assert.equal(r['email-languages'].value, null); assert.match(r['email-languages'].details.reason, /no language variant folders/);
});
test('email metrics: a scope without templates is not available, never 0 broken', () => {
  const r = measureScope({ ...base, root: mkRepo({ 'src/chat/a.ts': 'x' }), scope: { capability: 'chat', path: null }, metrics: MAILS });
  for (const n of MAILS) { assert.equal(r[n].value, null); assert.match(r[n].details.reason, /no e-mail templates/); }
});

test('an unknown metric name is refused', () => {
  assert.throws(() => run(mkRepo({ 'src/chat/a.ts': 'x' }), ['cyclomatic']), /unknown metric/);
});
