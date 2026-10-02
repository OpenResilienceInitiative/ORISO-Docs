import { TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { differenceCiede2000 } from 'culori';
import { readFileSync } from 'node:fs';
import { NEUTRAL, NEUTRAL_VARIANT, SLATE, DEFAULT_SIGNAL } from './fe/orisoTuning';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'))['Light'];
const dE = differenceCiede2000();
const tones = [100, 99, 98, 95, 90, 80, 70, 60, 50, 40, 35, 30, 25, 20, 15, 10, 5, 0];
const eng: Record<string, TonalPalette> = {
	Primary: TonalPalette.fromInt(argbFromHex('#a5000a')),
	Secondary: TonalPalette.fromHueAndChroma(SLATE.hue, SLATE.chroma),
	Tertiary: TonalPalette.fromHueAndChroma(SLATE.hue, SLATE.chroma),
	Error: TonalPalette.fromInt(argbFromHex(DEFAULT_SIGNAL.anchorSeed)),
	Neutral: TonalPalette.fromHueAndChroma(NEUTRAL.hue, NEUTRAL.chroma),
	'Neutral Variant': TonalPalette.fromHueAndChroma(NEUTRAL_VARIANT.hue, NEUTRAL_VARIANT.chroma)
};
for (const [n, p] of Object.entries(eng)) {
	const ds = tones.map((t) => dE(fig[`/Palettes/${n} ${t}`][0], hexFromArgb(p.tone(t))));
	const worst = ds.map((d, i) => [d, tones[i]]).sort((a: any, b: any) => b[0] - a[0])[0];
	console.log(n.padEnd(16), 'mean', (ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(1), 'max', worst[0].toFixed(1), 'at tone', worst[1], '<=2:', ds.filter((d) => d <= 2).length + '/18');
}
