import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bindSourceRevisions,
  readSource,
  listSourceFiles,
} from "../lib/source-reader.mjs";
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), "ua-source-reader-")),
    repo = path.join(root, "ORISO-Test");
  mkdirSync(repo);
  const git = (...args) =>
    execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("init");
    git("config", "user.name", "UA test");
    git("config", "user.email", "ua-test@example.invalid");
    mkdirSync(path.join(repo, "src"));
    writeFileSync(path.join(repo, "src", "source.txt"), "committed bytes");
    git("add", ".");
    git("commit", "-m", "fixture");
    const sha = git("rev-parse", "HEAD");
    bindSourceRevisions([{ repo: "ORISO-Test", gitCommitHash: sha }]);
    run({ repo, sha, git });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("optional absent source is null but current checkout bytes do not replace bound source", () =>
  fixture(({ repo }) => {
    writeFileSync(path.join(repo, "src", "source.txt"), "dirty checkout");
    assert.equal(readSource(repo, "src/missing.txt"), null);
    assert.equal(readSource(repo, "src/source.txt"), "committed bytes");
    assert.deepEqual(listSourceFiles(repo), ["src/source.txt"]);
  }));
test("invalid source revision fails read and inventory rather than looking absent", () =>
  fixture(({ repo }) => {
    bindSourceRevisions([
      { repo: "ORISO-Test", gitCommitHash: "a".repeat(40) },
    ]);
    assert.throws(() => readSource(repo, "src/missing.txt"));
    assert.throws(() => listSourceFiles(repo));
  }));
test("missing repository and unbound provenance fail both source operations", () =>
  fixture(({ repo }) => {
    rmSync(path.join(repo, ".git"), { recursive: true, force: true });
    assert.throws(() => readSource(repo, "src/missing.txt"));
    assert.throws(() => listSourceFiles(repo));
    bindSourceRevisions([]);
    assert.throws(() => readSource(repo, "src/source.txt"), /provenance/);
    assert.throws(() => listSourceFiles(repo), /provenance/);
  }));
test("existing unreadable Git blob remains a fatal source failure", () =>
  fixture(({ repo, git }) => {
    const blob = git("rev-parse", "HEAD:src/source.txt");
    rmSync(path.join(repo, ".git", "objects", blob.slice(0, 2), blob.slice(2)));
    assert.throws(() => readSource(repo, "src/source.txt"));
  }));
