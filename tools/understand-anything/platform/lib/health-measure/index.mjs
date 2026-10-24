// Metric runner entry: measureScope() computes the requested metrics for one scope of one repository checkout
// (ORISO-Docs#218, epic #213). Every result is { value: number|null, source: string, details: object }; value is null
// (never 0) when the metric could not be measured, with details.reason saying why.
import { METRIC_NAMES, isMetric } from '../health-metrics.mjs';
import { scopeFiles } from './files.mjs';
import { measureSize, measureTestRatio } from './size.mjs';
import { measureLint } from './lint.mjs';
import { measureDuplication } from './duplication.mjs';
import { measureCrap } from './crap.mjs';
import { measureEmailRender, measureEmailLinks, measureEmailLanguages } from './email.mjs';

const MEASURES = {
  'size': measureSize, 'test-ratio': measureTestRatio, 'lint': measureLint, 'duplication': measureDuplication, 'crap': measureCrap,
  'email-render': measureEmailRender, 'email-links': measureEmailLinks, 'email-languages': measureEmailLanguages,
};
// root: checkout folder; repo: repository name; scope: { capability, path|null }; rules: capability rules (capabilities.mjs);
// metrics: names to compute; coverage: path of an lcov / istanbul file or null.
export function measureScope({ root, repo, scope, rules, metrics = METRIC_NAMES, coverage = null }) {
  for (const m of metrics) if (!isMetric(m)) throw new Error(`unknown metric ${m}`);
  const files = scopeFiles({ root, repo, scope, rules });
  return Object.fromEntries(metrics.map(m => [m, MEASURES[m]({ root, repo, files, coverage })]));
}
