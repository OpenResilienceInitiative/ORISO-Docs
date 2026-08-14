---
title: ORISO-UserService Enriched Graph Summary
description: Direct source inspection and graph-backed summary for ORISO-UserService.
---

# ORISO-UserService Enriched Graph Summary

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

Core user/session/conversation service: users, askers, consultants, sessions, conversations, session lists, group chats and self-help group series, team discussions, case handover, event notifications (timeline/notification center backend), consultant/admin statistics, account invites with counsellor provisioning, 2FA/OTP, deletion/deactivation workflows, and the application-side lifecycle of encrypted Matrix rooms. Messaging is Matrix-only: the Rocket.Chat adapter and its database columns were removed (contract tests assert the adapter stays gone).

## Main Technologies

- Stack: Spring Boot 4.0.7 (spring-boot-starter-parent), Java 21, Spring Security, Spring Data JPA, OpenAPI Generator (API-first), Liquibase, MariaDB, Redis (caching, message mirror, activity registry), Matrix Synapse (rooms, media, presence), Keycloak (admin client behind hexagonal Identity* ports), AMQP/RabbitMQ (statistics exchange, disabled by default), Firebase Admin (mobile push), OpenTelemetry/OTLP via spring-boot-starter-opentelemetry
- Selected Maven dependencies: org.springframework.boot:spring-boot-starter-web, spring-boot-starter-security, spring-boot-starter-validation, spring-boot-starter-data-jpa, spring-boot-starter-cache, spring-boot-starter-data-redis, spring-boot-starter-aop, spring-boot-starter-hateoas, spring-boot-starter-amqp, spring-boot-starter-actuator, spring-boot-starter-opentelemetry, org.openapitools:openapi-generator-maven-plugin, org.keycloak:keycloak-admin-client, org.liquibase:liquibase-core, org.mariadb.jdbc:mariadb-java-client, com.google.firebase:firebase-admin, org.testcontainers:mariadb
- Gone since July 2026: Rocket.Chat adapter/config, MongoDB, Spring Cloud Sleuth/Zipkin, springfox, keycloak-spring-security-adapter (replaced by resource-server style config and identity ports)

## Important Files and Modules

- pom.xml
- api/userservice.yaml, api/useradminservice.yaml, api/conversationservice.yaml, api/userstatisticsservice.yaml, api/appointmentservice.yaml (own OpenAPI contracts)
- services/*.yaml (outbound client contracts; liveservice.yaml and messageservice.yaml were removed with the Rocket.Chat/LiveService retirement)
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/ — ~40 controllers/delegates, including:
  - UserController.java plus focused delegates (UserSessionControllerDelegate, UserRegistrationControllerDelegate, UserChatControllerDelegate, UserConsultantControllerDelegate, UserAccountControllerDelegate, UserSupportControllerDelegate, UserTwoFactorAuthControllerDelegate)
  - MatrixMessageController.java, MatrixSyncController.java, MatrixRtcCallPolicyController.java
  - EventNotificationController.java, DoNotDisturbController.java
  - AdminStatisticsController.java, ConsultantStatisticsController.java, UserStatisticsController.java
  - CaseHandoverController.java, TeamDiscussionController.java
  - AccountInviteController.java, AgencyInviteLinkController.java, DpaForwardEmailController.java
  - HandshakeController.java, SupportRoomController.java, SupportAdminController.java
  - TenantAdminOnboardingController.java, TutorialProgressController.java, IdAllocationController.java, ErrorReportController.java, DeprecatedLiveProxyController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/ — MatrixSynapseService, MatrixRoomClient, MatrixMediaClient, MatrixSessionRoomGateway, MatrixSessionAssignmentGateway
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/ — KeycloakService implementing the Identity* ports
- src/main/java/de/caritas/cob/userservice/api/port/out/ — repositories plus narrow identity ports (IdentityLogin, IdentitySecondFactor, IdentityProfileUpdater, IdentityEmailAddressUpdater, IdentityRoleUpdater, ...)
- src/main/java/de/caritas/cob/userservice/api/service/ — subsystem packages: notification, statistics, erstantwort, matrix, matrixrtc, accountinvite, provisioning, handshake, support, teamdiscussion, donotdisturb, tutorial, availability, session, sessionlist, archive
- src/main/java/de/caritas/cob/userservice/api/workflow/ — delete, deactivate, enquirynotification, groupchatreminder, inactiveaccountnotification, scheduling (ScheduledTaskClaim leases)
- src/main/resources/db/changelog/changeset/ — Liquibase changesets 0001–0082

## Architecture Summary

OpenAPI-first Spring boundary with generated API contracts and controller/delegate adapters, domain services organized by subsystem package, hexagonal ports for identity (Keycloak) and chat/room gateways (Matrix), JPA repositories against MariaDB, Redis for caching/mirroring/presence, and tenant resolution via aspect + resolver chain. The former UserController monolith is split into delegates; Keycloak is only reachable through capability-scoped Identity* ports; all room lifecycle operations go through Matrix gateways. Startup is fail-fast: the service refuses to start when neither Liquibase migration nor schema verification is configured, and when agency-service URLs or technical-user credentials are missing.

## Key APIs

| OpenAPI file | Paths (selection) |
| --- | --- |
| api/userservice.yaml | /users/{username}, /users/askers/new, /users/sessions/{sessionId}/enquiry/new, /users/sessions/askers, /users/sessions/consultants, /users/sessions/teams, /users/sessions/room/{sessionId}, /users/consultants/search, /users/sessions/{sessionId}/consultant/{consultantId}, /users/password/change, /users/chat/new, /users/chat/v2/new, /users/chat/{chatId}/start|stop|join|verify, /users/chat/{matrixRoomId}/assign, /users/{matrixUserId}/chat/{chatId}/ban, /users/data, /users/email, /users/notifications, /users/mobiletoken |
| api/conversationservice.yaml | /conversations/consultants/enquiries/registered, /conversations/consultants/enquiries/anonymous, /conversations/askers/anonymous/new, /conversations/askers/anonymous/{sessionId}/accept, /conversations/anonymous/{sessionId}/finish, /conversations/consultants/mymessages/archive, /conversations/consultants/teamsessions/archive |
| api/useradminservice.yaml | /useradmin, /useradmin/sessions, /useradmin/consultants, /useradmin/consultants/{consultantId}, /useradmin/askers/{askerId}, /useradmin/agencies/{agencyId}/consultants, /useradmin/agencyadmins, /useradmin/tenantadmins, /useradmin/data, /useradmin/report |
| api/userstatisticsservice.yaml | /userstatistics/sessions |
| api/appointmentservice.yaml | /appointments, /appointments/{id}, /appointments/booking/{id}, /appointments/sessions/{sessionId}/enquiry/new (legacy remnant; feature.appointment.enabled defaults to false) |

Controller-mounted (non-generated) endpoints include /matrix/sessions/{sessionId}/messages|sync|upload, /matrix/media/download/{serverName}/{mediaId}, /matrix/me/token, /users/event-notifications (+ /message-events), MatrixRTC call-policy, case-handover, team-discussion, account-invite, handshake, and support-room routes.

## Controllers, Services, Repositories, and Entities

Controllers: see Important Files above — the notable additions since July 2026 are AccountInviteController, AdminStatisticsController, ConsultantStatisticsController, CaseHandoverController, DoNotDisturbController, DpaForwardEmailController, ErrorReportController, HandshakeController, IdAllocationController, MatrixRtcCallPolicyController, SupportAdminController, SupportRoomController, TeamDiscussionController, TenantAdminOnboardingController, TutorialProgressController, and the UserController delegate split. LiveProxyController is renamed DeprecatedLiveProxyController. All Rocket.Chat controllers/services are gone.

Selected services by subsystem:

- Matrix: MatrixSynapseService, MatrixEventListenerService, RedisMessageMirrorService, GroupChatMembershipService, MatrixRoomMembershipProvider, MatrixSessionSystemMessageService
- Notifications: EventNotificationService, EventNotificationDeduplicationWriter, GroupChatLifecycleNotificationService, GroupChatReminderService, TeamDiscussionNotificationService, DpaSigningEmailDispatchService, SystemNotificationEmailSettingsService
- Statistics: AdminDashboardStatisticsService, ConsultantStatisticsService, ConsultantMessageStatService, ConsultantIdentityHasher, SessionStatisticsService, StatisticsService
- Erstantwort: ErstantwortPayloadBuilder, ErstantwortContext, ErstantwortModality
- Invites/provisioning: AccountInviteService, CounsellorInviteProvisioningService, ProvisioningWorkflow, ProvisioningCompensator, InviteEmailTemplateService, InviteEmailPreviewService, DpaForwardEmailService
- Handover/support: CaseHandoverService, CaseHandoverLogsService, HandshakeService, SupportRoomService
- Lifecycle: SessionService, DirectSessionMatrixRoomService, AgencyPreAssignmentRoomService, SessionArchiveService, ConsultantSessionListService, UserSessionListService
- Scheduling: ScheduledTaskClaimService/Writer plus per-workflow schedulers

Repositories (port/out): Session, SessionData, User, Consultant, Chat, ChatAgency, ChatOccurrenceException, GroupChatParticipant, EventNotification, NotificationRoomLevel, AccountInvite, InviteEmailDelivery, InviteEmailTemplate, CaseHandoverRequest, CaseHandoverReasonPolicy, ConsultantMessageStat, ConsultantStatistics, AdminStatistics, HandshakeSession, HandshakeAuditEvent, SupportRoom, TeamDiscussion(Participant), TutorialProgress, ReservedPublicSlug, ScheduledTaskClaim, IdentityTombstone, Admin, AdminAgency, Appointment, DraftMessage, mobile-token and audit-log repositories.

Entities/models (selection of the ~53 in api/model): Session, SessionData, User, Consultant, Chat (heavily extended for series), GroupChatParticipant, ChatOccurrenceException, EventNotification, NotificationRoomLevel, AccountInvite, InviteEmailDelivery, InviteEmailTemplate, CaseHandoverRequest, CaseHandoverReasonPolicy, ConsultantMessageStat, HandshakeSession, HandshakeAuditEvent, SupportRoom, TeamDiscussion, TeamDiscussionParticipant, TutorialProgress, ReservedPublicSlug, ScheduledTaskClaim, IdentityTombstone, Appointment.

Security, tenant, and config modules: SecurityConfig, RoleAuthorizationAuthorityMapper, Authority, IdentityConfig, TechnicalUserConfig (fails closed when technical-user credentials are absent), HttpTenantFilter, TenantAspect/TenantContext and the tenant resolver chain (AccessTokenTenantResolver, SubdomainTenantResolver, CustomHeaderTenantResolver, TechnicalOrSuperAdminUserTenantResolver, MultitenancyWithSingleDomainTenantResolver), TenantHibernateInterceptor.

## Config and Database

Notable application config groups (application.properties, 374 lines):

- identity.* — openid-connect/otp URLs, per-role otp-allowed flags (users, consultants, restricted agency admins, single-tenant admins, tenant super admins), technical user, dummy-email suffix
- matrix.* — apiUrl, serverName, registrationSharedSecret, adminUsername/adminPassword, presenceEnabled, presenceActiveThresholdMs, encryptionEnabled (default false; enabled per environment)
- matrixrtc.call-policy.hmac-secret — MatrixRTC policy correlation/verification
- statistics.* — enabled flag, rabbitmq exchange, message-count.hmac-secret, small-cell-suppression.enabled
- account.invite.*, dpa.sign.*, email.branding.* — invite/onboarding and branded email layout
- deletion.readOnlyWindow.hours (+ tenantOverrides), deletion.pause.defaultMonths, user.account/anonymous deleteworkflow crons
- appointments.delete-job-cron/-enabled, appointments.lifespan-in-hours; feature.appointment.enabled=false
- feature.* toggles — topics, demographics, multitenancy-with-single-domain, video group chats
- cache.* (agencies, appsettings, consulting, tenant, topic), debug.redis, csrf.*, management.otlp/opentelemetry
- All Rocket.Chat (rocket.*, rocket-chat.*) and MongoDB keys are gone

Database: Liquibase changesets 0001–0082. Highlights since July 2026: 0060 self_help_group_series, 0061 chat_occurrence_exception, 0062 group_chat_participant_series_roles, 0063 event_notification_deduplication, 0064 group_chat_author_content, 0065 conversation_type, 0066 consultant_message_stat, 0067 consultant_public_slug + session_supervision_opt_out, 0068 consultant_assigned_supervisor, 0069 case_handover_notification_templates, 0070 team_discussion, 0071 tutorial_progress, 0072 user_do_not_disturb, 0073–0075 remove_rocket_chat_{user_ids,room_ids,feedback_room_id}, 0076 account_invite_reservation_token, 0077 account_invite_totp_pending_secret, 0078 handshake, 0079 support_room (+ 0081 support_room_repair), 0080 event_notification_millis, 0081 account_invite_provisioning, 0082 scheduled_task_claim. Startup refuses to run when neither migration nor schema verification is active; a Liquibase context override is supported via environment.

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. Outbound contracts (services/):

- services/agencyadminservice.yaml
- services/agencyservice.yaml (URLs are mandatory at startup)
- services/applicationsettingsservice.yaml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/keycloakextension.yaml (OTP/2FA extension)
- services/mailservice.yaml
- services/statisticsservice.yaml
- services/tenantadminservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml

Removed: services/liveservice.yaml and services/messageservice.yaml (LiveService proxy deprecated, Rocket.Chat MessageService retired). Matrix Synapse and Keycloak are reached directly via their HTTP APIs.

## Local Development Notes

- Build requires JDK 21+ (repo AGENTS.md notes builds run on newer JDKs; Spring Boot parent 4.0.7); ./mvnw spring-boot:run with the intended Spring profile (dev/testing/staging/prod property files exist; the testing profile uses H2)
- Requires MariaDB userservice schema, Keycloak (with the OTP extension for 2FA flows), Matrix Synapse, Redis, and configured peer service URLs; agency-service URLs and technical-user credentials are mandatory or startup fails
- tests/load/ contains Python load-smoke and outbound-dependency-metric scripts

## Deployment Notes

- Dockerfile plus the userservice chart in the canonical infra repo (ORISO-Helm); Matrix encryption and presence are switched per environment via MATRIX_* env vars
- Multi-replica safe: scheduled workflows acquire ScheduledTaskClaim DB leases; replica-safety notes live in documentation/ (APPOINTMENT_CLEANUP_REPLICA_SAFETY.md, GROUP_CHAT_DEACTIVATION_REPLICA_SAFETY.md)

## Risks and Gaps

- matrix.encryptionEnabled defaults to false in application.properties; encrypted-room behavior depends on per-environment configuration staying consistent with the platform's "E2EE durably on" stance.
- Media upload/download is proxied to the Matrix media repo without a content-scanning hook in this repo; the fail-closed scanner (ADR-014/015) must be enforced elsewhere until wired in.
- The appointment subsystem is a dormant legacy remnant (feature-flagged off) that still ships an OpenAPI contract and cron cleanup; ADR-020 scheduled calls are not implemented here.
- Several secrets are env-injected with empty defaults (STATISTICS_MESSAGE_COUNT_HMAC_SECRET, MATRIXRTC_CALL_POLICY_HMAC_SECRET, MATRIX_REGISTRATION_SHARED_SECRET, MATRIX_ADMIN_PASSWORD); missing values degrade or disable the dependent features.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Exact active Spring profile per environment and which environments run Liquibase vs. schema verification only (a context override env var exists).
- Exact API gateway/ingress path prefixes for the controller-mounted (non-generated) routes (/matrix/*, /users/event-notifications, call-policy, handshake, support-room).
- Whether the statistics AMQP exchange is consumed anywhere now that statistics.enabled defaults to false and messages-sent stats are computed internally.
- Whether the DeprecatedLiveProxyController still has any live callers or can be deleted.
