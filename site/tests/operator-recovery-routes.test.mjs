import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const config = JSON.parse(read('docs.json'));
const setup = config.navigation.tabs.find((tab) => tab.tab === 'ORISO Platform Setup');
const routes = [
  'oriso-platform/overview',
  'oriso-platform/configure-keycloak',
  'oriso-platform/setup-databases',
  'oriso-platform/deploy-backend-services',
  'oriso-platform/post-deployment',
  'oriso-platform/backup-configuration',
];
const obsoleteCommand = /sslRequired\s*=\s*NONE|configure-(?:keycloak-http|http-access)\.sh|00-master-setup\.sh|ORISO-Database\/scripts\/(?:backup|restore)|ORISO-Kubernetes\/helm|oriso-platform-mariadb|api\.oriso-dev\.site/i;

test('current setup links use the maintained entry points and keep old routes in the archive', () => {
  const current = setup.groups.filter(({ group }) => group !== 'Archive').flatMap(({ pages }) => pages);
  const archive = setup.groups.find(({ group }) => group === 'Archive')?.pages ?? [];
  for (const route of routes) assert.ok(current.includes(route), route);
  for (const route of ['deploy-infrastructure', 'initial-setup', 'quick-reference', 'troubleshooting'].map((page) => 'oriso-platform/' + page)) {
    assert.ok(archive.includes(route), route);
    assert.ok(!current.includes(route), route);
  }
});

test('maintained setup instructions in both languages exclude retired commands', () => {
  const current = setup.groups.filter(({ group }) => group !== 'Archive').flatMap(({ pages }) => pages);
  for (const prefix of ['', 'site/translations/de/', 'site/translations/en/']) {
    for (const route of [...current.map((id) => id + '.mdx'), 'docs/platform/troubleshooting.md']) {
      const file = prefix + route;
      assert.doesNotMatch(read(file), obsoleteCommand, file);
    }
  }
});

test('the localized database and identity guides name the migration and TLS sources', () => {
  for (const prefix of ['', 'site/translations/de/', 'site/translations/en/']) {
    const database = read(prefix + 'oriso-platform/setup-databases.mdx');
    for (const service of ['user', 'tenant', 'agency', 'consultingtype']) {
      assert.ok(database.includes(`${service}service-master.xml`), prefix + service);
    }
    assert.match(database, /global\.enableLiquibase/);
    assert.match(database, /mariadb-isolated-restore\.md/);
    const keycloak = read(prefix + 'oriso-platform/configure-keycloak.mdx');
    assert.match(keycloak, /https:\/\/[^/\s]+\/auth\/realms\//);
    assert.match(keycloak, /\.well-known\/openid-configuration/);
  }
});
