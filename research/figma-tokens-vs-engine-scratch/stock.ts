import { DynamicScheme, MaterialDynamicColors, Variant, TonalPalette, Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { differenceCiede2000 } from 'culori';
import { readFileSync, writeFileSync } from 'node:fs';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'));
const dE = differenceCiede2000();
const pal = (name: string, tone: number) => fig['Light']['/Palettes/' + name + ' ' + tone][0];
const mk = (name: string) => TonalPalette.fromInt(argbFromHex(pal(name, 40)));
const primaryP = mk('Primary'), secP = mk('Secondary'), terP = mk('Tertiary'), errP = mk('Error'), neuP = mk('Neutral'), nvP = mk('Neutral Variant');
const D: any = MaterialDynamicColors;
const map: Record<string, any> = {
	Primary: D.primary, 'On Primary': D.onPrimary, 'Primary Container': D.primaryContainer, 'On Primary Container': D.onPrimaryContainer,
	Secondary: D.secondary, 'On Secondary': D.onSecondary, 'Secondary Container': D.secondaryContainer, 'On Secondary Container': D.onSecondaryContainer,
	Tertiary: D.tertiary, 'On Tertiary': D.onTertiary, 'Tertiary Container': D.tertiaryContainer, 'On Tertiary Container': D.onTertiaryContainer,
	Error: D.error, 'On Error': D.onError, 'Error Container': D.errorContainer, 'On Error Container': D.onErrorContainer,
	Background: D.background, 'On Background': D.onBackground, Surface: D.surface, 'On Surface': D.onSurface,
	'Surface Variant': D.surfaceVariant, 'On Surface Variant': D.onSurfaceVariant, Outline: D.outline, 'Outline Variant': D.outlineVariant,
	'Surface Tint': D.surfaceTint, 'Inverse Surface': D.inverseSurface, 'Inverse On Surface': D.inverseOnSurface, 'Inverse Primary': D.inversePrimary,
	'Primary Fixed': D.primaryFixed, 'On Primary Fixed': D.onPrimaryFixed, 'Primary Fixed Dim': D.primaryFixedDim, 'On Primary Fixed Variant': D.onPrimaryFixedVariant,
	'Secondary Fixed': D.secondaryFixed, 'On Secondary Fixed': D.onSecondaryFixed, 'Secondary Fixed Dim': D.secondaryFixedDim, 'On Secondary Fixed Variant': D.onSecondaryFixedVariant,
	'Tertiary Fixed': D.tertiaryFixed, 'On Tertiary Fixed': D.onTertiaryFixed, 'Tertiary Fixed Dim': D.tertiaryFixedDim, 'On Tertiary Fixed Variant': D.onTertiaryFixedVariant,
	'Surface Dim': D.surfaceDim, 'Surface Bright': D.surfaceBright, 'Surface Container Lowest': D.surfaceContainerLowest, 'Surface Container Low': D.surfaceContainerLow,
	'Surface Container': D.surfaceContainer, 'Surface Container High': D.surfaceContainerHigh, 'Surface Container Highest': D.surfaceContainerHighest
};
const cfg: [string, boolean, number][] = [
	['Light', false, 0], ['Light Medium Contrast', false, 0.5], ['Light High Contrast', false, 1],
	['Dark', true, 0], ['Dark Medium Contrast', true, 0.5], ['Dark High Contrast', true, 1]
];
const res: any = {};
for (const [fn, dark, cl] of cfg) {
	const s = new DynamicScheme({
		sourceColorHct: Hct.fromInt(argbFromHex(pal('Primary', 40))), variant: Variant.TONAL_SPOT, contrastLevel: cl, isDark: dark,
		primaryPalette: primaryP, secondaryPalette: secP, tertiaryPalette: terP, neutralPalette: neuP, neutralVariantPalette: nvP, errorPalette: errP
	} as any);
	const ds: number[] = []; const per: any = {};
	for (const [role, dc] of Object.entries(map)) {
		if (!dc) { per[role] = null; continue; }
		const h = hexFromArgb(dc.getArgb(s)).toLowerCase();
		const f = fig[fn]['/Schemes/' + role][0].toLowerCase();
		const d = +dE(f, h).toFixed(1);
		per[role] = { stock: h, fig: f, dE: d }; ds.push(d);
	}
	res[fn] = per;
	const sorted = [...ds].sort((a, b) => a - b);
	console.log(fn, 'n', ds.length, 'mean', (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1), 'median', sorted[Math.floor(ds.length / 2)], '<=2', ds.filter((x) => x <= 2).length, '>10', ds.filter((x) => x > 10).length);
}
writeFileSync('stock.json', JSON.stringify(res, null, 1));
