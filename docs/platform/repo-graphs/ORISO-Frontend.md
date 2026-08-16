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

Public counseling frontend for registration/onboarding, login, tenant-aware theming, Matrix-only end-to-end-encrypted messaging, Element Call/LiveKit calls, the notifications center (activity timeline), bookings, profile, statistics, and legal/DPA consent flows. RocketChat and Jitsi are fully removed; Matrix is the sole chat and call transport.

## Main Technologies

- Package: @onlineberatung/onlineberatung-frontend 2.9.14
- Stack: React 19, React Router v7, TypeScript, MUI (M3 theming), styled-components/SCSS modules, i18next (bundled catalogues), matrix-js-sdk + matrix-widget-api, LiveKit, TipTap composer, Lottie
- Build: custom webpack build (config/webpack, scripts/start.js, scripts/build.js); Vite/vite-node powers Vitest unit tests, Storybook (react-vite), the e-mail build, and Element Call theme generation
- Testing: Vitest (`test:unit`), Storybook stories run as component tests in CI (`test:storybook`), Playwright smoke/crossbrowser suites (`test:smoke`, matrix crypto reload/megolm harnesses), legacy Cypress component tests
- Selected dependencies: @livekit/components-react, livekit-client, matrix-js-sdk, matrix-widget-api, @mui/material, @tiptap/react (+ extensions), i18next-chained-backend, lottie-react, react-datepicker, react-dropzone, react-csv, intro.js-react
- Scripts: start, dev, build, test:unit, test:components, test:storybook, test:smoke, test:matrix-megolm, test:matrix-browser-reload, emails:build, emails:keycloak, emails:mailservice, generate:call-theme, generate:icon-catalog, storybook, build-storybook, lint, typecheck:storybook

## Important Files and Modules

- package.json, config/webpack.config.js, vitest.config.mts, playwright.config.ts
- src/initApp.tsx — app bootstrap
- src/components/app/ — app.tsx, RouterConfig.tsx, Routing.tsx, AuthenticatedApp.tsx, SessionsZone.tsx, NavigationBar.tsx/NavigationSidebar, TenantThemingLoader.tsx, WebsocketHandler.tsx
- src/services/ — Matrix core: matrixClientService.ts, chatTransportService.ts, matrixLiveEventBridge.ts, matrixCrypto.ts, matrixKeyBackupService.ts, pendingRecoveryKeyStore.ts, matrixDeviceDehydration.ts, matrixDeviceIsolation.ts, matrixRoomHistoryKeyTransfer.ts, matrixInteractiveAuth.ts, matrixRegistrationService.ts; calls: CallManager.ts, matrixCallService.ts, matrixGroupCallService.ts, liveKitService.ts; drafts: draftStore.ts
- src/components/message/ — MessageItemComponent, AttachmentCard, MessageAttachment, SystemMessage, FailedSendTimelineEntry, E2EEActivatedMessage, MasterKeyLostMessage
- src/components/messageSubmitInterface/ — TipTap composer, attachmentHelpers, resolveAttachmentForSend
- src/components/notificationsCenter/ — NotificationsCenter, ConversationPreview, MatrixActivityPreviewHydrator, caseHandoverPreviewGate, eventDescriptors/
- src/components/registration/ — Registration.tsx, registrationSteps.ts, registrationStepper/, welcomeScreen/, topicSelection/, autoLogin.ts
- src/components/login/ + src/components/stage/ — redesigned login with lamp-map stage effects and security explainer
- src/components/erstantwort/ and src/components/pseudonym/ — first-response sequence and anonymous (Carimat) chat surfaces
- src/components/dpaSign/, src/components/departmentLegal/, src/components/legalContent/, src/components/termsandconditions/ — legal/DPA consent
- src/components/caseHandover/, src/components/teamDiscussion/, src/components/draftsCenter/, src/components/productTour/, src/components/twoFactorAuth/, src/components/accountInvite/
- src/components/profile/ — profile routes incl. ConsultantStatistics.tsx
- src/emails/ — transactional e-mail design system (kit/, content/, scripts/)
- src/components/sessionCookie/ + src/components/auth/ — Keycloak/Matrix token helpers (getMatrixAccessToken.ts; RocketChat helper removed)
- Guard tests: src/matrixOnlyLegacyArtifacts.test.ts, src/matrixCredentialBoundary.test.ts, src/legacyAppointmentProviderAbsence.test.ts
- docs/architecture/ — adr-018-element-call-matryoshka.md, adr-019-silent-key-backup-setup.md, current-architecture.md

## Architecture Summary

The app is a browser client that owns routing, token/session storage, runtime configuration, tenant context, and UI flows. Business data lives in the ORISO backend services, reached through ~127 API client modules in src/api. Real-time chat is Matrix-only: matrixClientService manages the client per authenticated user, chatTransportService is the messaging facade, and matrixLiveEventBridge feeds live events into React state. E2EE is durably on; per ADR-019 the key backup is created silently at login (owner-bound lock, pending recovery key store, device dehydration) and users are only prompted when recovery is genuinely required. Calls embed Element Call in widget mode over LiveKit (ADR-018) with an ORISO-generated theme. Three repo-level guard tests fail CI if RocketChat or Jitsi artifacts reappear.

## Key Routes, APIs, and Configs

Routes (React Router v7; the former `:rcGroupId` params are now `:groupId`):

- /overview, /notifications, /drafts, /profile (+ profile sub-routes such as /aktivitaeten, /einstellungen, /hilfe, /oeffentlich), /tools
- /booking, /booking/cancellation, /booking/reschedule, /booking/events
- /sessions/user/view/…, /sessions/user/view/write/:sessionId?, /sessions/user/view/:groupId/:sessionId
- /sessions/consultant/sessionPreview/… and /sessions/consultant/sessionView/… (incl. createGroupChat, editGroupChat, groupChatInfo, userProfile)
- Legacy video appointment routes exist only as redirect stubs (src/components/legacyVideoAppointment/)

Notable API client modules (src/api, selection):

- Messaging/Matrix: apiMatrixUpload, apiSendMatrixAttachmentMessage, apiMatrixSettingsPublic, apiMatrixSyncRegister, matrixApiContract.test, encryptedEnquiryPayload, apiSendEnquiry, apiDraftMessages
- Notifications: apiEventNotifications, apiPostMessageEventNotification, apiPatchNotificationActiveView, apiDoNotDisturb
- Registration/accounts: apiPostRegistration, apiGetIsUsernameAvailable, apiAccountInvite, apiRequestPasswordReset, apiConfirmPasswordReset, apiTwoFactorAuth, apiConsumeMagicLinkLogin, apiDeleteAskerAccount
- Sessions/enquiries: apiGetAskerSessionList, apiGetConsultantSessionList, apiGetSessionRooms, apiEnquiryAcceptance, apiAcceptAnonymousEnquiry, apiPostAdditionalEnquiry, apiPutSessionData
- Group chat: apiGetChatOccurrences, apiChatOccurrenceCommands, apiGroupChatRoles, apiGroupChatAuthorTranslation, apiJoinGroupChat, apiGroupChatSettings
- Legal/compliance: apiDpaSignature, apiGetDepartmentLegal
- Appointments/booking (appointment service): apiAppointmentServiceSet, apiGetConsultantAppointments, apiGetAppointmentsServiceBookingEventsByUserId, apiGetApiAppointmentServiceEventTypes
- Misc: apiGetConsultantStatistics, apiTeamDiscussion, apiTutorialProgress, apiSetLiveChatAvailability, apiGetTenantTheming, apiGetTenantAgenciesTopics

Environment keys (from .env.example): REACT_APP_API_URL, REACT_APP_USER_SERVICE_ORIGIN, REACT_APP_TENANT_SERVICE_ORIGIN, REACT_APP_AGENCY_SERVICE_ORIGIN, REACT_APP_KEYCLOAK_ORIGIN, REACT_APP_KEYCLOAK_REALM, REACT_APP_MATRIX_HOMESERVER_URL, REACT_APP_ELEMENT_CALL_BASE_URL, REACT_APP_MATRIXRTC_MEMBERSHIP_READER_USER_ID, REACT_APP_LIVEKIT_WS_URL, LIVEKIT_TOKEN_SERVICE_URL, REACT_APP_COOKIE_DOMAIN, REACT_APP_COOKIES_ALLOWEDLIST, REACT_APP_LEGAL_IMPRINT_URL, REACT_APP_LEGAL_PRIVACY_URL, VITE_API_URL/VITE_MATRIX_HOMESERVER_URL (Vite-driven tooling), plus browser-download and organization URLs.

i18n catalogues are bundled from src/resources/i18n (de, de@informal, en, fr, ru, ti, tr) with translationFallback and a dev-toolbar translation check; the old top-level translation-files directory is gone.

## ORISO Dependencies

- Keycloak for login, logout, token refresh, 2FA/OTP, and role-backed access.
- TenantService for tenant context, theming, and public tenant data.
- UserService for users, sessions, enquiries, notifications/event notifications, statistics, and profile data.
- AgencyService for agency lookup and registration agency selection.
- ConsultingTypeService for consulting types, topics, and taxonomy.
- Matrix homeserver (Synapse) for messaging, media upload, and E2EE key backup; Element Call + LiveKit (+ token service) for calls.
- MailService/Keycloak consume the templates produced by the src/emails build.

## Local Development Notes

- npm install; npm run dev (webpack dev server) or npm run start (proxy/server.js).
- npm run test:unit (Vitest), npm run storybook / test:storybook (component tests), npm run test:smoke (Playwright).
- Use .env/.env.example for API origins, Keycloak realm, Matrix homeserver, Element Call/LiveKit, cookie, and legal URL settings.

## Deployment Notes

- Dockerfile, deployment-v2.yaml, ingress-v2.yaml, service-v2.yaml, and the ORISO Helm frontend chart deploy the app.
- Storybook has its own Dockerfile.storybook plus storybook-deployment/ingress/service manifests.
- CI validates on Node 22 (the runtime the image ships).

## Risks and Gaps

- Runtime API/auth host config must match Kubernetes ingress and Keycloak issuer settings.
- Token/cookie behavior is spread across auth helpers, session-cookie helpers and fetch wrappers.
- The appointment-service (booking) API clients and /booking routes remain although scheduled-call direction is governed by ADR-020; verify which booking surfaces are still reachable per tenant.
- ~180 German i18n keys were historically missing and the missing-key guard is muted; catalogue drift is possible.
- Element Call theming depends on a generated CSS artifact (npm run generate:call-theme); regenerating after token changes is a manual step.

## Needs Verification

- Current production route availability and feature flags should be verified against deployed runtime settings.
- Exact Keycloak realm/client values should be checked in environment-specific config, not copied from local .env files.
- Whether the legacy Cypress suites still run anywhere, given Vitest/Storybook/Playwright now carry the test load.
