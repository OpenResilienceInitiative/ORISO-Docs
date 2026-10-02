// Prototype: engine palettes (orisoTuning) fed to the library's contrast-level scheme.
import { DynamicScheme, MaterialDynamicColors, Variant, TonalPalette, Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { differenceCiede2000, wcagContrast } from 'culori';
import { readFileSync, writeFileSync } from 'node:fs';
import { NEUTRAL, NEUTRAL_VARIANT, SLATE, DEFAULT_SIGNAL } from './fe/orisoTuning';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'));
const dE = differenceCiede2000();
const D: any = MaterialDynamicColors;
const roles: Record<string, any> = {
	Primary: D.primary, 'On Primary': D.onPrimary, 'Primary Container': D.primaryContainer, 'On Primary Container': D.onPrimaryContainer,
	Secondary: D.secondary, 'On Secondary': D.onSecondary, 'Secondary Container': D.secondaryContainer, 'On Secondary Container': D.onSecondaryContainer,
	Tertiary: D.tertiary, 'On Tertiary': D.onTertiary, 'Tertiary Container': D.tertiaryContainer, 'On Tertiary Container': D.onTertiaryContainer,
	Error: D.error, 'On Error': D.onError, 'Error Container': D.errorContainer, 'On Error Container': D.onErrorContainer,
	Surface: D.surface, 'On Surface': D.onSurface, 'Surface Variant': D.surfaceVariant, 'On Surface Variant': D.onSurfaceVariant,
	Outline: D.outline, 'Outline Variant': D.outlineVariant, 'Surface Container': D.surfaceContainer, 'Surface Container High': D.surfaceContainerHigh,
	'Inverse Surface': D.inverseSurface, 'Inverse Primary': D.inversePrimary
};
export const scheme = (seed: string, dark: boolean, cl: number) => {
	const src = Hct.fromInt(argbFromHex(seed));
	return new DynamicScheme({
		sourceColorHct: src, variant: Variant.TONAL_SPOT, contrastLevel: cl, isDark: dark,
		primaryPalette: TonalPalette.fromInt(argbFromHex(seed)),
		secondaryPalette: TonalPalette.fromHueAndChroma(SLATE.hue, SLATE.chroma),
		tertiaryPalette: TonalPalette.fromHueAndChroma(SLATE.hue, SLATE.chroma),
		neutralPalette: TonalPalette.fromHueAndChroma(NEUTRAL.hue, NEUTRAL.chroma),
		neutralVariantPalette: TonalPalette.fromHueAndChroma(NEUTRAL_VARIANT.hue, NEUTRAL_VARIANT.chroma),
		errorPalette: TonalPalette.fromInt(argbFromHex(DEFAULT_SIGNAL.anchorSeed))
	} as any);
};
const out: any = {};
const names: [string, boolean, number][] = [
	['Light Medium Contrast', false, 0.5], ['Light High Contrast', false, 1], ['Dark Medium Contrast', true, 0.5], ['Dark High Contrast', true, 1]
];
for (const [fn, dark, cl] of names) {
	const s = scheme('#a5000a', dark, cl);
	const ds: number[] = []; const bad: any[] = [];
	for (const [r, dc] of Object.entries(roles)) {
		const h = hexFromArgb(dc.getArgb(s)).toLowerCase();
		const f = fig[fn]['/Schemes/' + r][0].toLowerCase();
		const d = +dE(f, h).toFixed(1); ds.push(d);
		if (d > 5) bad.push([r, f, h, d]);
	}
	const sorted = [...ds].sort((a, b) => a - b);
	console.log(fn, 'mean', (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1), 'median', sorted[Math.floor(ds.length / 2)], '<=2', ds.filter((x) => x <= 2).length, '/', ds.length, 'bad>5', JSON.stringify(bad));
}
// contrast ratios of key pairs for 4 seeds at 3 levels, light
const pairs: [string, string][] = [['On Primary', 'Primary'], ['On Primary Container', 'Primary Container'], ['Primary', 'Surface'], ['On Secondary', 'Secondary'], ['Secondary', 'Surface'], ['On Surface', 'Surface'], ['Outline', 'Surface']];
const tab: any = {};
for (const seed of ['#a5000a', '#1c4f8f', '#f8e71c', '#2e7d32']) {
	for (const dark of [false, true]) for (const cl of [0, 0.5, 1]) {
		const s = scheme(seed, dark, cl);
		const g = (r: string) => hexFromArgb(roles[r].getArgb(s));
		tab[`${seed}|${dark ? 'dark' : 'light'}|${cl}`] = pairs.map(([a, b]) => +wcagContrast(g(a), g(b)).toFixed(2));
	}
}
writeFileSync('proto-contrast.json', JSON.stringify({ pairs, tab }, null, 1));
