#!/usr/bin/env node
// Export the ORISO Roadmap project to board.json. Usage: see README.md.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildBoard, contract, driftCheck, fetchAll, liveOptions, validateBoard } from "./lib/board.mjs";

export function ghRunner(query, variables) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [k, v] of Object.entries(variables)) {
    if (v == null) continue;
    args.push(typeof v === "number" ? "-F" : "-f", `${k}=${v}`);
  }
  const r = spawnSync("gh", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gh api graphql failed: ${r.stderr.trim()}`);
  const json = JSON.parse(r.stdout);
  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json;
}

// Offline runner for tests/dry runs: serves {meta, pages[]} recorded fixtures by cursor.
export function fixtureRunner(file) {
  const fx = JSON.parse(readFileSync(file, "utf8"));
  return (query, vars) => {
    if (!("after" in vars)) return fx.meta;
    const idx = vars.after == null ? 0 : fx.pages.findIndex((p) => p.cursorBefore === vars.after);
    if (idx < 0) throw new Error(`fixture has no page after cursor ${vars.after}`);
    return fx.pages[idx].response;
  };
}

export async function main(argv) {
  const get = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
  const out = resolve(get("--out", "board.json"));
  const run = get("--fixture") ? fixtureRunner(get("--fixture")) : ghRunner;
  const { owner, number } = contract.project;
  const data = await fetchAll(run, { owner, number });
  const drift = driftCheck(liveOptions(data.meta), contract, { strict: argv.includes("--strict") });
  if (argv.includes("--drift-only")) {
    for (const u of drift.unpinned) console.warn(`unpinned: ${u}`);
    if (!drift.ok) { console.error(`DRIFT:\n- ${drift.problems.join("\n- ")}`); return 2; }
    console.log("drift check passed");
    return 0;
  }
  const board = buildBoard(data, { owner, number });
  const errors = validateBoard(board);
  if (errors.length) { console.error(`board.json invalid:\n- ${errors.join("\n- ")}`); return 1; }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(board, null, 2) + "\n");
  for (const u of drift.unpinned) console.warn(`unpinned: ${u}`);
  for (const w of board.warnings) console.warn(`warning: ${w}`);
  console.log(`wrote ${out}: ${board.totals.items} items (${board.totals.public} public, ${board.totals.private} private counted only)`);
  console.log(`status counts: ${JSON.stringify(board.statusCounts)}`);
  if (!drift.ok) { console.error(`DRIFT (file written, exit 2):\n- ${drift.problems.join("\n- ")}`); return 2; }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
