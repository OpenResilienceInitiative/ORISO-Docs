// Secret-free measurements and trusted verdicts meet only through a pinned, validated batch.
import { createHash } from 'node:crypto';
import { CODE_REPOS, CAPABILITY_IDS } from './capabilities.mjs';
import { validateRunRecord } from './health-run.mjs';

const SHA = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const key = s => `${s.capability}|${s.repo}|${s.path ?? ''}`;
const validScope = s => s && CAPABILITY_IDS.includes(s.capability) && CODE_REPOS.includes(s.repo) && s.path === null;

export function makePlan({ selection, commits, criteriaFor, runId, startedAt }) {
  if (!/^\d+$/.test(String(runId)) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(startedAt)) throw new Error('invalid run identity');
  if (!selection || !Array.isArray(selection.selected)) throw new Error('invalid selection');
  const seen = new Set();
  const items = selection.selected.map(({ scope }) => {
    if (!validScope(scope) || seen.has(key(scope))) throw new Error('invalid or duplicate scope');
    seen.add(key(scope));
    const commit = commits[scope.repo], criteria = criteriaFor(scope);
    if (!SHA.test(commit ?? '')) throw new Error('missing or invalid commit');
    if (!HASH.test(criteria ?? '')) throw new Error('invalid criteria hash');
    return { scope, commit, criteria };
  });
  return { version: 1, runId: String(runId), startedAt, items };
}

export function validateBatch(plan, records, { validateRecord = validateRunRecord } = {}) {
  if (!plan || plan.version !== 1 || !/^\d+$/.test(plan.runId) || !Array.isArray(plan.items) || !Array.isArray(records)) throw new Error('invalid plan or batch');
  if (records.length !== plan.items.length) throw new Error('missing or extra measurements');
  const expected = new Map();
  for (const item of plan.items) {
    if (!validScope(item.scope) || !SHA.test(item.commit ?? '') || !HASH.test(item.criteria ?? '') || expected.has(key(item.scope))) throw new Error('invalid plan item');
    expected.set(key(item.scope), item);
  }
  const seen = new Set();
  for (const record of records) {
    const errors = validateRecord(record);
    if (errors.length) throw new Error(`invalid record: ${errors.join('; ')}`);
    const k = key(record.scope ?? {}), item = expected.get(k);
    if (!item || seen.has(k) || record.commit !== item.commit || record.criteriaVersion !== item.criteria) throw new Error('measurement does not match plan');
    seen.add(k);
  }
  return true;
}

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
export const planHash = plan => createHash('sha256').update(JSON.stringify(canonical(plan))).digest('hex');
export const makeEnvelope = (plan, records) => ({ version: 1, runId: plan.runId, planHash: planHash(plan), records });
export function validateEnvelope(plan, envelope, options) {
  if (!envelope || Object.keys(envelope).sort().join(',') !== 'planHash,records,runId,version' || envelope.version !== 1 ||
      envelope.runId !== plan.runId || envelope.planHash !== planHash(plan)) throw new Error('measurement provenance does not match plan');
  validateBatch(plan, envelope.records, options);
  return envelope.records;
}
