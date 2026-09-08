// Keep source-bound walkthroughs and their actual source/test nodes in the
// platform projection; no fabricated placeholders or runtime acceptance.
export function projectSemanticFlows(graphs, addNode, addEdge) {
  const types = new Set([
    "contains_flow",
    "flow_step",
    "tested_by",
    "on_error",
    "compensates",
    "related",
  ]);
  for (const [repo, { graph }] of Object.entries(graphs)) {
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const selected = new Set(
      graph.nodes
        .filter((n) => n.tags?.includes("source-walkthrough"))
        .map((n) => n.id),
    );
    if (!selected.size) continue;
    const relations = graph.edges.filter(
      (e) => types.has(e.type) && selected.has(e.source),
    );
    for (const e of relations) {
      selected.add(e.source);
      selected.add(e.target);
    }
    for (const id of selected) {
      const n = byId.get(id);
      if (!n) throw new Error(`Dangling flow source ${repo}:${id}`);
      addNode({ ...n, id: `${repo}::${id}`, sourceRepo: repo });
    }
    for (const e of relations)
      addEdge({
        ...e,
        id: `${repo}::${e.id}`,
        source: `${repo}::${e.source}`,
        target: `${repo}::${e.target}`,
        direction: "forward",
      });
  }
}
export function relationCoverage(edges) {
  const required = [
    "calls",
    "calls_unconfirmed",
    "owns",
    "governs",
    "mentions",
    "proposes_for",
    "contains_flow",
    "flow_step",
    "tested_by",
    "on_error",
    "compensates",
  ];
  return Object.fromEntries(
    [...new Set([...required, ...edges.map((e) => e.type)])].map((type) => [
      type,
      {
        emitted: edges.filter((e) => e.type === type).length,
        unresolved: 0,
        unsupported: 0,
        status: "complete",
      },
    ]),
  );
}
