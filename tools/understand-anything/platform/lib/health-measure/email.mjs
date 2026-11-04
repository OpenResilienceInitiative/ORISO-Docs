// email-render, email-links, email-languages (ORISO-Docs#218): static checks over e-mail template folders.
// Honest about what they are: nothing is rendered by a real template engine and no link is fetched. They check what a
// file can show without one:
//   render    HTML is well-formed (tags nest and close, <#if>-style FreeMarker blocks close) and every placeholder
//             ([[${x}]], ${x}) is closed; text twins need closed placeholders; no file is empty.
//   links     every <a> (th:href wins over a static href) is an absolute http(s), mailto or tel link or carries a
//             placeholder; empty, "#", relative, javascript:, malformed links and "undefined"/"null" values are broken.
//   languages number of language/tone variants (folders named de-sie, de-du, en, fr, ru, ti, tr) with a template.
import { extOf, readText } from './files.mjs';

export const VARIANTS = Object.freeze(['de-sie', 'de-du', 'en', 'fr', 'ru', 'ti', 'tr']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'param']);
const OPTIONAL_END = new Set(['p', 'li', 'td', 'th', 'tr', 'tbody', 'thead', 'tfoot', 'dt', 'dd', 'option', 'colgroup', 'html', 'head', 'body']);
const FTL_BLOCK = new Set(['if', 'list', 'macro', 'function', 'switch', 'items', 'attempt', 'compress', 'escape', 'noescape', 'noparse']);

const PARTS = /<!--[\s\S]*?-->|<#--[\s\S]*?-->|<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>|<(\/?)([#@])([A-Za-z_.]+)[^>]*?>|<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;

function placeholderErrors(text) {
  const errors = [];
  for (const [open, close, label] of [['[[', ']]', '[[ ]]'], ['[(', ')]', '[( )]']]) {
    for (let i = text.indexOf(open); i >= 0; i = text.indexOf(open, i + 2)) {
      if (text.indexOf(close, i + 2) < 0) { errors.push(`placeholder ${label} is not closed`); break; }
    }
  }
  for (let i = text.indexOf('${'); i >= 0; i = text.indexOf('${', i + 2)) {
    let depth = 0, j = i + 1;
    for (; j < text.length; j++) { if (text[j] === '{') depth++; else if (text[j] === '}' && --depth === 0) break; }
    if (j >= text.length) { errors.push('placeholder ${ } is not closed'); break; }
  }
  return errors;
}

// -> list of problems, empty when the HTML template is well-formed
export function checkHtml(text) {
  if (!text.trim()) return ['template is empty'];
  const errors = [], stack = [];
  const body = text.replace(/<!--[\s\S]*?-->|<#--[\s\S]*?-->/g, '');
  errors.push(...placeholderErrors(body.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')));
  for (const m of text.matchAll(PARTS)) {
    if (m[0].startsWith('<!--') || m[0].startsWith('<#--') || m[1]) continue;
    if (m[3]) { // FreeMarker directive or macro call
      const name = (m[3] === '@' ? '@' : '') + m[4];
      if (m[3] === '#' && !FTL_BLOCK.has(m[4])) continue;
      if (!m[2]) { if (m[3] === '@' && m[0].endsWith('/>')) continue; stack.push({ name, ftl: true }); continue; }
      const i = stack.map(s => s.name).lastIndexOf(name);
      if (i < 0) errors.push(`unexpected </${m[3]}${m[4]}>`); else { stack.splice(i).slice(1).forEach(s => errors.push(`<${s.ftl ? (s.name[0] === '@' ? s.name : '#' + s.name) : s.name}> is not closed`)); }
      continue;
    }
    const name = m[6].toLowerCase();
    if (!m[5]) { if (!VOID.has(name) && !m[7].trimEnd().endsWith('/')) stack.push({ name, ftl: false }); continue; }
    const i = stack.map(s => s.name).lastIndexOf(name);
    if (i < 0) { if (!VOID.has(name)) errors.push(`unexpected </${name}>`); continue; }
    for (const s of stack.splice(i).slice(1)) if (s.ftl || !OPTIONAL_END.has(s.name)) errors.push(`<${s.ftl ? (s.name[0] === '@' ? s.name : '#' + s.name) : s.name}> is not closed`);
  }
  for (const s of stack) if (s.ftl || !OPTIONAL_END.has(s.name)) errors.push(`<${s.ftl ? (s.name[0] === '@' ? s.name : '#' + s.name) : s.name}> is not closed`);
  return errors;
}
export function checkText(text) {
  return !text.trim() ? ['template is empty'] : placeholderErrors(text);
}

const HAS_PLACEHOLDER = /\[\[|\[\(|\$\{|@\{|\{\{/;
function linkProblem(url) {
  const u = url.trim();
  if (u === '') return 'empty link';
  if (u.startsWith('#')) return 'anchor only';
  if (HAS_PLACEHOLDER.test(u)) return placeholderErrors(u).length ? 'placeholder is not closed' : null;
  if (/^javascript:/i.test(u)) return 'javascript link';
  if (/^(mailto|tel):/i.test(u)) return u.split(':')[1].trim() ? null : 'empty address';
  if (/\s/.test(u)) return 'whitespace in link';
  if (!/^https?:\/\//i.test(u)) return 'not an absolute http(s) link';
  try { new URL(u); } catch { return 'malformed link'; }
  if (/(^|\/)(undefined|null|NaN)(\/|\?|#|$)/.test(u.replace(/^https?:\/\/[^/]*/i, ''))) return 'unfilled value (undefined/null)';
  return null;
}
// -> [{ url, problem: string|null }]
export function linksOf(text, kind) {
  if (kind === 'txt') return [...text.matchAll(/https?:\/\/[^\s<>"']+/g)].map(m => m[0].replace(/[.,;:)]+$/, '')).map(url => ({ url, problem: linkProblem(url) }));
  const out = [];
  for (const m of text.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3];
    const url = 'th:href' in attrs ? attrs['th:href'] : attrs.href;
    if (url !== undefined) out.push({ url, problem: linkProblem(url) });
  }
  return out;
}

// ---- metrics over a scope ----
const isHtmlTemplate = p => /\.(html?|ftl)$/i.test(p) && !/\.txt\.ftl$/i.test(p);
const stem = p => p.replace(/\.(html?|txt)(\.ftl)?$|\.ftl$/i, '');
function templates(files) {
  const html = files.filter(isHtmlTemplate);
  const stems = new Set(html.map(stem));
  const txt = files.filter(p => /\.txt(\.ftl)?$/i.test(p) && stems.has(stem(p)));
  return { html, txt };
}
const NONE = 'no e-mail templates (html, htm, ftl) in scope';
const na = (source, reason = NONE) => ({ value: null, source, details: { reason } });

export function measureEmailRender({ root, files }) {
  const source = 'health-run email-render: static well-formedness check (no template engine is run)';
  const { html, txt } = templates(files);
  if (!html.length) return na(source);
  const failures = [];
  for (const p of html) { const e = checkHtml(readText(root, p)); if (e.length) failures.push({ file: p, reason: e[0] }); }
  for (const p of txt) { const e = checkText(readText(root, p)); if (e.length) failures.push({ file: p, reason: e[0] }); }
  failures.sort((a, b) => (a.file < b.file ? -1 : 1));
  return { value: failures.length, source, details: { templates: html.length + txt.length, failures: failures.slice(0, 20) } };
}
export function measureEmailLinks({ root, files }) {
  const source = 'health-run email-links: static link check (no link is fetched)';
  const { html, txt } = templates(files);
  if (!html.length) return na(source);
  const broken = []; let total = 0;
  for (const p of [...html, ...txt]) {
    for (const l of linksOf(readText(root, p), html.includes(p) ? 'html' : 'txt')) { total++; if (l.problem) broken.push({ file: p, link: l.url, reason: l.problem }); }
  }
  broken.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.link < b.link ? -1 : 1));
  return { value: broken.length, source, details: { links: total, broken: broken.slice(0, 20) } };
}
export function measureEmailLanguages({ files }) {
  const source = `health-run email-languages: folders named ${VARIANTS.join(', ')}`;
  const { html } = templates(files);
  if (!html.length) return na(source);
  const present = new Set(), occasions = new Map();
  for (const p of html) {
    const parts = p.split('/'), v = parts.slice(0, -1).findIndex(s => VARIANTS.includes(s));
    if (v < 0) continue;
    present.add(parts[v]);
    const key = [...parts.slice(0, v), ...parts.slice(v + 1, -1)].join('/') + '\u0000' + stem(parts.at(-1));
    (occasions.get(key) ?? occasions.set(key, new Set()).get(key)).add(parts[v]);
  }
  if (!present.size) return na(source, `no language variant folders (${VARIANTS.join(', ')}) among the templates in scope`);
  const dirs = new Set([...occasions.keys()].map(k => k.split('\u0000')[0]));
  const missing = {};
  for (const [key, have] of [...occasions].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [dir, base] = key.split('\u0000'), gone = VARIANTS.filter(v => !have.has(v));
    if (gone.length) missing[dirs.size === 1 ? base : `${dir}/${base}`] = gone;
  }
  const names = Object.keys(missing);
  return {
    value: present.size, source,
    details: { present: VARIANTS.filter(v => present.has(v)).sort(), occasions: occasions.size, missing: Object.fromEntries(names.slice(0, 50).map(n => [n, missing[n]])), truncated: names.length > 50 },
  };
}
