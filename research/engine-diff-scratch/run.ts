import { computeOrisoPalette as fe } from './fe/orisoScheme';
import { computeOrisoPalette as ad } from './ad/theme/orisoScheme';
import { differenceCiede2000 } from 'culori';
import { writeFileSync } from 'node:fs';
const dE = differenceCiede2000();
const rgbD = (a: string, b: string) => {
	const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const x = p(a), y = p(b);
	return Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
};
const cases: [string, any][] = [
	['#1c4f8f', '#1c4f8f'], ['#f8e71c', '#f8e71c'], ['#ffff00', '#ffff00'], ['#ffd400', '#ffd400'],
	['#a5000a (default)', '#a5000a'], ['#808080', '#808080'], ['invalid "notacolor"', 'notacolor'], ['null', null], ['undefined', undefined]
];
const cmp = (ft: any, at: any) =>
	Object.keys(ft).filter((k) => k in at).map((k) => ({ k, fe: ft[k], ad: at[k], dE: +dE(ft[k], at[k]).toFixed(1), rgb: +rgbD(ft[k], at[k]).toFixed(0) }));
const out: any = {};
for (const scheme of ['light', 'inverted'] as const)
	for (const [name, p] of cases) {
		const r: any = {};
		let f: any = null, a: any = null;
		try { f = fe({ primary: p }, scheme); } catch (e: any) { r.feError = e.message; }
		try { a = ad({ accentDark: p, primary: p }, scheme); } catch (e: any) { r.adError = e.message; }
		if (f && a) {
			r.feTooPale = f.tooPale; r.adTooPale = a.tooPale;
			r.feOnly = Object.keys(f.tokens).filter((k) => !(k in a.tokens));
			r.adOnly = Object.keys(a.tokens).filter((k) => !(k in f.tokens));
			r.common = cmp(f.tokens, a.tokens);
		}
		out[`${scheme}|${name}`] = r;
	}
const combos: any[] = [
	['#a5000a + accent #1c4f8f', { p: '#a5000a', a: '#1c4f8f' }],
	['#a5000a + signal #ff6600', { p: '#a5000a', s: '#ff6600' }]
];
for (const [n, s] of combos) {
	const f = fe({ primary: s.p, accent: s.a, signal: s.s }, 'light');
	const a = ad({ accentDark: s.p, accentLight: s.a, signal: s.s }, 'light');
	out['light|' + n] = { common: cmp(f.tokens, a.tokens), adSignalTooClose: a.signalTooClose };
}
writeFileSync('out.json', JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries<any>(out)) {
	if (!v.common) { console.log(k, JSON.stringify(v)); continue; }
	const d: number[] = v.common.map((c: any) => c.dE);
	console.log(k, 'common', d.length, 'mean', (d.reduce((x, y) => x + y, 0) / d.length).toFixed(1), 'max', Math.max(...d), '<=2:', d.filter((x) => x <= 2).length, '>10:', d.filter((x) => x > 10).length, 'tooPale fe/ad', v.feTooPale, v.adTooPale, 'feOnly', v.feOnly?.length, 'adOnly', v.adOnly?.length);
}
