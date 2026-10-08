import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvidenceMap } from "../lib/parse-evidence-map.mjs";
import { checkEvidenceMap } from "../lib/decay-check.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mapText = readFileSync(resolve(here, "../fixtures/evidence-map.yaml"), "utf8");
const clones = resolve(here, "../fixtures/clones");

test("fixture map parses three claims", () => {
  const doc = parseEvidenceMap(mapText);
  assert.equal(doc.entries.length, 3);
  assert.equal(doc.entries[0].slug, "fixture-ok");
  assert.deepEqual(doc.entries[0].evidence[0].expect, ["UsernameTranscoder", "encodeUsername"]);
});

test("decay check: ok, drifted, and canary broken", () => {
  const result = checkEvidenceMap({ mapText, reposRoot: clones, commits: { "ORISO-UserService": "aaa111" } });
  const bySlug = Object.fromEntries(result.findings.map((f) => [f.slug, f]));
  assert.equal(bySlug["fixture-ok"].status, "ok");
  assert.equal(bySlug["fixture-drifted"].status, "drifted");
  assert.equal(bySlug["truth-chain-canary-broken"].status, "broken");
  assert.equal(result.counts.broken, 1);
});

test("missing clone is unverified, not broken", () => {
  const result = checkEvidenceMap({ mapText, reposRoot: resolve(here, "../fixtures/empty-clones") });
  assert.equal(result.counts.unverified, 3);
  assert.equal(result.counts.broken, 0);
});

test("live evidence-map.yaml parses with many slugs", () => {
  const live = readFileSync(resolve(here, "../../../oriso-platform/dsfa-text/evidence-map.yaml"), "utf8");
  const doc = parseEvidenceMap(live);
  assert.ok(doc.entries.length >= 50, `expected ≥50 entries, got ${doc.entries.length}`);
  assert.ok(doc.entries.every((e) => e.slug && e.evidence.length >= 1));
});
