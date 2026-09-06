import { isDeepStrictEqual } from "node:util";
import { assessClaim, resolveReference } from "./semantic-claims.mjs";
// Ordered source walkthroughs have an explicit error branch; test links identify
// relevant source tests and make no assertion that those tests have been run.
export function addOrderedFlows(graph, flows = [], options = {}) {
  const additions = { nodes: [], edges: [] },
    ids = new Set(graph.nodes.map((n) => n.id));
  const relations = new Map();
  const register = ({ id: _id, ...relation }) => {
    const key = JSON.stringify([
      relation.source,
      relation.target,
      relation.type,
    ]);
    if (relations.has(key)) {
      if (!isDeepStrictEqual(relations.get(key), relation))
        throw new Error(`Conflicting semantic relation: ${key}`);
      return false;
    }
    relations.set(key, relation);
    return true;
  };
  for (const relation of graph.edges) register(relation);
  for (const flow of flows) {
    const assessment = assessClaim(flow.claim, graph, options);
    if (assessment.status !== "source-current") {
      graph.metadata ??= {};
      (graph.metadata.quarantinedFlows ??= []).push({
        id: flow.id,
        ...assessment,
      });
      continue;
    }
    const edge = (source, target, type, metadata = {}) => {
      const relation = {
        id: `${type}:${source}:${target}`,
        source,
        target,
        type,
        direction: "forward",
        weight: 1,
        metadata: {
          ...metadata,
          evidenceKind: assessment.confidence,
          runtimeVerified: false,
        },
      };
      if (register(relation)) additions.edges.push(relation);
    };
    const covered = new Set(
      flow.claim.evidence.map((e) => resolveReference(e.nodeId, graph)),
    );
    const testEvidence = new Set(
      flow.claim.evidence
        .filter((e) => e.kind === "test-source")
        .map((e) => resolveReference(e.nodeId, graph)),
    );
    const sourceTarget = (ref) => {
      const target = resolveReference(ref, graph);
      if (!target) throw new Error(`Missing flow source reference ${ref}`);
      if (!covered.has(target))
        throw new Error(`Flow reference not covered by claim evidence: ${ref}`);
      return target;
    };
    if (!flow.steps?.length || !flow.steps.some((s) => s.onError))
      throw new Error(`Flow must declare steps and error handling: ${flow.id}`);
    const node = (id, type, name, summary, metadata) => {
      if (ids.has(id)) throw new Error(`Duplicate semantic node: ${id}`);
      ids.add(id);
      additions.nodes.push({
        id,
        type,
        name,
        summary,
        tags: ["source-walkthrough"],
        complexity: "moderate",
        metadata,
      });
    };
    node(flow.id, "flow", flow.name, flow.summary, {
      semanticClaim: assessment,
    });
    let previous = null;
    flow.steps.forEach((step, i) => {
      const id = `${flow.id}:step:${i + 1}`;
      node(id, "flow", step.name, step.summary, {
        semanticClaim: assessment,
        stepOrder: i + 1,
      });
      edge(flow.id, id, "contains_flow", { order: i + 1 });
      if (previous) edge(previous, id, "flow_step");
      previous = id;
      if (!step.sources?.length)
        throw new Error(`Flow step needs a source reference: ${id}`);
      for (const ref of step.sources) {
        const target = sourceTarget(ref);
        edge(id, target, "related");
      }
      if (!step.tests?.length)
        throw new Error(`Flow step needs a real source test reference: ${id}`);
      for (const ref of step.tests) {
        const target = sourceTarget(ref),
          n = graph.nodes.find((n) => n.id === target);
        if (!n || !isTestSource(n.filePath))
          throw new Error(`Invalid flow test source ${ref}`);
        if (!testEvidence.has(target))
          throw new Error(`Flow test needs test-source evidence: ${ref}`);
        edge(id, target, "tested_by", { testExecution: "not-run" });
      }
      for (const [key, type] of [
        ["onError", "on_error"],
        ["compensation", "compensates"],
      ])
        if (step[key]) {
          const detail = step[key],
            failureId = `${id}:${key}`;
          node(failureId, "flow", detail.name, detail.summary, {
            semanticClaim: assessment,
            branch: key,
          });
          edge(id, failureId, type);
          if (!detail.sources?.length)
            throw new Error(`${key} needs a source reference: ${id}`);
          for (const ref of detail.sources) {
            const target = sourceTarget(ref);
            edge(failureId, target, "related");
          }
        }
    });
  }
  graph.nodes.push(...additions.nodes);
  graph.edges.push(...additions.edges);
  return additions;
}

// Recognize explicit test locations/naming conventions, never substrings such as
// contest.js. This classifies a source link only, not test execution or coverage.
function isTestSource(filePath) {
  if (typeof filePath !== "string") return false;
  const path = filePath.replaceAll("\\", "/");
  return (
    /(?:^|\/)(?:test|tests|__tests__|spec|specs)\//i.test(path) ||
    /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(path) ||
    /(?:^|\/)(?:Test[^/]*|[^/]+(?:Test|Tests|IT))\.java$/.test(path) ||
    /(?:^|\/)(?:test_[^/]+|[^/]+_test)\.py$/.test(path)
  );
}
