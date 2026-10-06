'use client';
import {useEffect} from 'react';
/** Preserve canonical source fragments even when translated heading text changes. */
export function SectionAliases({aliases}: {aliases:Record<string,string>}) {
 useEffect(() => {
  const inserted: HTMLElement[]=[];
  for (const [localized,canonical] of Object.entries(aliases)) {
   if (localized===canonical || document.getElementById(canonical)) continue;
   const heading=document.getElementById(localized);
   if (!heading) continue;
   const anchor=document.createElement('span');anchor.id=canonical;anchor.setAttribute('aria-hidden','true');
   heading.before(anchor);inserted.push(anchor);
  }
  const fragment=decodeURIComponent(window.location.hash.slice(1));
  if(fragment) document.getElementById(fragment)?.scrollIntoView();
  return () => inserted.forEach(anchor=>anchor.remove());
 },[aliases]);
 return null;
}
