'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Renders a ```mermaid fence as a diagram.
 *
 * The pages are plain Markdown so that they stay readable on GitHub, where fenced mermaid blocks
 * are rendered natively. Here the same fence is turned into SVG in the browser — the site is a
 * static export, so nothing runs at build time.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const holder = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dark = document.documentElement.classList.contains('dark');

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: 'inherit',
          theme: dark ? 'dark' : 'neutral',
        });
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-render when the reader switches the colour scheme.
  }, [chart, id]);

  if (failed) {
    return (
      <pre className="fd-codeblock overflow-x-auto text-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      ref={holder}
      className="my-6 overflow-x-auto rounded-lg border bg-fd-card p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // eslint-disable-next-line react/no-danger -- mermaid output, securityLevel 'strict'
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {svg ? undefined : <span className="text-fd-muted-foreground text-sm">Diagramm wird gezeichnet …</span>}
    </div>
  );
}
