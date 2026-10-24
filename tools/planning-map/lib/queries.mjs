// GraphQL documents. ASSUMPTION (unverified from the sandbox, which has no org access):
// issue fields are exposed as Issue.issueFieldValues (union of IssueField*Value types) and
// org definitions as Organization.issueFields. If the live schema differs, only this file
// and normalizeIssueFieldValue/normalizeIssueFieldDefs in board.mjs need adjusting.
// ORISO-Docs#215. UNVERIFIED against the live schema (GitHub GraphQL is not reachable from the
// sandbox). All branch/PR field names live in this block; if one is wrong, fix only it:
//   Issue.linkedBranches -> LinkedBranch.ref (Ref.target Commit.committedDate)
//   Issue.closedByPullRequestsReferences(first, includeClosedPrs)
//   Issue.timelineItems(itemTypes: [CROSS_REFERENCED_EVENT]) -> CrossReferencedEvent.source (PullRequest)
//   PullRequest.isDraft / reviewDecision / headRefName / headRepository / commits(last:1).commit.statusCheckRollup.state
//   Repository.refs(refPrefix: "refs/heads/") -> Ref.name, Ref.target Commit.committedDate
const PR_WORK_FRAGMENT = `
fragment PrWork on PullRequest {
  number title url state isDraft reviewDecision updatedAt headRefName
  repository { nameWithOwner isPrivate }
  headRepository { nameWithOwner isPrivate }
  commits(last: 1) { nodes { commit { committedDate statusCheckRollup { state } } } }
}`;
const ISSUE_WORK_FIELDS = `
  linkedBranches(first: 10) { nodes { ref { name repository { nameWithOwner isPrivate } target { ... on Commit { committedDate } } } } }
  closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { ...PrWork } }
  timelineItems(first: 20, itemTypes: [CROSS_REFERENCED_EVENT]) { nodes { __typename ... on CrossReferencedEvent { source { __typename ...PrWork } } } }`;

export const REPO_BRANCHES_QUERY = `
query RepoBranches($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    refs(refPrefix: "refs/heads/", first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { name target { ... on Commit { committedDate } } }
    }
  }
}`;

export const ITEMS_QUERY = `
query($owner: String!, $number: Int!, $after: String) {
  organization(login: $owner) {
    projectV2(number: $number) {
      title
      items(first: 100, after: $after) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          type
          status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
          gate: fieldValueByName(name: "Gate") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
          readiness: fieldValueByName(name: "Readiness") { ... on ProjectV2ItemFieldNumberValue { number } }
          content {
            __typename
            ... on Issue {
              number title url state updatedAt
              repository { nameWithOwner isPrivate }
              issueType { name }
              assignees(first: 20) { nodes { login } }
              parent { number repository { nameWithOwner isPrivate } }
              ${ISSUE_WORK_FIELDS}
              issueFieldValues(first: 20) {
                nodes {
                  __typename
                  ... on IssueFieldSingleSelectValue { name field { ... on IssueFieldSingleSelect { name } } }
                  ... on IssueFieldMultiSelectValue { options { name } field { ... on IssueFieldMultiSelect { name } } }
                }
              }
            }
            ... on PullRequest {
              number title url state updatedAt
              repository { nameWithOwner isPrivate }
              assignees(first: 20) { nodes { login } }
            }
          }
        }
      }
    }
  }
}
${PR_WORK_FRAGMENT}`;

export const META_QUERY = `
query($owner: String!, $number: Int!) {
  organization(login: $owner) {
    projectV2(number: $number) {
      title
      fields(first: 50) {
        nodes {
          __typename
          ... on ProjectV2SingleSelectField { name options { name } }
          ... on ProjectV2Field { name dataType }
        }
      }
    }
    issueFields(first: 50) {
      nodes {
        __typename
        ... on IssueFieldSingleSelect { name options { name } }
        ... on IssueFieldMultiSelect { name options { name } }
      }
    }
  }
}`;
