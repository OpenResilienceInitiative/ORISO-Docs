# Local UA guidance migration

Business problem: old prompts direct agents to historical repository-root graphs and confuse ADR mentions with authority. Activation replaces only the UA guidance below. Back up each original file and check its recorded SHA-256 before applying; preserve unrelated rules. This patch records the local, non-Git compatibility changes for reviewer inspection.

```diff
--- 0 - Docs/projectOperational.rules.md
+++ 0 - Docs/projectOperational.rules.md
@@ -61,21 +61,15 @@
 
 ## Understand Anything Graphs And Branch Freshness
 
-- Source of truth for graphs is the on-demand build on predev
-  (`ssh predev /opt/oriso-understand/_rebuild/ua-refresh.sh`, branch `dev`), delivered into a
-  repo with `ua-pull` (Dev-Kit, `${PROJECT_ORISO_ROOT}/0 - Docs/dev-kit/ua-pull.sh`). The nightly
-  on the UA server feeds only the human dashboards at `https://understand.oriso.org`.
-- Per repo: `<repo>/.understand-anything/knowledge-graph.json` (+ `meta.json` with
-  `gitCommitHash`, `analyzedAt`); cross-service view: `<repo>/.understand-anything/platform-graph.json`
-  (ORISO-Platform: services, endpoints, `calls`, `owns`, `governs`). Query both via
-  `${PROJECT_ORISO_ROOT}/skills/oriso-graph/SKILL.md`.
-- Trust a graph only after `ua-pull --verify` (prints branch, commit, age). Any other copy —
-  `${PROJECT_ORISO_ROOT}/.understand-anything/` (2026-06-02) or graph files committed inside repos
-  (2026-08-27) — is a manual snapshot, not current. Never edit or commit files under
-  `.understand-anything/`.
-- ORISO-Kubernetes is deprecated (infra lives in ORISO-Helm); it is excluded from the platform graph.
-- Before trusting any checkout as current: `git fetch --all --prune --tags` and
-  `git rev-list --left-right --count HEAD...@{u}`.
+- Use the pinned ORISO-specific `skills/oriso-graph/SKILL.md` through either agent. The shared release is installed by `ORISO-Docs/tools/understand-anything/install.py`.
+- PreDev publishes one immutable complete generation from freshly fetched source refs, on the observed two-hour schedule and through manual refreshes. The historical hosted nightly dashboard is a separate channel.
+- Run `ua-pull --via-ssh`, then `ua-pull --verify --status-json`. Source verification checks the launching repository's current ref; producer verification checks all 18 declared sources. Report that distinction, full SHA, generation, delivery receipt, structural timestamp and latest claim review separately.
+- Read the external immutable directories returned by `ua-pull --path` and `ua-pull --platform-only --path`; never substitute repository-root `.understand-anything` snapshots. Cached-content validation alone is not current-source verification.
+- Use `ua-dashboard` or `ua-dashboard --platform-only` for the pinned viewer. A different checkout requires explicit `--allow-different-checkout` and stays labeled.
+- Claims and edges retain their confidence. `mentions` and `proposes_for` do not grant authority; `governs` requires accepted, owned, scoped, current source declarations. Source/test links do not establish runtime acceptance.
+- ORISO-Kubernetes is retained in the 18-source bundle for historical orientation and excluded from the 17-source platform subset. Infra ownership is checked against ORISO-Helm source.
+- Preserve historical graph files and Git flags; migration is explicit with `ua-pull --migrate-legacy` and backup. Do not edit or commit generated caches.
+- Before trusting a checkout, fetch its intended ref successfully and compare full identities. A failed fetch cannot be replaced with cached-origin evidence.
 
 ## Latest Local Developer PRs
 
--- 0 - Docs/dev-kit/CLAUDE-block.md
+++ 0 - Docs/dev-kit/CLAUDE-block.md
@@ -1,11 +1,10 @@
-# ORISO working rule — knowledge graph, ADRs, Storybook
+# ORISO working rule — source-bound graphs, ADRs and Storybook
 
-> Classification: generalizable (any coding agent) → belongs in `AGENTS.md`; Claude-specific commands are marked.
+Before changing an ORISO ticket, read the shared `skills/oriso-graph/SKILL.md` (available to Codex and Claude).
 
-Before you write code for a ticket in any ORISO repository:
-
-1. **Check the ticket against the graph.** Run `/understand-diff` (Claude) or read `.understand-anything/knowledge-graph.json` for the affected files, functions and endpoints. For cross-service questions ("which frontend function calls this endpoint", "which service owns this table") use `/oriso-graph <question>` (Claude) — it reads `.understand-anything/platform-graph.json`, the cross-service ORISO-Platform graph.
-2. **Check the ADRs.** The platform graph links ADRs (`document` nodes, `governs` edges) to services and endpoints. If an ADR governs what you touch, follow it or stop and raise the conflict — do not silently deviate. Platform ADRs live in `ORISO-Docs/oriso-platform/decisions/`; code-adjacent ADRs sit beside their repo.
-3. **UI components only via Storybook.** Never guess props. Query the Storybook MCP (`docs-show`, `stories-preview`) for ORISO-Frontend and ORISO-Admin; after changing a component or story, run `stories-preview` and include the preview URL in your report. HTML mockups become stories via the "HTML → Story" prompt.
-4. **Freshness is printed, not assumed.** `ua-pull --verify` shows the graph's branch, commit, date (shallow structure: refreshed on demand from `dev`) and the depth date (concepts/flows/tour: date of the last deep run). If the shallow date is older than 24 h, run `ua-pull` first. Never edit or commit files under `.understand-anything/`.
-5. **Report with evidence.** Reference node IDs, endpoint names and ADR numbers from the graph in your PR description; include Storybook preview URLs for UI work.
+1. Run `ua-pull --via-ssh`, then `ua-pull --verify --status-json`. Report source ref/full SHA, generation, actual delivery channel, structural timestamp, semantic coverage and latest claim review. The launching-repository freshness check is distinct from the producer's full source-vector check.
+2. Query the immutable external graph directories from `ua-pull --path` and `ua-pull --platform-only --path`. Repository-root `.understand-anything` copies are historical. Run the pinned `ua-dashboard` for the same verified generation.
+3. Trace affected files, endpoints, owners and tables. Preserve unknown and unconfirmed relationships; a missing edge does not prove absence. Use full-revision source links to confirm the actual code.
+4. Read relevant ADR source. `mentions` and `proposes_for` grant no authority. Only accepted, explicitly scoped, owned and current declarations may produce `governs`. Escalate a confirmed source-policy conflict with evidence.
+5. For UI components, query Storybook for authoritative props and variants. After changes, run `stories-preview` and include its exact URL. Storybook and linked test definitions do not establish application runtime acceptance.
+6. Report graph evidence separately from code tests, deployed version and browser proof. Never edit generated caches or silently clear historical graph Git flags; use the explicit backed-up migration command when needed.
--- 0 - Docs/dev-kit/prompts/ticket-check.md
+++ 0 - Docs/dev-kit/prompts/ticket-check.md
@@ -1,38 +1,10 @@
-# Prompt: Ticket-Check gegen den Graph
+# Prompt: Check a ticket against verified source-bound graphs
 
-Vor dem Start eines Tickets in Claude Code einfügen (Ticket-ID/-Link ersetzen):
+Check **<TICKET-ID/URL>** before implementation.
 
----
-
-Prüfe das Ticket **<TICKET-ID/URL>** gegen den Understand-Anything-Graph, bevor
-ich Code schreibe.
-
-1. Lies `.understand-anything/meta.json` (Repo-Graph) und ggf.
-   `.understand-anything/platform-graph.json` (Cross-Service). Nenne
-   Branch, Commit und Alter in einer Zeile (oder nutze `/oriso-graph`, falls
-   installiert).
-2. Falls der Graph älter als 24h ist: sag das explizit und schlage
-   `ua-pull` vor, statt einfach weiterzumachen.
-3. Führe `/understand-diff` (falls das Ticket bereits Diff-relevant ist) oder
-   eine Graph-Query für den Scope des Tickets aus: welche Dateien, Funktionen,
-   Endpunkte und Services sind betroffen?
-4. Liste konkret:
-   - **Betroffene Endpunkte** (METHOD /path + Service)
-   - **Betroffene Tabellen** (über `owns`-Kanten)
-   - **Betroffene Services** und deren `depends_on`-Nachbarn
-   - **Governing ADRs** (über `governs`/`documents`-Kanten, mit Dateipfad)
-5. Wenn ein ADR dem widerspricht, was das Ticket verlangt: stoppe und melde
-   den Konflikt, statt ihn stillschweigend zu übergehen.
-5a. **UI-Ticket (Frontend/Admin):** Finde die betroffenen Stories über den
-   Storybook-MCP — `stories-find-by-component` für jede betroffene Komponente,
-   `docs-show` für die verbindlichen Props. Nach Änderungen: `stories-changed`
-   zeigt, welche Stories dein Diff berührt; `stories-preview` liefert die URL
-   für den Bericht.
-6. Schließe mit einem klaren **Go / No-Go**:
-   - **Go**, wenn Scope + ADRs eindeutig sind → kurze Umsetzungsskizze.
-   - **No-Go**, wenn der Graph fehlt/veraltet ist, ein ADR-Konflikt offen ist,
-     oder der Scope aus dem Graph nicht eindeutig hervorgeht — sag genau,
-     was fehlt.
-
-Nenne explizit, wenn der Graph für einen Endpunkt keine Caller-Kante hat
-(nicht raten, sondern "keine Kante gefunden" sagen).
+1. Read the shared ORISO `oriso-graph` skill. Pull via the intended transport and run `ua-pull --verify --status-json`; report exact source identity, generation, delivery and separate structural/semantic dates.
+2. Read the external directories returned by `ua-pull --path` and `ua-pull --platform-only --path`. If verification fails, identify the evidence gap; inspect source directly without presenting a stale graph as current.
+3. Trace affected files, functions, endpoints, service/table ownership and source dependencies. Preserve confidence and missing-edge limitations.
+4. List relevant ADRs with source paths and explicit authority status. A `mentions` or `documents` relation alone does not establish governance. Report any confirmed policy conflict before implementation.
+5. For Frontend/Admin UI work, find the affected Storybook stories and props; after changes, include exact preview URLs and separate application browser acceptance.
+6. Finish with a concrete implementation outline, verified scope, unresolved questions and the evidence needed to resolve them. Do not guess callers or runtime behavior from missing graph relationships.
--- 0 - Docs/dev-kit/prompts/component-build.md
+++ 0 - Docs/dev-kit/prompts/component-build.md
@@ -1,28 +1,12 @@
-# Prompt: Komponente bauen — Graph → Storybook → Figma → Code
+# Prompt: Build a component from verified graph, Storybook and Figma evidence
 
-Für eine konkrete UI-Aufgabe einfügen (Komponente/Story-Name ersetzen):
+Create or change **<Name>** in **<ORISO-Frontend|ORISO-Admin>**.
 
----
+1. Read `oriso-graph`, run `ua-pull --verify --status-json`, and query the immutable directory returned by `ua-pull --path`. Locate the existing component, props and source-resolved imports; confirm the actual code before claiming a component is absent.
+2. Query Storybook for the component's props and variants. State missing information instead of guessing.
+3. If a Figma link is supplied, inspect its design context and report any mismatch with Storybook.
+4. Implement using the repository's component discipline and existing components.
+5. Run `stories-preview` and preserve its exact URL; test application integration separately when the change affects a user journey.
+6. Check relevant ADR sources from the platform graph. Distinguish accepted scope from mentions/proposals and report confirmed conflicts.
 
-Ich will die Komponente **<Name>** in **<ORISO-Frontend|ORISO-Admin>** bauen
-bzw. ändern. Gehe streng in dieser Reihenfolge vor:
-
-1. **Graph:** Suche in `.understand-anything/knowledge-graph.json` nach
-   `<Name>` — bestehende Datei, Props, Verwendungsstellen (`imports`-Kanten).
-   Sag, ob die Komponente schon existiert oder neu ist.
-2. **Storybook:** Nutze den Storybook-MCP (`docs-list`,
-   `docs-show` mit der gefundenen `{id}`, oder
-   `docs-show-story`) für die verbindliche Prop-/Varianten-Doku.
-   Rate niemals Props — wenn der MCP nichts liefert, sag das explizit statt
-   zu improvisieren.
-3. **Figma:** Falls ein Figma-Link vorliegt, hole Design-Kontext darüber
-   (Figma-MCP) und gleiche mit der Storybook-Doku ab — bei Widerspruch: Figma
-   ist das Bild, Storybook ist der Vertrag; beides im Report nennen.
-4. **Implementieren:** Baue/ändere die Komponente entlang der M3-Regeln des
-   Repos (`skills/oriso-frontend-component-discipline` falls vorhanden).
-5. **Preview:** Führe `stories-preview` für die geänderte Story aus. Nimm die
-   zurückgegebene URL **wörtlich** in deinen Abschlussbericht auf.
-6. **ADRs:** Prüfe über die Graph-`governs`-Kanten, ob eine ADR diese
-   Komponente/dieses Muster betrifft; nenne sie.
-
-Abschluss immer mit: Datei(en) geändert, Storybook-Preview-URL, offene Fragen.
+Report changed files, verified source identity, preview URL, actual runtime test outcome and open evidence gaps.
--- 0 - Docs/dev-kit/README.md
+++ 0 - Docs/dev-kit/README.md
@@ -1,3 +1,5 @@
+> **UA delivery superseded on 2026-09-07.** The graph-installation, delivery, root-cache, hidden-Git-flag and generic-plugin instructions below are retained as historical material. Use `ORISO-Docs/tools/understand-anything/README.md`, its `provenance/activation.md`, and the shared `skills/oriso-graph/SKILL.md` for the current pinned release, immutable external cache and verified source contract. The full historical Dev-Kit installer also changes unrelated integrations; it is not the UA activation procedure. Storybook and other non-UA instructions below retain their own scope.
+
 # ORISO Dev-Kit
 
 Ein Ordner, den ein:e Entwickler:in kopieren und ausführen kann, um in einem
--- 0 - Docs/dev-kit/DELIVERY.md
+++ 0 - Docs/dev-kit/DELIVERY.md
@@ -1,3 +1,5 @@
+> **UA delivery superseded on 2026-09-07.** The graph-installation, delivery, root-cache, hidden-Git-flag and generic-plugin instructions below are retained as historical material. Use `ORISO-Docs/tools/understand-anything/README.md`, its `provenance/activation.md`, and the shared `skills/oriso-graph/SKILL.md` for the current pinned release, immutable external cache and verified source contract. The full historical Dev-Kit installer also changes unrelated integrations; it is not the UA activation procedure. Storybook and other non-UA instructions below retain their own scope.
+
 ## `settings.hook.json` — where developers merge it
 
 `dev-kit/settings.hook.json` holds one `SessionStart` hook entry. It is not a
```
