import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugOf = feature => feature.id.split('/').pop();
const storybookOrigins = {frontend:'https://dev.oriso.org/storybook-frontend/',admin:'https://dev.oriso.org/storybook-admin/'};
const pad = n => String(n).padStart(3,'0');
// Optional per-feature links: ADRs, Storybook entries and related features. Absent fields render nothing,
// so a catalogue entry without them produces exactly the original card.
function featureLinks(feature,data,locale){
 const de=locale==='de',rows=[];
 if(feature.adrs?.length)rows.push(`<li>${de?'Entscheidungen':'Decisions'}: ${feature.adrs.map(n=>{if(!Number.isInteger(n))throw Error('ADR number required: '+feature.id);return `<a href="https://docs.oriso.org/${locale}/decisions/adr-${pad(n)}">ADR-${pad(n)}</a>`;}).join(' · ')}</li>`);
 if(feature.storybook?.length)rows.push(`<li>Storybook: ${feature.storybook.map(s=>{const origin=storybookOrigins[s.app];if(!origin||!/^\/(docs|story)\/[^\s"<>]+$/.test(s.path))throw Error('Invalid Storybook link: '+feature.id);return `<a href="${origin}?path=${escape(s.path)}">${escape(s[locale])}</a>`;}).join(' · ')}</li>`);
 if(feature.related?.length)rows.push(`<li>${de?'Verwandt':'Related'}: ${feature.related.map(slug=>{const target=data.features.find(f=>slugOf(f)===slug);if(!target)throw Error('Unknown related feature: '+slug);return `<a href="#${escape(slug)}">${escape(target[locale].title)}</a>`;}).join(' · ')}</li>`);
 return rows.length?`<ul class="flinks">${rows.join('')}</ul>`:'';
}
export function renderFeatures(data,locale){
 if(!['de','en'].includes(locale))throw new Error('Unsupported locale');
 const de=locale==='de';
 const title=de?'Features der ORISO-Plattform':'Features of the ORISO platform';
 const note=de?'Zusammenfassungen der kanonischen Produktquellen. Diese Quellen beschreiben Entwurf und Verhalten; sie bestätigen keine laufende Bereitstellung.':'Summaries of the canonical product sources. These sources describe design and behaviour; they do not verify a running deployment.';
 const cards=data.features.map(f=>`<article id="${escape(slugOf(f))}"><h2>${escape(f[locale].title)}</h2><p>${escape(f[locale].summary)}</p><a href="https://docs.oriso.org/${locale}/${escape(f.route)}">${de?'Vollständige Dokumentation':'Full documentation'}</a>${featureLinks(f,data,locale)}<details><summary>${de?'Quellenbeleg':'Source evidence'}</summary><code>${escape(f.source)}</code><p>SHA-256: ${escape(f.sourceHash)}</p><p>${de?'Quellrevision':'Source revision'}: ${escape(f.sourceRevision)}</p></details></article>`).join('\n');
 return `<!doctype html><html lang="${locale}" data-lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ORISO Understand</title><meta name="description" content="${escape(note)}"><link rel="stylesheet" href="/assets/hub.css"></head><body><main class="wrap"><a href="/">ORISO Understand</a><nav><a href="/features/de.html" data-feature-locale="de">DE</a> · <a href="/features/en.html" data-feature-locale="en">EN</a></nav><h1>${title}</h1><p>${note}</p>${cards}<p><a href="https://docs.oriso.org/${locale}/">${de?'Dokumentation':'Documentation'}</a></p></main><script>document.querySelectorAll('[data-feature-locale]').forEach(a=>a.href+=location.hash)</script></body></html>\n`;
}
/** Paths of the per-feature hub pages: one stable URL per feature that opens its card in the reader's language. */
export const featurePages = data => data.features.filter(f=>f.hubPage).map(f=>`features/${slugOf(f)}.html`);
export function renderFeaturePage(feature){
 const slug=slugOf(feature),label=feature.hubPage?.label;
 if(!/^[a-z][a-z0-9-]*$/.test(slug)||['index','de','en'].includes(slug)||typeof label!=='string'||!label)throw Error('Invalid hub feature page: '+feature.id);
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(label)} — ORISO Understand</title></head><body><a href="/features/en.html#${slug}">${escape(label)} source summary</a><script>location.replace("/features/"+(localStorage.getItem("oriso-understand-lang")==="de"?"de":"en")+".html#${slug}")</script></body></html>\n`;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=JSON.parse(readFileSync(new URL('./features/catalog.json',import.meta.url)));
 for(const locale of ['de','en'])writeFileSync(new URL(`./features/${locale}.html`,import.meta.url),renderFeatures(data,locale));
 writeFileSync(new URL('./features/index.html',import.meta.url),renderFeatures(data,'de'));
 for(const feature of data.features.filter(f=>f.hubPage))writeFileSync(new URL(`./features/${slugOf(feature)}.html`,import.meta.url),renderFeaturePage(feature));
}
