// Internal review queue only. These associations never become SemanticClaim
// records and cannot establish human review, deployment or legal acceptance.
import { createHash } from "node:crypto";
import { resolveReference } from "./semantic-claims.mjs";
import { isSupportedPublicRepository } from "./public-repositories.mjs";
const sha = /^[a-f0-9]{40}$/;
const fingerprint = /^[a-f0-9]{64}$/;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const validRange = (range) =>
  Array.isArray(range) &&
  range.length === 2 &&
  range.every(Number.isInteger) &&
  range[0] > 0 &&
  range[1] >= range[0];
const safePath = (path) =>
  typeof path === "string" &&
  path.length > 0 &&
  !path.startsWith("/") &&
  !path.includes("\\") &&
  !path.split("/").some((p) => ["..", ".", ""].includes(p));
function declaredAmbiguous(ref, graph) {
  return Boolean(
    graph.metadata?.extraction?.ambiguousLegacyIds?.[ref]?.length ||
      graph.metadata?.extraction?.legacyIdMap?.[ref]?.length > 1,
  );
}
function candidates(ref, graph) {
  if (declaredAmbiguous(ref, graph)) {
    const ids =
      graph.metadata?.extraction?.ambiguousLegacyIds?.[ref] ??
      graph.metadata?.extraction?.legacyIdMap?.[ref];
    return ids.map(
      (id) => graph.nodes.find((node) => node.id === id) ?? { id },
    );
  }
  try {
    const id = resolveReference(ref, graph);
    return graph.nodes.filter((node) => node.id === id);
  } catch (error) {
    if (!/Ambiguous/.test(error.message)) throw error;
    const aliases =
      graph.metadata?.extraction?.ambiguousLegacyIds?.[ref] ??
      graph.metadata?.extraction?.legacyIdMap?.[ref];
    if (aliases?.length)
      return graph.nodes.filter((node) => aliases.includes(node.id));
    const direct = graph.nodes.filter((node) => node.id === ref);
    if (direct.length) return direct;
    const exact = graph.nodes.filter((node) => node.filePath === ref);
    const paths = exact.length
      ? exact
      : graph.nodes.filter((node) => node.filePath?.endsWith("/" + ref));
    const files = paths.filter((node) => node.type === "file");
    return files.length
      ? files
      : paths.length
        ? paths
        : graph.nodes.filter((node) => node.name === ref);
  }
}
function evidence(node, repository, sourceSHA, generationId, readSource) {
  const result = {
    repository,
    sourceSHA,
    generationId,
    nodeId: node.id,
    path: node.filePath ?? null,
    sourceRange: node.lineRange ?? null,
    sourceFingerprint: node.metadata?.sourceFingerprint ?? null,
  };
  if (
    !safePath(result.path) ||
    !validRange(result.sourceRange) ||
    !fingerprint.test(result.sourceFingerprint ?? "")
  )
    return {
      ...result,
      status: "missing",
      reason: "Missing safe source path, range or fingerprint",
    };
  const raw = readSource(repository, result.path, sourceSHA);
  if (raw === null || raw === undefined)
    return {
      ...result,
      status: "missing",
      reason: "Source bytes unavailable at exact revision",
    };
  const text = Buffer.from(raw).toString("utf8"),
    lines = text.split("\n"),
    [start, end] = result.sourceRange;
  if (end > lines.length)
    return {
      ...result,
      status: "stale",
      reason: "Source range is outside current file",
    };
  // Same byte slicing contract as attachSourceEvidence: file nodes bind all
  // bytes, declarations bind inclusive source lines without trailing newline.
  const body =
    node.type === "file" ? text : lines.slice(start - 1, end).join("\n");
  if (
    digest(body) !== result.sourceFingerprint ||
    node.metadata?.sourceCommit !== sourceSHA
  )
    return {
      ...result,
      status: "stale",
      reason: "Graph fingerprint or source revision differs from actual bytes",
    };
  return { ...result, status: "matched" };
}
function bindingChanged(binding, entry) {
  if (!binding) return false;
  const actual = entry.references.flatMap((ref) => ref.candidates);
  const identity = (item) =>
    JSON.stringify([
      item.repository,
      item.sourceSHA,
      item.generationId,
      item.nodeId,
      item.path,
      item.sourceRange,
      item.sourceFingerprint,
    ]);
  return (
    binding.sourceSHA !== entry.sourceSHA ||
    binding.generationId !== entry.generationId ||
    binding.authoredSourceSHA256 !== entry.authoredSource.sha256 ||
    !Array.isArray(binding.evidence) ||
    JSON.stringify(binding.evidence.map(identity).sort()) !==
      JSON.stringify(actual.map(identity).sort())
  );
}
export function buildCandidateReport({
  manifest,
  graphs,
  packages,
  readSource,
  releaseValidated = false,
}) {
  if (!manifest?.generationId || !Array.isArray(manifest.sources))
    throw Error("Exact source vector and generation required");
  const sources = new Map();
  for (const source of manifest.sources) {
    if (!isSupportedPublicRepository(source.repository)) continue;
    if (!sha.test(source.sourceSHA) || sources.has(source.repository))
      throw Error("Invalid or duplicate exact source vector");
    sources.set(source.repository, source.sourceSHA);
  }
  if (manifest.release) {
    const released = manifest.release.lock?.sources;
    if (
      !Array.isArray(released) ||
      released.length !== sources.size ||
      released.some(
        (source) => sources.get(source.repository) !== source.sourceSHA,
      )
    )
      throw Error("Release source vector mismatch");
  }
  const entries = [];
  for (const input of packages) {
    if (!isSupportedPublicRepository(input.repository)) continue; // before authored text/accessors
    const sourceSHA = sources.get(input.repository),
      graph = graphs[input.repository];
    if (!sourceSHA || !graph || graph.project?.gitCommitHash !== sourceSHA)
      throw Error(
        "Graph differs from exact source vector: " + input.repository,
      );
    const generationId = graph.generationId ?? graph.metadata?.generationId;
    if (generationId !== manifest.generationId)
      throw Error(
        "Graph generation differs from manifest: " + input.repository,
      );
    if (
      typeof input.id !== "string" ||
      !input.id ||
      entries.some((e) => e.id === input.id) ||
      !input.authoredSource?.bytes ||
      !safePath(input.authoredSource.path) ||
      !Array.isArray(input.references) ||
      !input.references.length ||
      input.references.some((ref) => typeof ref !== "string" || !ref)
    )
      throw Error("Stable package ID, authored bytes and references required");
    const entry = {
      id: input.id,
      repository: input.repository,
      sourceSHA,
      generationId,
      authoredSource: {
        path: input.authoredSource.path,
        sha256: digest(input.authoredSource.bytes),
        anchor: input.authoredAnchor ?? null,
      },
      qualification: input.qualification ?? null,
      reviewed: false,
      runtimeVerified: false,
      references: input.references.map((ref) => {
        const matches = candidates(ref, graph);
        return {
          ref,
          status:
            matches.length > 1 || declaredAmbiguous(ref, graph)
              ? "ambiguous"
              : matches.length
                ? "matched"
                : "missing",
          candidates: matches.map((node) =>
            evidence(
              node,
              input.repository,
              sourceSHA,
              generationId,
              readSource,
            ),
          ),
        };
      }),
    };
    const authoredMissing =
      input.authoredAnchor !== undefined &&
      (typeof input.authoredAnchor !== "string" ||
        !input.authoredAnchor ||
        !Buffer.from(input.authoredSource.bytes)
          .toString("utf8")
          .includes(input.authoredAnchor));
    const states = entry.references.flatMap((ref) => [
      ref.status,
      ...ref.candidates.map((e) => e.status),
    ]);
    if (authoredMissing) states.push("missing");
    entry.status =
      bindingChanged(input.binding, entry) || states.includes("stale")
        ? "stale"
        : states.includes("ambiguous")
          ? "ambiguous"
          : states.includes("missing")
            ? "missing"
            : "matched";
    if (authoredMissing)
      entry.reason =
        "Stable authored claim or feature absent from pinned source bytes";
    entries.push(entry);
  }
  return {
    schemaVersion: "oriso.ua.claim-candidates/v1",
    audience: "internal-review",
    generationId: manifest.generationId,
    sourceScope:
      manifest.release && releaseValidated
        ? "release-bound-source"
        : "preview-source",
    publicationEligible: false,
    semanticClaimsApplied: 0,
    packages: entries,
  };
}
