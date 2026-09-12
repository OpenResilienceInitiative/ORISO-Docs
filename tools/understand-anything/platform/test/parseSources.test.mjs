import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	parseSpringControllerFile,
	isSpringControllerSource,
	parseAdminEndpointConstants,
	parseAdminInlineUrlHelpers,
	parseAdminCallerFile,
	resolveIndirectUrlValue
} from '../lib/parseSources.mjs';

// ---------------------------------------------------------------------------
// Spring @RestController endpoint extraction
// ---------------------------------------------------------------------------

test('parseSpringControllerFile: class base path + bare method path', () => {
	const src = `
package x;
@RestController
@RequestMapping("/version")
public class VersionController {
  @GetMapping
  public String version() { return "1"; }

  @GetMapping("/info")
  public String info() { return "1"; }
}
`;
	const candidates = parseSpringControllerFile(src, 'VersionController.java');
	assert.deepEqual(
		candidates.map((c) => `${c.method} ${c.path}`).sort(),
		['GET /version', 'GET /version/info']
	);
	assert.equal(candidates[0].className, 'VersionController');
});

test('parseSpringControllerFile: array of method-level paths, no class base', () => {
	const src = `
package x;
@RestController
public class ErrorReportController {
  @PostMapping({"", "/service"})
  public void report() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'ErrorReportController.java');
	// both raw variants strip /service and normalize to "/" — deduped to one.
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].method, 'POST');
	assert.equal(candidates[0].path, '/');
	assert.equal(candidates[0].methodName, 'report');
});

test('parseSpringControllerFile: value= keyword arg with an inline path-variable brace', () => {
	// The path literal itself contains "{adminId}" — a naive `\\{[^}]*\\}`
	// regex would truncate at that inner "}" and lose the /service variant
	// entirely (this reproduces a real UserAdminController.java shape).
	const src = `
package x;
@RestController
public class UserAdminController {
  @PostMapping(
      value = {
        "/useradmin/admins/{adminId}/grant-consultant-identity",
        "/service/useradmin/admins/{adminId}/grant-consultant-identity"
      },
      produces = "application/hal+json",
      consumes = "application/json")
  public ResponseEntity<Foo> grantConsultantIdentity(@PathVariable String adminId) {
    return null;
  }
}
`;
	const candidates = parseSpringControllerFile(src, 'UserAdminController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].method, 'POST');
	assert.equal(candidates[0].path, '/useradmin/admins/{adminId}/grant-consultant-identity');
	assert.equal(candidates[0].methodName, 'grantConsultantIdentity');
});

test('parseSpringControllerFile: path= keyword arg (single string)', () => {
	const src = `
package x;
@RestController
public class FooController {
  @GetMapping(path = "/foo/bar")
  public void foo() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'FooController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].path, '/foo/bar');
	assert.equal(candidates[0].method, 'GET');
});

test('parseSpringControllerFile: RequestMethod.POST via @RequestMapping', () => {
	const src = `
package x;
@RestController
@RequestMapping("/settingsadmin/dpa-signing-emails")
public class DpaSigningEmailController {
  @RequestMapping(method = RequestMethod.POST)
  public void send() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'DpaSigningEmailController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].method, 'POST');
	assert.equal(candidates[0].path, '/settingsadmin/dpa-signing-emails');
});

test('parseSpringControllerFile: /service duplicate collapses to the canonical non-/service path', () => {
	const src = `
package x;
@RestController
public class CaseHandoverController {
  @GetMapping({"/users/case-handover/reasons", "/service/users/case-handover/reasons"})
  public void listReasons() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'CaseHandoverController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].path, '/users/case-handover/reasons');
});

test('parseSpringControllerFile: fully-qualified annotation name is still recognized', () => {
	const src = `
package x;
@RestController
public class UserController {
  @org.springframework.web.bind.annotation.PostMapping("/users/magic-link/request")
  public void requestMagicLink() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'UserController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].method, 'POST');
	assert.equal(candidates[0].path, '/users/magic-link/request');
	assert.equal(candidates[0].methodName, 'requestMagicLink');
});

test('parseSpringControllerFile: property-placeholder-only mapping is skipped, not treated as base-path-only', () => {
	const src = `
package x;
@Controller
public class CustomSwaggerUIController {
  @Value("\${springfox.docuPath}")
  private String docuPath;

  @RequestMapping(value = "\${springfox.docuPath}")
  public String index() { return "redirect"; }
}
`;
	const candidates = parseSpringControllerFile(src, 'CustomSwaggerUIController.java');
	assert.equal(candidates.length, 0);
});

test('parseSpringControllerFile: non-controller class yields no candidates', () => {
	const src = `
package x;
@Service
public class SomeService {
  public void doThing() {}
}
`;
	assert.equal(isSpringControllerSource(src), false);
	assert.deepEqual(parseSpringControllerFile(src, 'SomeService.java'), []);
});

test('parseSpringControllerFile: @RequestMapping({"/a","/b"}) class base cross-multiplies with method path', () => {
	const src = `
package x;
@RestController
@RequestMapping({"/matrix", "/service/matrix"})
public class MatrixMessageController {
  @GetMapping("/me/token")
  public void meToken() {}
}
`;
	const candidates = parseSpringControllerFile(src, 'MatrixMessageController.java');
	assert.equal(candidates.length, 1);
	assert.equal(candidates[0].path, '/matrix/me/token');
	assert.equal(candidates[0].method, 'GET');
});

// ---------------------------------------------------------------------------
// Admin appConfig / inline-helper / caller-file parsing widening
// ---------------------------------------------------------------------------

test('parseAdminEndpointConstants: no longer requires "endpoint" in the constant name', () => {
	const src = `export const twoFactorAuth = \`\${userServiceURL}/service/users/2fa\`;`;
	const { entries } = parseAdminEndpointConstants(src);
	assert.equal(entries.length, 1);
	assert.equal(entries[0].key, 'twoFactorAuth');
	assert.equal(entries[0].originVar, 'userServiceURL');
});

test('parseAdminCallerFile: template-literal url (not just a bare identifier) resolves', () => {
	const src = `
export const sendInvite = (id) =>
  fetchData({
    url: \`\${accountInvitesEndpoint}/\${id}/send\`,
    method: FETCH_METHODS.POST
  });
`;
	const callers = parseAdminCallerFile(src);
	assert.equal(callers.length, 1);
	assert.equal(callers[0].urlIdentifier, 'accountInvitesEndpoint');
	assert.equal(callers[0].method, 'POST');
});

test('parseAdminInlineUrlHelpers + resolveIndirectUrlValue: file-local helper chained through an appConfig constant', () => {
	const knownByKey = new Map([
		['publicAccountInvitesEndpoint', { originVar: 'userServiceURL', path: '/users/account-invites' }]
	]);
	const src = `
const onboardingUrl = (inviteToken, suffix = '') =>
  \`\${publicAccountInvitesEndpoint}/\${encodeURIComponent(inviteToken)}/onboarding\${suffix}\`;
`;
	const helpers = parseAdminInlineUrlHelpers(src, knownByKey);
	assert.equal(helpers.length, 1);
	assert.equal(helpers[0].name, 'onboardingUrl');
	assert.equal(helpers[0].originVar, 'userServiceURL');
	assert.equal(helpers[0].path, '/users/account-invites/{*}/onboarding{*}');
});

test('resolveIndirectUrlValue: returns null when the referenced identifier is unknown', () => {
	const result = resolveIndirectUrlValue('`${someUnrelatedThing}/x`', new Map());
	assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// Widened caller scan (D): chained local helpers, inline origin+path template
// literals in callers outside src/api/**
// ---------------------------------------------------------------------------

test('parseAdminInlineUrlHelpers: resolves a helper chained through ANOTHER file-local helper (two hops), not just an appConfig constant', () => {
	const src = `
const baseUrl = () => \`\${userServiceURL}/service/users/account-invites\`;
const onboardingUrl = (inviteToken) => \`\${baseUrl}/\${inviteToken}/onboarding\`;
`;
	const helpers = parseAdminInlineUrlHelpers(src, new Map());
	const byName = new Map(helpers.map((h) => [h.name, h]));
	assert.equal(byName.get('baseUrl').originVar, 'userServiceURL');
	assert.ok(byName.has('onboardingUrl'), 'onboardingUrl should resolve through baseUrl');
	assert.equal(byName.get('onboardingUrl').originVar, 'userServiceURL');
	assert.equal(byName.get('onboardingUrl').path, '/service/users/account-invites/{*}/onboarding');
});

test('parseAdminCallerFile: recognizes an inline url that embeds both the origin variable AND the path literal directly (no appConfig constant or local helper at all)', () => {
	const src = `
export const fetchAgencyData = (agencyId) =>
  fetchData({
    url: \`\${agencyServiceURL}/service/agencies/\${agencyId}\`,
    method: FETCH_METHODS.GET
  });
`;
	const callers = parseAdminCallerFile(src);
	assert.equal(callers.length, 1);
	assert.equal(callers[0].urlIdentifier, null);
	assert.ok(callers[0].inline);
	assert.equal(callers[0].inline.originVar, 'agencyServiceURL');
	assert.equal(callers[0].inline.path, '/service/agencies/{*}');
	assert.equal(callers[0].method, 'GET');
});

// ---------------------------------------------------------------------------
// Admin base-constant + suffix concatenation (Problem 1, part c fix)
// ---------------------------------------------------------------------------

test('parseAdminCallerFile: returns the raw urlExpr alongside urlIdentifier, so a caller-side suffix after the appConfig interpolation is not lost', () => {
	const src = `
export const getTenantPermissionPolicies = (tenantId: string) =>
	fetchData({
		url: \`\${tenantAdminEndpoint}/\${tenantId}/permission-policies\`,
		method: FETCH_METHODS.GET,
	});
`;
	const callers = parseAdminCallerFile(src);
	assert.equal(callers.length, 1);
	assert.equal(callers[0].urlIdentifier, 'tenantAdminEndpoint');
	assert.ok(callers[0].urlExpr.includes('permission-policies'));
});

test('resolveIndirectUrlValue: splices a real caller suffix onto the appConfig base path (real case: getTenantPermissionPolicies)', () => {
	const known = new Map([['tenantAdminEndpoint', { originVar: 'tenantServiceURL', path: '/tenantadmin' }]]);
	const expr = '`${tenantAdminEndpoint}/${tenantId}/permission-policies`';
	const result = resolveIndirectUrlValue(expr, known);
	assert.ok(result);
	assert.equal(result.originVar, 'tenantServiceURL');
	assert.equal(result.path, '/tenantadmin/{*}/permission-policies');
});

test('resolveIndirectUrlValue: splices a bare literal suffix with no further interpolation (real case: getConsultingType4Tenant\'s "/basic")', () => {
	const known = new Map([['consultingTypeEndpoint', { originVar: 'consultingTypeServiceURL', path: '/consultingtypes' }]]);
	const result = resolveIndirectUrlValue('`${consultingTypeEndpoint}/basic`', known);
	assert.ok(result);
	assert.equal(result.path, '/consultingtypes/basic');
});

test('resolveIndirectUrlValue: still resolves when the suffix spans multiple lines (real case: useTenantsData\'s multi-line query string) — regression test for a `.` vs `\\n` bug in the splice regex', () => {
	const known = new Map([['tenantAdminEndpoint', { originVar: 'tenantServiceURL', path: '/tenantadmin' }]]);
	const expr = '`${tenantAdminEndpoint}/search?page=${page || 1}&perPage=${perPage}&query=${tenantSearchQuery(\n                    search,\n                )}&field=${sort}&order=${dir}`';
	const result = resolveIndirectUrlValue(expr, known);
	assert.ok(result, 'expected the splice to succeed across the embedded newlines');
	assert.ok(result.path.startsWith('/tenantadmin/search'));
});
