// Planning API (ORISO-Docs#210, #211; seam 2 of the planning-map spec).
// Writes planning decisions back to GitHub through an INJECTED transport:
//   transport(query, variables) -> Promise<{data, errors?}>
// Tests use test/fake-github.mjs; the local runner (plan.mjs) shells out to `gh api graphql`.
// Every command returns a typed result and never throws:
//   {ok: true,  ..., results: [{issue, role, before, after, changed, wrote}]}
//   {ok: false, error: {code, message, issue?, detail?}, applied: ["Org/Repo#1", ...]}
// Error codes: NO_WRITE_RIGHTS, CONFLICT, NOT_FOUND, UNKNOWN_RELEASE, FIELD_MISSING, BAD_REQUEST, TRANSPORT, GITHUB_ERROR.

export const DEFAULT_ORG = "OpenResilienceInitiative";
export const PROJECT_ID = "PVT_kwDODkeBP84BHH8p"; // ORISO Roadmap (project #1)
export const PLATFORM_RELEASE_FIELD_ID = "IFMS_kgDOArcqMA"; // org ISSUE field (multi-select), not a project field
export const PLATFORM_RELEASE_FIELD_NAME = "Platform release";
export const GATE_FIELD_NAME = "Gate";

export const ERROR_CODES = ["NO_WRITE_RIGHTS", "CONFLICT", "NOT_FOUND", "UNKNOWN_RELEASE", "FIELD_MISSING", "BAD_REQUEST", "TRANSPORT", "GITHUB_ERROR"];

const ISSUE_FIELDS = `
  id number viewerCanUpdate
  repository { nameWithOwner }
  issueFieldValues(first: 20) {
    nodes { __typename ... on IssueFieldMultiSelectValue { options { name } field { ... on IssueFieldMultiSelect { name } } } }
  }
  projectItems(first: 20) { nodes { id project { id } gate: fieldValueByName(name: "Gate") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } }`;

export const ISSUE_QUERY = `
query PlanIssue($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) { issue(number: $number) { ${ISSUE_FIELDS} } }
}`;

export const SUB_ISSUES_QUERY = `
query PlanSubIssues($id: ID!, $after: String) {
  node(id: $id) { ... on Issue { subIssues(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { ${ISSUE_FIELDS} } } } }
}`;

// UNVERIFIED (assumption): IssueFieldMultiSelect.options exposes { id name }. Name lookup is the same shape as queries.mjs.
export const RELEASE_FIELD_QUERY = `
query PlanReleaseField($owner: String!) {
  organization(login: $owner) {
    issueFields(first: 50) { nodes { __typename ... on IssueFieldMultiSelect { id name options { id name } } } }
  }
}`;

// THE ONE PLACE THAT WRITES A RELEASE. Mutation name and input shape come from the GitHub GraphQL changelog
// (setIssueFieldValue added 2026-03-12; IssueFieldCreateOrUpdateInput.multiSelectOptionIds added 2026-06-04).
// UNVERIFIED: not executed against the live API from this sandbox (no org access). If the first live --apply
// fails, adjust only this constant and releaseWriteVariables() below.
export const SET_RELEASE_MUTATION = `
mutation PlanSetRelease($input: SetIssueFieldValueInput!) {
  setIssueFieldValue(input: $input) { issue { id } }
}`;
export const releaseWriteVariables = (issueId, fieldId, optionId) => ({ input: { issueId, issueFields: [{ fieldId, multiSelectOptionIds: [optionId] }] } });

// ───────── shared plumbing ─────────
const fail = (code, message, extra = {}) => ({ code, message, ...extra });
const refString = (r) => `${r.owner}/${r.name}#${r.number}`;

export function parseIssueRef(ref, org = DEFAULT_ORG) {
  let repository, number;
  if (typeof ref === "string") {
    const m = /^(?:([\w.-]+)\/)?([\w.-]+)#(\d+)$/.exec(ref.trim());
    if (!m) return null;
    repository = `${m[1] ?? org}/${m[2]}`;
    number = Number(m[3]);
  } else if (ref && typeof ref === "object" && ref.repository && Number.isInteger(ref.number)) {
    repository = ref.repository.includes("/") ? ref.repository : `${org}/${ref.repository}`;
    number = ref.number;
  } else return null;
  const [owner, name] = repository.split("/");
  return { owner, name, number };
}

// GraphQL errors -> typed error. FORBIDDEN / permission wording means the operator may not write.
function classifyGraphqlErrors(errors, issue) {
  const e = errors[0] || {};
  const text = String(e.message || "");
  if (e.type === "FORBIDDEN" || /not accessible|permission|forbidden|must have (write|admin)/i.test(text)) return fail("NO_WRITE_RIGHTS", text || "No write rights", { issue });
  if (e.type === "NOT_FOUND" || /could not resolve/i.test(text)) return fail("NOT_FOUND", text, { issue });
  return fail("GITHUB_ERROR", text || "GitHub returned an error", { issue });
}

// Run one operation; returns {data} or {error}. Never throws.
async function call(transport, query, variables, issue) {
  let res;
  try {
    res = await transport(query, variables);
  } catch (e) {
    return { error: fail("TRANSPORT", `Transport failed: ${e?.message ?? e}`, { issue }) };
  }
  if (res?.errors?.length) return { error: classifyGraphqlErrors(res.errors, issue) };
  return { data: res?.data };
}

const releaseOf = (node) => {
  const v = (node.issueFieldValues?.nodes ?? []).find((n) => n?.field?.name === PLATFORM_RELEASE_FIELD_NAME);
  return v?.options?.map((o) => o.name) ?? [];
};

async function readIssue(transport, ref) {
  const r = await call(transport, ISSUE_QUERY, { owner: ref.owner, name: ref.name, number: ref.number }, refString(ref));
  if (r.error) return r;
  const node = r.data?.repository?.issue;
  return node ? { node } : { error: fail("NOT_FOUND", `${refString(ref)} does not exist or is not visible`, { issue: refString(ref) }) };
}

async function readSubIssues(transport, parent, parentRef) {
  const nodes = [];
  let after = null;
  for (;;) {
    const r = await call(transport, SUB_ISSUES_QUERY, { id: parent.id, after }, refString(parentRef));
    if (r.error) return r;
    const conn = r.data?.node?.subIssues;
    if (!conn) return { error: fail("NOT_FOUND", `sub-issues of ${refString(parentRef)} not readable`, { issue: refString(parentRef) }) };
    nodes.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) return { nodes };
    after = conn.pageInfo.endCursor;
  }
}

// ───────── assignRelease ─────────
// assignRelease(issue, release, {withSubIssues, expectedRelease, dryRun, transport})
//   expectedRelease: what the caller last saw (string, or null for "none"); a different live value is a CONFLICT.
//   withSubIssues: also the direct sub-issues (any repository). All rights are checked before the first write.
export async function assignRelease(issue, release, { withSubIssues = false, expectedRelease, dryRun = false, transport } = {}) {
  const bad = (message) => ({ ok: false, error: fail("BAD_REQUEST", message), applied: [] });
  if (typeof transport !== "function") return bad("assignRelease needs a transport");
  const ref = parseIssueRef(issue);
  if (!ref) return bad(`Not an issue reference: ${JSON.stringify(issue)} (expected Org/Repo#123)`);
  if (typeof release !== "string" || !release) return bad("release must be a non-empty name");
  const name = refString(ref);
  const none = (error, applied = []) => ({ ok: false, error, applied });

  const defs = await call(transport, RELEASE_FIELD_QUERY, { owner: ref.owner }, name);
  if (defs.error) return none(defs.error);
  const field = (defs.data?.organization?.issueFields?.nodes ?? []).find((f) => f.id === PLATFORM_RELEASE_FIELD_ID || (f.name === PLATFORM_RELEASE_FIELD_NAME && f.options));
  if (!field) return none(fail("FIELD_MISSING", `Issue field "${PLATFORM_RELEASE_FIELD_NAME}" not found in ${ref.owner}`, { issue: name }));
  const option = field.options.find((o) => o.name === release);
  if (!option) return none(fail("UNKNOWN_RELEASE", `Unknown release "${release}"`, { issue: name, detail: { release, known: field.options.map((o) => o.name) } }));

  const main = await readIssue(transport, ref);
  if (main.error) return none(main.error);
  const targets = [{ ref: name, role: "issue", node: main.node }];
  if (withSubIssues) {
    const subs = await readSubIssues(transport, main.node, ref);
    if (subs.error) return none(subs.error);
    for (const node of subs.nodes) targets.push({ ref: `${node.repository.nameWithOwner}#${node.number}`, role: "sub-issue", node });
  }

  // Preflight: rights on every target, then the conflict check on the main issue. No write happens before all pass.
  for (const t of targets) if (!t.node.viewerCanUpdate) return none(fail("NO_WRITE_RIGHTS", `No write rights on ${t.ref}`, { issue: t.ref }));
  const live = releaseOf(main.node);
  if (expectedRelease !== undefined && (expectedRelease ?? null) !== (live[0] ?? null)) {
    return none(fail("CONFLICT", `${name} is in ${live[0] ?? "no release"} on GitHub, not ${expectedRelease ?? "no release"}`, { issue: name, detail: { expected: expectedRelease ?? null, actual: live[0] ?? null } }));
  }

  const results = [];
  const applied = [];
  for (const t of targets) {
    const current = releaseOf(t.node);
    const changed = !(current.length === 1 && current[0] === release);
    const row = { issue: t.ref, role: t.role, before: current[0] ?? null, after: release, changed, wrote: false };
    if (changed && !dryRun) {
      const w = await call(transport, SET_RELEASE_MUTATION, releaseWriteVariables(t.node.id, field.id, option.id), t.ref);
      if (w.error) return none({ ...w.error, issue: t.ref }, applied);
      row.wrote = true;
      applied.push(t.ref);
    }
    results.push(row);
  }
  return { ok: true, release, dryRun, results };
}
