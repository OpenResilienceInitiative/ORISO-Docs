// The category "refactoring" and the scope marker of a refactoring task (ORISO-Docs#222). No imports: board.mjs and refactor.mjs share it.
//   category = the repository label `refactoring` (see board-contract.json, "categories"); no issue type or board field exists for it
//   scope    = hidden marker in the task body: <!-- oriso:refactor:v1 scope=<capability>[:<repo>[:<path>]] -->
export const REFACTORING_LABEL = "refactoring";
export const MARKER_RE = /<!--\s*oriso:refactor:v1\s+scope=([a-z][a-z0-9-]*(?::[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.@-]+(?:\/[A-Za-z0-9_.@-]+)*)?)?)\s*-->/;
const dotted = (scope) => scope.split(":")[2]?.split("/").some((s) => s === "." || s === "..");
// -> scope text or null
export function parseMarker(body) {
  const m = typeof body === "string" ? MARKER_RE.exec(body) : null;
  return m && !dotted(m[1]) ? m[1] : null;
}
export const hasRefactoringLabel = (labelNodes) => (labelNodes ?? []).some((l) => l?.name === REFACTORING_LABEL);
