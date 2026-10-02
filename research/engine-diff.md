# Admin vs Frontend colour engine: measured difference

Research for [ORISO-Docs#147](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/147) (child of map [#144](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/144)). Earlier audit: `research/colour-token-audit.md` on branch `research/colour-token-audit` ([#145](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/145)).

Measured 2026-10-02 on `origin/dev` of ORISO-Frontend `1154ca44` and ORISO-Admin `4faddc30` (same commits as the audit). The repos were not touched: the sources were pulled with `gh api` (raw contents at `ref=dev`) into `research/engine-diff-scratch/`, and dependencies were installed only there (`@material/material-color-utilities@0.4.0`, `tsx`, `culori`). Reproduce: `cd research/engine-diff-scratch && npm i && npx tsx run.ts && npx tsx report.ts`.

## 1. Verdict in plain words

**No, not as a drop-in swap.** The Admin can adopt the Frontend engine for the *brand and neutral colours*, but not for the whole token set, and not without a visible change in the Admin.

1. **The two engines agree on the base, and disagree on what the second seed means.** With the default seed `#a5000a`, 19 of 24 shared tokens are within CIEDE2000 <= 2 (neutrals, secondary, error, `--m3-primary`). The two seed-dependent container roles are not close. For the same stored `theming.accent`, the Frontend uses it as a *secondary hue* (harmonised, chroma capped), and the Admin uses it as the *light primary-container surface*. Same database field, two meanings.
2. **What would break first: the selected-item pill and every `on-primary-container` text in the Admin.** Admin: `--m3-primary-container` is the pale rose `#ffe2de` and `--m3-on-primary-container` is dark text. Frontend: container is a strong `#cc1e1c` and on-container is the pale rose. The roles are inverted. Dropping the Frontend values into the Admin would give a saturated red pill with pale text where the Admin shows pale rose with dark text (CIEDE2000 44 and 83).
3. **33 Admin tokens exist only in the Admin engine** (`--admin-*` tables, fields, nav indicator; `--oriso-app-accent*`, `--oriso-app-chat-surface`, `--oriso-app-on-action`). The Frontend engine does not emit any of them, so they must stay as an Admin overlay or get new homes. Conversely 42 Frontend tokens (tertiary, hover, fixed, dim/bright, `--skin-*`, `--primary`, lottie) do not exist in the Admin.
4. **The Admin preview is already the real Frontend engine for the phones.** The two phone mock-ups are an iframe of the real app's `/theme-demo`, which computes with the Frontend engine. Only the three swatches in the summary card (`accent-dark`, `accent-light`, `error`) use the Admin engine. So on screen the two can disagree on the same page: see section 5.
5. The Admin deliberately avoids the library: a comment in `seedUsability.ts` says the HCT maths is hard-coded because the library's ESM barrel "uses extensionless ESM imports that Vitest 4 rejects". That is a real toolchain blocker for adoption, separate from the colour design.

## 2. Method and what "distance" means

- Both engines were run as pure functions on the golden seeds (primary only, no accent or signal), in the `light` and `inverted` schemes. The Frontend entry point is `computeOrisoPalette(seeds, scheme)` (`src/utils/theme/orisoScheme.ts`, 408 lines, plus `orisoTuning.ts`, 153 lines). The Admin one is `computeOrisoPalette(seeds, scheme)` (`src/utils/theme/orisoScheme.ts`, 332 lines, with `themeSeeds.ts`, `contrastRatio.ts`, `seedUsability.ts`).
- Distance is **CIEDE2000** (culori `differenceCiede2000`), in the table as `dE`. Rule of thumb: <= 2 is hard to see, 5 clearly different, > 10 a different colour. The second number is plain **RGB Euclidean distance** (0 to 441), shown as `dE / RGB`.
- Admin uses a scheme name `inverted` where the Frontend has `light`, `dark`, `inverted`. The Admin has **no dark scheme**.
- Admin "light" means Admin light surfaces; Frontend "light" means the end-user app. Comparing them is the question of this ticket, not a bug of either.

## 3. Per-token difference, light scheme (dE CIEDE2000 / RGB distance)

| token | #1c4f8f | #f8e71c | #ffff00 | #ffd400 | #a5000a (default) | #808080 |
|---|---|---|---|---|---|---|
| `--m3-primary` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-on-primary` | 0 / 0 | 18.8 / 39 | 19.1 / 38 | 18.7 / 40 | 0 / 0 | 6.1 / 11 |
| `--m3-primary-container` | **40.2** / 215 | 12.3 / 36 | 14.7 / 41 | 2.7 / 5 | **44.3** / 280 | 20.4 / 139 |
| `--m3-on-primary-container` | **81.9** / 361 | **45.3** / 145 | **45.5** / 142 | **43.6** / 144 | **83.5** / 359 | 9.6 / 40 |
| `--m3-primary-fixed` | 6.7 / 19 | 22.1 / 194 | 20.9 / 216 | 15.3 / 98 | 2.8 / 12 | 2 / 15 |
| `--m3-primary-fixed-dim` | 9.2 / 39 | 18.3 / 197 | 17 / 193 | 17.7 / 187 | 0 / 0 | 4.8 / 34 |
| `--m3-on-primary-fixed-variant` | 1.1 / 14 | **48.9** / 193 | **52.7** / 214 | **46.9** / 182 | 0 / 0 | 15.2 / 73 |
| `--m3-secondary` | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 |
| `--m3-on-secondary` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-secondary-container` | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 | 0.4 / 2 |
| `--m3-on-secondary-container` | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 |
| `--m3-error` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-on-error` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-surface` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-on-surface` | 1.4 / 2 | 1.4 / 2 | 1.4 / 2 | 1.4 / 2 | 1.4 / 2 | 1.4 / 2 |
| `--m3-surface-container-low` | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 | 0.8 / 1 |
| `--m3-surface-container` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-surface-container-high` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-surface-container-highest` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-on-background` | 10.2 / 15 | 10.2 / 15 | 10.2 / 15 | 10.2 / 15 | 10.2 / 15 | 10.2 / 15 |
| `--m3-on-surface-variant` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-outline` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--m3-outline-variant` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| `--oriso-app-action` | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 8.8 / 52 | 0 / 0 |

24 tokens exist in both engines. Summary per seed (light): mean dE 6.4 (`#1c4f8f`), 7.5 (`#f8e71c`), 7.7 (`#ffff00`), 6.6 (`#ffd400`), 6.4 (default), 3.0 (`#808080`); tokens with dE > 10: 3, 7, 7, 6, 3, 3.

Reading it: the neutral ladder, secondary, error and outline are effectively the same (Admin was calibrated to the same benchmark: `--m3-secondary`: Admin constant `#4c555f` vs Frontend slate, dE 0.4 without an accent seed). Everything that carries the seed colour in a *container or fixed* role differs, and for light seeds (yellows) the Admin's text roles are also different: `--m3-on-primary` is always `#141c25` or white in the Admin (Admin `readableOn`, two options), but a seed-tinted dark (`#1d1d00`) in the Frontend.

Notable values (hex, Frontend vs Admin):

| token | seed | Frontend | Admin |
|---|---|---|---|
| `--m3-primary-container` | default `#a5000a` | `#cc1e1c` | `#ffe2de` |
| `--m3-on-primary-container` | default | `#ffe2de` | `#141c25` |
| `--m3-on-background` | any | `#1b1b1c` | `#281715` (Admin repurposes it as the dark sidebar/stage surface) |
| `--oriso-app-action` | default | `#a5000a` | `#cc1e1c` (Admin pins a Figma value) |
| `--m3-primary-container` | `#1c4f8f` | `#3668ae` | `#dbe3ed` |
| `--m3-on-primary-fixed-variant` | `#ffff00` | `#494900` | `#e0e000` |

The last row is an Admin finding in its own right: for yellow seeds the Admin derives its selected-field text by mixing the seed 12 percent toward black, which gives `#e0e000` on the pale `#ffffd6` selection surface. Contrast ratio measured with the Admin's own `contrastRatio`: **1.38** (WCAG AA wants 4.5). The Frontend value `#494900` on its fixed surface `#eaea00` measures 7.27. The Admin `--m3-primary` for `#ffff00` on the Admin surface `#fcf9f9` is 1.03, and the same primary is the Frontend's too (both engines accept the seed unchanged).

## 4. Inverted scheme (Admin dark shell)

The inverted schemes are far apart: mean dE 8.4 to 15.9 depending on the seed, 7 to 11 tokens above 10, and `--m3-on-background` at **84.1** (Admin `#281715`, the dark stage surface, vs the Frontend's light on-surface tone in the inverted ladder). `--m3-primary` itself differs (Admin takes the *light* accent as primary, the Frontend takes tone 80 of the seed: 8.5 to 23.6). The Admin keeps `applyAdminInvertedTheme` only for "surfaces that opt into the inverted shell (e.g. theme-builder previews)"; no consumer of it was checked in this ticket.

Full inverted table: `research/engine-diff-scratch/report.txt` (generated).

## 5. Tokens that exist in one engine only

Light scheme, same lists on all seeds.

**Frontend only (42):** `--m3-primary-hover`, `--m3-hover-layer`, `--m3-selected-layer`, `--m3-primary-outline`, `--m3-on-primary-fixed`, `--m3-inverse-primary`, `--m3-surface-tint`, `--m3-success`, `--m3-secondary-fixed` (+`-dim`, `on-`, `on-…-variant`), `--m3-tertiary` family (4), `--m3-error-container`, `--m3-on-error-container`, `--m3-surface-container-lowest`, `--m3-surface-dim`, `--m3-surface-bright`, `--m3-background`, `--m3-inverse-surface`, `--m3-inverse-on-surface`, `--m3-surface-variant`, `--m3-shadow`, `--m3-scrim`, `--oriso-primary-fixed*` (4), `--oriso-lottie-*` (2), `--primary`, `--primary-3`, `--hover-primary`, `--skin-color-*` (6). In the inverted scheme the Frontend has 35 and the Admin's inverted palette does cover `--m3-error-container`, `--m3-background`, `--m3-surface-container-lowest`, `--m3-inverse-*` and `--m3-surface-variant`.

**Admin only (33):** `--admin-workspace-background`, `--admin-search-*` (5), `--admin-table-*` (12), `--admin-form-*` (3), `--admin-field-*` (5), `--admin-nav-indicator-surface`, `--admin-nav-indicator-icon`, `--oriso-app-accent`, `--oriso-app-accent-dark`, `--oriso-app-accent-light`, `--oriso-app-on-accent`, `--oriso-app-accent-container`, `--oriso-app-chat-surface`, `--oriso-app-on-action`. Almost all of the `--admin-*` values are hard-coded greys that do not depend on the seed at all (only `--admin-field-selected-*`, `--admin-nav-indicator-*` and the `--oriso-app-accent*` follow the seed).

## 6. Invalid, null and undefined seeds

| input | Frontend engine (`computeOrisoPalette`) | Frontend runtime (`applyTenantPalette`) | Admin engine (`computeOrisoPalette`) | Admin runtime (`applyAdminTheme`) |
|---|---|---|---|---|
| `"notacolor"` | throws `not a valid hex colour` | catches, warns, keeps static default palette | silently falls back to `#a5000a`, `tooPale` = true | `normalizeSeed` throws, caught, static palette kept |
| `null` / `undefined` | throws (`.trim` of null; callers are expected to filter) | `readTenantSeeds` returns null, nothing applied | silently falls back to `#a5000a` | falls back to `DEFAULT_ADMIN_SEED` `#A5000A`, palette applied |
| `"#808080"` | tokens produced, `tooPale` = true | tooPale: keeps static default, nothing applied | tokens produced, `tooPale` = true | applied regardless (warning only in the ThemeBuilder) |

Both engines share the "too pale" threshold, `TOO_PALE_CHROMA = 12` (the Admin copy has its own hand-written CAM16 chroma calculation to avoid the library). For `#808080` both flag it. The runtime behaviour differs: the real app ignores a stored too-pale seed, the Admin applies it. Primary-seed null differs too: the app keeps the compiled default, the Admin paints with `#a5000a`; for a tenant that has no seed these happen to look the same only while the compiled default stays `#a5000a`.

## 7. Admin ThemeBuilder preview vs the real app

Sources: `src/components/Tenants/GeneralSettings/components/ThemeBuilder/index.tsx` and `previewUrl.ts` (Admin) and `src/utils/theme/applyTenantTheme.ts` (Frontend), all on `origin/dev`.

- **Phone mock-ups ("current" and "new"):** an iframe of the real app at `<appURL>/theme-demo?themePreviewPrimary=…&themePreviewAccent=…&themePreviewSignal=…`. The Frontend reads the params (`readPreviewSeeds`, strict 6-digit hex), runs the **Frontend engine** (`computeOrisoPalette(seeds, 'light')`) and sets every returned token on `:root`. So this part is the real engine with the full token set, including `--m3-*`, `--skin-*`, `--primary`. It is only a sandbox: a too-pale seed is painted anyway (on purpose) while a stored one would be ignored. Without a configured app origin that differs from the Admin origin, there is no preview (`isSeparateOrigin`).
- **Summary card and swatches:** `computeOrisoPalette` of the **Admin engine**, three tokens only: `--oriso-app-accent-dark`, `--oriso-app-accent-light`, `--m3-error`. The initial form values also come from the Admin engine when a tenant has no stored value.
- **Resulting mismatch the Träger can see on one screen:** the "accent light" swatch shows the Admin's derived pale container (default `#ffe2de`; mix of the seed with white 84 percent), while the phone next to it applies the same input as a *secondary hue* in the Frontend engine. For a custom accent seed (test: primary `#a5000a`, accent `#1c4f8f`) the shared-token difference reaches dE 44.7 to 56.9 on `--m3-primary-container` / `--m3-primary-fixed`, and `--m3-secondary` differs by 10.5 (Frontend slate tinted blue, Admin fixed `#4c555f`).
- **Signal seed:** `--m3-error` agrees (`#ff6600` in both for the test seed `#ff6600`), but the on-colour differs (`#360f00` Frontend vs `#141c25` Admin, dE 23.6), and the Admin adds a "signal too close to brand" warning (hue distance < 30 degrees) that the Frontend does not have.
- **Admin's own look:** `applyAdminTheme` (not the ThemeBuilder) writes only tokens starting with `--m3-` or `--admin-` from the Admin engine onto the Admin `:root`. That is what the Admin itself looks like for a tenant; it is not what the end-user app shows.

## 8. Material Color Utilities: licence, packages, Java

| item | fact | source |
|---|---|---|
| Licence | Apache-2.0 | GitHub repo `material-foundation/material-color-utilities` (licence file and API licence field); `typescript/package.json` |
| Maintenance | not archived, last push 2026-08-21 | `gh api repos/material-foundation/material-color-utilities` |
| npm package | `@material/material-color-utilities`; latest on npm is `0.4.0`, licence Apache-2.0 | `npm view` |
| Used by Frontend | `0.4.0` (exact pin in `package.json`) | Frontend `package.json` on dev |
| Used by Admin | not a dependency; HCT chroma is hand-copied for the "too pale" check, everything else is RGB mixing | Admin `package.json`, `seedUsability.ts` |
| Official Java | source folder `java/` in the same repo (packages `blend`, `contrast`, `dislike`, `dynamiccolor`, `hct`, `palettes`, `quantize`, `scheme`, `score`, `temperature`, `utils`). Same licence. | repo tree |
| Official Maven artifact | no standalone one found on Maven Central. Google ships it inside `com.google.android.material:material` (Google Maven, latest `1.14.0`, an Android AAR). | `dl.google.com/dl/android/maven2/.../maven-metadata.xml` |
| Third-party Maven ports, Apache-2.0 | `me.tatarka.google.material:material-color-utilities:0.1.2` (Java, pom licence Apache 2.0); `com.materialkolor:material-color-utilities-jvm:3.0.0-beta01` (Kotlin multiplatform, JVM target) | Maven Central |

Caveats: the Java sources and the TypeScript package are two ports of the same algorithm and must be pinned to the same upstream revision, otherwise HCT results can differ in the last digit. The Java mail work in [ORISO-UserService#1252](https://github.com/OpenResilienceInitiative/ORISO-UserService/issues/1252) (given as option A) states that the Java side follows the frontend rules with a shared golden fixture; this research did not find the library in the UserService repo (a code search for `material-color-utilities` returned no hit).

## 9. What it would take for the Admin to use the Frontend engine

Measured facts, not an estimate in days:

1. **Toolchain:** add `@material/material-color-utilities@0.4.0`. The Admin comment says the barrel breaks under Vitest 4 (extensionless ESM imports). Either configure the test runner (inline the dependency, or an alias to the package's `dist`) or vendor the engine like the Frontend does for its own tests. Unmeasured: bundle size effect.
2. **Share the file, do not copy it.** The Frontend `orisoTuning.ts` header already promises "both consumers (admin preview, live frontend) pick it up through the shared engine". That is not what is on dev: the Admin has its own copy. A third location (one package or a vendored copy with a drift test) is a decision for the ADR, not for this ticket.
3. **Seed mapping first.** Decide what the second stored seed (`theming.accent`) means. The two engines read it differently (secondary hue vs light primary container). This is a data-contract question, not a maths question.
4. **Keep an Admin overlay.** 33 tokens (`--admin-*`, `--oriso-app-accent*`, nav indicator, field selection) must be produced by a small Admin-side function on top of the shared output. They are mostly constants, so this is small.
5. **Re-tone the Admin components that read `primary-container` and `on-primary-container`.** This is where the design breaks first (section 1, point 2). Options: Admin keeps its own role mapping for these two (an overlay), or the Admin components switch to `--m3-primary-fixed` and `--m3-on-primary-fixed-variant`, which are close for the default seed (dE 2.8 and 0) but not for yellow seeds (dE 17 to 53).
6. **Yellow seeds need a decision regardless of engine.** The Admin's current selected-text colour fails contrast for `#ffff00` (1.38). The Frontend's version passes (7.27 on its surface).
7. **Before and after check:** per the map's no-bazooka rule, every swap needs a before/after screenshot of the Admin shell for at least the default seed, `#1c4f8f` and `#ffd400`. Not done here (no screenshots were taken; this ticket is numbers only).

## 10. Open items this research did not answer

- Deployed Dev was not probed; everything is `origin/dev` source.
- Which Admin components actually consume `--m3-primary-container` and `--m3-on-primary-container` (it is the first thing a follow-up should grep, together with the static fallbacks in Admin `src/app.css`).
- The `inverted` scheme: whether anything still uses it.
- Bundle size and first-paint effect of the library in the Admin.
- Whether the Java ports give bit-identical hex to the 0.4.0 TypeScript output; that is the golden-fixture question of #1252.
