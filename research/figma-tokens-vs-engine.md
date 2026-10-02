# Figma token set vs the engine: usage, fit, inconsistencies, simplification

Research for [ORISO-Docs#156](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/156) (child of map [#144](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/144)). Read-only. Measured 2026-10-02.

Inputs: the six Figma exports `Light`, `Light Medium Contrast`, `Light High Contrast`, `Dark`, `Dark Medium Contrast`, `Dark High Contrast` (`*.tokens.json`, Drive folder `ORISO CC/06 | Design Sytem Tokens/M3/`, files dated 2026-09-04); the Frontend engine `src/utils/theme/orisoScheme.ts` + `orisoTuning.ts` at `origin/dev` `1154ca44` (file blob `3dfee78b`, identical to the copy used by [#147](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/147)); Frontend and Admin source from `origin/dev` (Frontend `1154ca44`, Admin `4faddc30`, pulled as tarballs with `gh api`, nothing edited). Earlier results used: `research/colour-token-audit` (#145), `research/hardcoded-colour-inventory` (#146), `research/engine-diff` (#147).

Distance metric everywhere: **CIEDE2000 (`dE`)** from `culori` (rule of thumb: <= 2 not visible, 5 clearly different, > 10 a different colour). RGB Euclidean distance and all raw values are in `research/figma-tokens-vs-engine-scratch/rows.json`. Contrast = WCAG 2 ratio.

## 1. Verdict in plain words

1. **The Figma token set is a decent Light theme with a Light Medium/High and Dark family stapled on, and the engine reproduces the Light file almost exactly.** Light: 42 of 45 comparable roles within dE <= 2 (mean 0.6). The three that are not: Secondary (9.1), On Background (10.2), Background (2.1, borderline). Dark: 35 of 45 within dE <= 2 (mean 3.8); the misses are the container roles.
2. **The Medium and High files are stock Material 3, not hand-made.** Feeding the palettes from the Light file into the library's own contrast-level scheme (`DynamicScheme`, `contrastLevel` 0.5 and 1.0) reproduces them: Light Medium 0.7 mean dE, Light High 0.6, Dark Medium 1.1, Dark High 0.7 (42, 43, 39, 42 of 47 roles within dE <= 2). **The engine itself cannot produce them** (it has no contrast input and returns the same tones always; mean dE vs Medium/High 14 to 20), **but the library it already uses can**: a prototype that feeds the engine's own palettes to `DynamicScheme` hits the Figma Medium/High files with mean dE 0.0 to 0.6 on the 26 core roles (section 3.4). Dark is already in the engine and is switched off in the app (`ACTIVE_SCHEMES.dark = false`).
3. **Light and Dark were hand-edited after the stock generation; Medium and High were not, so the six files disagree with each other.** Verified list in section 4: Secondary is a mauve (H318) in Light only; Dark reuses the Light containers; Background and On Background carry a leftover red tint (H25, chroma 11) in all six files; the state layers are copies of an older version of Light (6 roles stale) ; `On Primary Container 2` is a pure duplicate; Shadow equals Scrim; there is no success or warning role. The engine authors already knew about Secondary and Background (comment in `orisoScheme.test.ts`).
4. **Use of the roles: 27 of the 50 scheme roles are used by both apps, 13 only by the Frontend, 2 only by the Admin, 8 by nobody** (section 2.1). **Not one of the 147 state-layer tokens, 5 surface tokens or 108 palette tokens exists as a CSS token**; the code re-invents state layers by hand (up to about 46 hard-coded `rgba(...)` overlays in the Frontend, 9 in the Admin that point at an undefined token), and 16 of the Frontend ones are the *default* seed `#a5000a` pasted as rgba, so they ignore a Träger's colour.
5. **A Träger can tune the grey with one number.** Hue/chroma of the one palette that feeds Secondary and Tertiary is enough, and because HCT fixes the tone, the contrast does not move: secondary-on-surface stays 7.1 to 7.2 for cool, neutral and warm (section 5).
6. **Proposed set: 50 roles become 40 (minus 14 dead or duplicate, plus success and warning), 147 state-layer tokens become 3 opacity values, the Surfaces group and the add-on disappear, palettes stay an internal engine input** (section 6).

## 2. What is in the six files

| Group | Count | What it is | Differs per scheme? |
|---|---|---|---|
| Schemes | 50 | The Material 3 colour roles (`Primary`, `On Primary`, ...). One extra: `On Primary Container 2`. | yes, that is the point |
| State Layers | 147 = 49 roles x `Opacity-08/10/16` | For each role the *same hex* three times, with alpha 0.08, 0.10, 0.16. Material 3 uses 8 % for hover, 10 % for focus and pressed, 16 % for dragged: put the content colour at that opacity over the container colour. | colours follow the scheme, alpha never changes |
| Add-ons | 1 | `Section background`: `#F5F5F5` (light files), `#000000` (dark files). A designer's extra, not an M3 role. | light vs dark only |
| Surfaces | 5 | `Surface Tint 5 / 8 / 11 / 12 / 14 %`: the primary tint colour (`#BD0F13`, dark `#FFB4AA`) at the five elevation opacities of Material 3 (2021 spec). Material 3 (2023) replaced this with the `Surface Container*` roles, which the files also contain. | tint colour only |
| Palettes | 108 = 6 palettes x 18 tones | The *input* of the scheme: Primary, Secondary, Tertiary, Error, Neutral, Neutral Variant, each at tones 100, 99, 98, 95, 90, 80, 70, 60, 50, 40, 35, 30, 25, 20, 15, 10, 5, 0. A scheme role is "pick tone X of palette Y" (Light `Primary Fixed` = Primary 90, `On Secondary Fixed` = Secondary 10, ...). **Identical in all six files** (verified: all 108 equal). | no |

How the engine relates: it never reads Figma. It builds its own tonal palettes (primary from the seed, `SLATE` hue 249 / chroma 11.5 for Secondary and Tertiary, `NEUTRAL` 250.5 / 1.5, `NEUTRAL_VARIANT` 210.5 / 4.25, Error from the anchor `#b1005e`) and picks tones. Palette check (`pal.ts`): engine palette vs Figma Palettes group, dE over 18 tones: Primary 0.1 mean, Secondary 0.0, Tertiary 0.0, Error 0.2, Neutral 0.4, **Neutral Variant 2.4 (only 2 of 18 tones within dE 2)**. The Figma Neutral Variant palette is warm (H167 at tone 50), while the Figma *scheme* roles that should come from it (`Surface Variant #E0E3E3`, `Outline #747878`) are cool (H202); the engine follows the schemes, not the palette.

### 2.1 Scheme roles: used / unused / duplicate / inconsistent

Counts are occurrences of the `--m3-<role>` name in non-test, non-story source on `origin/dev` (FE = Frontend, AD = Admin), with number of files in brackets. Engine, static fallback files (`mui-variables-mapping.scss`, `app.css`), stories and tests are excluded, so a "0" means: defined by the engine, read by no component. (Script: `usage.py`, `table.py`, `mk.py`.) Indirect use through other names (`--primary`, `--skin-color-*`, MUI theme built from `--m3-*` in `theme.jsx`) is counted where it reads `--m3-*`; names built by string concatenation would be missed (none found).

| Role | FE uses (files) | AD uses (files) | Used by | Note |
|---|---|---|---|---|
| Primary | 325 (96) | 129 (57) | both |  |
| On Primary | 62 (37) | 23 (14) | both |  |
| Primary Container | 58 (28) | 9 (2) | both | Dark value = Light value (not adapted) |
| On Primary Container | 15 (11) | 2 (2) | both |  |
| Secondary | 128 (48) | 28 (18) | both | inconsistent (Light #655F65 is H318 mauve; every other secondary is H249 slate) |
| On Secondary | 10 (9) | 4 (4) | both |  |
| Secondary Container | 30 (16) | 22 (12) | both | Dark value = Light value (not adapted) |
| On Secondary Container | 11 (9) | 22 (15) | both |  |
| Tertiary | 2 (2) | 0 (0) | FE only | near-duplicate of Secondary (same palette) |
| On Tertiary | 1 (1) | 0 (0) | FE only | near-duplicate of Secondary |
| Tertiary Container | 4 (2) | 1 (1) | both | near-duplicate of Secondary |
| On Tertiary Container | 2 (1) | 0 (0) | FE only | near-duplicate of Secondary |
| Error | 65 (38) | 42 (21) | both |  |
| On Error | 7 (6) | 4 (2) | both |  |
| Error Container | 8 (5) | 0 (0) | FE only | Dark value = Light value (not adapted) |
| On Error Container | 9 (5) | 0 (0) | FE only |  |
| Background | 8 (5) | 1 (1) | both | inconsistent (Light grey page vs MC/HC and Dark values; see 4.3) |
| On Background | 0 (0) | 1 (1) | AD only | inconsistent (red-tinted H25 C11 in all 6; On Surface is neutral). The Admin engine repurposes it as the dark sidebar surface (12 engine hits) |
| Surface | 34 (22) | 7 (6) | both | Light #FAFBFB cool (H207) vs MC/HC #FCF9F9 warm |
| On Surface | 125 (61) | 106 (47) | both |  |
| Surface Variant | 11 (5) | 1 (1) | both |  |
| On Surface Variant | 167 (69) | 160 (72) | both |  |
| Outline | 28 (17) | 28 (23) | both |  |
| Outline Variant | 64 (39) | 45 (34) | both |  |
| Surface Tint | 0 (0) | 0 (0) | unused | only meaningful as the base of the Surfaces group |
| Shadow | 0 (0) | 8 (2) | AD only | duplicate of Scrim (#000000) |
| Scrim | 1 (1) | 0 (0) | FE only | duplicate of Shadow (#000000) |
| Inverse Surface | 4 (4) | 1 (1) | both |  |
| Inverse On Surface | 5 (5) | 1 (1) | both |  |
| Inverse Primary | 3 (2) | 0 (0) | FE only |  |
| Primary Fixed | 45 (17) | 7 (4) | both |  |
| On Primary Fixed | 9 (6) | 0 (0) | FE only |  |
| Primary Fixed Dim | 17 (11) | 1 (1) | both |  |
| On Primary Fixed Variant | 7 (5) | 0 (0) | FE only |  |
| Secondary Fixed | 2 (1) | 0 (0) | FE only |  |
| On Secondary Fixed | 1 (1) | 0 (0) | FE only |  |
| Secondary Fixed Dim | 3 (2) | 0 (0) | FE only |  |
| On Secondary Fixed Variant | 1 (1) | 0 (0) | FE only |  |
| Tertiary Fixed | 0 (0) | 0 (0) | unused | identical to Secondary Fixed in all 6 files |
| On Tertiary Fixed | 0 (0) | 0 (0) | unused | identical to On Secondary Fixed |
| Tertiary Fixed Dim | 0 (0) | 0 (0) | unused | identical to Secondary Fixed Dim |
| On Tertiary Fixed Variant | 0 (0) | 0 (0) | unused | identical to On Secondary Fixed Variant |
| Surface Dim | 0 (0) | 0 (0) | unused |  |
| Surface Bright | 0 (0) | 0 (0) | unused | Light value is darker than Surface (luminance 0.958 vs 0.963) |
| Surface Container Lowest | 58 (34) | 10 (6) | both |  |
| Surface Container Low | 27 (22) | 30 (15) | both |  |
| Surface Container | 33 (21) | 16 (11) | both | Light state layer says #F0EDEE, scheme says #EAE7E8 |
| Surface Container High | 28 (21) | 20 (15) | both | Light state layer says #EAE7E8, scheme says #E7E3E3 |
| Surface Container Highest | 6 (6) | 15 (11) | both |  |
| On Primary Container 2 | 0 (0) | 0 (0) | duplicate | identical to On Primary Container in all 6 files, no consumer (its variable id `61406:14374` is from a later edit than the rest) |

Group totals for the 50 roles: **both 27, Frontend only 13, Admin only 2, none 8** (the 8: `On Primary Container 2`, `Surface Tint`, four Tertiary Fixed roles, `Surface Dim`, `Surface Bright`). Read "used" with the #146 caveat: the Frontend count includes `var(--m3-x, #hex)` fallback lines and pasted hexes that equal a token are not counted here.

Tokens the code uses that **do not exist in Figma** (not a Figma role, but a real role in use):

| Token | Where | Problem |
|---|---|---|
| `--m3-success` | FE 17 uses in 10 files, AD 1 | engine constant `#0a882f`; the only semantic status role |
| `--m3-warning` | AD `antdM3Theme.ts:69` with fallback `#410001` | **no engine emits it** (Admin test asserts it is undefined); the fallback is a near-black red |
| `--m3-primary-hover` | FE 47 uses in 21 files | tone shift -8 of the seed, not in Figma |
| `--m3-primary-outline` | FE 12, AD 1 | = `on-primary-fixed-variant`, a duplicate under another name |
| `--m3-hover-layer`, `--m3-selected-layer` | FE 4 files, AD 1 | **constants `#f9eff0` / `#f5e6e7` for every seed** (`orisoScheme.ts:308-309`): a blue Träger still gets pink hover and selection |
| `--m3-state-layer-on-surface` | AD 9 uses in 7 files | **defined nowhere**; every use falls through to its fallback `rgb(27 27 28 / 8%)` |
| `--m3-fab-menu-*`, `--m3-elevation-*` | AD one component each | local tokens |

## 3. Engine against the six Figma schemes

### 3.1 Method

`cmp.ts`: `computeOrisoPalette({primary}, 'light')` for the Light, Light Medium, Light High files and `'dark'` for the three Dark files; each role by its `--m3-<role>` name; dE (CIEDE2000) per role. 45 roles are comparable (the engine does not emit the four Tertiary Fixed roles, and `On Primary Container 2` is excluded). Figma has exactly one seed (`#A5000A`), so a per-role comparison exists only for the default seed; for the other seeds see 3.3.

### 3.2 Default seed `#a5000a`, per role (dE)

Hex shown for Light and Dark; the other four columns are dE only.

| Role | Light fig / engine | dE | Dark fig / engine | dE | LMC dE | LHC dE | DMC dE | DHC dE |
|---|---|---|---|---|---|---|---|---|
| Primary | #a5000a / #a5000a | 0 | #ffb4aa / #ffb4aa | 0 | 9.7 | 13.7 | 8.5 | 17.1 |
| On Primary | #ffffff / #ffffff | 0 | #690004 / #690004 | 0 | 0 | 0 | 4.7 | 27.7 |
| Primary Container | #cc1e1c / #cc1e1c | 0 | #cc1e1c / #930008 | 12.2 | 0 | 11.3 | 28.5 | 47.8 |
| On Primary Container | #ffe2de / #ffe2de | 0 | #ffe2de / #ffdad5 | 2.8 | 12.2 | 12.2 | 86.2 | 84.2 |
| Secondary | #655f65 / #4d5660 | **9.1** | #bec7d4 / #bec7d4 | 0 | 10.4 | 13.6 | 5.2 | 9.6 |
| On Secondary | #ffffff / #ffffff | 0 | #28313b / #28313b | 0 | 0 | 0 | 3.5 | 14.1 |
| Secondary Container | #646d78 / #656e79 | 0.4 | #646d78 / #3f4852 | 13.2 | 0.4 | 12.9 | 28.4 | 46.2 |
| On Secondary Container | #e7effc / #e6effb | 0.8 | #e7effc / #dae3f0 | 2.7 | 6.9 | 6.9 | 85.3 | 84.1 |
| Tertiary | #565f6a / #565f6a | 0 | #bec7d4 / #bec7d4 | 0 | 13.6 | 16.8 | 5.2 | 9.6 |
| On Tertiary | #ffffff / #ffffff | 0 | #28313b / #28313b | 0 | 0 | 0 | 3.5 | 14.1 |
| Tertiary Container | #9ba4b0 / #9ba4b0 | 0 | #9ba4b0 / #3f4852 | 36.6 | 19.4 | 35.9 | 36.6 | 46.2 |
| On Tertiary Container | #313a44 / #313a44 | 0 | #313a44 / #dae3f0 | 60.6 | 65.4 | 65.4 | 81.4 | 84.1 |
| Error | #b1005e / #b1005e | 0 | #ffb1c8 / #ffb1c8 | 0 | 13.2 | 16.8 | 8.4 | 17.4 |
| On Error | #ffffff / #ffffff | 0 | #650033 / #650033 | 0 | 0 | 0 | 4.1 | 27.4 |
| Error Container | #de0077 / #de0077 | 0 | #de0077 / #8e004a | 16.6 | 2.2 | 15.8 | 28.7 | 47.1 |
| On Error Container | #fff7f7 / #fff7f7 | 0 | #fff7f7 / #ffd9e2 | 12.2 | 4 | 4 | 86.5 | 84.3 |
| Background | #f2efef / #fcf9f9 | 2.1 | #1f0f0d / #131314 | 9.1 | 1.8 | 1.8 | 9.1 | 9.1 |
| On Background | #281715 / #1b1b1c | **10.2** | #f1ebea / #e4e2e2 | 2.8 | 10.2 | 10.2 | 11.2 | 11.2 |
| Surface | #fafbfb / #fcf9f9 | 2 | #131314 / #131314 | 0 | 0 | 0 | 0 | 0 |
| On Surface | #1b1b1c / #1b1b1c | 0 | #e4e2e2 / #e4e2e2 | 0 | 2.9 | 5.9 | 6 | 6 |
| Surface Variant | #e0e3e3 / #e0e3e3 | 0 | #444748 / #444748 | 0 | 0 | 0 | 0 | 0 |
| On Surface Variant | #444748 / #444748 | 0 | #c4c7c8 / #c4c7c8 | 0 | 5.4 | 19.7 | 5.2 | 12.6 |
| Outline | #747878 / #747878 | 0 | #8e9192 / #8e9192 | 0 | 13.8 | 26 | 10.1 | 24.7 |
| Outline Variant | #c4c7c8 / #c4c7c8 | 0 | #444748 / #444748 | 0 | 28.6 | 46 | 28.3 | 46.6 |
| Surface Tint | #bd0f13 / #bd0f13 | 0 | #ffb4aa / #ffb4aa | 0 | 0 | 0 | 0 | 0 |
| Shadow | #000000 / #000000 | 0 | #000000 / #000000 | 0 | 0 | 0 | 0 | 0 |
| Scrim | #000000 / #000000 | 0 | #000000 / #000000 | 0 | 0 | 0 | 0 | 0 |
| Inverse Surface | #303031 / #303031 | 0 | #e4e2e2 / #e4e2e2 | 0 | 0 | 0 | 0 | 0 |
| Inverse On Surface | #f3f0f0 / #f3f0f1 | 0.5 | #303031 / #303031 | 0 | 0.5 | 3.4 | 1.9 | 12.5 |
| Inverse Primary | #ffb4aa / #ffb4aa | 0 | #bd0f13 / #ba1918 | 0.9 | 0 | 0 | 8 | 8 |
| Primary Fixed | #ffdad5 / #ffdad5 | 0 | #ffdad5 / #ffdad5 | 0 | 40.9 | 54.9 | 0 | 0 |
| On Primary Fixed | #410001 / #410001 | 0 | #410001 / #410001 | 0 | 88.1 | 88.1 | 6.2 | 23 |
| Primary Fixed Dim | #ffb4aa / #ffb4aa | 0 | #ffb4aa / #ffb4aa | 0 | 42.1 | 59.5 | 0 | 0 |
| On Primary Fixed Variant | #930008 / #930008 | 0 | #930008 / #930008 | 0 | 63.6 | 63.6 | 6.2 | 23.5 |
| Secondary Fixed | #dae3f0 / #dae3f0 | 0 | #dae3f0 / #dae3f0 | 0 | 34.8 | 51.5 | 0 | 0 |
| On Secondary Fixed | #141c25 / #141c25 | 0 | #141c25 / #141c25 | 0 | 85.6 | 85.6 | 2.9 | 8.7 |
| Secondary Fixed Dim | #bec7d4 / #bec7d4 | 0 | #bec7d4 / #bec7d4 | 0 | 39.6 | 59 | 0 | 0 |
| On Secondary Fixed Variant | #3f4852 / #3f4852 | 0 | #3f4852 / #3f4852 | 0 | 57.7 | 57.7 | 5.6 | 16.9 |
| Tertiary Fixed (+3 more) | #dae3f0 / not emitted | - | #dae3f0 / not emitted | - | - | - | - | - |
| Surface Dim | #dcd9da / #dcd9da | 0 | #131314 / #131314 | 0 | 4.7 | 8.2 | 0 | 0 |
| Surface Bright | #fbfafa / #fcf9f9 | 1 | #39393a / #39393a | 0 | 0 | 0 | 3.7 | 7.7 |
| Surface Container Lowest | #ffffff / #ffffff | 0 | #0e0e0f / #0e0e0f | 0 | 0 | 0 | 1.2 | 2.4 |
| Surface Container Low | #f6f3f3 / #f6f3f3 | 0 | #1b1b1c / #1b1b1c | 0 | 0 | 0.6 | 0.6 | 1.3 |
| Surface Container | #eae7e8 / #f0edee | 1.3 | #1f1f20 / #1f1f20 | 0 | 1.3 | 2.6 | 2.9 | 5.4 |
| Surface Container High | #e7e3e3 / #eae7e8 | 1 | #2a2a2b / #2a2a2b | 0 | 2.4 | 4.4 | 2.7 | 5.5 |
| Surface Container Highest | #e4e2e2 / #e4e2e2 | 0 | #353535 / #353535 | 0 | 3.9 | 6.6 | 2.9 | 5.8 |

Summary per scheme (45 roles, dE):

| Figma file | mean | median | within dE <= 2 | within dE <= 5 | above dE 10 |
|---|---|---|---|---|---|
| Light | 0.6 | 0 | 42 | 43 | 1 |
| Light Medium Contrast | 15.2 | 3.9 | 19 | 25 | 17 |
| Light High Contrast | 19.6 | 8.2 | 15 | 19 | 22 |
| Dark | 3.8 | 0 | 35 | 38 | 6 |
| Dark Medium Contrast | 13.8 | 4.7 | 14 | 23 | 11 |
| Dark High Contrast | 19.8 | 9.6 | 12 | 13 | 22 |

Where it matches: Light (42 of 45 within dE 2). Where it differs, and why:

- **Light, 3 roles.** Secondary (the Figma value is the outlier, 4.1); Background and On Background (4.3). The engine was calibrated on the repo copy of `Light.tokens.json` (`src/utils/theme/__fixtures__`). **That copy differs from the Drive file in 5 roles** (Background `#F3EEEE` vs `#F2EFEF`, Surface `#FCF9F9` vs `#FAFBFB`, Surface Bright `#FCF9F9` vs `#FBFAFA`, Surface Container `#F0EDEE` vs `#EAE7E8`, Surface Container High `#EAE7E8` vs `#E7E3E3`); the Drive file is the later edit, the engine still follows the older one (`fixture.py`). The Surface / Container differences are dE 1 to 2: invisible in isolation, visible as a slightly lighter page (`#fcf9f9` against Figma `#f2efef` for Background, dE 2.1).
- **Dark, 10 roles.** Figma Dark reuses the Light container colours (`Primary Container #CC1E1C`, `Secondary Container #646D78`, `Tertiary Container #9BA4B0`, `Error Container #DE0077` in both). The engine uses Material's dark rule (tone 30 container, tone 90 on-container). The roles are `Primary/Secondary/Tertiary/Error Container` and their `On` roles (dE 2.7 to 61) plus `Background` (Figma `#1F0F0D`, 9.1). Dark is not rendered by the app today, so this is a design question for the Dark decision, not a bug.
- **Medium and High, everything contrast-driven.** The engine has one fixed ladder (tones 98/10/30/50/80 ...); the Medium/High files move tones towards the extremes (4.5:1 becomes 7:1 and 12:1). Secondary Fixed, Primary Fixed and their `On` roles differ by dE 35 to 88 because the engine hard-codes "fixed roles keep the same tones in every scheme" while stock M3 moves them with the contrast level.

### 3.3 Three other seeds

Figma only exists for the default seed. For `#1c4f8f`, `#f8e71c`, `#2e7d32` the engine changes **9 to 10 of the 49 roles** (Primary, On Primary (yellow only for light), Primary Container, On Primary Container, Surface Tint, Inverse Primary, Primary Fixed, On Primary Fixed, Primary Fixed Dim, On Primary Fixed Variant); the other 39 to 40 are byte-identical to the default seed, so their distance to Figma is the one in 3.2. A Figma comparison for the changed roles does not exist; I measured contrast instead (WCAG 2):

| Seed | Light role / on-role / container / on-container | on-primary / primary | on-container / container | primary / surface |
|---|---|---|---|---|
| `#a5000a` (default) | `#a5000a` / `#ffffff` / `#cc1e1c` / `#ffe2de` | 8.06 | 4.56 | 7.70 |
| `#1c4f8f` | `#1c4f8f` / `#ffffff` / `#3668ae` / `#dfe8ff` | 8.19 | 4.57 | 7.82 |
| `#f8e71c` | `#f8e71c` / `#1f1c00` / `#ffffff` / `#807600` | 13.43 | 4.66 | **1.22** |
| `#2e7d32` | `#2e7d32` / `#ffffff` / `#439845` / `#002604` | 5.13 | 4.55 | 4.90 |

| Seed | Dark role / on-role / container / on-container | on-primary / primary | on-container / container | primary / surface |
|---|---|---|---|---|
| `#a5000a` | `#ffb4aa` / `#690004` / `#930008` / `#ffdad5` | 7.71 | 7.24 | 10.93 |
| `#1c4f8f` | `#a8c8ff` / `#003062` / `#0e4686` / `#d6e3ff` | 7.74 | 7.28 | 10.94 |
| `#f8e71c` | `#d9c900` / `#363100` / `#4e4800` / `#f7e61a` | 7.71 | 7.24 | 10.88 |
| `#2e7d32` | `#88d982` / `#003909` / `#005312` / `#a3f69c` | 7.74 | 7.22 | 10.87 |

Findings: the light container pair sits at 4.55 to 4.66 for every seed, i.e. exactly on the AA edge by construction (Figma's own Light has 4.54 to 4.58); for the yellow seed the container clamps to `#ffffff`, which equals `Surface Container Lowest` (a container that is not visible), and the primary on surface is 1.22 (known, the fix is Frontend PR [#1528](https://github.com/OpenResilienceInitiative/ORISO-Frontend/pull/1528), see #145). Dark pairs are comfortable for all seeds. One engine-side miss in the *default* Light: `On Secondary Container / Secondary Container` is **4.46** (engine `#e6effb` on `#656e79`), under AA by 0.04; Figma's own pair (`#e7effc` on `#646d78`) is 4.54.

### 3.4 Can the engine produce Medium and High contrast, and Dark?

| Question | Answer | Evidence |
|---|---|---|
| Dark | **Yes, in the engine; off in the app.** `computeOrisoPalette(seeds, 'dark')` exists; `ACTIVE_SCHEMES = {light: true, dark: false, ...}` in `applyTenantTheme.ts`. Matches Figma Dark within dE 2 on 35 of 45 roles; the 10 misses are the container roles (3.2). | `cmp.ts` |
| Medium / High contrast from the engine as it is | **No.** There is no contrast parameter; the tone ladders in `orisoTuning.ts` are fixed constants. dE vs the four Medium/High files: mean 13.8 to 19.8. | `cmp.ts` |
| Medium / High from the library | **Yes, and exactly.** The Figma Medium/High files are the library's output: build `DynamicScheme` from the file's own palettes (Primary 40, Secondary 40, Tertiary 40, Error 40, Neutral 40, Neutral Variant 40 as `fromInt` palettes) with `contrastLevel` 0.5 and 1.0, `isDark` false/true: Light MC 0.7 mean dE, Light HC 0.6, Dark MC 1.1, Dark HC 0.7 over 47 roles (`stock.ts`). The Light and Dark files themselves are *not* stock (mean 7.6 and 4.0): they carry the hand edits of section 4. | `stock.ts`, `stock.json` |
| Medium / High from the engine's palettes | **Yes (prototype).** `proto.ts` feeds the engine's own palettes (seed palette, `SLATE`, `NEUTRAL`, `NEUTRAL_VARIANT`, error anchor) to `DynamicScheme(contrastLevel)`: on the 26 core roles it reproduces the Figma Medium/High files with mean dE 0.2 (LMC), 0.0 (LHC), 0.6 (DMC), 0.0 (DHC); only Dark MC `Tertiary Container` / `On Tertiary Container` miss (dE 5.8 / 8.2, they sit at a tone-clamp boundary). | `proto.ts` |
| Contrast guarantees across seeds | Prototype contrast (on-primary/primary, on-container/container, primary/surface, secondary/surface, on-surface/surface) is **the same for all four seeds within 0.05** because DynamicScheme picks tones, not colours: Light 6.4 / 7.2 / 6.2 / 6.2 / 16.4 at level 0, 12.0 / 5.2 / 11.5 / 11.5 / 18.0 at 0.5, 13.9 / 9.0 / 13.3 / 13.3 / 20.1 at 1.0. That includes the yellow seed, where the engine's brand-fidelity rule gives 1.22 for primary/surface at level 0: a contrast mode takes the library's tone, not the seed. | `proto-contrast.json` |

So: Medium/High is a **small addition** (about 1 function: level 0 keeps the brand-fidelity recipe, levels > 0 take the library colour, as the Figma files themselves do), not a rewrite. What it does *not* answer: the `Fixed` roles in Light/Dark are fixed by the engine, but stock M3 moves them with the level (Figma MC/HC `Primary Fixed #D32420`, `#980008`); the chat-bubble tint is `--m3-primary-fixed`, so a high-contrast mode would change the bubbles on purpose. That is a product choice for [#150](https://github.com/OpenResilienceInitiative/ORISO-Docs/issues/150).

## 4. Inconsistencies

Each claim below was checked against the files; numbers are HCT (hue, chroma, tone) from the library.

### 4.1 The ones named in the ticket

| # | Claim in the ticket | Verdict | Evidence |
|---|---|---|---|
| 1 | Secondary `#655F65`, state layer `#4C555F`, container `#646D78` | **Confirmed, and it is the Secondary that is wrong.** Light `Secondary` is H318 C5.7 T41 (a mauve-grey); its state layer is H248 C11.3 T35.7 and its container H249 C11.6 T45.6, i.e. both belong to the slate palette (Secondary 40 = `#565F6A`, H250 C11.8 T39.9). `#655F65` is in no Figma palette. The Medium/High Secondary are slate (`#2E3741`, `#242D36`) and so is Dark (`#BEC7D4`). The engine produces `#4D5660` (H249, tone 36), matching the state layer `#4C555F` at dE 0.4. The engine authors excluded it from the golden test for this reason (`orisoScheme.test.ts` comment). | `figma.json`, `knob.ts` |
| 2 | Medium/High Background `#FFF8F7` (pink) vs Light `#F2EFEF` | **Confirmed in the values, but the colour difference is mostly tone.** `#FFF8F7` is H22 C1.3 T98.1 (almost white, hint of pink), Light `#F2EFEF` is H236 C1.1 T94.7. Light has a grey page with a lighter card (`Surface #FAFBFB`, luminance .963 vs Background .868, between Container Low and Container); Medium/High have Background = Surface (.951, stock M3). So the Light design (grey page, white cards) was not carried into the other two light files, and Light's `Surface #FAFBFB` is itself cool (H207 C3.4) while Medium/High's `#FCF9F9` is warm. The engine uses Background = Surface (#fcf9f9) and says so (`orisoScheme.test.ts`). | `knob.ts`, `fixture.py` |
| 3 | Dark Background `#1F0F0D` red vs Dark Surface `#131314` neutral | **Confirmed, and worse than the ticket says.** Dark Background is **H26 C11.5 T6** (strongly red-tinted), Surface **H265 C1.6 T5.9** (neutral): same tone, five times the chroma. The same tinted family is in `On Background`: `#281715` H25 C11.4 in all three light files and `#F1EBEA` / `#FBDBD7` in Dark. Only Light's Background was neutralised; `On Background` still carries the old tint in all six files (stock M3 would be `#1C1B1C` / `#131313`). | `knob.ts`, `stock.json` |
| 4 | Duplicate `On Primary Container 2` | **Confirmed.** Same value as `On Primary Container` in all six files (`#FFE2DE`, `#FFFFFF`, `#FFFFFF`, `#FFE2DE`, `#000000`, `#220000`), no state-layer set, no consumer in code, absent from the repo benchmark fixture (310 vs 311 tokens). | `figma.json` |
| 5 | No success or warning role | **Confirmed in Figma, partly present in code.** `--m3-success` exists in the engine (constant `#0a882f`, dark = tone 80 of it) with 18 uses. `--m3-warning` is used once by the Admin's antd bridge with a fallback `#410001` and **no engine emits it**. | 2.1 table |
| 6 | Shadow = Scrim | **Confirmed.** `#000000` in all six files. They are separate in purpose (shadow = elevation, scrim = modal overlay at 32 %) but Figma gives them no opacity and the code uses black literals instead (4.4). | `figma.json` |

### 4.2 Others found

| # | Finding | Evidence |
|---|---|---|
| 7 | **Dark reuses the Light containers.** `Primary/Secondary/Tertiary/Error Container` and their `On` roles are the same hex in Light and Dark (`#CC1E1C`, `#646D78`, `#9BA4B0`, `#DE0077`; on-colours `#FFE2DE`, `#E7EFFC`, `#313A44`, `#FFF7F7`). Stock M3 and the engine make them dark in Dark (tone 30). Not wrong by contrast (4.5 to 4.6 each), but the Dark Medium/High files *do* adapt them, so the three Dark files disagree with each other (dE 0 vs 28 to 48 for `Primary Container`). | `stock.json`, 3.2 |
| 8 | **State layers are stale copies.** 147 tokens are 49 hex values times three alphas. In Light, **6 roles differ from their own scheme role**: Secondary (`#4C555F` vs `#655F65`), Background (`#FFF8F7` vs `#F2EFEF`), Surface (`#FCF9F9` vs `#FAFBFB`), Surface Bright, Surface Container (`#F0EDEE` vs `#EAE7E8`), Surface Container High. In Dark one (On Background). Medium/High: 0 differences. So the state layers were generated once from the stock set and Light was edited afterwards. | `state.py` |
| 9 | **Tertiary is a second copy of Secondary.** Same palette (hue 250, chroma 11.8, identical tones at 80 to 0), `Tertiary Fixed`, `Fixed Dim` and the `On` pairs are identical to the Secondary ones in all six files; only the container tones differ (`#9BA4B0` vs `#646D78`). The engine builds both from one `SLATE` palette. Code use: 9 occurrences in total (FE 9, AD 1). | `figma.json`, 2.1 table |
| 10 | **Neutral Variant palette contradicts the schemes.** Palette Neutral Variant 50 is `#787776` (H167, warm), but `Outline` (`#747878`, H202) and `Surface Variant` (`#E0E3E3`) in all six schemes are cool. Palette Neutral Variant 99 is `#F6FEFF` (C7.1), a cyan outlier between neutral 98 (`#FCF8F8`) and 100. The engine's cool variant palette follows the schemes (dE 2.4 mean to the Figma palette). | `pal.ts`, `knob.ts` |
| 11 | **Surface ladder is not monotonic in Light.** `Surface Bright` (`#FBFAFA`, luminance .958) is darker than `Surface` (`#FAFBFB`, .963); Dark Bright is fine. Both roles are unused. | luminance computation, 2.1 table |
| 12 | **Light Surface hue flips.** `#FAFBFB` is H207 (cool) while every container above and below it (`#F6F3F3`, `#EAE7E8`) is warm-neutral. The three light files therefore disagree about the colour of the page (cool vs warm). | `knob.ts` |
| 13 | **Fixed roles change with the contrast level in Figma but not in the engine.** `Primary Fixed` is `#FFDAD5` in Light, `#D32420` in Light Medium, `#980008` in Light High (and the `On` roles flip to white); the engine has "fixed roles keep the same tones in every scheme" (code comment). | 3.2 |
| 14 | **Error is a vivid magenta in the container too.** `Error Container #DE0077` with `On Error Container #FFF7F7` (4.55:1) is as saturated as the primary container; stock M3 would be a pale pink with dark text. A design choice, but it makes `error-container` a loud fill, which explains why FE/AD use it little (8 and 0). | `stock.json` |
| 15 | **The engine's own AA edge.** Default Light `On Secondary Container/Secondary Container` 4.46 (engine) vs 4.54 (Figma); `Outline` on `Surface` is 4.3 (fine for non-text 3:1, below 4.5 if used for text). | `seeds.ts` |
| 16 | **Stale benchmark.** The repo fixture `__fixtures__/Light.tokens.json` differs from the Drive file in 5 roles (3.2) and lacks `On Primary Container 2`; the engine header still says it "reproduces ... hex-exactly" the benchmark. | `fixture.py` |
| 17 | **Two defined-nowhere tokens in use.** `--m3-state-layer-on-surface` (Admin, 9 uses) and `--m3-warning` (Admin, 1) have no producer. | 2.1 table |

### 4.3 Where code compensates for the token set (hand-made state layers, washes, scrims)

Counts from `alpha.py` on `origin/dev`, non-test, non-story source:

| Pattern | Frontend | Admin | Why it is a state-layer or scrim case |
|---|---|---|---|
| `rgba(27, 27, 28, a)` = `on-surface` as hover/pressed overlay, a in 0.04 to 0.14 | 30 uses, 11 files (e.g. `orisoInputDesign.ts:30` `hoverLayer: rgba(27,27,28,0.04)`) | 9 uses, 7 files (`rgb(27 27 28 / 8%)`, all behind the undefined `--m3-state-layer-on-surface`) | = Figma `State Layers / On Surface / Opacity-08`, pasted as a number |
| `rgba(165, 0, 10, a)` = **default primary** as selected/focus layer, a 0.08 to 0.28 | 16 uses, 8 files (`orisoInputDesign.ts:28-29`, `message.styles.scss:1114`) | 1 (`M3RichTextEditor.module.scss:1805`) | = State Layers / Primary, but frozen to `#a5000a`: ignores the Träger's primary |
| `--m3-hover-layer` / `--m3-selected-layer` | 4 + 4 files | 1 | engine constants `#f9eff0` / `#f5e6e7` for every seed (4.2 / 2.1) |
| `rgba(255, 255, 255, 0.08)` hover on the dark snackbar | `M3Snackbar.tsx:237,262`, `JoinRequestSnackbar.tsx:36` | - | = State Layers / Inverse On Surface / Opacity-08 (`#F3F0F0` at 8 %); one token role covers it |
| **Dialog backdrop `rgba(255, 255, 255, 0.8)` + blur** | `m3Dialog.styles.scss:15` (blur 4px), `modal/OrisoDialog.tsx:50` (blur 2px), `pseudonym/LeaveQueueDialog.styles.scss:27` | `Modal/index.tsx:141`, `FormPluginEditor/M3RichTextEditor.tsx:1664` and `:1715` (all blur 4px) | the hand-made half-transparent white of the ticket, six sites. Material's scrim role is black at 32 % |
| Dialog backdrop as black literal | `ShortcutHelpDialog.styles.scss:12` (0.4), `CommandPaletteDialog.styles.scss:12` (0.45) | - | should be `--m3-scrim` at 32 to 40 %; `attachmentCard.styles.scss:140` already does it right: `color-mix(in srgb, var(--m3-scrim, #000) 45%, transparent)` |
| Frosted-glass surfaces `rgba(255,255,255, 0.92 / 0.94 / 0.96 / 0.98)` | about 12 sites (registration stepper/footer, `sessionsList.styles.scss:368`, `GroupCallWidget.scss:457`, `messageSubmitInterface.styles.scss:531,1928`, ...) | - | a surface at 92 to 98 % opacity: `color-mix(in srgb, var(--m3-surface-container-lowest) 94%, transparent)` keeps the look and follows the theme |
| `rgba(0,0,0,a)` used in a shadow declaration | 114 uses, 41 files | 49, 15 | elevation shadows; `--m3-shadow` exists and is used 8 times, all in the Admin (`color-mix(... var(--m3-shadow) 30%/15%)`); the Frontend never reads it |

Of the unused or barely used roles, the ones that would simplify the visuals if applied:

1. **`Scrim` for the six white-wash backdrops and the two black literals.** Not a drop-in: the design is a *white wash with blur* (page fades out, dialog pops), a scrim is a *dark* overlay. Two choices, per the map's "no bazooka" rule both need a before/after screenshot: (a) keep the look and tokenise it, `color-mix(in srgb, var(--m3-surface) 80%, transparent)` (white becomes `#fcf9f9`, dE ~2, no visible change), or (b) go to the Material look, `--m3-scrim` at 32 %. Opacity is a single constant, so this is where Figma's "Surfaces / state layer" idea helps least and a `--m3-scrim-opacity` helps most.
2. **State layers for the ~55 hand-made hover/selected/focus overlays.** The three opacities as numbers plus `color-mix(in srgb, var(--m3-on-surface) 8%, transparent)` replaces `rgba(27,27,28,...)`; `var(--m3-primary)` at 8 % replaces `rgba(165,0,10,0.08)` and, unlike the pasted number, follows a Träger's colour (this is a **visible fix** for non-red Träger, not a no-op).
3. **`Inverse On Surface` state layer** for the snackbar hover (3 sites).
4. **`Surface Container Lowest` / `Surface` at high opacity** for the frosted headers and footers (12 sites).
5. **`Shadow` in the Frontend** (114 black-alpha shadows could read `--m3-shadow`); the benefit is small (shadows rarely need a hue) and the risk is zero, so last priority.

## 5. A Träger tunes only the tone of the fixed grey

### 5.1 What "the fixed grey" is in the engine

Secondary and Tertiary both come from one tonal palette `SLATE = {hue 249, chroma 11.5}`; the neutral surfaces come from two other fixed palettes (`NEUTRAL` hue 250.5 chroma 1.5; `NEUTRAL_VARIANT` 210.5 / 4.25). A Träger accent seed replaces the Secondary palette (`harmonizedAccentPalette`); with no accent the slate stays. `--m3-secondary` alone is read 128 times in the Frontend and 28 times in the Admin (Tertiary 9): it is *the* grey of the UI (icons, secondary text, chips, menus).

### 5.2 The knob

One signed number, `warmth` w in [-1, +1] (a slider "cooler  |  neutral  |  warmer", stored as one small integer, 0 = default of today):

```text
for developers: the whole calculation, 5 lines; tones stay fixed, so contrast does not depend on w
COOL = { hue: 249, chroma: 11.5 }      // today's SLATE
WARM = { hue: 60,  chroma: 8.0 }       // beige-brown grey
palette(w) = fromHueAndChroma(w < 0 ? COOL.hue : WARM.hue,
                              |w| * (w < 0 ? COOL.chroma : WARM.chroma))
secondary roles = palette(w).tone(36 | 46 | 94 ...)   // SECONDARY_TONES unchanged
```

`w = 0` has chroma 0, a pure grey (hue irrelevant). Why this is safe: HCT fixes *tone* (perceived lightness) while hue and chroma move, so contrast between two roles stays almost constant. Chroma is capped at 11.5 (cool) and 8 (warm); I did not run a full gamut-clipping check over every tone, only the tones listed in 5.3. A stored value outside [-1, 1] is clamped. Unset (`null`) must mean today's look, i.e. `w = -1` (the current slate), so existing Träger do not change; the slider's centre is a pure grey.

### 5.3 Resulting values (seed-independent; surface = engine surface `#fcf9f9`, dark `#131314`)

Computed with `knob2.ts` through the engine's own `SECONDARY_TONES` (role 36, container 46, on-container 94, on-colour white if >= 4.5).

| Setting | Hue / chroma | Light secondary | on-secondary | Light container | on-container | Secondary / surface | on / secondary | on-container / container |
|---|---|---|---|---|---|---|---|---|
| **Cool** (w = -1, = today) | 249 / 11.5 | `#4d5660` | `#ffffff` | `#656e79` | `#e6effb` | **7.12** | 7.46 | 4.46 |
| **Neutral** (w = 0) | - / 0 | `#555555` | `#ffffff` | `#6d6d6d` | `#eeeeee` | **7.12** | 7.46 | 4.46 |
| **Warm** (w = +1) | 60 / 8.0 | `#605248` | `#ffffff` | `#796a5f` | `#feeadc` | **7.17** | 7.51 | 4.46 |
| slightly cool (w = -0.5) | 249 / 5.8 | `#52555a` | `#ffffff` | `#6a6d72` | `#eceef3` | 7.15 | 7.48 | 4.47 |
| slightly warm (w = +0.5) | 60 / 4.0 | `#5b534e` | `#ffffff` | `#746b66` | `#f7ece5` | 7.18 | 7.52 | 4.48 |

Dark scheme, same three settings (secondary / container / on-container, contrast of secondary on `#131314`): cool `#bec7d4` / `#3f4852` / `#dae3f0` (10.88), neutral `#c6c6c6` / `#474747` / `#e2e2e2` (10.87), warm `#d6c3b6` / `#51443b` / `#f3dfd1` (10.91).

Reading: the knob moves hue and saturation of the grey and leaves contrast within 0.06 of today's (7.12 to 7.18); that is the point and the guarantee. **One thing it exposes:** the container pair is **4.46** at every setting, below AA 4.5 by 0.04 — an existing property of the tone recipe (`container 46` against `onContainer 94`), not of the knob. A knob rollout should fix it in the same step: nudge `SECONDARY_TONES.container` to 45 (or `onContainer` to 95), which brings the pair to 4.5 or more at all settings. Figma's own Light file (`#E7EFFC` on `#646D78`) sits at 4.54 for the same reason.

Not in scope but visible: the warm setting at hue 318 (what Figma's `#655F65` actually is) gives a purple-grey (`#5c515f`) rather than warm; a *warm* grey needs hue 40 to 70. A designer who wants Figma's original `#655F65` look should know it is a mauve, not a beige.

### 5.4 Limits

- The knob changes *Secondary and Tertiary only*. The surfaces (`NEUTRAL`, `NEUTRAL_VARIANT`) stay fixed unless the same `w` is also applied to them at a small chroma (suggest chroma 1.5 / 4.25 scaled the same way); that would shift every page background by up to dE ~2 and is a separate decision.
- If a Träger sets an accent colour, Secondary comes from the accent, not from the slate; the knob then has no effect on Secondary. Whether the knob should apply to the neutral tones only in that case is open.
- The Admin engine keeps `--m3-secondary` as a hard-coded `#4c555f`; the knob requires the shared engine first (#147).

## 6. Proposed simplified role set

Principles: keep every role that has real consumers; remove dead, duplicate and contradicting roles; put state layers and scrim in as numbers, not as 150 colours; add the missing success/warning pair. Every removal below must be checked against its current consumers with a before/after screenshot (the map's rule); consumer counts are in 2.1.

| Group | Keep | Remove / merge | Add |
|---|---|---|---|
| Brand (Träger primary) | `primary`, `on-primary`, `primary-container`, `on-primary-container`, `primary-fixed`, `primary-fixed-dim`, `on-primary-fixed`, `on-primary-fixed-variant` (8) | `--m3-primary-outline` becomes an alias of `on-primary-fixed-variant` (already equal) | - |
| Secondary (grey, Träger tunes tone) | `secondary`, `on-secondary`, `secondary-container`, `on-secondary-container`, `secondary-fixed`, `-fixed-dim`, `on-secondary-fixed`, `on-secondary-fixed-variant` (8) | **all Tertiary roles (4 + 4 fixed) and `On Primary Container 2`**: Tertiary = Secondary palette; 9 consumers repoint (container differs: `#9BA4B0` vs `#646D78`, so check the 4 uses of `tertiary-container` by screenshot) | - |
| Error / signal | `error`, `on-error`, `error-container`, `on-error-container` (4) | - | - |
| Status | - | - | `success`, `on-success` (existing anchor `#0a882f`), `warning`, `on-warning` (new, anchor to be chosen by design; on-colour by the same AA rule as `onRole`); containers only if a consumer appears |
| Neutral | `surface`, `on-surface`, `surface-variant`, `on-surface-variant`, `outline`, `outline-variant`, `surface-container-lowest/low/container/high/highest` (11), `background` (only if the Light "grey page" is kept as a separate role, otherwise alias of `surface`) | `on-background` becomes alias of `on-surface` (removes the red tint in all six files; the Admin's repurposed use gets its own `--admin-*` name), `surface-dim`, `surface-bright`, `surface-tint` (unused, tint family is legacy) | - |
| Inverse | `inverse-surface`, `inverse-on-surface`, `inverse-primary` (3) | - | - |
| Overlay | `shadow` (colour), `scrim` (colour) | Figma's `Shadow` = `Scrim` stays two names for two purposes, but each gets a **purpose-fixed opacity**, not a state-layer set | `--m3-scrim-opacity: 32%` and the white-wash decision of 4.3 |
| State layers | - | **all 147 tokens** | `--m3-state-hover: 8%`, `--m3-state-focus: 10%`, `--m3-state-dragged: 16%` (pressed = focus 10 %); applied as `color-mix(in srgb, var(--m3-on-<role>) <state>, transparent)` |
| Surfaces / add-ons | - | the 5 `Surface Tint x %` tokens (replaced by `surface-container-*`); `Section background #F5F5F5` becomes `surface-container-low` (`#F6F3F3`, dE ~1, 7 call sites, check by screenshot) | - |
| Palettes | internal engine input only; stay in Figma as documentation of the six palettes | not exported as tokens (nothing consumes them) | - |
| Non-Figma tokens in use | - | `--m3-hover-layer`, `--m3-selected-layer` become `primary` at 8 % / 12 % (fixes the seed-independence bug); `--m3-primary-hover` stays (47 uses, an interaction role) | - |

Count: 50 scheme roles become **40** (50 - 14 removed + 4 added: removed are `On Primary Container 2`, 4 Tertiary, 4 Tertiary Fixed, `Surface Dim`, `Surface Bright`, `Surface Tint`, `On Background`), 147 state layers become **3** numbers (+1 scrim opacity), Surfaces 5 and the add-on 1 become **0**, Palettes 108 stay internal. A contrast mode (Medium/High) adds no roles: it changes the tones of the existing ones (3.4).

What this proposal does **not** decide: Dark fidelity (the app does not render it), whether `background` stays separate from `surface`, the warning hue, and the exact warmth endpoints. Those need a design call and a screenshot.

## 7. How to reproduce

Scratch files in `research/figma-tokens-vs-engine-scratch/` (scripts expect `fe/` = `orisoScheme.ts` + `orisoTuning.ts` from Frontend `origin/dev` next to them and the flattened tokens as `../figma.json` = `figma-flat.json`; dependencies `@material/material-color-utilities@0.4.0`, `culori`, `tsx`; no dependency installed in any repo, nothing in `~/ORISO` touched):

```text
for developers: commands, in order
cmp.ts       engine vs six Figma schemes per role (writes rows.json)         npx tsx cmp.ts
stock.ts     stock M3 DynamicScheme (contrastLevel 0 / 0.5 / 1) vs the files  npx tsx stock.ts
proto.ts     engine palettes through DynamicScheme(contrastLevel), 4 seeds    npx tsx proto.ts
seeds.ts     4 seeds, changed roles, contrast ratios, Figma pair ratios       npx tsx seeds.ts
knob2.ts     the warmth knob: cool / neutral / warm values and contrast       npx tsx knob2.ts
pal.ts       engine palettes vs the Figma Palettes group                      npx tsx pal.ts
usage.py     role usage in FE/AD source (tarballs of origin/dev)              python3 usage.py ; python3 mk.py
alpha.py     hand-made translucent colours (dialogs, state layers, shadows)   python3 alpha.py
fixture.py   repo benchmark fixture vs Drive Light file
```

## 8. Limits

- Usage counts are string occurrences on `origin/dev` source (Frontend `1154ca44`, Admin `4faddc30`), not rendered DOM; `var(--m3-x, #fallback)` lines count as uses; stories, tests and the engine/static-fallback files are excluded. Deployed Dev was not probed.
- Figma exists for one seed; no Figma reference for the seed-dependent roles of other seeds. Their check is contrast, not distance.
- dE is CIEDE2000 on sRGB values; other metrics (RGB distance) are in `rows.json` and rank the roles the same way.
- The Medium/High prototype covers the 26 core roles, not the Fixed roles and not the brand-fidelity rule (seed as role colour); `proto.ts` does not touch the Frontend code.
- The "where was it edited" statements (Light hand-edited after generation) are inferred from the numbers (stock reproduction, state-layer mismatch, repo fixture), not from the Figma version history, which was not read.
- No screenshots were taken. Every swap named in 4.3 and 6 needs the before/after check before it goes into an epic.
