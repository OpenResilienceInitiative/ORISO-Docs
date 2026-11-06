// Run checkout-controlled tooling without exposing the host plan, tooling, credentials or artifact channels.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { scopeFiles, extOf } from './health-measure/files.mjs';

export const IMAGE = 'node@sha256:f6f56d63a2f4faaec7b1298e2fc833873c6dfb773dff85d9b0886803089d7db7';
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const excluded = new Set(['node_modules', '.git', 'build', 'dist', 'target', 'generated', 'coverage', 'storybook-static']);
const maxReport = 100 * 1024 * 1024;

export function lintTargets({ checkout, scope, rules }) {
  return scopeFiles({ root: checkout, repo: scope.repo, scope, rules }).filter(p =>
    extensions.has(extOf(p)) && !p.split('/').slice(0, -1).some(x => excluded.has(x)));
}

// Reports are untrusted input; reject unknown/duplicate paths, omissions and malformed records.
export function validateLintReport(report, targets) {
  if (!Array.isArray(report)) throw new Error('invalid lint report');
  const expected = new Set(targets), seen = new Set();
  if (report.length !== targets.length) throw new Error('incomplete lint report');
  return report.map(r => {
    if (!r || typeof r.filePath !== 'string' || !r.filePath.startsWith('/work/') || !Array.isArray(r.messages)) throw new Error('invalid lint entry');
    const filePath = r.filePath.slice(6);
    if (!expected.has(filePath) || seen.has(filePath)) throw new Error('unexpected lint entry');
    seen.add(filePath);
    return { filePath, messages: r.messages.map(() => ({})) };
  });
}

export function normalizeCoverage(data, checkout) {
  if (!data || Array.isArray(data) || typeof data !== 'object' || !Object.keys(data).length) throw new Error('invalid coverage report');
  const root = realpathSync(checkout) + sep, result = {};
  for (const [key, entry] of Object.entries(data)) {
    const path = entry?.path ?? key;
    if (typeof path !== 'string' || !path.startsWith('/work/') || key !== path) throw new Error('invalid coverage path');
    const relative = path.slice(6);
    const candidate = resolve(realpathSync(checkout), relative);
    const actual = realpathSync(candidate);
    if (!actual.startsWith(root) || actual !== candidate) throw new Error('coverage escapes checkout');
    if (!entry.statementMap || !entry.s || typeof entry.statementMap !== 'object' || typeof entry.s !== 'object') throw new Error('invalid coverage statements');
    for (const [id, loc] of Object.entries(entry.statementMap)) {
      if (!Number.isInteger(loc?.start?.line) || loc.start.line < 1 || !Number.isSafeInteger(entry.s[id]) || entry.s[id] < 0) throw new Error('invalid coverage hits');
    }
    result[actual] = { path: actual, statementMap: entry.statementMap, s: entry.s };
  }
  return result;
}

function container(volume, args, network = 'none', source = null, readOnlyVolume = false) {
  const name = `health-${randomUUID()}`;
  const options = ['run', '--rm', '--name', name, '--network', network, '--read-only', '--tmpfs', '/tmp:rw,nosuid,nodev,size=512m', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=256', '--memory=6g',
    '--user', `${process.getuid()}:${process.getgid()}`, '--env', 'HOME=/tmp', '--mount', `type=volume,src=${volume},dst=/work,volume-nocopy${readOnlyVolume ? ",readonly" : ""}`,
    ...(source ? ['--mount', `type=bind,src=${source},dst=/input,readonly`] : []), '--workdir', '/work', IMAGE, ...args];
  try { return spawnSync('docker', options, { encoding: 'utf8', timeout: 30 * 60 * 1000, maxBuffer: maxReport }); }
  finally { spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore', timeout: 30000 }); }
}

// Each bounded tmpfs is specific to one repository and contains only its pinned clone.
// Source and reports from that repository are visible, but not other repository outputs,
// the host checkout, the plan, or workflow credentials.
export function isolatedMeasurements({ checkout, scope, scopes = [scope], rules, tempRoot = tmpdir() }) {
  const scratch = mkdtempSync(join(tempRoot, 'health-scope-'));
  let lintReport = null, coverageData = null;
  const volume = `health-${randomUUID()}`, anchor = `${volume}-anchor`;
  try {
    const create = spawnSync('docker', ['volume', 'create', '--driver', 'local', '--opt', 'type=tmpfs', '--opt', 'device=tmpfs',
      '--opt', `o=size=4g,uid=${process.getuid()},gid=${process.getgid()}`, volume], { stdio: 'ignore', timeout: 30000 });
    if (create.status !== 0) return { lintReport, coverageData };
    // Keep the tmpfs mounted between phases; Docker otherwise discards it when the last container exits.
    const started = spawnSync('docker', ['run', '-d', '--name', anchor, '--network', 'none', '--read-only', '--cap-drop=ALL',
      '--security-opt=no-new-privileges', '--pids-limit=8', '--memory=32m', '--user', `${process.getuid()}:${process.getgid()}`,
      '--mount', `type=volume,src=${volume},dst=/work,volume-nocopy`, IMAGE, 'sleep', '3600'], { stdio: 'ignore', timeout: 30000 });
    if (started.status !== 0) return { lintReport, coverageData };
    // A local clone carries the actual pinned Git identity required by existing test reporters. It copies
    // repository objects, not host credentials; remove the local path remote before giving it to the container.
    const gitEnv = { PATH: process.env.PATH, HOME: '/nonexistent', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
    const localGit = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { stdio: 'ignore', env: gitEnv });
    localGit('clone', '--quiet', '--local', '--no-hardlinks', '--no-checkout', checkout, scratch);
    const commit = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    localGit('-C', scratch, 'checkout', '--quiet', '--detach', commit);
    localGit('-C', scratch, 'remote', 'remove', 'origin');
    const copy = container(volume, ['cp', '-R', '/input/.', '/work/'], 'none', scratch);
    if (copy.status !== 0) return { lintReport, coverageData };
    const install = container(volume, ['npm', 'ci', '--ignore-scripts', '--legacy-peer-deps'], 'bridge');
    if (install.status !== 0) return { lintReport, coverageData };
    const targets = [...new Set(scopes.flatMap(s => lintTargets({ checkout, scope: s, rules })))].sort();
    if (targets.length) {
      const entries = [];
      for (let i = 0; i < targets.length; i += 100) {
        const batch = targets.slice(i, i + 100);
        const lint = container(volume, ['./node_modules/.bin/eslint', '--format', 'json', '--no-error-on-unmatched-pattern', '--', ...batch]);
        if (lint.status !== 0 && lint.status !== 1) break;
        try { entries.push(...validateLintReport(JSON.parse(lint.stdout), batch)); } catch { break; }
      }
      if (entries.length === targets.length) lintReport = entries;
    }
    const command = { 'ORISO-Frontend': 'test:unit', 'ORISO-Admin': 'test:shard' }[scope.repo];
    if (command) {
      const test = container(volume, ['npm', 'run', command, '--', '--coverage', '--coverage.reporter=json']);
      if (test.status === 0) {
        try {
          // The collector runs only the pinned image's Node binary. The tmpfs volume is read-only;
          // it never executes or imports any file from the measured checkout.
          const script = `const fs=require('node:fs');const p='/work/coverage/coverage-final.json';const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>${maxReport}||!fs.realpathSync(p).startsWith('/work/'))process.exit(2);process.stdout.write(fs.readFileSync(p));`;
          const report = container(volume, ['node', '-e', script], 'none', null, true);
          if (report.status !== 0) throw new Error('coverage collector failed');
          coverageData = normalizeCoverage(JSON.parse(report.stdout), checkout);
        } catch { /* a failed or invalid report is unavailable, never zero */ }
      }
    }
    return { lintReport, coverageData };
  } finally {
    spawnSync('docker', ['rm', '-f', anchor], { stdio: 'ignore', timeout: 30000 });
    spawnSync('docker', ['volume', 'rm', '-f', volume], { stdio: 'ignore', timeout: 30000 });
    rmSync(scratch, { recursive: true, force: true });
  }
}
