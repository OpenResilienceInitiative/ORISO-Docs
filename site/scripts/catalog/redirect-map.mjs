export function legacyRedirects(pages) {
 const result=new Map();
 for(const page of pages) {
  const destination='/de'+(page.route?'/'+page.route:'')+'/';
  for(const alias of [page.route,...page.aliases]) {
   const path='/'+alias.replace(/^\/+|\/+$/g,'');
   if(/[^a-zA-Z0-9_./%~-]/.test(path) || path.split('/').includes('..')) throw Error('Unsafe legacy route');
   if(path==='/de' || path.startsWith('/de/') || path==='/en' || path.startsWith('/en/')) continue;
   for(const variant of new Set([path,path==='/'?path:path+'/'])) {
    if(result.has(variant) && result.get(variant)!==destination) throw Error(`Ambiguous legacy route: ${variant}`);
    result.set(variant,destination);
   }
  }
 }
 return Object.fromEntries([...result].sort(([a],[b])=>a.localeCompare(b,'en')));
}
export function nginxRedirectMap(pages) {
 const redirects=legacyRedirects(pages);
 return '# Generated compatibility redirects; include in nginx http context.\nmap $uri $oriso_docs_redirect {\n    default "";\n'+Object.entries(redirects).map(([from,to])=>`    "${from}" "${to}";`).join('\n')+'\n}\n';
}
