'use client';
import {usePathname} from 'next/navigation';
import {pageIndex as index} from '@/lib/page-index';
import {LocaleSwitch} from './locale-switch';
export function NavbarLocale({lang}: {lang:string}) {
 const pathname=usePathname();
 const route=pathname.replace(/^\/(de|en)(\/|$)/,'').replace(/\/$/,'');
 const page=index.pages.find(page=>page.route===route);
 return page ? <LocaleSwitch page={page} lang={lang}/> : null;
}
