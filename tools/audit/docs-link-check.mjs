#!/usr/bin/env node
// Link and freshness check for the ORISO developer documentation.
//
// Runs entirely offline. Three passes:
//
//   1. navigation — every page listed in `docs.json` must have a source file in the repository.
//   2. links      — every link in the *generated* site tree (`site/content/docs/**`, produced by
//                   `site/scripts/sync-content.mjs`) is resolved the way the site resolves it:
//                   internal links against the generated page set and its heading anchors,
//                   relative links against the generated folder layout.
//   3. code refs  — GitHub `blob` links into the ORISO repositories are verified against the
//                   local checkouts (`../ORISO-*`) with `git cat-file`: does the ref exist, does
//                   the path exist at that ref, and does the `#Lx-Ly` range fit the file?
//
// Usage:
//   node tools/audit/docs-link-check.mjs                 # human-readable summary
//   node tools/audit/docs-link-check.mjs --markdown      # markdown tables (for the audit report)
//   node tools/audit/docs-link-check.mjs --json out.json
//
// Exit code is 0 unless --strict is passed and broken links were found.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const generated = process.env.DOCS_GENERATED ?? join(repo, 'site', 'content', 'docs');
/** Where the sibling ORISO repositories are checked out — `<parent-of-ORISO-Docs>/ORISO-*`. */
const CHECKOUT_ROOT = process.env.ORISO_CHECKOUT_ROOT ?? resolve(repo, '..');
const GH_ORG = 'OpenResilienceInitiative';

const args = process.argv.slice(2);
const wantMarkdown = args.includes('--markdown');
const jsonAt = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const strict = args.includes('--strict');

// ---------------------------------------------------------------- utilities

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Heading slug with the renderer's rules (github-slugger): punctuation out, spaces to dashes. */
const SLUG_STRIP = /[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g;

function slugify(text) {
  return text
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(SLUG_STRIP, '')
    .replace(/ /g, '-');
}

function stripFences(md) {
  return md.replace(/^```[\s\S]*?^```/gm, '');
}

/** All links in a markdown/MDX body: `[t](url)`, `<https://…>` and `href="…"`. */
function extractLinks(md) {
  const body = stripFences(md);
  const found = [];
  for (const m of body.matchAll(/\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g)) {
    found.push(m[1].replace(/^<|>$/g, ''));
  }
  for (const m of body.matchAll(/href=["']([^"']+)["']/g)) found.push(m[1]);
  for (const m of body.matchAll(/<((?:https?|mailto):[^>\s]+)>/g)) found.push(m[1]);
  return found;
}

// ---------------------------------------------------------------- pass 1: navigation

function navigationPages() {
  const cfg = JSON.parse(readFileSync(join(repo, 'docs.json'), 'utf8'));
  const rows = [];
  for (const tab of cfg.navigation?.tabs ?? []) {
    for (const group of tab.groups ?? []) {
      for (const page of group.pages ?? []) {
        const src = [page + '.mdx', page + '.md'].map((c) => join(repo, c)).find(existsSync);
        rows.push({ tab: tab.tab, group: group.group, page, source: src ? relative(repo, src) : null });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------- generated page index

/** url (`/plattform/architecture-hub/architecture`) -> { file, anchors:Set } */
function indexGeneratedPages() {
  const pages = new Map();
  for (const file of walk(generated)) {
    if (!/\.mdx?$/.test(file)) continue;
    const rel = relative(generated, file).replace(/\.mdx?$/, '');
    const url = '/' + rel.replace(/(^|\/)index$/, '');
    const raw = readFileSync(file, 'utf8');
    const anchors = new Set();
    for (const m of stripFences(raw).matchAll(/^#{1,6}\s+(.+)$/gm)) anchors.add(slugify(m[1]));
    pages.set(url.replace(/\/$/, '') || '/', { file, anchors });
  }
  return pages;
}

// ---------------------------------------------------------------- pass 3: code refs

const repoRefCache = new Map();

function gitOk(repoDir, args) {
  try {
    return execFileSync('git', ['-C', repoDir, ...args], { stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Verify `https://github.com/<org>/<repo>/blob/<ref>/<path>#L<a>-L<b>` against a local checkout. */
function checkCodeRef(url) {
  const m = url.match(
    new RegExp(`^https://github\\.com/${GH_ORG}/([^/]+)/blob/([^/]+)/([^#?]+)(?:#L(\\d+)(?:-L(\\d+))?)?$`),
  );
  if (!m) return null;
  const [, repoName, ref, path, fromRaw, toRaw] = m;
  // This repository may live in a worktree, so its own checkout is `repo`, not a sibling.
  const dir = [repo, join(CHECKOUT_ROOT, repoName), join(CHECKOUT_ROOT, '..', repoName)].find(
    (d) =>
      existsSync(join(d, '.git')) &&
      (gitOk(d, ['remote', 'get-url', 'origin']) ?? Buffer.from('')).toString().includes(`/${repoName}`),
  );
  const key = `${repoName}@${ref}`;
  if (!dir) return { ok: false, reason: `no local checkout ${repoName}` };
  if (!repoRefCache.has(key)) {
    // The link points at GitHub, so the remote-tracking ref is authoritative — a local
    // branch of the same name may be months behind and would produce false failures.
    const candidates = [`refs/remotes/origin/${ref}`, `origin/${ref}`, ref];
    repoRefCache.set(key, candidates.find((c) => gitOk(dir, ['rev-parse', '--verify', '--quiet', c])) ?? null);
  }
  const resolved = repoRefCache.get(key);
  if (!resolved) return { ok: false, reason: `ref '${ref}' missing in ${repoName}` };
  let blob = gitOk(dir, ['show', `${resolved}:${decodeURIComponent(path)}`]);
  if (blob === null && dir === repo && existsSync(join(repo, decodeURIComponent(path)))) {
    // Own repository: a page may reference a file that this branch adds and `dev` does not have yet.
    blob = readFileSync(join(repo, decodeURIComponent(path)));
  }
  if (blob === null) return { ok: false, reason: `path missing at ${repoName}@${ref}` };
  if (fromRaw) {
    const lines = blob.toString('utf8').split('\n').length;
    const from = Number(fromRaw);
    const to = Number(toRaw ?? fromRaw);
    if (from < 1 || to < from) return { ok: false, reason: `bad line range L${from}-L${to}` };
    if (to > lines) return { ok: false, reason: `L${to} beyond EOF (${lines} lines)` };
  }
  return { ok: true };
}

// ---------------------------------------------------------------- pass 2: links

function checkLinks(pages) {
  const problems = [];
  const stats = { total: 0, internal: 0, coderef: 0, external: 0 };

  for (const [url, { file }] of pages) {
    const raw = readFileSync(file, 'utf8');
    const dirUrl = url.split('/').slice(0, -1).join('/') || '';
    for (const href of extractLinks(raw)) {
      stats.total++;
      if (/^(mailto:|tel:)/.test(href)) continue;

      if (/^https?:\/\//.test(href)) {
        if (href.startsWith(`https://github.com/${GH_ORG}/`)) {
          stats.coderef++;
          const res = checkCodeRef(href);
          if (res && !res.ok) problems.push({ page: url, href, kind: 'code-ref', reason: res.reason });
          else if (!res && /\/blob\//.test(href))
            problems.push({ page: url, href, kind: 'code-ref', reason: 'unparseable blob URL' });
        } else stats.external++;
        continue;
      }

      stats.internal++;
      const [pathPart, anchor] = href.split('#');

      if (!pathPart) {
        // pure in-page anchor
        if (anchor && !pages.get(url).anchors.has(anchor.toLowerCase()))
          problems.push({ page: url, href, kind: 'anchor', reason: 'no such heading on this page' });
        continue;
      }

      // Resolve the way the site does: absolute against the docs root, relative against the folder.
      let target = pathPart.startsWith('/')
        ? pathPart
        : '/' + join(dirUrl.replace(/^\//, ''), pathPart).replace(/\\/g, '/');
      target = target.replace(/\.mdx?$/, '').replace(/\/$/, '');
      if (target.startsWith('/dokumentation/')) target = target.slice('/dokumentation'.length);

      // Images and other static files are served from `site/public`, not from the page tree.
      if (/\.(png|jpe?g|svg|gif|webp|pdf)$/i.test(pathPart)) {
        if (!existsSync(join(repo, 'site', 'public', pathPart.replace(/^\//, ''))))
          problems.push({ page: url, href, kind: 'asset', reason: 'no file under site/public' });
        continue;
      }

      const hit = pages.get(target);
      if (!hit) {
        problems.push({ page: url, href, kind: 'internal', reason: `no page at ${target}` });
        continue;
      }
      if (anchor && !hit.anchors.has(anchor.toLowerCase()))
        problems.push({ page: url, href, kind: 'anchor', reason: `no heading '${anchor}' on ${target}` });
    }
  }
  return { problems, stats };
}

// ---------------------------------------------------------------- report

const nav = navigationPages();
const missingSources = nav.filter((r) => !r.source);
const pages = indexGeneratedPages();
const { problems, stats } = checkLinks(pages);

const byKind = (k) => problems.filter((p) => p.kind === k);
const summary = {
  navigationEntries: nav.length,
  navigationMissingSources: missingSources.length,
  generatedPages: pages.size,
  links: stats,
  broken: {
    internal: byKind('internal').length,
    anchor: byKind('anchor').length,
    codeRef: byKind('code-ref').length,
    asset: byKind('asset').length,
    total: problems.length,
  },
};

if (jsonAt) writeFileSync(jsonAt, JSON.stringify({ summary, missingSources, problems }, null, 2) + '\n');

if (wantMarkdown) {
  const rows = new Map();
  for (const p of problems) {
    if (!rows.has(p.page)) rows.set(p.page, []);
    rows.get(p.page).push(p);
  }
  console.log(`| Kennzahl | Wert |\n| --- | --- |`);
  console.log(`| Seiten in \`docs.json\` | ${summary.navigationEntries} |`);
  console.log(`| davon ohne Quelldatei | ${summary.navigationMissingSources} |`);
  console.log(`| Generierte Seiten | ${summary.generatedPages} |`);
  console.log(`| Links gesamt | ${stats.total} |`);
  console.log(`| davon Code-Links (GitHub) | ${stats.coderef} |`);
  console.log(`| Tote interne Links | ${summary.broken.internal} |`);
  console.log(`| Tote Anker | ${summary.broken.anchor} |`);
  console.log(`| Tote Code-Links | ${summary.broken.codeRef} |`);
  console.log(`| Fehlende Bilddateien | ${summary.broken.asset} |`);
  console.log(`| **Tote Links gesamt** | **${summary.broken.total}** |`);
  if (rows.size) {
    console.log(`\n| Seite | tote Links | Beispiele |\n| --- | --- | --- |`);
    for (const [page, list] of [...rows].sort((a, b) => b[1].length - a[1].length)) {
      const sample = list
        .slice(0, 3)
        .map((p) => `\`${p.href}\` (${p.reason})`)
        .join('<br>');
      console.log(`| \`${page}\` | ${list.length} | ${sample} |`);
    }
  }
} else {
  console.log(JSON.stringify(summary, null, 2));
  for (const r of missingSources) console.log(`  MISSING SOURCE  ${r.page}  (${r.tab} / ${r.group})`);
  for (const p of problems.slice(0, 60)) console.log(`  ${p.kind.padEnd(9)} ${p.page}  ->  ${p.href}  (${p.reason})`);
  if (problems.length > 60) console.log(`  … ${problems.length - 60} weitere`);
}

if (strict && (problems.length || missingSources.length)) process.exit(1);
