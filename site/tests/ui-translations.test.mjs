import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import keys from '../node_modules/fumadocs-ui/dist/.translations/keys.js';
test('installed Fumadocs UI keys have complete German and English translations',()=>{
 const labels=JSON.parse(readFileSync(new URL('../lib/ui-translations.json',import.meta.url),'utf8'));
 for(const locale of ['de','en']) for(const key of keys) assert.ok(labels[locale][key],`${locale} missing ${key}`);
 assert.equal(labels.de['Search(search trigger)'],'Suchen');
 assert.equal(labels.de['On this page(table of contents)'],'Auf dieser Seite');
 assert.ok(labels.de['Read {url}, I want to ask questions about it.(page actions)'].includes('{url}'));
});
