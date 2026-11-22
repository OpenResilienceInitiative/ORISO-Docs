#!/usr/bin/env node
// Human steering (ORISO-Docs#221). Uses the operator's `gh` login, like plan.mjs and job.mjs.
//
//   node tools/planning-map/steering.mjs ensure --capability <id> [--apply]
//        finds the steering issue of a capability in ORISO-Docs by its hidden marker, or creates it
//        (title "Steering: <capability title>", label area-steering). DRY RUN BY DEFAULT: --apply writes.
//   node tools/planning-map/steering.mjs export [--out steering.json]
//        reads the steering issues and writes steering.json (member comments only, see steering.schema.json).
//
// Exit codes: 0 ok, 1 a GitHub error (typed JSON on stdout), 2 usage error.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CAPABILITY_IDS } from "../understand-anything/platform/lib/capabilities.mjs";
import { ensureSteering, exportSteering } from "./lib/steering.mjs";
import { ghTransport } from "./plan.mjs";

export const COMMANDS = ["ensure", "export"];

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command)) throw new Error(`Unknown command ${JSON.stringify(command)}. Use ${COMMANDS.join(" or ")}.`);
  const o = { command, capability: undefined, apply: false, out: undefined };
  let dry = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const value = () => { if (i + 1 >= rest.length) throw new Error(`${a} needs a value`); return rest[++i]; };
    if (a === "--capability") o.capability = value();
    else if (a === "--out") o.out = value();
    else if (a === "--apply") o.apply = true;
    else if (a === "--dry-run") dry = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (o.apply && dry) throw new Error("Use either --apply or --dry-run, not both");
  if (command === "ensure") {
    if (!o.capability) throw new Error(`--capability <id> is required (${CAPABILITY_IDS.join(", ")})`);
    if (!CAPABILITY_IDS.includes(o.capability)) throw new Error(`--capability ${JSON.stringify(o.capability)}: unknown capability; known: ${CAPABILITY_IDS.join(", ")}`);
  }
  return o;
}

export async function main(argv, { transport = ghTransport(), log = console.log, err = console.error, now } = {}) {
  let o;
  try { o = parseArgs(argv); } catch (e) { err(`steering.mjs: ${e.message}`); return 2; }
  try {
    if (o.command === "export") {
      const { doc, warnings } = await exportSteering(transport, now ? { now: now() } : {});
      const out = resolve(o.out ?? "steering.json");
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
      for (const w of warnings) err(`warning: ${w}`);
      const comments = Object.values(doc.capabilities).reduce((n, c) => n + c.comments.length, 0);
      log(`wrote ${out}: ${Object.keys(doc.capabilities).length} steering issues, ${comments} member comments`);
      return 0;
    }
    const r = await ensureSteering(o.capability, { transport, dryRun: !o.apply });
    if (!r.ok) { log(JSON.stringify({ ok: false, command: o.command, error: r.error }, null, 2)); return 1; }
    if (r.action === "exists") {
      log(`exists: ${r.issue.url} (${r.issue.state.toLowerCase()}) - steering issue of ${o.capability}, nothing to do`);
      return 0;
    }
    if (r.action === "created") {
      log(`created: ${r.issue.url} - steering issue of ${o.capability}`);
      return 0;
    }
    log(`# would create in OpenResilienceInitiative/ORISO-Docs${r.createsLabel ? " (and create the label area-steering first)" : ""}\n# title: ${r.title}\n# label: area-steering\n${r.body}`);
    err("Dry run: nothing was written. Add --apply to create the issue on GitHub.");
    return 0;
  } catch (e) {
    log(JSON.stringify({ ok: false, command: o.command, error: { code: e?.code ?? "TRANSPORT", message: `steering.mjs failed: ${e?.message ?? e}` } }, null, 2));
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(JSON.stringify({ ok: false, error: { code: "TRANSPORT", message: String(e?.message ?? e) } })); process.exitCode = 1; });
}
