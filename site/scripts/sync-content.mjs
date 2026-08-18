// Builds the generated part of `content/docs` from the repository's canonical sources.
//
//   oriso-platform/dsfa-text/*.md        -> content/docs/legal/dsfa/*.mdx   (chapters, operator drafts)
//   oriso-platform/dsfa-text/evidence-map.yaml -> content/evidence.json    (data for <Evidence/>)
//   oriso-platform/decisions/ADR-*.md    -> content/docs/decisions/adr-NNN.md
//
// The sources stay the single source of truth; everything written here is git-ignored and
// regenerated on every `pnpm dev` / `pnpm build`.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const repo = join(site, '..');
const SRC_DSFA = join(repo, 'oriso-platform', 'dsfa-text');
const SRC_ADR = join(repo, 'oriso-platform', 'decisions');
const OUT_DOCS = join(site, 'content', 'docs');
const OUT_DSFA = join(OUT_DOCS, 'legal', 'dsfa');
const OUT_ADR = join(OUT_DOCS, 'decisions');

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

/** First real paragraph (no heading, no table, no list) trimmed to ~180 chars — used as description. */
function firstParagraph(body) {
  const paras = body.split(/\n\s*\n/);
  for (const p of paras) {
    const t = p.trim();
    if (!t || /^[#>|\-*\d]/.test(t) || t.startsWith('```') || t.startsWith('<')) continue;
    const one = t.replace(/\s+/g, ' ');
    return one.length > 180 ? one.slice(0, 177).replace(/\s+\S*$/, '') + ' …' : one;
  }
  return undefined;
}

/** Turn bare `ADR-0NN` mentions into links — but not inside inline code, links or headings. */
function linkAdrMentions(md, known) {
  const lines = md.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      if (inFence || /^#/.test(line)) return line;
      // Protect inline code and existing markdown links.
      const parts = line.split(/(`[^`]*`|\[[^\]]*\]\([^)]*\))/);
      return parts
        .map((seg, i) => {
          if (i % 2 === 1) return seg;
          return seg.replace(/\bADR-(\d{3})\b/g, (whole, num) =>
            known.has(num) ? `[${whole}](/decisions/adr-${num})` : whole,
          );
        })
        .join('');
    })
    .join('\n');
}

// ------------------------------------------------------------------ ADRs

function syncAdrs() {
  rmSync(OUT_ADR, { recursive: true, force: true });
  mkdirSync(OUT_ADR, { recursive: true });

  const files = readdirSync(SRC_ADR)
    .filter((f) => /^ADR-\d{3}-.*\.md$/.test(f))
    .sort();
  const known = new Set(files.map((f) => f.match(/^ADR-(\d{3})/)[1]));

  const pages = [];
  for (const f of files) {
    const num = f.match(/^ADR-(\d{3})/)[1];
    const raw = readUtf8(join(SRC_ADR, f));
    const { title, body } = splitTitle(raw);
    const status = (body.match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1]?.replace(/[*_]/g, '').trim();
    const date = (body.match(/\*\*Date:\*\*\s*([^\n]+)/) || [])[1]?.trim();
    const slug = `adr-${num}`;
    const meta = {
      title: title ?? f.replace(/\.md$/, ''),
      description: [status && `Status: ${status}`, date && `Datum: ${date}`].filter(Boolean).join(' · ') || undefined,
      source: `oriso-platform/decisions/${f}`,
    };
    // ADRs stay plain Markdown (they contain angle brackets and braces in prose and code).
    writeFileSync(join(OUT_ADR, `${slug}.md`), frontmatter(meta) + linkAdrMentions(body, known));
    pages.push(slug);
  }

  const adrIndex = {};
  for (const f of files) {
    const num = f.match(/^ADR-(\d{3})/)[1];
    const { title, body } = splitTitle(readUtf8(join(SRC_ADR, f)));
    const status = (body.match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1]?.replace(/[*_]/g, '').trim();
    adrIndex[num] = { title: title ?? f, status, slug: `adr-${num}` };
  }
  mkdirSync(join(site, 'content'), { recursive: true });
  writeFileSync(join(site, 'content', 'adr-index.json'), JSON.stringify(adrIndex, null, 2) + '\n');

  const readme = existsSync(join(SRC_ADR, 'README.md')) ? readUtf8(join(SRC_ADR, 'README.md')) : '';
  const { body: readmeBody } = splitTitle(readme);
  const index =
    frontmatter({
      title: 'Architekturentscheidungen (ADR)',
      description: `Plattformweite Architecture Decision Records — ${files.length} Entscheidungen, aus dem Repository ORISO-Docs.`,
    }) +
    `Diese Reihe ist die kanonische Sammlung der plattformweiten Entscheidungen. Die DSFA-Kapitel verweisen auf sie; jeder Verweis der Form \`ADR-0NN\` in den Kapiteltexten ist auf die jeweilige Seite verlinkt.\n\n` +
    `| Nr. | Entscheidung | Status |\n|---|---|---|\n` +
    files
      .map((f) => {
        const num = f.match(/^ADR-(\d{3})/)[1];
        const raw = readUtf8(join(SRC_ADR, f));
        const { title, body } = splitTitle(raw);
        const status = (body.match(/\*\*Status:\*\*\s*([^\n]+)/) || [])[1]?.replace(/[*_]/g, '').trim() ?? '';
        const short = (title ?? '').replace(/^ADR-\d{3}\s*[:—–-]\s*/, '');
        return `| [ADR-${num}](/decisions/adr-${num}) | ${short.replace(/\|/g, '\\|')} | ${status.replace(/\|/g, '\\|').slice(0, 60)} |`;
      })
      .join('\n') +
    `\n\n## Herkunft und Pflege\n\n` +
    linkAdrMentions(readmeBody, known);
  writeFileSync(join(OUT_ADR, 'index.md'), index);
  writeFileSync(
    join(OUT_ADR, 'meta.json'),
    JSON.stringify({ title: 'Entscheidungen (ADR)', root: true, pages: ['index', ...pages] }, null, 2) + '\n',
  );
  return known;
}

// ------------------------------------------------------------------ evidence map

function loadEvidence() {
  const doc = parseYaml(readUtf8(join(SRC_DSFA, 'evidence-map.yaml')));
  const entries = (doc.entries ?? []).map((e) => ({
    slug: e.slug,
    chapter: String(e.chapter),
    claim: e.claim,
    status: e.status,
    evidence: (e.evidence ?? []).map((ev) => ({
      repo: ev.repo,
      path: ev.path,
      lines: ev.lines ? String(ev.lines) : undefined,
      expect: ev.expect ?? [],
      note: ev.note,
    })),
  }));
  mkdirSync(join(site, 'content'), { recursive: true });
  writeFileSync(
    join(site, 'content', 'evidence.json'),
    JSON.stringify({ generated: String(doc.generated ?? ''), entries }, null, 2) + '\n',
  );
  const byChapter = new Map();
  for (const e of entries) {
    if (!byChapter.has(e.chapter)) byChapter.set(e.chapter, []);
    byChapter.get(e.chapter).push(e.slug);
  }
  return byChapter;
}

// ------------------------------------------------------------------ DSFA chapters

// Which platform decisions belong to which section. Curated by hand; verified against the ADR
// titles on 2026-08-17. Keys are `<file-stem>#<section number>`.
const RELATED_ADRS = {
  'kap-06#6.2': ['001', '006', '007', '012'],
  'kap-06#6.2.6': ['020'],
  'kap-06#6.3': ['003', '014', '021', '022'],
  'kap-06#6.4': ['023'],
  'kap-06#6.5': ['013'],
  'kap-06#6.9': ['002', '004', '005'],
  'kap-06#6.10': ['020'],
  'kap-06#6.12': ['015', '019'],
  'kap-06#6.13': ['002', '008', '016'],
  'kap-06#6.14': ['018'],
  'kap-06#6.16': ['010', '011', '023'],
  'kap-06#6.17': ['005', '011'],
  'kap-07#7.2': ['021', '022'],
  'kap-08#8.10': ['022'],
};

const DSFA_FILES = [
  { src: 'README.md', out: 'index', title: 'DSFA — Entwicklerteil', order: 0 },
  { src: 'kap-02-schwellwertanalyse.md', out: '02-schwellwertanalyse', order: 2 },
  { src: 'kap-06-verfahren-und-technik.md', out: '06-verfahren-und-technik', order: 6 },
  { src: 'kap-07-rechtsgrundlagen.md', out: '07-rechtsgrundlagen', order: 7 },
  { src: 'kap-08-betroffenenrechte.md', out: '08-betroffenenrechte', order: 8 },
  { src: 'kap-10-ergebnis.md', out: '10-ergebnis', order: 10 },
  { src: 'vorlagen-betreiber.md', out: 'vorlagen-betreiber', title: 'Vorlagen für den Betreiber', order: 20 },
];

function injectSectionBlocks(body, stem, byChapter, adrKnown) {
  // For every numbered heading (## 6.6 / ### 6.2.6) that owns related ADRs or evidence entries,
  // append the blocks at the END of that section — i.e. right before the next heading of the
  // same or a higher level (or at EOF). Inserts run bottom-up so indices stay valid.
  const lines = body.split('\n');
  const headings = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{2,3}) (\d+(?:\.\d+)+)\s/);
    if (h) headings.push({ i, level: h[1].length, key: h[2] });
  });
  const inserts = [];
  headings.forEach((h, idx) => {
    const adrs = RELATED_ADRS[`${stem}#${h.key}`]?.filter((n) => adrKnown.has(n)) ?? [];
    const evidence = byChapter.get(h.key) ?? [];
    if (!adrs.length && !evidence.length) return;
    const next = headings.slice(idx + 1).find((n) => n.level <= h.level);
    const at = next ? next.i : lines.length;
    const block = [];
    if (adrs.length) block.push('', `<RelatedAdrs numbers={${JSON.stringify(adrs)}} />`);
    if (evidence.length) block.push('', `<Evidence chapter=${JSON.stringify(h.key)} slugs={${JSON.stringify(evidence)}} />`);
    block.push('');
    inserts.push({ at, block });
  });
  inserts.sort((a, b) => b.at - a.at);
  for (const { at, block } of inserts) lines.splice(at, 0, ...block);
  return lines.join('\n');
}

function syncDsfa(byChapter, adrKnown) {
  rmSync(OUT_DSFA, { recursive: true, force: true });
  mkdirSync(OUT_DSFA, { recursive: true });
  const pages = [];
  for (const f of DSFA_FILES.sort((a, b) => a.order - b.order)) {
    const p = join(SRC_DSFA, f.src);
    if (!existsSync(p)) continue;
    const raw = readUtf8(p);
    const { title, body } = splitTitle(raw);
    let text = linkAdrMentions(body, adrKnown);
    const stem = (f.src.match(/^kap-\d+/) || [f.src])[0]; // kap-06
    if (/^kap-/.test(f.src)) text = injectSectionBlocks(text, stem, byChapter, adrKnown);
    // The README's own file table references sibling files by name — turn them into links.
    if (f.src === 'README.md') {
      for (const g of DSFA_FILES) {
        if (g.src === 'README.md') continue;
        text = text.replaceAll('`' + g.src + '`', `[\`${g.src}\`](/legal/dsfa/${g.out})`);
      }
    }
    const meta = {
      title: f.title ?? title ?? f.out,
      description: firstParagraph(body),
      source: `oriso-platform/dsfa-text/${f.src}`,
    };
    writeFileSync(join(OUT_DSFA, `${f.out}.mdx`), frontmatter(meta) + text);
    pages.push(f.out);
  }
  writeFileSync(
    join(OUT_DSFA, 'meta.json'),
    JSON.stringify({ title: 'DSFA (Datenschutz-Folgenabschätzung)', pages }, null, 2) + '\n',
  );
  mkdirSync(join(OUT_DOCS, 'legal'), { recursive: true });
  writeFileSync(
    join(OUT_DOCS, 'legal', 'meta.json'),
    JSON.stringify({ title: 'Recht & Compliance', root: true, pages: ['dsfa'] }, null, 2) + '\n',
  );
  return pages;
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

function syncProductDocs() {
  const cfgPath = join(repo, 'docs.json');
  if (!existsSync(cfgPath)) return [];
  const cfg = JSON.parse(readUtf8(cfgPath));
  const tabs = cfg.navigation?.tabs ?? [];
  // Tab-Titel -> Ordnername und Anzeigename in der Seitenleiste
  const TAB_DIRS = {
    'Product': ['produkt', 'Produkt'],
    'ORISO Platform Architecture': ['plattform', 'Plattform-Architektur'],
    'ORISO Platform Setup': ['betrieb', 'Betrieb & Einrichtung'],
  };
  const roots = [];
  let pages = 0;
  const missing = [];

  for (const tab of tabs) {
    const [dir, label] = TAB_DIRS[tab.tab] ?? [tab.tab.toLowerCase().replace(/\W+/g, '-'), tab.tab];
    const outRoot = join(OUT_DOCS, dir);
    rmSync(outRoot, { recursive: true, force: true });
    mkdirSync(outRoot, { recursive: true });
    const groupDirs = [];

    for (const group of tab.groups ?? []) {
      const gdir = group.group.toLowerCase().replace(/&/g, 'und').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const gPath = join(outRoot, gdir);
      mkdirSync(gPath, { recursive: true });
      const gPages = [];

      for (const page of group.pages ?? []) {
        // Mintlify referenziert ohne Endung; im Repo liegen .mdx und .md gemischt.
        const src = [page + '.mdx', page + '.md'].map((c) => join(repo, c)).find(existsSync);
        if (!src) { missing.push(page); continue; }
        const name = page.split('/').pop();
        // .md-Quellen bleiben .md — sie enthalten keine Komponenten und dürfen nicht
        // versehentlich als JSX geparst werden (spitze Klammern in Beispielen).
        const isMdx = src.endsWith('.mdx');
        writeFileSync(join(gPath, name + (isMdx ? '.mdx' : '.md')),
                      isMdx ? migrateMdx(readUtf8(src)) : readUtf8(src));
        gPages.push(name);
        pages++;
      }
      if (!gPages.length) { rmSync(gPath, { recursive: true, force: true }); continue; }
      writeFileSync(join(gPath, 'meta.json'),
        JSON.stringify({ title: group.group, pages: gPages }, null, 2) + '\n');
      groupDirs.push(gdir);
    }

    writeFileSync(join(outRoot, 'meta.json'),
      JSON.stringify({ title: label, root: true, pages: groupDirs }, null, 2) + '\n');
    roots.push(dir);
  }
  console.log(`[sync-content] ${pages} Produkt-/Plattformseiten übernommen` +
              (missing.length ? `, ${missing.length} fehlen: ${missing.slice(0, 4).join(', ')}` : ''));
  return roots;
}

// ------------------------------------------------------------------ main

// Die DSFA lebt als eigenständiges Dokument auf understand.oriso.org/legal/dsfa/ und wird
// hier bewusst NICHT gerendert — diese Site trägt die Entwickler- und Produktdokumentation.
rmSync(join(OUT_DOCS, 'legal'), { recursive: true, force: true });
const adrKnown = syncAdrs();
const roots = syncProductDocs();
const assets = copyDocsAssets();
writeFileSync(join(OUT_DOCS, 'meta.json'),
  JSON.stringify({ pages: ['index', ...roots, 'decisions'] }, null, 2) + '\n');
console.log(`[sync-content] ${adrKnown.size} ADRs, ${assets} Bilddateien, Wurzeln: ${roots.join(', ')}`);
