import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocsExport, aggregateDependsOn } from "../lib/export-docs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(resolve(here, "../fixtures/graph.json"), "utf8"));
const meta = JSON.parse(readFileSync(resolve(here, "../fixtures/meta.json"), "utf8"));

test("export is small and carries commit hashes", () => {
  const exp = buildDocsExport(graph, meta, { generatedAt: "2026-09-02T00:00:00.000Z" });
  assert.equal(exp.repos.length, 2);
  assert.equal(exp.repos.find((r) => r.name === "ORISO-UserService").commit, "aaa111");
  assert.equal(exp.endpoints.length, 1);
  assert.equal(exp.endpoints[0].method, "GET");
  assert.equal(exp.endpoints[0].path, "/appointments/{id}");
  assert.ok(!("nodes" in exp));
  assert.ok(!("edges" in exp));
  const json = JSON.stringify(exp);
  assert.ok(json.length < 20_000);
});

test("depends_on aggregates to repo pairs and drops self-edges", () => {
  const pairs = aggregateDependsOn(graph.edges);
  assert.deepEqual(pairs, [{ from: "ORISO-UserService", to: "ORISO-AgencyService", weight: 2 }]);
});

test("UserService is tagged Backend Microservices", () => {
  const exp = buildDocsExport(graph, meta);
  assert.equal(exp.repos.find((r) => r.name === "ORISO-UserService").tier, "Backend Microservices");
});
