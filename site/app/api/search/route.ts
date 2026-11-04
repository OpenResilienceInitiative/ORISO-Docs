import { pageIndex } from '@/lib/page-index';
import { translationUsable } from '@/lib/locale-router.mjs';
import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

export const { staticGET: GET } = createFromSource({ ...source, getPages: (lang?: string) => source.getPages(lang).filter(page => {
  const record = pageIndex.pages.find(entry => entry.route === page.slugs.join('/'));
  return translationUsable(record?.locales[page.locale as 'de' | 'en']);
}) }, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  localeMap: { de: 'german', en: 'english' },
});
