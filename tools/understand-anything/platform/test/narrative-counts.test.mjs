import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const narrativePath = fileURLToPath(
  new URL("../narrative/platform-enrich.json", import.meta.url),
);
const script = fileURLToPath(
  new URL("../narrative/apply-platform-enrich.mjs", import.meta.url),
);
const narrative = JSON.parse(readFileSync(narrativePath, "utf8"));
function render(graph, run) {
  const root = mkdtempSync(path.join(tmpdir(), "ua-narrative-counts-"));
  try {
    const file = path.join(root, "graph.json");
    writeFileSync(file, JSON.stringify(graph));
    const result = spawnSync(process.execPath, [script, file, narrativePath], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    run(JSON.parse(readFileSync(file, "utf8")), JSON.parse(result.stdout));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function verify(graph, report) {
  assert.deepEqual(report.missingStats, []);
  const stats = graph.metadata.stats;
  const database = graph.nodes.find((n) => n.id === "service:ORISO-Database")
    .metadata.semanticClaim.priorSummary;
  assert.ok(
    database.includes(`${stats.services["ORISO-Database"].tables} table`),
    database,
  );
  const docs = graph.nodes.find((n) => n.id === "service:ORISO-Docs").metadata
    .semanticClaim.priorSummary;
  assert.ok(docs.includes(`${stats.governs} governs`), docs);
  assert.ok(docs.includes(`${stats.documents} documents`), docs);
  const data = graph.tour.find(
    (t) => t.title === "Who owns which data",
  ).description;
  assert.ok(data.includes(`${stats.tables} table`), data);
  for (const repo of [
    "ORISO-UserService",
    "ORISO-TenantService",
    "ORISO-AgencyService",
    "ORISO-ConsultingTypeService",
    "ORISO-Database",
  ])
    assert.ok(data.includes(`${repo}: ${stats.services[repo].tables}`), data);
  assert.ok(!JSON.stringify(graph).includes("{{stats."));
}
test("real narrative CLI renders changing graph counts instead of fixed historic totals", () => {
  for (const n of [0, 903]) {
    const stats = Object.fromEntries(
      [
        "tables",
        "governs",
        "mentions",
        "documents",
        "endpointsTotal",
        "endpointsOwn",
        "endpointsExternal",
        "specDrift",
        "consumes",
        "frontendCallers",
        "adminCallers",
        "callsTotal",
        "callsUnconfirmed",
        "callsWildcard",
        "callsPathOnly",
        "endpointsOwnUncalled",
        "deadCalls",
        "dependsOn",
      ].map((k) => [k, n]),
    );
    stats.services = Object.fromEntries(
      Object.keys(narrative.serviceSummaries).map((id) => [
        id.replace("service:", ""),
        Object.fromEntries(
          [
            "tables",
            "endpointsOwn",
            "endpointsConsumed",
            "endpointsOwnUncalled",
            "callsIn",
            "callsOut",
          ].map((k) => [k, n]),
        ),
      ]),
    );
    const nodes = Object.keys(narrative.serviceSummaries).map((id) => ({
      id,
      type: "service",
      name: id,
      summary: "structural",
      tags: [],
      complexity: "simple",
    }));
    render({ nodes, edges: [], layers: [], metadata: { stats } }, verify);
  }
});
test(
  "narrative renders the actual platform graph statistics",
  { skip: !process.env.UA_REAL_PLATFORM_GRAPH },
  () => {
    render(
      JSON.parse(readFileSync(process.env.UA_REAL_PLATFORM_GRAPH, "utf8")),
      verify,
    );
  },
);

test("authored ADR references use exact repository and full document path identities", () => {
  const refs = [
    ...narrative.concepts.flatMap((c) => c.related ?? []),
    ...narrative.tour.flatMap((t) => t.nodeIds ?? []),
  ].filter((id) => id.startsWith("document:adr:"));
  assert.equal(new Set(refs).size, 16);
  for (const id of refs)
    assert.match(id, /^document:adr:ORISO-[^:]+:[^:]+\/[^/]+\.md$/);
});
test(
  "actual ADR links survive narrative merge without changing source documents or reviewed flows",
  { skip: !process.env.UA_REAL_PLATFORM_GRAPH },
  () => {
    const graph = JSON.parse(
      readFileSync(process.env.UA_REAL_PLATFORM_GRAPH, "utf8"),
    );
    const sourceNodes = graph.nodes.filter(
      (n) =>
        n.id.startsWith("document:adr:") ||
        n.tags?.includes("source-walkthrough"),
    );
    const sourceIds = new Set(sourceNodes.map((n) => n.id));
    const flowEdges = graph.edges.filter(
      (e) =>
        sourceIds.has(e.source) &&
        [
          "flow_step",
          "contains_flow",
          "on_error",
          "compensates",
          "tested_by",
        ].includes(e.type),
    );
    render(graph, (output, report) => {
      assert.deepEqual(report.droppedRefs, []);
      for (const node of sourceNodes)
        assert.deepEqual(
          output.nodes.find((n) => n.id === node.id),
          node,
        );
      for (const edge of flowEdges)
        assert.ok(
          output.edges.some((e) => JSON.stringify(e) === JSON.stringify(edge)),
        );
      for (const concept of narrative.concepts)
        for (const target of concept.related ?? [])
          if (target.startsWith("document:adr:"))
            assert.ok(
              output.edges.some(
                (e) =>
                  e.source === concept.id &&
                  e.target === target &&
                  e.type === "related",
              ),
              target,
            );
      for (const step of narrative.tour)
        for (const target of step.nodeIds ?? [])
          if (target.startsWith("document:adr:"))
            assert.ok(
              output.tour.some(
                (t) => t.title === step.title && t.nodeIds.includes(target),
              ),
              target,
            );
    });
  },
);
