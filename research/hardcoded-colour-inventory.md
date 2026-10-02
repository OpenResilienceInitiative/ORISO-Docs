# Hard-coded colour inventory (Admin, Frontend, Element Call)

Research for wayfinder ticket ORISO-Docs#146, child of map ORISO-Docs#144. Read-only. Measured against `origin/dev` of ORISO-Admin, ORISO-Frontend and (default branch of) ORISO-ElementCall on 2026-10-02 (shallow clones of GitHub, because the local checkouts were off limits for git).

## 1. Short answer

- **The earlier counts (Admin ~277 lines, Frontend ~557) were too low.** A scan of every `.ts/.tsx/.js/.jsx/.css/.scss/.less/.html` under `src/` (minus tests, stories, fixtures, generated files and the engine files) finds **1537 colour lines in Admin** and **2632 in Frontend**. The Frontend rgba figure is reproduced (421 lines vs ~441), the hex figure is not (878 bare-literal hex lines vs ~114), so the earlier hex pattern was narrower (probably 6-digit hex outside SCSS). Where they are not bare literals they are `var(--m3-x, #hex)` fallbacks, see next point.
- **Most hex is not a hard-coded colour in the visual sense: it is a copied token value.** Of the colour lines, Admin has 876 `var(--token, #hex)` fallback lines, 201 definition lines and only **476 bare literal lines**. Frontend has 1148 fallback lines, 151 definitions and **1333 bare literal lines**. The bare literals are the real inventory; the fallbacks are a separate (cheaper) clean-up.
- **Admin and Frontend run two different colour engines.** Same token name, different colour: `--m3-primary-container` is `#ffe2de` (pale rose) in Admin and `#cc1e1c` (brand red) in Frontend; `--m3-on-primary-container` is `#141c25` vs `#ffe2de`. See section 3. This is the root of "Admin looks paler than the app" and it must be settled in the ADR before any token swap in Admin.
- **Crutches are plentiful and mostly invisible to swap.** Of the opaque, non-intentional bare literals, 59 % (Admin) and 51 % (Frontend) equal a token (ΔE <= 1), and 80 % / 71 % are within ΔE 3 (a pasted `on-surface-variant`, `secondary`, `secondary-container`, `outline-variant`, surface steps). Only 10 % / 17 % have no token within ΔE 6: foreign palettes (Material 2014 reds, Tailwind greys, stock M3 baseline purples, pure greys, iOS red) that need a decision, not a mechanical swap. Biggest single decision: the **danger red** (Frontend: 100 literals of `#d32f2f`, `#c62828`, `#ff0000` ...; the engine says error = magenta `#b1005e`).

## 2. Method, scope and rules

**Scope.** Admin: `src/`, `public/`. Frontend: `src/`, `public/`. Element Call: `src/`, `embedded/`. Excluded and counted separately: tests/stories/fixtures/snapshots, generated files (`src/utils/theme/generated/*`, Element Call `src/oriso-theme.css`), and the engine/tuning files (`utils/theme/orisoScheme.ts`, `orisoTuning.ts`, `applyTenantTheme.ts`, `callTheme.ts`, `utils/anonName/*`). Comments are stripped before matching, 4-digit numbers like `#1499` (issue references) are dropped.
Excluded counts (colour occurrences): Admin engine 72, Admin test/story 575, ElementCall generated 152, Frontend engine 70, Frontend generated 148, Frontend html 9, Frontend test/story 605.

**What counts as a colour.** hex (3/4/6/8 digits), `rgb()/rgba()/hsl()/hsla()`, CSS colour words (`red`, `white`, ...) in colour properties, and the hex inside `var(--x, #fallback)`. A colour is classified by use:
- `literal`: a bare colour in a declaration or JS style object (the real crutch candidates).
- `fallback`: the second argument of `var(--token, #hex)`.
- `definition`: a Sass/Less/CSS-variable definition line (`$x: #hex`, `@x: #hex`, `--x: #hex`).

**Distance rule.** CIEDE2000 (ΔE) between sRGB colours (D65). `ΔE <= 1` = same colour for a human; `<= 3` = near-duplicate (needs a side-by-side to notice); `<= 6` = nearest-token candidate, small visible change; `> 6` = no token (foreign palette). Alpha colours are compared by their base colour; the alpha stays (`color-mix(in srgb, var(--token) 8%, transparent)`).
**Reference token values.** Frontend engine (`computeOrisoPalette({primary:"#a5000a"}, "light")`, run on `origin/dev`), Admin engine (same call on `admin/src/utils/theme/orisoScheme.ts`), Figma `Light.tokens.json` (`src/utils/theme/__fixtures__`, variables Schemes / Palettes / Add-ons).

### Totals (src files only)

| Repo | colour lines | bare literal lines | `var(--x,#hex)` fallback lines | definition lines | colour occurrences | distinct colours |
|---|---|---|---|---|---|---|
| Admin | 1537 | 476 | 876 | 201 | 1606 (hex 1409, rgb/hsl 169, words 28) | 219 |
| Frontend | 2632 | 1333 | 1148 | 151 | 2661 (hex 2145, rgb/hsl 431, words 85) | 404 |
| ElementCall | 18 | 12 | 0 | 6 | 18 (hex 9, rgb/hsl 8, words 1) | 7 |

Element Call: the ORISO colours come from the generated `src/oriso-theme.css` (152 `--cpd-*` properties, seed `#a5000a`, written by `ORISO-Frontend scripts/generate-call-theme.ts`, drift-tested). Outside it only 18 colour lines remain, all upstream Element Call: `#000` video backdrops, black/white alpha shadows and overlays, `--stopgap-*` greys. Nothing there is an ORISO crutch.

## 3. Token canon (what a hex can be mapped to)

**Frontend engine, `--m3-*` names (50):** `--m3-background`, `--m3-error`, `--m3-error-container`, `--m3-hover-layer`, `--m3-inverse-on-surface`, `--m3-inverse-primary`, `--m3-inverse-surface`, `--m3-on-background`, `--m3-on-error`, `--m3-on-error-container`, `--m3-on-primary`, `--m3-on-primary-container`, `--m3-on-primary-fixed`, `--m3-on-primary-fixed-variant`, `--m3-on-secondary`, `--m3-on-secondary-container`, `--m3-on-secondary-fixed`, `--m3-on-secondary-fixed-variant`, `--m3-on-surface`, `--m3-on-surface-variant`, `--m3-on-tertiary`, `--m3-on-tertiary-container`, `--m3-outline`, `--m3-outline-variant`, `--m3-primary`, `--m3-primary-container`, `--m3-primary-fixed`, `--m3-primary-fixed-dim`, `--m3-primary-hover`, `--m3-primary-outline`, `--m3-scrim`, `--m3-secondary`, `--m3-secondary-container`, `--m3-secondary-fixed`, `--m3-secondary-fixed-dim`, `--m3-selected-layer`, `--m3-shadow`, `--m3-success`, `--m3-surface`, `--m3-surface-bright`, `--m3-surface-container`, `--m3-surface-container-high`, `--m3-surface-container-highest`, `--m3-surface-container-low`, `--m3-surface-container-lowest`, `--m3-surface-dim`, `--m3-surface-tint`, `--m3-surface-variant`, `--m3-tertiary`, `--m3-tertiary-container`.

**Admin engine writes 23 `--m3-*` names** (it is a separate hand-rolled 332-line file, `ORISO-Admin src/utils/theme/orisoScheme.ts`, not a copy of the Frontend one; it lacks `--m3-background`, `--m3-error-container`, `--m3-hover-layer`, `--m3-inverse-on-surface`, `--m3-inverse-primary`, `--m3-inverse-surface`, `--m3-on-error-container`, `--m3-on-primary-fixed`, `--m3-on-secondary-fixed`, `--m3-on-secondary-fixed-variant`, `--m3-on-tertiary`, `--m3-on-tertiary-container`, `--m3-primary-hover`, `--m3-primary-outline`, `--m3-scrim`, `--m3-secondary-fixed`, `--m3-secondary-fixed-dim`, `--m3-selected-layer`, `--m3-shadow`, `--m3-success`, `--m3-surface-bright`, `--m3-surface-container-lowest`, `--m3-surface-dim`, `--m3-surface-tint`, `--m3-surface-variant`, `--m3-tertiary`, `--m3-tertiary-container`) plus its own `--admin-*` (25 surfaces for fields, tables, search, nav) and `--oriso-app-accent*` properties. `src/app.css` defines static copies of about 26 `--m3-*` and 29 `--admin-*` values for first paint. Frontend mirrors its static copies in `src/resources/styles/mui-variables-mapping.scss` (34 `--m3-*`). Figma has the same role names (`Primary Container` = `M3/sys/light/primary-container`) plus Palettes (tone steps 0-100 per family), Add-ons (`Section background #F5F5F5`) and Surfaces (tint overlays).

**Same name, different colour (default seed `#a5000a`, light):**

| Token | Frontend engine | Admin engine | Admin `app.css` static | Figma fixture |
|---|---|---|---|---|
| `--m3-primary-container` | #cc1e1c | #ffe2de | #ffe2de | #cc1e1c |
| `--m3-on-primary-container` | #ffe2de | #141c25 | #141c25 | #ffe2de |
| `--m3-primary-fixed` | #ffdad5 | #ffe2de | #ffe2de | #ffdad5 |
| `--m3-secondary` | #4d5660 | #4c555f | #4c555f | #655f65 |
| `--m3-secondary-container` | #656e79 | #646d78 | #646d78 | #646d78 |
| `--m3-on-secondary-container` | #e6effb | #e7effc | #e7effc | #e7effc |
| `--m3-on-surface` | #1b1b1c | #1a1c1e | #1b1b1c | #1b1b1c |
| `--m3-surface-container-low` | #f6f3f3 | #f7f3f4 | #f6f3f3 | #f6f3f3 |
| `--m3-on-background` | #1b1b1c | #281715 | #281715 | #281715 |

The Figma fixture is itself stale for `Secondary` (`#655F65`, while its own State Layers use `#4C555F`). So "secondary" currently exists as five values: `#655f65` (fixture), `#4c555f` (Admin engine, app.css, 28+ Frontend literals), `#4d5660` (Frontend engine), `#4b515a` (Frontend fallbacks, 28 uses) and `#555f6b` (one Admin fallback). All within ΔE 2.1 of each other: invisible, but five sources of truth.

## 4. `var(--token, #hex)` fallbacks

Both apps define the tokens statically on `:root` and write the engine result at runtime, so almost every fallback is dead code. The audit compares the fallback hex with the engine value of the token it sits in:

| Repo | aligned (ΔE<=1) | drifted (1-6) | mismatched (>6) | other var (`--admin-*`, `--oriso-*`, `--md-sys-*`) | token never defined (fallback can render) |
|---|---|---|---|---|---|
| Admin | 573 | 27 | 53 | 242 | 30 (engine writes them at runtime; no static copy in `app.css`) |
| Frontend | 864 | 139 | 114 | 35 | 29 (no static copy in `mui-variables-mapping.scss`; engine writes them once a tenant palette loads) |

Where the fallback disagrees with the token (examples; counts are uses): 
- `--m3-error` with `#ba1a1a` (stock M3 red, Admin 14) or `#cc0000` (Admin 1, Frontend 9), engine says `#b1005e`.
- `--m3-on-surface-variant` with `#49454f` (stock M3 baseline, Admin 9) or `#4c555f` (the secondary, Frontend 10): engine says `#444748`.
- `--m3-primary-container` with `#ffe2de` (Admin 6): Admin inverts the role, the Frontend engine says `#cc1e1c`.
- `--m3-primary` with `#273270` (navy, Admin 4), `#005cbb`, `#4c555f`, `#c0121f`: wrong brand.
- `--m3-secondary` with `#4b515a` (Frontend 18, ΔE 2.1) and `--m3-surface` with `#ffffff` (Frontend 19, ΔE 1.3): drift, harmless today.
Because a fallback only renders when the token is undefined, deleting them is visually neutral wherever the token is defined on `:root` (all Admin tokens in `app.css`, 34 Frontend tokens in `mui-variables-mapping.scss`). The fallbacks are therefore a lint/clean-up item, not a visual risk; the exceptions are `--m3-error-container`, `--m3-on-error-container` and `--m3-inverse-*` in Frontend, which have no static definition (add them to the static block first).

## 5. Mapping table (bare literals, grouped)

Counts are **bare literal occurrences** `Admin / Frontend / Element Call`; "+fb" is the number of `var(--x, #hex)` fallbacks of the same cluster (separate clean-up, no visual change). `@a` = used with alpha. Distances are to the proposed token.

| Cluster | Values (n) | Count A / F / EC (+fb A / F) | Main files | Proposed token | Kind | Expected visual change |
|---|---|---|---|---|---|---|
| shadow / scrim / gradient stop | `#000000@a` (106), `#ffffff@a` (14), `#000000` (10), `#ffffff` (8), `#141c25@a` (4) | 57 / 121 / 1 (+27 / 12) | A:`styles.module.scss` (15), F:`NotFound.tsx` (12), A:`M3RichTextEditor.module.scss` (11) | keep; use `--m3-shadow` / `--m3-scrim` as the colour base where the value is plain black | intentional | none if only the base colour moves to `--m3-shadow` (black); 53 Admin and 92 Frontend of these carry alpha |
| black with alpha (state layer / scrim / hairline) | `#000000@a` (163) | 32 / 129 / 2 (+4 / 10) | A:`styles.module.scss` (22), F:`WaitingQueueActionBar.styles.scss` (18), F:`GroupCallWidget.scss` (8) | keep; state layers of text colour -> `color-mix(in srgb, var(--m3-on-surface) N%, transparent)`, scrims -> `--m3-scrim` | intentional (mostly) | identical for pure-black layers; tiny where moved to on-surface (`#1b1b1c` vs `#000`) |
| #fff as text/icon on colour | `#ffffff` (160) | 43 / 116 / 1 (+27 / 71) | A:`styles.module.scss` (15), F:`messageSubmitInterface.styles.scss` (9), F:`GroupCallWidget.scss` (9) | `--m3-on-primary` (on brand), `--m3-on-secondary` (on slate), `--m3-on-error` (on error) | crutch | identical for the default seed; changes by design for pale tenant seeds (on-primary turns dark) - desired, test with a pale seed |
| #fff as surface | `#ffffff` (144) | 23 / 120 / 1 (+17 / 63) | F:`message.styles.scss` (13), F:`messageSubmitInterface.styles.scss` (12), A:`statistic.less` (9) | `--m3-surface-container-lowest` | crutch | identical (`#ffffff`) |
| danger / destructive reds (Material, Tailwind, iOS, pure red) | `#d32f2f` (18), `#c62828` (14), `#ff0000` (8), `#d32f2f@a` (7), `#dc2626` (3) | 7 / 100 / 0 (+16 / 11) | F:`navigation.styles.scss` (14), F:`messageSubmitInterface.styles.scss` (9), F:`FloatingCallWidget.scss` (9) | `--m3-error` (`#b1005e`, owner-confirmed magenta 2026-07-29) OR `--m3-primary-container` (brand red `#cc1e1c`) - **needs one product decision** | unclear | visible if mapped to `--m3-error` (red -> magenta, ΔE 10-15); small if mapped to primary-container (ΔE 3-5). Look at: Frontend sidebar logout/leave, call hang-up buttons, anonymous-chat leave |
| 404 page illustration | `#000000` (15), `#171717` (11), `#a85103` (4), `#353535` (4), `#1d0e01` (3) | 0 / 93 / 0 (+0 / 0) | F:`NotFound.tsx` (93) | keep (illustration art in `NotFound.tsx`, 39 colours); not a token problem | intentional | none |
| near `--m3-on-surface` | `#1b1b1c@a` (27), `#1b1b1c` (15), `#1c1b1f` (14), `#1e1e1e` (4), `#1a1a1a` (3) | 11 / 63 / 0 (+122 / 97) | A:`styles.module.scss` (9), F:`conversationCreate.styles.scss` (7), F:`switch.module.scss` (6) | `--m3-on-surface` | crutch | visible, small (max ΔE 3.4) - Body text. `#1b1b1c` exact; `#1c1b1f` (stock M3) ΔE 2.5, `#1e1e1e`/`#1a1a1a` tiny. |
| near `--m3-secondary` | `#4c555f` (36), `#4b515a` (8), `#4a535e` (6), `#4c5967` (3), `#4c555f@a` (3) | 23 / 42 / 0 (+27 / 114) | A:`styles.module.scss` (12), F:`MessageItemComponent.tsx` (9), A:`statistic.less` (7) | `--m3-secondary` | crutch | tiny (max ΔE 2.6) - The pasted "secondary" (icon fills in SVG attributes too). `#4c555f` ΔE 0.4: identical. Also Figma palette steps `#4a535e` (Secondary 35), `#4c5967`: tiny. |
| opaque #000 | `#000000` (58) | 18 / 36 / 4 (+0 / 0) | F:`theme.jsx` (12), A:`styles.module.scss` (9), F:`sanitize.css` (3) | mostly `--m3-on-surface` (text) or `--m3-scrim`/`--m3-shadow` (video backdrops, backdrops) | unclear | text `#000` -> `#1b1b1c`: visible, small (ΔE ~7, mostly on large headings/icons); backdrops identical |
| near `--m3-on-surface-variant` | `#444748` (29), `#444748@a` (10), `#3b4044` (9), `#3d3d3d` (4), `#555555` (1) | 27 / 28 / 0 (+165 / 76) | A:`styles.module.scss` (14), A:`M3RichTextEditor.module.scss` (5), F:`sessionsList.styles.scss` (5) | `--m3-on-surface-variant` | crutch | visible, small (max ΔE 5.3) - Muted text/icons. `#444748` is the token; `#3b4044`, `#3d3d3d` slightly different greys (tiny to small). |
| white with alpha (glass / state layer on dark) | `#ffffff@a` (50) | 5 / 44 / 1 (+0 / 0) | F:`messageSubmitInterface.styles.scss` (4), F:`RegistrationTopicSearch.tsx` (3), F:`HandoverGateButton.tsx` (3) | keep; on-brand state layers -> `color-mix` of `--m3-on-primary` | intentional | none |
| neutral grey (no token within dE 6) | `#666666` (9), `#3f373f` (4), `#999999` (4), `#9e9e9e` (4), `#7d8792` (3) | 11 / 29 / 0 (+12 / 22) | F:`SessionHeaderComponent.tsx` (6), A:`statistic.less` (3), A:`styles.module.scss` (3) | nearest neutral: `--m3-outline` (#666/#757575/#808080), `--m3-on-surface-variant` (#555/#3f373f), `--m3-outline-variant` (#999/#ccc). Legacy `--light-grey`, `--form-primary` family: delete | crutch | small to visible (ΔE 6-10) text greys get darker/lighter by one step |
| mail palette (inline hex needed in mail clients) | `#ffffff` (9), `#a5000a` (6), `#f2efef` (2), `#e0dada` (2), `#1d1b1b` (2) | 20 / 17 / 0 (+16 / 0) | F:`emailTokens.ts` (11), A:`dpaMailPreviewStory.ts` (10), A:`emailKit.ts` (8) | keep as inline hex; the map owns the mail track (UserService#1252, Option A). Generate from the engine, do not hand-edit | unclear (other track) | none for the app |
| stage/lamp/orbital effects | `#ffffff@a` (9), `#ffb4a8@a` (5), `#ffffff` (4), `#ffece4@a` (3), `#000000@a` (1) | 3 / 33 / 0 (+1 / 42) | F:`StageLayout.styles.scss` (9), F:`lampMapEffect.ts` (8), F:`stage.styles.scss` (6) | keep; brand-tinted stop colours could read `--m3-primary-fixed` later | intentional | none |
| blue/info family (no token) | `#273270` (9), `#6ba6ff` (7), `#b3e5fc` (3), `#1e88e5@a` (3), `#b3d4fc` (2) | 18 / 16 / 0 (+8 / 0) | A:`styles.module.scss` (8), A:`statistic.less` (6), F:`message.styles.scss` (6) | no token. Admin `#273270` navy text-button/outline colour = legacy `--primary`/`--info-color`: decide (`--m3-primary`? `--m3-secondary`?). `#6ba6ff`/`#1e88e5`/`#199fff` chart/progress blues: chart palette | unclear | visible: navy -> brand red or slate |
| near `--m3-secondary-container` | `#646d78` (11), `#6b7280` (9), `#687180` (7), `#737b86` (2), `#646d78@a` (2) | 20 / 13 / 0 (+19 / 29) | A:`statistic.less` (9), A:`styles.module.scss` (5), A:`UserManagementTable.module.scss` (4) | `--m3-secondary-container` | crutch | visible, small (max ΔE 5.3) - `#646d78` identical. `#6b7280`/`#687180` (Tailwind/statistic greys) ΔE 2-3. |
| green/success family (no token) | `#6cad96` (4), `#10b981` (3), `#1d6b3a` (3), `#b2f2bb` (2), `#059669` (2) | 3 / 28 / 0 (+0 / 0) | F:`FloatingCallWidget.scss` (4), F:`typingIndicator.styles.scss` (4), F:`session.styles.scss` (4) | `--m3-success` (`#0a882f`) for statuses; `#6cad96`/`#9ecab9` typing/online dots are a muted brand-adjacent green: add `--m3-success-container` or keep | unclear | visible |
| near `--m3-on-secondary-container` | `#e7effc` (15), `#eef2f7` (4), `#e7effc@a` (4), `#eef3f8` (3), `#edf2f7` (1) | 20 / 11 / 0 (+18 / 10) | A:`statistic.less` (9), A:`protectedLayout.less` (7), A:`styles.module.scss` (4) | `--m3-on-secondary-container` | crutch | visible, small (max ΔE 3.3) - `#e7effc` identical (Figma value; engine `#e6effb`). `#eef2f7`-family pale blue-greys ΔE ~3. |
| CSS colour word / antd Tag preset (red, green, blue, white) | `#008000` (10), `#ff0000` (10), `#0000ff` (3), `#808080` (2), `#ffa500` (2) | 18 / 11 / 0 (+0 / 0) | A:`InviteCsvImportModal.tsx` (8), A:`index.tsx` (6), F:`IncomingVideoCall.tsx` (3) | antd `<Tag color="green|red|blue">` presets -> `--m3-success` / `--m3-error` / `--m3-secondary` via a themed Tag wrapper; CSS `red` in `ConsultantSearchLoader` (animated stripes) keep | unclear | visible: antd preset green `#52c41a`-family and red become brand success/magenta |
| near `--m3-outline-variant` | `#b8b8b8` (10), `#c4c7c8` (7), `#cccccc` (3), `#c4bfc4` (3), `#c6c5c4` (2) | 6 / 22 / 0 (+49 / 43) | F:`sessionHeader.styles.scss` (5), A:`styles.module.scss` (3), A:`antdM3Theme.ts` (2) | `--m3-outline-variant` | crutch | visible, small (max ΔE 5.3) - Hairlines. `#c4c7c8` identical; `#b8b8b8`, `#cccccc`, `#c4bfc4` grey borders ΔE 2-5. |
| near `--m3-primary-fixed` | `#ffd1d1` (8), `#ffd1d1@a` (3), `#ffd8d5` (2), `#ffdad5` (2), `#efc5c5` (2) | 3 / 24 / 0 (+6 / 53) | F:`sessionHeader.styles.scss` (5), F:`sessionsListItem.styles.scss` (3), F:`waitingAreaCountdown.styles.scss` (2) | `--m3-primary-fixed` | crutch | visible, small (max ΔE 5.8) - Pale rose `#ffd1d1`, `#ffdad5`, `#ffcdd2`: `#ffdad5` identical, others ΔE 1-6. |
| near `--m3-on-secondary-fixed` | `#141c25` (11), `#111923` (6), `#1f2937` (6), `#111827` (2), `#1c2735` (1) | 18 / 8 / 1 (+3 / 2) | A:`statistic.less` (12), A:`styles.module.scss` (6), F:`AnonymousConsentGate.styles.scss` (3) | `--m3-on-secondary-fixed` | crutch | visible, small (max ΔE 4.9) - Dark slate text `#141c25` identical (Figma Secondary 10); `#1f2937`/`#111827` Tailwind, ΔE ~4-5. Mostly `statistic.less`. |
| near `--m3-primary` | `#a5000a@a` (14), `#a5000a` (12) | 5 / 21 / 0 (+122 / 183) | F:`WaitingQueueActionBar.styles.scss` (3), A:`app.css` (2), F:`theme.jsx` (2) | `--m3-primary` | crutch | identical (max ΔE 0.0) - `#a5000a` literal and rgba tints (8-12% hover/selected layers: use `color-mix`). Identical for the default seed; for other tenants these literals stay brand red: that is a real bug per tenant, not a visual check on default. |
| near `--m3-secondary-fixed` | `#d8e0e9` (10), `#e1e6ee` (6), `#dbe7f5` (2), `#d9e4ef` (2), `#dae3f0` (2) | 16 / 8 / 0 (+2 / 3) | A:`statistic.less` (15), F:`message.styles.scss` (4), F:`messageSubmitInterface.styles.scss` (2) | `--m3-secondary-fixed` | crutch | tiny (max ΔE 2.4) - Pale slate borders/surfaces `#d8e0e9`, `#e1e6ee`: ΔE 1.9-2.4. |
| orange/yellow/warning family (no token) | `#ff9f00` (3), `#ffcc80` (3), `#fff59d` (3), `#7a4d05` (1), `#442c00` (1) | 2 / 19 / 0 (+4 / 4) | F:`messageSubmitInterface.styles.scss` (5), F:`message.styles.scss` (5), F:`encryptionBanner.styles.scss` (3) | **no warning token exists**: `#ff9f00`/`#fff3e0`/`#de8a00` (legacy `--warning-*`, `--yellow-1..6`, DPIA warn); candidate new `--m3-warning` / `--m3-warning-container` (check against Figma first) | unclear | n/a until the token exists |
| near `--m3-surface-dim` | `#d4d8de` (6), `#d9d9d9` (4), `#d1d5db` (4), `#d3d0d1` (2), `#d3d3d3` (1) | 10 / 11 / 0 (+0 / 2) | A:`styles.module.scss` (6), F:`FloatingCallWidget.scss` (3), F:`sessionsList.styles.scss` (3) | `--m3-surface-dim` | crutch | visible, small (max ΔE 4.0) - Mid-light greys `#d4d8de`, `#d9d9d9`, `#d1d5db`: ΔE 2-4. |
| near `--m3-surface-container-low` | `#f6f3f3` (9), `#f7f3f4` (2), `#f3f4f6` (2), `#f2f2f2` (2), `#f5f5f5` (2) | 6 / 14 / 0 (+38 / 17) | F:`navigation.styles.scss` (5), A:`antdM3Theme.ts` (3), A:`M3RichTextEditor.module.scss` (2) | `--m3-surface-container-low` | crutch | tiny (max ΔE 2.5) - `#f6f3f3` identical; `#f5f5f5`/`#f2f2f2` MUI greys ΔE ~1.5-2.5. |
| near `--m3-surface-container-highest` | `#e8e8e8` (5), `#e0e0e0` (4), `#dddddd` (3), `#dcdcdc` (2), `#e5e2e2` (1) | 0 / 20 / 0 (+33 / 7) | F:`emojiPicker.styles.scss` (3), F:`MatrixCallView.styles.scss` (3), F:`waitingAreaCountdown.styles.scss` (2) | `--m3-surface-container-highest` | crutch | tiny (max ΔE 2.2) - `#e4e2e2`; `#e8e8e8`/`#e0e0e0`/`#ddd` ΔE 1-2.2. |
| rich-text highlight/colour picker palette | `#b3e5fc` (3), `#ffcc80` (3), `#fff59d` (3), `#ffcdd2` (2), `#b2f2bb` (2) | 5 / 11 / 0 (+0 / 0) | F:`TipTapComposer.tsx` (6), A:`M3RichTextEditor.tsx` (5), F:`richtextHelpers.ts` (5) | keep; user-selectable text highlight colours (`#fff59d`, `#ffcc80`, `#b3e5fc`, `#ffcdd2`, `#b2f2bb` in Frontend, 5 swatches in Admin) are content colours | intentional | none |
| red/danger family (no token) | `#ffb3ba` (3), `#e5a5ae` (2), `#ffb1c8` (2), `#5c1416` (1), `#f8bbd0` (1) | 1 / 12 / 0 (+2 / 2) | F:`PseudonymActionBar.tsx` (3), F:`draftsCenter.styles.scss` (2), F:`sessionHeader.styles.scss` (2) | pink pastels (`#ffb3ba` cell art in `PseudonymActionBar`, `#f8bbd0` highlight swatch): illustration/highlight | intentional / unclear | none |
| near `--m3-primary-container` | `#cc1e1c` (8), `#cc1e1c@a` (5) | 0 / 13 / 0 (+0 / 50) | F:`theme.jsx` (3), F:`sessionsListItem.styles.scss` (2), F:`_listItemSelection.scss` (1) | `--m3-primary-container` | crutch | identical (max ΔE 0.0) - `#cc1e1c` identical (brand red surfaces, tints). Frontend only; in Admin this token means `#ffe2de` (see section 3). |
| near `--m3-on-primary-container` | `#ffe2de` (5), `#ffe6e4` (1), `#ffe2de@a` (1), `#ffe7e7` (1), `#f1d5d5` (1) | 3 / 9 / 0 (+5 / 17) | F:`messageSubmitInterface.styles.scss` (2), F:`AnonymousChat.tsx` (2), F:`SessionItemComponent.tsx` (2) | `--m3-on-primary-container` (Frontend) / `--m3-primary-container` (Admin) | crutch | visible, small (max ΔE 4.4) - `#ffe2de` identical. Name collision between repos: decide the role first. |
| near `--m3-on-primary` | `#f9fafb` (4), `#f8fafc` (2), `#f2f5f8` (1), `#f2f6fb` (1), `#fdfdfd` (1) | 4 / 8 / 0 (+0 / 0) | A:`statistic.less` (3), F:`messageSubmitInterface.styles.scss` (2), F:`profile.styles.scss` (2) | `--m3-on-primary` or `--m3-surface-container-lowest` | crutch | visible, small (max ΔE 3.3) - Near-white `#f9fafb`, `#f8fafc`, `#fdfdfd` (ΔE 1-3): fold into `surface-container-lowest`/`surface`. |
| near `--m3-surface-variant` | `#e5e7eb` (10), `#e8eaed` (1), `#e0e3e3@a` (1) | 1 / 11 / 0 (+3 / 6) | F:`profile.styles.scss` (6), F:`login.styles.scss` (2), A:`styles.module.scss` (1) | `--m3-surface-variant` | crutch | tiny (max ΔE 2.5) - Tailwind `#e5e7eb` hairline (Frontend profile/login/drafts) ΔE 2.5. |
| near `--m3-surface-container` | `#f0edee` (6), `#eeeeee` (5), `#efefef` (1) | 2 / 10 / 0 (+19 / 22) | F:`emojiPicker.styles.scss` (2), A:`FormPluginEditor.styles.scss` (1), A:`antdM3Theme.ts` (1) | `--m3-surface-container` | crutch | tiny (max ΔE 1.7) - `#f0edee` identical; `#eee` ΔE 1.7. |
| near `--m3-on-secondary-fixed-variant` | `#3f4753` (4), `#3d444d` (3), `#3f4852` (2), `#33475b` (1), `#404852` (1) | 3 / 9 / 0 (+1 / 3) | F:`messageSubmitInterface.styles.scss` (2), F:`message.styles.scss` (2), A:`statistic.less` (1) | `--m3-on-secondary-fixed-variant` | crutch | visible, small (max ΔE 4.9) - Dark slate fills `#3f4753`, `#3d444d`: ΔE 1.5. |
| near `--m3-tertiary` | `#56616c` (6), `#5c6672` (1), `#63636a` (1), `#5b6470` (1), `#5f6368` (1) | 9 / 3 / 0 (+2 / 4) | A:`styles.module.scss` (5), A:`UserManagementTable.module.scss` (2), A:`statistic.less` (1) | `--m3-tertiary` | crutch | visible, small (max ΔE 4.9) - Admin table chips/rows `#56616c` (ΔE 1.1). |
| near `--m3-inverse-surface` | `#2d2d2d` (6), `#303031` (3), `#333333` (2), `#373737` (1) | 4 / 8 / 0 (+1 / 5) | F:`FloatingCallWidget.scss` (3), F:`MatrixCallView.styles.scss` (3), A:`M3RichTextEditor.module.scss` (2) | `--m3-inverse-surface` | crutch | tiny (max ΔE 2.3) - Dark call/toast surfaces `#2d2d2d`, `#303031`, `#333`: ΔE 0-2. |
| near `--m3-surface-tint` | `#bd000d` (6), `#b91c1c` (4), `#b71c1c` (1) | 6 / 5 / 0 (+14 / 3) | A:`statistic.less` (4), F:`theme.jsx` (4), A:`emptyState.less` (1) | `--m3-surface-tint` | unclear | tiny (max ΔE 1.8) - Reds `#bd000d`, `#b91c1c`: tint role is not a text/danger role. Probably the danger decision below, not a token. |
| near `--m3-secondary-fixed-dim` | `#bec7d4` (5), `#b8c4d1` (2), `#c7d4e4` (1), `#bec8d7` (1), `#c4c6cf` (1) | 7 / 3 / 1 (+0 / 4) | A:`statistic.less` (4), A:`styles.module.scss` (3), F:`messageSubmitInterface.styles.scss` (2) | `--m3-secondary-fixed-dim` | crutch | visible, small (max ΔE 3.4) - `#bec7d4` identical. |
| near `--m3-on-primary-fixed` | `#410001` (9), `#410004` (1) | 6 / 4 / 0 (+3 / 17) | A:`protectedLayout.less` (4), A:`styles.module.scss` (1), A:`antdM3Theme.ts` (1) | `--m3-on-primary-fixed` | crutch | identical (max ΔE 0.8) - `#410001` identical (nav indicator, dark rose text). |
| near `--m3-selected-layer` | `#fde8e8` (2), `#ffebee` (2), `#fdecea` (1), `#f8e6e7` (1), `#fdeded` (1) | 2 / 8 / 0 (+1 / 2) | F:`AnonymousChat.tsx` (2), A:`statistic.less` (1), A:`emptyState.less` (1) | `--m3-selected-layer` / `--m3-primary-fixed` | crutch | tiny (max ΔE 2.7) - Pale rose panels (`#fde8e8`, `#ffebee`): ΔE 2-3. |
| near `--m3-tertiary-container` | `#9ba4b0` (5), `#9d9da4` (2), `#8b94a1` (1), `#9ca3af` (1) | 3 / 6 / 0 (+1 / 5) | A:`statistic.less` (3), F:`sessionsListItem.styles.scss` (3), F:`theme.jsx` (1) | `--m3-tertiary-container` | crutch | visible, small (max ΔE 5.1) - `#9ba4b0` identical; `#9ca3af` Tailwind ΔE ~2. |
| near `--m3-surface` | `#fcf9f9` (3), `#faf6f6` (1), `#fcf9f9@a` (1), `#fbf8f3@a` (1), `#faf6f3` (1) | 2 / 5 / 0 (+10 / 14) | A:`antdM3Theme.ts` (2), F:`profile.styles.scss` (1), F:`switch.module.scss` (1) | `--m3-surface` | crutch | tiny (max ΔE 2.6) - `#fcf9f9` identical; `#faf6f6` ΔE ~2. |
| near `--m3-surface-container-high` | `#eae7e8` (4), `#e3e4ea` (1), `#e6e2e3` (1), `#e8e4e5` (1) | 1 / 6 / 0 (+36 / 28) | F:`navigation.styles.scss` (2), F:`notificationsCenter.styles.scss` (2), A:`statistic.less` (1) | `--m3-surface-container-high` | crutch | tiny (max ΔE 2.9) - `#eae7e8` identical. |
| near `--m3-shadow` | `#0c0c0d@a` (4), `#0b0b0b` (2), `#111111` (1) | 0 / 7 / 0 (+0 / 0) | F:`GroupCallWidget.scss` (3), F:`m3Dialog.styles.scss` (2), F:`OrisoDialog.tsx` (2) | `--m3-shadow` | intentional | tiny (max ΔE 3.0) - Near-black shadow tints (`#0c0c0d`@5-10%). Keep as shadow; optionally `rgb(from var(--m3-shadow) ...)`. |
| near `--m3-primary-outline` | `#8b0008` (3), `#930008` (2), `#8c0009` (1) | 5 / 1 / 0 (+1 / 19) | A:`statistic.less` (3), A:`M3RichTextEditor.module.scss` (1), A:`antdM3Theme.ts` (1) | `--m3-primary-outline` / `--m3-on-primary-fixed-variant` | crutch | tiny (max ΔE 1.6) - Dark red text `#8b0008`, `#930008` ΔE 0-1.6. |
| near `--m3-on-tertiary-container` | `#2f3743` (2), `#374151` (2), `#26313d` (1), `#2c3a4b` (1) | 2 / 4 / 0 (+0 / 2) | F:`messageSubmitInterface.styles.scss` (2), F:`profile.styles.scss` (2), A:`statistic.less` (1) | `--m3-on-tertiary-container` | crutch | visible, small (max ΔE 3.9) - Dark slate text `#2f3743`, `#374151`: ΔE 3-4. |
| near `--m3-inverse-on-surface` | `#f3f0f0` (4), `#f3f0f0@a` (1), `#f3f3f6` (1) | 6 / 0 / 0 (+2 / 4) | A:`M3RichTextEditor.module.scss` (4), A:`FormPluginEditor.styles.scss` (1), A:`styles.module.scss` (1) | `--m3-inverse-on-surface` | crutch | tiny (max ΔE 1.7) - Light text on dark `#f3f0f0` ΔE 0.5 (Admin rich-text editor). |
| near `--m3-outline` | `#747878` (2), `#757575` (1), `#808080` (1), `#848484` (1) | 2 / 3 / 0 (+27 / 23) | A:`statistic.less` (1), A:`orisoMuiTheme.ts` (1), F:`MatrixCallView.styles.scss` (1) | `--m3-outline` | crutch | visible, small (max ΔE 5.4) - `#747878` identical; `#808080`/`#757575` ΔE 2-5. |
| near `--m3-error` | `#b1005e` (4), `#b1005e@a` (1) | 3 / 2 / 0 (+21 / 15) | A:`styles.module.scss` (1), A:`M3RichTextEditor.module.scss` (1), A:`antdM3Theme.ts` (1) | `--m3-error` | crutch | identical (max ΔE 0.0) - `#b1005e` identical; `#a3195b`, `#c10072` tiny. |
| near `--m3-on-error-container` | `#fff7f7` (2), `#fff5f5` (1), `#fff6f5` (1), `#fff6f7` (1) | 0 / 5 / 0 (+0 / 1) | F:`messageSubmitInterface.styles.scss` (2), F:`sessionsListItem.styles.scss` (1), F:`draftsCenter.styles.scss` (1) | `--m3-on-error-container` | crutch | identical (max ΔE 0.9) - Near-white on error `#fff7f7`: identical. |
| near `--m3-primary-fixed-dim` | `#ffb4aa` (1), `#ffb4aa@a` (1), `#ffaaa3` (1), `#ffa39e` (1), `#f5bcbb` (1) | 4 / 1 / 0 (+1 / 21) | A:`M3RichTextEditor.module.scss` (2), A:`Statistic.tsx` (1), A:`styles.module.scss` (1) | `--m3-primary-fixed-dim` | crutch | visible, small (max ΔE 5.0) - `#ffb4aa` identical; others in the pink family. |
| near `--m3-success` | `#2e7d32` (2), `#0a882f` (1) | 1 / 2 / 0 (+3 / 0) | A:`styles.module.scss` (1), F:`ConsultantAcceptedActionBar.styles.scss` (1), F:`encryptionBanner.styles.scss` (1) | `--m3-success` | crutch | visible, small (max ΔE 4.4) - Only `#0a882f` is the token. `#008000` (CSS `green`, antd Tag) is ΔE 5, `#2e7d32` ΔE 4: small visible. |
| near `--m3-hover-layer` | `#fff1f0` (1), `#fff2f4` (1), `#f0e7e7` (1) | 1 / 2 / 0 (+5 / 8) | A:`styles.module.scss` (1), F:`draftsCenter.styles.scss` (1), F:`notificationsCenter.styles.scss` (1) | `--m3-hover-layer` | crutch | tiny (max ΔE 1.9) - Pale pink hover washes ΔE 1-2. |
| purple/pink family (no token) | `#331144` (1), `#8b4789` (1), `#6b4786` (1) | 1 / 2 / 0 (+1 / 1) | F:`MatrixCallView.styles.scss` (2), A:`EmailTemplatesDialog.tsx` (1) | mixed one-offs (`#0000ff` antd preset, `#331144`, `#8b4789`) | unclear | visible |
| near `--m3-primary-hover` | `#8a0008` (1) | 0 / 1 / 0 (+0 / 5) | F:`PseudonymActionBar.styles.scss` (1) | `--m3-primary-hover` | crutch | tiny (max ΔE 1.6) - `#8a0008`: ΔE 1.6. |

Tokens with no bare literal at all (only fallbacks/definitions): `--m3-error-container`.

### Foreign palettes pasted into the code

Origin of many near-token literals; useful to see which swaps are really "one decision" and not many. Bare literal occurrences (fallbacks in brackets).

| Origin | Admin | Frontend | Examples (n) |
|---|---|---|---|
| Stock M3 baseline (purple-grey) palette | 1 (+56) | 19 (+29) | `#1c1b1f` (14), `#1d1b20` (5), `#49454f` (1) |
| Tailwind greys/reds/greens | 0 (+0) | 65 (+4) | `#e5e7eb` (10), `#6b7280` (9), `#dc2626` (7), `#1f2937` (6), `#10b981` (5) |
| Material/MUI 2014 palette (red 700-500, greys) | 2 (+0) | 72 (+0) | `#d32f2f` (25), `#c62828` (14), `#eeeeee` (6), `#9e9e9e` (4), `#e0e0e0` (4) |
| antd 5 defaults / CSS keywords | 0 (+0) | 8 (+0) | `#ff0000` (8) |
| iOS system red/green/blue | 0 (+0) | 3 (+0) | `#ff3b30` (3) |
| Pure greys (#333/#666/#999/#ccc/#ddd/#eee family) | 5 (+0) | 55 (+0) | `#b8b8b8` (10), `#666666` (9), `#2d2d2d` (6), `#999999` (5), `#dcdcdc` (5) |

### Definition layers (not call sites)

Definition lines that hold a hex: Admin 202, Frontend 151, Element Call 6. Two kinds:
- **Static first-paint copies of engine tokens**: Admin `--m3-*` 26 + `--admin-*` 29 (`app.css`), Frontend `--m3-*` 34 (`mui-variables-mapping.scss`). Needed (first paint must not wait); should be generated from the engine, not typed. Drifted copies found: Admin `app.css` `--m3-primary-container: #ffe2de` (role inverted), `--m3-on-primary-container: #141c25`.
- **Legacy palette definitions**: Admin `app.css` `:root` ("Colors" block: `--primary #273270`, `--secondary #3f373f`, `--form-error #cc0000`, `--form-success #0dcd21`, `--yellow-1..6`, `--background-*`, `--line-grey` ... 57 lines) and the mirrored Less (`styles/variables/_colors.less`, `Settings.less`, 89 `@vars`); Frontend `settings.scss` (103 `$vars`). The Admin Less/CSS legacy blocks largely duplicate each other.

## 6. Top files per repo

### Admin

| File | colour lines | bare literal lines (no shadow) | fallback lines | definition lines | distinct colours |
|---|---|---|---|---|---|
| `src/styles/components/statistic.less` | 116 | 111 | 0 | 0 | 47 |
| `src/components/FormPluginEditor/M3RichTextEditor.module.scss` | 70 | 33 | 23 | 9 | 19 |
| `src/components/FormPluginEditor/FormPluginEditor.styles.scss` | 30 | 19 | 7 | 0 | 14 |
| `src/components/Tenants/GeneralSettings/components/ThemeBuilder/styles.module.scss` | 24 | 18 | 6 | 0 | 9 |
| `src/theme/antdM3Theme.ts` | 17 | 17 | 0 | 0 | 12 |
| `src/styles/components/protectedLayout.less` | 20 | 16 | 3 | 0 | 6 |
| `src/pages/Agency/List/styles.module.scss` | 25 | 14 | 11 | 0 | 14 |
| `src/pages/users/management/UserManagementTable.module.scss` | 24 | 13 | 11 | 0 | 13 |
| `src/pages/Tenants/List/styles.module.scss` | 20 | 13 | 7 | 0 | 13 |
| `src/components/Tenants/GeneralSettings/components/Languages/styles.module.scss` | 12 | 12 | 0 | 0 | 9 |
| `src/components/Page/styles.module.scss` | 16 | 11 | 5 | 0 | 9 |
| `src/styles/components/button.less` | 10 | 10 | 0 | 0 | 6 |
| `src/components/PlaceholderTemplate/emailKit.ts` | 8 | 8 | 0 | 0 | 7 |
| `src/pages/GlobalSettings/styles.module.scss` | 10 | 7 | 3 | 0 | 5 |

The top 10 files hold 266 of 436 bare literal lines (61 %). Files with colour in Admin: 163.

### Frontend

| File | colour lines | bare literal lines (no shadow) | fallback lines | definition lines | distinct colours |
|---|---|---|---|---|---|
| `src/components/notFound/NotFound.tsx` | 101 | 93 | 0 | 0 | 39 |
| `src/components/messageSubmitInterface/messageSubmitInterface.styles.scss` | 118 | 68 | 43 | 4 | 42 |
| `src/components/message/message.styles.scss` | 121 | 60 | 58 | 2 | 33 |
| `src/components/call/GroupCallWidget.scss` | 54 | 45 | 0 | 0 | 16 |
| `src/resources/scripts/theme.jsx` | 43 | 41 | 0 | 0 | 17 |
| `src/components/call/FloatingCallWidget.scss` | 44 | 39 | 0 | 0 | 16 |
| `src/components/app/navigation.styles.scss` | 78 | 38 | 39 | 0 | 18 |
| `src/components/pseudonym/WaitingQueueActionBar.styles.scss` | 45 | 35 | 10 | 0 | 12 |
| `src/components/sessionsList/sessionsList.styles.scss` | 87 | 32 | 42 | 9 | 32 |
| `src/components/notificationsCenter/notificationsCenter.styles.scss` | 56 | 29 | 27 | 0 | 17 |
| `src/components/session/session.styles.scss` | 44 | 28 | 15 | 0 | 22 |
| `src/components/sessionHeader/sessionHeader.styles.scss` | 35 | 28 | 6 | 0 | 14 |
| `src/components/anonymousChat/AnonymousChat.tsx` | 28 | 28 | 0 | 0 | 9 |
| `src/components/draftsCenter/draftsCenter.styles.scss` | 26 | 26 | 0 | 0 | 14 |

The top 10 files hold 480 of 1226 bare literal lines (39 %). Files with colour in Frontend: 209.

Element Call: 9 files, 18 lines, see section 2.

## 7. Intentional colour that stays (and the unclear ones)

| Item | Where | Size | Verdict |
|---|---|---|---|
| Generated user / counsellor avatars: ~55-colour palette (Japanese and UK colour names), initials, `pickIconColor` (WCAG >= 4.5 near-black or white on top) | Frontend `src/utils/anonName/engine.ts` (excluded from the scan as an engine file); `AnimalAvatar` | 57 hex in one file | **intentional**, do not tokenise. No avatar palette exists in Admin. Brand-coloured icons use `--m3-primary`/`on-primary`, not hex |
| Shadows, drop shadows, gradient stops | 57 Admin / 121 Frontend / 1 EC literal lines | mostly black at 3-30 % alpha | **intentional**; only the base colour may move to `--m3-shadow` |
| Black / white alpha overlays: scrims, hairlines, state layers, glass on video | 32 + 5 Admin, 129 + 44 Frontend, 3 EC | | **intentional** (scrims -> `--m3-scrim`); state layers can become `color-mix` of on-surface |
| Stage effects (lamp map, orbital trails, stage panel) | Frontend `stage/`, `StageLayout`, `lampMapEffect.ts`, `OrbitalTrails` | 33 literals + 42 fallbacks | **intentional** |
| 404 illustration | Frontend `notFound/NotFound.tsx` | 93 lines, 39 colours | **intentional** (art) |
| Rich-text highlight swatches | Frontend `TipTapComposer.tsx`, `richtextHelpers.ts`, `message.styles.scss` (5 pastel hex); Admin `M3RichTextEditor.tsx` (5 swatches) | 16 lines | **intentional** (user content colours) |
| Mail palettes (inline hex, mail clients ignore CSS variables) | Frontend `emails/kit/emailTokens.ts`; Admin `PlaceholderTemplate/emailKit.ts`, `EmailPreview`, `dpaMailPreviewStory.ts` | 20 Admin / 17 Frontend | **unclear, other track** (UserService#1252); should be generated from the engine, not typed |
| Element Call upstream colours | `src/index.css`, `*.module.css` | 18 lines | **intentional** (upstream Compound; ORISO colours come from the generated `oriso-theme.css`) |
| SVG files (not scanned as code) | Admin 70 of 231 `.svg` files carry hex (111 occurrences); Frontend 132 of 375 (555); EC 9 of 18 | | **unclear**: illustrations stay, monochrome icons should use `currentColor` (Admin 72 / Frontend 51 SVGs already do). Inline `fill="#4C555F"` in TSX icons *is* scanned and is a crutch |
| Call accept / hang-up buttons `#10b981` / `#ff3b30` / `#e6342b` | Frontend `FloatingCallWidget.scss`, `MatrixCallView.styles.scss`, `GroupCallWidget.scss` | ~25 lines | **unclear**: status colours; mapping to `--m3-success` / `--m3-error` is visible (green and iOS red become brand tones) |
| antd `<Tag color="green|red|blue">` presets | Admin pages (`index.tsx`, `InviteCsvImportModal.tsx`) | 18 | **unclear**: status colours from antd, not from the engine |
| Admin navy `#273270` (legacy `--primary`, `--info-color`) text buttons, outlines | Admin `app.css`, `ThemeBuilder/styles.module.scss`, `Dpia/styles.module.scss` | 9 literals + 6 definitions | **unclear**: a third brand colour next to red and slate; decide before swapping |
| Warning / highlight yellows and oranges | `--warning-*`, `--yellow-1..6`, DPIA warn colours, Frontend banners | 31 Admin / 10 Frontend definitions | **unclear**: the engine has no warning role |

## 8. Surprises

1. **Two engines, same names, different colours.** Admin writes `--m3-primary-container: #ffe2de` and `--m3-on-primary-container: #141c25` (roles inverted on purpose, documented in `app.css`); Frontend and Figma say `#cc1e1c` and `#ffe2de`. 10 of 24 shared tokens differ in value at the default seed (section 3). Any "one token per hex" proposal must first say which meaning wins, otherwise a swap is a visible change in one of the two apps.
2. **The earlier sweep stopped at SCSS/CSS.** `ORISO-Frontend scripts/theme-migration/sweep.js` (THB-07, guarded by `m3Sweep.test.ts`) only scans `.scss`/`.css`, which is why Frontend has 1148 aligned `var(--m3-x, #legacy)` fallbacks but also 481 bare literal lines outside SCSS/Less (mostly `.tsx`/`.jsx`) (`NotFound.tsx`, `theme.jsx`, `AnonymousChat.tsx`, `OrisoDialog.tsx`, `SessionHeaderComponent.tsx`). Its own `mapping.json` lists 99 hexes as `rawHexNotMigrated` (Tailwind, Material, pure greys) that were left raw because no token matched at the time. That list is the ready-made "foreign palette" backlog.
3. **Danger red is not the same red anywhere.** `--m3-error` is magenta `#b1005e` (owner-confirmed 2026-07-29), but Admin `--admin-status-error: var(--form-error, #cc0000)` still resolves to legacy `#cc0000`, and Frontend has about 100 literals of `#d32f2f`, `#c62828`, `#ff0000`, `#dc2626`, `#b91c1c`. At least seven different reds mean "danger" today.
4. **"Secondary" exists as five values** (`#655f65`, `#4c555f`, `#4d5660`, `#4b515a`, `#555f6b`; section 3) and the Figma export in the repo is stale for it. Regenerating Figma variables from the engine (map, "Not yet specified") would fix the source of truth.
5. **`theme.jsx` default arguments are fallbacks with wrong colours**: `getCssVarValue("--m3-primary", "#dc2626")` (Tailwind red, not the brand), `"--m3-success", "#10b981"`. They render whenever the var is empty (Storybook, first paint). 41 literal lines in that file.
6. **Admin duplicates its own legacy palette** in `app.css` (CSS variables), `Settings.less` and `_colors.less` (Less variables), value for value, plus a 116-line `statistic.less` with its own slate palette (47 colours, 111 bare literals, 0 fallbacks). One file, `statistic.less`, is a quarter of Admin bare literals.
7. **The Appearance builder itself is hard-coded**: `Tenants/GeneralSettings/components/ThemeBuilder/styles.module.scss` has 18 bare literals, so the page that lets Träger choose brand colours does not follow its own preview in places. Check it before building the contrast-warning UI.
8. **No warning/info role.** The engine has primary, secondary, tertiary, error and success. Warnings and highlights (`#ff9f00`, `--yellow-*`, `#fff3e0`) have no token; a swap proposal for them needs a new role or an explicit "stays brand-neutral" decision.

## 9. Open decisions and hand-off for the before/after check

Decisions the mapping cannot make by itself (each blocks one cluster): (1) danger = magenta `--m3-error` or brand red `--m3-primary-container`; (2) which meaning `--m3-primary-container` / `--m3-on-primary-container` has in Admin; (3) warning role yes/no; (4) Admin navy `#273270` stays, becomes primary or becomes slate; (5) call accept/decline colours; (6) mail palette stays on its own track.

Where a visual check is needed (everything else is identical or tiny): the danger-red surfaces (Frontend sidebar logout/leave, call hang-up, anonymous-chat leave, session header), white-on-colour text with a **pale tenant seed** (on-primary turns dark by design), Admin navy text buttons, antd Tag colours, grey text steps (ΔE 3-6: `#666`, `#999`, `#b8b8b8`, `#3b4044`) in Frontend message/composer/session list, and the whole Admin `statistic.less` page. Clusters with max ΔE <= 1 and all fallback removals are computed-style identical, so a computed-style diff over Storybook stories (not screenshots) is enough for them; this is a suggestion for the screenshot-check ticket, not tested here.
