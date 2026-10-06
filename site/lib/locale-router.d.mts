export function localeHref(locale: string, route?: string): string;
export function translationUsable(state: {available: boolean; translationState: string} | undefined): boolean;
export function switchHref(page: {route:string; locales: Record<string,{sectionAliases?:Record<string,string>}>}, from:string,to:string,hash?:string):string;
