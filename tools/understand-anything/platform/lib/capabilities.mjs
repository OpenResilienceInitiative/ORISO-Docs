// Capability rules + resolver (ORISO-Docs#198, epic #197).
// Maps (repo, path) -> exactly one capability id, or the explicit "shared" bucket.
// Rules file: platform/capabilities/capability-rules.json (reviewed, committed).
//
// Semantics
//  - rules:     { repo, prefix, capability }  prefix is a directory prefix ending in "/"
//  - overrides: { repo, path, capability, reason }  `path` is a file path or a
//               directory prefix ending in "/"; overrides beat rules.
//  - Within a tier the longest match wins. Two matches of the SAME length with
//    different capabilities are ambiguous and throw. No match throws (no implicit
//    catch-all: "shared" must be written down).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const SHARED = 'shared';
export const CAPABILITY_IDS = [
  'case-handover', 'notifications', 'legal-texts', 'feature-permissions', 'invitations-onboarding',
  'self-help-groups', 'calls-voice', 'live-chat', 'team-consultation', 'training-tours', 'statistics',
  'encryption-keys', 'email-templates', 'branding', 'deletion', 'multilingual', 'supervision',
  'files-media', 'auth-2fa', 'chat', 'tenants-agencies', SHARED,
];
export const CODE_REPOS = [
  'ORISO-Frontend', 'ORISO-Admin', 'ORISO-UserService', 'ORISO-TenantService',
  'ORISO-AgencyService', 'ORISO-ConsultingTypeService',
];
export const DEFAULT_RULES_URL = new URL('../capabilities/capability-rules.json', import.meta.url);

export class CapabilityError extends Error {
  constructor(code, message, detail = {}) { super(message); this.code = code; Object.assign(this, detail); }
}

export function loadRules(url = DEFAULT_RULES_URL) {
  return validateRules(JSON.parse(readFileSync(url, 'utf8')));
}

export function validateRules(rules) {
  if (!rules || rules.schemaVersion !== 1) throw new CapabilityError('schema', 'rules.schemaVersion must be 1');
  const known = new Set(Object.keys(rules.capabilities ?? {}));
  for (const id of CAPABILITY_IDS) if (!known.has(id)) throw new CapabilityError('capability-missing', `capabilities lacks ${id}`);
  for (const id of known) if (!CAPABILITY_IDS.includes(id)) throw new CapabilityError('capability-unknown', `unknown capability ${id}`);
  const seen = new Set();
  const check = (kind, e, key) => {
    if (!CODE_REPOS.includes(e.repo)) throw new CapabilityError('repo', `${kind}: unknown repo ${e.repo}`);
    if (!known.has(e.capability)) throw new CapabilityError('capability-unknown', `${kind}: unknown capability ${e.capability} for ${e.repo}:${key}`);
    if (typeof key !== 'string' || !key || key.startsWith('/')) throw new CapabilityError('path', `${kind}: bad path ${key}`);
    const id = `${kind}\0${e.repo}\0${key}`;
    if (seen.has(id)) throw new CapabilityError('duplicate', `${kind}: duplicate ${e.repo}:${key}`);
    seen.add(id);
  };
  for (const r of rules.rules ?? []) {
    if (!r.prefix?.endsWith('/')) throw new CapabilityError('path', `rule prefix must end with "/": ${r.prefix}`);
    check('rule', r, r.prefix);
  }
  for (const o of rules.overrides ?? []) {
    if (!o.reason) throw new CapabilityError('reason', `override ${o.repo}:${o.path} needs a reason`);
    check('override', o, o.path);
  }
  return rules;
}

function best(entries, repo, path, keyOf, tier) {
  let len = -1, hits = [];
  for (const e of entries) {
    if (e.repo !== repo) continue;
    const k = keyOf(e);
    const match = k.endsWith('/') ? path.startsWith(k) : path === k;
    if (!match) continue;
    if (k.length > len) { len = k.length; hits = [e]; } else if (k.length === len) hits.push(e);
  }
  if (!hits.length) return null;
  if (new Set(hits.map(h => h.capability)).size > 1)
    throw new CapabilityError('ambiguous', `${repo}:${path} matches ${hits.length} ${tier} entries of equal specificity: ${hits.map(h => h.capability).join(', ')}`, { repo, path });
  return hits[0];
}

// -> { capability, via: 'override'|'rule', match }  | throws CapabilityError('unmatched'|'ambiguous')
export function resolveFile(rules, repo, path) {
  const o = best(rules.overrides ?? [], repo, path, e => e.path, 'override');
  if (o) return { capability: o.capability, via: 'override', match: o.path };
  const r = best(rules.rules ?? [], repo, path, e => e.prefix, 'rule');
  if (r) return { capability: r.capability, via: 'rule', match: r.prefix };
  throw new CapabilityError('unmatched', `${repo}:${path} matches no capability rule`, { repo, path });
}

// ---- production-file definition (same filter the v3 growth map used) ----
const EXT_ALL = new Set(['.java', '.ts', '.tsx', '.js', '.jsx']);
const EXT_UI = new Set(['.scss', '.css', '.html']);
const SKIP_SEGMENTS = new Set(['node_modules', '.git', 'build', 'dist', 'target', 'generated', 'coverage', 'storybook-static']);
export function isProductionFile(repo, path) {
  const segs = path.split('/');
  const file = segs[segs.length - 1];
  const dot = file.lastIndexOf('.');
  const ext = dot < 0 ? '' : file.slice(dot);
  if (!(EXT_ALL.has(ext) || (EXT_UI.has(ext) && (repo === 'ORISO-Frontend' || repo === 'ORISO-Admin')))) return false;
  if (segs.slice(0, -1).some(s => SKIP_SEGMENTS.has(s))) return false;
  if (path.startsWith('.storybook-backup/') || path.startsWith('.storybook/static/')) return false;
  if (file.includes('.stories.') || file.endsWith('.d.ts')) return false;
  if (('/' + path).includes('/src/test/') || ('/' + path).includes('/cypress/')) return false;
  if (/\.(test|spec|cy)\.(t|j)sx?$/.test(file)) return false;
  return true;
}

export function listProductionFiles(repo, cloneDir) {
  const out = execFileSync('git', ['-C', cloneDir, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return out.split('\0').filter(p => p && isProductionFile(repo, p)).sort();
}

// Coverage over a {repo: [paths]} listing. Never throws on unmatched/ambiguous; reports them.
export function checkCoverage(rules, filesByRepo) {
  const unmatched = [], ambiguous = [], perCapability = {}, used = new Set();
  let mapped = 0, total = 0;
  for (const [repo, files] of Object.entries(filesByRepo)) {
    for (const path of files) {
      total++;
      try {
        const r = resolveFile(rules, repo, path);
        mapped++; used.add(`${r.via}\0${repo}\0${r.match}`);
        perCapability[r.capability] = (perCapability[r.capability] ?? 0) + 1;
      } catch (e) {
        if (e.code === 'unmatched') unmatched.push(`${repo}:${path}`);
        else if (e.code === 'ambiguous') ambiguous.push(e.message);
        else throw e;
      }
    }
  }
  const deadRules = (rules.rules ?? []).filter(r => !used.has(`rule\0${r.repo}\0${r.prefix}`)).map(r => `${r.repo}:${r.prefix}`);
  const deadOverrides = (rules.overrides ?? []).filter(o => !used.has(`override\0${o.repo}\0${o.path}`)).map(o => `${o.repo}:${o.path}`);
  return { total, mapped, unmatched, ambiguous, perCapability, deadRules, deadOverrides };
}
