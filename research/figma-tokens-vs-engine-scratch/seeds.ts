import { computeOrisoPalette } from './fe/orisoScheme';
import { differenceCiede2000, wcagContrast } from 'culori';
import { readFileSync } from 'node:fs';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'));
const dE = differenceCiede2000();
const seeds = ['#a5000a', '#1c4f8f', '#f8e71c', '#2e7d32'];
const kebab = (r: string) => '--m3-' + r.toLowerCase().replace(/ /g, '-');
const roles = Object.keys(fig['Light']).filter((k) => k.startsWith('/Schemes/')).map((k) => k.slice(9)).filter((r) => r !== 'On Primary Container 2');
for (const sc of ['light', 'dark'] as const) {
	const ref = computeOrisoPalette({ primary: seeds[0] }, sc).tokens;
	for (const seed of seeds.slice(1)) {
		const t = computeOrisoPalette({ primary: seed }, sc);
		const changed = roles.filter((r) => t.tokens[kebab(r)] && ref[kebab(r)] !== t.tokens[kebab(r)]);
		console.log(sc, seed, 'tooPale', t.tooPale, 'roles changed vs default:', changed.length, '/', roles.length, changed.join(', '));
	}
}
const pairs: [string, string][] = [['--m3-on-primary', '--m3-primary'], ['--m3-on-primary-container', '--m3-primary-container'], ['--m3-primary', '--m3-surface'], ['--m3-on-secondary', '--m3-secondary'], ['--m3-secondary', '--m3-surface'], ['--m3-on-surface', '--m3-surface'], ['--m3-error', '--m3-surface'], ['--m3-on-error', '--m3-error']];
console.log('pairs', pairs.map((p) => p[0].slice(5) + '/' + p[1].slice(5)).join(' | '));
for (const sc of ['light', 'dark'] as const) for (const seed of seeds) {
	const t = computeOrisoPalette({ primary: seed }, sc).tokens;
	console.log(sc, seed, pairs.map(([a, b]) => wcagContrast(t[a], t[b]).toFixed(2)).join(' | '), '| primary', t['--m3-primary'], 'onP', t['--m3-on-primary'], 'cont', t['--m3-primary-container'], 'onC', t['--m3-on-primary-container']);
}
// Figma's own pairs per scheme
const fp: [string, string][] = [['On Primary', 'Primary'], ['On Primary Container', 'Primary Container'], ['Primary', 'Surface'], ['On Secondary', 'Secondary'], ['Secondary', 'Surface'], ['On Surface', 'Surface'], ['Error', 'Surface'], ['On Error', 'Error'], ['On Secondary Container', 'Secondary Container'], ['On Tertiary Container', 'Tertiary Container'], ['On Error Container', 'Error Container'], ['On Surface Variant', 'Surface Variant'], ['Outline', 'Surface'], ['On Background', 'Background']];
console.log('figma pairs', fp.map((p) => p.join('/')).join(' | '));
for (const n of Object.keys(fig)) console.log(n.padEnd(24), fp.map(([a, b]) => wcagContrast(fig[n]['/Schemes/' + a][0], fig[n]['/Schemes/' + b][0]).toFixed(2)).join(' | '));
