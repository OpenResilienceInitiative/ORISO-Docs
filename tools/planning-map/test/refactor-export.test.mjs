// Refactoring tasks in the board export (ORISO-Docs#222; seam 1). board.json items carry `refactor` for tasks with the label.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildBoard, validateBoard, contract } from "../lib/board.mjs";
import { ITEMS_QUERY } from "../lib/queries.mjs";
import { REFACTORING_LABEL } from "../lib/refactor-marker.mjs";

const NOW = "2026-10-24T12:00:00Z";
const REPO = "OpenResilienceInitiative/ORISO-Docs";
const meta = { projectV2: { title: "T", fields: { nodes: [] } } };
const marker = (scope) => `text\n<!-- oriso:refactor:v1 scope=${scope} -->\n`;
const issue = (number, { labels = [], body = "", repo = REPO, isPrivate = false, draft = false } = {}) => ({
  id: `PVTI_${number}`, type: draft ? "DRAFT_ISSUE" : "ISSUE", status: { name: "Backlog" }, readiness: null,
  content: draft ? { __typename: "DraftIssue", title: "draft", body }
    : { __typename: "Issue", number, title: `Issue ${number}`, url: `https://github.com/${repo}/issues/${number}`, state: "OPEN", updatedAt: NOW, body,
      repository: { nameWithOwner: repo, isPrivate }, issueType: { name: "Task" }, assignees: { nodes: [] }, parent: null, issueFieldValues: { nodes: [] },
      labels: { nodes: labels.map((name) => ({ name })) } },
});
const build = (items) => buildBoard({ meta, items, totalCount: items.length, title: "T" }, { syncedAt: NOW });
const item = (board, n) => board.items.find((i) => i.number === n);

test("the category is pinned in the board contract: a label, no board field", () => {
  assert.deepEqual(contract.categories.refactoring, { kind: "label", name: REFACTORING_LABEL, note: contract.categories.refactoring.note });
  assert.equal(REFACTORING_LABEL, "refactoring");
  assert.ok(!("refactoring" in contract.fields), "no board field is invented");
  assert.match(ITEMS_QUERY, /labels\(first: \d+\)/, "the query reads the labels");
});

test("a task with the label exports its scope from the marker", () => {
  const board = build([issue(1, { labels: ["refactoring", "bug"], body: marker("email-templates:ORISO-Frontend:src/mails") })]);
  assert.deepEqual(item(board, 1).refactor, { scope: "email-templates:ORISO-Frontend:src/mails" });
  assert.deepEqual(validateBoard(board), []);
});

test("a labelled task without a marker (made by hand) is a refactoring task with no scope", () => {
  assert.deepEqual(item(build([issue(2, { labels: ["refactoring"], body: "plain" })]), 2).refactor, { scope: null });
});

test("the marker alone does not make a refactoring task: the label is the category", () => {
  assert.equal("refactor" in item(build([issue(3, { labels: ["bug"], body: marker("chat") })]), 3), false);
  assert.equal("refactor" in item(build([issue(4, { body: marker("chat") })]), 4), false);
});

test("a malformed or unknown-shaped marker gives no scope, never an invented one", () => {
  for (const body of ["<!-- oriso:refactor:v1 scope=Chat -->", "<!-- oriso:refactor:v1 scope=chat:../x -->", "<!-- oriso:refactor:v2 scope=chat -->", "<!-- oriso:refactor:v1 scope= -->"]) {
    assert.deepEqual(item(build([issue(5, { labels: ["refactoring"], body })]), 5).refactor, { scope: null }, body);
  }
});

test("private repositories and drafts never contribute a refactoring entry", () => {
  const board = build([issue(6, { labels: ["refactoring"], body: marker("chat"), repo: "OpenResilienceInitiative/ORISO-E2E", isPrivate: true }), issue(7, { labels: ["refactoring"], body: marker("chat"), draft: true })]);
  assert.deepEqual(board.items, []);
  assert.equal(JSON.stringify(board).includes("scope=chat"), false);
});

test("boards from before #222 stay valid (refactor is optional)", () => {
  const old = JSON.parse(readFileSync(new URL("../fixtures/board.sample.json", import.meta.url), "utf8"));
  assert.deepEqual(validateBoard(old), []);
});
