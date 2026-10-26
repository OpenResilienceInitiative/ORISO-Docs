// size and test-ratio (ORISO-Docs#218). Both count physical lines of the scope's code files (java, ts, tsx, js, jsx).
import { countLines, isProductionCode, isTestCode, readText } from './files.mjs';

const notAvailable = (source, reason) => ({ value: null, source, details: { reason } });

// Largest production file of the scope, in lines (the criteria text: "a file above the threshold is a candidate for splitting").
export function measureSize({ root, repo, files }) {
  const source = 'health-run size: lines of the largest production code file in scope';
  const prod = files.filter(p => isProductionCode(repo, p)).map(p => ({ file: p, lines: countLines(readText(root, p)) }));
  if (!prod.length) return notAvailable(source, 'no production code (java, ts, tsx, js, jsx) in scope');
  prod.sort((a, b) => b.lines - a.lines || (a.file < b.file ? -1 : 1));
  return { value: prod[0].lines, source: `${source} (${prod.length} files)`, details: { files: prod.length, largest: prod.slice(0, 5) } };
}

// Test lines per production line. No test file at all is a measured 0; no production code is not available.
export function measureTestRatio({ root, repo, files }) {
  const source = 'health-run test-ratio: test code lines / production code lines';
  const sum = list => list.reduce((n, p) => n + countLines(readText(root, p)), 0);
  const prod = sum(files.filter(p => isProductionCode(repo, p))), test = sum(files.filter(isTestCode));
  if (prod === 0) return notAvailable(source, 'no production code (java, ts, tsx, js, jsx) in scope');
  return { value: Math.round(test / prod * 100) / 100, source, details: { productionLines: prod, testLines: test } };
}
