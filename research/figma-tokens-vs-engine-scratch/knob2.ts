import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { wcagContrast } from 'culori';
import { readFileSync } from 'node:fs';
import { SLATE, SECONDARY_TONES, NEUTRAL, NEUTRAL_VARIANT } from './fe/orisoTuning';
import { computeOrisoPalette } from './fe/orisoScheme';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'));
const h = (x: string) => { const c = Hct.fromInt(argbFromHex(x)); return `H${c.hue.toFixed(0)} C${c.chroma.toFixed(1)} T${c.tone.toFixed(1)}`; };
console.log('--- HCT of the colours in question');
for (const [n, x] of Object.entries<string>({
	'Light Secondary': fig['Light']['/Schemes/Secondary'][0], 'Secondary state layer': fig['Light']['/State Layers/Secondary/Opacity-08'][0],
	'Light Sec Container': fig['Light']['/Schemes/Secondary Container'][0], 'Palette Secondary 40': fig['Light']['/Palettes/Secondary 40'][0],
	'Palette Secondary 50': fig['Light']['/Palettes/Secondary 50'][0], 'Light Surface': fig['Light']['/Schemes/Surface'][0],
	'Light Background': fig['Light']['/Schemes/Background'][0], 'MC Background': fig['Light Medium Contrast']['/Schemes/Background'][0],
	'Dark Background': fig['Dark']['/Schemes/Background'][0], 'Dark Surface': fig['Dark']['/Schemes/Surface'][0],
	'On Background': fig['Light']['/Schemes/On Background'][0], 'On Surface': fig['Light']['/Schemes/On Surface'][0],
	'Neutral 50 (palette)': fig['Light']['/Palettes/Neutral 50'][0], 'Outline (scheme)': fig['Light']['/Schemes/Outline'][0],
	'NeutralVar 50 (palette)': fig['Light']['/Palettes/Neutral Variant 50'][0], 'NeutralVar 99': fig['Light']['/Palettes/Neutral Variant 99'][0], 'NeutralVar 98': fig['Light']['/Palettes/Neutral Variant 98'][0],
	'Tertiary 40': fig['Light']['/Palettes/Tertiary 40'][0], 'Secondary 99': fig['Light']['/Palettes/Secondary 99'][0]
})) console.log(n.padEnd(26), x, h(x));
console.log('engine SLATE', SLATE, 'NEUTRAL', NEUTRAL, 'VARIANT', NEUTRAL_VARIANT);

console.log('--- knob: warmth w in [-1,1]; chroma = C_MAX*|w|; hue = cool for w<0, warm for w>0');
const COOL_HUE = SLATE.hue; const COOL_C = SLATE.chroma;
const warmRef = Hct.fromInt(argbFromHex(fig['Light']['/Schemes/Secondary'][0]));
const WARM_HUE = 60; const WARM_C = 8;
console.log('warm hue taken from Figma Light Secondary', WARM_HUE, 'chroma', warmRef.chroma.toFixed(1));
const pal = (w: number) => TonalPalette.fromHueAndChroma(w < 0 ? COOL_HUE : WARM_HUE, Math.abs(w) * (w < 0 ? COOL_C : WARM_C));
const surfaceLight = computeOrisoPalette({ primary: '#a5000a' }, 'light').tokens['--m3-surface'];
const surfaceDark = computeOrisoPalette({ primary: '#a5000a' }, 'dark').tokens['--m3-surface'];
console.log('surface light', surfaceLight, 'dark', surfaceDark);
const T = SECONDARY_TONES;
const hx = (a: number) => hexFromArgb(a).toLowerCase();
for (const [name, w] of [['cool', -1], ['neutral', 0], ['warm', 1], ['slightly cool', -0.5], ['slightly warm', 0.5]] as [string, number][]) {
	const p = pal(w);
	const role = hx(p.tone(T.role)), cont = hx(p.tone(T.container)), onCont = hx(p.tone(T.onContainer)), on = '#ffffff';
	const sd = hx(p.tone(80)), sdc = hx(p.tone(30)), odc = hx(p.tone(90)), ond = hx(p.tone(20));
	const fx = hx(p.tone(90));
	const cr = (a: string, b: string) => wcagContrast(a, b).toFixed(2);
	console.log(`${name.padEnd(14)} w=${w} H${(w < 0 ? COOL_HUE : WARM_HUE)} C${(Math.abs(w) * (w < 0 ? COOL_C : WARM_C)).toFixed(1)} | light: secondary ${role} on-sec ${on} container ${cont} on-cont ${onCont} fixed ${fx} || sec/surface ${cr(role, surfaceLight)} on/sec ${cr(on, role)} cont-text ${cr(onCont, cont)} || dark: secondary ${sd} cont ${sdc} on-cont ${odc} on-sec ${ond} sec/surface ${cr(sd, surfaceDark)} on/sec ${cr(ond, sd)}`);
}
