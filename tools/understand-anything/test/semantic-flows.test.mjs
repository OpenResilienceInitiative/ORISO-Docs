import { test } from "node:test";
import assert from "node:assert/strict";
import { addOrderedFlows } from "../lib/semantic-flows.mjs";
import { projectSemanticFlows } from "../platform/lib/semantic-projection.mjs";
const sha = "a".repeat(40),
  fp = "b".repeat(64);
const nodes = ["src/entry.js", "test/entry.test.js"].map((filePath) => ({
  id: `file:${filePath}`,
  type: "file",
  filePath,
  lineRange: [1, 4],
  metadata: { sourceFingerprint: fp },
}));
const make = () => ({
  project: { gitCommitHash: sha },
  nodes: structuredClone(nodes),
  edges: [],
});
const claim = {
  sourceCommit: sha,
  generatedAt: "2026-09-06T22:00:00Z",
  reviewedAt: "2026-09-06T22:00:00Z",
  generationId: "g-review",
  confidence: "source-reviewed",
  evidence: nodes.map((n) => ({
    nodeId: n.id,
    sourceCommit: sha,
    sourceRange: n.lineRange,
    kind: n.filePath.startsWith("test/") ? "test-source" : "source",
    sourceFingerprint: fp,
  })),
  acceptanceEvidence: [],
};
const flow = () => ({
  id: "flow:entry",
  name: "Entry",
  summary: "Source outline",
  claim,
  steps: [
    {
      name: "Check",
      summary: "Validate",
      sources: ["src/entry.js"],
      tests: ["test/entry.test.js"],
      onError: { name: "Reject", summary: "Throw", sources: ["src/entry.js"] },
    },
    {
      name: "Apply",
      summary: "Write",
      sources: ["src/entry.js"],
      tests: ["test/entry.test.js"],
    },
  ],
});
test("ordered source flow contains real test/error edges and survives platform projection", () => {
  const g = make();
  addOrderedFlows(g, [flow()]);
  assert.equal(g.edges.filter((e) => e.type === "flow_step").length, 1);
  assert.equal(g.edges.filter((e) => e.type === "tested_by").length, 2);
  assert.equal(g.edges.filter((e) => e.type === "on_error").length, 1);
  assert.ok(g.edges.every((e) => e.metadata.runtimeVerified === false));
  const ns = [],
    es = [];
  projectSemanticFlows(
    { R: { graph: g } },
    (n) => ns.push(n),
    (e) => es.push(e),
  );
  assert.ok(
    es.every(
      (e) =>
        ns.some((n) => n.id === e.source) && ns.some((n) => n.id === e.target),
    ),
  );
  assert.equal(es.length, g.edges.length);
});
test("source change quarantines whole ordered flow, preserving no current-flow inference", () => {
  const g = make();
  g.nodes[0].metadata.sourceFingerprint = "c".repeat(64);
  addOrderedFlows(g, [flow()]);
  assert.equal(g.edges.length, 0);
  assert.equal(g.metadata.quarantinedFlows[0].status, "stale");
});
test("missing tests or error handling rejects a source-current walkthrough", () => {
  for (const change of [
    (f) => (f.steps[0].tests = []),
    (f) => delete f.steps[0].onError,
    (f) => (f.steps[0].tests = ["src/entry.js"]),
  ]) {
    const f = flow();
    change(f);
    assert.throws(() => addOrderedFlows(make(), [f]));
  }
});

test("future-dated flow is quarantined before adding ordered or test edges", () => {
  const g = make(),
    f = flow();
  f.claim = { ...f.claim, reviewedAt: "2026-09-07T00:00:00Z" };
  addOrderedFlows(g, [f], { now: () => Date.parse("2026-09-06T22:58:21Z") });
  assert.equal(g.edges.length, 0);
  assert.equal(g.metadata.quarantinedFlows[0].status, "unbound");
  assert.match(
    g.metadata.quarantinedFlows[0].reason,
    /Invalid semantic chronology/,
  );
});

test("all source, test, error and compensation references require reviewed evidence", () => {
  for (const role of ["source", "test", "error", "compensation"]) {
    const g = make(),
      f = structuredClone(flow());
    const filePath =
      role === "test" ? "test/unbound.test.js" : "src/unbound.js";
    g.nodes.push({
      ...structuredClone(nodes[0]),
      id: `file:${filePath}`,
      filePath,
    });
    if (role === "source") f.steps[0].sources = [filePath];
    if (role === "test") f.steps[0].tests = [filePath];
    if (role === "error") f.steps[0].onError.sources = [filePath];
    if (role === "compensation")
      f.steps[0].compensation = {
        name: "Undo",
        summary: "Undo",
        sources: [filePath],
      };
    assert.throws(
      () => addOrderedFlows(g, [f]),
      /not covered by claim evidence/,
    );
    assert.equal(g.edges.length, 0);
    assert.equal(g.nodes.length, 3);
  }
});
test("inferred and uncertain claims retain confidence on every emitted edge", () => {
  for (const confidence of ["inferred", "uncertain"]) {
    const g = make(),
      f = structuredClone(flow());
    f.claim.confidence = confidence;
    addOrderedFlows(g, [f]);
    assert.ok(g.edges.length > 0);
    assert.ok(g.edges.every((e) => e.metadata.evidenceKind === confidence));
  }
});
test("contest and special filenames are not source tests despite reviewed evidence", () => {
  for (const filePath of [
    "src/contest.js",
    "src/special.js",
    "src/testingHelpers.js",
  ]) {
    const g = make(),
      f = structuredClone(flow());
    g.nodes[1].filePath = filePath;
    g.nodes[1].id = `file:${filePath}`;
    f.claim.evidence[1].nodeId = g.nodes[1].id;
    for (const step of f.steps) step.tests = [filePath];
    assert.throws(() => addOrderedFlows(g, [f]), /Invalid flow test source/);
  }
});
test("steps and explicit failure branches cannot carry unanchored prose", () => {
  for (const change of [
    (f) => (f.steps[0].sources = []),
    (f) => (f.steps[0].onError.sources = []),
  ]) {
    const g = make(),
      f = structuredClone(flow());
    change(f);
    assert.throws(() => addOrderedFlows(g, [f]), /source reference/);
  }
});

test("tested_by requires explicit test-source evidence, not source-only evidence", () => {
  const g = make(),
    f = structuredClone(flow());
  f.claim.evidence[1].kind = "source";
  assert.throws(() => addOrderedFlows(g, [f]), /test-source evidence/);
  assert.equal(g.edges.length, 0);
});

test("repeated authored source and test aliases emit one logical relation", () => {
  const g = make(),
    f = structuredClone(flow());
  f.steps[0].sources.push("file:src/entry.js", "src/entry.js");
  f.steps[0].tests.push("file:test/entry.test.js");
  f.steps[0].onError.sources.push("file:src/entry.js");
  addOrderedFlows(g, [f]);
  const keys = g.edges.map((e) => JSON.stringify([e.source, e.target, e.type]));
  assert.equal(new Set(keys).size, keys.length);
});

test("conflicting metadata on the same logical relation rejects without partial additions", () => {
  const g = make(),
    f = structuredClone(flow());
  const edge = {
    source: g.nodes[0].id,
    target: g.nodes[1].id,
    type: "related",
    direction: "forward",
    weight: 1,
    metadata: { evidenceKind: "source-reviewed" },
  };
  g.edges = [edge, { ...edge, metadata: { evidenceKind: "inferred" } }];
  assert.throws(() => addOrderedFlows(g, [f]), /Conflicting semantic relation/);
  assert.equal(g.nodes.length, 2);
  assert.equal(g.edges.length, 2);
});
