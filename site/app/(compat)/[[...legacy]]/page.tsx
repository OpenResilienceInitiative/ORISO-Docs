import {pageIndex as index} from '@/lib/page-index';
import {basePath} from '@/lib/shared';
import {notFound} from 'next/navigation';
import {CompatRedirect} from '@/components/compat-redirect';
export default async function Page({params}: {params:Promise<{legacy?:string[]}>}) {
 const {legacy} = await params;
 const route=(legacy ?? []).join('/');
 const page=index.pages.find(page => page.route===route || page.aliases.includes(route));
 if (!page) notFound();
 const destination=`${basePath}/de${page.route ? '/' + page.route : ''}`;
 return <CompatRedirect destination={destination} />;
}
export function generateStaticParams() {
 return [...new Set(index.pages.flatMap(page => [page.route,...page.aliases]))].filter(route => route!=='de' && route!=='en' && !route.startsWith('de/') && !route.startsWith('en/')).map(route => ({legacy:route ? route.split('/') : []}));
}
