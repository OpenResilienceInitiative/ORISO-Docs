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

Administrative React dashboard for tenant, agency, counselor, topic, invite link, settings, logs, statistics, and user administration workflows.

## Main Technologies

- Package: adminpanel 0.1.0
- Stack: React, Vite, React Router, Ant Design, MUI, React Query, Axios, i18next, Cypress
- Selected dependencies: @emotion/react, @emotion/styled, @mui/icons-material, @mui/material, antd, axios, i18next, i18next-browser-languagedetector, react, react-app-polyfill, react-color, react-copy-to-clipboard, react-csv, react-device-detect, react-dom, react-i18next, react-query, react-resizable, react-router, react-router-dom, react-rte, react-switch, @cypress/react, @types/react, @types/react-color, @types/react-dom, @types/react-rte, @vitejs/plugin-react, eslint-plugin-react, eslint-plugin-react-hooks, react-error-overlay, vite, vite-plugin-eslint, vite-plugin-svgr, vite-tsconfig-paths
- Scripts: start, build, serve, test, lint, lint:css, lint:js, lint:formatting, prettier:css, test:integration, test:integration:cli

## Important Files and Modules

- package.json
- .env
- .env.example
- src/App.tsx
- src/components/Box/index.tsx
- src/components/Card/index.tsx
- src/components/CardEditable/components/UnsavedChanges/index.tsx
- src/components/CardEditable/index.tsx
- src/components/CopyToClipboard/index.tsx
- src/components/FeatureEnabled/index.tsx
- src/components/FormBaseInputField/index.tsx
- src/components/FormColorSelectorField/index.tsx
- src/components/FormFileUploaderField/index.tsx
- src/components/FormInputField/index.tsx
- src/components/FormInputNumberField/index.tsx
- src/components/FormInputPasswordField/index.tsx
- src/components/FormPasswordField/index.tsx
- src/components/FormRadioGroupField/index.tsx
- src/components/FormSwitchField/index.tsx
- src/components/FormTextAreaField/index.tsx
- src/components/Modal/index.tsx
- src/components/ModalSuccess/index.tsx
- src/components/Page/index.tsx
- src/api/agency/getAgencyByTenantData.ts
- src/api/auth/accessSessionCookie.ts
- src/api/auth/accessSessionLocalStorage.ts
- src/api/auth/apiLogoutKeycloak.ts
- src/api/auth/auth.ts
- src/api/auth/getAccessToken.ts
- src/api/auth/logout.ts
- src/api/auth/refreshKeycloakAccessToken.ts
- src/api/consultingtype/getConsultingType4Tenant.ts
- src/api/tenant/addTenantData.ts
- src/api/tenant/deleteTenantData.ts
- src/api/tenant/editFAKETenantData.ts
- src/api/tenant/editTenantData.ts
- src/api/tenant/getFAKETenantData.ts
- src/api/tenant/getFakeMultipleTenants.ts
- src/api/tenant/getPublicTenantData.ts
- src/api/tenant/getSingleTenantData.ts
- src/api/tenant/getTenantData.ts
- src/api/tenant/searchTenantData.ts
- src/api/topic/getTopicByTenantData.ts
- src/api/admins/addAgencyAdminData.ts
- src/api/admins/deleteAgencyAdminData.ts
- src/api/admins/ediAgencytAdminData.ts
- src/api/agency/addAgencyData.ts
- src/api/agency/deleteAgencyData.ts
- src/api/agency/deleteAgencyEventType.ts
- src/api/agency/getAgencyByCounselorData.ts
- src/api/agency/getAgencyById.ts
- src/api/agency/getAgencyConsultants.ts
- src/api/agency/getAgencyData.ts
- src/api/agency/getAgencyEventTypeById.ts
- src/api/agency/getAgencyEventTypes.ts
- src/api/agency/getAgencyPostCodeRange.ts
- src/api/agency/getDiocesesData.ts
- src/api/agency/postConsultantForAgencyEventTypes.ts
- src/api/agency/putAgenciesForAdmin.ts
- src/api/agency/putAgenciesForCounselor.ts
- src/api/agency/putConsultantForAgencyEventTypes.ts
- src/api/agency/updateAgencyData.ts
- src/api/agency/updateAgencyPostCodeRange.ts
- src/api/agency/updateAgencyType.ts

## Architecture Summary

The app is a browser client. It owns routing, token/session storage, runtime configuration, tenant context, and UI flows. It does not own business data directly; it calls ORISO backend services through API client modules and stores Keycloak tokens in cookies/local storage helpers.

## Key Routes, APIs, and Configs

Routes and route-like constants found in source:

- /admin
- /admin/login
- /admin/theme-settings
- /admin/global-settings
- /admin/users
- /admin/users/consultants
- /admin/agency
- /admin/topics
- /admin/statistic
- /admin/logs
- /admin/tenants
- /admin/invite-links

API client files:

- src/api/admins/addAgencyAdminData.ts
- src/api/admins/deleteAgencyAdminData.ts
- src/api/admins/ediAgencytAdminData.ts
- src/api/agency/addAgencyData.ts
- src/api/agency/deleteAgencyData.ts
- src/api/agency/deleteAgencyEventType.ts
- src/api/agency/getAgencyByCounselorData.ts
- src/api/agency/getAgencyById.ts
- src/api/agency/getAgencyByTenantData.ts
- src/api/agency/getAgencyConsultants.ts
- src/api/agency/getAgencyData.ts
- src/api/agency/getAgencyEventTypeById.ts
- src/api/agency/getAgencyEventTypes.ts
- src/api/agency/getAgencyPostCodeRange.ts
- src/api/agency/getDiocesesData.ts
- src/api/agency/postConsultantForAgencyEventTypes.ts
- src/api/agency/putAgenciesForAdmin.ts
- src/api/agency/putAgenciesForCounselor.ts
- src/api/agency/putConsultantForAgencyEventTypes.ts
- src/api/agency/updateAgencyData.ts
- src/api/agency/updateAgencyPostCodeRange.ts
- src/api/agency/updateAgencyType.ts
- src/api/auth/accessSessionCookie.ts
- src/api/auth/accessSessionLocalStorage.ts
- src/api/auth/apiLogoutKeycloak.ts
- src/api/auth/auth.ts
- src/api/auth/getAccessToken.ts
- src/api/auth/logout.ts
- src/api/auth/refreshKeycloakAccessToken.ts
- src/api/consultingtype/getConsultingType4Tenant.ts
- src/api/consultingtype/getConsultingTypes.ts
- src/api/counselor/addCounselorData.ts
- src/api/counselor/addFAKECounselorData.ts
- src/api/counselor/deleteCounselorData.ts
- src/api/counselor/deleteFAKECounselorData.ts
- src/api/counselor/editCounselorData.ts
- src/api/counselor/editFAKECounselorData.ts
- src/api/counselor/getCounselorSearchData.ts
- src/api/fetchData.ts
- src/api/invitelinks/invitelinks.ts
- src/api/settings/apiServerSettings.ts
- src/api/settings/sendGlobalSmtpTestEmail.ts
- src/api/statistic/getRegistrationData.ts
- src/api/tenant/addTenantData.ts
- src/api/tenant/deleteTenantData.ts
- src/api/tenant/editFAKETenantData.ts
- src/api/tenant/editTenantData.ts
- src/api/tenant/getFAKETenantData.ts
- src/api/tenant/getFakeMultipleTenants.ts
- src/api/tenant/getPublicTenantData.ts
- src/api/tenant/getSingleTenantData.ts
- src/api/tenant/getTenantData.ts
- src/api/tenant/searchTenantData.ts
- src/api/topic/addTopicData.ts
- src/api/topic/deleteTopicData.ts
- src/api/topic/getTopicByTenantData.ts
- src/api/topic/getTopicData.ts
- src/api/topic/updateTopicData.ts
- src/api/user/apiTwoFactorAuth.ts
- src/api/user/getFAKEUserData.ts

Environment keys found:

- VITE_PORT
- BROWSER
- VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT
- VITE_API_URL
- VITE_USE_API_URL
- VITE_USE_HTTPS
- VITE_COOKIE_DOMAIN
- VITE_COOKIE_SECURE
- VITE_KEYCLOAK_REALM
- VITE_KEYCLOAK_CLIENT_ID
- VITE_APP_URL
- VITE_MATRIX_URL

Feature/page modules:

- src/pages/Agency
- src/pages/Dashboard.tsx
- src/pages/Error404.tsx
- src/pages/ErrorPages
- src/pages/GlobalSettings
- src/pages/Imprint.tsx
- src/pages/InviteLinks
- src/pages/Login
- src/pages/Logs
- src/pages/Privacy.tsx
- src/pages/Profile
- src/pages/Statistic.tsx
- src/pages/TenantSettings
- src/pages/Tenants
- src/pages/Topics
- src/pages/users

## ORISO Dependencies

- Keycloak for login, logout, token refresh, and role-backed access.
- TenantService for tenant context/public tenant data.
- UserService for users, sessions, conversations, appointments, chat and profile data.
- AgencyService for agency lookup and agency administration flows where applicable.
- ConsultingTypeService for consulting types, topics, settings and taxonomy.
- Matrix/LiveKit/Element services for communication features.

## Local Development Notes

- npm install --legacy-peer-deps
- npm run start
- Use .env or .env.example for VITE_API_URL, Keycloak realm/client, cookie, Matrix and app URLs.

## Deployment Notes

- Dockerfile, nginx.conf, ingress.yaml, and ORISO-Kubernetes helm/charts/admin deploy the admin UI.

## Risks and Gaps

- Runtime API/auth host config must match Kubernetes ingress and Keycloak issuer settings.
- Token/cookie behavior is spread across auth helpers, session-cookie helpers and fetch wrappers.
- Matrix migration compatibility appears in frontend code through rc_uid/rc_token compatibility comments and RocketChat provider naming.

## Needs Verification

- Current production route availability and feature flags should be verified against deployed runtime settings.
- Exact Keycloak realm/client values should be checked in environment-specific config, not copied from local .env files.
