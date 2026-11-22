# ADR-028 — Capability map: stay in the hub, add health to the viewer node panel through the patch mechanism

**Status:** Proposed. **Date:** 2026-10-24.
**Decision owner:** Frank Gerhardt. **Technical reviewers:** Nikunj (frontend), Hassan Saeed (hosting).
**Scope:** `tools/understand-anything` (hub map, hosted viewer patches), epic [Docs#213](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/213), ticket [Docs#224](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/224).
**Refs:** Docs#197 (planning map), Docs#199 (deep links), spec story 41.

## Question

The capability map (`site/hub/map`) and the Understand-Anything (UA) viewer both document the same code. Epic #213 adds a Health view to the map. How do we avoid two documentation surfaces that need the same work twice (spec story 41)?

## Where we are today (measured on `feat/213-health-jobs`)

- **Hub map:** static page with no inline script or style, same-origin `fetch` of JSON from `map/data/`, run under the CSP `default-src 'self'; script-src 'self'; connect-src 'self'` in the Playwright tests. Optional files such as `board.json` arrive under `MEAS.<file>`. Health records will arrive the same way.
- **Viewer:** the upstream UA dashboard is installed by `install.py` at one pinned commit (`toolchain.lock.json`, upstream 2.9.4), five ORISO patches are applied with `git apply --check`, each patch carries a sha256 in the lock file, and core and dashboard are built into an immutable release. Patches add about 2,500 lines in total. `NodeInfo.tsx` is touched by three of the five patches and `App.tsx` by two. There is no automatic upstream bump; an upgrade is a manual re-pin plus patch rebase.
- **Bridge (#199):** `oriso-deep-link-v1.patch` (122 lines, 3 files, plus `deep-link.mjs` and its test) makes every viewer accept `?node=<id>` and adds "Show on map" to each node panel, linking to `/map/#node=<id>`. Node ids are the same on both sides (`capability:<slug>`, `<repo>::folder:<dir>`, `<repo>::file:<path>`).
- **Viewer CI** (`ua-tooling.yml`) already installs the pinned upstream and runs vitest and Playwright against the patched dashboard, so a patch has a real test harness.
- **Not built yet:** the health run record (#218) and criteria files (#217). Their schema is open.

## Options

### A. Keep the map in the hub, link with deep links (status quo)

Health stays a map view. The viewer links to the map (exists) and the map links to the viewer (exists). Nothing new in the viewer.

- Upstream cost: none.
- Duplication: the user sees health on the map and code facts in the viewer, in two places. Per node the text is not duplicated (graph summaries live in the graph, health in run files), but the user must hop between two apps to read both.
- CSP and security: no change.
- Tests: no new tests.
- Effort: 0 days beyond the Health view already planned in #214–#220.

### B. Health section in the viewer node panel through the existing patch mechanism

Add `oriso-health-section-v1.patch`: a small read-only component in the node panel that fetches the latest health record for the selected node id from the same origin and shows score, date, model, run link and "show on map". The map stays the place for overview, trends and comparison. The viewer shows the same record for one node.

- Upstream cost: one more hunk in `NodeInfo.tsx` (already the most patched file) and a new file. Estimated 150–250 patch lines. Each upstream bump needs this hunk re-checked; a conflict fails `git apply --check` loudly, never silently. Estimate: about half a day per upstream bump on top of the existing patches.
- Duplication: none in data. Both surfaces read the same exported run file; a shared helper decides "latest record for node". The rendering exists twice (a small React component and the map's DOM code), which is the cost of two surfaces.
- CSP and security: the section only reads `GET` same-origin JSON, so `connect-src 'self'` is enough. Needs a check that the hosted viewer's nginx routes pass the data path (the viewer routes are an allowlist in `viewer-routes.json`, and the viewer's actual response headers are not in this repository, so this is unverified). Model-written verdict reasons are untrusted text: render as text nodes only, never as HTML. Private repositories export counts only, so the section must show "no data" there, not an empty or guessed value. The viewer's per-service access tokens must not be sent to the data path.
- Tests: pure helper tests with `node --test` (like `deep-link.test.mjs`), a vitest for the component and a Playwright run in the existing `ua-tooling` job. Needs the "no invented data" rule: the numbers shown equal the exported fields.
- Effort estimate: 3 to 4 days after the run-record schema (#218) is stable, including lock-file hashes, nginx route and CI.

### C. Fork the dashboard and make the map a native view

Fork upstream, fold the map in as a view of the dashboard (same React app, same store).

- Upstream cost: highest. We would own a divergent dashboard of unknown size (I could not inspect upstream from this session, so its size and release rate are unmeasured). Every upstream bump becomes a merge of our whole app, not of five bounded patches. The patch approach exists exactly so that we can re-pin upstream.
- Duplication: removes the second surface, but only after rewriting the map (tokens, drill, board bars, planning moves, epic panel, drag and drop, bilingual UI, 320 px layout) in React and porting its Playwright suite.
- CSP and security: the dashboard is built by Vite with different assumptions (inline styles via libraries are common in React Flow style apps). The map's strict "no style attribute" contract would have to be re-proven on a new runtime. The planning write path (`plan.mjs` intents) would live in a bigger attack surface.
- Tests: the map's suites (`map-render`, `board-agg`, `plan-move`, publication) must be ported or run against the new view.
- Effort estimate: 25 to 40 working days for the port plus an ongoing merge burden of days per upstream release. This is an order of magnitude estimate, not a measurement.

## Comparison

| | A. Hub + deep links | B. Node-panel section via patch | C. Fork, native view |
| --- | --- | --- | --- |
| Upstream upkeep | none | one more hunk in `NodeInfo.tsx`, about 0.5 day per bump | full fork merge, days per bump |
| Documentation duplication | two apps, one hop | none in data, small duplicate rendering | none after port |
| CSP / security | unchanged | same-origin read, text-only rendering, route allowlist check | strict map contract must be re-proven |
| Tests | none new | helper + vitest + Playwright in existing job | port all map suites |
| Effort | 0 | about 3 to 4 days (after #218) | about 25 to 40 days |
| Reversible | yes | yes, drop the patch and its lock entry | hard |

## Decision

**Recommended: B, built in two steps.**

1. Now: A. Ship the Health view in the hub map as planned (#214–#220). No viewer change is needed for that.
2. After #218 fixes the run-record schema: add the node-panel health section as `oriso-health-section-v1.patch`. It reuses the #199 mechanism, adds one bounded patch, runs in the existing viewer CI, and makes the viewer show the same record as the map. This answers story 41 without moving the map.

C is rejected for now.

Why not stop at A: the viewer is where people read code facts, so health next to them is the thing a reader misses most. Why not C: it spends weeks and takes on an unbounded merge burden for a gain (one surface) that B gets for a few days, and it follows the project rule not to spend before there is evidence. We have no evidence yet that users need the map inside the viewer.

## Prototype status

Not prototyped, on purpose. Option B is cheap in principle, but it cannot be built honestly today:

- The health record schema (#218) does not exist, so a component would bind to an invented shape.
- A patch must be applied to the pinned upstream, rebuilt and re-hashed in `toolchain.lock.json`, and it needs the installed upstream tree for vitest and Playwright. That tree is not available in this working environment.

The shape of the work is above. The first tracer slice is the pure helper (`latestRecordForNode(records, nodeId)`) with `node --test`, then the component.

## Trigger to switch

Move from B to C only if **at least two** of these hold for a full quarter:

1. More than half of map sessions start from a viewer deep link (so the two apps are one workflow), measured from the existing `?node=` and `#node=` entry points.
2. We need map features inside the viewer's graph canvas itself (for example health colouring on the graph or planning moves from the graph), which a node-panel section cannot give.
3. Upkeep of the viewer patches costs more than about two days per upstream bump, or an upstream bump has failed `git apply --check` on two bumps in a row.
4. Upstream accepts none of our patches, and we already maintain the dashboard de facto.

Move from A to B earlier if health runs exist (#218 merged) and reviewers ask for scores while reading a node.

## Consequences

- #224 is satisfied by this record. A follow-up ticket for the B patch should be opened after #218, blocked by it.
- The viewer section must read only exported run files and show "no data" when none exist.
- Review this ADR when the upstream pin changes or when #218 lands.
