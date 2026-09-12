---
name: oriso-graph
description: Answer ORISO code and architecture questions from the Understand-Anything graphs (repo graph + cross-service ORISO-Platform graph) and enforce the working rule "ticket → graph + ADRs → Storybook → code". Use before implementing any ORISO ticket, for "which function calls which endpoint", "which service owns this table", "which ADR governs this", onboarding questions, or when the user says /oriso-graph.
---

# ORISO Graph — query and working rule

Classification: generalizable method (any coding agent); the slash-command form is Claude-specific.

## Working rule (before writing code for a ticket)

1. **Graph first.** Query the repo graph and the platform graph (below) for the files,
   functions, endpoints and tables the ticket touches. Do not start from `grep` over the
   whole tree.
2. **ADRs second.** Read the authoritative document before treating a graph edge as policy.
   `governs` requires accepted status, explicit service scope, accountable owner and a
   resolved non-superseded lifecycle. `mentions` and `proposes_for` are discovery hints,
   never binding instructions. Legacy mention-derived governs edges are also hints until
   the source lifecycle is checked. Raise an actual accepted-policy conflict in the ticket.
   Platform ADRs: `ORISO-Docs/oriso-platform/decisions/`; code-adjacent ADRs sit beside their
   repo (numbering drifts between the two — link by name, not number).
3. **UI only via Storybook.** Props come from the Storybook MCP (`docs-show`,
   `stories-preview`), never from guessing. Rules and hosts: `skills/storybook-routing/SKILL.md`
   and `skills/oriso-frontend-component-discipline/SKILL.md`.
4. **Freshness is printed, not assumed.** Run `ua-pull --verify` (Dev-Kit). Shallow structure
   is refreshed from `dev` by the PreDev schedule (`17 */2 * * *`, every two hours
   at minute 17) and explicit manual runs; semantic depth carries its own review date.
   Use `ua-pull --verify` to compare a fresh origin ref and the selected graph revision;
   timestamps alone cannot certify freshness. Changed-source prose is stale until reviewed.
   Never edit or commit generated graphs.
5. **Evidence in the PR.** Cite node ids, endpoint names and ADR names from the graph; add
   Storybook preview URLs for UI work.

## Files

- Repo graph: resolve the validated cache directory with `ua-pull --path`; read
  `knowledge-graph.json` there (+ `meta.json`:
  `gitCommitHash`, `analyzedAt`).
- Platform graph: resolve the validated cache directory with `ua-pull --platform-only --path`;
  read `knowledge-graph.json` there. It contains service and own
  backend endpoints (`exposes`) plus consumed/external contracts (`consumes`), `calls`
  (frontend/admin function → endpoint; only method-exact literal matches — weaker matches are
  `calls_unconfirmed` and must be treated as hints, not facts), `owns` (service → table),
  `governs` (ADR → **service**; there are no endpoint-level governs — say "governs the service"
  and never claim an ADR binds a specific endpoint), `documents` (docs page → service),
  `deploys` (Helm → service), `depends_on` (service → service; `metadata.evidence` says calls
  and/or bundled spec). Node ids are prefixed `<Repo>::`. Counts live in `metadata.stats`,
  input commits in `metadata.sources` (both top-level keys of the graph, not under `project`).
- Source of truth for both: the scheduled two-hourly or explicit manual build on PreDev
  (`ssh predev /opt/oriso-understand/_rebuild/ua-refresh.sh`). `https://understand.oriso.org`
  is a separate hosted nightly channel. Its publication may be stale and is not evidence
  that the PreDev cache has the same generation or source revisions.

## How to answer a question

1. Resolve the repo and platform cache directories through `ua-pull --path` and
   `ua-pull --platform-only --path`; verify their shared generation and full source revisions.
   Repository-root graph copies are historical unless explicitly revalidated.
   A different checkout is a failure unless deliberately requested with
   `--allow-different-checkout`; then report `VALID-DIFFERENT-CHECKOUT` explicitly.
   Print generation, source revision and semantic review date separately.
2. Grep, don't load: search `"name"` and `"summary"` fields for the question's keywords in
   **both** files; collect node ids.
3. Follow edges one hop in both files: `calls`, `exposes`, `owns`, `governs`, `documents`,
   `depends_on`; for repo-local detail use `imports`/`contains`. Follow ordered
   `contains_flow`/`flow_step`, `on_error`/`compensates` and `tested_by` only with their
   claim provenance. A test-source edge identifies a relevant test, not a passing run.
4. Answer with: the concrete nodes (file paths, endpoint `METHOD /path`, table names), the
   cross-service chain (function → endpoint → service → table), the governing ADRs with
   their file paths, and which layer each node belongs to. Say explicitly when the graph
   has no edge for something (e.g. an endpoint without callers) instead of inferring one.
5. Only `calls` edges are confirmed by the source matcher, not by runtime tracing. `calls_unconfirmed` edges (wildcard or method-unknown
   matches) are hints: name them as such or leave them out — never present one as "X calls Y".

## Do not

- Do not run the plugin's `/understand` LLM rebuild inside ORISO repos — graphs come from
  predev; a local rebuild burns tokens and diverges.
- Do not treat the aggregate `ORISO-Supergraph` or `oriso-super-graph-detailed.json` as input;
  they are dashboard artefacts.
- Do not put secrets, hostnames with credentials, or tokens into graph files or this skill.

## Semantic claim boundary

`metadata.semanticClaim` records analyzed commit, source ranges/fingerprints, generation,
generation/review dates, confidence and evidence. `source-current` means the reviewed
source still matches. `stale` or `unbound` prose is dated orientation only; never silently
copy it into a fresh factual answer. A stable node ID does not establish an unchanged body.
Ambiguous references are rejected instead of selecting the first matching name.
The four initial ordered walkthroughs explicitly cover scheduled asker deletion, anonymous
enquiry creation, account-invite commands and request.new timeline notifications. Their
scope does not certify whole user journeys or other notification channels. Runtime proof
requires a separate recorded test execution on the exact candidate and recipient readback.
