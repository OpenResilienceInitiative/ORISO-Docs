import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, basePath, gitConfig, uaOrigin } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <img src={`${basePath}/favicon.svg`} width={20} height={20} alt="" aria-hidden />
          {appName}
        </span>
      ),
    },
    links: [
      {
        type: 'main',
        text: 'Code-Graph (Understand-Anything)',
        url: `${uaOrigin}/`,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
