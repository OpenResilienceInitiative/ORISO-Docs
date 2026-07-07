---
title: ORISO-Frontend Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-Frontend.
---

# ORISO-Frontend Enriched Graph Summary

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

Public counseling frontend for registration, login, tenant-aware onboarding, bookings, messaging, profile, Matrix chat, and LiveKit/Element Call entry points.

## Main Technologies

- Package: @onlineberatung/onlineberatung-frontend 2.9.14
- Stack: React, Webpack, React Router, MUI, styled-components, i18next, Matrix JS SDK, LiveKit, Storybook, Cypress, Playwright
- Selected dependencies: @emotion/react, @emotion/styled, @jitsi/react-sdk, @livekit/components-react, @livekit/components-styles, @mui/icons-material, @mui/material, @tiptap/react, focus-trap-react, html-react-parser, i18next, i18next-browser-languagedetector, i18next-chained-backend, i18next-fetch-backend, i18next-localstorage-backend, i18next-resources-to-backend, intro.js-react, livekit-client, lottie-react, matrix-js-sdk, react, react-app-polyfill, react-csv, react-datepicker, react-dev-utils, react-device-detect, react-dom, react-dropzone, react-helmet, react-i18next, react-refresh, react-responsive, react-router-dom, react-select, react-switch
- Scripts: start, dev, dev:server, build, test, test:components, test:build, release, lint, lint:scripts, lint:style, lint:style:fix, cypress, cypress:start-cra, cypress:wait-and-open, cypress:wait-and-open:wait-on-cra, cypress:wait-and-open:open, dtsgen, prepare, browserstack, storybook, build-storybook

## Important Files and Modules

- package.json
- .env
- .env.example
- public/config.js
- config/env.js
- src/components/Page/index.tsx
- src/components/Switch/index.tsx
- src/components/app/AuthenticatedApp.tsx
- src/components/app/NonPlainRoutesWrapper.tsx
- src/components/app/NonPlainRoutesWrapper.tsx.backup
- src/components/app/RouterConfig.tsx
- src/components/app/app.tsx
- src/components/card/index.tsx
- src/components/message/VideoChatDetails/index.tsx
- src/components/profile/BrowserNotifications/NotificationDenied/index.tsx
- src/components/profile/BrowserNotifications/index.tsx
- src/components/profile/Documentation/index.tsx
- src/components/profile/EmailNotifications/EmailToggle/index.tsx
- src/components/profile/EmailNotifications/NoEmailSet/index.tsx
- src/components/profile/EmailNotifications/SetEmailModal/index.tsx
- src/components/profile/EmailNotifications/index.tsx
- src/components/profile/OverviewMobile/Bookings/index.tsx
- src/components/profile/OverviewMobile/Sessions/index.tsx
- src/components/profile/profile.routes.ts
- src/components/profile/profileHelp.routes.ts
- src/api/apiGetAgenciesByTenant.ts
- src/api/apiGetTenantAgenciesTopics.ts
- src/api/apiGetTenantTheming.ts
- src/api/apiLogoutKeycloak.ts
- src/api/apiTwoFactorAuth.ts
- src/components/app/TenantThemingLoader.tsx
- src/components/app/authenticatedApp.styles.scss
- src/components/auth/auth.ts
- src/components/sessionCookie/accessSessionCookie.ts
- src/components/sessionCookie/accessSessionCookie.ts.backup
- src/components/sessionCookie/accessSessionLocalStorage.ts
- src/components/sessionCookie/cache-bust.ts
- src/components/sessionCookie/getBudibaseAccessToken.ts
- src/components/sessionCookie/getKeycloakAccessToken.ts
- src/components/sessionCookie/getKeycloakAccessToken.ts.backup
- src/components/sessionCookie/getMatrixAccessToken.ts
- src/components/sessionCookie/getRocketchatAccessToken.ts
- src/components/sessionCookie/refreshKeycloakAccessToken.ts
- src/components/twoFactorAuth/TwoFactorAuth.tsx
- src/api/apiAddSessionSupervisor.ts
- src/api/apiAgencyLanguages.ts
- src/api/apiAgencySelection.ts
- src/api/apiAppointmentServiceSet.ts
- src/api/apiConsumeMagicLinkLogin.ts
- src/api/apiDeleteAskerAccount.ts
- src/api/apiDeleteEmail.ts
- src/api/apiDeleteMessage.ts
- src/api/apiDeleteRemove.ts
- src/api/apiDeleteSessionAndUser.ts
- src/api/apiDeleteUserFromRoom.ts
- src/api/apiDraftMessages.ts
- src/api/apiEnquiryAcceptance.ts
- src/api/apiEventNotifications.ts
- src/api/apiFrontendSettings.ts
- src/api/apiGetAgencyConsultantList.ts
- src/api/apiGetAgencyId.ts
- src/api/apiGetAnonymousEnquiryDetails.ts
- src/api/apiGetApiAppointmentServiceEventTypes.ts
- src/api/apiGetAppointmentServiceTeam.ts
- src/api/apiGetAppointmentsServiceBookingEventsByUserId.ts
- src/api/apiGetAskerSessionList.ts
- src/api/apiGetAskerSessionList.ts.backup
- src/api/apiGetCalDavAccount.ts

## Architecture Summary

The app is a browser client. It owns routing, token/session storage, runtime configuration, tenant context, and UI flows. It does not own business data directly; it calls ORISO backend services through API client modules and stores Keycloak tokens in cookies/local storage helpers.

## Key Routes, APIs, and Configs

Routes and route-like constants found in source:

- /booking
- /booking/cancellation
- /booking/reschedule
- /booking/events
- /tools
- /overview
- /sessions/user/view
- /notifications
- /drafts
- /profile
- /sessions/user/view/write/:sessionId?
- /sessions/user/view/:rcGroupId?/:sessionId?
- /sessions/user/view/session/:sessionId
- /sessions/user/view/:rcGroupId/:sessionId
- /sessions/user/view/
- /sessions/consultant/sessionPreview
- /sessions/consultant/sessionView
- /termine
- /sessions/consultant/sessionPreview/:rcGroupId?/:sessionId?
- /sessions/consultant/sessionView/:rcGroupId?/:sessionId?
- /sessions/consultant/sessionPreview/session/:sessionId
- /sessions/consultant/sessionView/session/:sessionId
- /sessions/consultant/sessionPreview/:rcGroupId/:sessionId
- /sessions/consultant/sessionView/:rcGroupId/:sessionId/
- /sessions/consultant/sessionPreview/
- /sessions/consultant/sessionView/
- /sessions/consultant/sessionView/createGroupChat/
- /sessions/consultant/sessionView/:rcGroupId/:sessionId/editGroupChat
- /sessions/consultant/sessionPreview/session/:sessionId/userProfile
- /sessions/consultant/sessionView/session/:sessionId/userProfile
- /sessions/consultant/sessionPreview/:rcGroupId/:sessionId/userProfile
- /sessions/consultant/sessionView/:rcGroupId/:sessionId/userProfile
- /sessions/consultant/sessionView/:rcGroupId/:sessionId/groupChatInfo
- /themen

API client files:

- src/api/apiAddSessionSupervisor.ts
- src/api/apiAgencyLanguages.ts
- src/api/apiAgencySelection.ts
- src/api/apiAppointmentServiceSet.ts
- src/api/apiConsumeMagicLinkLogin.ts
- src/api/apiDeleteAskerAccount.ts
- src/api/apiDeleteEmail.ts
- src/api/apiDeleteMessage.ts
- src/api/apiDeleteRemove.ts
- src/api/apiDeleteSessionAndUser.ts
- src/api/apiDeleteUserFromRoom.ts
- src/api/apiDraftMessages.ts
- src/api/apiEnquiryAcceptance.ts
- src/api/apiEventNotifications.ts
- src/api/apiFrontendSettings.ts
- src/api/apiGetAgenciesByTenant.ts
- src/api/apiGetAgencyConsultantList.ts
- src/api/apiGetAgencyId.ts
- src/api/apiGetAnonymousEnquiryDetails.ts
- src/api/apiGetApiAppointmentServiceEventTypes.ts
- src/api/apiGetAppointmentServiceTeam.ts
- src/api/apiGetAppointmentsServiceBookingEventsByUserId.ts
- src/api/apiGetAskerSessionList.ts
- src/api/apiGetAskerSessionList.ts.backup
- src/api/apiGetCalDavAccount.ts
- src/api/apiGetChatRoomById.ts
- src/api/apiGetConsultant.ts
- src/api/apiGetConsultantAppointments.ts
- src/api/apiGetConsultantSessionList.ts
- src/api/apiGetConsultantStatistics.ts
- src/api/apiGetConsultingType.ts
- src/api/apiGetConsultingTypes.ts
- src/api/apiGetGroupChatInfo.ts
- src/api/apiGetIsUsernameAvailable.ts
- src/api/apiGetSessionData.ts
- src/api/apiGetSessionRooms.ts
- src/api/apiGetSessionSupervisors.ts
- src/api/apiGetTenantAgenciesTopics.ts
- src/api/apiGetTenantTheming.ts
- src/api/apiGetTools.ts
- src/api/apiGetTopicGroups.ts
- src/api/apiGetTopicId.ts
- src/api/apiGetTopicsData.ts
- src/api/apiGetUserData.ts
- src/api/apiGetUserDataBySessionId.ts
- src/api/apiGroupChatSettings.ts
- src/api/apiJoinGroupChat.ts
- src/api/apiLogoutKeycloak.ts
- src/api/apiLogoutRocketchat.ts
- src/api/apiMatrixSettingsPublic.ts
- src/api/apiMatrixUpload.ts
- src/api/apiPatchConsultantData.ts
- src/api/apiPatchMessage.ts
- src/api/apiPatchNotificationActiveView.ts
- src/api/apiPatchUserData.ts
- src/api/apiPostAdditionalEnquiry.ts
- src/api/apiPostBanUser.ts
- src/api/apiPostError.ts
- src/api/apiPostMessageEventNotification.ts
- src/api/apiPostRegistration.ts

Environment keys found:

- VITE_PORT
- VITE_API_URL
- VITE_USE_API_URL
- VITE_USE_HTTPS
- VITE_CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT
- REACT_APP_API_URL
- REACT_APP_DISABLE_ERROR_BOUNDARY
- REACT_APP_COOKIES_ALLOWEDLIST
- CSRF_WHITELIST_HEADER_FOR_LOCAL_DEVELOPMENT
- REACT_APP_MATRIX_HOMESERVER_URL
- VITE_MATRIX_HOMESERVER_URL
- REACT_APP_COOKIE_DOMAIN
- REACT_APP_ELEMENT_URL
- REACT_APP_USE_HTTPS
- REACT_APP_HOSTNAMES_WITHOUT_COOKIE_DOMAIN
- REACT_APP_ELEMENT_CALL_BASE_URL
- REACT_APP_LIVEKIT_WS_URL
- REACT_APP_ORGANIZATION_HOME_URL
- REACT_APP_ORGANIZATION_ONLINEBERATUNG_URL
- REACT_APP_LEGAL_IMPRINT_URL
- REACT_APP_LEGAL_PRIVACY_URL
- REACT_APP_BROWSER_DOWNLOAD_CHROME_URL
- REACT_APP_BROWSER_DOWNLOAD_EDGE_URL
- REACT_APP_BROWSER_DOWNLOAD_SAFARI_URL
- LIVEKIT_TOKEN_SERVICE_URL

Feature/page modules:

- src/pages/app.html
- src/pages/under-construction.html

## ORISO Dependencies

- Keycloak for login, logout, token refresh, and role-backed access.
- TenantService for tenant context/public tenant data.
- UserService for users, sessions, conversations, appointments, chat and profile data.
- AgencyService for agency lookup and agency administration flows where applicable.
- ConsultingTypeService for consulting types, topics, settings and taxonomy.
- Matrix/LiveKit/Element services for communication features.

## Local Development Notes

- npm install
- npm run start or npm run dev
- Use .env or .env.example for API, Matrix, cookie, LiveKit and legal URL settings.

## Deployment Notes

- Dockerfile, deployment-v2.yaml, ingress-v2.yaml, and ORISO-Kubernetes helm/charts/frontend deploy the app.

## Risks and Gaps

- Runtime API/auth host config must match Kubernetes ingress and Keycloak issuer settings.
- Token/cookie behavior is spread across auth helpers, session-cookie helpers and fetch wrappers.
- Matrix migration compatibility appears in frontend code through rc_uid/rc_token compatibility comments and RocketChat provider naming.

## Needs Verification

- Current production route availability and feature flags should be verified against deployed runtime settings.
- Exact Keycloak realm/client values should be checked in environment-specific config, not copied from local .env files.
