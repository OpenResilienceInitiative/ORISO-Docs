/* The public query/anchor boundary is shared by the page and behavior tests. */
const normalize = value => String(value).normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('de').replaceAll('ß', 'ss').trim();

export function findConcepts(catalog, {query = '', category = ''} = {}) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return catalog.concepts.filter(concept => {
    if (category && concept.category !== category) return false;
    const searchable = normalize([
      concept.de.term, concept.de.definition, concept.de.example,
      concept.en.term, concept.en.definition, concept.en.example,
      ...concept.aliases.de, ...concept.aliases.en,
      ...concept.deprecatedTerms.map(term => term.term),
      ...(concept.symbols || concept.codeMappings.map(mapping => mapping.symbol))
    ].join(' '));
    return words.every(word => searchable.includes(word));
  });
}

export function resolveConcept(catalog, hash) {
  let id = '';
  try { id = decodeURIComponent(String(hash).replace(/^#/, '')); } catch { /* Invalid external anchors use the stable default. */ }
  return catalog.concepts.find(concept => concept.id === id)
    || catalog.concepts.find(concept => concept.id === 'provider')
    || catalog.concepts[0];
}

export function initGlossary(document, window) {
  const dataElement = document.getElementById('glossary-data');
  if (!dataElement) return;
  const catalog = JSON.parse(dataElement.textContent);
  const query = document.getElementById('glossary-query');
  const category = document.getElementById('glossary-category');
  const results = [...document.querySelectorAll('#glossary-results [data-concept-id]')];
  const articles = [...document.querySelectorAll('.glossary-concept')];
  const count = document.getElementById('glossary-count');
  const empty = document.getElementById('glossary-empty');
  let selected = resolveConcept(catalog, window.location.hash).id;

  function render() {
    const lang = document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'de';
    const found = new Set(findConcepts(catalog, {query: query.value, category: category.value}).map(concept => concept.id));
    results.forEach(item => {
      item.hidden = !found.has(item.dataset.conceptId);
      const link = item.querySelector('a');
      if (item.dataset.conceptId === selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    articles.forEach(article => { article.hidden = article.id !== selected; });
    empty.hidden = found.size > 0;
    count.textContent = lang === 'de' ? `${found.size} von ${catalog.concepts.length} Begriffen` : `${found.size} of ${catalog.concepts.length} concepts`;
  }

  function select(hash, focus = false) {
    selected = resolveConcept(catalog, hash).id;
    render();
    if (focus) document.getElementById(selected).focus({preventScroll: false});
  }

  query.addEventListener('input', render);
  category.addEventListener('change', render);
  document.getElementById('glossary-reset').addEventListener('click', () => {
    query.value = '';
    category.value = '';
    render();
    query.focus();
  });
  document.addEventListener('oriso:languagechange', render);
  window.addEventListener('hashchange', () => select(window.location.hash));
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
    if (link.getAttribute('href') === '#glossary-detail') {
      event.preventDefault();
      document.getElementById(selected).focus({preventScroll: false});
      return;
    }
    if (!catalog.concepts.some(concept => link.getAttribute('href') === `#${concept.id}`)) return;
    event.preventDefault();
    const hash = link.getAttribute('href');
    window.history.pushState(null, '', hash);
    select(hash, true);
  });
  render();
  document.documentElement.classList.add('glossary-enhanced');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initGlossary(document, window));
  else initGlossary(document, window);
}
