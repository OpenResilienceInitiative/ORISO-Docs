#!/usr/bin/env node
// ua-summary-coverage.mjs — bilingual summary coverage + work list + ingest.
//   report:  node ua-summary-coverage.mjs report --graph G.json [--summaries summaries-i18n-X.json] [--requests out.json] [--top 5]
//   ingest:  node ua-summary-coverage.mjs ingest --responses R.json --commit SHA --out summaries-i18n-X.json
// Model/key: this tool never calls a model. The producer (human or scheduled Claude run)
// answers the --requests list and names itself via UA_SUMMARY_MODEL (recorded as meta.generatedBy).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  selectTargets, coverageReport, formatReport, buildRequests, parseCommits,
  ingestResponses, validateSummaryFile, DEFAULTS,
} from "./lib/summary-coverage.mjs";

const [cmd, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, "")] = rest[i + 1];
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

if (cmd === "report") {
  const graph = readJson(opt.graph);
  const top = Number(opt.top ?? DEFAULTS.topFilesPerCapability);
  const targets = selectTargets(graph, { topFilesPerCapability: top });
  let summaries = {};
  if (opt.summaries && existsSync(opt.summaries)) {
    const file = readJson(opt.summaries);
    const errs = validateSummaryFile(file);
    if (errs.length) { console.error(`summaries INVALID: ${errs.slice(0, 10).join("; ")}`); process.exit(1); }
    summaries = file.summaries;
  }
  const report = coverageReport(targets, summaries);
  for (const l of formatReport(report)) console.error(l);
  if (opt.requests) {
    const commits = parseCommits(graph.project?.gitCommitHash);
    writeFileSync(opt.requests, JSON.stringify(buildRequests(graph, targets, report, commits), null, 1));
    console.error(`summaries: wrote ${report.folders.missing.length + report.files.missing.length} requests to ${opt.requests}`);
  }
} else if (cmd === "ingest") {
  const model = process.env.UA_SUMMARY_MODEL;
  if (!model) { console.error("UA_SUMMARY_MODEL must name the producing model"); process.exit(2); }
  const file = ingestResponses(readJson(opt.responses), opt.commit, new Date().toISOString(), { generatedBy: model });
  writeFileSync(opt.out, JSON.stringify(file, null, 1));
  console.error(`summaries: stamped ${Object.keys(file.summaries).length} entries @${opt.commit}`);
} else {
  console.error("usage: report|ingest (see header)");
  process.exit(2);
}
