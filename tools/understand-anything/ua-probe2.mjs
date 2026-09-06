// Probe 2: PluginRegistry + non-code parsers.
import { readFileSync } from "node:fs";

const CORE = "/opt/oriso-understand/understand-anything-plugin/understand-anything-plugin/packages/core/dist/index.js";
const c = await import(CORE);

console.log("=== PluginRegistry methods ===");
console.log(Object.getOwnPropertyNames(c.PluginRegistry.prototype));
console.log("=== registerAllParsers (head) ===");
console.log(String(c.registerAllParsers).slice(0, 600).replace(/\n\s*/g, " "));

const registry = new c.PluginRegistry();
c.registerAllParsers(registry);
const ts = new c.TreeSitterPlugin(c.builtinLanguageConfigs);
await ts.init();
// try common registration method names
for (const m of ["register", "registerPlugin", "add", "addPlugin"]) {
  if (typeof registry[m] === "function") { console.log("registering tree-sitter via", m); registry[m](ts); break; }
}

const repo = "/opt/oriso-understand/ORISO-Keycloak";
for (const f of ["keycloak-deployment.yaml", "backup/realm-backup.sh", "README.md"]) {
  const content = readFileSync(`${repo}/${f}`, "utf8");
  let out;
  try { out = registry.analyzeFile(f, content); } catch (e) { out = "ERR: " + e.message; }
  console.log(`\n=== registry.analyzeFile(${f}) ===`);
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1).slice(0, 1800));
}
// realm.json is big; just show it parses
try {
  const content = readFileSync(`${repo}/realm.json`, "utf8");
  const out = registry.analyzeFile("realm.json", content);
  console.log("\n=== realm.json analysis (keys + counts) ===");
  console.log(out ? Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? `array(${v.length})` : typeof v === "string" ? v.slice(0, 60) : v])) : out);
} catch (e) { console.log("realm.json ERR:", e.message); }
