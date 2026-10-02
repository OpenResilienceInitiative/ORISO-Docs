# Why Admin elements look pale: measured patterns, groups and token swaps

Research for [ORISO-Docs#148](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/148) (child of map [#144](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/144)). Read-only. Measured 2026-10-02.
Builds on [colour-token-audit](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/research/colour-token-audit/research/colour-token-audit.md) and [hardcoded-colour-inventory](https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/research/hardcoded-colour-inventory/research/hardcoded-colour-inventory.md) (not redone here).

**Sources.** Code: shallow clones of `origin/dev`, Admin `4faddc3`, Frontend `1154ca4`. Live measurement: the deployed Admin Storybook `https://dev.oriso.org/storybook-admin/` (index built Thu 2026-10-01 12:09 UTC, the same minute Admin `4faddc3` landed, so it matches the code read here). Contrast numbers are computed in the browser from the real computed styles: the element colour, multiplied by the opacity of the element and all its ancestors, composited over the first opaque background above it, then WCAG 2.x ratio. One story per Storybook title was scanned (193 titles); everything below 4.5:1 (text) or 3:1 (icons) was listed, then grouped. Real Admin backgrounds: page surface `#fcf9f9`, workspace `#e4e2e2`, card `#eae7e8` / `#f6f3f3`.
Counting note: story pages are not the product. A swap still needs the before/after check named on the map.

## 1. Short answer

1. **`opacity` is not what makes Admin paler than the app.** Admin has 118 `opacity` declarations (50 fractional in CSS/TSX plus 4 in SVG attributes, 18 at 0.38); Frontend has 116 fractional ones, also 18 at 0.38. The same M3 "disabled = 38%" habit exists on both sides. What differs is where it is stacked.
2. **The biggest pale group is antd's own alpha text ramp, and it is one file.** `src/theme/antdM3Theme.ts` only sets `colorTextBase`. antd then derives secondary / description text at 45% and placeholder / arrow / icon at 25% of that colour: **1.65:1 to 2.83:1** on the Admin surfaces, on every antd Input, Select, Form and Typography (162 files import antd). One block of 5 tokens fixes the group.
3. **Opacity stacks.** A 0.75 label inside a 0.38 field is 0.285 (1.57:1); a 0.38 stepper inside it is 0.144 (1.25:1); an MUI disabled helper text under the extra `opacity: 0.5` wrapper is 1.55:1. Removing the second layer is the fix, not a new token.
4. **The engine does matter, but for fills, not text.** The same token name is a different colour in Admin: `--m3-primary-container` is pale rose `#ffe2de` (1.17:1 against the surface) in Admin and brand red `#cc1e1c` in Frontend. The active tab pill, field selected state, FAB and onboarding header carry it. This is a deliberate Admin choice (comment in `orisoScheme.ts:98-108`: "Figma hat Vorrang"), so it needs a decision, not a swap.
5. **`var(--x, #fallback)` is not a cause.** Only 5 colour tokens used in Admin are defined nowhere (state layer, shadow, hover layer, `--m3-primary-outline`, `--m3-success`) and their fallbacks equal the intended value. No fallback is winning over a token that exists.

## 2. Pale groups (one swap per group)

Ratios are "today" against the real background; "after" is the proposed token at full opacity.

| # | Group | Mechanism | Today | Replace with | After | Where to change (one place) |
|---|---|---|---|---|---|---|
| A | antd secondary / description text, placeholder, select arrows, icons | antd `colorTextSecondary/Tertiary/Quaternary/Placeholder` default to 65 / 45 / 25 % of `colorTextBase` | 2.74 (secondary text, `ant-typography-secondary`), 2.71 (password eye), 1.65 to 1.70 (placeholder, Select item placeholder), 1.67 (Select arrows) | `colorTextSecondary`, `colorTextTertiary`, `colorTextDescription`, `colorTextPlaceholder` = `--m3-on-surface-variant`; `colorTextQuaternary`, `colorIcon` = `--m3-outline` (non-text, 3:1) | 7.26 to 8.95 text; 3.46 to 4.27 icons | `src/theme/antdM3Theme.ts:65-76` (add 6 token lines) |
| B | Idle controls dimmed by opacity although not disabled | one `opacity` on text/icon | sort icon idle 2.27, AdminEmpty graphic 1.85 to 2.03, `.miniLabel` 3.98 to 4.1 (11px), `.optionHint` and `.rowLabel` 4.6 | text: `--m3-on-surface-variant` (7.26); idle icons and graphics: `--m3-outline` (3.46) | see left | `DataTable/dataTableHeader.module.scss:40`, `AdminEmpty/styles.module.scss:21`, `M3NumberField/styles.module.scss:119`, `Links/inviteComposer.module.scss:184`, `CollapsibleField/styles.module.scss:118` |
| C | Nested opacity (stacking) | opacity on a parent and on a child | `.miniLabel` in a disabled field 1.57; stepper in a disabled field 1.25; MUI disabled label 2.34 to 2.38 and helper text 1.55 (field `opacity: .5` times MUI's own disabled colour) | one layer only: remove the inner opacity and the MUI wrapper opacity; disabled colour = `color-mix(in srgb, var(--m3-on-surface) 38%, transparent)` | 2.3 (the M3 disabled value, equal to a single 0.38) | `M3NumberField/styles.module.scss:77,119,149`, `mui/fieldSx.ts:21`, `mui/MuiFormField/index.tsx:136`, `mui/MuiRadioGroupField/styles.module.scss:24`, `mui/MuiSwitchField/styles.module.scss:153` |
| D | Disabled state by `opacity: 0.38` (18 declarations, 0.3 to 0.55 in 12 more) | M3 spec, same as Frontend | 1.86 to 2.6 | keep the look; express it as the colour above instead of `opacity`, so it cannot stack. WCAG 1.4.3 exempts inactive controls, but helper text that explains why a field is disabled must not be dimmed (keep `--m3-on-surface-variant`) | 2.3, no stacking | `IconButton/styles.module.scss:22`, `FilterChip/styles.module.scss:50`, `M3Checkbox/styles.module.scss:16`, `PillSelect/styles.module.scss:90`, `SegmentedTabs/styles.module.scss:40`, `GlobalSearch/splitButton.module.scss:141,349`, `Modal/styles.module.scss:200`, `CollapsibleField/styles.module.scss:50`, `Links/styles.module.scss:30`, and 9 more (list: section 4) |
| E | antd status colours not mapped to the M3 scheme | `antdM3Theme.ts` sets `colorError` but not `colorSuccess`; preset tag colours (`green`, `gold`) are antd's own palette | Tag success `#52c41a` on `#f6ffed` 2.21; `green` `#389e0d` 3.37; `gold` `#d48806` on `#fffbe6` 2.76 | `colorSuccess` = `--m3-success` (`#0a882f`, 4.47 on the same background, needs a darker pairing to pass 4.5); give tags the engine's `on-*-container` pair; engine must emit `--m3-success` (undefined in Admin today, only `Dpia/styles.module.scss:613` reads it, with a fallback) | 4.47 and up | `antdM3Theme.ts:66-69` plus `utils/theme/orisoScheme.ts` (add `--m3-success`) |
| F | Literal grey that is really a token | hex pasted, not var | `#737b86` on white 4.28 (`statistic.less:469,692`) | `--m3-on-surface-variant` | 9.37 | `styles/components/statistic.less:469,692` |
| G | Engine role differs from the app | Admin keeps its own `orisoScheme.ts` | fill `#ffe2de` vs Frontend `#cc1e1c`; `--m3-on-primary-container` `#141c25` vs `#ffe2de` | decision: unify the role name (Admin pale selection surface gets its own name, e.g. keep `--admin-field-selected-surface`, and `--m3-primary-container` follows the Frontend engine) | n/a (fill) | `utils/theme/orisoScheme.ts:98-108,231`, `src/app.css:150-151`, users: `protectedLayout.less:284`, `M3FabMenu/m3FabMenu.module.scss:61,98,139,146,171`, `CounsellorOnboarding/styles.module.scss:50` |

Contrast of the proposed colours (computed): `--m3-on-surface-variant` `#444748` is 8.95 on `#fcf9f9`, 7.63 on `#eae7e8`, 7.26 on `#e4e2e2`. `--m3-outline` `#747878` is 4.27, 3.64, 3.46 on the same three. Today's antd ramp on `#fcf9f9`: 88 % text 11.43, 65 % 5.23, 45 % 2.83, 25 % 1.69.

## 3. Evidence per cause

**A. antd alpha ramp.** `antdM3Theme.ts:71` sets `colorTextBase: t('--m3-on-surface','#1a1c1e')` only (the engine value `#1a1c1e`; `app.css` has `#1b1b1c`, a second small drift). Live computed colours: password toggle `rgba(26,28,30,0.45)`, Select arrow and placeholder `rgba(26,28,30,0.25)`, Typography secondary `rgba(26,28,30,0.45)`. Seen in stories: `atoms-forminputpasswordfield--default`, `foundations-field-tokens--field-anatomy` (placeholder 1.70, arrow 1.67), `organisms-resizabletable--agency-listing`, `organisms-pages-links-externalinbounds--filled`, `organisms-pages-users-usermanagement--filled`, `organisms-globalsettings-translationapikeyscard--with-stored-keys`. Also: `AdminApp.tsx:79` calls `buildAdminAntdTheme()` with no seeds, so antd always gets the default seed, not the Träger's (the `--m3-*` CSS variables do follow the seeds via `applyAdminTheme`).

**B and C. Opacity on live elements** (all measured in `dev.oriso.org/storybook-admin`):

| Element | file:line | story | opacity (own x ancestors) | colour over background | ratio today |
|---|---|---|---|---|---|
| Idle sort icon | `DataTable/dataTableHeader.module.scss:40` | `molecules-datatable-header--sort-cycle` | 0.38 | `#989697` on `#e4e2e2` | 2.27 (13.34 if opaque) |
| Mini label of a filled number field | `M3NumberField/styles.module.scss:119` | `molecules-idallocationfield--interactive` | 0.75 | `#6c6e6f` on `#e4e2e2` | 3.98 |
| Mini label, disabled field | `M3NumberField/styles.module.scss:119,149` | `atoms-m3numberfield--disabled` | 0.75 x 0.38 = 0.285 | `#b6b6b6` on `#e4e2e2` | 1.57 |
| Stepper, disabled field | `M3NumberField/styles.module.scss:77,149` | same | 0.38 x 0.38 = 0.144 | `#cdcccc` on `#e4e2e2` | 1.25 |
| MUI disabled label | `mui/fieldSx.ts:21`, `mui/MuiFormField/index.tsx:136` | `organisms-globalsettings-documentmasterdatacard--filled` | 0.5 | `#979798` on `#eae7e8` | 2.38 (7.63 opaque) |
| MUI disabled helper text | same | `organisms-globalsettings-chatrecoverysettingscard--default` | 0.5 x MUI 0.38 | `#bebbbc` on `#eae7e8` | 1.55 |
| Checkbox disabled | `M3Checkbox/styles.module.scss:16` | `atoms-m3checkbox--disabled` | 0.38 | `#8d8c8c` on `#e4e2e2` | 2.59 |
| Icon button disabled | `IconButton/styles.module.scss:22` | `atoms-iconbutton--disabled`, `datatable-pagination--first-page` | 0.38 | `#a7a7a7` on `#e4e2e2` | 1.86 |
| Switch disabled | `M3Switch/styles.module.scss:24` | `atoms-m3switch--off-disabled` | 0.45 | `#7d7c7c` on `#e4e2e2` | 3.21 |
| Disabled filled chip | `FilterChip/styles.module.scss:50` | `atoms-filterchip--disabled-selected` | 0.38 | `#90969c` on `#4c555f` | 2.53 |
| Disabled filled icon button | `IconButton/styles.module.scss:22` | `atoms-iconbutton--disabled` | 0.38 | `#969eaa` on `#646d78` | 1.95 |
| Disabled DPIA chip | `Dpia/styles.module.scss:325` | `dpia-dpiadocumentpage--desktop` | 0.55 | `#919293` on `#f0edee` | 2.69 |
| Language icon | `LanguageSelector/styles.module.scss:11` | `molecules-languageselector--compact` | 0.85 on hex `#3f373f` | `#585157` on `#e4e2e2` | 5.99 (fine, but hex not token) |
| Left menu item | `styles/components/protectedLayout.less:46` | not flagged | 0.85 on `#e7effc` over `#281715` | calc. | 10.98 (fine) |

Not pale (measured fine or intentional): the left menu text, the language icon, statistic dimming (`statistic.less:1100`, 0.26 dims non-selected donut segments on purpose), skeleton pulse (`dataTable.module.scss:112`), all `opacity: 0` / `1` (69 declarations: transitions and visibility).

**G. Engine.** Admin `orisoScheme.ts` seeds only the primary family from the tenant; `--m3-secondary #4c555f`, surfaces, `--m3-on-surface-variant #444748`, `--m3-outline #747878` are constants (lines 306-320), so a Träger with a custom seed gets a custom primary but the grey ladder stays default; Frontend derives them. Admin writes 23 `--m3-*` names (Frontend 50), see the inventory. The role values side by side are already tabled in the inventory (section 3); the part new here is which Admin elements consume the pale role (last column of group G).

**Fallbacks (not a cause).** `grep` of every `var(--m3-*)` in non-test source against `app.css` and the engine: undefined tokens are `--m3-state-layer-on-surface` (9 uses, fallback `rgb(27 27 28 / 8%)` = on-surface at 8 %, correct), `--m3-shadow` (8, `#000000`), `--m3-hover-layer`, `--m3-primary-outline`, `--m3-success` (1 each), `--m3-elevation-1/2/3` (3). One real mismatch: `antdM3Theme.ts:69` `colorWarning: t('--m3-warning','#410001')`, because the engine emits no `--m3-warning`; antd warning therefore renders near-black brown (16.4:1, not pale but not the M3 scheme either). The earlier "30 undefined" figure counted names written only at runtime; this list counts names that are never written.

## 4. Remaining disabled-state declarations (group D)

`CounsellorAvatarField/styles.module.scss:60 (0.3), :105 (0.5)`, `DataTable/dataTablePagination.module.scss:48`, `DataTable/statTile.module.scss:57`, `EditButton/styles.module.scss:44 (0.48)`, `FloatingLabelInput/floatingLabelInput.module.scss:46`, `GlobalSearch/splitButton.module.scss:141,349`, `InputChipPicker/styles.module.scss:64,81`, `M3FabMenu/m3FabMenu.module.scss:88 (0.55)`, `Modal/styles.module.scss:200`, `Pill/styles.module.scss:40 (0.85, locked)`, `PostCodeRanges/styles.module.scss:34 (fill-opacity 0.4)`, plus the files named in the table above. Everything not listed is `opacity: 0|1` or an animation step.

## 5. Screenshots (BEFORE, captured from the deployed Admin Storybook)

In `research/screens/engine-pale/`. Desktop 1280 px wide (clean and with the measured elements outlined in magenta) and a real 390 px mobile width (outlined). Viewport emulated with Playwright at device scale 1; stories are rendered at `iframe.html?id=<story>&viewMode=story`.

| File prefix | Story | Pale element |
|---|---|---|
| `01-sort-icon-idle` | `molecules-datatable-header--sort-cycle` | idle sort icon, group B |
| `02-number-field-disabled` | `atoms-m3numberfield--disabled` | stacked opacity, group C |
| `03-antd-placeholder-and-arrow` | `foundations-field-tokens--field-anatomy` | antd placeholder and arrow, group A |
| `04-antd-password-icon` | `atoms-forminputpasswordfield--default` | antd icon at 45 %, group A |
| `05-mui-disabled-helper-text` | `organisms-globalsettings-chatrecoverysettingscard--default` | MUI double dimming, group C |
| `06-invite-table-minilabel` | `organisms-pages-links-tenantinvites--filled` | mini label, sort icons, disabled role, groups B, C, D |
| `07-antd-tags-and-arrows` | `organisms-resizabletable--agency-listing` | antd tag colours and arrows, groups A, E |
| `08-segmented-tabs-pale-rose-active` | `molecules-adminsegmentedtabs--appearance-active` | pale rose active pill, group G |

Not done: a Frontend side-by-side screenshot of the same elements (the question was Admin), and a before/after check of the swaps (read-only ticket; the swap proposals above are not applied anywhere).

## 6. Decisions this leaves for the ADR

1. Group A and E are mechanical, low risk and all in `antdM3Theme.ts` plus one engine token: take them into the epic as the first Admin slice.
2. Groups B, C, D: agree "disabled = one colour layer, never nested opacity" as a rule; no new token needed (a `--m3-disabled-content` token would be sugar).
3. Group G: decide whether Admin's `--m3-primary-container` stays pale (rename the role) or follows the Frontend engine. This is the only group where a swap visibly changes the design.
