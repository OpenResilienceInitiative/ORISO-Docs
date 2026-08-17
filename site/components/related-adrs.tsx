import Link from 'next/link';
import adrIndex from '@/content/adr-index.json';

type AdrMeta = { title: string; status?: string; slug: string };
const index = adrIndex as Record<string, AdrMeta>;

/**
 * "Zugehörige Entscheidungen" — links a DSFA section to the platform ADRs it rests on.
 * Rendered by the content sync (see scripts/sync-content.mjs, RELATED_ADRS).
 */
export function RelatedAdrs({ numbers }: { numbers: string[] }) {
  const items = numbers.map((n) => ({ n, meta: index[n] })).filter((i) => i.meta);
  if (!items.length) return null;
  return (
    <aside className="my-6 rounded-lg border border-fd-border bg-fd-card p-4 text-sm not-prose">
      <p className="mb-2 font-medium text-fd-foreground">Zugehörige Architekturentscheidungen</p>
      <ul className="m-0 grid list-none gap-1 p-0">
        {items.map(({ n, meta }) => (
          <li key={n} className="flex flex-wrap items-baseline gap-x-2">
            <Link
              href={`/decisions/${meta.slug}`}
              className="font-mono text-xs font-semibold text-fd-primary underline-offset-2 hover:underline"
            >
              ADR-{n}
            </Link>
            <span className="text-fd-muted-foreground">
              {meta.title.replace(/^ADR-\d{3}\s*[:—–-]\s*/, '')}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
