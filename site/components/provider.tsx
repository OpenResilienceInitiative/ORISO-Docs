'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { type ReactNode } from 'react';
import uiTranslations from '@/lib/ui-translations.json';

const { provider } = defineI18nUI(
  { languages: ['de', 'en'], defaultLanguage: 'de' },
  uiTranslations,
);

export function Provider({ children, lang = 'de' }: { children: ReactNode; lang?: string }) {
  return (
    <RootProvider i18n={provider(lang)} search={{ SearchDialog }}>
      {children}
    </RootProvider>
  );
}
