import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const cli = new URL("../ua-claim-candidates.mjs", import.meta.url).pathname;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "candidate-cli-")),
    repo = join(root, "sources/ORISO-Admin"),
    gen = join(root, "public/generation");
  mkdirSync(repo, { recursive: true });
  mkdirSync(join(gen, "ORISO-Admin/.understand-anything"), { recursive: true });
  execFileSync("git", ["init", "-q", repo]);
  writeFileSync(join(repo, "api.ts"), "original\n");
  execFileSync("git", ["-C", repo, "add", "api.ts"]);
  execFileSync("git", [
    "-C",
    repo,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "-qm",
    "fixture",
  ]);
  const sha = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  writeFileSync(
    join(gen, "manifest.json"),
    JSON.stringify({
      schemaVersion: "oriso.ua.claim-candidate-preview/v1",
      generationId: "preview-1",
      sources: [{ repository: "ORISO-Admin", sourceSHA: sha }],
    }),
  );
  writeFileSync(
    join(gen, "ORISO-Admin/.understand-anything/knowledge-graph.json"),
    JSON.stringify({
      generationId: "preview-1",
      project: { gitCommitHash: sha },
      nodes: [
        {
          id: "file:api",
          type: "file",
          filePath: "api.ts",
          lineRange: [1, 2],
          metadata: {
            sourceCommit: sha,
            sourceFingerprint: hash("original\n"),
          },
        },
      ],
    }),
  );
  writeFileSync(join(root, "authored.json"), "old narrative");
  writeFileSync(
    join(root, "inputs.json"),
    JSON.stringify([
      {
        id: "feature:test",
        repository: "ORISO-Admin",
        authoredPath: "authored.json",
        references: ["api.ts"],
      },
    ]),
  );
  return {
    root,
    gen,
    repo,
    args: [
      cli,
      "--preview-graphs",
      gen,
      "--public-root",
      join(root, "public"),
      "--sources",
      join(root, "sources"),
      "--inputs",
      join(root, "inputs.json"),
      "--authored-root",
      root,
    ],
  };
}
test("CLI writes internal report outside graph bundle and reads committed bytes despite dirty checkout", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.repo, "api.ts"), "dirty\n");
    const out = join(f.root, "internal/report.json"),
      result = spawnSync(process.execPath, [...f.args, "--out", out], {
        encoding: "utf8",
      });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(readFileSync(out));
    assert.equal(report.packages[0].status, "matched");
    assert.equal(report.sourceScope, "preview-source");
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
test("CLI refuses to place internal evidence inside public generation even through a lexical alias", () => {
  const f = fixture();
  try {
    const result = spawnSync(
      process.execPath,
      [...f.args, "--out", join(f.gen, "../generation/review.json")],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /outside/);
    assert.equal(
      readFileSync(join(f.root, "authored.json"), "utf8"),
      "old narrative",
    );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("CLI excludes unknown visibility before missing authored files or graph paths are loaded", () => {
  const f = fixture();
  try {
    const inputs = JSON.parse(readFileSync(join(f.root, "inputs.json")));
    inputs.unshift({
      id: "secret-name",
      repository: "ORISO-UnknownPrivate",
      authoredPath: "absent-secret-file",
      references: ["secret-reference"],
    });
    writeFileSync(join(f.root, "inputs.json"), JSON.stringify(inputs));
    const manifest = JSON.parse(readFileSync(join(f.gen, "manifest.json")));
    manifest.sources.unshift({
      repository: "ORISO-UnknownPrivate",
      sourceSHA: "a".repeat(40),
    });
    writeFileSync(join(f.gen, "manifest.json"), JSON.stringify(manifest));
    const out = join(f.root, "internal/report.json");
    const result = spawnSync(process.execPath, [...f.args, "--out", out], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const raw = readFileSync(out, "utf8");
    assert.equal(JSON.parse(raw).packages.length, 1);
    for (const secret of [
      "ORISO-UnknownPrivate",
      "secret-name",
      "absent-secret-file",
      "secret-reference",
    ])
      assert.equal(
        (raw + result.stdout + result.stderr).includes(secret),
        false,
      );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("standalone CLI requires an explicit public root boundary", () => {
  const f = fixture();
  try {
    const result = spawnSync(
      process.execPath,
      [
        ...f.args.filter(
          (value, index) =>
            value !== "--public-root" && f.args[index - 1] !== "--public-root",
        ),
        "--out",
        join(f.root, "internal/report.json"),
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("standalone CLI refuses public sibling output and symlink aliases", () => {
  const f = fixture();
  try {
    const alias = join(f.root, "public-alias");
    symlinkSync(join(f.root, "public"), alias, "dir");
    for (const out of [
      join(f.root, "public/internal-review.json"),
      join(alias, "internal-review.json"),
    ]) {
      const result = spawnSync(process.execPath, [...f.args, "--out", out], {
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /outside public root/);
    }
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("dangling file and directory symlinks cannot route internal output into public root", () => {
  const f = fixture();
  try {
    const fileAlias = join(f.root, "dangling-file.json"),
      leaked = join(f.gen, "leaked-internal.json");
    symlinkSync(leaked, fileAlias, "file");
    const directoryAlias = join(f.root, "dangling-directory"),
      missingPublic = join(f.root, "public/missing");
    symlinkSync(missingPublic, directoryAlias, "dir");
    for (const output of [fileAlias, join(directoryAlias, "report.json")]) {
      const result = spawnSync(process.execPath, [...f.args, "--out", output], {
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(leaked), false);
      assert.equal(existsSync(missingPublic), false);
    }
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
