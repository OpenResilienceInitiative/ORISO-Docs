import { computeOrisoPalette } from './fe/orisoScheme';
import { differenceCiede2000 } from 'culori';
import { readFileSync, writeFileSync } from 'node:fs';
const fig = JSON.parse(readFileSync('../figma.json', 'utf8'));
const dE = differenceCiede2000();
const rgb = (a: string, b: string) => {
	const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const x = p(a), y = p(b);
	return Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
};
const kebab = (r: string) => '--m3-' + r.toLowerCase().replace(/ /g, '-');
const roles: string[] = Object.keys(fig['Light'])
	.filter((k) => k.startsWith('/Schemes/'))
	.map((k) => k.slice(9))
	.filter((r) => r !== 'On Primary Container 2');
const pairs: [string, 'light' | 'dark'][] = [
	['Light', 'light'], ['Light Medium Contrast', 'light'], ['Light High Contrast', 'light'],
	['Dark', 'dark'], ['Dark Medium Contrast', 'dark'], ['Dark High Contrast', 'dark']
];
const out: any = {};
for (const seed of ['#a5000a', '#1c4f8f', '#f8e71c', '#2e7d32']) {
	out[seed] = {
		light: computeOrisoPalette({ primary: seed }, 'light').tokens,
		dark: computeOrisoPalette({ primary: seed }, 'dark').tokens
	};
}
const rows: any[] = [];
for (const r of roles) {
	const row: any = { role: r, token: kebab(r) };
	for (const [fn, sc] of pairs) {
		const t = out['#a5000a'][sc][kebab(r)];
		const f = fig[fn]['/Schemes/' + r][0].toLowerCase();
		row[fn] = { fig: f, eng: t, dE: t ? +dE(f, t).toFixed(1) : null, rgb: t ? +rgb(f, t).toFixed(0) : null };
	}
	rows.push(row);
}
writeFileSync('rows.json', JSON.stringify(rows, null, 1));
writeFileSync('seeds.json', JSON.stringify(out, null, 1));
for (const [fn] of pairs) {
	const d = rows.filter((r) => r[fn].dE !== null).map((r) => r[fn].dE as number);
	const miss = rows.filter((r) => r[fn].dE === null).map((r) => r.role);
	const s = [...d].sort((a, b) => a - b);
	console.log(fn, 'n', d.length, 'mean', (d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), 'median', s[Math.floor(d.length / 2)],
		'<=2', d.filter((x) => x <= 2).length, '<=5', d.filter((x) => x <= 5).length, '>10', d.filter((x) => x > 10).length, 'missing', miss.join('|'));
}
