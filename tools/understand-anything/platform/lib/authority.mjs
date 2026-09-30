// Textual relevance never confers authority. No lifecycle/owner/scope is inferred.
function field(text, key) {
  const clean = text.replace(/\*\*/g, "");
  const values = [
    ...clean.matchAll(
      new RegExp(`^[ \t]*(?:[-*][ \t]*)?${key}:[ \t]*(.+)$`, "gim"),
    ),
  ].map((m) => m[1].trim());
  const unique = [...new Set(values)];
  return unique.length === 1 ? unique[0] : null;
}
const list = (value) =>
  !value || /^(none|n\/a|-)$/i.test(value)
    ? []
    : value
        .replace(/^\[|\]$/g, "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
function declarationText(text) {
  // Hidden examples are not declarations; discard unclosed comments as well.
  text = text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
  let fence = null;
  return text
    .split(/\r?\n/)
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = null;
        return "";
      }
      if (marker) {
        fence = marker[1];
        return "";
      }
      // Indented code and block quotes are examples, not document declarations.
      return /^(?: {4}|\t| {0,3}>)/.test(line) ? "" : line;
    })
    .join("\n");
}
function hasOwner(owner) {
  return (
    typeof owner === "string" &&
    owner.trim().length > 0 &&
    !/^(?:tbd|todo|unknown|unassigned|none|n\/a|pending)\b/i.test(
      owner.trim(),
    ) &&
    !/^(?:[-?]+|<[^>]+>|\[[^\]]+\])$/.test(owner.trim())
  );
}
export function parseAuthority(text, repos) {
  text = declarationText(text);
  const status = field(text, "Status")?.toLowerCase() ?? "unknown";
  const scope = list(field(text, "Scope"));
  const supersedes = field(text, "Supersedes"),
    supersededBy = field(text, "Superseded-by");
  return {
    status,
    owner: hasOwner(field(text, "Owner")) ? field(text, "Owner") : null,
    scope: scope.filter((r) => repos.includes(r)),
    supersedes: list(supersedes),
    supersededBy: list(supersededBy),
    explicit:
      !!field(text, "Scope") &&
      scope.length > 0 &&
      scope.every((r) => repos.includes(r)) &&
      supersedes !== null &&
      supersededBy !== null,
    evidenceKind: "source-declared",
    runtimeVerified: false,
  };
}
export function authorityRelations(docs) {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const superseded = new Set(
    docs
      .filter(
        (d) =>
          d.authority?.status === "accepted" &&
          d.authority.explicit &&
          hasOwner(d.authority.owner),
      )
      .flatMap((d) => d.authority.supersedes),
  );
  function validChain(id, seen = new Set()) {
    if (seen.has(id)) return false;
    const d = byId.get(id);
    if (!d) return false;
    return (d.authority?.supersedes ?? []).every((prior) =>
      validChain(prior, new Set([...seen, id])),
    );
  }
  return docs.flatMap((d) => {
    const a = d.authority;
    const governs =
      a?.status === "accepted" &&
      a.explicit &&
      hasOwner(a.owner) &&
      !a.supersededBy.length &&
      !superseded.has(d.id) &&
      validChain(d.id);
    return [...new Set([...(d.mentionedRepos ?? []), ...(a?.scope ?? [])])].map(
      (repo) => ({
        source: d.id,
        target: `service:${repo}`,
        direction: "forward",
        weight: governs && a.scope.includes(repo) ? 1 : 0.4,
        type:
          governs && a.scope.includes(repo)
            ? "governs"
            : a?.status === "proposed" && a.scope.includes(repo)
              ? "proposes_for"
              : "mentions",
        metadata: {
          authority: a,
          authorityChecked: true,
          evidenceKind: "source-declared",
          runtimeVerified: false,
        },
      }),
    );
  });
}
