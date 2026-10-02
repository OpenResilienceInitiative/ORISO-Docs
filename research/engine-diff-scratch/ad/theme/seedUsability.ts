/** Same threshold as ORISO-Frontend `TOO_PALE_CHROMA`. */
export const TOO_PALE_CHROMA = 12;

const HEX6 = /^#[0-9a-f]{6}$/i;

/**
 * Material Color Utilities `ViewingConditions.DEFAULT` (sRGB-like). Hard-coded
 * so we do not depend on `@material/material-color-utilities`, whose barrel
 * graph uses extensionless ESM imports that Vitest 4 rejects.
 */
const DEFAULT_VIEWING = {
    n: 0.18418651851244416,
    aw: 29.980997194447333,
    nbb: 1.0169191804458755,
    ncb: 1.0169191804458755,
    c: 0.69,
    nc: 1,
    rgbD: [1.02117770275752, 0.9863077294280124, 0.9339605082802299] as const,
    fl: 0.3884814537800353,
    fLRoot: 0.7894826179304937,
    z: 1.909169568483652,
};

const linearized = (rgbComponent: number): number => {
    const normalized = rgbComponent / 255.0;
    if (normalized <= 0.040449936) {
        return (normalized / 12.92) * 100.0;
    }
    return ((normalized + 0.055) / 1.055) ** 2.4 * 100.0;
};

const signum = (num: number): number => {
    if (num < 0) {
        return -1;
    }
    if (num === 0) {
        return 0;
    }
    return 1;
};

const sanitizeDegrees = (degrees: number): number => {
    let value = degrees % 360.0;
    if (value < 0) {
        value += 360.0;
    }
    return value;
};

/**
 * CAM16 chroma for a `#rrggbb` seed under Material's default viewing
 * conditions — same quantity Frontend checks against `TOO_PALE_CHROMA`.
 */
export const hctChromaFromHex = (hex: string): number => {
    const red = parseInt(hex.slice(1, 3), 16);
    const green = parseInt(hex.slice(3, 5), 16);
    const blue = parseInt(hex.slice(5, 7), 16);
    const redL = linearized(red);
    const greenL = linearized(green);
    const blueL = linearized(blue);
    const x = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL;
    const y = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL;
    const z = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL;
    const rC = 0.401288 * x + 0.650173 * y - 0.051461 * z;
    const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
    const bC = -0.002079 * x + 0.048952 * y + 0.953127 * z;
    const rD = DEFAULT_VIEWING.rgbD[0] * rC;
    const gD = DEFAULT_VIEWING.rgbD[1] * gC;
    const bD = DEFAULT_VIEWING.rgbD[2] * bC;
    const rAF = ((DEFAULT_VIEWING.fl * Math.abs(rD)) / 100.0) ** 0.42;
    const gAF = ((DEFAULT_VIEWING.fl * Math.abs(gD)) / 100.0) ** 0.42;
    const bAF = ((DEFAULT_VIEWING.fl * Math.abs(bD)) / 100.0) ** 0.42;
    const rA = (signum(rD) * 400.0 * rAF) / (rAF + 27.13);
    const gA = (signum(gD) * 400.0 * gAF) / (gAF + 27.13);
    const bA = (signum(bD) * 400.0 * bAF) / (bAF + 27.13);
    const a = (11.0 * rA + -12.0 * gA + bA) / 11.0;
    const b = (rA + gA - 2.0 * bA) / 9.0;
    const u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0;
    const p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;
    const atanDegrees = (Math.atan2(b, a) * 180.0) / Math.PI;
    const hue = sanitizeDegrees(atanDegrees);
    const ac = p2 * DEFAULT_VIEWING.nbb;
    const j = 100.0 * (ac / DEFAULT_VIEWING.aw) ** (DEFAULT_VIEWING.c * DEFAULT_VIEWING.z);
    const huePrime = hue < 20.14 ? hue + 360 : hue;
    const eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180.0 + 2.0) + 3.8);
    const p1 = (50000.0 / 13.0) * eHue * DEFAULT_VIEWING.nc * DEFAULT_VIEWING.ncb;
    const t = (p1 * Math.sqrt(a * a + b * b)) / (u + 0.305);
    const alpha = t ** 0.9 * (1.64 - 0.29 ** DEFAULT_VIEWING.n) ** 0.73;
    return alpha * Math.sqrt(j / 100.0);
};

export const normalizeSeedHex = (value?: string | null): string | undefined => {
    if (value == null) {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (/^#[0-9a-f]{3}$/i.test(withHash)) {
        return `#${withHash[1]}${withHash[1]}${withHash[2]}${withHash[2]}${withHash[3]}${withHash[3]}`.toLowerCase();
    }

    return HEX6.test(withHash) ? withHash.toLowerCase() : undefined;
};

/**
 * True when a chosen seed cannot produce a usable palette — invalid hex, or
 * HCT chroma below the Frontend engine's `TOO_PALE_CHROMA` (near-black / grey).
 * Blank/absent is not unusable; callers omit those from the payload.
 */
export const brandSeedCannotYieldPalette = (value?: string | null): boolean => {
    const hex = normalizeSeedHex(value);
    if (!hex) {
        return Boolean(value && value.trim());
    }

    try {
        return hctChromaFromHex(hex) < TOO_PALE_CHROMA;
    } catch {
        return true;
    }
};
