'use client';
import { basePath } from '@/lib/shared';
import { switchHref, translationUsable } from '@/lib/locale-router.mjs';
type State = {available:boolean; translationState:string; sectionAliases?:Record<string,string>};
export function LocaleSwitch({page,lang}: {page:{route:string;locales:Record<string,State>};lang:string}) {
 const target = lang === 'de' ? 'en' : 'de';
 const available = translationUsable(page.locales[target]);
 return <nav aria-label={lang === 'de' ? 'Sprache' : 'Language'} className="my-3 flex gap-3">
  <span>{lang === 'de' ? 'Deutsch' : 'English'}</span>
  {available ? <a href={`${basePath}${switchHref(page,lang,target)}`} onClick={event => {event.preventDefault();window.location.assign(basePath + switchHref(page,lang,target,window.location.hash));}}>{target === 'de' ? 'Deutsch' : 'English'}</a> : <span aria-disabled="true">{target === 'de' ? 'Deutsch (Übersetzung fehlt/veraltet)' : 'English (translation missing/outdated)'}</span>}
 </nav>;
}
