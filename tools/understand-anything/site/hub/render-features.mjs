import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFeatures(data,locale){
 if(!['de','en'].includes(locale))throw new Error('Unsupported locale');
 const de=locale==='de';
 const title=de?'Features der ORISO-Plattform':'Features of the ORISO platform';
 const note=de?'Zusammenfassungen der kanonischen Produktquellen. Diese Quellen beschreiben Entwurf und Verhalten; sie bestätigen keine laufende Bereitstellung.':'Summaries of the canonical product sources. These sources describe design and behaviour; they do not verify a running deployment.';
 const cards=data.features.map(f=>`<article id="${escape(f.id.split('/').pop())}"><h2>${escape(f[locale].title)}</h2><p>${escape(f[locale].summary)}</p><a href="https://docs.oriso.org/${locale}/${escape(f.route)}">${de?'Vollständige Dokumentation':'Full documentation'}</a><details><summary>${de?'Quellenbeleg':'Source evidence'}</summary><code>${escape(f.source)}</code><p>SHA-256: ${escape(f.sourceHash)}</p><p>${de?'Quellrevision':'Source revision'}: ${escape(f.sourceRevision)}</p></details></article>`).join('\n');
 return `<!doctype html><html lang="${locale}" data-lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ORISO Understand</title><meta name="description" content="${escape(note)}"><link rel="stylesheet" href="/assets/hub.css"></head><body><main class="wrap"><a href="/">ORISO Understand</a><nav><a href="/features/de.html" data-feature-locale="de">DE</a> · <a href="/features/en.html" data-feature-locale="en">EN</a></nav><h1>${title}</h1><p>${note}</p>${cards}<p><a href="https://docs.oriso.org/${locale}/">${de?'Dokumentation':'Documentation'}</a></p></main><script>document.querySelectorAll('[data-feature-locale]').forEach(a=>a.href+=location.hash)</script></body></html>\n`;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=JSON.parse(readFileSync(new URL('./features/catalog.json',import.meta.url)));
 for(const locale of ['de','en'])writeFileSync(new URL(`./features/${locale}.html`,import.meta.url),renderFeatures(data,locale));
 writeFileSync(new URL('./features/index.html',import.meta.url),renderFeatures(data,'de'));
}
