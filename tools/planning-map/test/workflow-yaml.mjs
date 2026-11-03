// Parsed GitHub workflow files for the workflow tests (ORISO-Docs#213 review). Uses the `yaml` package that the repository
// already depends on: tools/understand-anything (npm ci there) or, as a fallback, site/ (pnpm install there). No regexes over
// the YAML text: a test sees jobs, steps and keys the way GitHub Actions reads them.
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const WORKFLOWS_DIR = resolve(here, "../../../.github/workflows");
const HOSTS = ["../../understand-anything/package.json", "../../../site/package.json"];

let YAML = null;
function yaml() {
  if (YAML) return YAML;
  for (const host of HOSTS) {
    try { YAML = createRequire(resolve(here, host))("yaml"); return YAML; } catch { /* next host */ }
  }
  throw new Error("The workflow tests need the yaml package: run `npm ci` in tools/understand-anything");
}

export const parseYaml = (text) => yaml().parse(text);
export const readWorkflow = (name) => parseYaml(readFileSync(resolve(WORKFLOWS_DIR, name), "utf8"));
export const workflowNames = () => readdirSync(WORKFLOWS_DIR).filter((n) => /\.ya?ml$/.test(n)).sort();

// Steps of a job, each with its index; `run` is the script text ("" for `uses` steps).
export const stepsOf = (job) => (job?.steps ?? []).map((s, i) => ({ ...s, index: i, run: typeof s.run === "string" ? s.run : "" }));
export const runsOf = (job) => stepsOf(job).map((s) => s.run).join("\n");
// The first step whose run text matches re (or whose `uses` matches), or undefined.
export const stepWith = (job, re) => stepsOf(job).find((s) => re.test(s.run) || re.test(String(s.uses ?? "")));
