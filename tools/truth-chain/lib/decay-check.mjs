import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEvidenceMap } from "./parse-evidence-map.mjs";
import { createHash } from "node:crypto";

/**
 * Verify evidence-map entries against repo clones.
 *
 * Status:
 * - ok: file exists, all `expect` identifiers found in the (optional) line range
 * - drifted: file exists, identifiers found in the file but not in the cited range
 * - broken: file missing, or identifiers not found anywhere in the file
 * - unverified: clone is not present (local laptops); not a DPIA failure
 */
export function checkEvidenceMap({
  mapText,
  reposRoot,
  commits = {},
  verifiedAt = new Date().toISOString(),
  canary = false,
} = {}) {
  const doc = typeof mapText === "string" ? parseEvidenceMap(mapText) : mapText;
  const findings = [];

  for (const entry of doc.entries || []) {
    const evidenceResults = [];
    for (const ev of entry.evidence || []) {
      evidenceResults.push(checkOne(ev, reposRoot));
    }
    const status = rollup(evidenceResults);
    findings.push({
      slug: entry.slug,
      chapter: entry.chapter || null,
      claim: entry.claim || "",
      status,
      commit: commits[entry.evidence?.[0]?.repo] || null,
      evidence: evidenceResults,
    });
  }

  const counts = { total: findings.length, ok: 0, drifted: 0, broken: 0, unverified: 0 };
  for (const f of findings) counts[f.status] = (counts[f.status] || 0) + 1;

  return {
    version: 1,
    verifiedAt,
    canary,
    commits,
    counts,
    findings,
  };
}

function checkOne(ev, reposRoot) {
  const repo = ev.repo;
  const rel = ev.path;
  const expect = ev.expect || [];
  const abs = join(reposRoot, repo, rel);
  if (!existsSync(join(reposRoot, repo))) {
    return { repo, path: rel, status: "unverified", reason: "clone-missing" };
  }
  if (!existsSync(abs)) {
    return { repo, path: rel, status: "broken", reason: "file-missing" };
  }
  const stat = statSync(abs);
  if (!stat.isFile()) {
    return { repo, path: rel, status: "broken", reason: "not-a-file" };
  }
  const text = readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  const range = parseRange(ev.lines);
  const slice = range ? lines.slice(range.start - 1, range.end).join("\n") : text;
  const missingInRange = expect.filter((id) => !slice.includes(id));
  const missingInFile = expect.filter((id) => !text.includes(id));
  const snippetHash = sha256(normalize(slice));

  if (missingInFile.length === expect.length && expect.length > 0) {
    return { repo, path: rel, status: "broken", reason: "identifiers-gone", missing: missingInFile, snippetHash };
  }
  if (missingInFile.length > 0) {
    return { repo, path: rel, status: "broken", reason: "identifiers-gone", missing: missingInFile, snippetHash };
  }
  if (missingInRange.length > 0) {
    return {
      repo,
      path: rel,
      status: "drifted",
      reason: "identifiers-outside-range",
      missingInRange,
      snippetHash,
    };
  }
  return { repo, path: rel, status: "ok", snippetHash };
}

function rollup(results) {
  if (results.some((r) => r.status === "broken")) return "broken";
  if (results.some((r) => r.status === "drifted")) return "drifted";
  if (results.some((r) => r.status === "unverified")) return "unverified";
  if (results.length === 0) return "unverified";
  return "ok";
}

function parseRange(lines) {
  if (!lines) return null;
  const m = String(lines).match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  return { start: Number(m[1]), end: Number(m[2]) };
}

function normalize(text) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}
