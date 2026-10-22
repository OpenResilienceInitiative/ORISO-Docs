#!/usr/bin/env node
// Local planning runner (ORISO-Docs#210, #211). Uses the operator's `gh` login (shells out to `gh api graphql`).
// DRY RUN BY DEFAULT: it reads from GitHub and prints the plan; only --apply writes.
//
//   node tools/planning-map/plan.mjs assign-release --issue Org/Repo#123 [--issue ...] --release v2.0.12 \
//        [--with-sub-issues] [--expect <release>|none] [--apply]
//
// Exit codes: 0 ok, 1 a planning error (typed, printed as JSON), 2 usage error.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assignRelease } from "./lib/planning-api.mjs";

export const COMMANDS = ["assign-release"];

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command)) throw new Error(`Unknown command ${JSON.stringify(command)}. Use ${COMMANDS.join(" or ")}.`);
  const o = { command, issues: [], release: null, withSubIssues: false, expect: undefined, apply: false };
  let dry = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const value = () => { if (i + 1 >= rest.length) throw new Error(`${a} needs a value`); return rest[++i]; };
    if (a === "--issue") o.issues.push(value());
    else if (a === "--release") o.release = value();
    else if (a === "--with-sub-issues") o.withSubIssues = true;
    else if (a === "--expect") { const v = value(); o.expect = v === "none" ? null : v; }
    else if (a === "--apply") o.apply = true;
    else if (a === "--dry-run") dry = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (o.apply && dry) throw new Error("Use either --apply or --dry-run, not both");
  if (o.expect === undefined) delete o.expect;
  return o;
}

function validate(o) {
  if (!o.issues.length) throw new Error("At least one --issue Org/Repo#123 is required");
  if (o.command === "assign-release" && !o.release) throw new Error("--release is required");
}

export function ghTransport({ exec = execFileSync } = {}) {
  return async (query, variables) => {
    try {
      return JSON.parse(exec("gh", ["api", "graphql", "--input", "-"], { input: JSON.stringify({ query, variables }), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    } catch (e) {
      // gh exits non-zero when GraphQL reports errors but still prints the JSON body.
      if (e.stdout) { try { return JSON.parse(e.stdout); } catch { /* fall through */ } }
      throw e;
    }
  };
}

export async function main(argv, { transport = ghTransport(), log = console.log, err = console.error } = {}) {
  let o;
  try { o = parseArgs(argv); validate(o); } catch (e) { err(`plan.mjs: ${e.message}`); return 2; }
  const dryRun = !o.apply;
  const runs = [];
  for (const issue of o.issues) {
    runs.push(await assignRelease(issue, o.release, { withSubIssues: o.withSubIssues, expectedRelease: o.expect, dryRun, transport }));
  }
  const ok = runs.every((r) => r.ok);
  log(JSON.stringify({ ok, dryRun, command: o.command, runs }, null, 2));
  if (dryRun && ok) err("Dry run: nothing was written. Add --apply to write to GitHub.");
  return ok ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
