// Generates locale pages from the editorial catalog and explicitly marked graph registry.
// Canonical DSFA publication belongs to Understand; technical Docs never copies it.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLinkRewriter } from './catalog/link-rewriter.mjs';
import { buildPageIndex, mergeCatalog, sourceHash, validateFullCurrent, sectionAliases } from './page-catalog.mjs';
import { sourceEvidence } from './catalog/source-evidence.mjs';
import { nginxRedirectMap } from './catalog/redirect-map.mjs';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const repo = join(site, '..');
const generatedPages = existsSync(join(repo,'docs/generated/page-catalog.json')) ? (await import('../../tools/truth-chain/lib/generated-catalog.mjs')).loadGeneratedCatalog(repo) : [];
const SRC_ADR = join(repo, 'oriso-platform', 'decisions');
const OUT_DOCS = join(site, 'content', 'docs');

// ------------------------------------------------------------------ helpers

function readUtf8(p) {
  return readFileSync(p, 'utf8');
}

function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

/** Split off the first H1 and return { title, body } — the site renders the title itself. */
function splitTitle(md) {
  const m = md.match(/^# (.+)\n/);
  if (!m) return { title: undefined, body: md };
  return { title: m[1].trim(), body: md.slice(m[0].length).replace(/^\n+/, '') };
}

// ------------------------------------------------------------------ Produkt- und Plattformdoku

/**
 * Übernimmt die vorhandenen MDX-Seiten (bislang Mintlify) in die Site.
 *
 * `docs.json` ist die Navigationsquelle: je Tab ein Wurzelordner, je Gruppe ein
 * Unterordner mit `meta.json`. Die Mintlify-Komponenten werden auf ihre Fumadocs-
 * Entsprechung abgebildet — ausserhalb von Codebloecken, damit Beispiele unangetastet
 * bleiben (in den Runbooks stehen Heredocs mit `<<EOF`).
 */
const COMPONENT_MAP = [
  [/<Note>/g, '<Callout>'], [/<\/Note>/g, '</Callout>'],
  [/<Info>/g, '<Callout>'], [/<\/Info>/g, '</Callout>'],
  [/<Tip>/g, '<Callout type="info">'], [/<\/Tip>/g, '</Callout>'],
  [/<Check>/g, '<Callout type="success">'], [/<\/Check>/g, '</Callout>'],
  [/<Warning>/g, '<Callout type="warn">'], [/<\/Warning>/g, '</Callout>'],
  [/<CardGroup[^>]*>/g, '<Cards>'], [/<\/CardGroup>/g, '</Cards>'],
  [/<AccordionGroup>/g, '<Accordions type="single">'], [/<\/AccordionGroup>/g, '</Accordions>'],
  [/<Frame[^>]*>/g, ''], [/<\/Frame>/g, ''],
];

/**
 * Mintlify: <Tabs><Tab title="A">…</Tab></Tabs>. Fumadocs braucht die Beschriftungen
 * als `items` am Tabs-Element und `value` je Tab.
 */
function migrateTabs(text) {
  return text.replace(/<Tabs>([\s\S]*?)<\/Tabs>/g, (whole, inner) => {
    const titles = [...inner.matchAll(/<Tab\s+title="([^"]*)"/g)].map((m) => m[1]);
    if (!titles.length) return whole;
    const body = inner.replace(/<Tab\s+title="([^"]*)"/g, (_m, t) => `<Tab value="${t}"`);
    return `<Tabs items={${JSON.stringify(titles)}}>${body}</Tabs>`;
  });
}

/** Wendet eine Ersetzung nur ausserhalb von ``` -Bloecken an. */
function outsideCode(text, apply) {
  return text
    .split(/(^```[\s\S]*?^```)/m)
    .map((part) => (part.startsWith('```') ? part : apply(part)))
    .join('');
}

function migrateMdx(raw) {
  // Tabs zuerst, auf dem ganzen Text: zwischen <Tabs> und </Tabs> stehen Codebloecke,
  // eine abschnittsweise Ersetzung wuerde das Paar nie zusammen sehen.
  const withTabs = migrateTabs(raw);
  let out = outsideCode(withTabs, (t) => {
    for (const [re, to] of COMPONENT_MAP) t = t.replace(re, to);
    // <Card title="…" icon="x" href="…"> — Fumadocs kennt `icon` nur als Node, nicht als Name
    t = t.replace(/(<Card\b[^>]*?)\s+icon=(?:"[^"]*"|\{[^}]*\})/g, '$1');
    // Geschweifte Klammern sind in MDX ein JSX-Ausdruck. In diesen Seiten stehen sie
    // ausschliesslich in Prosa und Tabellen (`token={JWT}`, `{ client: bool }`) — geprüft
    // 2026-08-17: keine Komponente nutzt Ausdrucks-Attribute. Also maskieren, sonst
    // scheitert der Build mit „Could not parse expression with acorn".
    t = t.replace(/(<[A-Za-z][^>]*>)|([{}])/g, (m, tag, brace) =>
      tag ?? (brace === '{' ? '&#123;' : '&#125;'));  // Tags bleiben unangetastet
    return t;
  });
  // Frontmatter: Mintlify nutzt dieselben Schluessel (title, description) — nichts zu tun.
  return out;
}

/**
 * ```mermaid-Blöcke in `<Mermaid chart={…} />` überführen.
 *
 * In den Quelldateien bleibt der Zaun stehen — GitHub rendert ihn von sich aus, und der
 * Diagrammtext bleibt diffbar. Auf der Site zeichnet die Komponente ihn im Browser. Der
 * Diagrammtext geht als JSON-String in das Attribut, damit Anführungszeichen, Klammern und
 * Zeilenumbrüche MDX nicht durcheinanderbringen.
 */
function convertMermaid(text) {
  let found = 0;
  const out = text.replace(/^```mermaid\n([\s\S]*?)^```[ \t]*$/gm, (_whole, body) => {
    found++;
    return `<Mermaid chart={${JSON.stringify(body.replace(/\n$/, ''))}} />`;
  });
  return { text: out, found };
}

/** Bilder der Alt-Doku unter public/ bereitstellen — die Seiten verweisen absolut darauf. */
function copyDocsAssets() {
  let n = 0;
  for (const rel of ['oriso-platform/assets', 'product/assets', 'logo']) {
    const src = join(repo, rel);
    if (!existsSync(src)) continue;
    const dst = join(site, 'public', rel);
    rmSync(dst, { recursive: true, force: true });
    cpSync(src, dst, { recursive: true });
    n += readdirSync(dst).length;
  }
  const favicon = join(repo, 'favicon.svg');
  if (existsSync(favicon)) {
    cpSync(favicon, join(site, 'public', 'favicon.svg'));
    n += 1;
  }
  return n;
}

// ------------------------------------------------------------------ Links umschreiben

const GITHUB_BLOB = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev';

/**
 * Die Seiten stammen aus einer Mintlify-Navigation und verlinken einander auf zwei Arten,
 * von denen im Fumadocs-Baum keine mehr stimmt:
 *
 *   `/oriso-platform/troubleshooting`  — Mintlify-Seiten-ID, hier gibt es diesen Pfad nicht
 *   `./backend-services.md`            — Repository-Nachbardatei, liegt hier in einer anderen Gruppe
 *
 * Beides wird auf die tatsächliche Seiten-URL abgebildet (`/plattform/kernsysteme/backend-services`).
 * Verweise auf Repository-Dateien, die keine Seite sind (`./diagrams/auth-flow.mmd`,
 * `services-local-setup/run-oriso-local.sh`), zeigen auf GitHub — dort sind sie lesbar,
 * und externe Links öffnet die Site ohnehin in einem neuen Tab.
 */
/**
 * Die Site setzt die Überschrift aus dem Frontmatter-Titel. Steht im Text noch einmal
 * dieselbe H1 — so schreiben es die aus dem Graphen erzeugten Seiten —, erscheint sie
 * doppelt. Also entfernen, aber nur wenn sie wirklich dem Titel entspricht.
 */
function dropDuplicateH1(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return raw;
  const title = fm[1].match(/^title:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
  if (!title) return raw;
  const rest = raw.slice(fm[0].length);
  const h1 = rest.match(/^\n*# (.+)\n/);
  if (!h1) return raw;
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (norm(h1[1]) !== norm(title)) return raw;
  return fm[0] + rest.slice(h1[0].length).replace(/^\n+/, '');
}

function syncCatalogDocs() {
  function removeLocalized(dir) {
    for(const entry of readdirSync(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name);
      if(entry.isDirectory()) removeLocalized(path);
      else if(/\.(de|en)\.(mdx?|json)$/.test(entry.name)) rmSync(path);
    }
  }
  const catalogPath = join(site, 'page-catalog.json');
  const editorialCatalog = JSON.parse(readUtf8(catalogPath));
  const catalog = mergeCatalog(editorialCatalog, generatedPages);
  const cfg = JSON.parse(readUtf8(join(repo, 'docs.json')));
  const lifecycle = new Map();
  for (const tab of cfg.navigation.tabs) for (const group of tab.groups ?? [])
    for (const id of group.pages ?? []) lifecycle.set(id, group.group === 'Archive' ? 'archived' : 'current');
  for (const page of catalog.pages) {
    if (lifecycle.has(page.id)) page.lifecycle = lifecycle.get(page.id);
    page.translations ??= {};
    for (const locale of ['de', 'en']) {
      const path = `site/translations/${locale}/${page.source}`;
      // First import binds a new translation to its source; never re-stamp old records.
      if (!page.translations[locale] && existsSync(join(repo, path)))
        page.translations[locale] = { path, sourceHash: sourceHash(readFileSync(join(repo, page.source))), reviewedAt: '2026-09-30' };
    }
  }
  const read = p => existsSync(join(repo, p)) ? readUtf8(join(repo, p)) : undefined;
  const index = buildPageIndex(catalog, read);
  for (const page of index.pages) Object.assign(page, sourceEvidence(repo,page.source,page.sourceHash));
  writeFileSync(catalogPath, JSON.stringify(editorialCatalog, null, 2) + '\n');
  writeFileSync(join(site, 'content', 'page-index.json'), JSON.stringify(index, null, 2) + '\n');
  mkdirSync(join(site,'nginx'),{recursive:true});
  writeFileSync(join(site,'nginx','legacy-redirects.conf'),nginxRedirectMap(index.pages));
  if (process.argv.includes('--full-current')) validateFullCurrent(index);
  removeLocalized(OUT_DOCS);
  const dirs = new Map();
  for (const locale of ['de', 'en']) {
    const urls = new Map(), anchors = new Map();
    for (const page of index.pages) {
      for (const alias of [page.id, page.route, ...page.aliases]) {
        const key = alias.replace(/^\//, '').replace(/\.mdx?$/, '');
        urls.set(key, `/${locale}${page.route ? '/' + page.route : ''}`);
        anchors.set(key, Object.values(page.locales[locale].sectionAliases));
      }
    }
    const linker = makeLinkRewriter(urls, p => /^(oriso-platform\/assets|product\/assets|logo)\//.test(p) && existsSync(join(repo,p)), anchors, repo);
    for (const page of catalog.pages) {
      const state = index.pages.find(p => p.id === page.id).locales[locale];
      const raw = state.available ? read(page.translations[locale].path) : read(page.source);
      let body = dropDuplicateH1(raw);
      if(page.id === 'oriso-platform/decisions/README') {
        const columns = locale === 'de' ? '| Entscheidung | Titel | Quellstatus |' : '| Decision | Title | Source status |';
        body += '\n\n' + columns + '\n|---|---|---|\n' + catalog.pages.filter(p => /^decisions\/adr-/.test(p.route)).map(adr => {
          const original = read(adr.source);
          const translated = adr.translations[locale] ? read(adr.translations[locale].path) : undefined;
          const title = splitTitle(translated ?? original).title ?? adr.id;
          const status = original.match(/\*\*Status:\*\*\s*([^\n]+)/)?.[1] ?? '';
          return `| [${adr.route.split('/').pop().toUpperCase()}](/${locale}/${adr.route}) | ${title.replace(/\|/g,'\\|')} | ${status.replace(/\|/g,'\\|')} |`;
        }).join('\n') + '\n';
      }
      if (!/^---\n/.test(body)) {
        const split = splitTitle(body);
        body = frontmatter({title: split.title ?? page.id}) + split.body;
      }
      // Runtime source links always point at the canonical source, never the generated locale copy.
      const fm = body.match(/^---\n([\s\S]*?)\n---\n/);
      if (fm) body = frontmatter({...parseYaml(fm[1]), source: page.source}) + body.slice(fm[0].length).replace(/^\n+/, '');
      if (page.source.endsWith('.mdx')) body = migrateMdx(body);
      const mermaid = convertMermaid(body);
      const extension = page.source.endsWith('.mdx') || mermaid.found ? 'mdx' : 'md';
      const route = page.route || 'index';
      const fileRoute = catalog.pages.some(other => other.route.startsWith(route + '/')) ? route + '/index' : route;
      const out = join(OUT_DOCS, `${fileRoute}.${locale}.${extension}`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, linker.rewrite(mermaid.text, dirname(page.source)));
      // Folder index uses Fumadocs index files; independent stable route is directory URL.
      const dir = dirname(fileRoute);
      if (!dirs.has(dir)) dirs.set(dir, new Set());
      dirs.get(dir).add(fileRoute.split('/').pop());
    }
  }
  // Remove legacy non-localized generated pages, preserving the canonical home source.
  function clean(dir) {
    for (const entry of readdirSync(dir, {withFileTypes:true})) {
      const p=join(dir,entry.name);
      if(entry.isDirectory()) clean(p);
      else if (/\.mdx?$/.test(entry.name) && !/\.(de|en)\.mdx?$/.test(entry.name) && p !== join(OUT_DOCS,'index.mdx')) rmSync(p);
      else if(entry.name==='meta.json') rmSync(p);
    }
  }
  clean(OUT_DOCS);
  // Navigation placement may change without changing page URLs.
  const tabDirs={'Product':'produkt','ORISO Platform Architecture':'plattform','ORISO Platform Setup':'betrieb'};
  const moved = new Map();
  for(const tab of cfg.navigation.tabs) for(const group of tab.groups ?? []) for(const id of group.pages ?? []) {
    const page=catalog.pages.find(p=>p.id===id); if(!page) continue;
    const groupDir=group.group.toLowerCase().replace(/&/g,'und').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const target=`${tabDirs[tab.tab]}/${groupDir}`;
    const route=page.route || 'index';
    const fileRoute=catalog.pages.some(other=>other.route.startsWith(route+'/')) ? route+'/index' : route;
    const originalDir=dirname(fileRoute);
    if(target!==originalDir && page.route) {
      dirs.get(originalDir)?.delete(fileRoute.split('/').pop());
      if(!dirs.has(target)) dirs.set(target,new Set());
      const key='@'+id; dirs.get(target).add(key); moved.set(key,page);
    }
  }
  for(const [dir,names] of dirs) if(!names.size) dirs.delete(dir);
  // Meta files are locale-specific; hierarchy follows frozen catalog routes.
  for(const dir of [...dirs.keys()]) {
    let child=dir;
    while(child!=='.') {
      const parent=dirname(child);
      if(!dirs.has(parent)) dirs.set(parent,new Set());
      dirs.get(parent).add(child.split('/').pop());
      child=parent;
    }
  }
  function folderTitle(dir,locale) {
    const key=dir.split('/').pop();
    const labels={graphs:['Generierte Graphbelege','Generated graph evidence'],produkt:['Produkt','Product'],plattform:['Plattformarchitektur','Platform architecture'],betrieb:['Einrichtung und Betrieb','Setup and operations'],decisions:['Architekturentscheidungen','Architecture decisions'],'start-here':['Hier beginnen','Start here'],'core-systems':['Kernsysteme','Core systems'],'flows-und-reference':['Abläufe und Referenz','Flows and reference'],'knowledge-graphs':['Wissensgraphen','Knowledge graphs'],archive:['Archiv','Archive'],overview:['Überblick','Overview'],'architecture-und-roles':['Architektur und Rollen','Architecture and roles'],'core-features':['Kernfunktionen','Core features'],'flows-und-internals':['Abläufe und Interna','Flows and internals'],'design-und-quality':['Design und Qualität','Design and quality'],'getting-started':['Erste Schritte','Getting started'],architecture:['Architektur','Architecture'],deployment:['Bereitstellung','Deployment'],'configuration-und-testing':['Konfiguration und Tests','Configuration and testing'],operations:['Betrieb','Operations']};
    return dir==='.'?'ORISO':labels[key]?.[locale==='de'?0:1] ?? key;
  }
  for(const [dir, names] of dirs) for(const locale of ['de','en']) {
    const pages=[...names].sort((a,b)=>a==='index'?-1:b==='index'?1:a.localeCompare(b,'en'));
    const folder=join(OUT_DOCS,dir==='.'?'':dir); mkdirSync(folder,{recursive:true});
    writeFileSync(join(folder,`meta.${locale}.json`),JSON.stringify({title: folderTitle(dir,locale),pages: pages.map(name => { const page=moved.get(name); if(!page)return name; const translation=page.translations[locale]; const text=translation ? read(translation.path) : read(page.source); const title=text.match(/^title:\s*(.+)$/m)?.[1].replace(/^['"]|['"]$/g,'') ?? splitTitle(text).title ?? page.id.split('/').pop(); return `[${title}](/${locale}/${page.route})`; })},null,2)+'\n');
  }
  console.log(`[sync-content] Catalog ${index.pages.length} pages; current translations ${index.coverage.completePairs}/${index.coverage.currentPages}, missing ${index.coverage.missing.length}, stale ${index.coverage.stale.length}`);
}

// ------------------------------------------------------------------ main

// Die DSFA lebt als eigenständiges Dokument auf understand.oriso.org/legal/dsfa/ und wird
// hier bewusst NICHT gerendert — diese Site trägt die Entwickler- und Produktdokumentation.
rmSync(join(OUT_DOCS, 'legal'), { recursive: true, force: true });
const adrCount = readdirSync(SRC_ADR).filter(name => /^ADR-\d{3}-.*\.md$/.test(name)).length;
syncCatalogDocs();
const assets = copyDocsAssets();

console.log(`[sync-content] ${adrCount} ADRs, ${assets} Bilddateien, catalog routes`);
