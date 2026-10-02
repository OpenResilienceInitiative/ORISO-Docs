import { computeOrisoPalette, type OrisoSchemeName } from './theme/orisoScheme';
import { readSeeds, ThemingSeedFields } from './themeSeeds';

export const DEFAULT_ADMIN_SEED = '#A5000A';
const ADMIN_THEME_TOKEN_PREFIX = '--m3-';
const ADMIN_SURFACE_TOKEN_PREFIX = '--admin-';

const isAdminRuntimeToken = (name: string) =>
    name.startsWith(ADMIN_THEME_TOKEN_PREFIX) || name.startsWith(ADMIN_SURFACE_TOKEN_PREFIX);

export const clearAdminInvertedThemeTokens = (root: HTMLElement = document.documentElement): void => {
    Array.from(root.style)
        .filter(isAdminRuntimeToken)
        .forEach((name) => root.style.removeProperty(name));
};

const normalizeSeed = (
    value: string | null | undefined,
    label: string,
    { optional = false }: { optional?: boolean } = {},
): string | undefined => {
    if (!value?.trim()) {
        return undefined;
    }

    const withHash = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
    const expanded =
        withHash.length === 4
            ? `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`
            : withHash;

    if (!/^#[0-9a-f]{6}$/i.test(expanded)) {
        if (optional) {
            return undefined;
        }

        throw new Error(`Admin theming: ${label} seed is not a valid hex colour.`);
    }

    return expanded.toLowerCase();
};

const applyAdminSchemeTheme = (
    theming: ThemingSeedFields | null | undefined,
    scheme: OrisoSchemeName,
    root: HTMLElement = document.documentElement,
): boolean => {
    try {
        const seeds = readSeeds(theming);
        const primary = normalizeSeed(seeds.primary ?? seeds.accentDark, 'primary') ?? DEFAULT_ADMIN_SEED;
        const accent = normalizeSeed(seeds.accent ?? seeds.accentLight, 'accent', { optional: true });
        const { tokens } = computeOrisoPalette(
            {
                accentDark: primary,
                accentLight: accent,
                primary,
                accent,
            },
            scheme,
        );

        Object.entries(tokens)
            .filter(([name]) => isAdminRuntimeToken(name))
            .forEach(([name, value]) => {
                root.style.setProperty(name, value);
            });

        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Admin theming: stored seed is invalid, keeping the static palette.', error);
        clearAdminInvertedThemeTokens(root);
        return false;
    }
};

/**
 * Apply the light admin surface palette (the default admin appearance). Writes
 * the tenant-seeded `--m3-*`/`--admin-*` tokens so the runtime theme matches the
 * light components shown in Storybook.
 */
export const applyAdminTheme = (
    theming: ThemingSeedFields | null | undefined,
    root: HTMLElement = document.documentElement,
): boolean => applyAdminSchemeTheme(theming, 'light', root);

/**
 * Apply the dark/inverted admin surface palette. Retained for surfaces that opt
 * into the inverted shell (e.g. theme-builder previews).
 */
export const applyAdminInvertedTheme = (
    theming: ThemingSeedFields | null | undefined,
    root: HTMLElement = document.documentElement,
): boolean => applyAdminSchemeTheme(theming, 'inverted', root);
