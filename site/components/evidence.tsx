'use client';
import { useEffect, useRef, useState } from 'react';
import evidenceData from '@/content/evidence.json';
import { codeBranch, uaDashboards, uaOrigin } from '@/lib/shared';

type EvidenceRef = { repo: string; path: string; lines?: string; expect: string[]; note?: string };
type Entry = { slug: string; chapter: string; claim: string; status: string; evidence: EvidenceRef[] };

const entries = new Map<string, Entry>((evidenceData.entries as Entry[]).map((e) => [e.slug, e]));

const STATUS: Record<string, { label: string; className: string; hint: string }> = {
  live: { label: 'live', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', hint: 'Im Auslieferungsstand wirksam.' },
  'disabled-by-default': {
    label: 'standardmäßig aus',
    className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    hint: 'Code vorhanden, im Auslieferungsstand abgeschaltet — darf nicht als vorhanden beschrieben werden.',
  },
  'not-deployed': {
    label: 'nicht ausgeliefert',
    className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    hint: 'Zielarchitektur, kein Ist-Zustand.',
  },
  'needs-live-verification': {
    label: 'Live-Prüfung offen',
    className: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
    hint: 'Aus dem Code belegt, auf der laufenden Umgebung noch nicht nachgeprüft.',
  },
};

function parseLines(lines?: string): { from: number; to: number } | null {
  if (!lines) return null;
  const m = lines.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (!m) return null;
  const from = Number(m[1]);
  return { from, to: m[2] ? Number(m[2]) : from };
}

function githubUrl(ref: EvidenceRef): string | null {
  if (!/^ORISO-/.test(ref.repo)) return null;
  const range = parseLines(ref.lines);
  const anchor = range ? `#L${range.from}${range.to !== range.from ? `-L${range.to}` : ''}` : '';
  return `https://github.com/OpenResilienceInitiative/${ref.repo}/blob/${codeBranch}/${ref.path}${anchor}`;
}

/** Same-origin first (nginx serves the dashboards next to this site), otherwise the public host. */
function fileContentUrl(ref: EvidenceRef): { sameOrigin: string; remote: string; dashboard: string } | null {
  const ua = uaDashboards[ref.repo];
  if (!ua) return null;
  const q = `/${ua.slug}/file-content.json?token=${encodeURIComponent(ua.token)}&path=${encodeURIComponent(ref.path)}`;
  return { sameOrigin: q, remote: `${uaOrigin}${q}`, dashboard: `${uaOrigin}/${ua.slug}/?token=${encodeURIComponent(ua.token)}` };
}

type Loaded =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; content: string; lineCount: number }
  | { state: 'error'; message: string };

function CodeViewer({ entry, evidenceRef: ref, onClose }: { entry: Entry; evidenceRef: EvidenceRef; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState<Loaded>({ state: 'idle' });
  const range = parseLines(ref.lines);
  const urls = fileContentUrl(ref);
  const gh = githubUrl(ref);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const onCancel = () => onClose();
    d.addEventListener('close', onCancel);
    return () => d.removeEventListener('close', onCancel);
  }, [onClose]);

  useEffect(() => {
    if (!urls) {
      setLoaded({ state: 'error', message: 'Für dieses Repository gibt es kein Understand-Anything-Dashboard.' });
      return;
    }
    let cancelled = false;
    setLoaded({ state: 'loading' });
    (async () => {
      const attempts = [urls.sameOrigin, urls.remote];
      let lastError = '';
      for (const url of attempts) {
        try {
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (res.status === 403) {
            lastError = 'Der Zugriffs-Token greift nicht (403).';
            continue;
          }
          if (res.status === 404) {
            lastError = 'Die Datei liegt nicht (mehr) im Knowledge-Graph (404).';
            continue;
          }
          if (!res.ok) {
            lastError = `Unerwartete Antwort ${res.status}.`;
            continue;
          }
          const json = (await res.json()) as { content?: string; lineCount?: number };
          if (typeof json.content !== 'string') {
            lastError = 'Antwort ohne Dateiinhalt.';
            continue;
          }
          if (!cancelled) setLoaded({ state: 'ok', content: json.content, lineCount: json.lineCount ?? json.content.split('\n').length });
          return;
        } catch {
          lastError = 'Der Quelltext ist nur in der ausgelieferten Fassung (gleicher Host wie die Dashboards) abrufbar.';
        }
      }
      if (!cancelled) setLoaded({ state: 'error', message: lastError });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.repo, ref.path]);

  useEffect(() => {
    if (loaded.state !== 'ok' || !range) return;
    const el = dialogRef.current?.querySelector<HTMLElement>(`[data-line="${range.from}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [loaded, range]);

  const lines = loaded.state === 'ok' ? loaded.content.split('\n') : [];

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(96vw,64rem)] max-h-[90vh] rounded-xl border border-fd-border bg-fd-background p-0 text-fd-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-fd-border p-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-fd-muted-foreground">Beleg · Abschnitt {entry.chapter}</p>
          <p className="mt-1 text-sm">{entry.claim}</p>
          <p className="mt-2 break-all font-mono text-xs text-fd-muted-foreground">
            {ref.repo}/{ref.path}
            {range ? ` · Zeilen ${range.from}${range.to !== range.from ? `–${range.to}` : ''}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="shrink-0 rounded-md border border-fd-border px-2 py-1 text-sm hover:bg-fd-accent"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[60vh] overflow-auto bg-fd-card font-mono text-xs leading-5">
        {loaded.state === 'loading' && <p className="p-4 text-fd-muted-foreground">Quelltext wird geladen …</p>}
        {loaded.state === 'error' && (
          <div className="p-4">
            <p className="text-fd-muted-foreground">{loaded.message}</p>
          </div>
        )}
        {loaded.state === 'ok' && (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((l, i) => {
                const n = i + 1;
                const hit = range ? n >= range.from && n <= range.to : false;
                return (
                  <tr key={n} data-line={n} className={hit ? 'bg-amber-300/25 dark:bg-amber-400/15' : undefined}>
                    <td className="select-none border-r border-fd-border px-3 text-right text-fd-muted-foreground">{n}</td>
                    <td className="whitespace-pre px-3">{l || ' '}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-fd-border p-3 text-xs">
        {ref.expect.length > 0 && (
          <span className="text-fd-muted-foreground">
            Erwartete Bezeichner:{' '}
            {ref.expect.map((x) => (
              <code key={x} className="mr-1 rounded bg-fd-muted px-1 py-0.5">
                {x}
              </code>
            ))}
          </span>
        )}
        <span className="ml-auto flex gap-3">
          {gh && (
            <a href={gh} target="_blank" rel="noreferrer" className="text-fd-primary underline-offset-2 hover:underline">
              Auf GitHub ({codeBranch})
            </a>
          )}
          {urls && (
            <a href={urls.dashboard} target="_blank" rel="noreferrer" className="text-fd-primary underline-offset-2 hover:underline">
              Repository-Graph
            </a>
          )}
        </span>
      </div>
      {loaded.state === 'ok' && (
        <p className="border-t border-fd-border px-4 py-2 text-[11px] text-fd-muted-foreground">
          Zeilennummern entsprechen dem Stand des Knowledge-Graphen; der im Text genannte Bereich stammt vom Prüfstand der
          Inventare und kann abweichen.
        </p>
      )}
    </dialog>
  );
}

/**
 * Evidence block for one DSFA section: every claim of the section that rests on code, with its
 * status and the places in the repositories that carry it. Rendered by the content sync.
 */
export function Evidence({ chapter, slugs }: { chapter: string; slugs: string[] }) {
  const [open, setOpen] = useState<{ entry: Entry; ref: EvidenceRef } | null>(null);
  const items = slugs.map((s) => entries.get(s)).filter((e): e is Entry => Boolean(e));
  if (!items.length) return null;

  return (
    <details className="my-6 rounded-lg border border-fd-border bg-fd-card not-prose" data-evidence-chapter={chapter}>
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Belege aus dem Code — Abschnitt {chapter}{' '}
        <span className="ml-1 rounded-full bg-fd-muted px-2 py-0.5 text-xs text-fd-muted-foreground">{items.length}</span>
      </summary>
      <ol className="m-0 list-none divide-y divide-fd-border p-0">
        {items.map((e) => {
          const st = STATUS[e.status] ?? { label: e.status, className: 'bg-fd-muted text-fd-muted-foreground', hint: '' };
          return (
            <li key={e.slug} id={`ev-${e.slug}`} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`} title={st.hint}>
                  {st.label}
                </span>
                <p className="m-0 flex-1 min-w-[16rem]">{e.claim}</p>
              </div>
              <ul className="m-0 mt-2 list-none space-y-1 p-0 pl-1">
                {e.evidence.map((ref, i) => {
                  const gh = githubUrl(ref);
                  const range = parseLines(ref.lines);
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-fd-muted-foreground">
                      <span className="break-all">
                        {ref.repo}/{ref.path}
                        {range ? `:${range.from}${range.to !== range.from ? `–${range.to}` : ''}` : ''}
                      </span>
                      <span className="flex gap-2 font-sans">
                        {uaDashboards[ref.repo] && (
                          <button
                            type="button"
                            onClick={() => setOpen({ entry: e, ref })}
                            className="rounded border border-fd-border px-1.5 py-0.5 text-[11px] hover:bg-fd-accent"
                          >
                            Code anzeigen
                          </button>
                        )}
                        {gh && (
                          <a href={gh} target="_blank" rel="noreferrer" className="text-[11px] text-fd-primary underline-offset-2 hover:underline">
                            GitHub
                          </a>
                        )}
                        {ref.note && <span className="text-[11px]">{ref.note}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
      {open && <CodeViewer entry={open.entry} evidenceRef={open.ref} onClose={() => setOpen(null)} />}
    </details>
  );
}
