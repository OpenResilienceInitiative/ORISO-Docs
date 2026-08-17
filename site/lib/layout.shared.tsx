import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, gitConfig, uaOrigin } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="inline-block size-5 rounded-md"
            style={{ background: 'linear-gradient(135deg,#0f766e,#1d4ed8)' }}
          />
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
