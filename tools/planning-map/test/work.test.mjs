import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBoard, validateBoard, contract } from "../lib/board.mjs";
import { fetchRepoBranches } from "../lib/work.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = "OpenResilienceInitiative/ORISO-Docs";
const meta = { projectV2: { title: "T", fields: { nodes: [] } } };
const pr = (over = {}) => ({
  number: 300, title: "A PR", url: "https://github.com/OpenResilienceInitiative/ORISO-Docs/pull/300", state: "OPEN", isDraft: false,
  reviewDecision: "APPROVED", updatedAt: "2026-10-23T10:00:00Z", headRefName: "feat/50-pr-branch",
  repository: { nameWithOwner: REPO, isPrivate: false }, headRepository: { nameWithOwner: REPO, isPrivate: false },
  commits: { nodes: [{ commit: { committedDate: "2026-10-23T09:00:00Z", statusCheckRollup: { state: "SUCCESS" } } }] }, ...over,
});
const issue = (number, over = {}, repo = REPO, isPrivate = false) => ({
  id: `PVTI_${number}`, type: "ISSUE", status: { name: "Ready" }, readiness: null,
  content: { __typename: "Issue", number, title: `Issue ${number}`, url: `https://github.com/${repo}/issues/${number}`, state: "OPEN", updatedAt: "2026-10-20T10:00:00Z",
    repository: { nameWithOwner: repo, isPrivate }, issueType: { name: "Task" }, assignees: { nodes: [] }, parent: null, issueFieldValues: { nodes: [] }, ...over },
});
const build = (items, branchIndex = new Map()) => buildBoard({ meta, items, totalCount: items.length, title: "T" }, { syncedAt: "2026-10-24T00:00:00Z", branchIndex });
const work = (board, n) => board.items.find((i) => i.number === n).work;

test("linked branches carry source=linked, last commit date and a github link", () => {
  const b = build([issue(50, { linkedBranches: { nodes: [{ ref: { name: "feat/50-a", repository: { nameWithOwner: REPO, isPrivate: false }, target: { committedDate: "2026-10-21T08:00:00Z" } } }] } })]);
  assert.deepEqual(work(b, 50).branches, [{ name: "feat/50-a", repository: REPO, source: "linked", lastCommitDate: "2026-10-21T08:00:00Z", url: `https://github.com/${REPO}/tree/feat/50-a`, prs: [] }]);
  assert.deepEqual(validateBoard(b), []);
});

test("branches of closing PR references have source=pr; PR fields are exported", () => {
  const b = build([issue(50, { closedByPullRequestsReferences: { nodes: [pr()] } })]);
  const w = work(b, 50);
  assert.deepEqual(w.branches.map((x) => [x.name, x.source, x.lastCommitDate, x.prs]), [["feat/50-pr-branch", "pr", "2026-10-23T09:00:00Z", [300]]]);
  assert.deepEqual(w.prs, [{ number: 300, repository: REPO, title: "A PR", url: pr().url, state: "OPEN", isDraft: false, checks: "SUCCESS", reviewDecision: "APPROVED", updatedAt: "2026-10-23T10:00:00Z", branch: "feat/50-pr-branch" }]);
  assert.deepEqual(validateBoard(b), []);
});

test("a PR that only says 'Refs #50' counts via the cross-reference timeline; issue sources are ignored", () => {
  const b = build([issue(50, { timelineItems: { nodes: [
    { __typename: "CrossReferencedEvent", source: { __typename: "PullRequest", ...pr({ number: 301, headRefName: "refactor/x", isDraft: true, reviewDecision: null }) } },
    { __typename: "CrossReferencedEvent", source: { __typename: "Issue", number: 9 } },
  ] } })]);
  const w = work(b, 50);
  assert.deepEqual(w.prs.map((p) => [p.number, p.isDraft, p.reviewDecision]), [[301, true, null]]);
  assert.deepEqual(w.branches.map((x) => [x.name, x.source]), [["refactor/x", "pr"]]);
});

test("name-only matches are marked source=name and need a whole-number match", () => {
  const idx = new Map([[REPO, [
    { name: "feat/213-50-slug", committedDate: "2026-10-01T00:00:00Z" },
    { name: "fix/50", committedDate: "2026-10-02T00:00:00Z" },
    { name: "feat/500-other", committedDate: "2026-10-03T00:00:00Z" },
    { name: "feat/150-other", committedDate: "2026-10-03T00:00:00Z" },
  ]]]);
  const b = build([issue(50)], idx);
  assert.deepEqual(work(b, 50).branches.map((x) => [x.name, x.source, x.lastCommitDate]), [["feat/213-50-slug", "name", "2026-10-01T00:00:00Z"], ["fix/50", "name", "2026-10-02T00:00:00Z"]]);
});

test("the strongest source wins when one branch is found several ways, and its PR is attached", () => {
  const idx = new Map([[REPO, [{ name: "feat/50-pr-branch", committedDate: "2026-10-23T09:30:00Z" }]]]);
  const b = build([issue(50, {
    linkedBranches: { nodes: [{ ref: { name: "feat/50-pr-branch", repository: { nameWithOwner: REPO, isPrivate: false }, target: { committedDate: "2026-10-23T09:30:00Z" } } }] },
    closedByPullRequestsReferences: { nodes: [pr()] },
  })], idx);
  assert.deepEqual(work(b, 50).branches.map((x) => [x.name, x.source, x.prs]), [["feat/50-pr-branch", "linked", [300]]]);
  assert.equal(work(b, 50).prs.length, 1);
});

test("issues without any branch or PR get an empty work block", () => {
  assert.deepEqual(work(build([issue(50)]), 50), { branches: [], prs: [], hidden: 0, truncated: false });
});

test("private repos, drafts and redacted items export no names, only counts", () => {
  const priv = issue(7, { linkedBranches: { nodes: [{ ref: { name: "secret/7-x", repository: { nameWithOwner: "O/Priv", isPrivate: true }, target: null } }] } }, "O/Priv", true);
  const draft = { id: "PVTI_d", type: "DRAFT_ISSUE", status: { name: "Ready" }, content: { __typename: "DraftIssue", title: "secret-draft" } };
  const redacted = { id: "PVTI_r", type: "REDACTED", content: null };
  const pub = issue(50, {
    closedByPullRequestsReferences: { nodes: [pr({ number: 77, title: "secret-pr", headRefName: "secret/50-y", repository: { nameWithOwner: "O/Priv", isPrivate: true }, headRepository: { nameWithOwner: "O/Priv", isPrivate: true } })] },
  });
  const b = build([priv, draft, redacted, pub], new Map([["O/Priv", [{ name: "secret/7-z", committedDate: "2026-10-01T00:00:00Z" }]]]));
  assert.equal(JSON.stringify(b).includes("secret"), false);
  assert.deepEqual(work(b, 50), { branches: [], prs: [], hidden: 1, truncated: false });
  assert.deepEqual(validateBoard(b), []);
});

test("old boards without work still validate", () => {
  const sample = JSON.parse(readFileSync(resolve(here, "../fixtures/board.sample.json"), "utf8"));
  assert.deepEqual(validateBoard(sample), []);
  assert.ok(sample.items.every((i) => !("work" in i)));
});

const page = (names, next) => ({ data: { repository: { refs: { pageInfo: { hasNextPage: !!next, endCursor: next ?? null }, nodes: names.map((name) => ({ name, target: { committedDate: "2026-10-01T00:00:00Z" } })) } } } });

test("branch listing is paged, cached per repo and bounded", async () => {
  const calls = [];
  const run = async (q, v) => { calls.push(`${v.owner}/${v.name}@${v.after ?? ""}`); return v.after ? page(["b2"], "c2") : page(["b1"], "c1"); };
  const { index, truncated } = await fetchRepoBranches(run, ["O/A", "O/A", "O/B"], { maxPages: 2 });
  assert.deepEqual(calls, ["O/A@", "O/A@c1", "O/B@", "O/B@c1"]);
  assert.deepEqual(index.get("O/A").map((b) => b.name), ["b1", "b2"]);
  assert.deepEqual(truncated.sort(), ["O/A", "O/B"]);
});

test("a failing branch listing degrades to a warning, not a crash", async () => {
  const { index, errors } = await fetchRepoBranches(async () => { throw new Error("boom"); }, ["O/A"]);
  assert.equal(index.has("O/A"), false);
  assert.match(errors[0], /O\/A.*boom/);
});

test("contract still loads (sanity)", () => assert.ok(contract.project));

// ───── review of #215 (epic #213) ─────
const names = (n, list) => work(build([issue(n)], new Map([[REPO, list.map((name) => ({ name, committedDate: "2026-10-01T00:00:00Z" }))]])), n).branches.map((x) => x.name);

test("name matching: the number must be a delimited token, never next to a dot or a digit", () => {
  const list = ["release/v2.0.12", "release/2.0.12", "v2.0.18-hotfix", "feat/213-215-branches", "fix/#18-typo", "feat/x_12", "chore/12.5-bump", "feat/a12-b"];
  assert.deepEqual(names(2, list), []);
  assert.deepEqual(names(12, list), ["feat/x_12"]);
  assert.deepEqual(names(18, list), ["fix/#18-typo"]);
  assert.deepEqual(names(213, list), ["feat/213-215-branches"]);
  assert.deepEqual(names(215, list), ["feat/213-215-branches"]);
});

test("name matching skips dependabot/ and renovate/ branches and version-like names", () => {
  const list = ["dependabot/npm_and_yarn/types/node-18", "dependabot/github_actions/actions/checkout-2", "renovate/node-12.x", "renovate/major-18", "release/v2-12", "hotfix/2.0.12/18"];
  for (const n of [2, 12, 18]) assert.deepEqual(names(n, list), [], `#${n}`);
});

test("lists GitHub cut off are flagged: work.truncated when a total or an older page says there is more", () => {
  const node = (i) => ({ ref: { name: `feat/50-${i}`, repository: { nameWithOwner: REPO, isPrivate: false }, target: null } });
  const full = build([issue(50, { linkedBranches: { totalCount: 2, nodes: [node(1), node(2)] }, closedByPullRequestsReferences: { totalCount: 0, nodes: [] }, timelineItems: { pageInfo: { hasPreviousPage: false }, nodes: [] } })]);
  assert.equal(work(full, 50).truncated, false);
  const cases = [
    { linkedBranches: { totalCount: 14, nodes: [node(1)] } },
    { closedByPullRequestsReferences: { totalCount: 11, nodes: [pr()] } },
    { timelineItems: { pageInfo: { hasPreviousPage: true }, nodes: [] } },
  ];
  for (const c of cases) {
    const b = build([issue(50, c)]);
    assert.equal(work(b, 50).truncated, true, Object.keys(c)[0]);
    assert.deepEqual(validateBoard(b), []);
  }
});

test("the query reads the newest 20 cross-references and asks for totals or page info of every capped list", async () => {
  const { ITEMS_QUERY } = await import("../lib/queries.mjs");
  assert.match(ITEMS_QUERY, /timelineItems\(last: 20, itemTypes: \[CROSS_REFERENCED_EVENT\]\) \{ pageInfo \{ hasPreviousPage \}/);
  assert.match(ITEMS_QUERY, /linkedBranches\(first: 10\) \{ totalCount /);
  assert.match(ITEMS_QUERY, /closedByPullRequestsReferences\(first: 10, includeClosedPrs: true\) \{ totalCount /);
  const schema = JSON.parse(readFileSync(resolve(here, "../board.schema.json"), "utf8"));
  const w = schema.properties.items.items.properties.work;
  assert.deepEqual(w.properties.truncated, { type: "boolean" });
  assert.ok(!w.required.includes("truncated"), "boards from before keep validating");
});
