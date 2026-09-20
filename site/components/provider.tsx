'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { type ReactNode } from 'react';

const { provider } = defineI18nUI(
  { languages: ['en'], defaultLanguage: 'en' },
  {
      en: {
        displayName: 'English',
      },
  },
);

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider i18n={provider('en')} search={{ SearchDialog }}>
      {children}
    </RootProvider>
  );
}
