/**
 * Minimal YAML parser for evidence-map.yaml (internal/dsfa-evidence-map/v1).
 * Handles the documented subset: scalars, quoted strings, string arrays, nested evidence list.
 */
export function parseEvidenceMap(text) {
  const lines = text.split(/\r?\n/);
  const doc = { entries: [] };
  let entry = null;
  let evidence = null;
  let mode = "top";

  const flushEvidence = () => {
    if (evidence && entry) entry.evidence.push(evidence);
    evidence = null;
  };
  const flushEntry = () => {
    flushEvidence();
    if (entry) doc.entries.push(entry);
    entry = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const top = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (top && !line.startsWith(" ")) {
      flushEntry();
      mode = top[1] === "entries" ? "entries" : "top";
      if (top[1] !== "entries") doc[top[1]] = unquote(top[2]);
      continue;
    }

    const slug = line.match(/^\s+-\s+slug:\s*(.*)$/);
    if (slug) {
      flushEntry();
      entry = { slug: unquote(slug[1]), evidence: [] };
      mode = "entry";
      continue;
    }

    if (mode === "entry" && entry) {
      const evItem = line.match(/^\s+-\s+repo:\s*(.*)$/);
      if (evItem) {
        flushEvidence();
        evidence = { repo: unquote(evItem[1]) };
        continue;
      }
      if (/^\s+evidence:\s*$/.test(line)) {
        entry.evidence = [];
        continue;
      }
      const field = line.match(/^\s{2,4}([A-Za-z0-9_]+):\s*(.*)$/);
      if (field && !evidence && field[1] !== "evidence") {
        entry[field[1]] = parseValue(field[2]);
        continue;
      }
      const evField = line.match(/^\s{6,}([A-Za-z0-9_]+):\s*(.*)$/);
      if (evField && evidence) {
        evidence[evField[1]] = parseValue(evField[2]);
      }
    }
  }
  flushEntry();
  return doc;
}

function parseValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((p) => unquote(p.trim()));
  }
  return unquote(trimmed);
}

function unquote(value = "") {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"');
  }
  return v;
}
