// Source-level claims are not runtime acceptance. Never bind historical prose
// to a fresh build merely because its node ID survived the rebuild.
const sha = /^[a-f0-9]{40}$/i;
const fingerprint = /^[a-f0-9]{64}$/i;
const validRange = (range) =>
  Array.isArray(range) &&
  range.length === 2 &&
  range.every(Number.isInteger) &&
  range[0] >= 1 &&
  range[1] >= range[0];
export function resolveReference(ref, graph) {
  if (graph.metadata?.extraction?.ambiguousLegacyIds?.[ref]?.length)
    throw new Error(`Ambiguous legacy reference: ${ref}`);
  const direct = graph.nodes.filter((n) => n.id === ref);
  if (direct.length === 1) return direct[0].id;
  const alias = graph.metadata?.extraction?.legacyIdMap?.[ref];
  if (alias?.length > 1) throw new Error(`Ambiguous legacy reference: ${ref}`);
  if (alias?.length === 1 && graph.nodes.some((n) => n.id === alias[0]))
    return alias[0];
  const exactPaths = graph.nodes.filter((n) => n.filePath === ref);
  const paths = exactPaths.length
    ? exactPaths
    : graph.nodes.filter((n) => n.filePath?.endsWith(`/${ref}`));
  // A file path intentionally selects the file node, not all declarations in it.
  const files = paths.filter((n) => n.type === "file");
  const candidates = files.length
    ? files
    : paths.length
      ? paths
      : graph.nodes.filter((n) => n.name === ref);
  if (candidates.length > 1)
    throw new Error(`Ambiguous semantic reference: ${ref}`);
  return candidates[0]?.id ?? null;
}
export function assessClaim(claim, graph, { now = Date.now } = {}) {
  const evaluatedTime = now();
  if (!Number.isFinite(evaluatedTime))
    throw new Error("Invalid semantic evaluation clock");
  const base = {
    ...claim,
    evaluatedGenerationId:
      graph.generationId ?? graph.metadata?.generationId ?? null,
    evaluatedAt: new Date(evaluatedTime).toISOString(),
    runtimeVerified: false,
  };
  const required =
    claim &&
    sha.test(claim.sourceCommit) &&
    claim.generationId &&
    Number.isFinite(Date.parse(claim.generatedAt)) &&
    Number.isFinite(Date.parse(claim.reviewedAt)) &&
    ["source-reviewed", "inferred", "uncertain"].includes(claim.confidence) &&
    Array.isArray(claim.evidence) &&
    claim.evidence.length;
  if (!required)
    return {
      ...base,
      status: "unbound",
      reason: "Missing reviewed source provenance",
    };
  const generatedTime = Date.parse(claim.generatedAt);
  const reviewedTime = Date.parse(claim.reviewedAt);
  if (
    generatedTime > evaluatedTime ||
    reviewedTime > evaluatedTime ||
    reviewedTime < generatedTime
  )
    return {
      ...base,
      status: "unbound",
      reason:
        "Invalid semantic chronology: generatedAt <= reviewedAt <= evaluation time is required",
    };
  if (claim.sourceCommit !== graph.project?.gitCommitHash)
    return {
      ...base,
      status: "stale",
      reason: "Source revision changed; re-review required",
    };
  for (const e of claim.evidence) {
    const id = resolveReference(e.nodeId, graph),
      n = graph.nodes.find((n) => n.id === id);
    if (
      !n ||
      e.sourceCommit !== claim.sourceCommit ||
      !["source", "test-source"].includes(e.kind) ||
      !validRange(e.sourceRange) ||
      !validRange(n.lineRange) ||
      !fingerprint.test(e.sourceFingerprint) ||
      e.sourceFingerprint !== n.metadata?.sourceFingerprint ||
      JSON.stringify(e.sourceRange) !== JSON.stringify(n.lineRange)
    )
      return {
        ...base,
        status: "stale",
        reason: `Source evidence changed or unresolved: ${e.nodeId}`,
      };
  }
  return {
    ...base,
    status: "source-current",
    reason:
      "Bound source matches; confidence unchanged and runtime acceptance not established",
  };
}
export function applyNodeSummary(node, value, graph, meta = {}, options = {}) {
  const result = assessClaim(value.claim, graph, options);
  node.metadata = {
    ...node.metadata,
    structuralSummary: node.metadata?.structuralSummary ?? node.summary,
    semanticClaim: {
      ...result,
      generatedAt: value.claim?.generatedAt ?? meta.generatedAt ?? null,
      priorSummary: value.summary,
    },
  };
  if (result.status === "source-current") {
    node.summary = value.summary.trim();
    if (Array.isArray(value.tags))
      node.tags = [...new Set([...(node.tags ?? []), ...value.tags])];
  } else if (typeof value.summary === "string" && value.summary.trim()) {
    node.summary = `[Dated orientation; ${result.status} — verify current source] ${value.summary.trim()}`;
  }
  return result;
}
// Migration boundary for historical unbound annotations only. New reviewed
// claims still fail hard on ambiguity, so quarantining is never a trust bypass.
export function resolveHistoricalReference(
  ref,
  graph,
  { trusted = false, owner = "legacy" } = {},
) {
  try {
    return resolveReference(ref, graph);
  } catch (error) {
    if (trusted) throw error;
    graph.metadata ??= {};
    (graph.metadata.rejectedSemanticReferences ??= []).push({
      ref,
      owner,
      disposition: "quarantined",
      reason: error.message,
    });
    return null;
  }
}
