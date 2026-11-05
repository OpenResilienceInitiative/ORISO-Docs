// lint (ORISO-Docs#218): findings of the checkout's own eslint. Only when the checkout has a linter configuration
// and eslint installed; otherwise the metric is "not available" with the reason, never 0.
// The checkout's eslint (and its config) is executed, so only run it on checkouts you trust. No shell is involved.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute, relative } from 'node:path';
import { extOf } from './files.mjs';

const LINT_EXT = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const OUT = new Set(['node_modules', '.git', 'build', 'dist', 'target', 'generated', 'coverage', 'storybook-static']);
const CONFIGS = ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml',
  'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts'];
const BATCH = 100;
const source = 'eslint --format json (the checkout\'s own configuration)';

export function hasLinterConfig(root) {
  if (CONFIGS.some(c => existsSync(join(root, c)))) return true;
  try { return 'eslintConfig' in JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch { return false; }
}

export const CI_NO_CHECKOUT_TOOLS = 'not run in the scheduled workflow: the checkout\'s own eslint is never executed in the job that holds the model secret (run health-run.mjs run on a trusted checkout to score lint)';
// checkoutTools: false = never execute anything of the checkout (scheduled runs, ORISO-Docs#220): "not available", state ci-setup.
export function measureLint({ root, files, checkoutTools = true, lintReport = null }) {
  const na = (reason, extra = {}) => ({ value: null, source, details: { reason, ...extra } });
  if (!checkoutTools && !lintReport) return na(CI_NO_CHECKOUT_TOOLS, { state: 'ci-setup' });
  if (!hasLinterConfig(root)) return na('no linter configuration (eslint) in the checkout');
  const bin = join(root, 'node_modules/.bin/eslint');
  if (!lintReport && !existsSync(bin)) return na('eslint is not installed in the checkout (node_modules/.bin/eslint)');
  const targets = files.filter(p => LINT_EXT.includes(extOf(p)) && !p.split('/').slice(0, -1).some(s => OUT.has(s)));
  if (!targets.length) return na('no JavaScript or TypeScript files in scope');
  const perFile = new Map();
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    let out;
    try {
      out = lintReport ? JSON.stringify(lintReport.filter(r => batch.includes(r.filePath))) : execFileSync(bin, ['--format', 'json', '--no-error-on-unmatched-pattern', '--', ...batch],
        { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      if (e.status === 1 && e.stdout) out = e.stdout; // 1 = findings
      else return na(`eslint failed: ${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 200)}`);
    }
    let results;
    try { results = JSON.parse(out); } catch { results = null; }
    if (!Array.isArray(results)) return na('eslint did not print a JSON result list');
    const expected = new Set(batch);
    const reported = new Set();
    for (const r of results) {
      if (!r || typeof r.filePath !== 'string' || !Array.isArray(r.messages)) return na('eslint returned an invalid file result');
      const file = (isAbsolute(r.filePath) ? relative(root, r.filePath) : r.filePath).replaceAll('\\', '/').replace(/^\.\//, '');
      if (!expected.has(file) || reported.has(file)) return na('eslint returned an unexpected or duplicate file result');
      reported.add(file);
      perFile.set(file, r.messages.length);
    }
    if (reported.size !== expected.size) return na('eslint did not report every target');
  }
  const total = [...perFile.values()].reduce((a, b) => a + b, 0);
  const worst = [...perFile].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10).map(([file, findings]) => ({ file, findings }));
  return { value: total, source: `${source}, ${targets.length} files`, details: { files: targets.length, worst } };
}
