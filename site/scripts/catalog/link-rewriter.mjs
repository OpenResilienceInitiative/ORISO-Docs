import {existsSync} from 'node:fs';
import {join} from 'node:path';
const GITHUB_BLOB = 'https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/dev';
function outsideCode(text, apply) {
  let fence;
  return text.split('\n').map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if(marker) { if(!fence) fence=marker[1][0]; else if(fence===marker[1][0]) fence=undefined; return line; }
    if(fence) return line;
    return line.split(/(`+[^`]*`+)/).map((part,i)=>i%2?part:apply(part)).join('');
  }).join('\n');
}

export function makeLinkRewriter(urlByPage, assetExists, anchorsByPage, repo = '.') {
  const unresolved = [];

  /**
   * Die Alt-Doku schreibt Anker wie `#4-5-4-multi-recipient-send` — der Renderer bildet
   * `4.5.4` aber auf `454` ab. Anker deshalb gegen die echten Überschriften der Zielseite
   * auflösen: Vergleich über Buchstaben und Ziffern, Trennzeichen ignoriert.
   */
  function fixAnchor(pageStem, hash) {
    const want = decodeURIComponent(hash).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const candidates = anchorsByPage.get(pageStem) ?? [];
    if (candidates.includes(decodeURIComponent(hash).toLowerCase())) return decodeURIComponent(hash).toLowerCase();
    return candidates.find((slug) => slug.replace(/[^\p{L}\p{N}]/gu, '') === want) ?? null;
  }

  function resolveTarget(href, pageDir) {
    const localHref = href.replace(/^https:\/\/docs\.oriso\.org(?=\/|$)/, '');
    const [beforeHash, hash] = localHref.split('#');
    const [pathPart, query] = beforeHash.split('?');
    const suffix = query === undefined ? '' : '?' + query;
    if (!pathPart) return null; // reiner Seitenanker
    const clean = pathPart.replace(/^\/(?:de|en)(?=\/|$)/, '').replace(/\/$/, '');
    const repoPath = clean.startsWith('/')
      ? clean.slice(1)
      : join(pageDir, clean).replace(/\\/g, '/').replace(/^\.\//, '');
    const stem = repoPath.replace(/\.mdx?$/, '');
    const url = urlByPage.get(stem);
    if (url) {
      if (!hash) return url + suffix;
      const fixed = fixAnchor(stem, hash);
      if (!fixed) unresolved.push(href);
      return url + suffix + '#' + (fixed ?? hash);
    }
    if (assetExists(repoPath)) return null; // Bild/Asset unter public/ — bleibt wie es ist
    if (existsSync(join(repo, repoPath))) return `${GITHUB_BLOB}/${repoPath}${suffix}${hash ? '#' + hash : ''}`;
    // Seiten, die dieses Skript selbst erzeugt (ADR-Reihe), werden absolut verlinkt.
    if (/^\/(decisions|legal)(\/|$)/.test(clean)) return null;
    unresolved.push(href);
    return null;
  }

  function rewrite(text, pageDir) {
    return outsideCode(text, (part) =>
      part
        .replace(/(\]\(\s*)([^)\s]+)(\s*\))/g, (whole, open, href, close) => {
          if (/^(https?:|mailto:|tel:|#)/.test(href) && !/^https:\/\/docs\.oriso\.org\//.test(href)) return whole;
          const to = resolveTarget(href, pageDir);
          return to ? `${open}${to}${close}` : whole;
        })
        .replace(/(href=")([^"]+)(")/g, (whole, open, href, close) => {
          if (/^(https?:|mailto:|tel:|#)/.test(href) && !/^https:\/\/docs\.oriso\.org\//.test(href)) return whole;
          const to = resolveTarget(href, pageDir);
          return to ? `${open}${to}${close}` : whole;
        }),
    );
  }

  return { rewrite, unresolved };
}

