# Before/after check for token swaps: one cluster, one sheet

Research for wayfinder ticket ORISO-Docs#149, child of map ORISO-Docs#144. Read-only on all repos. Measured on 2026-10-02 against the deployed Storybooks on `dev.oriso.org` (Admin index built from `origin/dev`), Playwright 1.61.1 from `ORISO-E2E/node_modules`, Chromium headless, one Mac.

## 1. Short answer

**Use a two-step check per swap cluster, both automatic, both run locally against the deployed dev Storybooks:**

1. **Computed-style diff per story** is the gate. It answers "did any element's colour change, and which one". It is exact (no anti-aliasing noise), takes ~60 ms per story and names the element and property.
2. **A side-by-side image sheet** (before | after | amplified diff) is what the reviewer looks at. It is generated only for the stories where step 1 found a change, plus a fixed "must look" list per cluster. Pixel diff is used only to build the amplified diff column and as a cross-check, not as the pass/fail rule.

Why not pixel diff alone: a pixel diff cannot tell "same colour, different anti-aliasing" from "different colour", needs a tolerance that someone has to tune, and says nothing about which token moved. Why not computed-style alone: it cannot see layout or stacking surprises (an opacity or overlay that hides the new colour), and a designer will not sign off on a JSON file. The two together cost under 1 s per story.

**Measured (trial, section 5):** a pure-crutch swap (hex `#410001` replaced by the token that already holds it) on 3 stories x 2 viewports: computed-style diff = 0 changes, pixel diff = 0 of 1,024,000 px (desktop) and 0 of 329,160 px (mobile). A deliberately wrong control (+9 RGB) was caught by both: 1 to 2 elements flagged, 3,398 to 7,820 px, max channel delta 10. Whole trial: 4.9 s of capture for 6 captures x (before, after, control), plus 0.3 s for diffs and sheets.

## 2. What exists today (evaluated first)

| Tool | State in ORISO | Use for this? |
|---|---|---|
| Deployed Storybooks | `dev.oriso.org/storybook-admin/` (886 stories, 193 titles) and `/storybook-frontend/` (1360 stories, 235 titles), `index.json` is public, each story renders alone at `iframe.html?viewMode=story&id=...` | **Yes, the capture surface.** No local build needed, always the integrated dev state. |
| Storybook MCP (`stories-preview`, `test-run`) | `@storybook/addon-mcp` serves `http://localhost:6006/mcp` from a local `storybook dev` (Admin `.storybook/main.ts`). `stories-preview` returns preview URLs; `test-run` runs the component tests and the a11y (axe) checks. | **Only as a helper.** Neither produces an image or a style diff, and both need a local dev server. Useful for the "no new a11y violation" side check after a swap, not for before/after. |
| Storybook test-runner / vitest | Frontend: `npm run test:storybook` (vitest browser project, ~170 files, two workers, flaky browser-disconnect retries). Admin: `vitest run`, no story project. | **No.** It is an assertion runner. Heavy (the Frontend script has retry logic for browser disconnects), no screenshot or style capture. |
| Playwright | `ORISO-E2E` (`playwright test`, nightly against dev, 43 specs, no screenshot assertions); Frontend `playwright/` smoke specs. | **Yes as the engine** (library mode, no test runner needed). E2E specs stay out of this; they are functional money-path tests. |
| Visual-regression setup | **None found.** No `toHaveScreenshot`, no pixelmatch, no Argos/Percy/Loki in Admin, Frontend or E2E. `chromatic` is a devDependency in Frontend `package.json` only; nothing references it (no workflow, no script). | n/a. Chromatic is a paid SaaS that would upload story renders; do not adopt it for this. |
| CI | Admin and Frontend `ci-storybook-*.yml` only build the Storybook Docker image (validation). | Not used for the check (see section 7). |

Gap that matters: **there is no baseline store**. Everything below creates one cheaply (JSON per story, PNGs only on demand).

## 3. What is captured

**Tier 1, stories (the default).** Admin and Frontend Storybook, every story, using the public `index.json` as the list. Per story and viewport: one `getComputedStyle` snapshot of every element under `#storybook-root` (colour properties only: `color`, `background-color`, the four `border-*-color`, `outline-color`, `fill`, `stroke`, `box-shadow`, `text-decoration-color`, `opacity`), keyed by DOM path. A PNG is taken only when needed (section 5, 6).

**Tier 2, real pages (a short fixed list).** Playwright against `https://dev.oriso.org` only (never pre-dev unless Frank says so), logged in through the Test Access hub (`test-access playwright-login`; never `test-access get`, it prints passwords). Eight to ten pages that stories cannot prove: Admin user table, Admin Settings, Frontend session list, a chat, the sidebar. Same snapshot + PNG, same viewports. Not trialled here (needs a login); the capture code is identical, only the `goto` differs. Tier 2 exists because stories render with Storybook's own theme provider (the Admin story runs with seed `#a5000a` and no per-Träger overrides), so a swap can look right in a story and wrong under a real tenant.

**Viewports.** Desktop 1280 x 800, and **mobile 390 x 844** (the width the earlier pale-element research used). For the Frontend "truly mobile with bottom navigation" case there are dedicated stories (`components-layout-navigationsidebar--runtime-consultant-mobile`, `--runtime-asker-mobile`, ...); a Tier 2 page at 390 wide shows the real bottom bar. Device scale 1 for the diff (so image sizes stay small), `reducedMotion: reduce`.

**Three traps measured in the trial, all of which would give false results:**

1. **Transitions.** The first trial run produced different "after" values in the control (69,4,5 vs 68,3,4 vs 74,10,11) because buttons animate their background and the snapshot ran 50 ms after the CSS change. Fix, now in the script: inject `*{transition:none !important;animation:none !important}` before the "before" capture. Without it, every swap shows noise.
2. **The token may not exist at runtime.** The inventory's token for `#410001` is `--m3-on-primary-fixed`, but on the deployed Admin Storybook that variable is **empty** (`getComputedStyle(documentElement).getPropertyValue('--m3-on-primary-fixed') === ''`). The only custom property holding `#410001` is `--admin-nav-indicator-surface` (`:root` in `src/app.css`). A swap to the "right" token without a fallback would have rendered a transparent button. So the style diff is not optional: it is the only thing that catches a token that exists in the engine but is not emitted into the page.
3. **Some stories do not render.** 3 of 60 sampled Admin stories timed out (they need live data). Use a short wait (3 s) and list them as "not covered" in the sheet header instead of failing the pass.

## 4. How before/after is compared

| Method | Measured here | Verdict |
|---|---|---|
| **Computed-style diff** | 0 changes for the identical-token swap; 1 to 2 elements (named by path + property + from/to) for the control; ~60 ms per story | **Gate.** Exact, names the element, cheap. Sufficient on its own for "identical value" clusters (max delta E <= 1) and for removing `var(--x, #hex)` fallbacks. |
| **Pixel diff** | 0 px changed for the swap; control: 3,398 to 7,820 px, max channel delta 10 (a delta of 10 is well below what the eye notices on its own; the amplified diff column makes it visible). Python + numpy, 0.3 s for all 12 comparisons | **Evidence and cross-check.** Run with tolerance 0 (same machine, same Chromium, animations off: it is deterministic). Any non-zero count on a "no change" cluster means the style diff missed something (layout, opacity, overlay). |
| **Side-by-side sheet** | one PNG per viewport: rows = stories, columns = before / after / control / amplified diff; about 40 KB each | **What humans review.** A designer decides "ugly or not" from this, not from numbers. |

For clusters where the colour is **meant** to move (ΔE 3 to 6, danger red, grey text steps), the style diff will always be non-empty. There the sheet is the decision tool and the style diff is the list of "what exactly moved" that goes under it.

## 5. Real trial

**Cluster chosen:** hard-coded `#410001` (Admin), "near `--m3-on-primary-fixed`", marked *crutch / identical* in `research/hardcoded-colour-inventory.md`. Concrete usage: `src/components/SideScrollerFooter/styles.module.scss:60`, `.active { background: #410001 }`. The same value is already referenced by M3FabMenu as `var(--admin-nav-indicator-surface, #410001)`, so the swap is "use the variable that exists".

**Stories (3):** `molecules-sidescrollerfooter--both-active`, `--forward-only`, `--header-rail`, on `https://dev.oriso.org/storybook-admin/`, at 1280 x 800 and 390 x 844.

**After = injected CSS, no repo edit:** `button[class*="_active_"]{background:var(--admin-nav-indicator-surface) !important}`. **Control = deliberately wrong:** same selector with `#4a0a0b` (+9 RGB), to prove the detectors fire.

| Story | Viewport | Elements | Swap: style diffs / px changed | Control: style diffs / px changed (max delta) |
|---|---|---|---|---|
| both-active | desktop | 8 | 0 / 0 of 1,024,000 | 2 / 7,820 (10) |
| forward-only | desktop | 8 | 0 / 0 | 1 / 3,910 (10) |
| header-rail | desktop | 14 | 0 / 0 | 1 / 3,398 (10) |
| both-active | mobile | 8 | 0 / 0 of 329,160 | 2 / 7,820 (10) |
| forward-only | mobile | 8 | 0 / 0 | 1 / 3,910 (10) |
| header-rail | mobile | 14 | 0 / 0 | 1 / 3,398 (10) |

Control flagged value: `background-color` `rgb(65, 0, 1)` to `rgb(74, 10, 11)` on `root/nav[0]/button[0]`.

**Measured time** (Node 24, Playwright 1.61.1, headless Chromium, warm cache, one worker):

| Step | Time |
|---|---|
| Chromium launch | 0.09 s |
| Load one story (first one in a context / next ones) | ~1.0 s / ~0.42 s |
| Style snapshot + PNG, before | 6 to 25 ms |
| Inject swap, snapshot, PNG, diff, remove | ~60 ms (twice: swap and control) |
| **Whole trial, 3 stories x 2 viewports x (before + swap + control)** | **4.9 s** |
| Pixel diff + 2 sheets (Python, PIL, numpy) | 0.3 s |

**Extrapolation to a full pass (measured sample: 60 of 886 Admin stories, snapshot only, serial, desktop):** 0.32 s per rendering story, plus an 8 s timeout for each of the 3 non-rendering stories. With a 3 s timeout that is about **5 min per viewport for all of Admin**, about **10 min for Admin at both viewports serial, ~5 min with two workers**. The Frontend has 1.5 times more stories and heavier ones; estimate **10 to 15 min for both viewports with two workers** (not measured). That full pass is done **once** to build the baseline; it is not repeated per swap.

**Per-cluster pass (the routine case):** the baseline JSON says which stories contain the old value (the sampled scan found `rgb(65, 0, 1)` in the DPA deadline story and the SideScrollerFooter ones). A cluster usually touches 3 to 30 stories, so one cluster pass is **under 30 s per viewport**, sheet included.

Screens (small, from the trial): `research/screens/screenshot-strategy/sheet-desktop.png`, `sheet-mobile.png`. Scripts: `research/screens/screenshot-strategy/scripts/` (`trial.mjs` capture + style diff, `pix.py` pixel diff and sheets, `scan.mjs` the baseline-style scan).

## 6. Grouping: one cluster = one sheet

A cluster is a row of the inventory (for example "near `--m3-on-primary-fixed`", 9 + 3 + 4 files). The unit of work:

1. **Cluster file** `cluster.json`: `{ id, repo, oldValues: ["#410001"], newToken: "--admin-nav-indicator-surface", selectorsOrFiles, mustLook: [story ids], viewports }`.
2. **Find affected stories** by value, not by guessing: from the baseline snapshot, every story whose elements carry an old value (`rgb(65, 0, 1)`), plus the `mustLook` list. This is the useful part of the baseline.
3. **Apply the swap.** Before the change is real, the "after" is an injected stylesheet (as in the trial); once a PR branch exists, the same script runs against that branch's Storybook (`npm run storybook` locally, or the PR build) and compares to the dev baseline.
4. **Output:** one folder per cluster with `report.md` (style diff table, pixel counts, not-covered stories) and one `sheet-<viewport>.png`. Rows are stories, columns before / after / amplified diff. The PR links that folder; the cluster issue gets the sheet inline.
5. **Rule:** a cluster merges only when the style diff matches what the inventory promised (identical = empty, "visible, small" = only the listed elements) and the reviewer has seen the sheet. Clusters marked for a decision (danger red, pale tenant seeds) always need a human on the sheet.

Pale-tenant seeds are a second axis: run the same cluster once with the default seed `#a5000a` and once with a pale seed (the earlier research notes on-primary turning dark by design). That is two sheets, not a different method.

## 7. Where it runs, and who sees it

- **Local first.** The measured numbers above are on a laptop against the deployed Storybook; no build, no server, no secrets for Tier 1. This answers "fast and local". Max two heavy processes: use two Playwright contexts in one browser, not two browsers.
- **CI later, only for the baseline.** A nightly job (the Storybook images already build in CI) can regenerate the dev baseline JSON and upload it as an artifact, so a stale local baseline is detectable by the Storybook `Last-Modified` header. Per-PR CI visual checks are not proposed: they would need the PR's own Storybook served in the job, the Docker-based validation workflows do not do that today, and the cluster check is cheap enough to run before the PR is opened.
- **Reviewer view.** The product owner and designer open one PNG (or the PR comment that embeds it): before | after | diff per story, desktop and mobile on two images, labelled by story. For evidence, the existing `dreambau-pr-evidence` flow can host the PNGs and bind them to the PR; that flow is already the project's answer to "show the same proof".
- **Pre-dev:** never touched (Frank's environment); dev only.

## 8. Limits and open points

- **States not in a story are not covered.** Hover, focus, open menus and dialogs only exist where a story renders them (the trial's `.active:hover` colour `#5c1416` is a separate hard-coded value that no static capture shows). Tier 2 or a small "force state" helper (Playwright `hover()` before the snapshot) covers the important ones; this was not built.
- **Tier 2 (real pages with login) is designed, not run.**
- **Stories that need live data do not render** (about 5 % of the sample); they stay uncovered and are listed.
- **The `computed colour` scan only sees solid colour properties.** Gradients, images and SVG `<stop>` colours need the pixel diff; images with brand colours baked in (icons that are colourful on purpose, per the map notes) should be on a "never flatten" list so a swap that touches them is flagged.
- **Frontend full-pass time is an estimate**, the Admin sample is measured.
- **The injected-CSS "after" proves the swap is visually safe, not that the source edit is correct.** Once the PR exists, rerun against its Storybook; the script is the same.
- **Decision for the ADR/epic:** add "cluster sheet attached" and "token exists at runtime (probe)" to the definition of done for every swap issue.

## Sources

- Deployed index and stories: `https://dev.oriso.org/storybook-admin/index.json`, `https://dev.oriso.org/storybook-frontend/index.json` (fetched 2026-10-02).
- Code read locally (read-only): `ORISO-Admin/.storybook/main.ts` (addon-mcp at `localhost:6006/mcp`, addon-a11y), `ORISO-Admin/package.json`, `ORISO-Frontend/package.json` (`test:storybook`, `chromatic` devDependency), `ORISO-Frontend/scripts/run-storybook-tests.mjs`, `ORISO-Frontend/.github/workflows/ci-storybook-pull-request.yml`, `ORISO-E2E/package.json`, `ORISO-Admin/src/components/SideScrollerFooter/styles.module.scss`, `src/app.css`.
- Earlier results (read, not redone): `research/hardcoded-colour-inventory.md` (cluster table, "computed-style diff over stories" suggestion, now tested), `research/pale-admin-elements.md` (deployed Admin Storybook method, 390 px viewport, `iframe.html?id=...&viewMode=story`).
