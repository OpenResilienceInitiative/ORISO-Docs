// Agent job section in an issue description (ORISO-Docs#216, epic #213). Pure text: no GitHub, no I/O.
//
//   <!-- oriso:job:start v1 -->
//   **Agent job: running** · local, mac-frank · updated 2026-10-24T09:30:00Z
//
//   ```yaml
//   state: running                  # running | stopped | waiting-human | done | failed
//   runner: local                   # local | cloud
//   machine: "mac-frank"            # free label: no hostname, no user name, no secrets
//   started: 2026-10-24T08:00:00Z   # ISO UTC
//   updated: 2026-10-24T09:30:00Z   # ISO UTC, set by every report
//   model: "claude-opus-5-5"
//   branches: ["feat/213-216-jobs"]
//   prs: ["OpenResilienceInitiative/ORISO-Docs#230"]
//   next: "run the hub tests"
//   report: null                    # or an https link without credentials
//   ```
//   <!-- oriso:job:end -->
//
// (A test parses this example.) Comments after " #" outside quotes are ignored by the parser.
// Only the text between the two marker lines is ever replaced. Markers count only when they stand alone on a
// line (indented by at most three spaces, as in CommonMark) outside a fenced code block, so a description that merely
// talks about them is never touched. A description that ends inside an open code fence is refused, never appended to.
import { createHash } from "node:crypto";

export const START = "<!-- oriso:job:start v1 -->";
export const END = "<!-- oriso:job:end -->";
export const STATES = ["running", "stopped", "waiting-human", "done", "failed"];
export const RUNNERS = ["local", "cloud"];
export const FIELDS = ["state", "runner", "machine", "started", "updated", "model", "branches", "prs", "next", "report"];

export const bodyHash = (body) => createHash("sha256").update(String(body ?? ""), "utf8").digest("hex");

// ───────── validation ─────────
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const LABEL = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9 ._:/-]{0,59}$/;
const BRANCH = /^[A-Za-z0-9._/-]{1,200}$/;
const PR = /^(?:[\w.-]+\/[\w.-]+)?#\d+$/;
const MAX_LIST = 20;
const MAX_NEXT = 280;
const SECRETS = [
  /gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /\bsk-[A-Za-z0-9_-]{16,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  /(?:password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*\S+/i,
];
const ADDRESS = [/\b\d{1,3}(?:\.\d{1,3}){3}\b/, /\b[\w.-]+@[\w-]+(?:\.[\w-]+)+\b/];
const CONTROL = /<!--|-->|[\r\n]/;
const SECRET_QUERY = /token|key|secret|sig|passw|auth|code/i;

const isStr = (v) => typeof v === "string";

export function validateJob(job) {
  const p = [];
  if (!job || typeof job !== "object" || Array.isArray(job)) return ["job: expected an object"];
  for (const k of Object.keys(job)) if (!FIELDS.includes(k)) p.push(`${k}: unknown field`);
  if (!STATES.includes(job.state)) p.push(`state: must be one of ${STATES.join(", ")}`);
  if (!RUNNERS.includes(job.runner)) p.push(`runner: must be one of ${RUNNERS.join(", ")}`);
  for (const k of ["started", "updated"]) if (!isStr(job[k]) || !TS.test(job[k]) || Number.isNaN(Date.parse(job[k]))) p.push(`${k}: expected an ISO UTC time like 2026-10-24T09:30:00Z`);
  const text = (k, max, re, hint) => {
    const v = job[k];
    if (v == null) return;
    if (!isStr(v) || !v || v.length > max) return p.push(`${k}: expected a short text (1 to ${max} characters) or null`);
    if (CONTROL.test(v)) return p.push(`${k}: no line breaks or comment markers`);
    if (SECRETS.some((r) => r.test(v))) return p.push(`${k}: looks like a secret; never write secrets into the issue`);
    if (re && !re.test(v)) return p.push(`${k}: ${hint}`);
    if (ADDRESS.some((r) => r.test(v))) p.push(`${k}: looks like a host name or address; leave it out`);
  };
  text("machine", 40, LABEL, "use a short label (letters, digits, space, _ -), no host name or user name");
  text("model", 60, MODEL, "expected a model name");
  text("next", MAX_NEXT, null, "");
  const list = (k, re, hint) => {
    const v = job[k];
    if (v == null) return;
    if (!Array.isArray(v) || v.length > MAX_LIST) return p.push(`${k}: expected a list of at most ${MAX_LIST}`);
    v.forEach((x, i) => {
      if (!isStr(x) || !re.test(x) || x.includes("..")) p.push(`${k}[${i}]: ${hint}`);
      else if (SECRETS.some((r) => r.test(x))) p.push(`${k}[${i}]: looks like a secret`);
    });
  };
  list("branches", BRANCH, "expected a branch name without spaces");
  list("prs", PR, "expected #123 or Org/Repo#123");
  if (job.report != null) {
    let u = null;
    try { u = new URL(job.report); } catch { /* handled below */ }
    if (!isStr(job.report) || !u || u.protocol !== "https:" || u.username || u.password || job.report.length > 500 || CONTROL.test(job.report) || /\s/.test(job.report)) p.push("report: expected an https link without credentials");
    else if ([...u.searchParams.keys()].some((k) => SECRET_QUERY.test(k)) || SECRETS.some((r) => r.test(job.report))) p.push("report: the link carries something that looks like a secret");
  }
  return p;
}

export const normalizeJob = (j) => ({
  state: j.state, runner: j.runner, machine: j.machine ?? null, started: j.started, updated: j.updated, model: j.model ?? null,
  branches: j.branches ?? [], prs: j.prs ?? [], next: j.next ?? null, report: j.report ?? null,
});

// ───────── render ─────────
const esc = (s) => String(s).replace(/[<>`]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "`": "'" }[c]));
const q = (v) => (v == null ? "null" : JSON.stringify(v));

export function renderSection(input) {
  const problems = validateJob(input);
  if (problems.length) throw new Error(`Invalid job: ${problems.join("; ")}`);
  const j = normalizeJob(input);
  const where = j.machine ? `${j.runner}, ${esc(j.machine)}` : j.runner;
  const lines = [START, `**Agent job: ${j.state}** · ${where} · updated ${j.updated}`, ""];
  if (j.next) lines.push(`Next: ${esc(j.next)}`, "");
  const facts = [];
  if (j.model) facts.push(`Model: ${esc(j.model)}`);
  if (j.branches.length) facts.push(`Branches: ${j.branches.map((b) => `\`${b}\``).join(", ")}`);
  if (j.prs.length) facts.push(`PRs: ${j.prs.join(", ")}`);
  if (j.report) facts.push(`[Report](${j.report})`);
  if (facts.length) lines.push(facts.join(" · "), "");
  lines.push(
    "```yaml",
    `state: ${j.state}`, `runner: ${j.runner}`, `machine: ${q(j.machine)}`, `started: ${j.started}`, `updated: ${j.updated}`, `model: ${q(j.model)}`,
    `branches: ${q(j.branches)}`, `prs: ${q(j.prs)}`, `next: ${q(j.next)}`, `report: ${q(j.report)}`,
    "```", END,
  );
  return lines.join("\n");
}

// ───────── find the markers ─────────
// Lines are scanned with their offsets. A marker is a line that holds only the marker text (up to three leading spaces,
// as CommonMark allows before any block; trailing blanks allowed), outside ``` / ~~~ fences. openFence: the body ends
// inside a fence.
function scan(body) {
  const starts = [];
  const ends = [];
  let fence = null;
  let at = 0;
  while (at <= body.length) {
    let nl = body.indexOf("\n", at);
    const last = nl < 0;
    if (last) nl = body.length;
    const raw = body.slice(at, nl);
    const text = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(text);
    if (f) {
      if (!fence) fence = f[1][0].repeat(f[1].length);
      else if (f[1][0] === fence[0] && f[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(text)) fence = null;
    } else if (!fence) {
      const m = /^( {0,3})<!-- oriso:job:start v(\d+) -->\s*$/.exec(text);
      const e = m ? null : /^( {0,3})<!-- oriso:job:end -->\s*$/.exec(text);
      if (m) starts.push({ at, end: at + m[1].length + START.length, version: m[2], crlf: raw.endsWith("\r") });
      else if (e) ends.push({ at, end: at + e[1].length + END.length });
    }
    if (last) break;
    at = nl + 1;
  }
  return { starts, ends, openFence: fence !== null };
}

function locate(body) {
  const { starts, ends, openFence } = scan(body);
  const bad = (message) => ({ error: { code: "BAD_MARKERS", message } });
  if (!starts.length && !ends.length) {
    return openFence ? { none: true, error: bad("The description ends inside an open code fence (``` or ~~~ without its closing line), so an appended section would land inside the code block; close the fence by hand, then report again").error } : { none: true };
  }
  if (starts.length !== 1 || ends.length !== 1) return bad(`Expected exactly one job section, found ${starts.length} start and ${ends.length} end marker(s); fix the description by hand`);
  if (starts[0].version !== "1") return bad(`Unsupported job section version v${starts[0].version}; this tool writes v1`);
  if (ends[0].at < starts[0].end) return bad("The job end marker comes before the start marker; fix the description by hand");
  return { from: starts[0].at, to: ends[0].end, crlf: starts[0].crlf };
}

// → {ok:true, body, mode: "replaced"|"appended"|"unchanged"} | {ok:false, error:{code:"BAD_MARKERS", message}}
export function applySection(body, section) {
  const text = String(body ?? "");
  const loc = locate(text);
  if (loc.error) return { ok: false, error: loc.error };
  if (loc.none) {
    const crlf = text.includes("\r\n");
    const eol = crlf ? "\r\n" : "\n";
    const sec = crlf ? section.replace(/\n/g, eol) : section;
    const out = text === "" ? sec : text + (/\n$/.test(text) ? eol : eol + eol) + sec;
    return { ok: true, body: out, mode: "appended" };
  }
  const sec = loc.crlf ? section.replace(/\n/g, "\r\n") : section;
  const out = text.slice(0, loc.from) + sec + text.slice(loc.to);
  return { ok: true, body: out, mode: out === text ? "unchanged" : "replaced" };
}

// ───────── parse ─────────
// " # comment" after a value is cut off, but only outside "..." and '...' (a # inside a quoted string is text).
export function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i).trimEnd();
  }
  return line;
}

function parseYaml(lines) {
  const raw = {};
  const problems = [];
  for (const full of lines) {
    const line = stripComment(full);
    if (!line.trim()) continue;
    const m = /^([A-Za-z_]+):\s*(.*?)\s*$/.exec(line);
    if (!m) { problems.push("unreadable line in the yaml block"); continue; }
    let [, key, val] = m;
    if (key in raw) { problems.push(`${key}: given twice`); continue; }
    if (val === "" || val === "~" || val === "null") raw[key] = null;
    else if (/^["[]/.test(val)) {
      try { raw[key] = JSON.parse(val); } catch { problems.push(`${key}: not valid (use JSON-style quotes and lists)`); }
    } else raw[key] = val;
  }
  return { raw, problems };
}

// → null (no section) | {job, problems:[]} | {job:null, problems:[...], code}
//   code: "BAD_MARKERS" (markers broken: fix by hand) or "BAD_SECTION" (the section is there but does not validate)
export function parseSection(body) {
  const text = String(body ?? "");
  const loc = locate(text);
  if (loc.none) return null;
  if (loc.error) return { job: null, problems: [loc.error.message], code: "BAD_MARKERS" };
  const lines = text.slice(loc.from, loc.to).split(/\r?\n/);
  const open = lines.findIndex((l) => /^```ya?ml\s*$/.test(l));
  const close = open < 0 ? -1 : lines.findIndex((l, i) => i > open && /^```\s*$/.test(l));
  if (open < 0 || close < 0) return { job: null, problems: ["no yaml block in the job section"], code: "BAD_SECTION" };
  const { raw, problems } = parseYaml(lines.slice(open + 1, close));
  const job = normalizeJob({ ...raw, state: raw.state, runner: raw.runner, started: raw.started, updated: raw.updated });
  const all = [...problems, ...validateJob({ ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined)) })];
  return all.length ? { job: null, problems: all, code: "BAD_SECTION" } : { job, problems: [] };
}

// ───────── diff for the dry run ─────────
// One changed block (common head and tail cut away) with two lines of context; "" when nothing differs.
export function diffText(before, after, context = 2) {
  const a = String(before ?? "").split("\n").map((l) => l.replace(/\r$/, ""));
  const b = String(after ?? "").split("\n").map((l) => l.replace(/\r$/, ""));
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  if (head === a.length && head === b.length) return "";
  const out = [];
  for (let i = Math.max(0, head - context); i < head; i++) out.push(` ${a[i]}`);
  for (let i = head; i < a.length - tail; i++) out.push(`-${a[i]}`);
  for (let i = head; i < b.length - tail; i++) out.push(`+${b[i]}`);
  for (let i = a.length - tail; i < Math.min(a.length, a.length - tail + context); i++) out.push(` ${a[i]}`);
  return out.join("\n");
}
