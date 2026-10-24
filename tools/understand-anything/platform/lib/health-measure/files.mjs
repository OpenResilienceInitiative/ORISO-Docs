// Which files belong to a scope, and what kind of file each is (ORISO-Docs#218).
// Scope = capability inside one repository checkout, optionally narrowed to a folder. The capability comes from the
// reviewed rules (capabilities.mjs), exactly as the map assigns it, so a metric covers the files the square shows.
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isProductionFile, resolveFile, CapabilityError } from '../capabilities.mjs';

export const CODE_EXT = ['.java', '.ts', '.tsx', '.js', '.jsx'];
export const JS_EXT = ['.ts', '.tsx', '.js', '.jsx'];
const WALK_SKIP = new Set(['.git', 'node_modules', 'coverage', 'storybook-static', 'target']);
const OUT_SEGMENTS = new Set(['node_modules', '.git', 'build', 'dist', 'target', 'generated', 'coverage', 'storybook-static']);
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export const extOf = p => { const f = p.slice(p.lastIndexOf('/') + 1), i = f.lastIndexOf('.'); return i < 0 ? '' : f.slice(i); };
export const isTestFile = p => /(^|\/)(__tests__|tests?|cypress)\//.test(p) || /\.(test|spec|cy)\.[jt]sx?$/.test(p) || /(Test|Tests|IT)\.java$/.test(p);
export const isProductionCode = (repo, p) => CODE_EXT.includes(extOf(p)) && isProductionFile(repo, p) && !isTestFile(p);
export const isTestCode = p => CODE_EXT.includes(extOf(p)) && isTestFile(p)
  && !p.split('/').slice(0, -1).some(s => OUT_SEGMENTS.has(s)) && !p.includes('.stories.') && !p.endsWith('.d.ts');

function walk(root, rel, out) {
  for (const name of readdirSync(join(root, rel)).sort()) {
    if (WALK_SKIP.has(name)) continue;
    const p = rel ? `${rel}/${name}` : name, st = lstatSync(join(root, p));
    if (st.isSymbolicLink()) continue; // never follow a link out of the checkout
    if (st.isDirectory()) walk(root, p, out); else if (st.isFile() && st.size <= MAX_FILE_BYTES) out.push(p);
  }
  return out;
}

// Sorted repository-relative paths of the scope.
export function scopeFiles({ root, repo, scope, rules }) {
  const prefix = scope.path === null || scope.path === undefined ? null : scope.path + '/';
  return walk(root, '', []).filter(p => {
    if (prefix && !p.startsWith(prefix)) return false;
    try { return resolveFile(rules, repo, p).capability === scope.capability; }
    catch (e) { if (e instanceof CapabilityError && e.code === 'unmatched') return false; throw e; }
  });
}

export const readText = (root, p) => readFileSync(join(root, p), 'utf8');
// Physical lines, like wc -l: a trailing newline does not start a new line.
export function countLines(text) {
  if (text === '') return 0;
  const n = text.split('\n').length;
  return text.endsWith('\n') ? n - 1 : n;
}
