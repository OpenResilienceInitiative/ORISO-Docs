import { NavbarLocale } from '@/components/navbar-locale';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, basePath, gitConfig, uaOrigin } from './shared';

export function baseOptions(lang = 'de'): BaseLayoutProps {
  return {
    i18n: false,
    nav: {
      children: <NavbarLocale lang={lang} />,
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <img src={`${basePath}/favicon.svg`} width={20} height={20} alt="" aria-hidden />
          {lang === 'de' ? 'ORISO Dokumentation' : appName}
        </span>
      ),
    },
    links: [
      {
        type: 'main',
        text: lang === 'de' ? 'Code-Graph (Understand-Anything)' : 'Code graph (Understand-Anything)',
        url: `${uaOrigin}/`,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
