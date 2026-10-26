// Watcher rules for the planning map (ORISO-Docs#207). Pure: item + now + config -> findings[].
// Findings land in board.json per item; the map only renders them. Thresholds: ../watchers.config.json.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const watchConfig = JSON.parse(readFileSync(resolve(here, "../watchers.config.json"), "utf8"));
export const RULES = ["stalled", "closed-not-done", "qa-external-no-bjoern", "epic-no-readiness", "gate-status-mismatch"];

const DAY = 86400000;
const isClosed = (i) => i.state === "CLOSED" || i.state === "MERGED";
const isOpen = (i) => i.state === "OPEN" || (i.state == null && i.contentType === "DraftIssue");

const checks = {
  stalled(i, { now, config }) {
    const threshold = config.stalledDays?.[i.status];
    if (threshold == null || !isOpen(i) || !i.updatedAt) return null;
    const days = Math.floor((Date.parse(now) - Date.parse(i.updatedAt)) / DAY);
    return days > threshold ? { severity: "warn", detail: { status: i.status, days, threshold } } : null;
  },
  "closed-not-done"(i) {
    return isClosed(i) && i.status !== "Done" ? { severity: "error", detail: { status: i.status } } : null;
  },
  "qa-external-no-bjoern"(i, { config }) {
    if (i.status !== "QA external" || !Array.isArray(i.assignees)) return null; // unknown assignees: no guess
    const want = String(config.qaExternalAssignee).toLowerCase();
    return i.assignees.some((a) => a.toLowerCase() === want) ? null : { severity: "warn", detail: { expected: config.qaExternalAssignee } };
  },
  "epic-no-readiness"(i) {
    return i.issueType === "Epic" && isOpen(i) && i.readiness == null ? { severity: "warn", detail: {} } : null;
  },
  "gate-status-mismatch"(i, { config }) {
    if (!i.gate) return null; // no Gate field yet (#211): no-op
    const allowed = config.gate?.allowedStatuses?.[i.gate];
    return allowed && !allowed.includes(i.status) ? { severity: "warn", detail: { gate: i.gate, status: i.status } } : null;
  },
};

export function evaluateItem(item, { now, config = watchConfig } = {}) {
  const out = [];
  for (const rule of RULES) {
    const r = checks[rule](item, { now, config });
    if (r) out.push({ rule, severity: r.severity, detail: r.detail });
  }
  return out;
}
