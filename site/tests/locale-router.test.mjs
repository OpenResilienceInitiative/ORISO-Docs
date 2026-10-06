import test from 'node:test';
import assert from 'node:assert/strict';
import { localeHref, switchHref, translationUsable } from '../lib/locale-router.mjs';
test('locale page routing and stable section identity', () => {
 const page={route:'technical/setup',locales:{de:{available:true,translationState:'current',sectionAliases:{einrichtung:'setup'}},en:{available:true,translationState:'current',sectionAliases:{setup:'setup'}}}};
 assert.equal(localeHref('de',page.route),'/de/technical/setup');
 assert.equal(switchHref(page,'de','en','#einrichtung'),'/en/technical/setup#setup');
});
test('missing and stale translations cannot be advertised as usable',()=>{
 assert.equal(translationUsable({available:false,translationState:'missing'}),false);
 assert.equal(translationUsable({available:true,translationState:'stale'}),false);
});
