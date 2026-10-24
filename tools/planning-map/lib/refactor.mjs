// Health finding -> planned refactoring work (ORISO-Docs#222, epic #213; spec stories 25 and 26).
// proposeRefactor(scope, epic, {record, dryRun, transport}) creates ONE task: issue type Task, label `refactoring`, a body
// that links the health run record and lists its findings, as a native sub-issue of the epic, added to the ORISO Roadmap.
// It is never automatic: plan.mjs calls it, and without --apply it only plans (dryRun is the default of the CLI).
//
// CATEGORY. ORISO has four native issue types (Task, Bug, Feature, Epic) and no project field for a category, and a
// board field must not be invented. So the category "refactoring" is the repository LABEL `refactoring` on a Task.
// The label is exported with every board item (labels in board.json); the scope sits in a hidden marker of the body:
//   <!-- oriso:refactor:v1 scope=<capability>[:<repo>[:<path>]] -->
// Typed results as in lib/planning-api.mjs: {ok: true, ...} or {ok: false, error: {code, message, issue?, detail?}, applied: []}.
// GraphQL documents are UNVERIFIED against the live API (no org access from the sandbox); adjust only the block below.
import { call, fail, neverThrows, parseIssueRef, refString, PROJECT_ID, ERROR_CODES as PLANNING_CODES } from "./planning-api.mjs";
import { contract } from "./board.mjs";
import { REFACTORING_LABEL, parseMarker } from "./refactor-marker.mjs";
export { REFACTORING_LABEL, MARKER_RE } from "./refactor-marker.mjs";
import { CAPABILITY_IDS, CODE_REPOS, loadRules } from "../../understand-anything/platform/lib/capabilities.mjs";
import { SCHEMA, runFile, validateRunRecord } from "../../understand-anything/platform/lib/health-run.mjs";

export const ISSUE_TYPE = "Task";
export const ERROR_CODES = [...PLANNING_CODES, "PRIVATE_REPO"];
export const FINDING_BELOW = 60; // a model verdict under this score is a finding (the "fair" band of the Health view starts at 60)
const DOCS_BLOB = "https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev/";
const MAX_PAGES = 20;

// ───── GraphQL (unverified, see above) ─────
export const EPIC_QUERY = `
query RefactorEpic($owner: String!, $name: String!, $number: Int!, $label: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    id isPrivate nameWithOwner
    label(name: $label) { id }
    issueTypes(first: 20) { nodes { id name } }
    issue(number: $number) {
      id number state viewerCanUpdate
      subIssues(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { number url state body } }
    }
  }
}`;
export const CREATE_LABEL_MUTATION = `
mutation RefactorCreateLabel($input: CreateLabelInput!) { createLabel(input: $input) { label { id } } }`;
export const CREATE_ISSUE_MUTATION = `
mutation RefactorCreateIssue($input: CreateIssueInput!) { createIssue(input: $input) { issue { id number url } } }`;
export const ADD_SUB_ISSUE_MUTATION = `
mutation RefactorAddSubIssue($input: AddSubIssueInput!) { addSubIssue(input: $input) { issue { id } } }`;
export const ADD_TO_BOARD_MUTATION = `
mutation RefactorAddToBoard($input: AddProjectV2ItemByIdInput!) { addProjectV2ItemById(input: $input) { item { id } } }`;

// ───── scope ─────
const PATH_RE = new RegExp(SCHEMA.properties.scope.properties.path.pattern);
const okPath = (p) => PATH_RE.test(p) && !p.split("/").some((s) => s === "." || s === "..");
const privateRepos = () => new Set(contract.privateRepositories.map((r) => r.split("/").pop()));
const badRequest = (message, detail) => ({ ok: false, error: fail("BAD_REQUEST", message, detail ? { detail } : {}), applied: [] });
const scopeText = (s) => [s.capability, s.repo, s.path].filter((x) => x != null).join(":");

// "capability[:repo[:path]]" -> {ok, scope: {capability, repo|null, path|null}}
export function parseScope(text) {
  if (typeof text !== "string" || !text) return badRequest("--scope is required: <capability>[:<repo>[:<path>]]");
  const parts = text.split(":");
  if (parts.length > 3) return badRequest(`Scope ${JSON.stringify(text)} has too many parts: <capability>[:<repo>[:<path>]]`);
  const [capability, repo = null, path = null] = parts;
  if (!CAPABILITY_IDS.includes(capability)) return badRequest(`Unknown capability ${JSON.stringify(capability)}`, { known: CAPABILITY_IDS });
  if (repo !== null && !CODE_REPOS.includes(repo) && !privateRepos().has(repo)) return badRequest(`Unknown repository ${JSON.stringify(repo)}`, { known: CODE_REPOS });
  if (path !== null && repo === null) return badRequest("A scope path needs a repository: <capability>:<repo>:<path>");
  if (path !== null && !okPath(path)) return badRequest(`Scope path ${JSON.stringify(path)} is not a folder inside the repository (no leading or trailing slash, no "..")`);
  return { ok: true, scope: { capability, repo, path } };
}

// The record must be the run of this scope. Parts the scope leaves out are taken from the record.
function bindRecord(scope, record) {
  const problems = validateRunRecord(record);
  if (problems.length) return badRequest(`The run record is invalid: ${problems[0]}`, { problems });
  const r = record.scope;
  if (r.capability !== scope.capability) return badRequest(`The run record is for capability ${r.capability}, not ${scope.capability}`);
  if (scope.repo !== null && scope.repo !== r.repo) return badRequest(`The run record is for repository ${r.repo}, not ${scope.repo}`);
  if (scope.path !== null && scope.path !== r.path) return badRequest(`The run record is for ${r.path === null ? "the whole repository" : `folder ${r.path}`}, not ${scope.path}`);
  return { ok: true, scope: { capability: scope.capability, repo: r.repo, path: scope.repo === null || scope.path === null ? r.path : scope.path } };
}

// ───── task text ─────
// Record text is untrusted: a mention would notify a person, "#12" would link an issue. Both are broken up, newlines flattened.
const safe = (s, max = 300) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max).replace(/@/g, "@​").replace(/#(?=\d)/g, "#​");

export function findingsOf(record) {
  const out = [];
  for (const m of record.metrics) {
    if (m.status === "not-available") out.push(`- \`${m.name}\`: not available (${safe(m.details?.reason ?? "not measured")}). It could not be judged.`);
    else if (m.pass === false) out.push(`- \`${m.name}\`: ${m.value} ${safe(m.unit, 40)}, threshold ${m.better === "higher" ? "at least" : "at most"} ${m.threshold}.`);
  }
  for (const v of record.verdict) {
    if (v.score < FINDING_BELOW) out.push(`- \`${safe(v.criterion, 100)}\` (model verdict): ${v.score} of 100. ${v.reasons.map((r) => safe(r)).join(" ")}`);
  }
  return out;
}

export function taskTitle(scope) {
  const label = loadRules().capabilities[scope.capability]?.label ?? scope.capability;
  const where = scope.repo === null ? "" : ` (${scope.repo}${scope.path === null ? "" : "/" + scope.path})`;
  return `Refactor ${label}${where}`;
}

export function taskBody(scope, record) {
  const where = scope.repo === null ? `capability \`${scope.capability}\`` : `\`${scope.repo}${scope.path === null ? "" : "/" + scope.path}\` (capability \`${scope.capability}\`)`;
  const lines = [`Refactoring of ${where}, proposed from the health view of the planning map.`, "", "## Why", ""];
  if (record) {
    const findings = findingsOf(record);
    lines.push(
      `The health run \`${record.run.runId}\` of ${record.startedAt} (commit \`${record.commit.slice(0, 7)}\`, overall ${record.overall === null ? "no data" : record.overall}) found work to do here.`,
      "",
      `- Run record: [\`${runFile(record)}\`](${DOCS_BLOB}${runFile(record)})`,
      `- Measured source: ${record.links.source}`,
      "",
      "Findings:", "", ...(findings.length ? findings : ["- The run itself shows no failed metric; the reason to refactor is given by the person who proposed this task."]),
    );
  } else {
    lines.push("No run record attached. Run a health check for this scope first (`node tools/understand-anything/platform/health-run.mjs run ...`) and add the record here, or state the reason in a comment.");
  }
  lines.push(
    "", "## What to build", "",
    `- Change ${where} so that the findings above go away, without changing behaviour.`,
    "- Keep each pull request small and reviewable; link it to this task with `Refs`.",
    "- Run the health check again afterwards and add the new run record to this task.",
    "", "## Acceptance", "",
    "- [ ] Every finding above is gone in a new run record, or is answered here with a reason.",
    "- [ ] Existing tests pass; behaviour is unchanged.",
    "", "### Reviewer test plan", "",
    `- [ ] Open the Health view of the planning map, square \`${scope.capability}\` → the refactoring marker shows the state of this task`,
    "- [ ] Compare the new run record with the one linked above → the failed criteria improved",
    "",
    `<!-- oriso:refactor:v1 scope=${scopeText(scope)} -->`, "",
  );
  return lines.join("\n");
}

// ───── propose ─────
async function readEpic(transport, ref, name) {
  const subs = [];
  let after = null, head = null;
  for (let n = 0; n < MAX_PAGES; n++) {
    const r = await call(transport, EPIC_QUERY, { owner: ref.owner, name: ref.name, number: ref.number, label: REFACTORING_LABEL, after }, name);
    if (r.error) return r;
    const repo = r.data?.repository;
    if (!repo) return { error: fail("NOT_FOUND", `${ref.owner}/${ref.name} does not exist or is not visible`, { issue: name }) };
    head ??= repo;
    const issue = repo.issue;
    if (!issue) return { error: fail("NOT_FOUND", `Epic ${name} does not exist or is not visible`, { issue: name }) };
    subs.push(...(issue.subIssues?.nodes ?? []));
    if (!issue.subIssues?.pageInfo?.hasNextPage) return { repo: head, epic: head.issue, subs };
    after = issue.subIssues.pageInfo.endCursor;
  }
  return { error: fail("GITHUB_ERROR", `Epic ${name} has more sub-issues than propose-refactor reads (${MAX_PAGES} pages)`, { issue: name }) };
}

export const proposeRefactor = neverThrows(async (applied, scopeText0, epicRef, { record, dryRun = true, transport } = {}) => {
  if (typeof transport !== "function") return badRequest("proposeRefactor needs a transport");
  const parsed = parseScope(scopeText0);
  if (!parsed.ok) return parsed;
  const ref = parseIssueRef(epicRef);
  if (!ref) return badRequest(`Not an issue reference: ${JSON.stringify(epicRef)} (expected Org/Repo#123)`);
  let scope = parsed.scope;
  if (record) {
    const bound = bindRecord(scope, record);
    if (!bound.ok) return bound;
    scope = bound.scope;
  }
  const name = refString(ref);
  const none = (error, done = []) => ({ ok: false, error, applied: done });
  const priv = privateRepos();
  if (priv.has(ref.name) || (scope.repo !== null && priv.has(scope.repo))) {
    return none(fail("PRIVATE_REPO", `${priv.has(ref.name) ? name : scope.repo} is a private repository: nothing about it is planned from the public map`, { issue: name }));
  }

  const read = await readEpic(transport, ref, name);
  if (read.error) return none(read.error);
  const { repo, epic, subs } = read;
  if (repo.isPrivate) return none(fail("PRIVATE_REPO", `${name} is in a private repository: nothing about it is planned from the public map`, { issue: name }));
  if (!epic.viewerCanUpdate) return none(fail("NO_WRITE_RIGHTS", `No write rights on ${name}`, { issue: name }));
  const taskType = (repo.issueTypes?.nodes ?? []).find((t) => t.name === ISSUE_TYPE);
  if (!taskType) return none(fail("FIELD_MISSING", `Repository ${ref.owner}/${ref.name} has no issue type "${ISSUE_TYPE}"`, { issue: name }));

  const common = { scope, epic: name, repository: `${ref.owner}/${ref.name}`, issueType: ISSUE_TYPE, labels: [REFACTORING_LABEL], dryRun };
  const found = subs.find((s) => s.state === "OPEN" && typeof s.body === "string" && parseMarker(s.body) === scopeText(scope));
  if (found) {
    return { ok: true, ...common, action: "exists", wrote: false, issue: { number: found.number, url: found.url, repository: common.repository },
      results: [{ issue: `${common.repository}#${found.number}`, role: "task", before: "exists", after: "exists", changed: false, wrote: false }] };
  }

  const title = taskTitle(scope), body = taskBody(scope, record);
  const plan = { ok: true, ...common, action: "create", title, body, createsLabel: !repo.label, wrote: false, recordFile: record ? runFile(record) : null };
  if (dryRun) return { ...plan, results: [{ issue: name, role: "epic", before: null, after: "task would be created", changed: true, wrote: false }] };

  let labelId = repo.label?.id;
  if (!labelId) {
    const l = await call(transport, CREATE_LABEL_MUTATION, { input: { repositoryId: repo.id, name: REFACTORING_LABEL, color: "fbca04", description: "Refactoring task proposed from the health view (ORISO planning map)" } }, name);
    if (l.error) return none({ ...l.error, message: `${l.error.message}. Create the label by hand: gh label create ${REFACTORING_LABEL} -R ${ref.owner}/${ref.name}` });
    labelId = l.data?.createLabel?.label?.id;
    if (!labelId) return none(fail("GITHUB_ERROR", "GitHub did not return the new label", { issue: name }));
  }
  const made = await call(transport, CREATE_ISSUE_MUTATION, { input: { repositoryId: repo.id, title, body, issueTypeId: taskType.id, labelIds: [labelId] } }, name);
  if (made.error) return none(made.error);
  const issue = made.data?.createIssue?.issue;
  if (!issue?.id) return none(fail("GITHUB_ERROR", "GitHub did not return the new task", { issue: name }));
  const taskRef = `${common.repository}#${issue.number}`;
  applied.push(taskRef);
  const sub = await call(transport, ADD_SUB_ISSUE_MUTATION, { input: { issueId: epic.id, subIssueId: issue.id } }, name);
  if (sub.error) return none({ ...sub.error, message: `${sub.error.message} (the task ${taskRef} exists but is not a sub-issue of ${name} yet; link it by hand, do not create it twice)` }, applied.slice());
  const board = await call(transport, ADD_TO_BOARD_MUTATION, { input: { projectId: PROJECT_ID, contentId: issue.id } }, taskRef);
  if (board.error) return none({ ...board.error, message: `${board.error.message} (the task ${taskRef} is a sub-issue of ${name} but not on the ORISO Roadmap board yet; add it by hand)` }, applied.slice());
  return { ...plan, action: "created", wrote: true, issue: { number: issue.number, url: issue.url, repository: common.repository },
    results: [{ issue: taskRef, role: "task", before: null, after: "created", changed: true, wrote: true }] };
});
