// Fake GitHub for propose-refactor (ORISO-Docs#222). It answers the Refactor* operations of lib/refactor.mjs from an
// in-memory model and records every write. Everything else is handed to the shared fake (test/fake-github.mjs).
import { createFakeGitHub, ORG, PROJECT_ID } from "./fake-github.mjs";

export function createRefactorGitHub({
  repos = { "ORISO-Docs": {}, "ORISO-E2E": { isPrivate: true } },
  epics = [{ repository: `${ORG}/ORISO-Docs`, number: 50 }],
  labelExists = true,
  issueTypes = ["Task", "Bug", "Feature", "Epic"],
} = {}) {
  const base = createFakeGitHub();
  const repoModel = {};
  for (const [name, r] of Object.entries(repos)) repoModel[`${ORG}/${name}`] = { id: `R_${name}`, isPrivate: false, label: labelExists ? `LA_${name}` : null, ...r };
  const epicModel = new Map(epics.map((e) => [`${e.repository}#${e.number}`, { canUpdate: true, state: "OPEN", subIssues: [], ...e, id: `E_${e.number}` }]));
  let next = 700;
  const created = new Map();
  const fake = { ...base, calls: base.calls, writes: base.writes, respond: base.respond, epic: (ref) => epicModel.get(ref), created };
  fake.transport = async (query, variables) => {
    const op = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1];
    if (!op?.startsWith("Refactor")) return base.transport(query, variables);
    base.calls.push({ op, variables });
    if (base.respond[op]) return base.respond[op](variables, fake);
    switch (op) {
      case "RefactorEpic": {
        const repo = repoModel[`${variables.owner}/${variables.name}`];
        const e = epicModel.get(`${variables.owner}/${variables.name}#${variables.number}`);
        if (!repo) return { data: { repository: null }, errors: [{ type: "NOT_FOUND", message: "Could not resolve to a Repository" }] };
        const subs = e ? e.subIssues : [];
        const start = variables.after ? Number(variables.after) : 0;
        const page = subs.slice(start, start + (fake.pageSize ?? 100));
        return { data: { repository: {
          id: repo.id, isPrivate: repo.isPrivate, nameWithOwner: `${variables.owner}/${variables.name}`,
          label: repo.label ? { id: repo.label } : null,
          issueTypes: { nodes: issueTypes.map((name, i) => ({ id: `IT_${i}`, name })) },
          issue: e ? { id: e.id, number: e.number, state: e.state, viewerCanUpdate: e.canUpdate, subIssues: { pageInfo: { hasNextPage: start + page.length < subs.length, endCursor: String(start + page.length) }, nodes: page } } : null,
        } } };
      }
      case "RefactorCreateLabel": {
        const repo = Object.values(repoModel).find((r) => r.id === variables.input.repositoryId);
        if (!repo) return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown repository" }] };
        repo.label = "LA_new";
        base.writes.push({ kind: "label", value: variables.input.name });
        return { data: { createLabel: { label: { id: repo.label } } } };
      }
      case "RefactorCreateIssue": {
        const i = variables.input;
        const repo = Object.entries(repoModel).find(([, r]) => r.id === i.repositoryId);
        if (!repo || fake.denyCreate) return { data: null, errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }] };
        const number = next++;
        const issue = { id: `N_${number}`, number, url: `https://github.com/${repo[0]}/issues/${number}`, ...i };
        created.set(issue.id, issue);
        base.writes.push({ kind: "task", issue: `${repo[0]}#${number}`, value: { title: i.title, body: i.body, issueTypeId: i.issueTypeId, labelIds: i.labelIds } });
        return { data: { createIssue: { issue: { id: issue.id, number, url: issue.url } } } };
      }
      case "RefactorAddSubIssue": {
        const { issueId, subIssueId } = variables.input;
        const e = [...epicModel.values()].find((x) => x.id === issueId);
        const sub = created.get(subIssueId);
        if (!e || !sub || fake.denySub) return { data: null, errors: [{ type: "FORBIDDEN", message: "Resource not accessible by integration" }] };
        e.subIssues.push({ number: sub.number, url: sub.url, state: "OPEN", body: sub.body });
        base.writes.push({ kind: "sub-issue", issue: `${e.repository}#${e.number}`, value: sub.number });
        return { data: { addSubIssue: { issue: { id: e.id } } } };
      }
      case "RefactorAddToBoard": {
        const { projectId, contentId } = variables.input;
        if (projectId !== PROJECT_ID || !created.has(contentId)) return { data: null, errors: [{ type: "NOT_FOUND", message: "unknown project or content" }] };
        base.writes.push({ kind: "board", value: created.get(contentId).number });
        return { data: { addProjectV2ItemById: { item: { id: `PVTI_${contentId}` } } } };
      }
      default:
        throw new Error(`fake GitHub: unexpected operation ${op}`);
    }
  };
  return fake;
}
