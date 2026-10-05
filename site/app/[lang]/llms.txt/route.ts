import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET(_req: Request, {params}: {params: Promise<{lang:string}>}) {
  const {lang} = await params;
  return new Response(source.getPages(lang).map(page => `- [${page.data.title}](${page.url})`).join('\n'));
}

export function generateStaticParams() { return ['de','en'].map(lang => ({lang})); }
