import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyFilePath, specBasename } from '../lib/classify.mjs';

test('classifyFilePath: api/*.yaml is own', () => {
	assert.equal(classifyFilePath('api/userservice.yaml'), 'own');
});

test('classifyFilePath: a nested api/ segment is still own (Keycloak vendored SPI)', () => {
	assert.equal(classifyFilePath('keycloak-image/otp-config-spi/api/keycloakextension.yaml'), 'own');
});

test('classifyFilePath: services/*.yaml is consumed', () => {
	assert.equal(classifyFilePath('services/tenantadminservice.yaml'), 'consumed');
});

test('classifyFilePath: a spec under api/ counts as own even when its basename names ANOTHER service (fixture-verified: ORISO-UserService bundles api/appointmentservice.yaml)', () => {
	assert.equal(classifyFilePath('api/appointmentservice.yaml'), 'own');
});

test('classifyFilePath: neither api/ nor services/ segment -> unknown', () => {
	assert.equal(classifyFilePath('src/main/java/Foo.java'), 'unknown');
});

test('classifyFilePath: null/undefined filePath -> unknown, never throws', () => {
	assert.equal(classifyFilePath(null), 'unknown');
	assert.equal(classifyFilePath(undefined), 'unknown');
});

test('specBasename: strips directory and .yaml extension, lower-cases', () => {
	assert.equal(specBasename('services/TenantAdminService.YAML'), 'tenantadminservice');
});

test('specBasename: .yml extension is also stripped', () => {
	assert.equal(specBasename('api/applicationsettingsservice.yml'), 'applicationsettingsservice');
});

test('specBasename: deep path (Keycloak vendored SPI)', () => {
	assert.equal(specBasename('keycloak-image/otp-config-spi/api/keycloakextension.yaml'), 'keycloakextension');
});

test('specBasename: empty/missing filePath -> empty string', () => {
	assert.equal(specBasename(''), '');
	assert.equal(specBasename(null), '');
});
