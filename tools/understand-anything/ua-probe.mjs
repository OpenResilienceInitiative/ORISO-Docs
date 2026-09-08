// Probe the understand-anything core runtime API before writing the driver.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CORE = "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

for (const n of ["detectLayers", "generateHeuristicTour", "buildFingerprintStore", "validateGraph", "extractFileFingerprint"]) {
  console.log(`=== ${n} (head of source) ===`);
  console.log(String(c[n]).slice(0, 500).replace(/\n\s*/g, " "), "\n");
}

const repo = "/opt/oriso-understand/ORISO-Keycloak";
const files = execSync(`git -C ${repo} ls-files`, { encoding: "utf8" }).trim().split("\n");
console.log("=== keycloak tracked files ===");
console.log(files.join("\n"));

const plugin = new c.TreeSitterPlugin(c.builtinLanguageConfigs);
await plugin.init();
console.log("\n=== plugin languages ===", plugin.languages);

const codeFile = files.find(f => /\.(ts|tsx|js|jsx|java|py|go)$/.test(f));
if (codeFile) {
  const content = readFileSync(`${repo}/${codeFile}`, "utf8");
  console.log(`\n=== analyzeFile(${codeFile}) ===`);
  console.log(JSON.stringify(plugin.analyzeFile(codeFile, content), null, 1).slice(0, 2500));
  console.log(`\n=== resolveImports ===`);
  console.log(JSON.stringify(plugin.resolveImports(codeFile, content)).slice(0, 800));
  console.log(`\n=== extractCallGraph ===`);
  console.log(JSON.stringify(plugin.extractCallGraph(codeFile, content)).slice(0, 800));
} else {
  console.log("\nNO code file matched in Keycloak repo");
}
