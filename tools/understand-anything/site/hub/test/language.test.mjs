import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function page(attributes = {}, search = '', saved = 'de') {
  const listeners = new Map();
  const events = [];
  const element = values => ({attributes: {...values}, getAttribute(name) { return this.attributes[name] ?? null; }, setAttribute(name, value) { this.attributes[name] = value; }});
  const root = element(attributes);
  const description = element({'data-description-de': 'Fachbegriffe und Regeln.', 'data-description-en': 'Domain terms and rules.'});
  const category = element({'data-label-de': 'Alle Bereiche', 'data-label-en': 'All categories'});
  const input = element({'data-placeholder-de': 'Träger suchen', 'data-placeholder-en': 'Find a provider'});
  const de = element({'data-lang': 'de'});
  const en = element({'data-lang': 'en'});
  const docs = {};
  const document = {documentElement: root, title: '', querySelector: () => description,
    querySelectorAll: selector => ({'[data-docs-link]': [docs], '.langswitch button': [de, en], '[data-label-de][data-label-en]': [category], '[data-placeholder-de][data-placeholder-en]': [input]}[selector] || []),
    addEventListener(type, callback) { listeners.set(type, callback); }, dispatchEvent(event) { events.push(event); }};
  const location = {search, href: 'https://example.invalid/features/admin-test.html' + search};
  const history = {replaceState(_state, _title, value) { location.href = String(value); location.search = new URL(location.href).search; }};
  const script = readFileSync(new URL('../assets/lang.js', import.meta.url), 'utf8');
  vm.runInNewContext(script, {document, navigator: {language: 'de'}, location, history, URL, URLSearchParams, localStorage: {getItem: () => saved, setItem() {}}, CustomEvent});
  listeners.get('DOMContentLoaded')();
  return {document, root, description, category, input, de, en, docs, events, location,
    switchToEnglish() { listeners.get('click')({target: {closest: () => en}}); },
    switchToGerman() { listeners.get('click')({target: {closest: () => de}}); }};
}

test('language switch localizes page metadata and native form controls while emitting the shared event', () => {
  const view = page({'data-title-de': 'Fachliches Glossar — ORISO Understand', 'data-title-en': 'Domain glossary — ORISO Understand'});
  view.switchToEnglish();
  assert.equal(view.document.title, 'Domain glossary — ORISO Understand');
  assert.equal(view.root.getAttribute('lang'), 'en');
  assert.equal(view.root.getAttribute('data-lang'), 'en');
  assert.equal(view.description.content, 'Domain terms and rules.');
  assert.equal(view.category.textContent, 'All categories');
  assert.equal(view.input.getAttribute('placeholder'), 'Find a provider');
  assert.equal(view.en.getAttribute('aria-pressed'), 'true');
  assert.equal(view.de.getAttribute('aria-pressed'), 'false');
  assert.equal(view.docs.href, 'https://docs.oriso.org/en/');
  assert.equal(view.events.at(-1).type, 'oriso:languagechange');
  assert.equal(view.events.at(-1).detail.lang, 'en');
});

test('existing home keeps its localized title without page overrides', () => {
  const view = page();
  view.switchToEnglish();
  assert.equal(view.document.title, 'ORISO Understand — Sources and features');
});

test('explicit link language overrides browser and stored preferences', () => {
  assert.equal(page({}, '?lang=en', 'de').root.getAttribute('lang'), 'en');
  assert.equal(page({}, '?lang=de', 'en').root.getAttribute('lang'), 'de');
  assert.equal(page({}, '?lang=invalid', 'en').root.getAttribute('lang'), 'en');
});

test('switching on a linked detail page keeps that choice on reload', () => {
  const view = page({}, '?lang=en', 'de');
  view.switchToGerman();
  assert.equal(view.location.search, '?lang=de');
  assert.equal(page({}, view.location.search, 'en').root.getAttribute('lang'), 'de');
});
