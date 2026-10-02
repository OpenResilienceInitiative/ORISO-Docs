/**
 * WCAG 2.2 relative luminance and contrast ratio.
 *
 * One definition, because five drifting copies of the same formula is how a
 * contrast test starts passing against maths the app does not use.
 */

const toLinear = (value: number) => {
    const c = value / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Accepts `#abc`, `#aabbcc` and the same without the `#`. */
export const toRgb = (hex: string): [number, number, number] => {
    const h = hex.trim().replace('#', '');
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;

    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
};

export const relativeLuminance = (hex: string) => {
    const [r, g, b] = toRgb(hex);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

/** Order-independent: 1 (identical) to 21 (black on white). */
export const contrastRatio = (a: string, b: string) => {
    const [x, y] = [relativeLuminance(a), relativeLuminance(b)];

    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
