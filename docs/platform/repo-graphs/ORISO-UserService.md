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

Core user/session/conversation service: users, askers, consultants, sessions, conversations, appointments, chat metadata, notifications, deletion workflows, Matrix/Rocket.Chat adapters, and admin user APIs.

## Main Technologies

- Stack: Spring Boot 2.7, Spring Security, Keycloak adapter, Spring Data JPA, OpenAPI Generator, Liquibase, RabbitMQ, Redis, MongoDB, Matrix Synapse, MariaDB
- Selected Maven dependencies: org.springframework.cloud:spring-cloud-dependencies, org.springframework.boot:spring-boot-starter-web, org.springframework.boot:spring-boot-starter-security, org.springframework:spring-web, org.springframework.boot:spring-boot-starter-validation, org.springframework.boot:spring-boot-starter-data-jpa, org.springframework.boot:spring-boot-starter-cache, org.springframework.boot:spring-boot-starter-data-redis, org.springframework.boot:spring-boot-starter-aop, org.springframework.boot:spring-boot-starter-hateoas, org.springframework.boot:spring-boot-starter-amqp, org.springframework.boot:spring-boot-configuration-processor, org.springframework.security:spring-security-core, org.springframework:spring-beans, org.springframework:spring-webmvc, org.springframework:spring-core, org.springframework.cloud:spring-cloud-starter-sleuth, org.springframework.cloud:spring-cloud-starter-zipkin, org.springframework.boot:spring-boot-starter-actuator, org.openapitools:openapi-generator-maven-plugin, org.openapitools:jackson-databind-nullable, io.springfox:springfox-swagger2, org.keycloak:keycloak-spring-security-adapter, org.keycloak:keycloak-spring-boot-starter, org.keycloak:keycloak-admin-client, org.liquibase:liquibase-maven-plugin, org.liquibase:liquibase-core, org.mariadb.jdbc:mariadb-java-client, net.sf.ehcache:ehcache, org.springframework:spring-context-support, org.springframework.boot:spring-boot-starter-test, org.springframework.security:spring-security-test, org.testcontainers:junit-jupiter, org.testcontainers:mariadb, com.github.fridujo:rabbitmq-mock

## Important Files and Modules

- pom.xml
- api/appointmentservice.yaml
- api/conversationservice.yaml
- api/useradminservice.yaml
- api/userservice.yaml
- api/userstatisticsservice.yaml
- services/agencyadminservice.yaml
- services/agencyservice.yaml
- services/applicationsettingsservice.yaml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/keycloakextension.yaml
- services/liveservice.yaml
- services/mailservice.yaml
- services/messageservice.yaml
- services/statisticsservice.yaml
- services/tenantadminservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/AgencyInviteLinkController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/AppointmentController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/ConversationController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/DraftMessageController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/EventNotificationController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/GlobalSmtpTestEmailController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/InactiveAccountAuditLogsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/LiveProxyController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/MatrixMessageController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/MatrixSyncController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/SessionSupervisorController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/SupervisorLogsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserAdminController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserStatisticsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/VersionController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakCustomConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/config/MatrixConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/config/RocketChatConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/interceptor/HttpTenantFilter.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantService.java
- src/main/java/de/caritas/cob/userservice/api/config/AppConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/AppointmentConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/userservice/api/config/CsrfSecurityProperties.java
- src/main/java/de/caritas/cob/userservice/api/config/CustomWebMvcConfigurer.java
- src/main/java/de/caritas/cob/userservice/api/config/GlobalMethodSecurityConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/JpaAuditingConfiguration.java
- src/main/java/de/caritas/cob/userservice/api/config/LiquibaseConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/SwaggerConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/VideoChatConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/apiclient/AgencyServiceApiClientConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/Authority.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AdminAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AdminRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AgencyInviteLinkRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AppointmentRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ChatAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ChatRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantMobileTokenRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/DraftMessageRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/EventNotificationRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/GroupChatParticipantRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/IdentityTombstoneRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/InactiveAccountNotificationAuditLogRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionDataRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionSupervisorRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserChatRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserMobileTokenRepository.java

## Architecture Summary

The service follows an OpenAPI-first Spring boundary with generated API contracts, controller/resource adapters, domain services, repository/data access classes, security/authority mapping, tenant-resolution support where present, and outbound service clients under services/ or apiclient configuration.

## Key APIs

| OpenAPI file | Paths |
| --- | --- |
| api/appointmentservice.yaml | /appointments/booking/{id}<br>/appointments/{id}<br>/appointments<br>/appointments/sessions/{sessionId}/enquiry/new |
| api/conversationservice.yaml | /conversations/consultants/enquiries/registered<br>/conversations/consultants/enquiries/anonymous<br>/conversations/consultants/mymessages/archive<br>/conversations/consultants/teamsessions/archive<br>/conversations/askers/anonymous/new<br>/conversations/askers/anonymous/{sessionId}/accept<br>/conversations/anonymous/{sessionId}/finish<br>/conversations/anonymous/{sessionId} |
| api/useradminservice.yaml | /useradmin<br>/useradmin/sessions<br>/useradmin/consultants<br>/useradmin/consultants/{consultantId}<br>/useradmin/askers/{askerId}<br>/useradmin/report<br>/useradmin/agencies/{agencyId}/consultants<br>/useradmin/consultants/{consultantId}/agencies<br>/useradmin/consultants/{consultantId}/agencies/{agencyId}<br>/useradmin/agency/{agencyId}/changetype<br>/useradmin/agencyadmins<br>/useradmin/agencyadmins/search<br>/useradmin/agencyadmins/{adminId}<br>/useradmin/agencyadmins/{adminId}/agencies<br>/useradmin/agencyadmins/{adminId}/agencies/{agencyId}<br>/useradmin/tenantadmins<br>/useradmin/tenantadmins/search<br>/useradmin/tenantadmins/{adminId} |
| api/userservice.yaml | /users/{username}<br>/users/askers/new<br>/users/askers/session/new<br>/users/askers/consultingType/new<br>/users/sessions/{sessionId}/enquiry/new<br>/users/sessions/{sessionId}/data<br>/users/sessions/new/{sessionId}<br>/users/sessions/askers<br>/users/sessions/room<br>/users/sessions/room/{sessionId}<br>/users/sessions/rocketChatGroupId<br>/users/sessions/{sessionId}/archive<br>/users/sessions/{sessionId}/dearchive<br>/users/consultants/absences<br>/users/consultants/languages<br>/users/data<br>/users/notifications<br>/users/email |
| api/userstatisticsservice.yaml | /userstatistics/sessions |

## Controllers, Services, Repositories, and Entities

Controllers:

- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/AgencyInviteLinkController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/AppointmentController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/ConversationController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/DraftMessageController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/EventNotificationController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/GlobalSmtpTestEmailController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/InactiveAccountAuditLogsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/LiveProxyController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/MatrixMessageController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/MatrixSyncController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/SessionSupervisorController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/SupervisorLogsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserAdminController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/UserStatisticsController.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/VersionController.java

Services:

- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/MatrixSynapseService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatRollbackService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/AdminAgencyRelationService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/AgencyAdminUserService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/TenantAdminUserService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/create/CreateAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/create/agencyrelation/CreateAdminAgencyRelationService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/delete/DeleteAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/search/AdminFilterService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/search/RetrieveAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/admin/update/UpdateAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/agency/AgencyAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/agency/ConsultantAgencyAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/agency/ConsultantAgencyDeletionValidationService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/agency/RemoveConsultantFromRocketChatService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/ConsultantAdminFilterService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/ConsultantAdminFilterTenantAwareService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/ConsultantAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/create/agencyrelation/ConsultantAgencyRelationCreatorService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/delete/ConsultantPreDeletionService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/consultant/update/ConsultantUpdateService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/rocketchat/RocketChatAddToGroupOperationService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/rocketchat/RocketChatRemoveFromGroupOperationService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/session/SessionAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantService.java
- src/main/java/de/caritas/cob/userservice/api/conversation/service/AnonymousConversationCreatorService.java
- src/main/java/de/caritas/cob/userservice/api/conversation/service/user/anonymous/AnonymousUserCreatorService.java
- src/main/java/de/caritas/cob/userservice/api/service/AskerImportService.java
- src/main/java/de/caritas/cob/userservice/api/service/ChatService.java
- src/main/java/de/caritas/cob/userservice/api/service/ConsultantAgencyService.java
- src/main/java/de/caritas/cob/userservice/api/service/ConsultantImportService.java
- src/main/java/de/caritas/cob/userservice/api/service/ConsultantService.java
- src/main/java/de/caritas/cob/userservice/api/service/ConsultingTypeService.java
- src/main/java/de/caritas/cob/userservice/api/service/DecryptionService.java
- src/main/java/de/caritas/cob/userservice/api/service/InactiveAccountAuditLogsService.java
- src/main/java/de/caritas/cob/userservice/api/service/LogService.java
- src/main/java/de/caritas/cob/userservice/api/service/SessionDataService.java
- src/main/java/de/caritas/cob/userservice/api/service/SupervisorLogsService.java
- src/main/java/de/caritas/cob/userservice/api/service/UserAgencyService.java
- src/main/java/de/caritas/cob/userservice/api/service/agency/AgencyService.java
- src/main/java/de/caritas/cob/userservice/api/service/agencyinvitelink/AgencyInviteLinkService.java
- src/main/java/de/caritas/cob/userservice/api/service/appointment/AppointmentService.java
- src/main/java/de/caritas/cob/userservice/api/service/archive/SessionArchiveService.java
- src/main/java/de/caritas/cob/userservice/api/service/archive/SessionDeleteService.java
- src/main/java/de/caritas/cob/userservice/api/service/auth/MagicLinkLoginService.java
- src/main/java/de/caritas/cob/userservice/api/service/consultingtype/ApplicationSettingsService.java
- src/main/java/de/caritas/cob/userservice/api/service/consultingtype/ReleaseToggleService.java
- src/main/java/de/caritas/cob/userservice/api/service/consultingtype/TopicService.java
- src/main/java/de/caritas/cob/userservice/api/service/draft/DraftMessageService.java
- src/main/java/de/caritas/cob/userservice/api/service/helper/MailService.java
- src/main/java/de/caritas/cob/userservice/api/service/liveevents/LiveEventNotificationService.java
- src/main/java/de/caritas/cob/userservice/api/service/matrix/MatrixEventListenerService.java
- src/main/java/de/caritas/cob/userservice/api/service/matrix/RedisMessageMirrorService.java
- src/main/java/de/caritas/cob/userservice/api/service/mobilepushmessage/FirebasePushMessageService.java
- src/main/java/de/caritas/cob/userservice/api/service/mobilepushmessage/MobilePushNotificationService.java
- src/main/java/de/caritas/cob/userservice/api/service/notification/EventNotificationService.java
- src/main/java/de/caritas/cob/userservice/api/service/notification/GlobalSmtpTestEmailService.java
- src/main/java/de/caritas/cob/userservice/api/service/notification/SupervisorAddedEmailNotificationService.java
- src/main/java/de/caritas/cob/userservice/api/service/notification/SystemNotificationEmailSettingsService.java
- src/main/java/de/caritas/cob/userservice/api/service/session/AgencyPreAssignmentRoomService.java
- src/main/java/de/caritas/cob/userservice/api/service/session/ConsultantSessionTopicEnrichmentService.java
- src/main/java/de/caritas/cob/userservice/api/service/session/DirectSessionMatrixRoomService.java
- src/main/java/de/caritas/cob/userservice/api/service/session/SessionService.java
- src/main/java/de/caritas/cob/userservice/api/service/session/SessionTopicEnrichmentService.java
- src/main/java/de/caritas/cob/userservice/api/service/sessionlist/ConsultantSessionListService.java
- src/main/java/de/caritas/cob/userservice/api/service/sessionlist/UserSessionListService.java
- src/main/java/de/caritas/cob/userservice/api/service/statistics/SessionStatisticsService.java

Repositories:

- src/main/java/de/caritas/cob/userservice/api/port/out/AdminAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AdminRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AgencyInviteLinkRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/AppointmentRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ChatAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ChatRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantMobileTokenRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/ConsultantRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/DraftMessageRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/EventNotificationRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/GroupChatParticipantRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/IdentityTombstoneRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/InactiveAccountNotificationAuditLogRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionDataRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/SessionSupervisorRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserAgencyRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserChatRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserMobileTokenRepository.java
- src/main/java/de/caritas/cob/userservice/api/port/out/UserRepository.java

Entities/models:

- src/main/java/de/caritas/cob/userservice/api/admin/report/model/AgencyDependedViolationReportRule.java
- src/main/java/de/caritas/cob/userservice/api/admin/report/model/ViolationReportRule.java
- src/main/java/de/caritas/cob/userservice/api/conversation/model/AnonymousUserCredentials.java
- src/main/java/de/caritas/cob/userservice/api/conversation/model/ConversationListType.java
- src/main/java/de/caritas/cob/userservice/api/conversation/model/PageableListRequest.java
- src/main/java/de/caritas/cob/userservice/api/model/Admin.java
- src/main/java/de/caritas/cob/userservice/api/model/AdminAgency.java
- src/main/java/de/caritas/cob/userservice/api/model/AgencyInviteLink.java
- src/main/java/de/caritas/cob/userservice/api/model/AppintmentEnquiryData.java
- src/main/java/de/caritas/cob/userservice/api/model/Appointment.java
- src/main/java/de/caritas/cob/userservice/api/model/Chat.java
- src/main/java/de/caritas/cob/userservice/api/model/ChatAgency.java
- src/main/java/de/caritas/cob/userservice/api/model/Consultant.java
- src/main/java/de/caritas/cob/userservice/api/model/ConsultantAgency.java
- src/main/java/de/caritas/cob/userservice/api/model/ConsultantAgencyStatus.java
- src/main/java/de/caritas/cob/userservice/api/model/ConsultantMobileToken.java
- src/main/java/de/caritas/cob/userservice/api/model/ConsultantStatus.java
- src/main/java/de/caritas/cob/userservice/api/model/DraftMessage.java
- src/main/java/de/caritas/cob/userservice/api/model/EnquiryData.java
- src/main/java/de/caritas/cob/userservice/api/model/EventNotification.java
- src/main/java/de/caritas/cob/userservice/api/model/GroupChatParticipant.java
- src/main/java/de/caritas/cob/userservice/api/model/IdentityTombstone.java
- src/main/java/de/caritas/cob/userservice/api/model/InactiveAccountNotificationAuditLog.java
- src/main/java/de/caritas/cob/userservice/api/model/Language.java
- src/main/java/de/caritas/cob/userservice/api/model/LanguageId.java
- src/main/java/de/caritas/cob/userservice/api/model/Memento.java
- src/main/java/de/caritas/cob/userservice/api/model/NewSessionValidationConstraint.java
- src/main/java/de/caritas/cob/userservice/api/model/NotificationSettings.java
- src/main/java/de/caritas/cob/userservice/api/model/NotificationsAware.java
- src/main/java/de/caritas/cob/userservice/api/model/Session.java
- src/main/java/de/caritas/cob/userservice/api/model/SessionData.java
- src/main/java/de/caritas/cob/userservice/api/model/SessionSupervisor.java
- src/main/java/de/caritas/cob/userservice/api/model/SessionTopic.java
- src/main/java/de/caritas/cob/userservice/api/model/TenantAware.java
- src/main/java/de/caritas/cob/userservice/api/model/User.java
- src/main/java/de/caritas/cob/userservice/api/model/UserAgency.java
- src/main/java/de/caritas/cob/userservice/api/model/UserChat.java
- src/main/java/de/caritas/cob/userservice/api/model/UserMobileToken.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/AskerDeletionWorkflowDTO.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/ConsultantDeletionWorkflowDTO.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/DeletionLifecycleState.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/DeletionSourceType.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/DeletionTargetType.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/DeletionWorkflowError.java
- src/main/java/de/caritas/cob/userservice/api/workflow/delete/model/SessionDeletionWorkflowDTO.java
- src/main/java/de/caritas/cob/userservice/api/workflow/enquirynotification/model/EnquiriesNotificationMailContent.java
- src/main/java/de/caritas/cob/userservice/api/workflow/inactiveaccountnotification/model/InactiveAccountRole.java

Security, tenant, and config modules:

- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakCustomConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/config/MatrixConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/config/RocketChatConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/interceptor/HttpTenantFilter.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantAdminService.java
- src/main/java/de/caritas/cob/userservice/api/admin/service/tenant/TenantService.java
- src/main/java/de/caritas/cob/userservice/api/config/AppConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/AppointmentConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/userservice/api/config/CsrfSecurityProperties.java
- src/main/java/de/caritas/cob/userservice/api/config/CustomWebMvcConfigurer.java
- src/main/java/de/caritas/cob/userservice/api/config/GlobalMethodSecurityConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/JpaAuditingConfiguration.java
- src/main/java/de/caritas/cob/userservice/api/config/LiquibaseConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/SwaggerConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/VideoChatConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/apiclient/AgencyServiceApiClientConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/Authority.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/IdentityConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/SecurityConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/auth/TechnicalUserConfig.java
- src/main/java/de/caritas/cob/userservice/api/port/out/IdentityClientConfig.java
- src/main/java/de/caritas/cob/userservice/api/service/httpheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/userservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/CustomHeaderTenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TechnicalOrSuperAdminUserTenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantContextProvider.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantData.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/userservice/api/tenant/TenantResolverService.java

Adapters and generated clients:

- src/main/java/de/caritas/cob/userservice/api/actions/session/SetRocketChatRoomReadOnlyActionCommand.java
- src/main/java/de/caritas/cob/userservice/api/actions/user/DeactivateKeycloakUserActionCommand.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakClient.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakMapper.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/KeycloakService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/config/KeycloakCustomConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/dto/KeycloakCreateUserResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/keycloak/dto/KeycloakLoginResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/MatrixSynapseService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/config/MatrixConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixCreateRoomRequestDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixCreateRoomResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixCreateUserRequestDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixCreateUserResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixInviteUserRequestDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/matrix/dto/MatrixInviteUserResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatClient.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatCredentials.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatCredentialsProvider.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatMapper.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatRollbackService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/RocketChatService.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/config/RocketChatConfig.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/StandardResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupAddUserBodyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupCleanHistoryDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupCounterResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupCreateBodyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupDeleteBodyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupDeleteResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupLeaveBodyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupMemberDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupMemberResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupRemoveUserBodyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupUpdateKeyDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/group/GroupsListAllResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/DataDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/EmailsDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/LdapLoginDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/LoginResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/MeDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/PreferencesDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/PresenceDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/PresenceListDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/PresenceOtherDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/login/SettingsDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/logout/DataDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/logout/LogoutResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/Message.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/MessageResponse.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/MethodCall.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/MethodMessageWithParamList.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/PostMessageDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/PostMessageResponseDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/attachment/AttachmentDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/message/attachment/FileDTO.java
- src/main/java/de/caritas/cob/userservice/api/adapters/rocketchat/dto/room/Room.java

## Config and Database

Application config keys inspected:

- server.port
- logging.level.root
- logging.level.org.springframework.web
- logging.level.org.hibernate
- logging.level.org.springframework.web.servlet.mvc.method.annotation
- keycloak.auth-server-url
- keycloak.realm
- keycloak.bearer-only
- keycloak.resource
- keycloak.principal-attribute
- keycloak.cors
- keycloak.use-resource-role-mappings
- keycloak.config.admin-username
- keycloak.config.admin-password
- keycloak.config.admin-client-id
- keycloak.config.app-client-id
- spring.datasource.url
- spring.datasource.username
- spring.datasource.password
- spring.datasource.driver-class-name
- spring.datasource.hikari.maximum-pool-size
- spring.datasource.hikari.minimum-idle
- spring.datasource.hikari.connection-timeout
- spring.datasource.hikari.idle-timeout
- spring.datasource.hikari.maxLifetime
- spring.datasource.hikari.leak-detection-threshold
- spring.jpa.properties.hibernate.dialect
- spring.jpa.show-sql
- spring.jpa.properties.hibernate.format_sql
- spring.jpa.hibernate.ddl-auto
- rocket.technical.username
- rocket.technical.password
- rocket.systemuser.id
- rocket.systemuser.username
- rocket.systemuser.password
- rocket-chat.credential-cron
- rocket-chat.base-url
- rocket-chat.mongo-url
- spring.liquibase.enabled
- app.base.url
- multitenancy.enabled
- agency.service.api.url
- csrf.header.property
- csrf.cookie.property
- csrf.whitelist.header.property
- csrf.whitelist.config-uris
- tenant.service.api.url
- spring.data.mongodb.uri
- spring.rabbitmq.host
- spring.rabbitmq.port
- spring.rabbitmq.username
- spring.rabbitmq.password
- keycloak.ssl-required
- privacy.notificationPreviewMode
- privacy.ipMode
- spring.application.name
- spring.profiles.active
- spring.main.allow-bean-definition-overriding
- spring.jpa.open-in-view
- spring.data.jpa.repositories.bootstrap-mode
- spring.main.banner-mode
- spring.autoconfigure.exclude
- server.host
- system.notification.frontend.base-url
- server.tomcat.threads.max
- server.tomcat.threads.min-spare
- server.tomcat.max-connections
- server.tomcat.accept-count
- server.tomcat.connection-timeout
- registration.cors.allowed.origins
- registration.cors.allowed.paths
- spring.web.locale
- spring.jackson.time-zone
- service.encryption.appkey
- user.account.deleteworkflow.cron
- user.anonymous.deleteworkflow.cron
- user.anonymous.deleteworkflow.periodMinutes
- deletion.readOnlyWindow.hours
- deletion.readOnlyWindow.tenantOverrides
- deletion.pause.defaultMonths

Migration/changelog files found:

- src/main/java/de/caritas/cob/userservice/api/config/BeanAwareSpringLiquibase.java
- src/main/java/de/caritas/cob/userservice/api/config/LiquibaseConfig.java
- src/main/java/de/caritas/cob/userservice/api/config/migration/TemporaryPublicPrivateKeysTask.java
- src/main/resources/db/changelog/changeset/0001_initsql/initSql.xml
- src/main/resources/db/changelog/changeset/0001_initsql/initTables.sql
- src/main/resources/db/changelog/changeset/0001_initsql/initTrigger.sql
- src/main/resources/db/changelog/changeset/0002_monitoringKeys_feedbackChatClumn/0002_changeSet.xml
- src/main/resources/db/changelog/changeset/0002_monitoringKeys_feedbackChatClumn/feedbackChatColumn-rollback.sql
- src/main/resources/db/changelog/changeset/0002_monitoringKeys_feedbackChatClumn/feedbackChatColumn.sql
- src/main/resources/db/changelog/changeset/0002_monitoringKeys_feedbackChatClumn/monitoringKeys-rollback.sql
- src/main/resources/db/changelog/changeset/0002_monitoringKeys_feedbackChatClumn/monitoringKeys.sql
- src/main/resources/db/changelog/changeset/0003_user_attribute_languageFormal/0003_changeSet.xml
- src/main/resources/db/changelog/changeset/0003_user_attribute_languageFormal/userLanguageFormalColumn-rollback.sql
- src/main/resources/db/changelog/changeset/0003_user_attribute_languageFormal/userLanguageFormalColumn.sql
- src/main/resources/db/changelog/changeset/0004_consultant_attribute_languageFormal/0004_changeSet.xml
- src/main/resources/db/changelog/changeset/0004_consultant_attribute_languageFormal/consultantLanguageFormalColumn-rollback.sql
- src/main/resources/db/changelog/changeset/0004_consultant_attribute_languageFormal/consultantLanguageFormalColumn.sql
- src/main/resources/db/changelog/changeset/0005_session_attribute_isMonitoring/0005_changeSet.xml
- src/main/resources/db/changelog/changeset/0005_session_attribute_isMonitoring/sessionIsMonitoringColumn-rollback.sql
- src/main/resources/db/changelog/changeset/0005_session_attribute_isMonitoring/sessionIsMonitoringColumn.sql
- src/main/resources/db/changelog/changeset/0006_chat/0006_changeSet.xml
- src/main/resources/db/changelog/changeset/0006_chat/chat-rollback.sql
- src/main/resources/db/changelog/changeset/0006_chat/chat-trigger.sql
- src/main/resources/db/changelog/changeset/0006_chat/chat.sql
- src/main/resources/db/changelog/changeset/0007_user_agency_relation/0007_changeSet.xml
- src/main/resources/db/changelog/changeset/0007_user_agency_relation/user-agency-relation-rollback.sql
- src/main/resources/db/changelog/changeset/0007_user_agency_relation/user-agency-relation-trigger.sql
- src/main/resources/db/changelog/changeset/0007_user_agency_relation/user-agency-relation.sql
- src/main/resources/db/changelog/changeset/0008_chat_extension/0008_changeSet.xml
- src/main/resources/db/changelog/changeset/0008_chat_extension/chat-extension-rollback.sql
- src/main/resources/db/changelog/changeset/0008_chat_extension/chat-extension.sql
- src/main/resources/db/changelog/changeset/0009_delete_timestamp_for_user_consultant/0009_changeSet.xml
- src/main/resources/db/changelog/changeset/0009_delete_timestamp_for_user_consultant/delete-timestamp-for-user-consultant-rollback.sql
- src/main/resources/db/changelog/changeset/0009_delete_timestamp_for_user_consultant/delete-timestamp-for-user-consultant.sql
- src/main/resources/db/changelog/changeset/0010_delete_timestamp_for_consultant_agency/0010_changeSet.xml
- src/main/resources/db/changelog/changeset/0010_delete_timestamp_for_consultant_agency/delete-timestamp-for-consultant-agency-rollback.sql
- src/main/resources/db/changelog/changeset/0010_delete_timestamp_for_consultant_agency/delete-timestamp-for-consultant-agency.sql
- src/main/resources/db/changelog/changeset/0011_add_mobile_token_for_user/0011_changeSet.xml
- src/main/resources/db/changelog/changeset/0011_add_mobile_token_for_user/add-mobile-token-for-user-rollback.sql
- src/main/resources/db/changelog/changeset/0011_add_mobile_token_for_user/add-mobile-token-for-user.sql
- src/main/resources/db/changelog/changeset/0012_add_type_to_session/0012_changeSet.xml
- src/main/resources/db/changelog/changeset/0012_add_type_to_session/add-type-to-session-rollback.sql
- src/main/resources/db/changelog/changeset/0012_add_type_to_session/add-type-to-session.sql
- src/main/resources/db/changelog/changeset/0013_add_assign_date_to_session/0013_changeSet.xml
- src/main/resources/db/changelog/changeset/0013_add_assign_date_to_session/add-assign-date-to-session-rollback.sql
- src/main/resources/db/changelog/changeset/0013_add_assign_date_to_session/add-assign-date-to-session.sql
- src/main/resources/db/changelog/changeset/0013_add_assign_date_to_session/assign-date-trigger.sql
- src/main/resources/db/changelog/changeset/0014_add_is_peer_chat_to_session/0014_changeSet.xml
- src/main/resources/db/changelog/changeset/0014_add_is_peer_chat_to_session/add-is-peer-chat-to-session-rollback.sql
- src/main/resources/db/changelog/changeset/0014_add_is_peer_chat_to_session/add-is-peer-chat-to-session.sql
- src/main/resources/db/changelog/changeset/0015_add_app_mobile_token/0015_changeSet.xml
- src/main/resources/db/changelog/changeset/0015_add_app_mobile_token/add-app-mobile-token-rollback.sql
- src/main/resources/db/changelog/changeset/0015_add_app_mobile_token/add-app-mobile-token-trigger.sql
- src/main/resources/db/changelog/changeset/0015_add_app_mobile_token/add-app-mobile-token.sql
- src/main/resources/db/changelog/changeset/0016_add_consultant_languages/0016_changeSet.xml
- src/main/resources/db/changelog/changeset/0016_add_consultant_languages/add-consultant-languages-rollback.sql
- src/main/resources/db/changelog/changeset/0016_add_consultant_languages/add-consultant-languages.sql
- src/main/resources/db/changelog/changeset/0017_add_session_language/0017_changeSet.xml
- src/main/resources/db/changelog/changeset/0017_add_session_language/add-session-language-rollback.sql
- src/main/resources/db/changelog/changeset/0017_add_session_language/add-session-language.sql
- src/main/resources/db/changelog/changeset/0018_add_2fa_encourage/0018_changeSet.xml
- src/main/resources/db/changelog/changeset/0018_add_2fa_encourage/add-2fa-encourage-rollback.sql
- src/main/resources/db/changelog/changeset/0018_add_2fa_encourage/add-2fa-encourage.sql
- src/main/resources/db/changelog/changeset/0019_tenant_id/0019_changeSet.xml
- src/main/resources/db/changelog/changeset/0019_tenant_id/tenant_id-rollback.sql
- src/main/resources/db/changelog/changeset/0019_tenant_id/tenant_id.sql
- src/main/resources/db/changelog/changeset/0020_add_appointments/0020_changeSet.xml
- src/main/resources/db/changelog/changeset/0020_add_appointments/add-appointments-rollback.sql
- src/main/resources/db/changelog/changeset/0020_add_appointments/add-appointments.sql
- src/main/resources/db/changelog/changeset/0021_index_for_consultant_search/0021_changeSet.xml
- src/main/resources/db/changelog/changeset/0021_index_for_consultant_search/index-consultant-rollback.sql
- src/main/resources/db/changelog/changeset/0021_index_for_consultant_search/index-consultant.sql
- src/main/resources/db/changelog/changeset/0022_delete_date_for_consultant_search/0022_changeSet.xml
- src/main/resources/db/changelog/changeset/0022_delete_date_for_consultant_search/index-consultant-rollback.sql
- src/main/resources/db/changelog/changeset/0022_delete_date_for_consultant_search/index-consultant.sql
- src/main/resources/db/changelog/changeset/0023_consultant_status/0023_changeSet.xml
- src/main/resources/db/changelog/changeset/0023_consultant_status/consultant-status-rollback.sql
- src/main/resources/db/changelog/changeset/0023_consultant_status/consultant-status.sql
- src/main/resources/db/changelog/changeset/0024_consultant_walk_through/0024_changeSet.xml
- src/main/resources/db/changelog/changeset/0024_consultant_walk_through/consultant-walk-through-rollback.sql

## ORISO Dependencies

Inbound callers are primarily ORISO-Frontend, ORISO-Admin, or peer backend services. Outbound contracts/configs found:

- services/agencyadminservice.yaml
- services/agencyservice.yaml
- services/applicationsettingsservice.yaml
- services/appointmentService.yaml
- services/consultingtypeservice.yaml
- services/keycloakextension.yaml
- services/liveservice.yaml
- services/mailservice.yaml
- services/messageservice.yaml
- services/statisticsservice.yaml
- services/tenantadminservice.yaml
- services/tenantservice.yaml
- services/topicservice.yaml

## Local Development Notes

- ./mvnw spring-boot:run with the intended Spring profile
- Requires MariaDB userservice schema, Keycloak, and configured peer service URLs; Matrix/Redis/RabbitMQ depending on profile.

## Deployment Notes

- Dockerfile and ORISO-Kubernetes helm/charts/userservice.

## Risks and Gaps

- Verify that runtime database schemas match ORISO-Database exports; service repos still include Liquibase/changelog references but platform docs indicate schemas are centrally managed.
- Config files contain environment-specific Keycloak, peer-service, cache, Matrix/Rocket.Chat, and database settings. Do not hardcode those in source.
- Tenant resolution is implemented in service code and must stay aligned with frontend/admin host/cookie/header behavior.

## Needs Verification

- Exact active Spring profile and whether Liquibase is disabled in the target environment.
- Exact API gateway path prefixes used by Kubernetes ingress for each OpenAPI path.
- Current Matrix vs Rocket.Chat operational boundary where both references exist.
