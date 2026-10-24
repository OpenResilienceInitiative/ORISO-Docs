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

export function measureLint({ root, files }) {
  const na = reason => ({ value: null, source, details: { reason } });
  if (!hasLinterConfig(root)) return na('no linter configuration (eslint) in the checkout');
  const bin = join(root, 'node_modules/.bin/eslint');
  if (!existsSync(bin)) return na('eslint is not installed in the checkout (node_modules/.bin/eslint)');
  const targets = files.filter(p => LINT_EXT.includes(extOf(p)) && !p.split('/').slice(0, -1).some(s => OUT.has(s)));
  if (!targets.length) return na('no JavaScript or TypeScript files in scope');
  const perFile = new Map();
  for (let i = 0; i < targets.length; i += BATCH) {
    const batch = targets.slice(i, i + BATCH);
    let out;
    try {
      out = execFileSync(bin, ['--format', 'json', '--no-error-on-unmatched-pattern', '--', ...batch],
        { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 300000, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      if (e.status === 1 && e.stdout) out = e.stdout; // 1 = findings
      else return na(`eslint failed: ${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 200)}`);
    }
    let results;
    try { results = JSON.parse(out); } catch { results = null; }
    if (!Array.isArray(results)) return na('eslint did not print a JSON result list');
    for (const r of results) {
      const file = isAbsolute(r.filePath) ? relative(root, r.filePath) : r.filePath;
      perFile.set(file, (perFile.get(file) ?? 0) + (Array.isArray(r.messages) ? r.messages.length : 0));
    }
  }
  const total = [...perFile.values()].reduce((a, b) => a + b, 0);
  const worst = [...perFile].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10).map(([file, findings]) => ({ file, findings }));
  return { value: total, source: `${source}, ${targets.length} files`, details: { files: targets.length, worst } };
}
