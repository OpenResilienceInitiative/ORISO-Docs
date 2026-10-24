// duplication (ORISO-Docs#218): share of code lines that lie in a repeated window of 50 tokens.
// Production code of the scope; comments, whitespace and import lines are ignored; identifiers are NOT normalised,
// so a renamed copy is not found (a simple, auditable measure, not a clone detector). A window counts as repeated when
// the same 50 tokens occur in another file or at least 50 tokens further in the same file.
import { createHash } from 'node:crypto';
import { isProductionCode, readText } from './files.mjs';

export const WINDOW = 50;
const TOKEN = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\[\s\S])*`|[A-Za-z_$][\w$]*|\d[\w.]*|\S/g;

// -> [{ t: token text, line: 1-based line }]
export function tokenize(src) {
  const out = [];
  let line = 1, last = 0;
  for (const m of src.matchAll(TOKEN)) {
    line += (src.slice(last, m.index).match(/\n/g) || []).length;
    last = m.index;
    const t = m[0];
    if (!t.startsWith('//') && !t.startsWith('/*')) out.push({ t, line });
    line += (t.match(/\n/g) || []).length;
    last = m.index + t.length;
  }
  return out;
}
const blank = s => s.replace(/[^\n]/g, '');
const stripImports = src => src
  .replace(/^[ \t]*import\s[^;]*?\bfrom\s+['"][^'"]+['"];?/gm, blank)
  .replace(/^[ \t]*(?:import|package)\s[^;\n]*;/gm, blank)
  .replace(/^[ \t]*import\s+['"][^'"]+['"];?/gm, blank);

export function measureDuplication({ root, repo, files }) {
  const source = `health-run duplication: ${WINDOW}-token window hash over production code`;
  const docs = files.filter(p => isProductionCode(repo, p)).map(file => ({ file, tokens: tokenize(stripImports(readText(root, file))) })).filter(d => d.tokens.length);
  const codeLines = docs.reduce((n, d) => n + new Set(d.tokens.map(t => t.line)).size, 0);
  if (!codeLines) return { value: null, source, details: { reason: 'no production code (java, ts, tsx, js, jsx) in scope' } };
  const seen = new Map();
  docs.forEach((d, f) => {
    for (let p = 0; p + WINDOW <= d.tokens.length; p++) {
      const key = createHash('sha1').update(d.tokens.slice(p, p + WINDOW).map(t => t.t).join('\u0000')).digest('base64');
      let g = seen.get(key); if (!g) seen.set(key, g = []);
      g.push([f, p]);
    }
  });
  const starts = docs.map(() => []);
  for (const g of seen.values()) {
    if (g.length < 2) continue;
    const byFile = new Map();
    for (const [f, p] of g) { const e = byFile.get(f); if (!e) byFile.set(f, { lo: p, hi: p, n: 1 }); else { e.lo = Math.min(e.lo, p); e.hi = Math.max(e.hi, p); e.n++; } }
    for (const [f, e] of byFile) {
      if (byFile.size > 1 || e.hi - e.lo >= WINDOW) for (const [gf, p] of g) if (gf === f) starts[f].push(p);
    }
  }
  let dup = 0; const perFile = [];
  docs.forEach((d, f) => {
    if (!starts[f].length) return;
    const lines = new Set(); let cur = 0;
    for (const s of [...new Set(starts[f])].sort((a, b) => a - b)) {
      for (let t = Math.max(s, cur); t < s + WINDOW; t++) lines.add(d.tokens[t].line);
      cur = s + WINDOW;
    }
    dup += lines.size; perFile.push({ file: d.file, duplicatedLines: lines.size });
  });
  perFile.sort((a, b) => b.duplicatedLines - a.duplicatedLines || (a.file < b.file ? -1 : 1));
  return {
    value: Math.round(dup / codeLines * 10000) / 100, source: `${source} (${docs.length} files)`,
    details: { windowTokens: WINDOW, files: docs.length, codeLines, duplicatedLines: dup, worst: perFile.slice(0, 5) },
  };
}
