// Human steering (ORISO-Docs#221, epic #213; spec stories 27-29).
// One GitHub issue per capability (label `area-steering`, in ORISO-Docs) is the steering thread. Members comment there;
// the export keeps only comments of OWNER, MEMBER and COLLABORATOR (GitHub's authorAssociation), so an outside account
// can neither show on the map nor steer an agent. GitHub does login and permissions; nothing here authenticates anyone.
//
//   ensureSteering(capabilityId, {transport, dryRun})  find the issue by its hidden marker, or create it (dry run by default)
//   exportSteering(transport, {now})                   -> {doc, warnings}; doc is steering.json (steering.schema.json)
//   steeringFor(capabilityId, {doc|file})              -> member comments of one capability, for the #220 health job
//
// GraphQL documents are UNVERIFIED against the live API (no org access from the sandbox); createLabel is the least certain.
// If a live run fails, adjust only the documents in this block.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./schema.mjs";
import { CAPABILITY_IDS, loadRules } from "../../understand-anything/platform/lib/capabilities.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const schema = JSON.parse(readFileSync(resolve(here, "../steering.schema.json"), "utf8"));
export const OWNER = "OpenResilienceInitiative";
export const REPO = "ORISO-Docs";
export const LABEL = "area-steering";
export const MEMBER_ASSOCIATIONS = Object.freeze(["OWNER", "MEMBER", "COLLABORATOR"]);
export const MAX_BODY = 2000; // characters per comment
export const MAX_COMMENTS = 50; // newest member comments kept per capability
export const MAX_PAGES = 20; // safety stop for paging (per issue list and per comment thread); hitting it adds a warning
const MARKER = /<!--\s*oriso:steering:v1\s+capability=([a-z0-9]+(?:-[a-z0-9]+)*)\s*-->/;
const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export const SteeringIssues_QUERY = `
query SteeringIssues($owner: String!, $name: String!, $labels: [String!], $after: String) {
  repository(owner: $owner, name: $name) {
    issues(labels: $labels, first: 50, after: $after, states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes { id number title url state body comments(last: 100) { pageInfo { hasPreviousPage startCursor } nodes { ...SteeringComment } } }
    }
  }
}
fragment SteeringComment on IssueComment { author { __typename login } createdAt url authorAssociation body isMinimized }`;
export const SteeringComments_QUERY = `
query SteeringComments($id: ID!, $before: String) {
  node(id: $id) { ... on Issue { comments(last: 100, before: $before) { pageInfo { hasPreviousPage startCursor } nodes { ...SteeringComment } } } }
}
fragment SteeringComment on IssueComment { author { __typename login } createdAt url authorAssociation body isMinimized }`;
export const SteeringRepo_QUERY = `
query SteeringRepo($owner: String!, $name: String!, $label: String!) { repository(owner: $owner, name: $name) { id label(name: $label) { id } } }`;
export const SteeringCreateLabel_MUTATION = `
mutation SteeringCreateLabel($input: CreateLabelInput!) { createLabel(input: $input) { label { id } } }`;
export const SteeringCreate_MUTATION = `
mutation SteeringCreate($input: CreateIssueInput!) { createIssue(input: $input) { issue { id number url } } }`;

// ───── names ─────
const requireCapability = (id) => {
  if (!CAPABILITY_IDS.includes(id)) throw new Error(`unknown capability ${JSON.stringify(id)}; known: ${CAPABILITY_IDS.join(", ")}`);
  return id;
};
export const steeringTitle = (id) => `Steering: ${loadRules().capabilities[requireCapability(id)].label}`;
export const marker = (id) => `<!-- oriso:steering:v1 capability=${requireCapability(id)} -->`;
export const parseMarker = (body) => (typeof body === "string" ? MARKER.exec(body)?.[1] ?? null : null);
export function steeringBody(id) {
  return [
    `Steering thread for the capability **${loadRules().capabilities[requireCapability(id)].label}** (\`${id}\`).`,
    "",
    "Members and collaborators: leave high-level direction here, for example \"look at error handling first\" or \"do not touch until the release\". Agents read these comments before they work on this area; the planning map shows them on the square.",
    "Only comments of the owner, members and collaborators are exported. Comments of other accounts stay here and have no effect.",
    "",
    marker(id),
    "",
  ].join("\n");
}

// ───── transport ─────
class GhError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const NO_RIGHTS = /bad credentials|requires authentication|not accessible|permission|forbidden|must have (write|admin)|saml|single sign-on|\bsso\b/i;
async function call(transport, query, variables) {
  let res;
  try { res = await transport(query, variables); } catch (e) { throw new GhError("TRANSPORT", `Transport failed: ${e?.message ?? e}`); }
  const errors = Array.isArray(res?.errors) ? res.errors : [];
  if (errors.length || res?.data == null) {
    const text = errors.map((e) => e.message).join("; ") || (res?.message ?? "empty answer");
    const rights = errors.some((e) => e.type === "FORBIDDEN") || NO_RIGHTS.test(text) || [401, 403].includes(Number(res?.status));
    throw new GhError(rights ? "NO_WRITE_RIGHTS" : "GITHUB_ERROR", text);
  }
  return res.data;
}
const typed = (e) => ({ ok: false, error: { code: e instanceof GhError ? e.code : "TRANSPORT", message: e?.message ?? String(e) } });

// ───── reading ─────
// Comments newest first: GitHub pages backwards from the newest (last/before), so a thread longer than the cap still gives its
// newest comments. warnings (optional) gets a line when the cap stops the read.
async function allComments(transport, issue, warnings = []) {
  const pages = [issue.comments.nodes];
  let info = issue.comments.pageInfo;
  let n = 0;
  for (; info.hasPreviousPage && n < MAX_PAGES; n++) {
    const data = await call(transport, SteeringComments_QUERY, { id: issue.id, before: info.startCursor });
    const conn = data.node?.comments;
    if (!conn) throw new GhError("GITHUB_ERROR", `comments of #${issue.number} not readable`);
    pages.push(conn.nodes);
    info = conn.pageInfo;
  }
  if (info.hasPreviousPage) warnings.push(`#${issue.number} has more comments than the export reads (${MAX_PAGES + 1} pages); the oldest were not read`);
  return pages.reverse().flat();
}
async function steeringIssues(transport, warnings = []) {
  const out = [];
  let after = null;
  let more = true;
  for (let n = 0; more && n < MAX_PAGES; n++) {
    const data = await call(transport, SteeringIssues_QUERY, { owner: OWNER, name: REPO, labels: [LABEL], after });
    const conn = data.repository?.issues;
    if (!conn) throw new GhError("NOT_FOUND", `${OWNER}/${REPO} not readable`);
    out.push(...conn.nodes);
    more = conn.pageInfo.hasNextPage;
    after = conn.pageInfo.endCursor;
  }
  if (more) warnings.push(`There are more steering issues than the export reads (${MAX_PAGES} pages); the newest issues were not read`);
  return out;
}

// ───── ensure ─────
export async function ensureSteering(capabilityId, { transport, dryRun = true } = {}) {
  let title, body;
  try { title = steeringTitle(capabilityId); body = steeringBody(capabilityId); } catch (e) { return { ok: false, error: { code: "BAD_REQUEST", message: e.message } }; }
  if (typeof transport !== "function") return { ok: false, error: { code: "BAD_REQUEST", message: "ensureSteering needs a transport" } };
  try {
    const found = (await steeringIssues(transport)).filter((i) => parseMarker(i.body) === capabilityId).sort((a, b) => a.number - b.number)[0];
    if (found) return { ok: true, capability: capabilityId, action: "exists", wrote: false, issue: { number: found.number, url: found.url, title: found.title, state: found.state } };
    const repo = (await call(transport, SteeringRepo_QUERY, { owner: OWNER, name: REPO, label: LABEL })).repository;
    if (!repo) throw new GhError("NOT_FOUND", `${OWNER}/${REPO} not readable`);
    const plan = { ok: true, capability: capabilityId, title, body, createsLabel: !repo.label };
    if (dryRun) return { ...plan, action: "create", wrote: false };
    let labelId = repo.label?.id;
    if (!labelId) {
      try {
        labelId = (await call(transport, SteeringCreateLabel_MUTATION, { input: { repositoryId: repo.id, name: LABEL, color: "5319e7", description: "Human steering thread of one capability (ORISO planning map)" } })).createLabel.label.id;
      } catch (e) {
        throw new GhError(e.code ?? "GITHUB_ERROR", `${e.message}. Create the label by hand: gh label create ${LABEL} -R ${OWNER}/${REPO}`);
      }
    }
    const made = (await call(transport, SteeringCreate_MUTATION, { input: { repositoryId: repo.id, title, body, labelIds: [labelId] } })).createIssue.issue;
    return { ...plan, action: "created", wrote: true, issue: { number: made.number, url: made.url, title, state: "OPEN" } };
  } catch (e) {
    return typed(e);
  }
}

// ───── export ─────
// Control characters (except tab and line feed) and lone surrogates out; cut by code points at MAX_BODY including the ellipsis.
const CONTROL = new RegExp("[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f\\u2028\\u2029]", "g");
const LONE_SURROGATE = new RegExp("[\\ud800-\\udbff](?![\\udc00-\\udfff])|(?<![\\ud800-\\udbff])[\\udc00-\\udfff]", "g");
const plain = (s) => String(s ?? "").replace(/\r\n?/g, "\n").replace(CONTROL, "").replace(LONE_SURROGATE, "");
function cap(text) {
  const chars = [...text];
  return chars.length <= MAX_BODY ? { body: text, truncated: false } : { body: chars.slice(0, MAX_BODY - 1).join("").trimEnd() + "…", truncated: true };
}
const issueUrl = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*(#issuecomment-[0-9]+)?$/;

export async function exportSteering(transport, { now = new Date().toISOString().replace(/\.\d+Z$/, "Z") } = {}) {
  const warnings = [];
  const issues = (await steeringIssues(transport, warnings)).sort((a, b) => a.number - b.number);
  const capabilities = {};
  for (const issue of issues) {
    const id = parseMarker(issue.body);
    if (!id) { warnings.push(`#${issue.number} has the label ${LABEL} but no steering marker; ignored`); continue; }
    if (!CAPABILITY_IDS.includes(id)) { warnings.push(`#${issue.number} names the unknown capability ${JSON.stringify(id)}; ignored`); continue; }
    if (capabilities[id]) { warnings.push(`#${issue.number} is a second steering issue for ${id}; #${capabilities[id].issue.number} is used`); continue; }
    if (!issueUrl.test(issue.url)) { warnings.push(`#${issue.number} has an unexpected url; ignored`); continue; }
    const kept = [];
    let skipped = 0;
    for (const cm of await allComments(transport, issue, warnings)) {
      const member = MEMBER_ASSOCIATIONS.includes(cm.authorAssociation);
      const human = cm.author && cm.author.__typename === "User" && LOGIN.test(cm.author.login ?? "");
      if (!member || !human || cm.isMinimized || !TS.test(cm.createdAt ?? "") || !issueUrl.test(cm.url ?? "")) { skipped++; continue; }
      kept.push({ author: cm.author.login, createdAt: cm.createdAt, url: cm.url, authorAssociation: cm.authorAssociation, ...cap(plain(cm.body)) });
    }
    kept.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    capabilities[id] = {
      issue: { number: issue.number, url: issue.url, title: plain(issue.title).slice(0, 200), state: issue.state === "CLOSED" ? "CLOSED" : "OPEN" },
      comments: kept.slice(0, MAX_COMMENTS), skipped, omitted: Math.max(0, kept.length - MAX_COMMENTS),
    };
  }
  const doc = { schemaVersion: 1, generatedAt: now, source: { repository: `${OWNER}/${REPO}`, label: LABEL, allowedAssociations: [...MEMBER_ASSOCIATIONS] }, capabilities, warnings };
  const errors = validateSteering(doc);
  if (errors.length) throw new Error(`steering.json invalid:\n- ${errors.join("\n- ")}`);
  return { doc, warnings };
}

export function validateSteering(doc) {
  const errors = validate(schema, doc);
  if (errors.length || !doc?.capabilities) return errors;
  for (const id of Object.keys(doc.capabilities)) if (!CAPABILITY_IDS.includes(id)) errors.push(`$.capabilities.${id}: unknown capability`);
  return errors;
}

// ───── agent input ─────
export const DEFAULT_STEERING_ENV = "ORISO_STEERING_FILE";
/**
 * Member comments for one capability, newest first. The #220 health job puts this list into its input (and hashes it into the run file).
 * Source: {doc} (already parsed) or {file} (steering.json, default: $ORISO_STEERING_FILE). Without a source it throws:
 * "no steering file" must never read as "nobody said anything". Unknown capability, invalid file or a comment of a non-member throws too.
 * Returns [] when the capability has no steering issue or no member comment yet.
 */
export function steeringFor(capabilityId, { doc, file = process.env[DEFAULT_STEERING_ENV] } = {}) {
  requireCapability(capabilityId);
  let d = doc;
  if (!d) {
    if (!file) throw new Error(`steeringFor needs a steering.json: pass {doc} or {file}, or set ${DEFAULT_STEERING_ENV}`);
    try { d = JSON.parse(readFileSync(file, "utf8")); } catch (e) { throw new Error(`cannot read steering.json (${file}): ${e.message}`); }
  }
  const errors = validateSteering(d);
  if (errors.length) throw new Error(`steering.json invalid: ${errors.slice(0, 3).join("; ")}`);
  return (d.capabilities[capabilityId]?.comments ?? [])
    .filter((c) => MEMBER_ASSOCIATIONS.includes(c.authorAssociation))
    .map((c) => ({ author: c.author, createdAt: c.createdAt, url: c.url, authorAssociation: c.authorAssociation, body: c.body, truncated: c.truncated }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
