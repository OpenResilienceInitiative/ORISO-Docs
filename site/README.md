# ORISO documentation site (Fumadocs)

Static documentation site for the compliance and architecture content of this repository.
Built with [Fumadocs](https://fumadocs.dev) on Next.js (static export), served by nginx.

## What it renders

| Route | Source of truth | How it gets here |
|---|---|---|
| `/legal/dsfa/*` | `../oriso-platform/dsfa-text/*.md` | `scripts/sync-content.mjs` (adds frontmatter, links `ADR-0NN` mentions, injects `<RelatedAdrs/>` and `<Evidence/>` blocks per section) |
| `/decisions/*` | `../oriso-platform/decisions/ADR-*.md` | same script |
| Evidence data | `../oriso-platform/dsfa-text/evidence-map.yaml` | written to `content/evidence.json` |

Everything under `content/docs/legal`, `content/docs/decisions`, `content/evidence.json` and
`content/adr-index.json` is generated and git-ignored. Edit the sources, not the generated files.

## Commands

```bash
pnpm install
pnpm dev          # runs the sync, then next dev  -> http://localhost:3000/dokumentation/
pnpm build        # runs the sync, then a static export into out/
```

The export is built for the path prefix `/dokumentation` (`NEXT_PUBLIC_BASE_PATH`); override
the variable to build for another prefix or for a dedicated domain (`NEXT_PUBLIC_BASE_PATH=`).

## Evidence viewer

`<Evidence/>` lists, per section, every claim from `evidence-map.yaml` with its status and the
repository locations behind it. "Code anzeigen" fetches the file from the Understand-Anything
graph explorer (`/<slug>/file-content.json`) on the **same origin** and highlights the cited
line range; when the site is served elsewhere it falls back to the GitHub link on the
`pre-dev` branch. Slugs and tokens live in `lib/shared.ts` and mirror the dashboards on
`understand.oriso.org`.

## Deploying

Live at **https://docs.oriso.org/** (nginx on `49.13.11.37`, the Understand-Anything host;
Let's Encrypt via certbot). `understand.oriso.org/dokumentation/*` and `understand.oriso.org/legal/dsfa/`
redirect there; the 16.08 single-page DSFA stays at `understand.oriso.org/legal/dsfa-v2/`.

```bash
pnpm build:root && rsync -az --delete out/ root@49.13.11.37:/var/www/docs-site/
```

Vhost: `/etc/nginx/sites-available/docs.oriso.org`. Its `location ~ ^/(<slug>)/file-content\.json$`
loop-proxies (HTTPS + SNI) to the Understand-Anything vhost so the code viewer stays same-origin.
`pnpm build` (prefix `/dokumentation`) is kept for a path-prefixed deployment; set
`NEXT_PUBLIC_BASE_PATH` for any other prefix.
