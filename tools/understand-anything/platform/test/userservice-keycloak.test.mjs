import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKeycloakOtpCallers } from '../lib/parseSources.mjs';
import { loadUserServiceKeycloakCallers } from '../lib/userservice-keycloak.mjs';
import { normalizePath } from '../lib/matcher.mjs';

const FILE = 'src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java';
const JAVA = `
public class KeycloakService {
  private static final String ENDPOINT_OTP_INFO = "/fetch-otp-setup-info/{username}";
  private static final String ENDPOINT_OTP_SETUP = "/setup-otp/{username}";
  private static final String ENDPOINT_OTP_TEARDOWN = "/delete-otp/{username}";
  private static final String ENDPOINT_OTP_FINISH_EMAIL = "/setup-otp-mail/{username}";

  @Override
  public IdentityOtpCredential getOtpCredential(String userName) {
    var requestUrl = getOtpUrl(ENDPOINT_OTP_INFO, userName);
    var response = withFreshAdminTokenOnUnauthorized("otp-fetch",
        () -> keycloakClient.get(keycloakClient.getBearerToken(), requestUrl, OtpInfoDTO.class));
    return null;
  }

  public boolean setUpOtpCredential(String userName, String initialCode, String secret) {
    var requestUrl = getOtpUrl(ENDPOINT_OTP_SETUP, userName);
    withFreshAdminTokenOnUnauthorized("otp-setup",
        () -> keycloakClient.putForEntity(keycloakClient.getBearerToken(), requestUrl, dto, OtpInfoDTO.class));
    return true;
  }

  public void deleteOtpCredential(String userName) {
    var requestUrl = getOtpUrl(ENDPOINT_OTP_TEARDOWN, userName);
    withFreshAdminTokenOnUnauthorized("otp-delete",
        () -> keycloakClient.delete(keycloakClient.getBearerToken(), requestUrl, Void.class));
  }

  public void twoCallsInOneMethod(String u) {
    var a = getOtpUrl(ENDPOINT_OTP_INFO, u);
    var b = getOtpUrl(ENDPOINT_OTP_SETUP, u);
    keycloakClient.get(token, a, X.class);
  }

  public void unknownConstant(String u) {
    var a = getOtpUrl(ENDPOINT_OTP_MISSING, u);
    keycloakClient.get(token, a, X.class);
  }

  public void noVerbHelper(String u) {
    var a = getOtpUrl(ENDPOINT_OTP_INFO, u);
    otherClient.post(a);
  }
}`;

test('parseKeycloakOtpCallers takes the verb from the keycloakClient helper and the path from the constant', () => {
  assert.deepEqual(parseKeycloakOtpCallers(JAVA), [
    { methodName: 'getOtpCredential', method: 'GET', path: '/fetch-otp-setup-info/{username}' },
    { methodName: 'setUpOtpCredential', method: 'PUT', path: '/setup-otp/{username}' },
    { methodName: 'deleteOtpCredential', method: 'DELETE', path: '/delete-otp/{username}' }
  ]);
});

// The platform graph stores endpoint paths already normalized ({x} -> {}), as in backendByRepo.
const endpoint = (method, p) => ({ method, path: normalizePath(p), node: { id: `ORISO-Keycloak::endpoint:spi:${method} ${p}` } });
const KEYCLOAK = [
  endpoint('GET', '/otp-config/fetch-otp-setup-info/{username}'),
  endpoint('PUT', '/otp-config/setup-otp/{username}'),
  endpoint('POST', '/otp-config/setup-otp-mail/{username}')
];
const fn = (name) => ({ id: `function:${FILE}:de.caritas.cob.userservice.api.adapters.keycloak.KeycloakService.${name}`, type: 'function' });
const run = (overrides = {}) => loadUserServiceKeycloakCallers({
  files: [FILE],
  read: (f) => ({ [FILE]: JAVA, 'src/main/resources/application.properties': 'identity.otp-url=${app.base.url}/auth/realms/${keycloak.realm}/otp-config\n' })[f],
  userGraph: { graph: { nodes: [fn('getOtpCredential(String)'), fn('setUpOtpCredential(String,String,String)'), fn('deleteOtpCredential(String)')] } },
  keycloakEndpoints: KEYCLOAK,
  ...overrides
});

test('UserService methods match the SPI endpoints exactly by verb and path; unknown endpoints and unmatched verbs yield nothing', () => {
  const { callers, matches } = run();
  // DELETE /delete-otp has no endpoint node in the fixture, so only GET and PUT produce a call
  assert.deepEqual(matches.map((m) => [m.functionId.split('.').at(-1), m.endpointNode.id.split('endpoint:spi:')[1]]), [
    ['getOtpCredential(String)', 'GET /otp-config/fetch-otp-setup-info/{username}'],
    ['setUpOtpCredential(String,String,String)', 'PUT /otp-config/setup-otp/{username}']
  ]);
  assert.ok(matches.every((m) => m.methodConfidence === 'exact' && m.matchQuality === 'exact' && m.targetRepo === 'ORISO-Keycloak'));
  assert.deepEqual(callers.map((c) => c.sourceRepo), ['ORISO-UserService', 'ORISO-UserService']);
});

test('a method that matches two function nodes (overload) or none is skipped, never guessed', () => {
  const overloaded = run({ userGraph: { graph: { nodes: [fn('getOtpCredential(String)'), fn('getOtpCredential(String,int)')] } } });
  assert.equal(overloaded.matches.length, 0);
  assert.equal(run({ userGraph: { graph: { nodes: [] } } }).matches.length, 0);
});

test('without the otp-url property or a Keycloak endpoint list nothing is emitted', () => {
  assert.equal(run({ read: (f) => (f === FILE ? JAVA : '') }).matches.length, 0);
  assert.equal(run({ keycloakEndpoints: [] }).matches.length, 0);
  assert.equal(run({ files: [] }).matches.length, 0);
});
