---
title: ORISO-Keycloak Enriched Graph Summary
description: Direct realm/config/script/SPI inspection and graph-backed summary for ORISO-Keycloak.
---

# ORISO-Keycloak Enriched Graph Summary

## Platform Navigation

- [Overview](../overview.md)
- [Repository map](../repository-map.md)
- [Architecture](../architecture.md)
- [Authentication and Keycloak](../authentication-and-keycloak.md)
- [Database and data model](../database-and-data-model.md)
- [Kubernetes deployment](../kubernetes-deployment.md)
- [Frontend/Admin overview](../frontend-admin-overview.md)
- [Backend services](../backend-services.md)
- [Tenant lifecycle](../tenant-lifecycle.md)
- [User management flow](../user-management-flow.md)
- [Local development](../local-development.md)
- [Onboarding guide](../onboarding-guide.md)
- [Troubleshooting](../troubleshooting.md)
- [Graph validation report](../graph-validation-report.md)
- [Diagrams](../diagrams.md)

## Repository Purpose

Identity and access management repository for the ORISO platform. It owns three things: the `online-beratung` realm definition (`realm.json`, now Helm-templated), the custom ORISO Keycloak image (stock Keycloak 26.6.3 plus the vendored otp-config 2FA SPI and the generated `oriso` email theme under `keycloak-image/`), and operational scripts (2FA flow application, email-theme sync, HTTP-access configuration, realm backup). Legacy raw Kubernetes manifests remain for reference; current deployments consume the published image via the ORISO-Helm chart.

Note: this repo has historically diverged from the operator's (Neusta) branch; everything on this page describes this repo at the pinned commit only.

## Main Technologies

Keycloak 26.6.3 (custom image; legacy manifests still reference 20.0.5), Java 21 / Maven (otp-config SPI, ported from Keycloak 22 upstream), FreeMarker email templates, OpenID Connect / OAuth2, kcadm shell scripts, GitHub Actions image CI (ghcr.io), Kubernetes manifests (legacy).

## Important Files and Modules

- realm.json — Helm-templated realm export: clients, roles, custom auth flows, `emailTheme: oriso`, `directGrantFlow: direct-grant-2fa`
- keycloak-image/Dockerfile — multi-stage build: Maven SPI build → SPI jar into `/opt/keycloak/providers` + themes → `kc.sh build`
- keycloak-image/otp-config-spi/ — vendored onlineberatung-keycloak-otp SPI (REST endpoints + direct-grant authenticators + MAIL_OTP credential provider), 53+ unit tests
- keycloak-image/themes/oriso/email/ — generated email theme (otp-email, password-reset; de/en bundles; overridable `oriso*` theme properties)
- scripts/keycloak-apply-2fa-flow.sh — idempotent kcadm script applying `direct-grant-2fa` to an existing realm
- scripts/sync-email-theme.sh — copies the generated theme from ORISO-Frontend `src/emails/dist/keycloak/email`
- configure-http-access.sh — disables the SSL requirement after deployment (nginx terminates TLS)
- backup/realm-backup.sh — timestamped realm export from the running pod
- keycloak-deployment.yaml / keycloak-service.yaml / ingress.yaml — legacy manifests (Keycloak 20.0.5, start-dev)
- README.md / DEPLOYMENT.md / STATUS.md — docs; STATUS.md and DEPLOYMENT.md describe the old single-node setup

## Realm Structure

- Realm: online-beratung
- SSL required: external in the export; `configure-http-access.sh` sets it to NONE on live deployments
- Enabled required actions: CONFIGURE_TOTP, UPDATE_PASSWORD, UPDATE_PROFILE, VERIFY_EMAIL
- Email theme: `oriso`
- Direct Grant Flow binding: `direct-grant-2fa` (custom)
- Custom auth flows: `direct-grant-2fa` → validate-username, validate-password, `app-otp-conditional` (conditional-user-configured, app-authenticator, direct-grant-validate-otp), `email-otp-conditional` (conditional-user-configured, email-authenticator with `email-otp-config`)
- Redirect URIs / web origins are Helm placeholders (`{{ .Values.global.keycloakAuthServerUrl }}`, `{{ .Values.global.adminDomainName }}`) — the file must be rendered before a raw import
- Groups: none. Identity providers: none.

## Clients

| Client | Public | Bearer only | Standard flow | Direct grant | Redirect URI count | Web origin count |
| --- | --- | --- | --- | --- | --- | --- |
| account | true | false | true | false | 1 | 1 |
| account-console | true | false | true | false | 1 | 1 |
| admin-cli | true | false | false | true | 0 | 1 |
| app | true | false | true | true | 2 | 2 |
| broker | false | true | true | false | 0 | 1 |
| realm-management | false | true | true | false | 0 | 1 |
| security-admin-console | true | false | true | false | 1 | 2 |
| user-service | false | false | false | false | 1 | 0 |

`user-service` is new since July: confidential client with service accounts enabled and a placeholder secret (`user-service-secret`) committed in the export.

## Roles

- TECHNICAL_DEFAULT
- USER_ADMIN
- agency-admin
- consultant
- default-roles-online-beratung
- offline_access
- restricted-agency-admin (added June 2026, assigned during agency-admin creation)
- single-tenant-admin
- technical (required by the otp-config SPI's REST endpoints)
- tenant-admin
- topic-admin
- uma_authorization
- user
- user-admin

No `global-support` role exists in this repo's realm export at the pinned commit; if it exists elsewhere it lives on the operator's diverged branch.

## Custom Image and OTP SPI (ADR-013)

- Image: `ghcr.io/openresilienceinitiative/oriso-keycloak:26.6.3-otp`, plus `dev`/`pre-dev` branch tags and `release/keycloak-*` release tags. The ORISO-Helm chart references the published image only.
- SPI provenance: vendored from Onlineberatung/onlineberatung-keycloak-otp at `fbafb2b` (AGPL), ported to Keycloak 26.6.3 (pom bump, `SubjectCredentialManager.removeStoredCredentialById` replaces the removed `CredentialHelper.deleteOTPCredential`).
- REST endpoints `GET/PUT/POST/DELETE /realms/<realm>/otp-config/**` back the UserService 2FA operations (fetch-otp-setup-info, setup-otp, delete-otp, send-verification-mail, setup-otp-mail); callers need a bearer token with the realm role `technical`.
- July 2026 fix for email OTP "code not matching": the MAIL_OTP CredentialProviderFactory was never registered as an SPI, so the verify hop found no credential. Fix registers it, purges pending unverified credentials on resend, deletes all mail OTP credentials on teardown, and defers email persistence via a UserModelDelegate until the OTP is verified.
- Email theme: generated from the ORISO-Frontend email design system (`npm run emails:keycloak`) and synced via `scripts/sync-email-theme.sh`; theme lookups carry their own defaults so operators can override any `oriso*` property per realm. A twin copy of the theme lives in ORISO-Helm and must be kept in sync.

## Architecture Summary

Frontend and Admin authenticate against the `online-beratung` realm (public `app` client, authorization code + PKCE, plus direct grant for the login form). The password grant runs through the custom `direct-grant-2fa` flow: users with a configured second factor are challenged via app TOTP (app-authenticator + stock validate-otp) or email OTP (email-authenticator, code sent through the realm's SMTP settings using the `oriso` theme). The UserService manages 2FA enrollment through the SPI's otp-config REST endpoints using its technical service user. Backend services validate bearer tokens and map realm roles into service-specific authorities; tenantId claim mapping is still to be verified against realm mappers and backend code.

## ORISO Dependencies

- ORISO-Helm — canonical deployment path; its keycloak chart consumes the published image, carries its own copy of realm.json and the email theme (sync required).
- ORISO-UserService — sole caller of the otp-config REST endpoints (2FA setup) and owner of the `technical` service user; also the `user-service` confidential client.
- ORISO-Frontend — source of the generated email theme (`src/emails`, `npm run emails:keycloak`; ADR-020 email design system) and consumer of the `otpType` challenge JSON during direct-grant login.
- ORISO-Admin — authenticates against the realm via Helm-templated admin-domain web origins.

## Local Development Notes

- Render or substitute the Helm placeholders in realm.json before importing into a local Keycloak; verify app/admin redirect URLs and backend issuer/JWK URLs for local hostnames.
- Build the image locally: `docker build -t ghcr.io/openresilienceinitiative/oriso-keycloak:26.6.3-otp keycloak-image/`.
- SPI unit tests: `mvn test` in `keycloak-image/otp-config-spi` (Java 21; resteasy-core is a test-scope addition because Keycloak ≥ 24 drops the transitive JAX-RS RuntimeDelegate).
- After changing email copy/design, regenerate in ORISO-Frontend and run `scripts/sync-email-theme.sh` — theme files are generated, do not edit by hand.

## Deployment Notes

- Current path: ORISO-Helm chart with the ghcr image. CI builds on feature/PR/main workflows; `release/keycloak-*` branches trigger the release-image workflow.
- Fresh realm imports get `direct-grant-2fa` and `emailTheme: oriso` from realm.json; existing realms need `scripts/keycloak-apply-2fa-flow.sh` (kubectl exec into the pod, admin credentials via KC_ADMIN_USER/PASSWORD).
- `configure-http-access.sh` must run after every fresh deployment where nginx terminates TLS, or logins fail with "HTTPS required".
- keycloak-deployment.yaml / keycloak-service.yaml / ingress.yaml are legacy (20.0.5, start-dev, hostNetwork) and should not be used for new deployments.

## Risks and Gaps

- Legacy manifests commit inline admin credentials (KEYCLOAK_ADMIN/KEYCLOAK_ADMIN_PASSWORD = admin/admin) and run start-dev; they contradict the current image and should be retired or clearly quarantined.
- realm.json commits a placeholder client secret for `user-service` (`user-service-secret`); real secrets must be injected at deploy time.
- STATUS.md (last updated 2025-10-31) and parts of README/DEPLOYMENT.md still describe Keycloak 20.0.5 and the old single-node HTTP setup; README references a `.github/workflows/keycloak-image.yml` that is now split into ci-*/release-image workflows.
- The email theme exists in two repos (here and ORISO-Helm); drift means one copy silently wins at deploy time.
- The `app` client keeps `*` in web origins alongside the templated admin domain; production review of redirect/origin breadth is still open.
- MemoryOtpService keeps issued email OTPs in memory — multi-replica Keycloak would break email OTP validation unless sessions are sticky or replicas stay at 1.

## Needs Verification

- Whether the live pre-dev/prod realms match this repo's realm.json (historical divergence from the operator's branch; e.g. a global-support role is not present here).
- Exact tenantId claim mapper/source for backend token validation.
- Whether frontend and admin should share the `app` client or split clients.
- Which realm.json actually wins at deploy time (this repo's vs the copy in ORISO-Helm) and whether the two are in sync at the pinned commits.
