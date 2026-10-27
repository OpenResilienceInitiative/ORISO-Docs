// Change detection for scheduled health runs (ORISO-Docs#220, epic #213; spec story 21).
//
// A scope is a capability inside one repository (path null). It needs a new run when
//   - it never had one, or
//   - a file that belongs to the capability changed since the commit of its latest record.
// The records are the only memory: no state file, no database. Folder records (path set) are made on demand
// ("send health check") and never decide whether the whole capability is due.
import { execFileSync } from 'node:child_process';
import { scopeKey } from './health-run.mjs';

export const DEFAULT_LIMIT = 6;
const REASON_ORDER = { 'never-run': 0, changed: 1 };

// -> [{capability, repo, path: null}] for every pair the capability rules know, sorted.
export function scopesOf(rules) {
  const seen = new Map();
  for (const e of [...(rules.rules ?? []), ...(rules.overrides ?? [])]) {
    const s = { capability: e.capability, repo: e.repo, path: null };
    seen.set(scopeKey(s), s);
  }
  return [...seen.values()].sort((a, b) => (a.capability + '|' + a.repo < b.capability + '|' + b.repo ? -1 : 1));
}

// Files changed between `since` and HEAD in a checkout (renames count as delete + add), or null when the checkout
// does not know the commit (history was rewritten, or the clone is too shallow): the caller treats that as "changed".
export function changedFiles(checkout, since) {
  try {
    const out = execFileSync('git', ['-C', checkout, 'diff', '--name-only', '--no-renames', '-z', `${since}..HEAD`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter(Boolean).sort();
  } catch { return null; }
}

// Pure. scopes: candidates. latest: run records (anything with scope, commit, startedAt; the newest per scope is used).
// diff(repo, sinceCommit) -> changed paths | null.  capabilityOf(repo, path) -> capability id | null.
// -> { selected: [{scope, reason: 'never-run'|'changed', since, changed: number|null}], skipped: [{scope, reason: 'unchanged'|'over-cap'}] }
// Order of the selection: never-run first, then the scope that has waited longest; ties by capability and repository.
export function selectScopes({ scopes, latest, diff, capabilityOf, limit = DEFAULT_LIMIT }) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error(`limit must be a positive integer (got ${limit})`);
  const newest = new Map();
  for (const r of latest) {
    if (r.scope.path !== null) continue;
    const k = scopeKey(r.scope), cur = newest.get(k);
    if (!cur || r.startedAt > cur.startedAt) newest.set(k, r);
  }
  const due = [], skipped = [];
  for (const scope of [...scopes].sort((a, b) => (scopeKey(a) < scopeKey(b) ? -1 : 1))) {
    const last = newest.get(scopeKey(scope));
    if (!last) { due.push({ scope, reason: 'never-run', since: null, changed: null }); continue; }
    const files = diff(scope.repo, last.commit);
    if (files === null) { due.push({ scope, reason: 'changed', since: last, changed: null }); continue; }
    const n = files.filter(p => capabilityOf(scope.repo, p) === scope.capability).length;
    if (n > 0) due.push({ scope, reason: 'changed', since: last, changed: n });
    else skipped.push({ scope, reason: 'unchanged' });
  }
  due.sort((a, b) => REASON_ORDER[a.reason] - REASON_ORDER[b.reason]
    || (a.since?.startedAt ?? '') .localeCompare(b.since?.startedAt ?? '')
    || scopeKey(a.scope).localeCompare(scopeKey(b.scope)));
  const selected = due.slice(0, limit).map(d => ({ ...d, since: d.since && d.since.commit }));
  for (const d of due.slice(limit)) skipped.push({ scope: d.scope, reason: 'over-cap' });
  return { selected, skipped };
}
