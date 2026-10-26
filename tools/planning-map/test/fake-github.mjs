// Fake GitHub for the planning API tests (ORISO-Docs#210, #211). It answers the operations of
// lib/planning-api.mjs from an in-memory model and records every call. Tests never reach the network.
// Transport shape: async (query, variables) => ({data, errors?}).
export const ORG = "OpenResilienceInitiative";
export const PROJECT_ID = "PVT_kwDODkeBP84BHH8p";

export function createFakeGitHub({
  releases = ["v2.0.12", "v2.0.13"],
  issues = [],
  gateOptions = null, // null: the project has no Gate field yet
  steering = [], // ORISO-Docs#221: issues of ORISO-Docs as {number, title, body, state?, labels?, comments: [{author, association, createdAt, body, bot?, minimized?}]}
  labelExists = true, // does the label area-steering exist yet?
  healthIssues = [], // ORISO-Docs#220: health check request issues of ORISO-Docs as {number, title, body, state?}
} = {}) {
  const byRef = new Map();
  const byId = new Map();
  let nextId = 1;
  for (const raw of issues) {
    const issue = { canUpdate: true, release: null, subIssues: [], gate: null, onBoard: true, body: "", updatedAt: "2026-10-24T08:00:00Z", ...raw, id: `I_${nextId}`, itemId: `PVTI_${nextId}` };
    nextId++;
    byRef.set(`${issue.repository}#${issue.number}`, issue);
    byId.set(issue.id, issue);
  }
  const fake = { calls: [], writes: [], hooks: {}, respond: {}, releaseOptions: releases.map((name, i) => ({ id: `OPT_R${i}`, name })) };
  // Failure hooks (review of #210):
  //   fake.respond[op] = (variables, fake) => body   replaces the answer of one operation (any body shape).
  //   fake.readError(op, "FORBIDDEN" | "NOT_FOUND")  that read answers {data: null, errors: [{type}]}.
  //   fake.unauthorized(op)                          that operation answers a 401 body without "errors" or "data".
  //   sub-issue entry {hidden: "FORBIDDEN" | "NOT_FOUND"} a null node in subIssues.nodes plus a path-scoped error.
  fake.readError = (op, type, message = type === "FORBIDDEN" ? "Resource not accessible by integration" : "Could not resolve to a node") => {
    fake.respond[op] = () => ({ data: null, errors: [{ type, message }] });
  };
  fake.unauthorized = (op, body = { message: "Bad credentials", documentation_url: "https://docs.github.com/graphql", status: "401" }) => {
    fake.respond[op] = () => body;
  };
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
    if (fake.respond[op]) return fake.respond[op](variables, fake);
    const st = op?.startsWith("Steering") ? fake.steeringTransport(op, variables) : null;
    if (st) return st;
    if (op?.startsWith("PlanHealthCheck")) return fake.healthTransport(op, variables);
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
        const subs = parent.subIssues.map((ref) => (typeof ref === "string" ? byRef.get(ref) : ref));
        const start = variables.after ? Number(variables.after) : 0;
        const page = subs.slice(start, start + (fake.pageSize ?? 100));
        const end = start + page.length;
        const errors = page.flatMap((x, j) => (x.hidden ? [{ type: x.hidden, path: ["node", "subIssues", "nodes", j], message: x.hidden === "FORBIDDEN" ? "Resource not accessible by integration" : "Could not resolve to an Issue" }] : []));
        const body = { data: { node: { subIssues: { pageInfo: { hasNextPage: end < subs.length, endCursor: String(end) }, nodes: page.map((x) => (x.hidden ? null : issueNode(x))) } } } };
        return errors.length ? { ...body, errors } : body;
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
      // ORISO-Docs#216: issue description for the job section. A write bumps updatedAt like GitHub does.
      case "PlanJobIssue": {
        const i = byRef.get(`${variables.owner}/${variables.name}#${variables.number}`);
        return { data: { repository: { issue: i ? { id: i.id, number: i.number, body: i.body, updatedAt: i.updatedAt, viewerCanUpdate: i.canUpdate, repository: { nameWithOwner: i.repository } } : null } } };
      }
      case "PlanSetBody": {
        const { id, body } = variables.input;
        const i = byId.get(id);
        if (!i || !i.canUpdate) return denied();
        i.body = body;
        i.updatedAt = new Date(Date.parse(i.updatedAt) + 60000).toISOString().replace(".000Z", "Z");
        fake.writes.push({ kind: "body", issue: `${i.repository}#${i.number}`, value: body });
        return { data: { updateIssue: { issue: { id: i.id, updatedAt: i.updatedAt } } } };
      }
      default:
        throw new Error(`fake GitHub: unexpected operation ${op}`);
    }
  };
  // ORISO-Docs#221: steering issues, their labels and comments (GraphQL shape of lib/steering.mjs).
  const REPO_NAME = `${ORG}/ORISO-Docs`;
  const sIssues = [];
  let sNext = 900;
  let labelId = labelExists ? "LA_steering" : null;
  const sComment = (n, c, i) => ({
    author: c.author === null ? null : { __typename: c.bot ? "Bot" : "User", login: c.author },
    createdAt: c.createdAt, url: `https://github.com/${REPO_NAME}/issues/${n}#issuecomment-${n}${String(i).padStart(3, "0")}`,
    authorAssociation: c.association, body: c.body, isMinimized: !!c.minimized,
  });
  const addSteering = (raw) => {
    const number = raw.number ?? sNext++;
    const issue = { id: `S_${number}`, number, title: raw.title ?? "Steering", body: raw.body ?? "", state: raw.state ?? "OPEN", labels: raw.labels ?? ["area-steering"], url: `https://github.com/${REPO_NAME}/issues/${number}`, comments: (raw.comments ?? []).map((c, i) => sComment(number, c, i)) };
    sIssues.push(issue);
    return issue;
  };
  steering.forEach(addSteering);
  const page = (list, after, size) => {
    const start = after ? Number(after) : 0;
    const nodes = list.slice(start, start + size);
    return { pageInfo: { hasNextPage: start + nodes.length < list.length, endCursor: String(start + nodes.length) }, nodes };
  };
  // comments(last:, before:): pages backwards from the newest, each page in chronological order (as GitHub does)
  const pageBack = (list, before, size) => {
    const end = before ? Number(before) : list.length;
    const start = Math.max(0, end - size);
    return { pageInfo: { hasPreviousPage: start > 0, startCursor: String(start) }, nodes: list.slice(start, end) };
  };
  const issueOut = (i) => ({ id: i.id, number: i.number, title: i.title, url: i.url, state: i.state, body: i.body, comments: pageBack(i.comments, null, fake.commentPageSize ?? 100) });
  fake.steeringIssues = sIssues;
  fake.steeringTransport = (op, v) => {
    switch (op) {
      case "SteeringIssues": {
        const list = sIssues.filter((i) => (v.labels ?? []).every((l) => i.labels.includes(l)));
        const p = page(list, v.after, fake.issuePageSize ?? 50);
        return { data: { repository: { issues: { pageInfo: p.pageInfo, nodes: p.nodes.map(issueOut) } } } };
      }
      case "SteeringComments": {
        const i = sIssues.find((x) => x.id === v.id);
        return { data: { node: i ? { comments: pageBack(i.comments, v.before, fake.commentPageSize ?? 100) } : null } };
      }
      case "SteeringRepo":
        return { data: { repository: { id: "R_docs", label: labelId ? { id: labelId } : null } } };
      case "SteeringCreateLabel":
        if (v.input.repositoryId !== "R_docs") return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown repository" }] };
        labelId = "LA_steering";
        fake.writes.push({ kind: "label", value: v.input.name });
        return { data: { createLabel: { label: { id: labelId } } } };
      case "SteeringCreate": {
        const { repositoryId, title, body, labelIds } = v.input;
        if (repositoryId !== "R_docs" || !labelIds.includes(labelId)) return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown repository or label" }] };
        const issue = addSteering({ title, body });
        fake.writes.push({ kind: "steering-issue", issue: `${REPO_NAME}#${issue.number}`, value: { title, body } });
        return { data: { createIssue: { issue: { id: issue.id, number: issue.number, url: issue.url } } } };
      }
    }
    return null;
  };
  // ORISO-Docs#220: health check requests (search, repository id, createIssue). The search is as fuzzy as GitHub's:
  // it returns every issue that carries the marker prefix, and the client has to check the exact scope itself.
  const hIssues = [];
  let hNext = 950;
  const addHealth = (raw) => {
    const number = raw.number ?? hNext++;
    const issue = { id: `H_${number}`, number, title: raw.title ?? "Health check", body: raw.body ?? "", state: raw.state ?? "OPEN", url: `https://github.com/${REPO_NAME}/issues/${number}` };
    hIssues.push(issue);
    return issue;
  };
  healthIssues.forEach(addHealth);
  fake.healthIssues = hIssues;
  fake.healthTransport = (op, v) => {
    switch (op) {
      case "PlanHealthCheckFind": {
        const onlyOpen = /\bis:open\b/.test(v.q);
        const nodes = hIssues.filter((i) => (!onlyOpen || i.state === "OPEN") && i.body.includes("oriso:health-check:v1"));
        return { data: { search: { nodes: nodes.map((i) => ({ id: i.id, number: i.number, url: i.url, title: i.title, state: i.state, body: i.body })) } } };
      }
      case "PlanHealthCheckRepo":
        return { data: { repository: { id: "R_docs" } } };
      case "PlanHealthCheckCreate": {
        const { repositoryId, title, body } = v.input;
        if (repositoryId !== "R_docs") return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown repository" }] };
        const issue = addHealth({ title, body });
        fake.writes.push({ kind: "health-check-issue", issue: `${REPO_NAME}#${issue.number}`, value: { title, body } });
        return { data: { createIssue: { issue: { id: issue.id, number: issue.number, url: issue.url } } } };
      }
    }
    throw new Error(`fake GitHub: unexpected health check operation ${op}`);
  };
  fake.issue = (ref) => byRef.get(ref);
  return fake;
}
