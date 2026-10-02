import { readFileSync } from 'node:fs';
import { computeOrisoPalette as ad } from './ad/theme/orisoScheme';
const o = JSON.parse(readFileSync('out.json', 'utf8'));
for (const scheme of ['light', 'inverted']) {
	const seeds = ['#1c4f8f', '#f8e71c', '#ffff00', '#ffd400', '#a5000a (default)', '#808080'];
	const toks: string[] = o[`${scheme}|#1c4f8f`].common.map((c: any) => c.k);
	console.log(`\n### ${scheme} (CIEDE2000 / RGB-euclid)`);
	console.log('| token | ' + seeds.map((s) => s.split(' ')[0]).join(' | ') + ' |');
	console.log('|---|' + seeds.map(() => '---').join('|') + '|');
	for (const t of toks) {
		console.log('| `' + t + '` | ' + seeds.map((s) => { const c = o[`${scheme}|${s}`].common.find((x: any) => x.k === t); return `${c.dE} / ${c.rgb}`; }).join(' | ') + ' |');
	}
}
console.log('\nFE only (light):', o['light|#1c4f8f'].feOnly.join(' '));
console.log('\nAD only (light):', o['light|#1c4f8f'].adOnly.join(' '));
console.log('\nFE only (inverted):', o['inverted|#1c4f8f'].feOnly.join(' '));
console.log('\nAD only (inverted):', o['inverted|#1c4f8f'].adOnly.join(' '));
// Admin engine with weird inputs
for (const p of ['notacolor', null, undefined, '']) {
	const r = ad({ accentDark: p as any, primary: p as any }, 'light');
	console.log('AD engine', JSON.stringify(p), '->', r.tokens['--m3-primary'], 'tooPale', r.tooPale);
}
console.log('combo accent');
for (const c of o['light|#a5000a + accent #1c4f8f'].common) console.log(c.k, c.fe, c.ad, c.dE);
console.log('combo signal');
for (const c of o['light|#a5000a + signal #ff6600'].common) if (/error/.test(c.k)) console.log(c.k, c.fe, c.ad, c.dE);
