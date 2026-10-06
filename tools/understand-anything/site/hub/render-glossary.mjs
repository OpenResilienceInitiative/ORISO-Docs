import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateGlossary} from '../../glossary/validate.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const bilingual = (de, en) => `<span lang="de">${escape(de)}</span><span lang="en">${escape(en)}</span>`;
const localized = value => bilingual(value.de, value.en);
const states = {
  'source-backed': ['Quellenbasiert', 'Source-backed'],
  editorial: ['Redaktioneller Vorschlag', 'Editorial proposal'],
  draft: ['Entwurf', 'Draft'],
  historical: ['Historisch', 'Historical'],
  accepted: ['Akzeptierte Entscheidung', 'Accepted decision'],
  proposed: ['Vorgeschlagene Entscheidung', 'Proposed decision'],
  'external-authority': ['Externe Referenz', 'External authority'],
  verified: ['Am gewählten Quellstand geprüft', 'Verified against selected source'],
  stale: ['Abweichender Quellinhalt', 'Changed source content'],
  unavailable: ['Nicht verfügbar', 'Unavailable'],
  external: ['Externe Referenz', 'External reference'],
  unverified: ['Nicht geprüft', 'Unverified']
};
const stateLabel = state => bilingual(...(states[state] || states.unverified));
const badge = state => `<span class="status ${['verified', 'accepted', 'source-backed'].includes(state) ? 'ok' : ['draft', 'proposed', 'stale', 'unavailable'].includes(state) ? 'warn' : 'plan'}">${stateLabel(state)}</span>`;
const urlPath = path => path.split('/').map(encodeURIComponent).join('/');

function publicURL(value, {relative = false} = {}) {
  if (relative && /^\/(?!\/)[^\s\\]*$/.test(value)) return escape(value);
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid public glossary link'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe public glossary link');
  return escape(url.href);
}

function evidenceLink(source, binding) {
  if (source.binding === 'input-snapshot' && binding?.state === 'verified' && binding.href) {
    const name = /^tools\/understand-anything\/glossary\/sources\/([a-z0-9][a-z0-9-]*\.md)$/.exec(source.path)?.[1];
    if (!name || binding.href !== `/glossary/sources/${name}`) throw new Error('Invalid verified snapshot link');
    return `<a href="${publicURL(binding.href, {relative: true})}">${escape(source.title)}</a><p class="sub2">${bilingual('Snapshot in diesem quellgebundenen Artefakt.', 'Snapshot in this source-bound artifact.')}</p>`;
  }
  if (source.url) return `<a href="${publicURL(source.url)}">${escape(source.title)}</a>`;
  if (source.sourceRevision) {
    const href = `https://github.com/OpenResilienceInitiative/${encodeURIComponent(source.repository)}/blob/${source.sourceRevision}/${urlPath(source.path)}${source.line ? `#L${source.line}` : ''}`;
    return `<a href="${publicURL(href)}">${escape(source.title || source.path)}</a>`;
  }
  return `<span>${escape(source.title || source.path)}</span><p class="sub2">${bilingual('Redaktioneller Eingabe-Snapshot mit dokumentiertem Hash; kein historischer Commit-Link. Release-Bindung unten prüfen.', 'Editorial input snapshot with recorded hash; no historical commit link. Check release binding below.')}</p>`;
}

function renderSources(concept, bindings) {
  return `<details class="glossary-evidence"><summary>${bilingual('Quellen und Quellstand', 'Sources and source state')}</summary><p class="sub2">${bilingual('Entscheidungsstatus und Veröffentlichungsstand sind getrennt. Ein geprüfter Quelltext bestätigt keine laufende Bereitstellung.', 'Decision status and publication state are separate. Verified source text does not confirm a running deployment.')}</p><ul class="glossary-evidence-list">${concept.sources.map((source, index) => {
    const binding = bindings.find(item => item.conceptId === concept.id && item.sourceIndex === index);
    if (binding && !['verified', 'historical', 'stale', 'unavailable', 'external'].includes(binding.state)) throw new Error(`Invalid source binding state for ${concept.id}`);
    return `<li>${evidenceLink(source, binding)}<div class="glossary-badges">${badge(source.state)} ${badge(binding?.state || 'unverified')}</div>
<p>${bilingual('Redaktionell geprüft', 'Editorially reviewed')}: <time>${escape(source.reviewedAt)}</time></p>
${source.sourceRevision ? `<p>${bilingual('Ursprünglich geprüfte Revision', 'Originally reviewed revision')}: <code>${escape(source.sourceRevision)}</code></p>` : ''}
${source.sourceHash ? `<p>SHA-256: <code>${escape(source.sourceHash)}</code></p>` : ''}
${binding?.selectedRevision ? `<p>${bilingual('Gewählte Quellrevision', 'Selected source revision')}: <code>${escape(binding.selectedRevision)}</code></p>` : ''}
<p class="sub2">${binding ? escape(binding.reason || '') : bilingual('Bindung an den gewählten Release noch nicht geprüft.', 'Binding to the selected release has not yet been verified.')}</p></li>`;
  }).join('\n')}</ul></details>`;
}

function renderTechnical(concept, outcomes) {
  const mappings = concept.codeMappings.map(mapping => `<li><strong>${bilingual('Historische Code-Prüfung', 'Legacy code review')}</strong>: <code>${escape(mapping.symbol)}</code><p><code>${escape(mapping.classification)}</code> · ${escape(mapping.repository)} · <time>${escape(mapping.reviewedAt)}</time></p>${evidenceLink(mapping)}<p>${bilingual('Geprüfte Revision', 'Reviewed revision')}: <code>${escape(mapping.sourceRevision)}</code></p><p>SHA-256: <code>${escape(mapping.sourceHash)}</code></p></li>`).join('\n');
  const graphs = concept.graphMappings.map(mapping => {
    const outcome = outcomes.find(item => item.conceptId === concept.id && item.repository === mapping.repository && item.nodeId === mapping.nodeId && item.mode === mapping.mode);
    if (outcome && !['verified', 'historical', 'stale', 'unavailable'].includes(outcome.state)) throw new Error(`Invalid graph mapping state for ${concept.id}`);
    const link = outcome?.state === 'verified' && outcome.href ? `<a href="${publicURL(outcome.href, {relative: true})}">${bilingual('Graph öffnen', 'Open graph')}</a>` : '';
    return `<li><strong>${bilingual('Graph-Zuordnung', 'Graph mapping')}</strong>: ${escape(mapping.repository)}<p><code>${escape(mapping.mode)} · ${escape(mapping.nodeId)}</code></p>${outcome?.viewerNodeId ? `<p>${bilingual('Knoten-ID in diesem Viewer', 'Node ID in this viewer')}: <code>${escape(outcome.viewerNodeId)}</code></p>` : ''}${badge(outcome?.state || 'unverified')}${link ? `<p>${link}</p>` : ''}<p class="sub2">${outcome ? escape(outcome.reason || '') : bilingual('Das Graph-Ziel wurde für den gewählten Release nicht geprüft.', 'Graph target has not been verified for the selected release.')}</p>${outcome?.selectedRevision ? `<p>${bilingual('Gewählte Quellrevision', 'Selected source revision')}: <code>${escape(outcome.selectedRevision)}</code></p>` : ''}</li>`;
  }).join('\n');
  return `<details class="glossary-evidence"><summary>${bilingual('Technische Zuordnungen — für Entwicklung und Code-Audit', 'Technical mappings — for engineering and code audit')}</summary><p class="sub2">${bilingual('Bestehende Tabellen, Schnittstellen und Kennungen bleiben kompatibel. Die Klasse beschreibt den einzelnen belegten Fund; sie ist keine globale Umbenennung.', 'Existing tables, APIs and identifiers remain compatible. The classification describes the specific evidenced finding; it is not a global rename.')}</p>${mappings || graphs ? `<ul class="glossary-evidence-list">${mappings}${graphs}</ul>` : `<p>${bilingual('Keine technische Zuordnung dokumentiert.', 'No technical mapping is documented.')}</p>`}</details>`;
}

export function renderGlossary(data, options = {}) {
  validateGlossary(data);
  const conceptById = new Map(data.concepts.map(concept => [concept.id, concept]));
  const categoryById = new Map(data.categories.map(category => [category.id, category]));
  const articles = data.concepts.map(concept => `<article class="glossary-concept card" id="${escape(concept.id)}" tabindex="-1" aria-labelledby="heading-${escape(concept.id)}">
<div class="glossary-badges"><span class="tag">${localized(categoryById.get(concept.category))}</span>${badge(concept.editorialState)}</div>
<h2 id="heading-${escape(concept.id)}">${localized({de: concept.de.term, en: concept.en.term})}</h2>
<p class="glossary-counterpart"><span lang="de">${escape(concept.en.term)}</span><span lang="en">${escape(concept.de.term)}</span></p>
<p class="glossary-definition">${bilingual(concept.de.definition, concept.en.definition)}</p>
<div class="glossary-example"><strong>${bilingual('Beispiel', 'Example')}</strong><p>${bilingual(concept.de.example, concept.en.example)}</p></div>
<dl class="glossary-ddd"><div><dt>${bilingual('Fachlicher Kontext', 'Business context')}</dt><dd>${localized(concept.context)}</dd></div><div><dt>${bilingual('Verantwortung', 'Responsibility')}</dt><dd>${localized(concept.responsibility)}</dd></div><div><dt>${bilingual('Invariante / Regel', 'Invariant / rule')}</dt><dd>${localized(concept.invariant)}</dd></div></dl>
${concept.editorialNote ? `<p class="note">${localized(concept.editorialNote)}</p>` : ''}
${concept.aliases.de.length || concept.aliases.en.length ? `<div class="glossary-aliases"><strong>${bilingual('Auch auffindbar unter', 'Also found under')}</strong><p>${bilingual(concept.aliases.de.join(' · ') || '—', concept.aliases.en.join(' · ') || '—')}</p></div>` : ''}
${concept.deprecatedTerms.length ? `<details class="glossary-evidence"><summary>${bilingual('Frühere Begriffe und Kompatibilität', 'Previous terms and compatibility')}</summary><p>${bilingual('Für neue Texte den bevorzugten Fachbegriff verwenden. Technische Kennungen und gültige technische Kontexte sind getrennt zu prüfen.', 'Use the preferred domain term in new copy. Technical identifiers and valid technical contexts require separate assessment.')}</p><ul>${concept.deprecatedTerms.map(term => `<li><code>${escape(term.term)}</code> (${escape(term.language.toUpperCase())})<p class="sub2">${escape(term.reason)}</p><p class="sub2">${escape(term.compatibilityScope)}</p></li>`).join('')}</ul></details>` : ''}
${concept.related.length ? `<nav class="glossary-related" aria-label="Verwandte Begriffe / Related concepts"><strong>${bilingual('Verwandte Begriffe', 'Related concepts')}</strong><div class="chips">${concept.related.map(id => `<a class="chip" href="#${escape(id)}">${bilingual(conceptById.get(id).de.term, conceptById.get(id).en.term)}</a>`).join('')}</div></nav>` : ''}
${renderSources(concept, options.sourceBindings || [])}
${renderTechnical(concept, options.graphMappings || [])}
</article>`).join('\n');
  const clientData = {categories: data.categories, concepts: data.concepts.map(({id, category, de, en, aliases, deprecatedTerms, codeMappings}) => ({id, category, de, en, aliases, deprecatedTerms, symbols: codeMappings.map(mapping => mapping.symbol)}))};
  const encodedData = JSON.stringify(clientData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<!doctype html>
<html lang="de" data-lang="de" data-page="glossary" data-title-de="Fachliches Glossar — ORISO Understand" data-title-en="Domain glossary — ORISO Understand">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fachliches Glossar — ORISO Understand</title>
<meta name="description" content="Fachbegriffe, Beispiele, Regeln und belegte Code-Zuordnungen in Deutsch und Englisch." data-description-de="Fachbegriffe, Beispiele, Regeln und belegte Code-Zuordnungen in Deutsch und Englisch." data-description-en="Domain terms, examples, rules and evidenced code mappings in German and English.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/hub.css"><script src="/assets/lang.js"></script><script type="module" src="/assets/glossary.js"></script></head>
<body class="glossary-page"><a class="skip-link" href="#glossary-detail">${bilingual('Zum ausgewählten Begriff', 'Skip to selected concept')}</a>
<div class="appbar"><div class="appbar-in"><span class="brandname"><a href="/">ORISO Understand</a></span><span class="sub">${bilingual('Fachliches Glossar', 'Domain glossary')}</span><span class="sp"></span><span class="langswitch" role="group" aria-label="Sprache / Language"><button type="button" data-lang="de" aria-pressed="true">DE</button><button type="button" data-lang="en" aria-pressed="false">EN</button></span></div></div>
<header class="band"><div class="band-in"><div class="headcard"><div class="eyebrow">${bilingual('Gemeinsame Fachsprache · Domain Driven Design', 'Shared domain language · Domain Driven Design')}</div><h1>${bilingual('Ein Begriff. Ein gemeinsames Verständnis.', 'One term. A shared understanding.')}</h1><p class="lead">${bilingual('Was Träger, Beratungsstelle oder Plattformvertrag bedeuten — mit Beispielen, fachlichen Regeln und den bestehenden Namen im Code.', 'What provider, counselling centre or Platform Services Agreement mean — with examples, business rules and existing names in code.')}</p><div class="chips"><span class="chip">${data.concepts.length} ${bilingual('Begriffe', 'concepts')}</span><span class="chip">DE / EN</span><span class="chip">${bilingual('Prüfstand', 'Review date')}: ${escape(data.reviewedAt)}</span></div><p class="sub2">${bilingual('Quellenbasierte Sprache und redaktionelle Vorschläge. Entwürfe und historische Projektangaben sind gekennzeichnet; sie bestätigen keinen Liefer- oder Betriebsstand.', 'Source-backed vocabulary and editorial proposals. Drafts and historical project statements are marked; they do not confirm delivery or runtime state.')}</p></div></div></header>
<main class="wrap glossary-wrap"><section class="glossary-tools" aria-labelledby="find-concept"><h2 id="find-concept">${bilingual('Begriff finden', 'Find a concept')}</h2><div class="glossary-controls"><div><label for="glossary-query">${bilingual('Suchbegriff', 'Search term')}</label><input id="glossary-query" type="search" autocomplete="off" data-placeholder-de="Träger, agency, AVV …" data-placeholder-en="Provider, agency, DPA …" placeholder="Träger, agency, AVV …" aria-describedby="search-help"></div><div><label for="glossary-category">${bilingual('Bereich', 'Category')}</label><select id="glossary-category"><option value="" data-label-de="Alle Bereiche" data-label-en="All categories">Alle Bereiche</option>${data.categories.map(category => `<option value="${escape(category.id)}" data-label-de="${escape(category.de)}" data-label-en="${escape(category.en)}">${escape(category.de)}</option>`).join('')}</select></div><button type="button" id="glossary-reset">${bilingual('Zurücksetzen', 'Reset')}</button></div><p id="search-help" class="sub2">${bilingual('Suche in beiden Sprachen, früheren Begriffen und Code-Namen. Sprache wechseln behält Suche, Bereich und Begriff bei.', 'Search both languages, previous terms and code names. Switching language keeps your search, category and concept.')}</p></section>
<div class="glossary-layout"><nav class="glossary-index" aria-label="Begriffe / Concepts"><p class="glossary-count" id="glossary-count" role="status" aria-live="polite">${data.concepts.length} ${bilingual('Begriffe', 'concepts')}</p><ul id="glossary-results">${data.concepts.map(concept => `<li data-concept-id="${escape(concept.id)}"><a href="#${escape(concept.id)}">${bilingual(concept.de.term, concept.en.term)}</a></li>`).join('\n')}</ul><p id="glossary-empty" class="note" hidden>${bilingual('Keine Begriffe gefunden. Suche verkürzen oder den Bereich zurücksetzen.', 'No concepts found. Shorten the search or reset the category.')}</p></nav><section id="glossary-detail" aria-label="Begriffsdefinition / Concept definition">${articles}</section></div></main>
<footer><a href="/">${bilingual('Zur Übersicht', 'Back to overview')}</a> · <a data-docs-link href="https://docs.oriso.org/de/">${bilingual('Entwicklerdokumentation', 'Developer documentation')}</a></footer>
<script type="application/json" id="glossary-data">${encodedData}</script>
</body></html>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(new URL('../../glossary/catalog.json', import.meta.url)));
  mkdirSync(new URL('./glossary/', import.meta.url), {recursive: true});
  writeFileSync(new URL('./glossary/index.html', import.meta.url), renderGlossary(data));
}
