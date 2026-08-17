'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { type ReactNode } from 'react';

const { provider } = defineI18nUI(
  { languages: ['de'], defaultLanguage: 'de' },
  {
      de: {
        displayName: 'Deutsch',
        'Search(search dialog)': 'Suchen',
        'Search(search trigger)': 'Suchen',
        'No results found(search dialog)': 'Keine Treffer',
        'On this page(table of contents)': 'Auf dieser Seite',
        'No Headings(table of contents)': 'Keine Überschriften',
        'Table of Contents(inline table of contents)': 'Inhalt',
        'Last updated on(page footer)': 'Zuletzt aktualisiert am',
        'Next Page(pagination)': 'Weiter',
        'Previous Page(pagination)': 'Zurück',
        'Edit on GitHub(edit page)': 'Auf GitHub bearbeiten',
        'Copy Markdown(page actions)': 'Markdown kopieren',
        'View as Markdown(page actions)': 'Als Markdown anzeigen',
        'Open in GitHub(page actions)': 'Auf GitHub öffnen',
        'Open(page actions)': 'Öffnen',
        'Page Not Found(404 not found page)': 'Seite nicht gefunden',
        'Back to Home(404 not found page)': 'Zur Startseite',
        'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 not found page)':
          'Die gesuchte Seite wurde entfernt, umbenannt oder ist vorübergehend nicht erreichbar.',
        'Show Sidebar(sidebar)': 'Navigation einblenden',
        'Hide Sidebar(sidebar)': 'Navigation ausblenden',
        'Toggle Theme(theme switcher)(aria-label)': 'Design umschalten',
        'Light(theme switcher)(aria-label)': 'Hell',
        'Dark(theme switcher)(aria-label)': 'Dunkel',
        'System(theme switcher)(aria-label)': 'System',
      },
  },
);

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider i18n={provider('de')} search={{ SearchDialog }}>
      {children}
    </RootProvider>
  );
}
