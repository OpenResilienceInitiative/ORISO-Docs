---
title: ORISO-Admin Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-Admin.
---

# ORISO-Admin Enriched Graph Summary

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

Administrative React dashboard for tenant, agency, counselor, topic, links/invites, settings (theme, legal, SMTP, permissions), legal/DPA management, logs, statistics, and user administration — plus the public tenant-admin onboarding wizard and password-reset flow.

## Main Technologies

- Package: adminpanel 0.1.0
- Stack: React 19, TypeScript, Vite, React Router v7, Ant Design 5 (with `@ant-design/v5-patch-for-react-19`), MUI 9 (Emotion), TanStack React Query v5, i18next, TipTap 2 (rich-text), dayjs, Lottie, OpenTelemetry (web-vitals metrics), Vitest, Storybook (with component tests in CI), Cypress (integration)
- Selected dependencies: antd, @mui/material, @mui/icons-material, @tanstack/react-query, @tiptap/react + extensions, axios, dompurify, react-colorful, react-joyride (product tour), hi-base32 (OTP), lottie-react, react-router-dom, use-debounce, web-vitals, @opentelemetry/sdk-metrics
- Scripts: start (with `prestart` runtime-env generation), build, build:analyze, build:check (bundle budget), serve, storybook, build-storybook, typecheck:storybook, generate:icon-catalog, test (vitest), lint, lint:css, lint:js, lint:formatting, test:integration (cypress open), test:integration:cli

## Important Files and Modules

- package.json, vite.config.ts, vitest.config.ts, vite.authBffPlugin.ts (local dev auth BFF)
- scripts/generate-runtime-env.js — generates `env.js` runtime config (overrides `.env` at container start)
- src/App.tsx, src/appConfig.ts (endpoints + `routePathNames`), src/config/runtimeConfig.ts
- src/pages/lazyPages.ts — lazy route modules; src/router/ProtectedRoute.tsx
- src/pages/Agency (List/Edit with FieldGrid master data, opening hours)
- src/pages/Links — InviteComposer, AccountInvitesTab (+ bulk/CSV import), EmailTemplatesDialog, ExternalInboundsTab
- src/pages/TenantSettings — settings tabs shell (general/master-data/appearance/legal/SMTP/permissions); src/constants/settingsTabs.ts
- src/components/Tenants/LegalSettings — legal editors (imprint/privacy/DPA) incl. DepartmentSelect, LegalContentLanguageSelect, PublishSourceWarningModal, TranslateOnPublishModal
- src/components/FormPluginEditor — TipTap M3 rich-text editor (heading anchors, image upload, tenant media URL resolution)
- src/components/DpaBlocker + src/components/DpaLegalForm + src/hooks/useDpa*.hook.ts — DPA gate, reader, signatures
- src/api/tenant — tenant CRUD plus DPA endpoints (getDpaGate, getDpaStatus, getDpaVersions, publishDpa, signDpaAdmin, createDpaSignInvite, sendDpaInviteEmail, uploadTenantMedia, translation)
- src/pages/TenantOnboarding — public invite-token onboarding wizard (Account → Organisation DPA → 2FA → Done)
- src/pages/Statistic + src/components/StatisticCard + src/components/DashboardEmptyState — statistics dashboard with empty-state hints; tutorial statistics section
- src/pages/Logs — LogsTabsLayout with CaseHandoverLogs, InactiveAccountAuditLogs, SupervisorLogs
- src/pages/users — user management tables (consultants, agency admins, tenant admins, platform admins) and TenantAdminEdit
- src/components/AdminMobileNav + src/components/M3FabMenu — thumb-reachable mobile navigation
- src/theme/antdM3Theme.ts, src/theme/orisoMuiTheme.ts — muted M3 token scheme for both UI libraries
- src/components/TwoFactorSetup — app/email OTP setup (profile + onboarding variants); src/pages/PasswordReset
- src/observability — OpenTelemetry web-vitals metric export
- src/api/fetchData.ts — shared fetch wrapper; per-domain clients under src/api (agency, admins, counselor, user, settings, statistic, invitelinks, accountInvites, tenantOnboarding, passwordReset, idAllocation, tutorial, topic, consultingtype, auth)
- docs/ — mobile-nav redesign plan, statistics dashboard parent task, MUI9/antd inventory, local development; MODERNIZATION-PLAN.md (React 19 migration, executed)

## Architecture Summary

The app is a browser client. It owns routing, token/session storage, runtime configuration, tenant context, permission-derived UI gating, and UI flows. It does not own business data; it calls ORISO backend services through API client modules built on a shared fetch wrapper, with TanStack Query v5 hooks for caching. UI is mid-migration from Ant Design to MUI under a shared muted Material 3 token scheme (antd is still the majority — roughly 179 files vs ~42 MUI files); AntD `Form.Item` remains the form scaffolding during conversion. Public (unauthenticated) surfaces are the tenant-admin onboarding wizard and password reset; everything else sits behind Keycloak login, ProtectedRoute, and — for unsigned organisation DPAs — the DpaBlockerGate.

## Key Routes, APIs, and Configs

Routes (`routePathNames` in src/appConfig.ts):

- /admin, /admin/login
- /admin/password-reset, /admin/password-reset/confirm
- /admin/tenant-onboarding (public, raw invite token as path segment)
- /admin/theme-settings (+ /permissions), /admin/global-settings
- /admin/users (+ /consultants, /agency-admins, /tenants, /tenant-admins, /platform-admins)
- /admin/agency (+ /edit, /add, /add/general)
- /admin/topics
- /admin/statistic, /admin/statistic-preview
- /admin/logs (+ /case-handover, /inactive-accounts)
- /admin/tenants
- /admin/links (+ /tenants, /counsellor, /external-inbounds)
- /admin/profil/, /admin/agb, /impressum, /datenschutz

Notable endpoint constants (src/appConfig.ts, UserService useradmin namespace):

- statistics/dashboard and statistics/tutorials (statistics dashboard)
- invitelinks, account-invites, invite-email-templates, dpa-invites/email (links/invites and DPA invites)
- agencyadmins/search

API client domains (src/api): accountInvites, admins, agency, auth, consultingtype, counselor, idAllocation, invitelinks, passwordReset, settings, statistic, tenant (incl. DPA + media upload + translation), tenantOnboarding, topic, tutorial, user (incl. apiTwoFactorAuth).

Environment / runtime keys (scripts/generate-runtime-env.js, src/env.d.ts):

- VITE_API_URL, VITE_USE_API_URL, VITE_USE_HTTPS, VITE_APP_URL, VITE_MATRIX_URL
- VITE_USER_SERVICE_ORIGIN, VITE_TENANT_SERVICE_ORIGIN, VITE_AGENCY_SERVICE_ORIGIN, VITE_CONSULTING_TYPE_SERVICE_ORIGIN
- VITE_KEYCLOAK_URL, VITE_KEYCLOAK_ORIGIN, VITE_KEYCLOAK_REALM, VITE_KEYCLOAK_CLIENT_ID
- VITE_COOKIE_DOMAIN, VITE_COOKIE_SECURE, VITE_COOKIES_ALLOWEDLIST, VITE_HOSTNAMES_WITHOUT_COOKIE_DOMAIN
- VITE_CSRF_WHITELIST_HEADER(_FOR_LOCAL_DEVELOPMENT)
- VITE_OBSERVABILITY_ENABLED, VITE_OTEL_METRICS_URL, VITE_OTEL_EXPORT_INTERVAL_MS, VITE_PLATFORM_VERSION

Note: a runtime-generated `env.js` (window config) takes precedence over build-time `.env` values.

## ORISO Dependencies

- Keycloak for login, logout, token refresh, role-backed access, and 2FA (OTP setup via UserService apiTwoFactorAuth).
- TenantService for tenant data, appearance/settings, legal content, and translation.
- UserService for users/admins, account invites, invite links and email templates, DPA invites, statistics dashboards, tutorial progress, and logs.
- AgencyService for agency lookup, agency administration, and postcode ranges.
- ConsultingTypeService for consulting types, topics, and taxonomy.
- Matrix/LiveKit reachable app layer is referenced only via VITE_MATRIX_URL/VITE_APP_URL links; no RocketChat remnants remain in this repo.

## Local Development Notes

- npm install; `npm run start` (prestart generates runtime env). Local auth uses vite.authBffPlugin.ts as a dev BFF.
- Storybook: `npm run storybook` (icon catalog is generated pre-run); stories double as component tests in CI.
- Unit tests: `npm run test` (Vitest). Integration: `npm run test:integration(:cli)` (Cypress against a started dev server).
- docs/local-development.md covers environment details.

## Deployment Notes

- Dockerfile + nginx.conf build/serve the SPA; Dockerfile.storybook publishes the Storybook host.
- GitHub Actions: ci-pull-request / ci-feature-branch / ci-main plus Storybook CI and release-image workflows (Docker build/push composite actions).
- Kubernetes deployment lives in the ORISO-Helm charts (admin chart), not in this repo.

## Risks and Gaps

- Runtime API/auth host config must match ingress and Keycloak issuer settings; `env.js` runtime config silently overrides `.env` values.
- Dual UI stacks (antd 5 + MUI 9) are live simultaneously mid-migration; theming parity depends on the shared M3 token mapping in src/theme.
- Legal publish flow depends on source-language pinning; late-loading language lists previously opened editors on the wrong language (fixed, but the area is sensitive).
- Narrow PATCH payloads to the tenant/agency APIs previously took entities offline (missing field = disable); form containers must send complete card payloads.
- Token/cookie behavior is spread across auth helpers, session-cookie helpers, and the fetch wrapper.

## Needs Verification

- Current production route availability and feature flags should be verified against deployed runtime settings (env.js), not local `.env` files.
- Exact Keycloak realm/client values should be checked in environment-specific config.
- The statistics dashboard shows empty-state hints for metrics the backend does not collect yet; which metrics are live must be checked against the deployed UserService version.
