// crap (ORISO-Docs#218): CRAP per function for JavaScript and TypeScript.
//   CRAP = complexity^2 * (1 - coverage)^3 + complexity
// Complexity: cyclomatic number from the TypeScript AST (typescript is a dependency of this tooling): 1 plus one for
// if, for, for-in, for-of, while, do, catch, "?:", every "case" (not "default") and every &&, ||, ?? (and their
// assignment forms). A nested function counts for itself, not for the function around it. "?." is not counted.
// Coverage: from a coverage file that is GIVEN (lcov, or istanbul coverage-final.json), as the share of covered
// lines (lcov DA entries, or statements by start line) between the first and last line of the function. Without a
// coverage file the metric is the "no coverage" state, never invented. A file the report does not know is listed
// in details.filesWithoutCoverage and left out, not counted as 0 % (absence from a report proves nothing).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { JS_EXT, extOf, isProductionCode, readText } from './files.mjs';

let TS = null;
const ts = () => TS ?? (TS = createRequire(import.meta.url)('typescript'));

const KINDS = () => {
  const k = ts().SyntaxKind;
  return {
    branch: new Set([k.IfStatement, k.ForStatement, k.ForInStatement, k.ForOfStatement, k.WhileStatement, k.DoStatement, k.CatchClause, k.ConditionalExpression, k.CaseClause]),
    logical: new Set([k.AmpersandAmpersandToken, k.BarBarToken, k.QuestionQuestionToken, k.AmpersandAmpersandEqualsToken, k.BarBarEqualsToken, k.QuestionQuestionEqualsToken]),
    fn: new Set([k.FunctionDeclaration, k.FunctionExpression, k.ArrowFunction, k.MethodDeclaration, k.Constructor, k.GetAccessor, k.SetAccessor]),
  };
};

function nameOf(node, sf) {
  const k = ts().SyntaxKind;
  if (node.kind === k.Constructor) return 'constructor';
  if (node.name) return node.name.getText(sf);
  const p = node.parent;
  if (p && (p.kind === k.VariableDeclaration || p.kind === k.PropertyAssignment || p.kind === k.PropertyDeclaration) && p.name) return p.name.getText(sf);
  if (p && p.kind === k.BinaryExpression && p.operatorToken.kind === k.EqualsToken) return p.left.getText(sf);
  return '<anonymous>';
}

// -> [{ name, line, endLine, complexity }] for every function-like node of the source
export function functionsOf(src, fileName) {
  const t = ts(), K = KINDS();
  const kind = { '.tsx': t.ScriptKind.TSX, '.jsx': t.ScriptKind.JSX, '.js': t.ScriptKind.JS }[extOf(fileName)] ?? t.ScriptKind.TS;
  const sf = t.createSourceFile(fileName, src, t.ScriptTarget.Latest, true, kind);
  const out = [];
  const complexity = body => {
    let n = 1;
    const visit = node => {
      if (K.fn.has(node.kind)) return; // nested function: its own entry
      if (K.branch.has(node.kind)) n++;
      else if (node.kind === t.SyntaxKind.BinaryExpression && K.logical.has(node.operatorToken.kind)) n++;
      t.forEachChild(node, visit);
    };
    if (body) visit(body);
    return n;
  };
  const walk = node => {
    if (K.fn.has(node.kind) && node.body) {
      out.push({
        name: nameOf(node, sf),
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        endLine: sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
        complexity: complexity(node.body),
      });
    }
    t.forEachChild(node, walk);
  };
  walk(sf);
  return out;
}

// ---- coverage ----
// -> Map<path as written in the report, [{ line, hits }]>
export function parseCoverage(text) {
  const map = new Map();
  if (text.trimStart().startsWith('{')) { // istanbul coverage-final.json
    for (const [key, f] of Object.entries(JSON.parse(text))) {
      const units = Object.entries(f.statementMap ?? {}).map(([id, loc]) => ({ line: loc.start.line, hits: Number(f.s?.[id] ?? 0) }));
      map.set(f.path ?? key, units);
      if (f.path && f.path !== key) map.set(key, units);
    }
    return map;
  }
  let cur = null; // lcov
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (l.startsWith('SF:')) { cur = []; map.set(l.slice(3), cur); }
    else if (l.startsWith('DA:') && cur) { const [line, hits] = l.slice(3).split(','); cur.push({ line: Number(line), hits: Number(hits) }); }
    else if (l === 'end_of_record') cur = null;
  }
  return map;
}
// the report entry for a repository-relative file, or null (unknown or ambiguous)
function entryFor(map, root, rel) {
  const norm = new Map();
  for (const [k, v] of map) norm.set((isAbsolute(k) && resolve(k).startsWith(resolve(root) + '/') ? relative(root, resolve(k)) : k).replace(/^\.\//, ''), v);
  if (norm.has(rel)) return norm.get(rel);
  const hits = [...norm].filter(([k]) => k.endsWith('/' + rel));
  return hits.length === 1 ? hits[0][1] : null;
}

const round2 = n => Math.round(n * 100) / 100;
export function measureCrap({ root, repo, files, coverage = null }) {
  const source = 'health-run crap: TypeScript AST complexity and line coverage from the given coverage file';
  const na = (reason, extra = {}) => ({ value: null, source, details: { reason, ...extra } });
  const targets = files.filter(p => JS_EXT.includes(extOf(p)) && isProductionCode(repo, p));
  if (!targets.length) return na('no JavaScript or TypeScript production code in scope');
  if (!coverage) return na('no coverage: pass a coverage file (lcov.info or coverage-final.json)', { state: 'no-coverage' });
  let cov;
  try { cov = parseCoverage(readFileSync(coverage, 'utf8')); } catch (e) { return na(`cannot read the coverage file ${basename(coverage)}: ${String(e.message).slice(0, 120)}`, { state: 'unreadable-coverage' }); }
  const rows = [], without = []; let skipped = 0;
  for (const file of targets) {
    const units = entryFor(cov, root, file);
    if (!units) { without.push(file); continue; }
    for (const f of functionsOf(readText(root, file), file)) {
      const inside = units.filter(u => u.line >= f.line && u.line <= f.endLine);
      if (!inside.length) { skipped++; continue; }
      const c = inside.filter(u => u.hits > 0).length / inside.length;
      rows.push({ file, name: f.name, line: f.line, complexity: f.complexity, coverage: Math.round(c * 100), crap: round2(f.complexity ** 2 * (1 - c) ** 3 + f.complexity) });
    }
  }
  if (!rows.length) return na('no function with coverage data: the coverage file knows none of the files in scope', { filesWithoutCoverage: without.slice(0, 20) });
  rows.sort((a, b) => b.crap - a.crap || (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
  return {
    value: rows[0].crap, source: `${source} (${basename(coverage)})`,
    details: { functions: rows.length, functionsWithoutCoverageLines: skipped, filesWithoutCoverage: without.slice(0, 20), worst: rows.slice(0, 10) },
  };
}
