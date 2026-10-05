export function localeHref(locale, route = '') { return `/${locale}${route ? '/' + route : ''}`; }
export function translationUsable(state) { return state?.available === true && state.translationState === 'current'; }
export function switchHref(page, from, to, hash = '') {
 const slug = decodeURIComponent(hash.replace(/^#/, ''));
 const stable = page.locales[from]?.sectionAliases?.[slug] ?? slug;
 return localeHref(to, page.route) + (stable ? '#' + encodeURIComponent(stable) : '');
}
