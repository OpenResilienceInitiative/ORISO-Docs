#!/usr/bin/env node
/**
 * apply-platform-enrich.mjs — deterministic, idempotent narrative merge.
 *
 *   node apply-platform-enrich.mjs <graph.json> <platform-enrich.json>
 *
 * Applies a hand-written narrative layer onto an ORISO-Platform knowledge
 * graph, in place:
 *
 *   - records dated prose in `metadata.semanticClaim.priorSummary` for `serviceSummaries` (only for
 *     ids that already exist in the graph);
 *   - sets `description` on layers whose `name` appears in `layerDescriptions`;
 *   - appends `concept` nodes (skipped when the id already exists) plus
 *     `related` edges (weight 0.7, direction "forward") to existing targets;
 *   - replaces `graph.tour` with the enrichment's tour, filtering nodeIds that
 *     don't exist and dropping steps left with none;
 *   - stamps `graph.metadata.narrative` with the enrichment's `meta`.
 *
 * Nothing is invented: every id that doesn't resolve is reported in
 * `droppedRefs` instead of being created. Running the script twice leaves the
 * file byte-identical the second time (`conceptsAdded` / `edgesAdded` = 0).
 *
 * Node 22+, ESM, zero dependencies.
 */

import { relationCoverage } from '../lib/semantic-projection.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { substitute } from '../lib/placeholders.mjs';

const USAGE = 'usage: node apply-platform-enrich.mjs <graph.json> <platform-enrich.json>';

function fail(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

const [graphPath, enrichPath] = process.argv.slice(2);
if (!graphPath || !enrichPath) fail(USAGE);

let graph;
let enrich;
try {
  graph = JSON.parse(readFileSync(graphPath, 'utf8'));
} catch (err) {
  fail(`cannot read graph ${graphPath}: ${err.message}`);
}
try {
  enrich = JSON.parse(readFileSync(enrichPath, 'utf8'));
} catch (err) {
  fail(`cannot read enrichment ${enrichPath}: ${err.message}`);
}

if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
  fail(`${graphPath} does not look like a knowledge graph (missing nodes/edges arrays)`);
}

const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
const droppedRefs = [];
const drop = (ref) => {
  if (!droppedRefs.includes(ref)) droppedRefs.push(ref);
};

/* ---------- 0. {{stats.<dotted.path>}} substitution ---------- */
// graph.metadata.stats is written by ua-platform-graph.mjs (Problem A). Every
// serviceSummaries value, layerDescriptions value, concept name/summary and
// tour step title/description goes through this before being written —
// never invented, never silently blanked: a missing stat path leaves a
// visible `[stat missing: <path>]` marker so it can't pass unnoticed.
const stats = graph.metadata?.stats ?? {};
const missingStats = [];
const sub = (text) => substitute(text, stats, missingStats);

/* ---------- 1. service summaries ---------- */

let servicesUpdated = 0;
for (const [id, rawSummary] of Object.entries(enrich.serviceSummaries ?? {})) {
  const node = nodeById.get(id);
  if (!node) {
    drop(id);
    continue;
  }
  const summary = sub(rawSummary);
  node.metadata = { ...node.metadata, semanticClaim: {
    status: 'unbound', generatedAt: enrich.meta?.generatedAt ?? null,
    priorSummary: summary, runtimeVerified: false,
    reason: 'Historical narrative has no claim-level source binding; not applied as current summary',
  } };
  servicesUpdated += 1;
}

/* ---------- 2. layer descriptions ---------- */

let layersUpdated = 0;
const layers = Array.isArray(graph.layers) ? graph.layers : [];
for (const [name, rawDescription] of Object.entries(enrich.layerDescriptions ?? {})) {
  const layer = layers.find((l) => l.name === name);
  if (!layer) {
    drop(`layer:${name}`);
    continue;
  }
  const description = sub(rawDescription);
  if (layer.description !== description) {
    layer.description = `[Dated orientation; source review required] ${description}`;
  }
  layersUpdated += 1;
}

/* ---------- 3. concept nodes + related edges ---------- */

const edgeKey = (e) => `${e.source}\0${e.target}\0${e.type}`;
const existingEdges = new Set(graph.edges.map(edgeKey));

let conceptsAdded = 0;
let edgesAdded = 0;

for (const concept of enrich.concepts ?? []) {
  if (!concept?.id) continue;
  if (!nodeById.has(concept.id)) {
    const node = {
      id: concept.id,
      type: 'concept',
      name: sub(concept.name ?? concept.id),
      complexity: 'moderate',
      summary: `Historical orientation (${enrich.meta?.generatedAt ?? 'undated'}); source review required.`,
      metadata: { semanticClaim: {status:'unbound', generatedAt:enrich.meta?.generatedAt ?? null, priorSummary:sub(concept.summary ?? ''), runtimeVerified:false} },
      tags: Array.isArray(concept.tags) ? [...concept.tags] : [],
    };
    graph.nodes.push(node);
    nodeById.set(node.id, node);
    conceptsAdded += 1;
  }

  for (const target of concept.related ?? []) {
    if (!nodeById.has(target)) {
      drop(target);
      continue;
    }
    const edge = {
      source: concept.id,
      target,
      type: 'related',
      direction: 'forward',
      weight: 0.7,
    };
    const key = edgeKey(edge);
    if (existingEdges.has(key)) continue;
    graph.edges.push(edge);
    existingEdges.add(key);
    edgesAdded += 1;
  }
}

/* ---------- 4. tour ---------- */

const tour = [];
for (const step of enrich.tour ?? []) {
  const nodeIds = [];
  for (const id of step?.nodeIds ?? []) {
    if (nodeById.has(id)) nodeIds.push(id);
    else drop(id);
  }
  if (nodeIds.length === 0) continue;
  tour.push({
    order: tour.length + 1,
    title: sub(step.title ?? ''),
    description: `[Dated orientation; source review required] ${sub(step.description ?? '')}`,
    nodeIds,
  });
}
graph.tour = tour;

/* ---------- 5. narrative stamp ---------- */

if (!graph.metadata || typeof graph.metadata !== 'object') graph.metadata = {};
if (enrich.meta) graph.metadata.narrative = { ...enrich.meta, status: 'unbound', runtimeVerified: false };
const coverage = relationCoverage(graph.edges);
for (const [type, item] of Object.entries(coverage)) {
  const previous = graph.relationCoverage?.[type];
  if (previous) Object.assign(item, {unresolved: previous.unresolved, unsupported: previous.unsupported, status: previous.status});
}
graph.relationCoverage = coverage;

/* ---------- write + report ---------- */

writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`);

process.stdout.write(
  `${JSON.stringify(
    {
      servicesUpdated,
      layersUpdated,
      conceptsAdded,
      edgesAdded,
      tourSteps: tour.length,
      droppedRefs,
      missingStats: [...new Set(missingStats)],
    },
    null,
    2,
  )}\n`,
);
