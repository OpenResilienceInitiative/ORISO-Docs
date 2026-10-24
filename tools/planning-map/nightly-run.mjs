#!/usr/bin/env node
// Single entry for the unified planning-map run (nightly schedule and manual dispatch).
// One run manifest (run id, timestamp, commit per repo) is stamped into the super-graph,
// board.json and the map data files; the outputs are checked against each other and only
// then written, so a failed run leaves no half-stamped set behind.
//
//   node tools/planning-map/nightly-run.mjs --graph <knowledge-graph.json> --map-inputs <dir> --out <dir>
//        [--board-file f | --board-fixture f]   board.json from the sync job (#208) or a recorded export; default: live export (needs gh auth)
//        [--commit Repo=<sha> ...]              extra repos (graph.project.sourceCommits are taken automatically)
//        [--at <UTC ISO>] [--trigger schedule|workflow_dispatch|manual]
//
// Output dir: run.json, oriso-super-graph.json, map-data/{counts,...,links,board}.json
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRunManifest, stampBoard, stampGraph, stampMapData, assertSameRun } from "./lib/run-manifest.mjs";
import { validateBoard } from "./lib/board.mjs";
import { main as exportBoard } from "./export-board.mjs";
import { buildMapData, loadInputs } from "../understand-anything/site/hub/map/build-map-data.mjs";

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));

// Pure core: inputs in, stamped and cross-checked files out (path -> JSON document).
export function unifiedRun({ graph, board, mapInputs, commits, at, trigger }) {
  if (board.run) throw new Error(`board.json is already stamped by run ${board.run.runId}; a run stamps its own board`);
  const allCommits = { ...(graph.project?.sourceCommits ?? {}), ...commits };
  const manifest = createRunManifest({ at, commits: allCommits, trigger });
  const out = {
    graph: stampGraph(graph, manifest),
    board: stampBoard(board, manifest),
    mapData: stampMapData(buildMapData({ ...mapInputs, optional: ["board.json"] }), manifest),
  };
  const errors = validateBoard(out.board);
  if (errors.length) throw new Error(`board.json invalid:\n- ${errors.join("\n- ")}`);
  const mapData = { ...out.mapData, "board.json": out.board };
  assertSameRun({ graph: out.graph, board: out.board, mapData });
  return { manifest, files: { "run.json": manifest, "oriso-super-graph.json": out.graph, ...Object.fromEntries(Object.entries(mapData).map(([n, d]) => [`map-data/${n}`, d])) } };
}

export async function run(argv) {
  const get = (n) => argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined;
  const need = (n) => get(n) ?? (() => { throw new Error(`missing ${n}`); })();
  const commits = Object.fromEntries(argv.flatMap((a, i) => a === "--commit" ? [argv[i + 1].split(/=(.*)/s).slice(0, 2)] : []));
  const out = resolve(need("--out"));
  const scratch = mkdtempSync(join(tmpdir(), "nightly-run-"));
  try {
    let boardFile = get("--board-file");
    if (!boardFile) {
      boardFile = join(scratch, "board.json");
      const code = await exportBoard(["--out", boardFile, ...(get("--board-fixture") ? ["--fixture", get("--board-fixture")] : [])]);
      if (code !== 0) throw new Error(`board export failed (exit ${code})`);
    }
    const { manifest, files } = unifiedRun({
      graph: readJson(need("--graph")), board: readJson(boardFile), mapInputs: loadInputs(resolve(need("--map-inputs")) + "/"),
      commits, at: get("--at") ?? new Date().toISOString().replace(/\.\d+Z$/, "Z"), trigger: get("--trigger") ?? "manual",
    });
    const stage = join(scratch, "stage");
    for (const [name, doc] of Object.entries(files)) {
      mkdirSync(dirname(join(stage, name)), { recursive: true });
      writeFileSync(join(stage, name), JSON.stringify(doc, null, name === "run.json" ? 2 : undefined) + "\n");
    }
    if (existsSync(out)) rmSync(out, { recursive: true });
    mkdirSync(dirname(out), { recursive: true });
    try { renameSync(stage, out); } catch { (await import("node:fs")).cpSync(stage, out, { recursive: true }); }
    console.log(`run ${manifest.runId} (${manifest.trigger}) -> ${out}`);
    return 0;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) run(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
