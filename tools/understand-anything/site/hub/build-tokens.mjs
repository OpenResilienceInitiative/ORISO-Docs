// Generates assets/tokens.css from assets/tokens.json (the single source of truth for state colours).
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const here = new URL('./assets/', import.meta.url);

function declarations(tokens, mode, surface, ink) {
  const out = [`  --ua-surface:${surface[mode]};`, `  --ua-ink:${ink[mode]};`];
  for (const [name, token] of Object.entries(tokens)) {
    if (token.alias) {
      for (const part of ['fill', 'on', 'edge']) {
        const target = tokens[token.alias][mode];
        if (target[part]) out.push(`  --ua-${name}${part === 'fill' ? '' : '-' + part}:var(--ua-${token.alias}${part === 'fill' ? '' : '-' + part});`);
      }
      continue;
    }
    const v = token[mode];
    out.push(`  --ua-${name}:${v.fill};`, `  --ua-${name}-on:${v.on};`);
    if (v.edge) out.push(`  --ua-${name}-edge:${v.edge};`);
  }
  return out.join('\n');
}

export function renderTokensCss(data) {
  const block = mode => declarations(data.tokens, mode, data.surface, data.ink);
  return `/* GENERATED from tokens.json by build-tokens.mjs. Do not edit by hand (ORISO-Docs#202).
   Naming: --ua-<token> is the fill (for hatch tokens: the stripe colour), --ua-<token>-on the
   text colour on that fill, --ua-<token>-edge an optional outline. */
:root{
${block('light')}
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
${block('dark').replace(/^/gm, '  ')}
  }
}
:root[data-theme="dark"]{
${block('dark')}
}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(new URL('tokens.json', here), 'utf8'));
  writeFileSync(new URL('tokens.css', here), renderTokensCss(data));
}
