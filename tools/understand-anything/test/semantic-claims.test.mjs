import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveReference,
  resolveHistoricalReference,
  assessClaim,
  applyNodeSummary,
} from "../lib/semantic-claims.mjs";
const sha = "a".repeat(40),
  hash = "b".repeat(64);
const node = () => ({
  id: "file:src/a.js",
  type: "file",
  name: "a.js",
  filePath: "src/a.js",
  lineRange: [1, 9],
  summary: "structural",
  metadata: { sourceFingerprint: hash },
});
const graph = () => ({
  project: { gitCommitHash: sha },
  nodes: [node()],
  metadata: { generationId: "g1" },
});
const claim = () => ({
  sourceCommit: sha,
  generatedAt: "2026-09-06T22:00:00Z",
  reviewedAt: "2026-09-06T22:00:00Z",
  generationId: "review-g1",
  confidence: "source-reviewed",
  evidence: [
    {
      nodeId: "file:src/a.js",
      sourceCommit: sha,
      sourceRange: [1, 9],
      sourceFingerprint: hash,
      kind: "source",
    },
  ],
  acceptanceEvidence: [],
});
test("stable ID with changed body retains prose only as visibly stale orientation", () => {
  const g = graph();
  g.nodes[0].metadata.sourceFingerprint = "c".repeat(64);
  const result = applyNodeSummary(
    g.nodes[0],
    { summary: "previously reviewed behavior", claim: claim() },
    g,
  );
  assert.equal(result.status, "stale");
  assert.match(
    g.nodes[0].summary,
    /^\[Dated orientation; (stale|unbound) — verify current source\]/,
  );
  assert.equal(g.nodes[0].metadata.structuralSummary, "structural");
  assert.equal(g.nodes[0].metadata.semanticClaim.status, "stale");
});
test("unbound legacy prose remains visibly dated orientation with structural summary preserved", () => {
  const g = graph();
  applyNodeSummary(g.nodes[0], { summary: "old prose" }, g, {
    generatedAt: "2026-07-01",
  });
  assert.match(
    g.nodes[0].summary,
    /^\[Dated orientation; (stale|unbound) — verify current source\]/,
  );
  assert.equal(g.nodes[0].metadata.structuralSummary, "structural");
  assert.equal(g.nodes[0].metadata.semanticClaim.status, "unbound");
  assert.equal(g.nodes[0].metadata.semanticClaim.priorSummary, "old prose");
});
test("current source claim applies but is never runtime proof", () => {
  const g = graph();
  const result = applyNodeSummary(
    g.nodes[0],
    { summary: "reviewed prose", claim: claim() },
    g,
  );
  assert.equal(result.status, "source-current");
  assert.equal(g.nodes[0].summary, "reviewed prose");
  assert.equal(result.runtimeVerified, false);
});
test("range, revision and missing evidence invalidate claims", () => {
  for (const mutate of [
    (g) => (g.project.gitCommitHash = "c".repeat(40)),
    (g) => (g.nodes[0].lineRange = [2, 10]),
    (g) => (g.nodes = []),
  ]) {
    const g = graph();
    mutate(g);
    assert.notEqual(assessClaim(claim(), g).status, "source-current");
  }
});
test("ambiguous suffix, name and legacy aliases fail rather than choosing first match", () => {
  const g = graph();
  g.nodes.push({ ...node(), id: "file:other/a.js", filePath: "other/a.js" });
  assert.throws(() => resolveReference("a.js", g), /Ambiguous/);
  g.metadata.extraction = {
    legacyIdMap: { old: ["file:src/a.js", "file:other/a.js"] },
  };
  assert.throws(() => resolveReference("old", g), /Ambiguous/);
  g.metadata.extraction.legacyIdMap.old = ["file:src/a.js"];
  assert.equal(resolveReference("old", g), "file:src/a.js");
});

test("legacy ambiguity is explicitly quarantined while reviewed claims still reject it", () => {
  const g = graph();
  g.nodes.push({ ...node(), id: "file:other/a.js", filePath: "other/a.js" });
  assert.equal(resolveHistoricalReference("a.js", g), null);
  assert.equal(
    g.metadata.rejectedSemanticReferences[0].disposition,
    "quarantined",
  );
  assert.throws(
    () => resolveHistoricalReference("a.js", g, { trusted: true }),
    /Ambiguous/,
  );
});

test("future generation or review cannot become source-current at an injected evaluation time", () => {
  const now = () => Date.parse("2026-09-06T22:58:21Z");
  const c = claim();
  c.generatedAt = "2026-09-06T22:00:00Z";
  c.reviewedAt = "2026-09-06T23:00:00Z";
  assert.notEqual(assessClaim(c, graph(), { now }).status, "source-current");
  c.generatedAt = "2026-09-06T23:00:00Z";
  assert.notEqual(assessClaim(c, graph(), { now }).status, "source-current");
});
test("review before generation is rejected even when both dates are in the past", () => {
  const c = claim();
  c.generatedAt = "2026-09-06T22:00:00Z";
  c.reviewedAt = "2026-09-06T21:59:59Z";
  assert.notEqual(
    assessClaim(c, graph(), { now: () => Date.parse("2026-09-06T22:58:21Z") })
      .status,
    "source-current",
  );
});

test("evaluation boundary is explicit and an invalid date cannot overwrite the source summary", () => {
  const c = claim(),
    g = graph();
  const now = () => Date.parse(c.reviewedAt);
  assert.equal(assessClaim(c, g, { now }).status, "source-current");
  c.reviewedAt = new Date(now() + 1).toISOString();
  // Keep the original boundary after modifying the claim.
  const result = applyNodeSummary(
    g.nodes[0],
    { summary: "future prose", claim: c },
    g,
    {},
    { now: () => Date.parse("2026-09-06T22:00:00Z") },
  );
  assert.equal(result.status, "unbound");
  assert.match(result.reason, /Invalid semantic chronology/);
  assert.match(
    g.nodes[0].summary,
    /^\[Dated orientation; (stale|unbound) — verify current source\]/,
  );
  assert.equal(g.nodes[0].metadata.structuralSummary, "structural");
});

test("missing or malformed evidence ranges never qualify even when both sides match", () => {
  for (const range of [
    undefined,
    null,
    [],
    [0, 4],
    [4, 1],
    [1.5, 4],
    [1, 4, 5],
  ]) {
    const c = claim(),
      g = graph();
    c.evidence[0].sourceRange = range;
    g.nodes[0].lineRange = range;
    assert.notEqual(assessClaim(c, g).status, "source-current");
  }
});

test("missing or unknown evidence kinds cannot qualify as current semantic claims", () => {
  for (const kind of [undefined, "runtime-proof", "anything"]) {
    const c = claim();
    c.evidence[0].kind = kind;
    assert.notEqual(assessClaim(c, graph()).status, "source-current");
  }
});
