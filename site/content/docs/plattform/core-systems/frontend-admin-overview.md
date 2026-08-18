---
title: Frontend and Admin Overview
description: Enriched ORISO browser application architecture and backend dependency map.
---

# Frontend and Admin Overview

## Platform Navigation

- [Overview](./overview.md)
- [Repository map](./repository-map.md)
- [Architecture](./architecture.md)
- [Authentication and Keycloak](./authentication-and-keycloak.md)
- [Database and data model](./database-and-data-model.md)
- [Kubernetes deployment](./kubernetes-deployment.md)
- [Frontend/Admin overview](./frontend-admin-overview.md)
- [Backend services](./backend-services.md)
- [Tenant lifecycle](./tenant-lifecycle.md)
- [User management flow](./user-management-flow.md)
- [Local development](./local-development.md)
- [Onboarding guide](./onboarding-guide.md)
- [Troubleshooting](./troubleshooting.md)
- [Graph validation report](./graph-validation-report.md)
- [Diagrams](./diagrams.md)

## ORISO-Frontend

Purpose: Public counseling frontend for registration, login, tenant-aware onboarding, bookings, messaging, profile, Matrix chat, and LiveKit/Element Call entry points.

Routes discovered:

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

Important API/auth files:

- src/api/apiGetAgenciesByTenant.ts
- src/api/apiGetTenantAgenciesTopics.ts
- src/api/apiGetTenantTheming.ts
- src/api/apiLogoutKeycloak.ts
- src/api/apiTwoFactorAuth.ts
- src/components/app/AuthenticatedApp.tsx
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
- src/api/apiGetChatRoomById.ts
- src/api/apiGetConsultant.ts
- src/api/apiGetConsultantAppointments.ts
- src/api/apiGetConsultantSessionList.ts
- src/api/apiGetConsultantStatistics.ts

## ORISO-Admin

Purpose: Administrative React dashboard for tenant, agency, counselor, topic, invite link, settings, logs, statistics, and user administration workflows.

Routes discovered:

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

Important API/auth files:

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

## Shared Pattern

Both apps are API consumers. Neither owns persistence. Both rely on Keycloak token flow, runtime API host configuration, tenant-aware behavior, and backend service APIs exposed through Kubernetes/API ingress.
