// The closed list of health metric names (ORISO-Docs#217, epic #213).
// One module on purpose: criteria files (#217) and the health runs / scoring (#218) share it,
// so a metric name exists in exactly one place. A name that is not listed here fails validation.
//   better: 'lower' = the threshold is a maximum, 'higher' = the threshold is a minimum.
//   unit:   what the threshold counts, for display.
export const METRICS = Object.freeze({
  'size':            Object.freeze({ better: 'lower',  unit: 'lines per file' }),
  'test-ratio':      Object.freeze({ better: 'higher', unit: 'test lines per code line' }),
  'lint':            Object.freeze({ better: 'lower',  unit: 'findings' }),
  'duplication':     Object.freeze({ better: 'lower',  unit: '% duplicated lines' }),
  'crap':            Object.freeze({ better: 'lower',  unit: 'CRAP score per function' }),
  'email-render':    Object.freeze({ better: 'lower',  unit: 'templates that fail to render' }),
  'email-links':     Object.freeze({ better: 'lower',  unit: 'broken links' }),
  'email-languages': Object.freeze({ better: 'higher', unit: 'language variants present' }),
});
export const METRIC_NAMES = Object.freeze(Object.keys(METRICS));
export const isMetric = name => Object.prototype.hasOwnProperty.call(METRICS, name);

// The closed list of criteria the model scores (verdict step, health-verdict.mjs). They are NOT metric names (metrics are scored
// by threshold), and a fixed list keeps the history of a scope comparable from run to run. The step gives each weight 1.
export const REVIEW_CRITERIA = Object.freeze(['maintainability', 'test-quality', 'structure']);
export const REVIEW_WEIGHT = 1;
