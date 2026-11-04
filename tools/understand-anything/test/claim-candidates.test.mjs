import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildCandidateReport } from "../lib/claim-candidates.mjs";
const hash = (text) => createHash("sha256").update(text).digest("hex");
const sha = "a".repeat(40),
  generationId = "generation-1";
function fixture() {
  const authored = Buffer.from('{"summary":"historical claim"}\n');
  const source = "export const consent = () => true;\n";
  return {
    manifest: {
      generationId,
      sources: [{ repository: "ORISO-Admin", sourceSHA: sha }],
    },
    graphs: {
      "ORISO-Admin": {
        generationId,
        project: { gitCommitHash: sha },
        nodes: [
          {
            id: "fn:consent",
            name: "consent",
            type: "function",
            filePath: "src/consent.ts",
            lineRange: [1, 1],
            metadata: {
              sourceFingerprint: hash(source.trimEnd()),
              sourceCommit: sha,
            },
          },
        ],
      },
    },
    packages: [
      {
        id: "feature:consent",
        repository: "ORISO-Admin",
        authoredSource: { path: "historical.json", bytes: authored },
        references: ["consent"],
        qualification: "Only source association",
      },
    ],
    readSource: () => Buffer.from(source),
  };
}
test("matched candidates preserve historical bytes without claiming human review or runtime acceptance", () => {
  const f = fixture(),
    before = Buffer.from(f.packages[0].authoredSource.bytes),
    report = buildCandidateReport(f),
    entry = report.packages[0];
  assert.equal(entry.status, "matched");
  assert.equal(entry.authoredSource.sha256, hash(before));
  assert.deepEqual(f.packages[0].authoredSource.bytes, before);
  assert.equal(entry.reviewed, false);
  assert.equal(entry.runtimeVerified, false);
  assert.equal(entry.references[0].candidates[0].sourceSHA, sha);
  assert.equal(entry.references[0].candidates[0].generationId, generationId);
  assert.equal("reviewedAt" in entry, false);
  assert.equal(report.publicationEligible, false);
});
test("duplicate names retain all candidates instead of picking the first", () => {
  const f = fixture();
  f.graphs["ORISO-Admin"].nodes.push({
    ...f.graphs["ORISO-Admin"].nodes[0],
    id: "fn:other",
    filePath: "src/other.ts",
  });
  const e = buildCandidateReport(f).packages[0];
  assert.equal(e.status, "ambiguous");
  assert.deepEqual(
    e.references[0].candidates.map((n) => n.nodeId),
    ["fn:consent", "fn:other"],
  );
});
test("missing node, source range, fingerprint or actual source bytes remains missing", () => {
  for (const change of [
    (f) => (f.packages[0].references = ["absent"]),
    (f) => delete f.graphs["ORISO-Admin"].nodes[0].lineRange,
    (f) => delete f.graphs["ORISO-Admin"].nodes[0].metadata.sourceFingerprint,
    (f) => (f.readSource = () => null),
  ]) {
    const f = fixture();
    change(f);
    assert.equal(buildCandidateReport(f).packages[0].status, "missing");
  }
});
test("moved evidence, changed body, source SHA, generation and authored bytes stale an existing association", () => {
  const first = fixture(),
    binding = buildCandidateReport(first).packages[0];
  for (const change of [
    (f) => (f.graphs["ORISO-Admin"].nodes[0].lineRange = [2, 2]),
    (f) =>
      (f.graphs["ORISO-Admin"].nodes[0].metadata.sourceFingerprint = "b".repeat(
        64,
      )),
    (f) => (f.packages[0].binding.sourceSHA = "b".repeat(40)),
    (f) => (f.packages[0].binding.generationId = "old"),
    (f) => (f.packages[0].authoredSource.bytes = Buffer.from("changed")),
  ]) {
    const f = fixture();
    f.packages[0].binding = {
      sourceSHA: sha,
      generationId,
      authoredSourceSHA256: binding.authoredSource.sha256,
      evidence: binding.references.flatMap((r) => r.candidates),
    };
    change(f);
    assert.equal(buildCandidateReport(f).packages[0].status, "stale");
  }
});
test("private packages excluded before their text or evidence is read", () => {
  const f = fixture();
  f.packages.unshift({
    id: "private-secret",
    repository: "ORISO-Infra",
    get authoredSource() {
      throw Error("private bytes accessed");
    },
  });
  const r = buildCandidateReport(f);
  assert.equal(r.packages.length, 1);
  assert.equal(JSON.stringify(r).includes("private-secret"), false);
});
test("graph SHA or generation differs from exact source vector fails closed", () => {
  for (const mutate of [
    (f) => (f.graphs["ORISO-Admin"].project.gitCommitHash = "b".repeat(40)),
    (f) => (f.graphs["ORISO-Admin"].generationId = "old"),
  ]) {
    const f = fixture();
    mutate(f);
    assert.throws(() => buildCandidateReport(f), /vector|generation/);
  }
});
test("a release label alone cannot turn a preview association into publication evidence", () => {
  const f = fixture();
  f.manifest.release = {
    lock: {
      sources: [{ repository: "ORISO-Admin", sourceSHA: "b".repeat(40) }],
    },
  };
  assert.throws(() => buildCandidateReport(f), /Release/);
});

test("a stable claim absent from pinned authored bytes stays missing despite matching code", () => {
  const f = fixture();
  f.packages[0].authoredAnchor = "slug: removed-claim";
  assert.equal(buildCandidateReport(f).packages[0].status, "missing");
});

test("unknown visibility is excluded before authored, graph or source getters are accessed", () => {
  const f = fixture();
  f.manifest.sources.unshift({
    repository: "ORISO-UnknownPrivate",
    get sourceSHA() {
      throw Error("unknown source read");
    },
  });
  f.packages.unshift({
    repository: "ORISO-UnknownPrivate",
    get id() {
      throw Error("unknown id read");
    },
    get authoredSource() {
      throw Error("unknown authored read");
    },
  });
  Object.defineProperty(f.graphs, "ORISO-UnknownPrivate", {
    get() {
      throw Error("unknown graph read");
    },
  });
  const report = buildCandidateReport(f);
  assert.equal(report.packages.length, 1);
  assert.equal(JSON.stringify(report).includes("ORISO-UnknownPrivate"), false);
});

test("declared legacy ambiguity keeps present and missing candidates without downgrading", () => {
  for (const field of ["ambiguousLegacyIds", "legacyIdMap"])
    for (const ids of [
      ["fn:consent", "fn:missing"],
      ["fn:missing-one", "fn:missing-two"],
    ]) {
      const f = fixture();
      f.packages[0].references = ["legacy-ref"];
      f.graphs["ORISO-Admin"].metadata = {
        extraction: { [field]: { "legacy-ref": ids } },
      };
      const entry = buildCandidateReport(f).packages[0];
      assert.equal(entry.status, "ambiguous");
      assert.deepEqual(
        entry.references[0].candidates.map((item) => item.nodeId),
        ids,
      );
      assert.equal(entry.references[0].candidates.at(-1).status, "missing");
    }
});

test('explicit ambiguous metadata cannot become matched even with a single surviving ID',()=>{
 const f=fixture();f.packages[0].references=['legacy-ref'];f.graphs['ORISO-Admin'].metadata={extraction:{ambiguousLegacyIds:{'legacy-ref':['fn:consent']}}};
 assert.equal(buildCandidateReport(f).packages[0].status,'ambiguous');
});
