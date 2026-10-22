// GraphQL documents. ASSUMPTION (unverified from the sandbox, which has no org access):
// issue fields are exposed as Issue.issueFieldValues (union of IssueField*Value types) and
// org definitions as Organization.issueFields. If the live schema differs, only this file
// and normalizeIssueFieldValue/normalizeIssueFieldDefs in board.mjs need adjusting.
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
          readiness: fieldValueByName(name: "Readiness") { ... on ProjectV2ItemFieldNumberValue { number } }
          content {
            __typename
            ... on DraftIssue { title updatedAt }
            ... on Issue {
              number title url state updatedAt
              repository { nameWithOwner isPrivate }
              issueType { name }
              parent { number repository { nameWithOwner isPrivate } }
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
            }
          }
        }
      }
    }
  }
}`;

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
