import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

test("actual platform CLI output has the complete versioned consumer envelope", async () => {
  const root = mkdtempSync(join(tmpdir(), "ua-platform-contract-"));
  try {
    const sourceCommits = {};
    for (const repo of [
      "ORISO-Admin", "ORISO-AgencyService", "ORISO-ConsultingTypeService", "ORISO-Database", "ORISO-Docs", "ORISO-E2E", "ORISO-ElementCall", "ORISO-Frontend", "ORISO-HealthDashboard", "ORISO-Helm", "ORISO-Infra", "ORISO-Keycloak", "ORISO-Livekit", "ORISO-SigNoz", "ORISO-Status", "ORISO-TenantService", "ORISO-UserService"
    ]) {
      const sourceDir = join(root, "sources", repo);
      mkdirSync(sourceDir, { recursive: true });
      const git = (...args) => execFileSync("git", ["-C", sourceDir, ...args], {encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
      git("init", "-q");
      git("-c", "user.name=UA Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-qm", "Source boundary fixture");
      const sourceSHA = git("rev-parse", "HEAD");
      sourceCommits[repo] = sourceSHA;
      const dir = join(root, "graphs", repo, ".understand-anything");
      mkdirSync(dir, { recursive: true });
      const graph = {
        version: "1.0.0",
        project: { name: repo, gitCommitHash: sourceSHA },
        nodes: ["ORISO-UserService", "ORISO-AgencyService", "ORISO-TenantService"].includes(repo)
          ? (repo === "ORISO-TenantService" ? ["/external/a", "/external/b"] : ["/users/a", "/users/b"]).map((route) => ({
              id: `endpoint:${route}`,
              type: "endpoint",
              name: `GET ${route}`,
              filePath:
                repo === "ORISO-UserService"
                  ? "api/userservice.yaml"
                  : repo === "ORISO-TenantService" ? "services/appointmentservice.yaml" : "services/userservice.yaml",
              summary: "Synthetic contract endpoint",
              tags: [],
              complexity: "simple",
              lineRange: [1, 2],
              metadata: { sourceFingerprint: "b".repeat(64) },
            }))
          : [],
        edges: [],
        layers: [],
        tour: [],
      };
      if (repo === "ORISO-UserService") graph.nodes.push({
        id: "endpoint:/appointments", type: "endpoint", name: "GET /appointments", filePath: "api/appointmentservice.yaml", summary: "Unrelated own spec with colliding basename", tags: [], complexity: "simple"
      });
      writeFileSync(join(dir, "knowledge-graph.json"), JSON.stringify(graph));
      writeFileSync(
        join(dir, "meta.json"),
        JSON.stringify({ gitCommitHash: sourceSHA }),
      );
    }
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("../ua-platform-graph.mjs", import.meta.url)),
        "--graphs-dir",
        join(root, "graphs"),
        "--repos-dir",
        join(root, "sources"),
        "--out",
        join(root, "out"),
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    let graph = JSON.parse(
      readFileSync(join(root, "out", "knowledge-graph.json")),
    );
    assert.equal(graph.version, "1.0.0");
    assert.equal(graph.schemaVersion, "oriso.ua.graph/v1");
    assert.equal(graph.kind, "oriso-platform");
    for (const key of ["nodes", "edges", "layers", "tour"])
      assert.ok(Array.isArray(graph[key]), key);
    assert.deepEqual(graph.project.sourceCommits, sourceCommits);
    assert.ok(
      graph.nodes.every(
        (n) =>
          n.filePath !== null &&
          ["simple", "moderate", "complex"].includes(n.complexity),
      ),
    );
    assert.equal(graph.metadata.stats.services["ORISO-TenantService"].endpointsConsumed, 0, "basename collision rejected by overlap is external, not consumed");
    assert.equal(graph.metadata.stats.services["ORISO-AgencyService"].endpointsConsumed, 2);
    assert.equal(graph.metadata.stats.endpointsConsumed, 2);
    const dependency = graph.edges.find((e) => e.type === "depends_on");
    assert.ok(dependency.weight <= 1);
    assert.equal(dependency.metadata.consumesWeight, 2);
    assert.equal(
      graph.nodes.find((n) => n.id === "ORISO-UserService::endpoint:/users/a")
        .metadata.sourceFingerprint,
      "b".repeat(64),
    );
    const enrichment = join(root, "narrative.json");
    writeFileSync(
      enrichment,
      JSON.stringify({
        meta: { generatedAt: "2026-07-01" },
        concepts: [
          {
            id: "concept:orientation",
            name: "Orientation",
            summary: "Historical prose",
            related: ["service:ORISO-Frontend"],
          },
        ],
      }),
    );
    const narrative = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("../narrative/apply-platform-enrich.mjs", import.meta.url),
        ),
        join(root, "out", "knowledge-graph.json"),
        enrichment,
      ],
      { encoding: "utf8" },
    );
    assert.equal(narrative.status, 0, narrative.stderr);
    graph = JSON.parse(readFileSync(join(root, "out", "knowledge-graph.json")));
    assert.equal(
      graph.nodes.find((n) => n.id === "concept:orientation").metadata
        .semanticClaim.status,
      "unbound",
    );
    if (process.env.UA_CORE) {
      const { validateGraph } = await import(
        pathToFileURL(process.env.UA_CORE)
      );
      const validated = validateGraph(graph);
      assert.equal(validated.success, true, JSON.stringify(validated));
      assert.deepEqual(validated.issues, []);
      assert.equal(validated.data.edges.length, graph.edges.length);
      assert.equal(validated.data.nodes.length, graph.nodes.length);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
