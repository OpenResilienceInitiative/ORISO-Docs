// Fake GitHub for the planning API tests (ORISO-Docs#210, #211). It answers the operations of
// lib/planning-api.mjs from an in-memory model and records every call. Tests never reach the network.
// Transport shape: async (query, variables) => ({data, errors?}).
export const ORG = "OpenResilienceInitiative";
export const PROJECT_ID = "PVT_kwDODkeBP84BHH8p";

export function createFakeGitHub({
  releases = ["v2.0.12", "v2.0.13"],
  issues = [],
  gateOptions = null, // null: the project has no Gate field yet
} = {}) {
  const byRef = new Map();
  const byId = new Map();
  let nextId = 1;
  for (const raw of issues) {
    const issue = { canUpdate: true, release: null, subIssues: [], gate: null, onBoard: true, ...raw, id: `I_${nextId}`, itemId: `PVTI_${nextId}` };
    nextId++;
    byRef.set(`${issue.repository}#${issue.number}`, issue);
    byId.set(issue.id, issue);
  }
  const fake = { calls: [], writes: [], hooks: {}, releaseOptions: releases.map((name, i) => ({ id: `OPT_R${i}`, name })) };
  const gateOpts = gateOptions && gateOptions.map((name, i) => ({ id: `OPT_G${i}`, name }));
  const fieldValues = (i) => ({
    nodes: i.release ? [{ __typename: "IssueFieldMultiSelectValue", options: [].concat(i.release).map((name) => ({ name })), field: { name: "Platform release" } }] : [],
  });
  const issueNode = (i) => ({
    id: i.id, number: i.number, viewerCanUpdate: i.canUpdate, repository: { nameWithOwner: i.repository },
    issueFieldValues: fieldValues(i),
    projectItems: { nodes: i.onBoard ? [{ id: i.itemId, project: { id: PROJECT_ID }, gate: i.gate ? { name: i.gate } : null }] : [] },
  });
  const denied = (message = "Resource not accessible by personal access token") => ({ data: null, errors: [{ type: "FORBIDDEN", message }] });

  fake.transport = async (query, variables) => {
    const op = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1];
    fake.calls.push({ op, variables });
    if (fake.hooks[op]) await fake.hooks[op](variables, fake);
    switch (op) {
      case "PlanReleaseField":
        return { data: { organization: { issueFields: { nodes: [
          { __typename: "IssueFieldSingleSelect", id: "IFSS_priority", name: "Priority", options: [{ id: "p1", name: "High" }] },
          { __typename: "IssueFieldMultiSelect", id: "IFMS_kgDOArcqMA", name: "Platform release", options: fake.releaseOptions },
        ] } } } };
      case "PlanIssue": {
        const [owner, name, number] = [variables.owner, variables.name, variables.number];
        const i = byRef.get(`${owner}/${name}#${number}`);
        return { data: { repository: { issue: i ? issueNode(i) : null } } };
      }
      case "PlanSubIssues": {
        const parent = byId.get(variables.id);
        const subs = parent.subIssues.map((ref) => byRef.get(ref));
        const start = variables.after ? Number(variables.after) : 0;
        const page = subs.slice(start, start + (fake.pageSize ?? 100));
        const end = start + page.length;
        return { data: { node: { subIssues: { pageInfo: { hasNextPage: end < subs.length, endCursor: String(end) }, nodes: page.map(issueNode) } } } };
      }
      case "PlanSetRelease": {
        const { issueId, issueFields } = variables.input;
        const i = byId.get(issueId);
        if (!i || !i.canUpdate) return denied();
        const [{ fieldId, multiSelectOptionIds }] = issueFields;
        if (fieldId !== "IFMS_kgDOArcqMA") return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown field" }] };
        const names = multiSelectOptionIds.map((id) => fake.releaseOptions.find((o) => o.id === id)?.name);
        i.release = names.length ? names : null;
        fake.writes.push({ kind: "release", issue: `${i.repository}#${i.number}`, value: names });
        return { data: { setIssueFieldValue: { issue: { id: i.id } } } };
      }
      case "PlanGateField":
        if (variables.projectId !== PROJECT_ID) return { data: { node: null } };
        return { data: { node: { __typename: "ProjectV2", id: PROJECT_ID, field: gateOpts ? { __typename: "ProjectV2SingleSelectField", id: "PVTSSF_gate", name: "Gate", options: gateOpts } : null } } };
      case "PlanSetGate": {
        const { itemId, fieldId, optionId } = variables;
        if (variables.projectId !== PROJECT_ID) return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown project" }] };
        const i = [...byId.values()].find((x) => x.itemId === itemId);
        if (!i || !i.canUpdate) return denied("Resource not accessible by integration");
        if (fieldId !== "PVTSSF_gate") return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown field" }] };
        const name = gateOpts.find((o) => o.id === optionId)?.name;
        i.gate = name;
        fake.writes.push({ kind: "gate", issue: `${i.repository}#${i.number}`, value: name });
        return { data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: itemId } } } };
      }
      default:
        throw new Error(`fake GitHub: unexpected operation ${op}`);
    }
  };
  fake.issue = (ref) => byRef.get(ref);
  return fake;
}
