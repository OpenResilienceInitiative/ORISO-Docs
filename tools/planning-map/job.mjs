#!/usr/bin/env node
// Agent job reporter (ORISO-Docs#216). Writes the job status section into an issue DESCRIPTION through the
// operator's `gh` login (same transport as plan.mjs). DRY RUN BY DEFAULT: it prints the body diff; only --apply writes.
//
//   node tools/planning-map/job.mjs report --issue Org/Repo#123 --state running|stopped|waiting-human|done|failed \
//        [--branch feat/x]... [--pr "#5"|Org/Repo#5|<PR url>] (quote the #)... [--report https://...] [--next "what comes next"] \
//        [--model name] [--machine label] [--runner local|cloud] [--expect-updated-at <ISO>] [--expect-hash <sha256>] [--force] [--apply]
//
// Every call merges into the section that is already there (started is kept, branches and PRs are added, `updated`
// is set to now), so running it again is a heartbeat and agents of any tool report the same way. No host name, user
// name or secret is added by default; the machine label is only what you pass. Text outside the markers is never touched.
// A section that is there but does not validate is refused (BAD_SECTION, with its problems); --force overwrites it deliberately.
// Exit codes: 0 ok, 1 a planning error (typed JSON on stdout), 2 usage error.
import { fileURLToPath } from "node:url";
import { writeJobSection, parseIssueRef } from "./lib/planning-api.mjs";
import { diffText, normalizeJob, STATES, RUNNERS } from "./lib/job.mjs";
import { ghTransport } from "./plan.mjs";

export const COMMANDS = ["report"];
const TERMINAL = ["done", "failed"];

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command)) throw new Error(`Unknown command ${JSON.stringify(command)}. Use ${COMMANDS.join(" or ")}.`);
  const o = { command, issue: null, state: null, branches: [], prs: [], report: undefined, next: undefined, model: undefined, machine: undefined, runner: undefined, apply: false, expectUpdatedAt: undefined, expectHash: undefined, force: false };
  let dry = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    const value = () => { if (i + 1 >= rest.length) throw new Error(`${a} needs a value`); return rest[++i]; };
    if (a === "--issue") o.issue = value();
    else if (a === "--state") o.state = value();
    else if (a === "--branch") o.branches.push(value());
    else if (a === "--pr") o.prs.push(value());
    else if (a === "--report") o.report = value();
    else if (a === "--next") o.next = value();
    else if (a === "--model") o.model = value();
    else if (a === "--machine") o.machine = value();
    else if (a === "--runner") o.runner = value();
    else if (a === "--expect-updated-at") o.expectUpdatedAt = value();
    else if (a === "--expect-hash") o.expectHash = value();
    else if (a === "--apply") o.apply = true;
    else if (a === "--force") o.force = true;
    else if (a === "--dry-run") dry = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (o.apply && dry) throw new Error("Use either --apply or --dry-run, not both");
  return o;
}

function check(o) {
  if (!o.issue) throw new Error("--issue Org/Repo#123 is required");
  if (!parseIssueRef(o.issue)) throw new Error(`--issue ${JSON.stringify(o.issue)}: expected Org/Repo#123`);
  if (!o.state) throw new Error(`--state is required (${STATES.join(", ")})`);
  if (!STATES.includes(o.state)) throw new Error(`--state ${JSON.stringify(o.state)}: expected one of ${STATES.join(", ")}`);
  if (o.runner !== undefined && !RUNNERS.includes(o.runner)) throw new Error(`--runner ${JSON.stringify(o.runner)}: expected local or cloud`);
}

// "#5", "5", "Org/Repo#5" or a github.com pull request URL -> "#5" / "Org/Repo#5"; anything else is left for validation to refuse.
const prRef = (s) => {
  const url = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)\/?$/.exec(s);
  if (url) return `${url[1]}#${url[2]}`;
  return /^\d+$/.test(s) ? `#${s}` : s;
};
const union = (a, b) => [...new Set([...(a ?? []), ...b])];
const clear = (v) => (v === "" ? null : v);

// existing job (or null) + flags -> the job to write
export function mergeJob(existing, o, now) {
  const base = existing ?? {};
  const restart = !!existing && TERMINAL.includes(existing.state) && !TERMINAL.includes(o.state); // a new run after a finished one
  const keep = (k, v) => (v !== undefined ? clear(v) : restart ? null : base[k] ?? null);
  return normalizeJob({
    state: o.state,
    runner: o.runner ?? base.runner ?? "local",
    machine: o.machine !== undefined ? clear(o.machine) : base.machine ?? null,
    started: existing && !restart ? base.started : now,
    updated: now,
    model: o.model !== undefined ? clear(o.model) : base.model ?? null,
    branches: union(restart ? [] : base.branches, o.branches),
    prs: union(restart ? [] : base.prs, o.prs.map(prRef)),
    next: keep("next", o.next),
    report: keep("report", o.report),
  });
}

export async function main(argv, { transport = ghTransport(), log = console.log, err = console.error, now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z") } = {}) {
  let o;
  try { o = parseArgs(argv); check(o); } catch (e) { err(`job.mjs: ${e.message}`); return 2; }
  try {
    const stamp = now();
    const r = await writeJobSection(o.issue, (existing) => mergeJob(existing, o, stamp), { transport, dryRun: !o.apply, expectedUpdatedAt: o.expectUpdatedAt, expectedBodyHash: o.expectHash, force: o.force });
    if (!r.ok) { log(JSON.stringify({ ok: false, command: o.command, error: r.error }, null, 2)); return 1; }
    log(`# ${r.issue}: ${r.mode}${r.wrote ? " (written)" : o.apply ? "" : " (dry run)"}, description was last updated ${r.before.updatedAt}`);
    const d = diffText(r.bodyBefore, r.bodyAfter);
    if (d) log(d);
    if (!r.changed) err("Nothing to change: the section is already as described.");
    else if (!o.apply) err("Dry run: nothing was written. Add --apply to write to GitHub.");
    return 0;
  } catch (e) {
    log(JSON.stringify({ ok: false, command: o.command, error: { code: "TRANSPORT", message: `job.mjs failed: ${e?.message ?? e}` } }, null, 2));
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error(JSON.stringify({ ok: false, error: { code: "TRANSPORT", message: String(e?.message ?? e) } })); process.exitCode = 1; });
}
