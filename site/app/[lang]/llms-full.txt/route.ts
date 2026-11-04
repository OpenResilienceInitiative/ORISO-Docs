import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET(_req: Request, {params}: {params: Promise<{lang:string}>}) {
  const {lang} = await params;
  const scan = source.getPages(lang).map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}

export function generateStaticParams() { return ['de','en'].map(lang => ({lang})); }
