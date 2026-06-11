---
title: ORISO-Keycloak Enriched Graph Summary
description: Direct realm/config/script inspection and graph-backed summary for ORISO-Keycloak.
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

Identity and access management repository for the online-beratung realm, OIDC/OAuth2 clients, roles, realm export, backup, and Kubernetes deployment manifests.

## Main Technologies

Keycloak 20.0.5, OpenID Connect, OAuth2, Kubernetes manifests, shell scripts

## Important Files and Modules

- realm.json
- realm.json.backup-http
- keycloak-deployment.yaml
- keycloak-service.yaml
- ingress.yaml
- backup/realm-backup.sh
- configure-http-access.sh
- README.md
- DEPLOYMENT.md
- STATUS.md

## Realm Structure

- Realm: online-beratung
- Enabled: true
- SSL required: external
- Enabled required actions: CONFIGURE_TOTP, UPDATE_PASSWORD, UPDATE_PROFILE, VERIFY_EMAIL
- Groups: None configured
- Identity providers: None configured

## Clients

| Client | Public | Bearer only | Standard flow | Direct grant | Redirect URI count | Web origin count |
| --- | --- | --- | --- | --- | --- | --- |
| account | true | false | true | false | 1 | 0 |
| account-console | true | false | true | false | 1 | 0 |
| admin-cli | true | false | false | true | 0 | 0 |
| app | true | false | true | true | 3 | 2 |
| broker | false | true | true | false | 0 | 0 |
| realm-management | false | true | true | false | 0 | 0 |
| security-admin-console | true | false | true | false | 1 | 1 |

## Roles

- TECHNICAL_DEFAULT
- USER_ADMIN
- agency-admin
- consultant
- default-roles-online-beratung
- offline_access
- single-tenant-admin
- technical
- tenant-admin
- topic-admin
- uma_authorization
- user
- user-admin

## Architecture Summary

Frontend and Admin authenticate through the Keycloak realm and store/refresh tokens in browser helpers. Backend services validate bearer tokens and map realm roles into service-specific authorities. Tenant isolation is documented in graphs through tenantId claim usage, but the exact claim population path requires verification against realm mappers and backend code.

## Local Development Notes

- Import realm.json into local Keycloak.
- Verify app/admin redirect URLs and backend issuer/JWK URLs for the local hostnames.

## Deployment Notes

- keycloak-deployment.yaml, keycloak-service.yaml, ingress.yaml, and ORISO-Kubernetes helm/charts/keycloak.

## Risks and Gaps

- No groups or identity providers are configured in the inspected realm export.
- Wide redirect/web-origin settings and direct grant on the app client need production review.
- Admin credentials and HTTP/dev-mode deployment settings should be managed outside committed files.

## Needs Verification

- Current production realm export vs this repository's realm.json.
- Exact tenantId claim mapper/source.
- Whether frontend and admin should share the same app client or use separate clients.
