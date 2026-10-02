import { getAccentDark, getAccentLight, getSignal, TenantSeeds } from '../themeSeeds';
import { brandSeedCannotYieldPalette } from './seedUsability';
import { contrastRatio } from '../contrastRatio';

export type OrisoSchemeName = 'light' | 'inverted';

/** Angular hue distance (degrees) below which error and brand read as the same family. */
export const SIGNAL_BRAND_HUE_MIN_DISTANCE = 30;

export interface OrisoPaletteResult {
    tokens: Record<string, string>;
    tooPale: boolean;
    /** True when a custom signal seed is too close in hue to the brand accent. */
    signalTooClose: boolean;
}

const normalizeHex = (value?: string): string | undefined => {
    if (!value) {
        return undefined;
    }
    const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
    if (/^#[0-9a-f]{3}$/i.test(withHash)) {
        return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase();
    }
    return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : undefined;
};

const hexToRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
});

const rgbToHex = (r: number, g: number, b: number) =>
    `#${[r, g, b]
        .map((value) =>
            Math.max(0, Math.min(255, Math.round(value)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;

const mix = (a: string, b: string, amount: number) => {
    const start = hexToRgb(a);
    const end = hexToRgb(b);
    return rgbToHex(
        start.r + (end.r - start.r) * amount,
        start.g + (end.g - start.g) * amount,
        start.b + (end.b - start.b) * amount,
    );
};

const DEFAULT_ACCENT_DARK = '#a5000a';
/** Default error/signal seed — matches Frontend `DEFAULT_SIGNAL.light.error`. */
const SYSTEM_ERROR = '#b1005e';

/** sRGB hex → hue degrees in [0, 360). Greys return 0. */
const hueDegrees = (hex: string): number => {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    if (delta === 0) {
        return 0;
    }
    let hue = 0;
    if (max === rn) {
        hue = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
        hue = (bn - rn) / delta + 2;
    } else {
        hue = (rn - gn) / delta + 4;
    }
    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
};

/** Smallest angular distance between two hues (degrees). */
export const hueDistance = (hexA: string, hexB: string): number => {
    const delta = Math.abs(hueDegrees(hexA) - hueDegrees(hexB)) % 360;
    return Math.min(delta, 360 - delta);
};

export const signalTooCloseToBrand = (seeds: TenantSeeds): boolean => {
    const brand = normalizeHex(getAccentDark(seeds));
    const signal = normalizeHex(getSignal(seeds));
    if (!brand || !signal) {
        return false;
    }
    return hueDistance(brand, signal) < SIGNAL_BRAND_HUE_MIN_DISTANCE;
};

const resolveErrorSeed = (seeds: TenantSeeds): string => normalizeHex(getSignal(seeds)) ?? SYSTEM_ERROR;

/**
 * The rose SURFACE of the active pill — Figma's `M3/sys/light/on-primary-container`
 * value (#594.13b: "Figma hat Vorrang"). It lands on `--m3-primary-container`
 * (and its `primary-fixed`/`admin-field-selected-surface` mirrors), never on
 * `--m3-on-primary-container`: `on-*` is the readable FOREGROUND here, computed
 * by {@link readableOn}. Must stay identical to `--m3-primary-container` in
 * src/app.css, which is the static fallback for exactly this seed.
 */
const DEFAULT_ACCENT_LIGHT = '#ffe2de';
const DEFAULT_ACCENT_DIM = '#ffb4aa';
const DEFAULT_ACCENT_ACTION = '#cc1e1c';
/**
 * Active-indicator tone of the mobile bottom navigation for the default seed
 * #A5000A, taken 1:1 from Figma 56576:34607 ("Figma hat Vorrang"). Deep brand
 * red — not an alert/warning role (that Admin-only token was removed with #905).
 */
const DEFAULT_NAV_INDICATOR = '#410001';
/**
 * The dark stage surface: the desktop sidebar AND the public sign-in stage
 * panel (#594.13a). Figma calls the style `M3/sys/light/on-background`, so the
 * token keeps that name although this palette then uses an M3 *system* name in
 * an INVERTED way (a surface, not a foreground) — the same deliberate stopgap
 * as the mail palette, because there is no real dark-mode token set yet. It is
 * seed-independent on purpose: both surfaces must resolve to the identical
 * value in every scheme. See the block comment on `--m3-on-background` in
 * src/app.css before renaming or re-valuing this.
 */
const STAGE_SURFACE = '#281715';
const DARK_TEXT = '#141c25';
const ADMIN_TABLE_TOKENS = {
    '--admin-workspace-background': '#e4e2e2',
    // Keep in lockstep with src/app.css — the search control sits on
    // `--m3-surface-container-high`, the same surface as the outlined fields.
    '--admin-search-surface': '#eae7e8',
    '--admin-search-text': '#444748',
    '--admin-search-placeholder': '#444748',
    '--admin-search-icon': '#444748',
    '--admin-search-hover-surface': '#e4e2e2',
    '--admin-table-surface': '#f6f3f3',
    '--admin-table-header-surface': '#e4e2e2',
    '--admin-table-row-hover-surface': '#f0edee',
    '--admin-table-footer-surface': '#e4e2e2',
    '--admin-table-border': '#eae7e8',
    '--admin-table-text': '#444748',
    '--admin-table-header-text': '#1b1b1c',
    '--admin-table-chip-surface': '#e4e2e2',
    '--admin-table-chip-border': '#c4c7c8',
    '--admin-table-chip-text': '#444748',
    '--admin-form-field-surface': '#fcf9f9',
    '--admin-form-card-surface': '#eae7e8',
    '--admin-form-label-text': '#444748',
};

/**
 * Field anatomy tokens (#313): form-field surfaces sit one step LIGHTER than
 * `--admin-workspace-background` (#e4e2e2, surface-container-highest tier) so
 * inputs read as raised instead of muddy, with a subtle outline-variant border.
 * Selection is an "illuminated" light primary-container tonal derived from the
 * tenant seed. `--admin-form-field-surface` above is the legacy alias consumed
 * by `--input-bg`/`--input-label-bg` and must never drift from
 * `--admin-field-surface`.
 */
const adminFieldTokens = (accentLight: string, onAccentLightVariant: string) => ({
    '--admin-field-surface': '#fcf9f9',
    '--admin-field-outline': '#c4c7c8',
    '--admin-field-surface-hover': '#f6f3f3',
    '--admin-field-selected-surface': accentLight,
    '--admin-field-selected-text': onAccentLightVariant,
});

const defaultAccentTokens = (accentDark: string, explicitAccentLight?: string) => {
    if (!explicitAccentLight && accentDark === DEFAULT_ACCENT_DARK) {
        return {
            accentLight: DEFAULT_ACCENT_LIGHT,
            accentDim: DEFAULT_ACCENT_DIM,
            accentAction: DEFAULT_ACCENT_ACTION,
            onAccentLightVariant: '#930008',
            navIndicator: DEFAULT_NAV_INDICATOR,
        };
    }

    const accentLight = explicitAccentLight ?? mix(accentDark, '#ffffff', 0.84);

    return {
        accentLight,
        accentDim: mix(accentLight, accentDark, 0.16),
        accentAction: accentDark,
        onAccentLightVariant: mix(accentDark, '#000000', 0.12),
        // 0.6 towards black lands #a5000a on #420004 — i.e. the same tone the
        // default seed pins to DEFAULT_NAV_INDICATOR, so custom seeds stay in
        // the same depth register as Figma.
        navIndicator: mix(accentDark, '#000000', 0.6),
    };
};

const readableOn = (background: string) =>
    contrastRatio(DARK_TEXT, background) >= contrastRatio('#ffffff', background) ? DARK_TEXT : '#ffffff';

/**
 * Mobile bottom-navigation active indicator (Figma 56576:34607): the deep brand
 * red 56×32 pill behind the selected destination's icon. It is a SURFACE, so
 * the icon on top is {@link readableOn} of it — never the other way round. Kept
 * as its own `--admin-*` pair instead of borrowing an M3 `on-*` role name,
 * because the M3 nav bar normally uses `secondary-container` here and ORISO
 * deliberately deviates. Static fallbacks live in src/app.css.
 */
const adminNavTokens = (navIndicator: string) => ({
    '--admin-nav-indicator-surface': navIndicator,
    '--admin-nav-indicator-icon': readableOn(navIndicator),
});

const invertedTokens = (
    accentDark: string,
    accentLight: string,
    accentDim: string,
    onAccentLightVariant: string,
    errorSeed: string,
) => {
    const primary = accentLight;
    const primaryContainer = accentDark;
    const action = mix(accentLight, '#ffffff', 0.1);
    // Softened error for dark surfaces — same seed as light, lifted toward white.
    const error = errorSeed === SYSTEM_ERROR ? '#ffb1c8' : mix(errorSeed, '#ffffff', 0.35);
    const errorContainer = mix(errorSeed, '#000000', 0.35);

    return {
        ...ADMIN_TABLE_TOKENS,
        ...adminFieldTokens(accentLight, onAccentLightVariant),
        // Inverted scheme flips the indicator to the LIGHT accent: the deep red
        // pill of the light scheme would vanish against the dark surface.
        ...adminNavTokens(accentLight),
        '--m3-primary': primary,
        '--m3-on-primary': readableOn(primary),
        '--m3-primary-container': primaryContainer,
        '--m3-on-primary-container': readableOn(primaryContainer),
        '--m3-primary-fixed': accentLight,
        '--m3-primary-fixed-dim': accentDim,
        '--m3-on-primary-fixed-variant': onAccentLightVariant,
        '--m3-secondary': '#cbd6e2',
        '--m3-on-secondary': DARK_TEXT,
        '--m3-secondary-container': '#39414b',
        '--m3-on-secondary-container': '#e7effc',
        '--m3-error': error,
        '--m3-on-error': readableOn(error),
        '--m3-error-container': errorContainer,
        '--m3-on-error-container': readableOn(errorContainer),
        '--m3-surface': '#303030',
        '--m3-on-surface': '#f4eff0',
        '--m3-surface-container-lowest': '#252324',
        '--m3-surface-container-low': '#383637',
        '--m3-surface-container': '#3d3b3c',
        '--m3-surface-container-high': '#474545',
        '--m3-surface-container-highest': '#514f50',
        '--m3-on-surface-variant': '#d0c4c7',
        '--m3-surface-variant': '#494647',
        '--m3-outline': '#9a9295',
        '--m3-outline-variant': '#4d484a',
        '--m3-background': '#303030',
        '--m3-on-background': STAGE_SURFACE,
        '--m3-inverse-surface': '#fcf9f9',
        '--m3-inverse-on-surface': '#1a1c1e',
        '--oriso-app-accent': primary,
        '--oriso-app-accent-dark': accentDark,
        '--oriso-app-accent-light': accentLight,
        '--oriso-app-on-accent': readableOn(primary),
        '--oriso-app-accent-container': primaryContainer,
        '--oriso-app-chat-surface': '#ffffff',
        '--oriso-app-action': action,
        '--oriso-app-on-action': readableOn(action),
    };
};

export const computeOrisoPalette = (seeds: TenantSeeds, scheme: OrisoSchemeName = 'light'): OrisoPaletteResult => {
    const accentDark = normalizeHex(getAccentDark(seeds)) ?? DEFAULT_ACCENT_DARK;
    const explicitAccentLight = normalizeHex(getAccentLight(seeds));
    const errorSeed = resolveErrorSeed(seeds);
    const { accentLight, accentDim, accentAction, onAccentLightVariant, navIndicator } = defaultAccentTokens(
        accentDark,
        explicitAccentLight,
    );
    const onAccentDark = readableOn(accentDark);
    const onAccentLight = readableOn(accentLight);
    const onAccentAction = readableOn(accentAction);
    const tooPale = brandSeedCannotYieldPalette(getAccentDark(seeds));
    const signalTooClose = signalTooCloseToBrand(seeds);

    if (scheme === 'inverted') {
        return {
            tooPale,
            signalTooClose,
            tokens: invertedTokens(accentDark, accentLight, accentDim, onAccentLightVariant, errorSeed),
        };
    }

    return {
        tooPale,
        signalTooClose,
        tokens: {
            ...ADMIN_TABLE_TOKENS,
            ...adminFieldTokens(accentLight, onAccentLightVariant),
            ...adminNavTokens(navIndicator),
            '--m3-primary': accentDark,
            '--m3-on-primary': onAccentDark,
            '--m3-primary-container': accentLight,
            '--m3-on-primary-container': onAccentLight,
            '--m3-primary-fixed': accentLight,
            '--m3-primary-fixed-dim': accentDim,
            '--m3-on-primary-fixed-variant': onAccentLightVariant,
            '--m3-secondary': '#4c555f',
            '--m3-on-secondary': '#ffffff',
            '--m3-secondary-container': '#646d78',
            '--m3-on-secondary-container': '#e7effc',
            '--m3-error': errorSeed,
            '--m3-on-error': readableOn(errorSeed),
            '--m3-surface': '#fcf9f9',
            '--m3-on-surface': '#1a1c1e',
            '--m3-surface-container-low': '#f7f3f4',
            '--m3-surface-container': '#f0edee',
            '--m3-surface-container-high': '#eae7e8',
            '--m3-surface-container-highest': '#e4e2e2',
            '--m3-on-surface-variant': '#444748',
            '--m3-outline': '#747878',
            '--m3-outline-variant': '#c4c7c8',
            '--m3-on-background': STAGE_SURFACE,
            '--oriso-app-accent': accentDark,
            '--oriso-app-accent-dark': accentDark,
            '--oriso-app-accent-light': accentLight,
            '--oriso-app-on-accent': onAccentDark,
            '--oriso-app-accent-container': accentLight,
            '--oriso-app-chat-surface': '#ffffff',
            '--oriso-app-action': accentAction,
            '--oriso-app-on-action': onAccentAction,
        },
    };
};
