import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocsExport } from "../lib/export-docs.mjs";
import {
  GENERATED_MARKER,
  mayOverwrite,
  renderGeneratedPages,
  writeGeneratedPages,
} from "../lib/generate-pages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(readFileSync(resolve(here, "../fixtures/graph.json"), "utf8"));
const meta = JSON.parse(readFileSync(resolve(here, "../fixtures/meta.json"), "utf8"));

test("generated pages carry marker and commit hash", () => {
  const exp = buildDocsExport(graph, meta, { generatedAt: "2026-09-02T00:00:00.000Z" });
  const files = renderGeneratedPages(exp);
  const repoPage = files.get("docs/platform/repo-graphs/ORISO-UserService.md");
  assert.ok(repoPage.includes(GENERATED_MARKER));
  assert.ok(repoPage.includes("aaa111"));
  assert.ok(files.get("docs/platform/super-graph-index.md").includes("architecture-tiers"));
  assert.ok(files.has("site/content/docs/plattform/graphs-und-diagrams/super-graph-index.md"));
});

test("hand-written files outside the allowlist are not overwritten", () => {
  const root = mkdtempSync(join(tmpdir(), "truth-chain-"));
  mkdirSync(join(root, "product"), { recursive: true });
  writeFileSync(join(root, "product/overview.mdx"), "# editorial\n");
  const files = new Map([["product/overview.mdx", "generated overwrite"]]);
  const { written, skipped } = writeGeneratedPages(root, files);
  assert.deepEqual(written, []);
  assert.deepEqual(skipped, ["product/overview.mdx"]);
  assert.equal(readFileSync(join(root, "product/overview.mdx"), "utf8"), "# editorial\n");
});

test("allowlist may overwrite stale repo-graph pages", () => {
  assert.equal(mayOverwrite("docs/platform/repo-graphs/ORISO-UserService.md", "# stale"), true);
  assert.equal(mayOverwrite("product/overview.mdx", "# editorial"), false);
  assert.equal(mayOverwrite("product/overview.mdx", `---\n${GENERATED_MARKER}\n---\n`), true);
});
