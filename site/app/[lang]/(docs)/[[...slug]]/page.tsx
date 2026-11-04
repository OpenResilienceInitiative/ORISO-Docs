import { getPageImageUrl, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import {translationUsable} from '@/lib/locale-router.mjs';
import {pageIndex as index} from '@/lib/page-index';
import { SectionAliases } from '@/components/section-aliases';
import { gitConfig, basePath } from '@/lib/shared';

export default async function Page(props: { params: Promise<{lang:string; slug?:string[]}> }) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  const record = index.pages.find((entry) => entry.route === (params.slug ?? []).join('/'));
  const state = record?.locales[params.lang as 'de' | 'en'];
  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${record?.sourceState === 'committed' ? record.sourceRevision : gitConfig.branch}/${record?.source ?? page.data.source ?? `site/content/docs/${page.path}`}`}
        />
      </div>
      {state && <SectionAliases aliases={state.sectionAliases} />}
      {record && <aside className="my-4 rounded border p-3 text-sm" aria-label={params.lang === 'de' ? 'Quellenstand' : 'Source provenance'}>
        <p>{params.lang === 'de' ? 'Verantwortlicher Quellbereich' : 'Source owner'}: {record.owner}. {record.lifecycle === 'archived' ? (params.lang === 'de' ? 'Historischer Inhalt.' : 'Historical content.') : (params.lang === 'de' ? 'Aktuelle Dokumentationsseite.' : 'Current documentation page.')}</p>
        <p>{params.lang === 'de' ? 'Dokumentationsquelle: dev; letzter Quellcommit' : 'Documentation source: dev; last source commit'}: {record.sourceRevision?.slice(0,12) ?? (params.lang === 'de' ? 'noch nicht committed' : 'not committed yet')}. {record.sourceState === 'working-copy' && (params.lang === 'de' ? 'Dieser Vorschautext enthält lokale Änderungen.' : 'This preview contains local source changes.')}</p>
        {record.graphSource && <p>{params.lang === 'de' ? 'Generierte Quellenbelege' : 'Generated source evidence'}: {record.graphSource.generatedAt}; {record.graphSource.sources.map(s => `${s.repository} ${s.ref} ${s.sourceSHA.slice(0,12)}`).join('; ')}.</p>}
        <p>{params.lang === 'de' ? 'Der veröffentlichte Understand-Graph beschreibt seinen eigenen Release-Stand. Quellenvergleich und Übersetzung bestätigen keine Laufzeitprüfung oder juristische Freigabe.' : 'The published Understand graph describes its own released revision. Source comparison and translation do not establish runtime verification or legal approval.'}</p>
      </aside>}
      {state?.translationState !== 'current' && <p role="alert" className="rounded border border-amber-500 p-3">{params.lang === 'de' ? 'Diese Übersetzung fehlt oder ist veraltet. Vorschau: Der Text kann in der Originalsprache erscheinen.' : 'This translation is missing or outdated. Preview: the text may appear in its original language.'}</p>}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams('slug', 'lang');
}

export async function generateMetadata(props: { params: Promise<{lang:string; slug?:string[]}> }): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  const record = index.pages.find(entry => entry.route === (params.slug ?? []).join('/'));
  return {
    alternates: { canonical: `${basePath}${page.url}`, languages: Object.fromEntries((['de','en'] as const).filter(lang => translationUsable(record?.locales[lang])).map(lang => [lang, `${basePath}/${lang}/${(params.slug ?? []).join('/')}`])) },
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}
