#!/usr/bin/env node
// No network, public writes, authored edits or SemanticClaim promotion.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  lstatSync,
  realpathSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, relative, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCandidateReport } from "./lib/claim-candidates.mjs";
import { isSupportedPublicRepository } from "./lib/public-repositories.mjs";
const tooling = dirname(fileURLToPath(import.meta.url));
function canonical(path) {
  path = resolve(path);
  try {
    lstatSync(path); // includes dangling symlinks, unlike existsSync
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return join(canonical(dirname(path)), path.slice(dirname(path).length + 1));
  }
  // A dangling or cyclic alias throws before any output directory/file write.
  return realpathSync(path);
}
function contained(root, path) {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
function readUnder(root, path) {
  const target = canonical(resolve(root, path));
  if (!contained(canonical(root), target))
    throw Error("Authored input must stay inside authored root");
  return readFileSync(target);
}
try {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i],
      value = process.argv[i + 1];
    if (
      ![
        "--generation",
        "--public-root",
        "--preview-graphs",
        "--sources",
        "--inputs",
        "--authored-root",
        "--out",
      ].includes(key) ||
      !value ||
      args.has(key)
    )
      throw Error(
        "Usage: ua-claim-candidates.mjs (--generation DIR | --preview-graphs DIR) --sources DIR --inputs FILE --authored-root DIR --public-root DIR --out FILE",
      );
    args.set(key, value);
  }
  if (
    args.has("--generation") === args.has("--preview-graphs") ||
    ![
      "--sources",
      "--inputs",
      "--authored-root",
      "--public-root",
      "--out",
    ].every((key) => args.has(key))
  )
    throw Error("Exactly one generation mode and all report paths required");
  const generation = canonical(
      args.get("--generation") ?? args.get("--preview-graphs"),
    ),
    output = canonical(args.get("--out")),
    publicRoot = canonical(args.get("--public-root"));
  if (!contained(publicRoot, generation))
    throw Error("Generation must be inside declared public root");
  if (contained(publicRoot, output))
    throw Error("Internal report must be outside public root");
  const manifest = JSON.parse(readFileSync(join(generation, "manifest.json")));
  if (
    args.has("--generation") &&
    (!Array.isArray(manifest.sources) ||
      manifest.sources.some(
        (source) => !isSupportedPublicRepository(source.repository),
      ))
  )
    throw Error(
      "Complete internal report requires supported-public-only generation; refusing excluded inputs before graph access",
    );
  if (args.has("--generation"))
    execFileSync(
      "python3",
      [
        "-c",
        "from pathlib import Path; from bundle.contract import validate; import sys; validate(Path(sys.argv[1]))",
        generation,
      ],
      {
        env: { ...process.env, PYTHONPATH: tooling },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  else if (
    manifest.schemaVersion !== "oriso.ua.claim-candidate-preview/v1" ||
    manifest.release
  )
    throw Error(
      "Explicit selected-source preview required; release labels forbidden",
    );
  const input = JSON.parse(readFileSync(args.get("--inputs")));
  if (!Array.isArray(input)) throw Error("Package array required");
  const packages = input
    .filter((value) => isSupportedPublicRepository(value.repository))
    .map((value) => ({
      ...value,
      authoredSource: {
        path: value.authoredPath,
        bytes: readUnder(args.get("--authored-root"), value.authoredPath),
      },
    }));
  const graphs = {};
  for (const repository of new Set(packages.map((value) => value.repository))) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository))
      throw Error("Unsafe repository");
    graphs[repository] = JSON.parse(
      readFileSync(
        join(
          generation,
          repository,
          ".understand-anything/knowledge-graph.json",
        ),
      ),
    );
  }
  const sources = canonical(args.get("--sources"));
  const report = buildCandidateReport({
    manifest,
    graphs,
    packages,
    releaseValidated: args.has("--generation") && !!manifest.release,
    readSource(repository, path, sha) {
      try {
        return execFileSync(
          "git",
          ["-C", join(sources, repository), "show", `${sha}:${path}`],
          { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 },
        );
      } catch {
        return null;
      }
    },
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      audience: report.audience,
      sourceScope: report.sourceScope,
      packages: report.packages.map((entry) => ({
        id: entry.id,
        status: entry.status,
      })),
      publicationEligible: false,
    }),
  );
} catch (error) {
  console.error(
    "Candidate report refused: " +
      (error.status !== undefined
        ? "Generation contract validation failed"
        : error.message),
  );
  process.exitCode = 1;
}
