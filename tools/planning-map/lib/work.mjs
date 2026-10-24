// Branches and PRs per issue (ORISO-Docs#215). Pure normalisation of the GraphQL answers plus a
// bounded, per-repo cached branch listing. Sources, strongest first: linked > pr > name.
import { REPO_BRANCHES_QUERY } from "./queries.mjs";

const RANK = { linked: 0, pr: 1, name: 2 };
export const DEFAULT_MAX_BRANCH_PAGES = 5; // 5 x 100 branches per repo

const branchUrl = (repo, name) => `https://github.com/${repo}/tree/${name.split("/").map(encodeURIComponent).join("/")}`;
// Name-only matching (the weakest source): the issue number must be a token of the branch name, delimited by start, "/",
// "-" or "_" before (an optional "#" allowed) and "/", "-", "_" or end after, so "feat/213-215-x" names #213 and #215 but
// "release/v2.0.12" names neither #2 nor #12. Bot branches (dependabot/, renovate/) and version-like names never match:
// their numbers are versions, not issues.
const BOT_BRANCH = /^(dependabot|renovate)\//;
const versionLike = (name) => name.split("/").some((seg) => /^v\d/i.test(seg) || /\d+\.\d+/.test(seg));
export const nameMatches = (name, number) =>
  Number.isInteger(number) && number > 0 && !BOT_BRANCH.test(name) && !versionLike(name) && new RegExp(`(?:^|[/_-])#?${number}(?:[/_-]|$)`).test(name);

export async function fetchRepoBranches(run, repos, { maxPages = DEFAULT_MAX_BRANCH_PAGES } = {}) {
  const index = new Map();
  const truncated = [];
  const errors = [];
  for (const repo of new Set(repos)) {
    if (index.has(repo)) continue;
    const [owner, name] = repo.split("/");
    const list = [];
    let after = null;
    try {
      for (let p = 0; ; p++) {
        const refs = (await run(REPO_BRANCHES_QUERY, { owner, name, after })).data.repository.refs;
        for (const n of refs.nodes) list.push({ name: n.name, committedDate: n.target?.committedDate ?? null });
        if (!refs.pageInfo.hasNextPage) break;
        if (p + 1 >= maxPages) { truncated.push(repo); break; }
        after = refs.pageInfo.endCursor;
      }
      index.set(repo, list);
    } catch (e) {
      errors.push(`${repo}: ${e.message}`);
    }
  }
  return { index, truncated, errors };
}

const prFromNode = (n) => {
  const c = n.commits?.nodes?.[0]?.commit;
  return {
    number: n.number, repository: n.repository.nameWithOwner, title: n.title ?? "", url: n.url, state: n.state,
    isDraft: !!n.isDraft, checks: c?.statusCheckRollup?.state ?? null, reviewDecision: n.reviewDecision ?? null,
    updatedAt: n.updatedAt ?? null, branch: n.headRefName ?? null, lastCommitDate: c?.committedDate ?? null,
  };
};

// A capped list GitHub cut off: a totalCount above what came back, or (timeline, read newest first) an older page.
const cut = (conn) => !!conn && ((typeof conn.totalCount === "number" && conn.totalCount > (conn.nodes?.length ?? 0)) || conn.pageInfo?.hasPreviousPage === true);

// content: raw Issue node; repo: its repository; isHidden(repo, isPrivateFlag) -> true for private repos.
// -> {branches, prs, hidden, truncated}; truncated: one of the capped lists (linked branches, closing PRs, cross-references) has more.
export function buildWork(content, repo, { branchIndex = new Map(), isHidden = () => false } = {}) {
  const branches = new Map(); // "repo\0name" -> branch
  const prs = new Map();
  let hidden = 0;
  const addBranch = (b) => {
    const key = `${b.repository}\0${b.name}`;
    const have = branches.get(key);
    if (!have) return branches.set(key, { ...b, prs: [...b.prs] });
    if (RANK[b.source] < RANK[have.source]) have.source = b.source;
    have.lastCommitDate ??= b.lastCommitDate;
    for (const n of b.prs) if (!have.prs.includes(n)) have.prs.push(n);
  };

  for (const l of content.linkedBranches?.nodes ?? []) {
    const ref = l?.ref;
    if (!ref) continue;
    const r = ref.repository?.nameWithOwner ?? repo;
    if (isHidden(r, ref.repository?.isPrivate)) { hidden++; continue; }
    addBranch({ name: ref.name, repository: r, source: "linked", lastCommitDate: ref.target?.committedDate ?? null, url: branchUrl(r, ref.name), prs: [] });
  }

  const prNodes = [
    ...(content.closedByPullRequestsReferences?.nodes ?? []),
    ...(content.timelineItems?.nodes ?? []).filter((e) => e?.source?.__typename === "PullRequest").map((e) => e.source),
  ];
  for (const n of prNodes) {
    if (!n?.number || !n.repository) continue;
    const key = `${n.repository.nameWithOwner}#${n.number}`;
    if (prs.has(key)) continue;
    if (isHidden(n.repository.nameWithOwner, n.repository.isPrivate)) { hidden++; prs.set(key, null); continue; }
    const p = prFromNode(n);
    prs.set(key, p);
    const head = n.headRepository;
    if (p.branch && head && !isHidden(head.nameWithOwner, head.isPrivate)) {
      addBranch({ name: p.branch, repository: head.nameWithOwner, source: "pr", lastCommitDate: p.lastCommitDate, url: branchUrl(head.nameWithOwner, p.branch), prs: [p.number] });
    }
  }

  if (content.number != null && !isHidden(repo)) {
    for (const b of branchIndex.get(repo) ?? []) {
      if (nameMatches(b.name, content.number)) addBranch({ name: b.name, repository: repo, source: "name", lastCommitDate: b.committedDate, url: branchUrl(repo, b.name), prs: [] });
    }
  }

  return {
    branches: [...branches.values()],
    prs: [...prs.values()].filter(Boolean).map(({ lastCommitDate, ...p }) => p),
    hidden,
    truncated: cut(content.linkedBranches) || cut(content.closedByPullRequestsReferences) || cut(content.timelineItems),
  };
}
