import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyRedirects,nginxRedirectMap} from './redirect-map.mjs';
test('exact broken md address and legacy article route map to German article',()=>{
 const pages=[{route:'',aliases:[]},{route:'plattform/core-systems/authentication-and-keycloak',aliases:['plattform/platform-flows/local-development/authentication-and-keycloak.md']}];
 const routes=legacyRedirects(pages);
 assert.equal(routes['/'],'/de/');
 assert.equal(routes['/plattform/platform-flows/local-development/authentication-and-keycloak.md'],'/de/plattform/core-systems/authentication-and-keycloak/');
 assert.ok(nginxRedirectMap(pages).includes('map $uri $oriso_docs_redirect'));
 assert.throws(()=>legacyRedirects([{route:'x',aliases:['bad"; return 200;']}]),/Unsafe/);
 assert.throws(()=>legacyRedirects([{route:'x',aliases:['old']},{route:'y',aliases:['old']}]),/Ambiguous/);
});
