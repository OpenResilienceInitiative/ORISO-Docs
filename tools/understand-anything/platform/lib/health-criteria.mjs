// Health criteria files: parse, validate, resolve (ORISO-Docs#217, epic #213).
//
// A criteria file is Markdown with YAML front matter, stored in platform/capabilities/health/<id>.md:
//   scope:    "*" | <capability id> | <capability id or *>:<path glob>   (the glob starts with a repository name)
//   inherits: <id of another criteria file>   (optional; every file but "default" ends in "default")
//   metrics:  <metric name>: {threshold, weight}   (names come from health-metrics.mjs, nothing else is accepted)
//   tests:    list of commands or suites
//   body:     the reviewer instruction and the rules in prose
//
// Effective criteria for (capability, path): the file with the most specific matching scope is the nearest file;
// it and its "inherits" chain are merged, nearest wins per key (a metric, "tests", "instruction"), and the
// file each key came from is recorded.
import { criteriaVersion } from './health-run.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { METRICS, isMetric } from './health-metrics.mjs';

export class CriteriaError extends Error {
  constructor(code, message, detail = {}) { super(message); this.name = 'CriteriaError'; this.code = code; Object.assign(this, detail); }
}
export const DEFAULT_ID = 'default';
export const DEFAULT_DIR = new URL('../capabilities/health/', import.meta.url);
const KEYS = new Set(['scope', 'inherits', 'metrics', 'tests']);

// ---- YAML subset: mappings, lists of scalars, flow {a: 1} / [a, b], quoted strings, numbers, comments ----
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}
function splitTop(s, sep) {
  const out = []; let depth = 0, q = null, cur = '';
  for (const c of s) {
    if (q) { if (c === q) q = null; cur += c; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '{' || c === '[') depth++;
    if (c === '}' || c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}
function scalar(raw, file) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^"(?:[^"\\]|\\.)*"$/.test(s)) return JSON.parse(s);
  if (/^'[^']*'$/.test(s)) return s.slice(1, -1);
  if (s.startsWith('{') && s.endsWith('}')) {
    const o = {};
    for (const part of splitTop(s.slice(1, -1), ',')) {
      if (!part.trim()) continue;
      const i = part.indexOf(':');
      if (i < 0) throw new CriteriaError('yaml', `${file}: bad flow mapping ${s}`);
      o[part.slice(0, i).trim()] = scalar(part.slice(i + 1), file);
    }
    return o;
  }
  if (s.startsWith('[') && s.endsWith(']')) return splitTop(s.slice(1, -1), ',').filter(p => p.trim()).map(p => scalar(p, file));
  if (/^[&*!|>]/.test(s)) throw new CriteriaError('yaml', `${file}: unsupported YAML ${s}`);
  return s;
}
export function parseYaml(text, file = 'front matter') {
  const lines = [];
  for (const raw of text.split('\n')) {
    if (/\t/.test(raw.match(/^\s*/)[0])) throw new CriteriaError('yaml', `${file}: tabs are not allowed for indentation`);
    const body = stripComment(raw).replace(/\s+$/, '');
    if (!body.trim()) continue;
    lines.push({ indent: body.match(/^ */)[0].length, text: body.trim() });
  }
  let pos = 0;
  function block(indent) {
    if (lines[pos].text.startsWith('- ') || lines[pos].text === '-') {
      const list = [];
      while (pos < lines.length && lines[pos].indent === indent && lines[pos].text.startsWith('-')) {
        list.push(scalar(lines[pos].text.slice(1), file)); pos++;
      }
      return list;
    }
    const map = {};
    while (pos < lines.length && lines[pos].indent === indent) {
      const { text: t } = lines[pos];
      const m = t.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
      if (!m) throw new CriteriaError('yaml', `${file}: cannot read "${t}"`);
      if (m[1] in map) throw new CriteriaError('yaml', `${file}: duplicate key ${m[1]}`);
      pos++;
      if (m[2] !== undefined && m[2] !== '') map[m[1]] = scalar(m[2], file);
      else if (pos < lines.length && lines[pos].indent > indent) map[m[1]] = block(lines[pos].indent);
      else map[m[1]] = null;
    }
    if (pos < lines.length && lines[pos].indent > indent) throw new CriteriaError('yaml', `${file}: unexpected indentation at "${lines[pos].text}"`);
    return map;
  }
  if (!lines.length) return {};
  const out = block(lines[0].indent);
  if (pos < lines.length) throw new CriteriaError('yaml', `${file}: cannot read "${lines[pos].text}"`);
  return out;
}

// ---- one file ----
export function parseCriteriaFile(text, file) {
  const m = String(text).replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/);
  if (!m) throw new CriteriaError('front-matter', `${file}: needs YAML front matter between --- lines`);
  const front = parseYaml(m[1], file);
  for (const k of Object.keys(front)) if (!KEYS.has(k)) throw new CriteriaError('unknown-key', `${file}: unknown front matter key "${k}"`);
  if (typeof front.scope !== 'string' || !front.scope) throw new CriteriaError('scope', `${file}: scope is required`);
  const i = front.scope.indexOf(':');
  const scope = { raw: front.scope, capability: i < 0 ? front.scope : front.scope.slice(0, i), glob: i < 0 ? null : front.scope.slice(i + 1) };
  if (scope.glob === '' || scope.capability === '') throw new CriteriaError('scope', `${file}: bad scope "${front.scope}"`);
  const metrics = front.metrics ?? {};
  if (typeof metrics !== 'object' || Array.isArray(metrics)) throw new CriteriaError('metric-value', `${file}: metrics must be a mapping`);
  const tests = front.tests ?? null;
  if (tests !== null && (!Array.isArray(tests) || tests.some(t => typeof t !== 'string' || !t.trim())))
    throw new CriteriaError('tests', `${file}: tests must be a list of non-empty strings`);
  if (front.inherits != null && typeof front.inherits !== 'string') throw new CriteriaError('inherits-unknown', `${file}: inherits must be a file id`);
  return {
    id: file.replace(/^.*\//, '').replace(/\.md$/, ''), file, scope,
    inherits: front.inherits ?? null,
    metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, v])),
    tests,
    instruction: (m[2] ?? '').trim(),
    version: createHash('sha256').update(String(text)).digest('hex').slice(0, 12),
  };
}

// ---- globs: ** any depth, * inside a segment, {a,b} alternatives ----
function braceAlternatives(s) {
  const m = s.match(/\{([^{}]*)\}/);
  if (!m) return [s];
  return m[1].split(',').flatMap(alt => braceAlternatives(s.slice(0, m.index) + alt + s.slice(m.index + m[0].length)));
}
function globToRegExp(glob) {
  const alts = braceAlternatives(glob).map(g => {
    let re = '';
    for (let i = 0; i < g.length; i++) {
      const c = g[i];
      if (c === '*' && g[i + 1] === '*') { if (g[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; } }
      else if (c === '*') re += '[^/]*';
      else if (c === '?') re += '[^/]';
      else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
    }
    return re;
  });
  return new RegExp('^(?:' + alts.join('|') + ')$');
}
const literalLength = glob => { const i = glob.search(/[*?{[]/); return i < 0 ? glob.length : i; };
// A folder ("…/") is covered when a file directly inside it would be.
function globMatches(glob, path) { return globToRegExp(glob).test(path.endsWith('/') ? path + 'x' : path); }

// ---- validation of the whole set ----
export function validateCriteriaSet(files, { capabilityIds, repos }) {
  const ids = new Set(), scopes = new Set();
  for (const f of files) {
    if (ids.has(f.id)) throw new CriteriaError('duplicate-id', `${f.file}: duplicate criteria id ${f.id}`);
    ids.add(f.id);
  }
  const def = files.find(f => f.id === DEFAULT_ID);
  if (def && (def.scope.raw !== '*')) throw new CriteriaError('default-scope', `${def.file}: the default file needs scope "*" without a path glob`);
  if (!def) throw new CriteriaError('default-missing', `no ${DEFAULT_ID}.md criteria file`);
  for (const f of files) {
    if (scopes.has(f.scope.raw)) throw new CriteriaError('duplicate-scope', `${f.file}: scope "${f.scope.raw}" is used by another criteria file`);
    scopes.add(f.scope.raw);
    if (f.scope.capability !== '*' && !capabilityIds.includes(f.scope.capability))
      throw new CriteriaError('scope-capability', `${f.file}: unknown capability id "${f.scope.capability}"`);
    if (f.scope.glob !== null) {
      const first = f.scope.glob.split('/')[0];
      const alts = /^[A-Za-z0-9._-]+$|^\{[A-Za-z0-9._,-]+\}$/.test(first) ? braceAlternatives(first) : [];
      if (!alts.length || alts.some(a => !repos.includes(a)))
        throw new CriteriaError('scope-repo', `${f.file}: path glob "${f.scope.glob}" must start with a known repository (${repos.join(', ')})`);
    }
    for (const [name, m] of Object.entries(f.metrics)) {
      if (!isMetric(name)) throw new CriteriaError('metric-unknown', `${f.file}: unknown metric "${name}"`, { metric: name });
      const ok = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
      if (!m || typeof m !== 'object' || !ok(m.threshold) || !ok(m.weight) || Object.keys(m).some(k => k !== 'threshold' && k !== 'weight'))
        throw new CriteriaError('metric-value', `${f.file}: metric "${name}" needs a threshold and a weight, both numbers >= 0`);
    }
    if (f.inherits !== null && !ids.has(f.inherits)) throw new CriteriaError('inherits-unknown', `${f.file}: inherits unknown criteria file "${f.inherits}"`);
  }
  const byId = new Map(files.map(f => [f.id, f]));
  for (const f of files) {
    const seen = new Set([f.id]);
    for (let p = f.inherits && byId.get(f.inherits); p; p = p.inherits && byId.get(p.inherits)) {
      if (seen.has(p.id)) throw new CriteriaError('inherits-cycle', `${f.file}: inherits loop through ${p.id}`);
      seen.add(p.id);
    }
  }
  SETS.set(files, { capabilityIds });
  return files;
}
const SETS = new WeakMap(); // validated set -> the capability ids it was validated against

export function loadCriteria(dir = DEFAULT_DIR, ctx) {
  const base = dir instanceof URL ? dir : new URL('file://' + String(dir).replace(/\/?$/, '/'));
  const names = readdirSync(base).filter(n => n.endsWith('.md') && n !== 'README.md').sort();
  return validateCriteriaSet(names.map(n => parseCriteriaFile(readFileSync(new URL(n, base), 'utf8'), `health/${n}`)), ctx);
}

// ---- resolver ----
const origin = f => ({ id: f.id, file: f.file });
export function chainOf(files, f) {
  const byId = new Map(files.map(x => [x.id, x]));
  const chain = [f];
  while (chain.at(-1).inherits || chain.at(-1).id !== DEFAULT_ID) {
    const next = byId.get(chain.at(-1).inherits ?? DEFAULT_ID);
    if (!next || chain.includes(next)) break;
    chain.push(next);
  }
  return chain;
}
// query: { capability, path? }   path = "<repo>/<path inside repo>"; a trailing "/" means a folder.
export function resolveCriteria(files, { capability, path = null }) {
  const ctx = SETS.get(files);
  if (!ctx) throw new CriteriaError('unvalidated', 'resolveCriteria needs a set returned by validateCriteriaSet');
  if (!ctx.capabilityIds.includes(capability)) throw new CriteriaError('capability-unknown', `unknown capability ${capability}`);
  let best = [], bestKey = null;
  for (const f of files) {
    if (f.scope.capability !== '*' && f.scope.capability !== capability) continue;
    if (f.scope.glob !== null && (path === null || !globMatches(f.scope.glob, path))) continue;
    const key = [f.scope.capability === '*' ? 0 : 1, f.scope.glob === null ? -1 : literalLength(f.scope.glob)];
    const cmp = bestKey ? (key[0] - bestKey[0] || key[1] - bestKey[1]) : 1;
    if (cmp > 0) { best = [f]; bestKey = key; } else if (cmp === 0) best.push(f);
  }
  if (best.length > 1) throw new CriteriaError('ambiguous', `${capability} ${path ?? ''} matches ${best.map(b => b.id).join(', ')} with equal specificity`);
  return merge(files, best[0], capability, path);
}
function merge(files, nearest, capability, path) {
  const chain = chainOf(files, nearest);
  const metrics = {};
  let tests = null, instruction = null;
  for (const f of chain) {
    for (const [name, m] of Object.entries(f.metrics)) if (!(name in metrics)) metrics[name] = { threshold: m.threshold, weight: m.weight, origin: origin(f) };
    if (!tests && f.tests !== null) tests = { list: f.tests, origin: origin(f) };
    if (!instruction && f.instruction) instruction = { text: f.instruction, origin: origin(f) };
  }
  const def = chain.at(-1);
  return {
    capability, path, matched: nearest.id, chain: chain.map(f => f.id), version: nearest.version,
    metrics,
    tests: tests ?? { list: [], origin: origin(def) },
    instruction: instruction ?? { text: '', origin: origin(def) },
  };
}

// ---- the document the map reads: map/data/criteria.json ----
export const SOURCE = Object.freeze({ repository: 'OpenResilienceInitiative/ORISO-Docs', branch: 'dev', dir: 'tools/understand-anything/platform/capabilities/health' });

function plain(e) {
  return {
    matched: e.matched, chain: e.chain, version: e.version,
    metrics: Object.fromEntries(Object.entries(e.metrics).map(([name, m]) => [name, { threshold: m.threshold, weight: m.weight, better: METRICS[name].better, unit: METRICS[name].unit, origin: m.origin.id }])),
    tests: { list: e.tests.list, origin: e.tests.origin.id },
    instruction: { text: e.instruction.text, origin: e.instruction.origin.id },
  };
}
// Can the glob name a path that also lies under this capability rule (repo + directory prefix or file)?
function reaches(glob, repo, rulePath) {
  const full = `${repo}/${rulePath}`;
  return braceAlternatives(glob).some(g => { const lit = g.slice(0, literalLength(g)); return full.startsWith(lit) || lit.startsWith(full); });
}
// byRepo: the effective criteria of every repository the capability has code in, resolved like a run resolves its scope
// (path "<repo>/", health-run.mjs), with the criteria version a run record of that scope carries (criteriaVersion).
export function buildCriteriaDoc(files, rules) {
  const capabilityIds = Object.keys(rules.capabilities);
  const entries = [...(rules.rules ?? []).map(r => [r.capability, r.repo, r.prefix]), ...(rules.overrides ?? []).map(o => [o.capability, o.repo, o.path])];
  const doc = {
    schemaVersion: 1, source: { ...SOURCE },
    metrics: Object.fromEntries(Object.entries(METRICS).map(([n, m]) => [n, { better: m.better, unit: m.unit }])),
    files: Object.fromEntries(files.map(f => [f.id, { path: `${SOURCE.dir}/${f.id}.md`, scope: f.scope.raw, inherits: f.inherits, version: f.version }])),
    capabilities: {},
  };
  for (const capability of capabilityIds) {
    const inside = files.filter(f => f.scope.glob !== null && (f.scope.capability === capability
        || (f.scope.capability === '*' && !files.some(g => g.scope.glob === null && g.scope.capability === capability)))
      && entries.some(([c, repo, p]) => c === capability && reaches(f.scope.glob, repo, p)))
      .map(f => ({ file: f.id, scope: f.scope.raw, effective: plain(merge(files, f, capability, null)) }));
    const byRepo = {};
    for (const repo of [...new Set(entries.filter(([c]) => c === capability).map(([, r]) => r))].sort()) {
      const e = resolveCriteria(files, { capability, path: `${repo}/` });
      byRepo[repo] = { effective: plain(e), version: criteriaVersion(e) };
    }
    doc.capabilities[capability] = { effective: plain(resolveCriteria(files, { capability })), inside, byRepo };
  }
  return doc;
}
