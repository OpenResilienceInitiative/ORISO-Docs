#!/usr/bin/env node
// CLI for the run manifest.
//   create --out run.json --at <UTC ISO> --commit Repo=<sha> [--commit ...] [--trigger schedule|manual]
//   stamp board|graph <file> --manifest run.json
//   check [--graph f] [--board f] [--data-dir dir]      exit 1 when outputs come from different runs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRunManifest, stampBoard, stampGraph, assertSameRun } from "./lib/run-manifest.mjs";

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));
const all = (argv, n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
const one = (argv, n) => all(argv, n)[0];

export function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "create") {
    const commits = Object.fromEntries(all(rest, "--commit").map((c) => { const i = c.indexOf("="); return [c.slice(0, i), c.slice(i + 1)]; }));
    const m = createRunManifest({ at: one(rest, "--at") ?? new Date().toISOString().replace(/\.\d+Z$/, "Z"), commits, trigger: one(rest, "--trigger") });
    const out = resolve(one(rest, "--out") ?? "run.json");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(m, null, 2) + "\n");
    console.log(`run ${m.runId}`);
    return 0;
  }
  if (cmd === "stamp") {
    const [kind, file] = rest;
    const stamp = { board: stampBoard, graph: stampGraph }[kind];
    if (!stamp || !file) throw new Error("usage: stamp board|graph <file> --manifest run.json");
    const doc = stamp(readJson(file), readJson(one(rest, "--manifest")));
    writeFileSync(file, JSON.stringify(doc, kind === "board" ? null : undefined, kind === "board" ? 2 : undefined) + "\n");
    return 0;
  }
  if (cmd === "check") {
    const outputs = {};
    if (one(rest, "--graph")) outputs.graph = readJson(one(rest, "--graph"));
    if (one(rest, "--board")) outputs.board = readJson(one(rest, "--board"));
    const dir = one(rest, "--data-dir");
    if (dir) outputs.mapData = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f, readJson(join(dir, f))]));
    try { console.log(`consistent: ${assertSameRun(outputs).runId}`); return 0; } catch (e) { console.error(e.message); return 1; }
  }
  throw new Error("usage: run-manifest.mjs create|stamp|check (see header)");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); } catch (e) { console.error(e.message); process.exit(2); }
}
