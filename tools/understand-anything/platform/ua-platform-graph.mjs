#!/usr/bin/env node
// ORISO-Platform cross-service knowledge graph builder.
// Zero npm dependencies — Node 22 builtins only (fs, path, child_process, url).
//
// Usage:
//   node ua-platform-graph.mjs --graphs-dir <dir> --repos-dir <dir> --out <dir>
//
// See README.md for the full contract.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
	normalizePath,
	pathsEqual,
	resolveRepoForCall,
	matchEndpoint,
	ownEndpointCoversPath,
	parseEndpointName
} from './lib/matcher.mjs';
import { parseAuthority, authorityRelations } from './lib/authority.mjs';
import { bindSourceRevisions, readSource, listSourceFiles } from './lib/source-reader.mjs';
import { projectSemanticFlows, relationCoverage } from './lib/semantic-projection.mjs';
import { createHash } from 'node:crypto';
import { classifyFilePath, specBasename } from './lib/classify.mjs';
import {
	parseFrontendEndpoints,
	parseFrontendCallerFile,
	parseAdminEndpointConstants,
	parseAdminCallerFile,
	parseAdminInlineUrlHelpers,
	resolveIndirectUrlValue,
	parseHelmDeploymentName,
	isSpringControllerSource,
	parseSpringControllerFile
} from './lib/parseSources.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
	const args = { graphsDir: null, reposDir: null, out: null, strict: false, maxUnmatched: MAX_UNMATCHED_FRACTION };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--graphs-dir') args.graphsDir = argv[++i];
		else if (a === '--repos-dir') args.reposDir = argv[++i];
		else if (a === '--out') args.out = argv[++i];
		else if (a === '--strict') args.strict = true;
		else if (a === '--max-unmatched') args.maxUnmatched = Number(argv[++i]);
	}
	if (!args.graphsDir || !args.reposDir || !args.out || Number.isNaN(args.maxUnmatched)) {
		console.error(
			'Usage: node ua-platform-graph.mjs --graphs-dir <dir> --repos-dir <dir> --out <dir> ' +
				'[--strict] [--max-unmatched <fraction, default 0.2>]'
		);
		process.exit(2);
	}
	return args;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The 17 ORISO repos (ORISO-Kubernetes excluded per spec — deprecated).
const ALL_REPOS = [
	'ORISO-Admin',
	'ORISO-AgencyService',
	'ORISO-ConsultingTypeService',
	'ORISO-Database',
	'ORISO-Docs',
	'ORISO-E2E',
	'ORISO-ElementCall',
	'ORISO-Frontend',
	'ORISO-HealthDashboard',
	'ORISO-Helm',
	'ORISO-Infra',
	'ORISO-Keycloak',
	'ORISO-Livekit',
	'ORISO-SigNoz',
	'ORISO-Status',
	'ORISO-TenantService',
	'ORISO-UserService'
];

// Repos we pull a full per-repo UA graph for (endpoints/functions/tables).
const GRAPH_REPOS = [
	'ORISO-Frontend',
	'ORISO-Admin',
	'ORISO-UserService',
	'ORISO-AgencyService',
	'ORISO-TenantService',
	'ORISO-ConsultingTypeService',
	'ORISO-Keycloak',
	'ORISO-Database',
	'ORISO-Helm'
];

const BACKEND_ENDPOINT_REPOS = [
	'ORISO-UserService',
	'ORISO-AgencyService',
	'ORISO-TenantService',
	'ORISO-ConsultingTypeService',
	'ORISO-Keycloak'
];

// Repos whose Java sources we scan for @RestController/@Controller Spring
// MVC endpoint annotations, to fill the gap left by OpenAPI-yaml-only
// endpoint nodes (see README "Known limits" / lib/parseSources.mjs).
// ORISO-Keycloak is excluded: it's not one of our Spring codebases.
const SPRING_ANNOTATION_REPOS = [
	'ORISO-UserService',
	'ORISO-AgencyService',
	'ORISO-TenantService',
	'ORISO-ConsultingTypeService'
];

// Helm chart directory name -> owning repo (for `deploys` edges).
const HELM_CHART_TO_REPO = {
	admin: 'ORISO-Admin',
	agencyservice: 'ORISO-AgencyService',
	consultingtypeservice: 'ORISO-ConsultingTypeService',
	frontend: 'ORISO-Frontend',
	tenantservice: 'ORISO-TenantService',
	userservice: 'ORISO-UserService',
	keycloak: 'ORISO-Keycloak',
	'element-call': 'ORISO-ElementCall',
	livekit: 'ORISO-Livekit',
	'health-dashboard': 'ORISO-HealthDashboard'
	// matrix / media-scanner deployments exist in Helm but have no matching
	// repo in ALL_REPOS (they ship as part of ORISO-Helm / ORISO-Infra) —
	// intentionally left unmapped; see README "Known limits".
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SUMMARY_LEN = 200;
const MAX_UNMATCHED_FRACTION = 0.2;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function readJson(file) {
	return JSON.parse(readFileSync(file, 'utf8'));
}

function truncate(s, n = MAX_SUMMARY_LEN) {
	if (typeof s !== 'string') return s;
	return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** git show origin/<branch>:<path>, trying `dev` then `pre-dev`. Returns null if neither has it. */
const gitShow = readSource;
const gitLsTree = listSourceFiles;

function walkFiles(dir, exts) {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) out.push(...walkFiles(full, exts));
		else if (exts.some((e) => entry.endsWith(e))) out.push(full);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Step A: load per-repo UA graphs + meta
// ---------------------------------------------------------------------------

function loadGraphs(graphsDir) {
	const graphs = {};
	const sources = [];
	for (const repo of ALL_REPOS) {
		const graphFile = path.join(graphsDir, repo, '.understand-anything', 'knowledge-graph.json');
		const metaFile = path.join(graphsDir, repo, '.understand-anything', 'meta.json');
		if (!existsSync(graphFile)) {
			console.warn(`[warn] missing graph for ${repo}: ${graphFile}`);
			continue;
		}
		const graph = readJson(graphFile);
		let meta = {};
		if (existsSync(metaFile)) meta = readJson(metaFile);
		graphs[repo] = { graph, meta };
		sources.push({ repo, gitCommitHash: meta.gitCommitHash || graph.project?.gitCommitHash || null });
	}
	return { graphs, sources };
}

// ---------------------------------------------------------------------------
// Step B: backend endpoint index (per repo)
// ---------------------------------------------------------------------------

/**
 * Split every backend repo's raw OpenAPI-yaml endpoint nodes into "own"
 * (this repo's own routes — filePath has an "api" segment) and "consumed"
 * (a sibling-service OpenAPI spec bundled for a generated client — filePath
 * has a "services" segment). See lib/classify.mjs for the exact rule and
 * why it is NOT "basename matches this repo's name".
 *
 * Also builds `ownSpecOwner`: spec-basename -> owning repo, from every
 * repo's OWN endpoints only. This is how a consumed endpoint's owning repo
 * is resolved in resolveConsumedEndpoints() below — dynamically, from what
 * the graphs actually contain, not a hand-maintained table (though it does
 * end up agreeing with the userservice/agencyservice/tenantservice/
 * consultingtypeservice/keycloak names called out in the task).
 */
function buildBackendIndex(graphs) {
	const ownByRepo = {}; // repo -> [{method, path, rawName, node}]
	const consumedByRepo = {}; // repo -> [{method, path, rawName, filePath, origNode, basename}]
	const ownSpecOwner = new Map(); // basename -> candidate owning repo (first repo seen owning that basename)
	const ownSpecEndpoints = new Map(); // basename -> Map(repo -> [{method, path}]) — the repo's OWN endpoints FROM THAT SPEC FILE ONLY, used for the owner-overlap check below (never all of the repo's own endpoints)
	let openapiOwnCount = 0;
	let openapiConsumedCount = 0;

	for (const repo of BACKEND_ENDPOINT_REPOS) {
		const entry = graphs[repo];
		ownByRepo[repo] = [];
		consumedByRepo[repo] = [];
		if (!entry) continue;
		for (const node of entry.graph.nodes) {
			if (node.type !== 'endpoint') continue;
			const { method, path: normPath } = parseEndpointName(node.name);
			const cls = classifyFilePath(node.filePath);
			const basename = specBasename(node.filePath);
			if (cls === 'own' || cls === 'unknown') {
				const prefixedId = `${repo}::${node.id}`;
				const prefixedNode = toPlatformNode(node, repo, prefixedId);
				prefixedNode.metadata = { ...(prefixedNode.metadata || {}), source: 'openapi-own' };
				ownByRepo[repo].push({ method, path: normPath, rawName: node.name, node: prefixedNode });
				if (!ownSpecOwner.has(basename)) ownSpecOwner.set(basename, repo);
				if (!ownSpecEndpoints.has(basename)) ownSpecEndpoints.set(basename, new Map());
				const perRepo = ownSpecEndpoints.get(basename);
				if (!perRepo.has(repo)) perRepo.set(repo, []);
				perRepo.get(repo).push({ method, path: normPath });
				openapiOwnCount++;
			} else {
				consumedByRepo[repo].push({ method, path: normPath, rawName: node.name, filePath: node.filePath, origNode: node, basename });
				openapiConsumedCount++;
			}
		}
	}
	return { ownByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints, openapiOwnCount, openapiConsumedCount };
}

/** Wildcard-aware METHOD+path equality between an own endpoint entry and a consumed-spec entry (both already normalized). */
function methodPathOverlap(a, b) {
	return (a.method || '').toUpperCase() === (b.method || '').toUpperCase() && pathsEqual(a.path, b.path);
}

/**
 * Owner-overlap check (Problem 3 fix): a candidate owner repo (found purely
 * by spec-BASENAME match in `ownSpecOwner`) is only accepted as the real
 * owner of a consumed spec if that repo's OWN endpoints FROM THE SAME-NAMED
 * SPEC FILE overlap the consumed endpoints by >= 50% (wildcard-aware
 * METHOD+path) — measured as the fraction of the OWNER's own endpoints (from
 * that spec) that appear somewhere in the UNIONED consumed set for that
 * basename (every consumer that bundles a same-named spec, not just one).
 * The union — not a per-consumer ratio — matters: a legitimate consumer that
 * happens to bundle only the undocumented (drift) slice of a real shared
 * spec would otherwise score a false near-0% overlap on its own, even though
 * the spec genuinely is the owner's; pooling every consumer's copy of that
 * basename before measuring fixes that (see
 * `test/builder-classification.test.mjs`'s two-consumers-same-drift case).
 *
 * Basename alone is not enough — confirmed real-repo collision:
 * ORISO-UserService bundles its own `api/appointmentservice.yaml` (a real,
 * unrelated contract, 7 own endpoints under `/appointments/*`) AND consumes
 * `services/appointmentService.yaml` (the retired Cal.com contract, 23
 * endpoints under `/consultants/*`, no repo in this graph owns it). Both
 * basenames collapse to "appointmentservice" after `specBasename`'s
 * lowercasing, so the old basename-only lookup attributed every one of those
 * Cal.com-spec endpoints to ORISO-UserService as "owner" — with UserService
 * as BOTH consumer and (wrongly) owner, producing 40 false spec-drift rows
 * AND a UserService->UserService `depends_on` self-loop (weight 23). The
 * real own/consumed path sets are completely disjoint (0 of the 7 own
 * `/appointments/*` endpoints appear anywhere in the 23-entry
 * `/consultants/*` consumed set), so the overlap ratio here is 0/7 = 0% —
 * correctly below the 50% bar. Below that bar, the group is treated as
 * `consumed-external` instead (kept attributed to the consumer,
 * `metadata.external: true`, no owner, no drift rows, and — since here the
 * consumer and the wrongly-guessed owner are the SAME repo — no self-edge
 * ever gets a chance to form).
 * @param {string} basename
 * @param {{method?: string, path: string}[]} unionConsumedEntries every
 *   consumer's consumed entries for this basename, pooled together (dedup by
 *   method+path is not required — `methodPathOverlap` is an existence check)
 * @returns {string|null} the confirmed owner repo, or null if the overlap
 *   bar isn't cleared (treat as external)
 */
function resolveOwnerWithOverlap(basename, unionConsumedEntries, ownSpecOwner, ownSpecEndpoints) {
	const candidate = ownSpecOwner.get(basename);
	if (!candidate) return null;
	const ownEndpointsForSpec = (ownSpecEndpoints.get(basename) || new Map()).get(candidate) || [];
	if (ownEndpointsForSpec.length === 0) return null;
	const matchedOwnCount = ownEndpointsForSpec.filter((ep) => unionConsumedEntries.some((c) => methodPathOverlap(ep, c))).length;
	return matchedOwnCount / ownEndpointsForSpec.length >= 0.5 ? candidate : null;
}

/**
 * Resolve every consumed endpoint (per consumer repo) against the graph:
 *  - owner in graph + owner already exposes the same METHOD+path (wildcard-
 *    equal, via lib/matcher.mjs matchEndpoint): DROP the duplicate node,
 *    record a `consumes` reference straight to the owner's own endpoint
 *    node. No new node, no spec drift.
 *  - owner in graph but has NO such own endpoint: this is genuine contract
 *    drift. One node is kept, attributed to the OWNER repo (not the
 *    consumer), tagged metadata.source = 'consumed-spec-only', deduped by
 *    (ownerRepo, method, path) so multiple consumers bundling the same
 *    undocumented endpoint collapse onto one node. Every raw consumer
 *    reference is still recorded (for spec-drift.md and the consumes edge).
 *  - owner not in this graph at all (appointmentservice, mailservice,
 *    conversationservice, statisticsservice, …): external contract. Node
 *    stays attributed to the CONSUMING repo, tagged metadata.external =
 *    true, one node per consumer (not deduped across consumers).
 *
 * @returns {{
 *   driftNodesByRepo: Record<string, Array>,   // ownerRepo -> own+drift-attributed endpoint entries (for call-matching)
 *   externalByRepo: Record<string, Array>,     // consumerRepo -> external endpoint entries
 *   consumesRefs: Array<{consumerRepo, targetNode, ownerRepo: string|null, kind: 'duplicate'|'drift'|'external'}>,
 *   specDriftRows: Array<{consumer, specFile, endpoint, owner}>
 * }}
 */
function resolveConsumedEndpoints(consumedByRepo, ownByRepo, ownSpecOwner, ownSpecEndpoints) {
	const driftNodesByRepo = {}; // ownerRepo -> [{method,path,rawName,node}] (own-attributed drift nodes only)
	const driftNodeByKey = new Map(); // "ownerRepo|METHOD|path" -> entry (dedup across consumers)
	const externalByRepo = {};
	const consumesRefs = [];
	const specDriftRows = [];

	for (const repo of BACKEND_ENDPOINT_REPOS) driftNodesByRepo[repo] = [];

	// The owner-overlap decision (Problem 3 fix) is made ONCE PER BASENAME,
	// pooling every consumer's copy of that spec together — not once per
	// (consumer, basename) pair — see resolveOwnerWithOverlap's doc comment
	// for why a per-consumer ratio would misfire on a consumer that only
	// bundles the undocumented (drift) slice of a genuinely shared spec.
	const unionConsumedByBasename = new Map(); // basename -> [{method,path}, ...] across ALL consumers
	for (const consumerRepo of BACKEND_ENDPOINT_REPOS) {
		for (const c of consumedByRepo[consumerRepo] || []) {
			if (!unionConsumedByBasename.has(c.basename)) unionConsumedByBasename.set(c.basename, []);
			unionConsumedByBasename.get(c.basename).push({ method: c.method, path: c.path });
		}
	}
	const ownerDecisionByBasename = new Map(); // basename -> ownerRepo | null
	for (const basename of unionConsumedByBasename.keys()) {
		ownerDecisionByBasename.set(
			basename,
			resolveOwnerWithOverlap(basename, unionConsumedByBasename.get(basename), ownSpecOwner, ownSpecEndpoints)
		);
	}

	for (const consumerRepo of BACKEND_ENDPOINT_REPOS) {
		// Group by basename so every endpoint in one consumer's copy of a spec
		// shares that spec's one already-decided owner verdict.
		const groups = new Map(); // basename -> entries[]
		for (const c of consumedByRepo[consumerRepo] || []) {
			if (!groups.has(c.basename)) groups.set(c.basename, []);
			groups.get(c.basename).push(c);
		}

		for (const [basename, entries] of groups) {
			const ownerRepo = ownerDecisionByBasename.get(basename) || null;

			for (const c of entries) {
				if (!ownerRepo) {
					// external contract — either no repo in this graph owns a spec
					// with this basename at all, or a same-named spec exists but
					// failed the >= 50% overlap bar (basename-collision case, e.g.
					// ORISO-UserService's own api/appointmentservice.yaml vs. the
					// retired Cal.com services/appointmentService.yaml consumed
					// spec — same basename, unrelated contracts).
					const id = `${consumerRepo}::endpoint:consumed-external:${c.basename}:${c.rawName}`;
					const node = toPlatformNode(c.origNode, consumerRepo, id);
					node.metadata = { ...(node.metadata || {}), external: true, specName: c.basename };
					(externalByRepo[consumerRepo] || (externalByRepo[consumerRepo] = [])).push({ method: c.method, path: c.path, rawName: c.rawName, node });
					consumesRefs.push({ consumerRepo, targetNode: node, ownerRepo: null, kind: 'external' });
					continue;
				}
				if (ownerRepo === consumerRepo) {
					// Defensive: a repo cannot legitimately "consume" its own spec —
					// forbid the self-edge outright rather than emitting a
					// consumerRepo->consumerRepo depends_on/consumes edge. Should
					// never actually trigger given classifyFilePath already splits
					// own ("api/...") from consumed ("services/...") per file, but
					// this is the last line of defense the tests assert against.
					console.warn(`[ua-platform-graph] WARNING: dropping a would-be self-consumes edge (${consumerRepo} -> itself) for spec "${basename}" — this should not happen and indicates an own/consumed classification bug.`);
					continue;
				}
				const match = matchEndpoint({ path: c.path, method: c.method }, ownByRepo[ownerRepo] || []);
				if (match) {
					consumesRefs.push({ consumerRepo, targetNode: match.node, ownerRepo, kind: 'duplicate' });
					continue;
				}
				const driftKey = `${ownerRepo}|${c.method || ''}|${c.path}`;
				let driftEntry = driftNodeByKey.get(driftKey);
				if (!driftEntry) {
					const id = `${ownerRepo}::endpoint:consumed-spec-only:${c.basename}:${c.rawName}`;
					const node = toPlatformNode(c.origNode, ownerRepo, id);
					node.metadata = { ...(node.metadata || {}), source: 'consumed-spec-only', specName: c.basename };
					driftEntry = { method: c.method, path: c.path, rawName: c.rawName, node };
					driftNodeByKey.set(driftKey, driftEntry);
					driftNodesByRepo[ownerRepo].push(driftEntry);
				}
				consumesRefs.push({ consumerRepo, targetNode: driftEntry.node, ownerRepo, kind: 'drift' });
				specDriftRows.push({ consumer: consumerRepo, specFile: c.filePath, endpoint: c.rawName, owner: ownerRepo });
			}
		}
	}

	return { driftNodesByRepo, externalByRepo, consumesRefs, specDriftRows };
}

// ---------------------------------------------------------------------------
// Step B.2: Spring-annotation endpoint candidates (fills OpenAPI-yaml gaps)
// ---------------------------------------------------------------------------

/** List + read every `@RestController`/`@Controller` Java file for one repo, return raw candidates. */
function loadSpringControllerEndpoints(reposDir, repo) {
	const repoDir = path.join(reposDir, repo);
	const files = gitLsTree(repoDir).filter(
		(f) => f.startsWith('src/main/java/') && f.endsWith('.java')
	);
	const candidates = [];
	let controllersScanned = 0;
	for (const file of files) {
		const src = gitShow(repoDir, file);
		if (!src || !isSpringControllerSource(src)) continue;
		controllersScanned++;
		candidates.push(...parseSpringControllerFile(src, file));
	}
	return { candidates, controllersScanned };
}

/**
 * Merge Spring-annotation endpoint candidates into the OpenAPI-derived
 * backend index: an existing `endpoint` node with the same method + EXACT
 * literal path (`matchQuality: 'exact'` — full literal or param-to-param
 * match, never a wildcard-vs-literal collapse) is annotated with
 * `metadata.sources` instead of duplicated; a candidate with no such exact
 * OpenAPI match becomes a brand-new `endpoint` node (id
 * `<Repo>::endpoint:spring:<Class>#<method>:<M> <path>`) and is appended to
 * `backendByRepo[repo]` so it participates in frontend/admin call matching
 * exactly like a YAML-derived endpoint.
 *
 * Exact-only is deliberate and load-bearing, not merely stricter-for-safety:
 * this ran with wildcard matching allowed until a real-repo bug was found —
 * `EventNotificationController`'s bare `@GetMapping`/`@DeleteMapping` on
 * `/users/event-notifications` (2 segments, same shape as the already-known
 * OpenAPI `GET /users/{username}`) wildcard-"matched" that unrelated
 * `{username}` endpoint and was silently swallowed as a "duplicate" —
 * meaning the real `/users/event-notifications` node was NEVER CREATED at
 * all, and every Frontend caller that should have hit it instead
 * wildcard-matched `/users/{username}` at call-matching time (the graph's
 * own `matchEndpoint` correctly reports that as `matchQuality: 'wildcard'`,
 * but there was no exact node left for it to prefer). `disqualified()` in
 * `lib/matcher.mjs` can't save this case: at merge time the real sibling
 * endpoint (with a literal at that exact segment position) doesn't exist in
 * `list` YET — it's the very node being incorrectly suppressed — so the
 * literal-sibling-disqualification check has nothing to compare against.
 * Requiring `matchQuality === 'exact'` here removes the false "already
 * documented" verdict at the source instead of trying to patch it after the
 * fact.
 * @returns {{new: number, duplicate: number}} per-repo stats, keyed by repo
 */
function mergeSpringEndpoints(backendByRepo, reposDir) {
	const stats = {};
	for (const repo of SPRING_ANNOTATION_REPOS) {
		const { candidates, controllersScanned } = loadSpringControllerEndpoints(reposDir, repo);
		const list = backendByRepo[repo] || (backendByRepo[repo] = []);
		let added = 0;
		let duplicate = 0;
		for (const c of candidates) {
			const existing = matchEndpoint({ path: c.path, method: c.method }, list);
			if (existing && existing.matchQuality === 'exact') {
				const sources = new Set(existing.node.metadata?.sources || ['openapi']);
				sources.add('spring-annotation');
				existing.node.metadata = { ...(existing.node.metadata || {}), sources: [...sources] };
				duplicate++;
				continue;
			}
			const methodLabel = c.method || 'ANY';
			const name = `${methodLabel} ${c.path}`;
			const id = `${repo}::endpoint:spring:${c.className}#${c.methodName}:${name}`;
			const node = {
				id,
				type: 'endpoint',
				name,
				filePath: c.file,
				summary: truncate(`Endpoint: ${name} (from Spring controller ${c.className})`),
				tags: ['spring-annotation'],
				sourceRepo: repo,
				metadata: { source: 'spring-annotation', line: c.line, methodName: c.methodName }
			};
			list.push({ method: c.method, path: normalizePath(c.path), rawName: name, node });
			added++;
		}
		stats[repo] = { new: added, duplicate, controllersScanned, candidatesFound: candidates.length };
	}
	return stats;
}

function toPlatformNode(node, repo, id) {
	const out = {
		...node,
		id,
		type: node.type,
		name: node.name,
		filePath: node.filePath,
		summary: truncate(node.summary),
		tags: node.tags || [],
		sourceRepo: repo
	};
	return out;
}

// ---------------------------------------------------------------------------
// Step C: Frontend endpoint map + callers
// ---------------------------------------------------------------------------

function loadFrontendEndpointMap(reposDir) {
	const repoDir = path.join(reposDir, 'ORISO-Frontend');
	const src = gitShow(repoDir, 'src/resources/scripts/endpoints.ts');
	if (!src) return { entries: [], unparsed: [] };
	return parseFrontendEndpoints(src);
}

// Source files to scan for endpoint callers: ALL of src/**/*.ts and
// src/**/*.tsx (not just src/api/**), excluding test files — endpoints.<key>
// usages live in components/hooks too (see README "Known limits": e.g.
// registerAsker, matrixAccessToken are called from src/components/**).
function isScannableSourceFile(f) {
	if (!f.startsWith('src/')) return false;
	if (!/\.tsx?$/.test(f)) return false;
	if (/\.(test|spec)\.tsx?$/.test(f)) return false;
	if (f.endsWith('.d.ts')) return false;
	return true;
}

/**
 * Attribute a parsed caller to the most specific node that actually exists
 * in the per-repo UA graph: the enclosing exported function
 * (`function:<path>:<name>`) if the graph has that node, else the file node
 * (`file:<path>`) as a coarser fallback — never a node that doesn't exist
 * (matchCalls skips callers whose target doesn't exist at all). Returns
 * `{ targetId, granularity: 'function'|'file'|null, existsInGraph }`.
 */
function resolveCallerTarget(file, fnName, functionNodeIds, fileNodeIds) {
	const functionId = `function:${file}:${fnName}`;
	if (functionNodeIds.has(functionId)) {
		return { targetId: functionId, granularity: 'function', existsInGraph: true };
	}
	const fileId = `file:${file}`;
	if (fileNodeIds.has(fileId)) {
		return { targetId: fileId, granularity: 'file', existsInGraph: true };
	}
	return { targetId: functionId, granularity: 'function', existsInGraph: false };
}

function loadFrontendCallers(reposDir, frontendGraph) {
	const repoDir = path.join(reposDir, 'ORISO-Frontend');
	const files = gitLsTree(repoDir).filter(isScannableSourceFile);
	const graphNodes = frontendGraph?.graph.nodes || [];
	const functionNodeIds = new Set(graphNodes.filter((n) => n.type === 'function').map((n) => n.id));
	const fileNodeIds = new Set(graphNodes.filter((n) => n.type === 'file').map((n) => n.id));
	const callers = []; // {file, fnName, functionId, granularity, existsInGraph, endpointKeys, method}
	for (const file of files) {
		const src = gitShow(repoDir, file);
		if (!src) continue;
		for (const { fnName, endpointKeys, method } of parseFrontendCallerFile(src)) {
			const { targetId, granularity, existsInGraph } = resolveCallerTarget(file, fnName, functionNodeIds, fileNodeIds);
			callers.push({ file, fnName, functionId: targetId, granularity, existsInGraph, endpointKeys, method });
		}
	}
	return callers;
}

// ---------------------------------------------------------------------------
// Step D: Admin endpoint constants + callers
// ---------------------------------------------------------------------------

function loadAdminEndpointConstants(reposDir) {
	const repoDir = path.join(reposDir, 'ORISO-Admin');
	const src = gitShow(repoDir, 'src/appConfig.ts');
	if (!src) return { entries: [], unparsed: [] };
	return parseAdminEndpointConstants(src);
}

function loadAdminCallers(reposDir, adminGraph, adminMapEntries) {
	const repoDir = path.join(reposDir, 'ORISO-Admin');
	const files = gitLsTree(repoDir).filter(isScannableSourceFile);
	const graphNodes = adminGraph?.graph.nodes || [];
	const functionNodeIds = new Set(graphNodes.filter((n) => n.type === 'function').map((n) => n.id));
	const fileNodeIds = new Set(graphNodes.filter((n) => n.type === 'file').map((n) => n.id));
	// appConfig.ts-level entries, used as a one-hop fallback so a file-local
	// helper referencing another appConfig constant (rather than a raw
	// origin variable directly) still resolves — see
	// lib/parseSources.mjs `resolveIndirectUrlValue`.
	const adminByKey = new Map((adminMapEntries || []).map((e) => [e.key, e]));
	const callers = [];
	// File-local URL-builder helpers (e.g. `const onboardingUrl = (t) =>
	// \`${userServiceURL}/service/.../${t}\`;`) never reach appConfig.ts, so
	// they're parsed per-file here and injected as file-qualified endpoint-map
	// entries — keyed by file path so two files defining a same-named local
	// helper (e.g. two different `onboardingUrl`s) never collide. Chains
	// through another local helper (not just an appConfig entry) are now
	// resolved too — see parseAdminInlineUrlHelpers's fixed-point iteration.
	const inlineEntries = [];
	for (const file of files) {
		const src = gitShow(repoDir, file);
		if (!src) continue;
		const localHelpers = parseAdminInlineUrlHelpers(src, adminByKey);
		const localMap = new Map(localHelpers.map((h) => [h.name, h]));
		for (const { fnName, urlIdentifier, urlExpr, inline, method } of parseAdminCallerFile(src)) {
			const { targetId, granularity, existsInGraph } = resolveCallerTarget(file, fnName, functionNodeIds, fileNodeIds);
			let resolvedKey = urlIdentifier;
			if (urlIdentifier && localMap.has(urlIdentifier)) {
				const h = localMap.get(urlIdentifier);
				resolvedKey = `${file}::${urlIdentifier}`;
				inlineEntries.push({ key: resolvedKey, originVar: h.originVar, path: h.path });
			} else if (inline) {
				// url: `${<originVar>}/service/literal/path` written directly in
				// the caller, no appConfig constant or local helper standing in
				// for it — synthesize a file+function-qualified entry so it can
				// still be matched (see parseAdminCallerFile's `inline` case).
				resolvedKey = `${file}::inline:${fnName}`;
				inlineEntries.push({ key: resolvedKey, originVar: inline.originVar, path: inline.path });
			} else if (urlIdentifier && adminByKey.has(urlIdentifier)) {
				// The caller references an appConfig constant directly, but the
				// `url:` expression may append its OWN literal suffix after that
				// constant's interpolation (`` `${tenantAdminEndpoint}/${id}/
				// permission-policies` ``) — the plain identifier alone only
				// carries the constant's OWN path (e.g. `/tenantadmin`), silently
				// dropping the suffix and false-matching the base resource
				// instead of the real one (real case: `getTenantPermissionPolicies`
				// resolved to `GET /tenantadmin` instead of
				// `GET /tenantadmin/{id}/permission-policies`; same shape for
				// `deleteAgencyAdminData` and `getConsultingType4Tenant`).
				// `resolveIndirectUrlValue` is the same one-hop splice already
				// used for file-local helpers — reused here on the RAW caller
				// expression, not just helper declarations.
				const spliced = resolveIndirectUrlValue(urlExpr, adminByKey);
				if (spliced && spliced.path !== adminByKey.get(urlIdentifier).path) {
					resolvedKey = `${file}::suffix:${fnName}`;
					inlineEntries.push({ key: resolvedKey, originVar: spliced.originVar, path: spliced.path });
				}
			}
			callers.push({ file, fnName, functionId: targetId, granularity, existsInGraph, urlIdentifier: resolvedKey, method });
		}
	}
	return { callers, inlineEntries };
}

// ---------------------------------------------------------------------------
// Step E: matching — frontend & admin calls -> backend endpoints
// ---------------------------------------------------------------------------

// Some frontend/admin paths carry an extra "gateway" path segment right
// after /service/<origin> that the backend's own OpenAPI spec does not
// document (the ingress/ambassador mapping strips it before it reaches the
// controller). Observed case: ORISO-AgencyService's appointment-booking
// routes are called as /service/appointservice/... but the OpenAPI paths
// are plain /consultants/{id}/meetingSlug, /askers/{id}/bookings, etc.
// This is a real, narrow gateway-rewrite fact, not a general escape hatch —
// keep it a short, explicit table rather than a blanket "strip one more
// segment and hope" fallback.
const EXTRA_GATEWAY_PREFIX_STRIP = {
	'ORISO-AgencyService': ['/appointservice']
};

function stripExtraGatewayPrefix(repo, normalizedPath) {
	for (const prefix of EXTRA_GATEWAY_PREFIX_STRIP[repo] || []) {
		if (normalizedPath === prefix) return '/';
		if (normalizedPath.startsWith(prefix + '/')) return normalizedPath.slice(prefix.length);
	}
	return null;
}

// Pre-fix (permissive) path-wildcard equality — "{}" matches ANY single
// segment on either side, with no literal-sibling disqualification. Used
// only for the coverage.md "wildcard matches downgraded/removed" count: an
// unmatched call that WOULD have wildcard-matched under this old rule, but
// is correctly rejected by the new lib/matcher.mjs wildcard-precision logic
// (see fix A / fetchAgencyConsultantList), is counted as a downgrade.
function oldPermissiveWildcardEquals(a, b) {
	const as = a.split('/').filter((s) => s.length > 0 || a === '/');
	const bs = b.split('/').filter((s) => s.length > 0 || b === '/');
	if (as.length !== bs.length) return false;
	for (let i = 0; i < as.length; i++) {
		if (as[i] === '{}' || bs[i] === '{}') continue;
		if (as[i] !== bs[i]) return false;
	}
	return true;
}

function matchCalls({ endpointMapEntries, callers, backendByRepo, sourceLabel, keyOf, resolveMethodAndKeys }) {
	const matches = []; // {functionId, endpointNode, methodConfidence, matchQuality, sourceRepo, targetRepo}
	const unmatched = []; // {key, path, originVar, reason}
	const matchedKeys = new Set();
	let wildcardDowngrades = 0;

	const endpointByKey = new Map(endpointMapEntries.map((e) => [keyOf(e), e]));

	for (const caller of callers) {
		if (!caller.existsInGraph) continue; // can't emit an edge from a node that doesn't exist
		const { keys, method } = resolveMethodAndKeys(caller);
		for (const key of keys) {
			const mapEntry = endpointByKey.get(key);
			if (!mapEntry) {
				unmatched.push({ key, path: null, originVar: null, reason: `no endpoint-map entry found for key "${key}"` });
				continue;
			}
			const repo = resolveRepoForCall({ originVar: mapEntry.originVar, path: mapEntry.path });
			if (!repo || !backendByRepo[repo]) {
				unmatched.push({
					key,
					path: mapEntry.path,
					originVar: mapEntry.originVar,
					reason: repo
						? `resolved repo "${repo}" has no backend endpoint graph loaded`
						: `could not resolve owning repo (origin "${mapEntry.originVar}", path "${mapEntry.path}")`
				});
				continue;
			}
			let result = matchEndpoint({ path: mapEntry.path, method }, backendByRepo[repo]);
			if (!result) {
				const stripped = stripExtraGatewayPrefix(repo, normalizePath(mapEntry.path));
				if (stripped !== null) {
					result = matchEndpoint({ path: stripped, method }, backendByRepo[repo]);
				}
			}
			if (!result) {
				const normPath = normalizePath(mapEntry.path);
				const wouldHaveMatchedOldly = backendByRepo[repo].some((ep) => oldPermissiveWildcardEquals(normPath, ep.path));
				if (wouldHaveMatchedOldly) wildcardDowngrades++;
				unmatched.push({
					key,
					path: mapEntry.path,
					originVar: mapEntry.originVar,
					method,
					reason: `no backend endpoint in ${repo} matches path "${normPath}"${method ? ` with method ${method}` : ''}`,
					wildcardDowngrade: wouldHaveMatchedOldly
				});
				continue;
			}
			matchedKeys.add(key);
			matches.push({
				functionId: caller.functionId,
				endpointNode: result.node,
				methodConfidence: result.methodConfidence,
				matchQuality: result.matchQuality,
				sourceRepo: sourceLabel,
				targetRepo: repo
			});
		}
	}

	return { matches, unmatched, matchedKeys, wildcardDowngrades };
}

// ---------------------------------------------------------------------------
// Step F: ADRs + fumadocs -> document nodes, governs/documents edges
// ---------------------------------------------------------------------------

const SERVICE_NAME_ALIASES = {
	'ORISO-UserService': ['userservice', 'user service'],
	'ORISO-AgencyService': ['agencyservice', 'agency service'],
	'ORISO-TenantService': ['tenantservice', 'tenant service'],
	'ORISO-ConsultingTypeService': ['consultingtypeservice', 'consulting type service', 'consultingtype'],
	'ORISO-Keycloak': ['keycloak'],
	'ORISO-Frontend': ['frontend', 'app layer'],
	'ORISO-Admin': ['admin panel', 'adminpanel', 'admin-panel'],
	'ORISO-ElementCall': ['element call', 'elementcall'],
	'ORISO-Livekit': ['livekit'],
	'ORISO-Helm': ['helm chart', 'helm-chart']
};

function findMentionedRepos(text) {
	const lower = text.toLowerCase();
	const found = new Set();
	for (const [repo, aliases] of Object.entries(SERVICE_NAME_ALIASES)) {
		for (const alias of aliases) {
			if (lower.includes(alias)) {
				found.add(repo);
				break;
			}
		}
	}
	return [...found];
}

function escapeRegExp(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Stricter mention rule for `documents` edges (fumadocs pages only — ADR
 * authority uses explicit lifecycle/scope instead; findMentionedRepos only
 * supplies discovery hints). A passing mention of a
 * service name buried once in a long page's prose is not "this page
 * documents that service" — require either a strong signal (the service
 * name appears in the page's title, YAML frontmatter, or first `#` heading)
 * or a body count of >= 2 occurrences.
 * @returns {string[]} repos this page passes the bar for
 */
function findMentionedReposForPage(content, title) {
	const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
	const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
	const firstHeadingMatch = /^#\s+(.+)$/m.exec(content);
	const firstHeading = firstHeadingMatch ? firstHeadingMatch[1] : '';
	const strongText = `${title}\n${frontmatter}\n${firstHeading}`.toLowerCase();
	const lowerContent = content.toLowerCase();

	const found = [];
	for (const [repo, aliases] of Object.entries(SERVICE_NAME_ALIASES)) {
		let count = 0;
		let strong = false;
		for (const alias of aliases) {
			if (strongText.includes(alias)) strong = true;
			const re = new RegExp(escapeRegExp(alias), 'g');
			const matches = lowerContent.match(re);
			count += matches ? matches.length : 0;
		}
		if (strong || count >= 2) found.push(repo);
	}
	return found;
}

function loadAdrDocuments(reposDir) {
	const docs = []; // {id, title, filePath, sourceRepo, adrNumber, mentionedRepos}
	const drift = []; // {number, occurrences: [{sourceRepo, filePath, title}]}
	const byNumber = new Map();

	function addAdr(sourceRepo, filePath, content) {
		const numMatch = /ADR[-_]?(?:SECURITY-)?0*(\d+)/i.exec(path.basename(filePath));
		const number = numMatch ? numMatch[1] : null;
		const titleLine = /^#\s+(.+)$/m.exec(content);
		const title = titleLine ? titleLine[1].trim() : path.basename(filePath);
		const id = `document:adr:${sourceRepo}:${filePath}`;
		const mentionedRepos = findMentionedRepos(content).filter((r) => r !== sourceRepo);
		docs.push({
			id,
			name: title,
			filePath,
			sourceRepo,
			summary: truncate(`ADR: ${title}`),
			mentionedRepos,
			authority: parseAuthority(content, ALL_REPOS),
			sourceFingerprint: createHash("sha256").update(content).digest("hex"),
			lineRange: [1, content.split("\n").length]
		});
		if (number) {
			if (!byNumber.has(number)) byNumber.set(number, []);
			byNumber.get(number).push({ sourceRepo, filePath, title });
		}
	}

	// 1) ORISO-Docs canonical ADRs (local working tree — already checked out, not switched for this task)
	const docsRepo = path.join(reposDir, 'ORISO-Docs');
	for (const file of gitLsTree(docsRepo).filter(f => /^oriso-platform\/decisions\/ADR-\d+.*\.md$/i.test(f))) {
		const content=gitShow(docsRepo,file);
		if(content) addAdr('ORISO-Docs',file,content);
	}

	// 2) code-adjacent ADRs
	for (const [repo, matcher_] of [
		['ORISO-Frontend', (f) => /adr-\d+/i.test(f) && f.endsWith('.md')],
		['ORISO-UserService', (f) => /adr[-_]security/i.test(f) && f.endsWith('.md')]
	]) {
		const repoDir = path.join(reposDir, repo);
		const files = gitLsTree(repoDir).filter(matcher_);
		for (const f of files) {
			const content = gitShow(repoDir, f);
			if (content) addAdr(repo, f, content);
		}
	}

	// number-drift report: same ADR number, different repos, different titles
	for (const [number, occurrences] of byNumber) {
		if (occurrences.length < 2) continue;
		const titles = new Set(occurrences.map((o) => o.title.toLowerCase()));
		if (titles.size > 1) drift.push({ number, occurrences });
	}

	return { docs, drift };
}

function loadFumadocsPages(reposDir) {
 const repoDir = path.join(reposDir, 'ORISO-Docs');
 const pages = [];
 for (const rel of gitLsTree(repoDir).filter(f => /^site\/content\/docs\/(plattform|produkt|betrieb)\/.*\.mdx$/.test(f))) {
  const content = gitShow(repoDir, rel); if (!content) continue;
  const titleMatch = /title:\s*(.+)/.exec(content) || /^#\s+(.+)$/m.exec(content);
  const title = titleMatch ? titleMatch[1].trim().replace(/^['"]|['"]$/g, '') : path.basename(rel);
  pages.push({id:`document:fumadocs:${rel}`,name:title,filePath:rel,sourceRepo:'ORISO-Docs',
   summary:truncate(`Docs page: ${title}`),mentionedRepos:findMentionedReposForPage(content,title),
   mentionedReposLoose:findMentionedRepos(content)});
 }
 return pages;
}

// ---------------------------------------------------------------------------
// Step G: Helm deploys edges
// ---------------------------------------------------------------------------

function loadHelmDeploys(reposDir) {
	const repoDir = path.join(reposDir, 'ORISO-Helm');
	const files = gitLsTree(repoDir).filter(
		(f) => f.startsWith('templates/') && (f.endsWith('.yaml') || f.endsWith('.yml'))
	);
	const deploys = []; // {chartDir, deploymentName, targetRepo}
	for (const f of files) {
		const parts = f.split('/');
		if (parts.length < 2) continue;
		const chartDir = parts[1];
		const targetRepo = HELM_CHART_TO_REPO[chartDir];
		if (!targetRepo) continue;
		const content = gitShow(repoDir, f);
		if (!content) continue;
		const name = parseHelmDeploymentName(content);
		if (name) deploys.push({ chartDir, filePath: f, deploymentName: name, targetRepo });
	}
	return deploys;
}

// ---------------------------------------------------------------------------
// Step H: tables -> owns edges
// ---------------------------------------------------------------------------

function collectTables(graphs) {
	const tables = []; // {node (prefixed), sourceRepo}
	for (const repo of ['ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-ConsultingTypeService', 'ORISO-Database']) {
		const entry = graphs[repo];
		if (!entry) continue;
		for (const node of entry.graph.nodes) {
			if (node.type !== 'table') continue;
			const id = `${repo}::${node.id}`;
			tables.push({ node: toPlatformNode(node, repo, id), sourceRepo: repo });
		}
	}
	return tables;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const args = parseArgs(process.argv.slice(2));
	mkdirSync(args.out, { recursive: true });
	mkdirSync(path.join(args.out, 'reports'), { recursive: true });

	console.log(`[ua-platform-graph] loading per-repo graphs from ${args.graphsDir}`);
	const { graphs, sources } = loadGraphs(args.graphsDir);
	bindSourceRevisions(sources);

	console.log('[ua-platform-graph] indexing backend endpoints (OpenAPI yaml): own vs consumed');
	const { ownByRepo: backendByRepo, consumedByRepo, ownSpecOwner, ownSpecEndpoints, openapiOwnCount, openapiConsumedCount } = buildBackendIndex(graphs);
	const openapiEndpointCount = openapiOwnCount;

	console.log('[ua-platform-graph] scanning Spring @RestController annotations');
	const springStats = mergeSpringEndpoints(backendByRepo, args.reposDir);
	for (const [repo, s] of Object.entries(springStats)) {
		console.log(
			`[ua-platform-graph]   ${repo}: ${s.controllersScanned} controllers, ${s.candidatesFound} Spring endpoint candidates -> ${s.new} new, ${s.duplicate} already in OpenAPI yaml`
		);
	}
	// backendByRepo now holds OWN endpoints only (openapi-own + spring-annotation
	// new nodes) — this is what `exposes` edges, uncalled-endpoints.md and the
	// "own endpoints with >=1 caller" stat are built from.
	const totalOwnEndpoints = Object.values(backendByRepo).reduce((n, l) => n + l.length, 0);

	console.log('[ua-platform-graph] resolving consumed endpoints (duplicate / drift / external)');
	const { driftNodesByRepo, externalByRepo, consumesRefs, specDriftRows } = resolveConsumedEndpoints(
		consumedByRepo,
		backendByRepo,
		ownSpecOwner,
		ownSpecEndpoints
	);
	// callMatchByRepo = own + drift-attributed endpoints, used ONLY for
	// frontend/admin call matching (a drift node is a real route the owner
	// serves, just undocumented in its own OpenAPI yaml — a caller can still
	// legitimately reach it). Reports/exposes/uncalled stay own-only.
	const callMatchByRepo = {};
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		callMatchByRepo[repo] = [...(backendByRepo[repo] || []), ...(driftNodesByRepo[repo] || [])];
	}
	const totalEndpoints = totalOwnEndpoints; // kept for existing log line below

	console.log('[ua-platform-graph] parsing frontend endpoint map + callers');
	const feMap = loadFrontendEndpointMap(args.reposDir);
	const feCallers = loadFrontendCallers(args.reposDir, graphs['ORISO-Frontend']);

	console.log('[ua-platform-graph] parsing admin endpoint constants + callers');
	const adminMap = loadAdminEndpointConstants(args.reposDir);
	const { callers: adminCallers, inlineEntries: adminInlineEntries } = loadAdminCallers(
		args.reposDir,
		graphs['ORISO-Admin'],
		adminMap.entries
	);
	adminMap.entries = [...adminMap.entries, ...adminInlineEntries];

	const feResult = matchCalls({
		endpointMapEntries: feMap.entries,
		callers: feCallers,
		backendByRepo: callMatchByRepo,
		sourceLabel: 'ORISO-Frontend',
		keyOf: (e) => e.key,
		resolveMethodAndKeys: (caller) => ({ keys: caller.endpointKeys, method: caller.method })
	});

	const adminResult = matchCalls({
		endpointMapEntries: adminMap.entries,
		callers: adminCallers,
		backendByRepo: callMatchByRepo,
		sourceLabel: 'ORISO-Admin',
		keyOf: (e) => e.key,
		resolveMethodAndKeys: (caller) => ({ keys: [caller.urlIdentifier], method: caller.method })
	});

	console.log('[ua-platform-graph] loading ADRs + fumadocs pages');
	const { docs: adrDocs, drift } = loadAdrDocuments(args.reposDir);
	const fumaDocs = loadFumadocsPages(args.reposDir);

	console.log('[ua-platform-graph] loading Helm deploys');
	const helmDeploys = loadHelmDeploys(args.reposDir);

	console.log('[ua-platform-graph] collecting tables');
	const tables = collectTables(graphs);

	// -------------------------------------------------------------------
	// Assemble nodes
	// -------------------------------------------------------------------

	const nodes = [];
	const nodeIds = new Set();
	function addNode(n) {
		if (nodeIds.has(n.id)) return;
		const normalized = { ...n };
		if (normalized.filePath == null) delete normalized.filePath;
		if (normalized.complexity == null) {
			normalized.complexity = 'moderate';
			normalized.metadata = { ...normalized.metadata, complexitySource: 'display-default' };
		}
		nodeIds.add(normalized.id);
		nodes.push(normalized);
	}

	// service nodes (one per repo — NOT the Dockerfile-stage "service" nodes
	// found inside per-repo graphs, which are dropped per spec).
	for (const repo of ALL_REPOS) {
		addNode({
			id: `service:${repo}`,
			type: 'service',
			name: repo,
			filePath: null,
			summary: `ORISO platform service: ${repo}`,
			tags: ['service'],
			sourceRepo: repo
		});
	}

	// endpoints (all backend endpoints, matched or not — coverage matters for the report)
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		for (const entry of backendByRepo[repo] || []) addNode(entry.node);
	}
	// consumed-spec-only (drift) endpoints — attributed to the OWNER repo,
	// deduped across consumers already by resolveConsumedEndpoints().
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		for (const entry of driftNodesByRepo[repo] || []) addNode(entry.node);
	}
	// external-contract endpoints — attributed to the CONSUMING repo, one
	// node per consumer (never deduped across consumers).
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		for (const entry of externalByRepo[repo] || []) addNode(entry.node);
	}

	// function nodes are added below, in the edges section, only for callers
	// that actually produced a `calls` match (addCallsFor) — tag source repo
	// up front so that lookup is unambiguous there.
	for (const c of feCallers) c.sourceRepo = 'ORISO-Frontend';
	for (const c of adminCallers) c.sourceRepo = 'ORISO-Admin';

	// tables
	for (const t of tables) addNode(t.node);

	// documents: ADRs + fumadocs
	for (const d of adrDocs) {
		addNode({
			id: d.id,
			type: 'document',
			name: d.name,
			filePath: d.filePath,
			summary: d.summary,
			tags: ['adr'],
			lineRange: d.lineRange,
			metadata: { authority: d.authority, sourceFingerprint: d.sourceFingerprint, sourceCommit: sources.find(s => s.repo === d.sourceRepo)?.gitCommitHash, evidenceKind: 'source-declared', runtimeVerified: false },
			sourceRepo: d.sourceRepo
		});
	}
	for (const d of fumaDocs) {
		addNode({
			id: d.id,
			type: 'document',
			name: d.name,
			filePath: d.filePath,
			summary: d.summary,
			tags: ['fumadocs']
		});
	}

	// -------------------------------------------------------------------
	// Assemble edges
	// -------------------------------------------------------------------

	const edges = [];
	const edgeKey = new Set();
	function addEdge(e) {
		const k = `${e.type}|${e.source}|${e.target}`;
		if (edgeKey.has(k)) return;
		edgeKey.add(k);
		edges.push(e);
	}

	// exposes: service -> endpoint. Own endpoints ONLY — consumed sibling
	// specs (whether they collapsed into a duplicate, surfaced as spec
	// drift, or are external contracts) never get an `exposes` edge; see
	// `consumes` below.
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		for (const entry of backendByRepo[repo] || []) {
			addEdge({ source: `service:${repo}`, target: entry.node.id, type: 'exposes', direction: 'directed', weight: 1 });
		}
	}

	// consumes: service (consumer) -> endpoint (owner's own node, a drift
	// node attributed to the owner, or an external-contract node attributed
	// to the consumer itself). metadata.evidence documents how the graph
	// knows about the relationship.
	const consumesAgg = new Map(); // "consumerRepo->ownerRepo" -> raw reference count (internal only)
	for (const ref of consumesRefs) {
		addEdge({
			source: `service:${ref.consumerRepo}`,
			target: ref.targetNode.id,
			type: 'consumes',
			direction: 'directed',
			weight: 1,
			metadata: { evidence: 'bundled-openapi-spec', kind: ref.kind, ...(ref.ownerRepo ? { ownerRepo: ref.ownerRepo } : {}) }
		});
		if (ref.kind !== 'external') {
			const aggKey = `${ref.consumerRepo}->${ref.ownerRepo}`;
			consumesAgg.set(aggKey, (consumesAgg.get(aggKey) || 0) + 1);
		}
	}

	// calls: function -> endpoint (re-add proper function nodes with correct ids this time).
	// Precision fix (Problem 1, part 1): a match is only trustworthy enough to
	// be counted as a real, confirmed call — feeding depends_on weight,
	// coverage.md's "endpoints with a caller" stat, and uncalled-endpoints.md —
	// when BOTH the HTTP method is known and matched exactly AND the path
	// matched a full literal (or param-to-param) segment, i.e.
	// `methodConfidence === 'exact' && matchQuality === 'exact'`. A real
	// 20-edge review sample (seed 42) measured only 45% precision on the
	// unfiltered set: `path-only` edges (method unknown, so ANY endpoint
	// sharing the path can "win" regardless of verb — 1/10 correct in that
	// sample) and `wildcard` edges (a call-side literal segment lined up
	// against a backend `{param}` — every one of the 20 such edges in the
	// full graph collapsed onto `GET /users/{username}`, none of them
	// actually calling it) are demoted to `type: 'calls_unconfirmed'` here —
	// same metadata, same node, NEVER silently dropped, but excluded from
	// every "this endpoint has a real caller" signal below (`callsAgg`,
	// `calledEndpointIdsForStats` in the stats section, and
	// `writeUncalledReport`'s `allMatches` input, which now only receives
	// confirmed matches — see the `addCallsFor` call sites below).
	const callsAgg = new Map(); // "srcRepo->tgtRepo" -> count, CONFIRMED calls only
	const confirmedMatches = []; // matches with type==='calls', across both sources — fed to writeUncalledReport/stats
	function addCallsFor(matches, callerList) {
		for (const m of matches) {
			const caller = callerList.find((c) => c.functionId === m.functionId);
			if (!caller) continue;
			const fnNodeId = `${caller.sourceRepo}::${caller.functionId}`;
			const confirmed = m.methodConfidence === 'exact' && m.matchQuality === 'exact';
			if (caller.granularity === 'file') {
				addNode({
					id: fnNodeId,
					type: 'file',
					name: path.basename(caller.file),
					filePath: caller.file,
					summary: `API-caller file ${caller.file} (caller "${caller.fnName}" has no matching function node in the per-repo graph, attributed at file granularity)`,
					tags: ['api-caller', 'file-level'],
					sourceRepo: caller.sourceRepo
				});
			} else {
				addNode({
					id: fnNodeId,
					type: 'function',
					name: caller.fnName,
					filePath: caller.file,
					summary: `API caller ${caller.fnName}() in ${caller.file}`,
					tags: ['api-caller'],
					sourceRepo: caller.sourceRepo
				});
			}
			addEdge({
				source: fnNodeId,
				target: m.endpointNode.id,
				type: confirmed ? 'calls' : 'calls_unconfirmed',
				direction: 'directed',
				weight: 1,
				label: m.endpointNode.name,
				metadata: {
					methodConfidence: m.methodConfidence,
					matchQuality: m.matchQuality,
					callerGranularity: caller.granularity || 'function'
				}
			});
			if (confirmed) {
				const aggKey = `${m.sourceRepo}->${m.targetRepo}`;
				callsAgg.set(aggKey, (callsAgg.get(aggKey) || 0) + 1);
				confirmedMatches.push(m);
			}
		}
	}
	addCallsFor(feResult.matches, feCallers);
	addCallsFor(adminResult.matches, adminCallers);

	// depends_on: service -> service, aggregated from calls edges AND from
	// internal `consumes` references (a repo that bundles another service's
	// OpenAPI spec depends on it just as much as one that calls it at
	// runtime — often more directly, since it's a build-time contract). Both
	// kinds are folded into one weight per (src, tgt) pair; metadata.evidence
	// lists which kind(s) contributed.
	const dependsOnKeys = new Set([...callsAgg.keys(), ...consumesAgg.keys()]);
	for (const key of dependsOnKeys) {
		const [src, tgt] = key.split('->');
		// Forbid self-edges: a service cannot legitimately depend_on itself.
		// Should already be unreachable (calls are cross-repo by construction,
		// and resolveConsumedEndpoints drops a would-be self-consumes ref
		// itself), but this is the assertable last line of defense — see
		// test/builder-classification.test.mjs "no self-loops" case.
		if (src === tgt) {
			console.warn(`[ua-platform-graph] WARNING: dropping a would-be depends_on self-loop (${src} -> itself).`);
			continue;
		}
		const callsWeight = callsAgg.get(key) || 0;
		const consumesWeight = consumesAgg.get(key) || 0;
		const evidence = [];
		if (callsWeight > 0) evidence.push('calls');
		if (consumesWeight > 0) evidence.push('consumes');
		addEdge({
			source: `service:${src}`,
			target: `service:${tgt}`,
			type: 'depends_on',
			direction: 'directed',
			weight: 1, // confirmed presence; raw evidence counts remain separate from normalized display weight
			metadata: { evidence, callsWeight, consumesWeight, evidenceCount: callsWeight + consumesWeight }
		});
	}

	// owns: service -> table
	for (const t of tables) {
		addEdge({ source: `service:${t.sourceRepo}`, target: t.node.id, type: 'owns', direction: 'directed', weight: 1 });
	}

	// Authority requires explicit lifecycle, owner, scope and resolved supersession.
	for (const edge of authorityRelations(adrDocs)) addEdge(edge);
	projectSemanticFlows(graphs, addNode, addEdge);

	// documents: fumadocs page -> service. Only page-level document nodes
	// (filePath ends .md/.mdx — true today of every fumaDocs entry, checked
	// explicitly here as a guard against ever wiring a heading-level node in
	// the future) get `documents` edges, and only for services that pass
	// findMentionedReposForPage's stricter bar (see loadFumadocsPages).
	for (const d of fumaDocs) {
		if (!/\.mdx?$/.test(d.filePath || '')) continue;
		for (const repo of d.mentionedRepos) {
			addEdge({ source: d.id, target: `service:${repo}`, type: 'documents', direction: 'directed', weight: 1 });
		}
	}

	// deploys: Helm -> service
	for (const dep of helmDeploys) {
		addEdge({
			source: 'service:ORISO-Helm',
			target: `service:${dep.targetRepo}`,
			type: 'deploys',
			direction: 'directed',
			weight: 1,
			label: dep.deploymentName
		});
	}

	// -------------------------------------------------------------------
	// Layers
	// -------------------------------------------------------------------

	const layers = [
		{ id: 'services', name: 'Services', description: 'The 17 ORISO platform repos as deployable services.', nodeIds: nodes.filter((n) => n.type === 'service').map((n) => n.id) },
		{ id: 'api-endpoints', name: 'API Endpoints', description: 'Backend REST endpoints across UserService, AgencyService, TenantService, ConsultingTypeService, Keycloak.', nodeIds: nodes.filter((n) => n.type === 'endpoint').map((n) => n.id) },
		{ id: 'frontend-callers', name: 'Frontend Callers', description: 'ORISO-Frontend functions/files (anywhere in src/**) that call backend endpoints.', nodeIds: nodes.filter((n) => (n.type === 'function' || n.type === 'file') && n.tags?.includes('api-caller') && n.sourceRepo === 'ORISO-Frontend').map((n) => n.id) },
		{ id: 'admin-callers', name: 'Admin Callers', description: 'ORISO-Admin functions/files (anywhere in src/**) that call backend endpoints.', nodeIds: nodes.filter((n) => (n.type === 'function' || n.type === 'file') && n.tags?.includes('api-caller') && n.sourceRepo === 'ORISO-Admin').map((n) => n.id) },
		{ id: 'data', name: 'Data', description: 'Database tables owned by each backend service.', nodeIds: nodes.filter((n) => n.type === 'table').map((n) => n.id) },
		{ id: 'decisions-docs', name: 'Decisions & Docs', description: 'ADRs and Fumadocs developer-documentation pages.', nodeIds: nodes.filter((n) => n.type === 'document').map((n) => n.id) }
	];

	// -------------------------------------------------------------------
	// Assemble graph
	// -------------------------------------------------------------------

	// -------------------------------------------------------------------
	// Reports that stats needs the numbers from — computed before the graph
	// is written so graph.metadata.stats.deadCalls/specDrift are the SAME
	// numbers the reports show (never re-derived by parsing markdown).
	// -------------------------------------------------------------------

	mkdirSync(path.join(args.out, 'reports'), { recursive: true });
	const unmatchedCounts = writeUnmatchedReport(args.out, feResult.unmatched, adminResult.unmatched, feMap, adminMap);
	// CONFIRMED calls only — an unconfirmed (calls_unconfirmed) match never
	// counts toward "this endpoint has a caller" (see the addCallsFor doc
	// comment above for why).
	writeUncalledReport(args.out, backendByRepo, confirmedMatches);
	writeAdrDriftReport(args.out, drift);
	const deadCalls = writeDeadCallsReport(args.out, args.reposDir, unmatchedCounts.feClassified, unmatchedCounts.adminClassified, backendByRepo);
	writeSpecDriftReport(args.out, specDriftRows);

	// -------------------------------------------------------------------
	// graph.metadata.stats — the single source of numbers the narrative
	// layer's {{stats.<path>}} placeholders substitute from (see
	// narrative/apply-platform-enrich.mjs).
	// -------------------------------------------------------------------

	const calledEndpointIdsForStats = new Set(confirmedMatches.map((m) => m.endpointNode.id));
	const callsEdges = edges.filter((e) => e.type === 'calls');
	const consumesEdges = edges.filter((e) => e.type === 'consumes');
	const dependsOnEdges = edges.filter((e) => e.type === 'depends_on');
	const governsEdgesForStats = edges.filter((e) => e.type === 'governs');
	const documentsEdgesForStats = edges.filter((e) => e.type === 'documents');

	function ownUncalledFor(repo) {
		return (backendByRepo[repo] || []).filter((e) => !calledEndpointIdsForStats.has(e.node.id)).length;
	}

	const statsServices = {};
	for (const repo of ALL_REPOS) {
		const ownEndpoints = (backendByRepo[repo] || []).length;
		const consumedRaw = (consumedByRepo[repo] || []).length - (externalByRepo[repo] || []).length;
		const callsIn = callsEdges.filter((e) => e.target.startsWith(`${repo}::`)).length;
		const callsOut = callsEdges.filter((e) => e.source.startsWith(`${repo}::`)).length;
		const tablesOwned = tables.filter((t) => t.sourceRepo === repo).length;
		statsServices[repo] = {
			endpointsOwn: ownEndpoints,
			endpointsConsumed: consumedRaw,
			endpointsOwnUncalled: BACKEND_ENDPOINT_REPOS.includes(repo) ? ownUncalledFor(repo) : 0,
			callsIn,
			callsOut,
			tables: tablesOwned
		};
	}

	const callsUnconfirmedEdges = edges.filter((e) => e.type === 'calls_unconfirmed');

	const stats = {
        frontendCallers: layers.find(l => l.id === "frontend-callers").nodeIds.length,
        adminCallers: layers.find(l => l.id === "admin-callers").nodeIds.length,
        tables: tables.length,
        mentions: edges.filter(e => e.type === "mentions").length,
		endpointsTotal: nodes.filter((n) => n.type === 'endpoint').length,
		endpointsOwn: totalOwnEndpoints,
		endpointsConsumed: openapiConsumedCount - Object.values(externalByRepo).reduce((n, l) => n + l.length, 0),
		endpointsExternal: Object.values(externalByRepo).reduce((n, l) => n + l.length, 0),
		endpointsOwnUncalled: BACKEND_ENDPOINT_REPOS.reduce((n, repo) => n + ownUncalledFor(repo), 0),
		// callsTotal is CONFIRMED calls only (methodConfidence==='exact' &&
		// matchQuality==='exact') — see the addCallsFor doc comment. Every
		// weaker match still exists as a `calls_unconfirmed` edge, counted
		// separately in `callsUnconfirmed` and NEVER folded into callsTotal,
		// depends_on weight, or "endpoints with a caller".
		callsTotal: callsEdges.length,
		callsUnconfirmed: callsUnconfirmedEdges.length,
		// callsWildcard/callsPathOnly now describe the calls_unconfirmed
		// population (by construction, every remaining `calls` edge has
		// matchQuality==='exact' && methodConfidence==='exact', so these would
		// always read 0 against callsEdges after the precision fix).
		callsWildcard: callsUnconfirmedEdges.filter((e) => e.metadata?.matchQuality === 'wildcard').length,
		callsPathOnly: callsUnconfirmedEdges.filter((e) => e.metadata?.methodConfidence === 'path-only').length,
		deadCalls: deadCalls.total,
		specDrift: specDriftRows.length,
		governs: governsEdgesForStats.length,
		documents: documentsEdgesForStats.length,
		consumes: consumesEdges.length,
		dependsOn: dependsOnEdges.length,
		services: statsServices
	};

	const relationStats = relationCoverage(edges);
	relationStats.calls.unresolved = feResult.unmatched.length + adminResult.unmatched.length + edges.filter(e => e.type === 'calls_unconfirmed').length;
	relationStats.calls.status = relationStats.calls.unresolved ? 'partial' : 'complete';
	let graph = {
		version: '1.0.0',
		schemaVersion: 'oriso.ua.graph/v1',
		kind: 'oriso-platform',
		nodes,
		edges: edges.map(e => ({ ...e, direction: e.direction === 'directed' ? 'forward' : e.direction })),
		relationCoverage: relationStats,
		layers,
		tour: [], // TODO(tour): filled by a later LLM pass — see docs/TOUR-TODO.md
		project: {
			name: 'ORISO-Platform',
			languages: ['typescript', 'java', 'yaml', 'markdown'],
			frameworks: [],
			description:
				'Slim, high-signal cross-service knowledge graph layered on top of the per-repo Understand-Anything graphs: frontend/admin API callers -> backend endpoints, service -> table ownership, ADR/doc governance, and Helm deploys.',
			analyzedAt: new Date().toISOString(),
			gitCommitHash: null,
			sourceCommits: Object.fromEntries(sources.map(s => [s.repo, s.gitCommitHash]))
		},
		metadata: {
			sources: sources.map((s) => ({ repo: s.repo, gitCommitHash: s.gitCommitHash })),
			stats
		}
	};

	// -------------------------------------------------------------------
	// Size cap: truncate progressively until under MAX_BYTES
	// -------------------------------------------------------------------

	function sizeOf(g) {
		return Buffer.byteLength(JSON.stringify(g), 'utf8');
	}

	let bytes = sizeOf(graph);
	// Required schema fields and source ranges are never removed to meet the size cap.

	if (bytes > MAX_BYTES) {
		console.warn(`[ua-platform-graph] still ${bytes} bytes, truncating summaries to 100 chars`);
		for (const n of graph.nodes) n.summary = truncate(n.summary, 100);
		bytes = sizeOf(graph);
	}
	if (bytes > MAX_BYTES) {
		console.error(
			`[ua-platform-graph] FAILED: knowledge-graph.json is ${bytes} bytes, exceeding the ${MAX_BYTES}-byte (5 MB) hard cap even after truncation.`
		);
		process.exit(1);
	}

	writeFileSync(path.join(args.out, 'knowledge-graph.json'), JSON.stringify(graph, null, 2));

	// -------------------------------------------------------------------
	// Remaining reports (unmatchedCounts/deadCalls were already computed
	// above, before graph assembly, so stats.deadCalls/specDrift match them)
	// -------------------------------------------------------------------

	const governsCount = edges.filter((e) => e.type === 'governs').length;
	const documentsCount = edges.filter((e) => e.type === 'documents').length;
	const documentsLooseCount = fumaDocs.reduce((n, d) => n + d.mentionedReposLoose.length, 0);
	const callsFunctionLevel = edges.filter((e) => e.type === 'calls' && e.metadata?.callerGranularity === 'function').length;
	const callsFileLevel = edges.filter((e) => e.type === 'calls' && e.metadata?.callerGranularity === 'file').length;

	const coverage = writeCoverageReport(args.out, {
		feMap,
		adminMap,
		feResult,
		adminResult,
		totalEndpoints,
		openapiEndpointCount,
		springStats,
		unmatchedCounts,
		bytes,
		governsCount,
		documentsCount,
		documentsLooseCount,
		callsFunctionLevel,
		callsFileLevel,
		deadCalls,
		wildcardDowngrades: feResult.wildcardDowngrades + adminResult.wildcardDowngrades,
		stats,
		externalByRepo,
		specDriftRows,
		confirmedMatches
	});

	console.log(`[ua-platform-graph] wrote ${path.join(args.out, 'knowledge-graph.json')} (${bytes} bytes)`);
	console.log(
		`[ua-platform-graph] nodes=${nodes.length} edges=${edges.length} endpoints=${totalEndpoints} coverage=${coverage.feMatchedPct}% (frontend)`
	);

	console.log(`\n[ua-platform-graph] first 20 "calls" edges (source -> target, matchQuality):`);
	for (const e of edges.filter((x) => x.type === 'calls').slice(0, 20)) {
		console.log(`  ${e.source} -> ${e.target}  [matchQuality=${e.metadata?.matchQuality}, methodConfidence=${e.metadata?.methodConfidence}, callerGranularity=${e.metadata?.callerGranularity}]`);
	}

	// -------------------------------------------------------------------
	// Exit-code gate: >20% of frontend endpoint-map keys unmatched
	// -------------------------------------------------------------------

	const feKeyTotal = feMap.entries.length;
	const feKeyUnmatchedCount = feKeyTotal - feResult.matchedKeys.size;
	// unmatched here counts keys that were referenced by a caller and failed
	// to match a backend endpoint OR were never referenced by any caller at
	// all (dead map entries) — both count against coverage.
	const referencedKeys = new Set(feCallers.flatMap((c) => c.endpointKeys));
	const unusedMapKeys = feMap.entries.filter((e) => !referencedKeys.has(e.key)).length;
	if (unusedMapKeys > 0) {
		console.log(
			`[ua-platform-graph] note: ${unusedMapKeys} frontend endpoint-map key(s) are never referenced by any src/** caller (dead map entries; counted against the unmatched-fraction gate below).`
		);
	}
	const trueUnmatchedFraction = feKeyTotal > 0 ? (feKeyUnmatchedCount) / feKeyTotal : 0;

	if (trueUnmatchedFraction > args.maxUnmatched) {
		const pct = (trueUnmatchedFraction * 100).toFixed(1);
		const thresholdPct = (args.maxUnmatched * 100).toFixed(1);
		const header = args.strict
			? `[ua-platform-graph] FAILED (--strict): ${feKeyUnmatchedCount}/${feKeyTotal} (${pct}%) of frontend endpoint-map keys are unmatched (> ${thresholdPct}% threshold).`
			: `[ua-platform-graph] WARNING: ${feKeyUnmatchedCount}/${feKeyTotal} (${pct}%) of frontend endpoint-map keys are unmatched (> ${thresholdPct}% threshold). Re-run with --strict to make this exit non-zero. See ${path.join(args.out, 'reports', 'unmatched-frontend-calls.md')} for the classified list.`;
		console.error(`\n${header}`);
		console.error('Unmatched keys:');
		for (const e of feMap.entries) {
			if (!feResult.matchedKeys.has(e.key)) console.error(`  - ${e.key} (${e.originVar} ${e.path})`);
		}
		if (args.strict) process.exit(1);
	}

	console.log('[ua-platform-graph] done.');
}

// ---------------------------------------------------------------------------
// Unmatched-call classification
// ---------------------------------------------------------------------------
//
// - external:          resolves to Keycloak's own protocol endpoints (never
//                       modelled as a `endpoint` node — Keycloak is a 3rd
//                       party app, not one of our Spring codebases) or to
//                       budibase (external no-code tool, `apiUrl` proxy).
// - proxy-unresolved:  built from the generic `apiUrl`/proxy origin, whose
//                       real backend repo can only be guessed from a
//                       path-prefix table — no prefix in that table matched.
// - parse-failure:     `feMap.unparsed`/`adminMap.unparsed` entries — our
//                       regex/bracket-depth scanner couldn't extract a path
//                       literal or origin variable from the source at all.
// - no-such-endpoint:  a real originVar + real path we resolved to a repo,
//                       but no `endpoint` node (OpenAPI yaml OR Spring
//                       annotation) in that repo's graph matches it.
function classifyUnmatched(entry, unparsedKeys) {
	if (unparsedKeys.has(entry.key)) return 'parse-failure';
	const reason = entry.reason || '';
	// "no endpoint-map entry found" means we never even produced a path for
	// this identifier — could be a genuinely dead/unused key, but just as
	// often (verified case by case in the report) it's an expression shape
	// our regex/bracket-depth scanner can't follow (e.g. a `switch`-bodied
	// arrow function) rather than proof the backend lacks the route.
	if (/^no endpoint-map entry found/.test(reason)) return 'parse-failure';
	if (entry.originVar === 'keycloakOrigin' || /keycloak|protocol\/openid-connect|login-actions/.test(entry.path || '')) {
		return 'external';
	}
	if (/budibase|counselingtoolsservice/.test(entry.path || '') || entry.originVar === 'apiUrl') {
		if (/could not resolve owning repo/.test(reason)) return 'proxy-unresolved';
		return 'external';
	}
	if (/could not resolve owning repo/.test(reason) || /has no backend endpoint graph loaded/.test(reason)) {
		return 'proxy-unresolved';
	}
	return 'no-such-endpoint';
}

function writeUnmatchedReport(outDir, feUnmatched, adminUnmatched, feMap, adminMap) {
	const feUnparsedKeys = new Set(feMap.unparsed.map((u) => u.key));
	const adminUnparsedKeys = new Set(adminMap.unparsed.map((u) => u.key));

	const feClassified = feUnmatched.map((u) => ({ ...u, classification: classifyUnmatched(u, feUnparsedKeys) }));
	const adminClassified = adminUnmatched.map((u) => ({ ...u, classification: classifyUnmatched(u, adminUnparsedKeys) }));

	function countBy(list) {
		const counts = { 'no-such-endpoint': 0, 'proxy-unresolved': 0, 'parse-failure': 0, external: 0 };
		for (const u of list) counts[u.classification] = (counts[u.classification] || 0) + 1;
		return counts;
	}

	const lines = [
		'# Unmatched Frontend/Admin Calls',
		'',
		'## Classification legend',
		'',
		'- `no-such-endpoint` — real origin + path, resolved to a repo, but that',
		'  repo has no `endpoint` node (OpenAPI yaml or Spring annotation) that',
		'  matches — a genuine backend documentation/implementation gap, or the',
		'  route truly does not exist yet.',
		'- `proxy-unresolved` — built from the generic `apiUrl` proxy origin and',
		'  the path-prefix fallback table (`PATH_PREFIX_TO_REPO` in',
		'  lib/matcher.mjs) has no entry for it, so the owning repo could not be',
		'  guessed.',
		'- `parse-failure` — our regex/bracket-depth scanner (lib/parseSources.mjs)',
		'  could not extract a path literal or a known origin variable from the',
		'  source at all.',
		'- `external` — resolves to Keycloak\'s own endpoints or a third-party',
		'  tool (budibase) that is intentionally outside this graph\'s scope.',
		''
	];

	lines.push('## ORISO-Frontend', '');
	const feCounts = countBy(feClassified);
	lines.push(
		`Counts: no-such-endpoint=${feCounts['no-such-endpoint']}, proxy-unresolved=${feCounts['proxy-unresolved']}, parse-failure=${feCounts['parse-failure']}, external=${feCounts.external}`,
		''
	);
	if (feClassified.length === 0) lines.push('_none_');
	for (const u of feClassified) lines.push(`- \`${u.key}\`${u.path ? ` (\`${u.path}\`)` : ''} **[${u.classification}]**: ${u.reason}`);

	lines.push('', '## ORISO-Admin', '');
	const adminCounts = countBy(adminClassified);
	lines.push(
		`Counts: no-such-endpoint=${adminCounts['no-such-endpoint']}, proxy-unresolved=${adminCounts['proxy-unresolved']}, parse-failure=${adminCounts['parse-failure']}, external=${adminCounts.external}`,
		''
	);
	if (adminClassified.length === 0) lines.push('_none_');
	for (const u of adminClassified) lines.push(`- \`${u.key}\`${u.path ? ` (\`${u.path}\`)` : ''} **[${u.classification}]**: ${u.reason}`);

	writeFileSync(path.join(outDir, 'reports', 'unmatched-frontend-calls.md'), lines.join('\n') + '\n');
	return { feCounts, adminCounts, feClassified, adminClassified };
}

// ---------------------------------------------------------------------------
// Dead-call report (E): every no-such-endpoint entry, with git-grep evidence
// ---------------------------------------------------------------------------

/** `git grep -n <pattern> origin/dev -- '*.java'` — exit 1 (no matches) is a real, useful result (absence), not an error. */
function gitGrepJava(repoDir, pattern) {
	try {
		const out = execFileSync('git', ['-C', repoDir, 'grep', '-n', '-i', '--', pattern, 'origin/dev', '--', '*.java'], {
			encoding: 'utf8',
			maxBuffer: 1024 * 1024 * 16
		});
		return out.split('\n').filter(Boolean);
	} catch (e) {
		if (e.status === 1) return []; // no matches — that's the evidence
		return null; // repo/branch unavailable or another real error
	}
}

function classifyDeadCallCause(entryPath) {
	const p = entryPath || '';
	if (/^\/messages(\/|$)/.test(p) || /\/conversations\/consultants/.test(p) || p === '/users') {
		return 'legacy pre-Matrix messaging: /messages/*, /conversations/consultants/*';
	}
	if (/caldav/i.test(p) || /^\/appointservice(\/|$)/.test(p)) {
		return 'appointment/caldav';
	}
	return 'other';
}

/**
 * Own-endpoint coverage check ("both checks" side #1) — Problem 2 fix.
 * `git grep '*.java'` for a `@…Mapping` annotation CANNOT prove a route is
 * absent: several UserService controllers implement OpenAPI-generated
 * interfaces (`UserController implements UsersApi`), so the effective route
 * set is the repo's OWN `endpoint` nodes (OpenAPI yaml *and*
 * Spring-annotation, already merged into `backendByRepo[repo]` by the time
 * this runs) — not what a regex happens to find in the checked-in `.java`
 * source. Three real entries were refuted this way: `sessionBase`
 * (`/users/sessions`, base-constant — `@RequestMapping("/users/sessions")`
 * exists on SessionSupervisorController/TeamDiscussionController, plus this
 * repo's own Spring-annotation extraction already recovers every concrete
 * route under it), `chatRoom` (`/users/chat/room` — `api/userservice.yaml`
 * already documents `GET /users/chat/room/{chatId}` as an OWN endpoint,
 * git-grep's *.java-only evidence just can't see the OpenAPI yaml at all),
 * `consultantEnquiriesBase` (`/conversations/consultants/enquiries/` —
 * `api/conversationservice.yaml`, under `ORISO-UserService`'s own `api/`
 * folder, documents both `/enquiries/registered` and `/enquiries/anonymous`
 * as OWN endpoints).
 * @returns {{covered: boolean, exactMethods: string[]}}
 */
function checkOwnEndpointCoverage(entry, repo, backendByRepo) {
	if (!repo || !backendByRepo[repo]) return { covered: false, exactMethods: [] };
	return ownEndpointCoversPath(entry.path, backendByRepo[repo]);
}

function writeDeadCallsReport(outDir, reposDir, feClassified, adminClassified, backendByRepo) {
	// Each unmatched entry is produced once per (caller, key) occurrence — the
	// same dead endpoint-map key (e.g. "sessionBase") is referenced by many
	// callers, and matchCalls emits one unmatched record per occurrence. For
	// this report (a per-key developer cleanup list) that's pure duplication,
	// so dedupe by (source repo, key, path) before grouping/git-grepping.
	const seen = new Set();
	const candidateEntries = [];
	for (const [source, list] of [
		['ORISO-Frontend', feClassified],
		['ORISO-Admin', adminClassified]
	]) {
		for (const u of list) {
			if (u.classification !== 'no-such-endpoint') continue;
			const dedupeKey = `${source}|${u.key}|${u.path}`;
			if (seen.has(dedupeKey)) continue;
			seen.add(dedupeKey);
			candidateEntries.push({ ...u, source });
		}
	}

	// Split candidates into genuinely dead vs. refuted by the own-endpoint
	// coverage check BEFORE any git-grep evidence is gathered — "dead" now
	// requires BOTH checks to agree there is no route: (1) no OWN endpoint
	// (OpenAPI api/*.yaml of the resolved repo OR Spring annotation) covers
	// the full path, wildcard-aware, method ignored; (2) the git-grep
	// evidence below (kept for every entry, dead or refuted, as supporting
	// context). A path match with only a method disagreement is
	// `method-mismatch`, not dead.
	const deadEntries = [];
	const refutedEntries = [];
	for (const e of candidateEntries) {
		const repo = resolveRepoForCall({ originVar: e.originVar, path: e.path });
		const { covered, exactMethods } = checkOwnEndpointCoverage(e, repo, backendByRepo);
		if (!covered) {
			deadEntries.push({ ...e, resolvedRepo: repo || 'unresolved' });
			continue;
		}
		const methodMismatch = exactMethods.length > 0 && e.method && !exactMethods.map((m) => m.toUpperCase()).includes(e.method.toUpperCase());
		refutedEntries.push({
			...e,
			resolvedRepo: repo || 'unresolved',
			ownSpecKind: methodMismatch ? 'method-mismatch' : 'prefix-in-use',
			exactMethods
		});
	}

	function gitGrepEvidenceFor(e) {
		const repo = e.resolvedRepo === 'unresolved' ? null : e.resolvedRepo;
		const repoDir = repo ? path.join(reposDir, repo) : null;
		// The last 2 literal (non-{}/${}/:var) path segments, joined — more
		// specific than the single last segment (which is often a generic
		// English word like "sessions" that hits unrelated code and produces
		// noisy, inconclusive evidence).
		const litSegs = (e.path || '').split('/').filter((s) => s && !s.includes('{') && !s.includes('$') && !s.includes(':'));
		const term = litSegs.slice(-2).join('/');
		if (!repo || !repoDir || !existsSync(repoDir) || !term) {
			return { term, hits: ['(no verifiable repo/path segment to grep for)'] };
		}
		const hits = gitGrepJava(repoDir, term);
		if (hits === null) {
			return { term, hits: [`(git grep failed against ${repo}/origin/dev — repo/branch unavailable)`] };
		}
		if (hits.length === 0) {
			return { term, hits: [`git grep -n -i '${term}' origin/dev -- '*.java'  ->  no matches in ${repo}`] };
		}
		const mappingHits = hits.filter((l) => /Mapping\s*\(/.test(l));
		return {
			term,
			hits:
				mappingHits.length > 0
					? [`git grep -n -i '${term}' origin/dev -- '*.java'  ->  ${mappingHits.length} @…Mapping hit(s) found:`, ...mappingHits.slice(0, 5)]
					: [`git grep -n -i '${term}' origin/dev -- '*.java'  ->  ${hits.length} hit(s), none of them a @…Mapping annotation for this path (raw hits below):`, ...hits.slice(0, 5)]
		};
	}

	const groups = new Map(); // cause -> entries[]
	for (const e of deadEntries) {
		const { hits } = gitGrepEvidenceFor(e);
		const cause = classifyDeadCallCause(e.path);
		if (!groups.has(cause)) groups.set(cause, []);
		groups.get(cause).push({ ...e, evidence: hits });
	}

	const lines = [
		'# Dead Frontend/Admin Calls',
		'',
		'Every `no-such-endpoint` entry from Frontend and Admin (see',
		'`unmatched-frontend-calls.md` for the full classification legend) that',
		'ALSO fails the own-endpoint coverage check below — "dead" requires BOTH:',
		'',
		'1. **spec/annotation check**: no OWN `endpoint` node (this repo\'s',
		'   `api/*.yaml` OpenAPI spec, or a Spring `@…Mapping` annotation already',
		'   extracted into the graph) covers the full call path, wildcard-aware,',
		'   method ignored (`lib/matcher.mjs` `ownEndpointCoversPath`).',
		'2. **git-grep evidence**: `git grep -n` (`origin/dev`, `*.java`) shown',
		'   below for context — kept even though it alone is not proof of absence',
		'   (an implementing class can carry no `@…Mapping` of its own at all when',
		'   it `implements` an OpenAPI-generated interface, e.g. `UserController',
		'   implements UsersApi`).',
		'',
		'A path match with only a method disagreement is `method-mismatch`, not',
		'dead — see the "Refuted" section below. This is a cleanup list for',
		'developers — either wire up the missing backend route, or remove the',
		'dead frontend/admin call.',
		''
	];
	if (deadEntries.length === 0) lines.push('_none_');
	for (const [cause, entries] of groups) {
		lines.push(`## ${cause} (${entries.length})`, '');
		for (const e of entries) {
			lines.push(`### \`${e.key}\` (${e.source})`, '');
			lines.push(`- path: \`${e.path}\``);
			lines.push(`- resolved repo: \`${e.resolvedRepo}\``);
			lines.push(`- spec/annotation check: no OWN endpoint in \`${e.resolvedRepo}\` (OpenAPI \`api/*.yaml\` or Spring annotation) covers this path`);
			lines.push('- git grep evidence (`origin/dev`, `*.java`, supporting context only):');
			for (const l of e.evidence) lines.push(`  - \`${l}\``);
			lines.push('');
		}
	}

	if (refutedEntries.length > 0) {
		lines.push(`## Refuted by own-spec/annotation check — excluded from dead (${refutedEntries.length})`, '');
		lines.push(
			'These entries WOULD have been reported dead under a git-grep-only',
			'*.java check, but an OWN endpoint (OpenAPI yaml or Spring annotation)',
			'covers the full path — either as a `method-mismatch` (an exact-length',
			'own endpoint exists at this path, just not for the method the caller',
			'used) or `prefix-in-use` (this key is a base-URL constant; a real,',
			'longer own endpoint exists starting with the same segments, so the',
			'constant is legitimately combined with a runtime-built suffix',
			'elsewhere rather than being a route on its own).',
			''
		);
		for (const e of refutedEntries) {
			const { hits } = gitGrepEvidenceFor(e);
			lines.push(`### \`${e.key}\` (${e.source}) — ${e.ownSpecKind}`, '');
			lines.push(`- path: \`${e.path}\`${e.method ? ` (caller method: ${e.method})` : ''}`);
			lines.push(`- resolved repo: \`${e.resolvedRepo}\``);
			lines.push(
				e.exactMethods.length > 0
					? `- spec/annotation check: OWN endpoint(s) at this exact path exist for method(s) [${e.exactMethods.join(', ')}]`
					: `- spec/annotation check: no exact-length OWN endpoint at this path, but a longer OWN endpoint starting with these same segments exists (this key is a base-URL prefix)`
			);
			lines.push('- git grep evidence (`origin/dev`, `*.java`, supporting context only):');
			for (const l of hits) lines.push(`  - \`${l}\``);
			lines.push('');
		}
	}

	writeFileSync(path.join(outDir, 'reports', 'dead-frontend-calls.md'), lines.join('\n') + '\n');
	return {
		total: deadEntries.length,
		byCause: [...groups.entries()].map(([cause, entries]) => ({ cause, count: entries.length })),
		refutedTotal: refutedEntries.length
	};
}

function writeUncalledReport(outDir, backendByRepo, allMatches) {
	const calledIds = new Set(allMatches.map((m) => m.endpointNode.id));
	const lines = ['# Uncalled Backend Endpoints', '', 'Endpoints with zero incoming `calls` edges from the parsed frontend/admin callers.', ''];
	for (const repo of BACKEND_ENDPOINT_REPOS) {
		const list = (backendByRepo[repo] || []).filter((e) => !calledIds.has(e.node.id));
		lines.push(`## ${repo} (${list.length} uncalled / ${(backendByRepo[repo] || []).length} total)`, '');
		for (const e of list) lines.push(`- \`${e.node.name}\``);
		lines.push('');
	}
	writeFileSync(path.join(outDir, 'reports', 'uncalled-endpoints.md'), lines.join('\n') + '\n');
}

function writeAdrDriftReport(outDir, drift) {
	const lines = ['# ADR Numbering Drift', '', 'ADR numbers are NOT globally unique across repos — the same number means different things in different places. Link ADR -> service/endpoint by name/content mention, never by number.', ''];
	if (drift.length === 0) lines.push('_no numeric collisions found across the scanned ADR sources_');
	for (const d of drift) {
		lines.push(`## ADR ${d.number}`, '');
		for (const o of d.occurrences) lines.push(`- **${o.sourceRepo}** \`${o.filePath}\`: "${o.title}"`);
		lines.push('');
	}
	writeFileSync(path.join(outDir, 'reports', 'adr-number-drift.md'), lines.join('\n') + '\n');
}

// ---------------------------------------------------------------------------
// Spec-drift report (Problem A.2): consumed specs whose owner repo exists in
// this graph but does NOT itself expose a matching own endpoint — contract
// drift between what a consumer bundles and what the owner actually ships.
// ---------------------------------------------------------------------------

function writeSpecDriftReport(outDir, specDriftRows) {
	const lines = [
		'# Spec Drift',
		'',
		'Endpoints a repo bundles as a *consumed* sibling-service OpenAPI spec ' +
			'(`services/<name>.yaml`) that resolve to an owning repo IN this graph, ' +
			'but for which that owner has no matching own endpoint (`api/*.yaml` or ' +
			'a Spring `@RestController` annotation) with the same METHOD + path. ' +
			'Either the owner has not documented/implemented the route the consumer ' +
			'expects, or the consumer is bundling a stale/renamed spec. One row per ' +
			'(consumer, spec file, endpoint) — the same drifted endpoint can appear ' +
			'more than once if several repos bundle the same stale contract; the ' +
			'underlying graph node is deduped once per (owner, method, path) — see ' +
			'`metadata.source: "consumed-spec-only"` on the endpoint node itself.',
		''
	];
	if (specDriftRows.length === 0) {
		lines.push('_none — every consumed spec whose owner is in this graph matches an endpoint that owner actually exposes_');
	} else {
		lines.push('| Consumer | Spec file | Endpoint | Owner (should serve it) |', '| --- | --- | --- | --- |');
		for (const r of specDriftRows) {
			lines.push(`| ${r.consumer} | \`${r.specFile}\` | \`${r.endpoint}\` | ${r.owner} |`);
		}
	}
	lines.push('');
	writeFileSync(path.join(outDir, 'reports', 'spec-drift.md'), lines.join('\n') + '\n');
}

function writeCoverageReport(
	outDir,
	{
		feMap,
		adminMap,
		feResult,
		adminResult,
		totalEndpoints,
		openapiEndpointCount,
		springStats,
		unmatchedCounts,
		bytes,
		governsCount,
		documentsCount,
		documentsLooseCount,
		callsFunctionLevel,
		callsFileLevel,
		deadCalls,
		wildcardDowngrades,
		stats,
		externalByRepo,
		specDriftRows,
		confirmedMatches
	}
) {
	const feMatchedPct = feMap.entries.length ? ((feResult.matchedKeys.size / feMap.entries.length) * 100).toFixed(1) : '0.0';
	const adminMatchedPct = adminMap.entries.length ? ((adminResult.matchedKeys.size / adminMap.entries.length) * 100).toFixed(1) : '0.0';
	// CONFIRMED calls only (methodConfidence==='exact' && matchQuality==='exact') —
	// see the addCallsFor doc comment in main(). A calls_unconfirmed edge never
	// counts as "this endpoint has a caller".
	const calledEndpointIds = new Set(confirmedMatches.map((m) => m.endpointNode.id));
	const endpointCoveragePct = totalEndpoints ? ((calledEndpointIds.size / totalEndpoints) * 100).toFixed(1) : '0.0';

	const springNewTotal = Object.values(springStats).reduce((n, s) => n + s.new, 0);
	const springDupTotal = Object.values(springStats).reduce((n, s) => n + s.duplicate, 0);

	const backendRepos = ['ORISO-UserService', 'ORISO-AgencyService', 'ORISO-TenantService', 'ORISO-ConsultingTypeService', 'ORISO-Keycloak'];
	const specTableLines = [
		'## Own vs consumed vs external endpoints (Problem A)',
		'',
		'"Before" = every endpoint node this repo\'s checkout contains (own + consumed + external), which is what used to get an `exposes` edge — i.e. what `coverage.md` reported prior to this fix. "After" = only own endpoints get `exposes`; consumed/external get `consumes` instead.',
		'',
		'| Repo | Own (after, exposes) | Consumed (internal, `consumes`) | External (`consumes`, no repo in graph) | Before (old exposes total) | Own endpoints with >=1 caller |',
		'| --- | --- | --- | --- | --- | --- |'
	];
	for (const repo of backendRepos) {
		const s = stats.services[repo] || { endpointsOwn: 0, endpointsConsumed: 0, endpointsOwnUncalled: 0 };
		const external = (externalByRepo[repo] || []).length;
		const before = s.endpointsOwn + s.endpointsConsumed + external;
		const calledOwn = s.endpointsOwn - s.endpointsOwnUncalled;
		specTableLines.push(`| ${repo} | ${s.endpointsOwn} | ${s.endpointsConsumed} | ${external} | ${before} | ${calledOwn} / ${s.endpointsOwn} |`);
	}
	specTableLines.push(
		'',
		`- \`consumes\` edges total: ${stats.consumes} (${specDriftRows.length} of the internal ones are spec drift — see reports/spec-drift.md)`,
		`- \`depends_on\` edges total: ${stats.dependsOn} (weight = calls-edge count + consumes-reference count between that pair of services)`,
		''
	);

	const lines = [
		'# Coverage',
		'',
		...specTableLines,
		`- Frontend endpoint-map keys matched: ${feResult.matchedKeys.size} / ${feMap.entries.length} (${feMatchedPct}%), ${feMap.unparsed.length} keys could not be parsed at all`,
		`- Admin endpoint-constant keys matched: ${adminResult.matchedKeys.size} / ${adminMap.entries.length} (${adminMatchedPct}%), ${adminMap.unparsed.length} keys could not be parsed at all`,
		`- Backend endpoints reached by at least one CONFIRMED \`calls\` edge: ${calledEndpointIds.size} / ${totalEndpoints} (${endpointCoveragePct}%)`,
		`- \`calls\` edges (confirmed: method known + exact literal match): ${stats.callsTotal}; \`calls_unconfirmed\` edges (method-unknown \`path-only\`, or a call-side literal against a backend \`{param}\` — \`wildcard\`, kept as edges but never counted toward depends_on weight, coverage, or "endpoints with a caller"): ${stats.callsUnconfirmed}`,
		`- Backend OWN endpoints total (own = api/*.yaml + Spring annotations; consumed/external excluded — see table above): ${totalEndpoints} (${openapiEndpointCount} from OpenAPI yaml + ${springNewTotal} new from Spring annotations; ${springDupTotal} Spring-annotation matches were already present in the OpenAPI yaml and got tagged \`metadata.sources: [openapi, spring-annotation]\` instead of duplicated)`,
		'',
		'## Spring-annotation endpoint extraction, per repo',
		'',
		...Object.entries(springStats).map(
			([repo, s]) =>
				`- ${repo}: ${s.controllersScanned} \`@RestController\`/\`@Controller\` files scanned, ${s.candidatesFound} endpoint candidates extracted -> ${s.new} new endpoint nodes, ${s.duplicate} duplicates of an existing OpenAPI-yaml endpoint`
		),
		'',
		'## Remaining unmatched frontend/admin calls, by classification',
		'',
		`- ORISO-Frontend: no-such-endpoint=${unmatchedCounts.feCounts['no-such-endpoint']}, proxy-unresolved=${unmatchedCounts.feCounts['proxy-unresolved']}, parse-failure=${unmatchedCounts.feCounts['parse-failure']}, external=${unmatchedCounts.feCounts.external}`,
		`- ORISO-Admin: no-such-endpoint=${unmatchedCounts.adminCounts['no-such-endpoint']}, proxy-unresolved=${unmatchedCounts.adminCounts['proxy-unresolved']}, parse-failure=${unmatchedCounts.adminCounts['parse-failure']}, external=${unmatchedCounts.adminCounts.external}`,
		'',
		'See reports/unmatched-frontend-calls.md for the full classified list and the legend.',
		'',
		`- knowledge-graph.json size: ${bytes} bytes (${(bytes / 1024 / 1024).toFixed(2)} MB, cap 5 MB)`,
		'',
		'## Caller granularity (fix D: widened src/**/*.ts(x) scan)',
		'',
		`- \`calls\` edges from a function-level caller node: ${callsFunctionLevel}`,
		`- \`calls\` edges from a file-level fallback caller node (no matching function node in the per-repo graph): ${callsFileLevel}`,
		'',
		'## Wildcard-match precision (fix A)',
		'',
		`- Frontend/Admin calls that a permissive "{} matches any literal" rule would have wildcard-matched, but are correctly rejected (no-such-endpoint) by the new literal-sibling-disqualification rule in \`lib/matcher.mjs\`: ${wildcardDowngrades}`,
		'',
		'## governs / documents edge counts (fixes B, C)',
		'',
		`- \`governs\` edges (document -> service, accepted scoped ADRs): ${governsCount} (ADR -> its own repo self-edges are no longer emitted at all)`,
		`- \`documents\` edges (document -> service, fumadocs mentions): ${documentsCount}, under the stricter mention-count rule (>= 2 body occurrences, or 1 in title/frontmatter/first heading); the old any-mention-once rule would have produced ${documentsLooseCount}`,
		'',
		'## Dead-call report (fix E)',
		'',
		`- \`no-such-endpoint\` entries written to reports/dead-frontend-calls.md: ${deadCalls.total}`,
		...deadCalls.byCause.map((g) => `  - ${g.cause}: ${g.count}`),
		''
	];
	writeFileSync(path.join(outDir, 'reports', 'coverage.md'), lines.join('\n') + '\n');
	return { feMatchedPct, adminMatchedPct, endpointCoveragePct };
}

// Guard so this file can be `import`ed from tests (to unit-test
// buildBackendIndex/resolveConsumedEndpoints in isolation) without
// immediately running the full CLI against process.argv. Compares resolved
// absolute paths (not raw strings) so it works regardless of whether the
// script was invoked with a relative or absolute path, and regardless of
// spaces/special characters in the path (this repo lives under a "0 - Docs"
// directory).
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
	main();
}

export { buildBackendIndex, resolveConsumedEndpoints, resolveOwnerWithOverlap };
