---
title: Backend Services
description: Enriched backend service ownership, APIs, data and dependency map.
---

# Backend Services

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

## ORISO-UserService

Core user/session/conversation service: users, askers, consultants, sessions, conversations, appointments, chat metadata, notifications, deletion workflows, Matrix/Rocket.Chat adapters, and admin user APIs.

OpenAPI contracts:

- api/appointmentservice.yaml
- api/conversationservice.yaml
- api/useradminservice.yaml
- api/userservice.yaml
- api/userstatisticsservice.yaml

Main paths:

- /appointments/booking/{id}
- /appointments/{id}
- /appointments
- /appointments/sessions/{sessionId}/enquiry/new
- /conversations/consultants/enquiries/registered
- /conversations/consultants/enquiries/anonymous
- /conversations/consultants/mymessages/archive
- /conversations/consultants/teamsessions/archive
- /conversations/askers/anonymous/new
- /conversations/askers/anonymous/{sessionId}/accept
- /conversations/anonymous/{sessionId}/finish
- /conversations/anonymous/{sessionId}
- /useradmin
- /useradmin/sessions
- /useradmin/consultants
- /useradmin/consultants/{consultantId}
- /useradmin/askers/{askerId}
- /useradmin/report
- /useradmin/agencies/{agencyId}/consultants
- /useradmin/consultants/{consultantId}/agencies
- /useradmin/consultants/{consultantId}/agencies/{agencyId}
- /useradmin/agency/{agencyId}/changetype
- /useradmin/agencyadmins
- /useradmin/agencyadmins/search
- /useradmin/agencyadmins/{adminId}
- /useradmin/agencyadmins/{adminId}/agencies
- /useradmin/agencyadmins/{adminId}/agencies/{agencyId}
- /useradmin/tenantadmins
- /useradmin/tenantadmins/search
- /useradmin/tenantadmins/{adminId}
- /useradmin/data
- /users/{username}
- /users/askers/new
- /users/askers/session/new
- /users/askers/consultingType/new
- /users/sessions/{sessionId}/enquiry/new
- /users/sessions/{sessionId}/data
- /users/sessions/new/{sessionId}
- /users/sessions/askers
- /users/sessions/room
- /users/sessions/room/{sessionId}
- /users/sessions/rocketChatGroupId
- /users/sessions/{sessionId}/archive
- /users/sessions/{sessionId}/dearchive
- /users/consultants/absences
- /users/consultants/languages
- /users/data
- /users/notifications
- /users/email
- /users/mobiletoken
- /users/mobile/app/token
- /users/sessions/consultants
- /users/consultants/import
- /users/askers/import
- /users/askersWithoutSession/import
- /users/sessions/teams
- /users/mails/messages/new
- /users/mails/reassignment
- /users/consultants
- /users/consultants/{consultantId}

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

Data/repository modules:

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

Security/tenant/config:

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

## ORISO-TenantService

Tenant registry, tenant settings, legal content, tenant resolution, subdomain/cookie/token tenant discovery, and tenant-dependent peer-service setup.

OpenAPI contracts:

- api/tenantservice.yaml

Main paths:

- /tenantadmin
- /tenantadmin/search
- /tenantadmin/{id}
- /tenant
- /tenant/{id}
- /tenant/public/{subdomain}
- /tenant/public/id/{tenantId}
- /tenant/public/single
- /tenant/public/
- /tenant/access

Controllers:

- src/main/java/com/vi/tenantservice/api/controller/TenantController.java
- src/main/java/com/vi/tenantservice/api/controller/VersionController.java

Data/repository modules:

- src/main/java/com/vi/tenantservice/api/repository/TenantRepository.java
- src/main/java/com/vi/tenantservice/api/model/DataProtectionPlaceHolderType.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminAllowedPermissionTogglesSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantAdminControlsSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantContent.java
- src/main/java/com/vi/tenantservice/api/model/TenantEntity.java
- src/main/java/com/vi/tenantservice/api/model/TenantSetting.java
- src/main/java/com/vi/tenantservice/api/model/TenantSettings.java
- src/main/java/com/vi/tenantservice/api/model/TenantSmtpSettings.java

Security/tenant/config:

- src/main/java/com/vi/tenantservice/api/authorisation/Authority.java
- src/main/java/com/vi/tenantservice/api/authorisation/RoleAuthorizationAuthorityMapper.java
- src/main/java/com/vi/tenantservice/api/config/CacheManagerConfig.java
- src/main/java/com/vi/tenantservice/api/config/CustomSwaggerPathWebMvcConfigurer.java
- src/main/java/com/vi/tenantservice/api/config/FreeMarkerConfig.java
- src/main/java/com/vi/tenantservice/api/config/RestTemplateConfig.java
- src/main/java/com/vi/tenantservice/api/config/SpringFoxConfig.java
- src/main/java/com/vi/tenantservice/api/exception/TenantAuthorisationException.java
- src/main/java/com/vi/tenantservice/api/facade/TenantFacadeAuthorisationService.java
- src/main/java/com/vi/tenantservice/api/service/ConfigurationFileLoader.java
- src/main/java/com/vi/tenantservice/api/service/httpheader/SecurityHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/CookieTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/HttpUrlUtils.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainExtractor.java
- src/main/java/com/vi/tenantservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantHeaderSupplier.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolver.java
- src/main/java/com/vi/tenantservice/api/tenant/TenantResolverService.java
- src/main/java/com/vi/tenantservice/config/ConfigurationValidator.java
- src/main/java/com/vi/tenantservice/config/security/AuthorisationService.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverter.java
- src/main/java/com/vi/tenantservice/config/security/JwtAuthConverterProperties.java
- src/main/java/com/vi/tenantservice/config/security/WebSecurityConfig.java

## ORISO-AgencyService

Agency catalog and administration service for public agency lookup, agency admin, postcode ranges, tenant-aware agency data, topic enrichment, and Matrix agency provisioning.

OpenAPI contracts:

- api/agencyadminservice.yaml
- api/agencyservice.yaml

Main paths:

- /agencyadmin
- /agencyadmin/agencies
- /agencyadmin/agencies/{agencyId}
- /agencyadmin/agencies/tenant/{tenantId}
- /agencyadmin/agencies/{agencyId}/changetype
- /agencyadmin/postcoderanges/{agencyId}
- /agencies
- /agencies/by-tenant
- /agencies/topics
- /agencies/{agencyIds}
- /agencies/consultingtype/{consultingTypeId}

Controllers:

- src/main/java/de/caritas/cob/agencyservice/api/admin/controller/AgencyAdminController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/AgencyController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/CustomSwaggerUIController.java
- src/main/java/de/caritas/cob/agencyservice/api/controller/VersionController.java

Data/repository modules:

- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantAwareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/AgencyTenantUnawareRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agencypostcoderange/AgencyPostcodeRangeRepository.java
- src/main/java/de/caritas/cob/agencyservice/api/admin/validation/validators/model/ValidateAgencyDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/model/AgencyMatrixCredentialsDTO.java
- src/main/java/de/caritas/cob/agencyservice/api/repository/agency/DataProtectionResponsibleEntity.java

Security/tenant/config:

- src/main/java/de/caritas/cob/agencyservice/api/authorization/Authority.java
- src/main/java/de/caritas/cob/agencyservice/api/authorization/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/agencyservice/api/service/matrix/MatrixConfig.java
- src/main/java/de/caritas/cob/agencyservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/AccessTokenTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/CustomHeaderTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/MultitenancyWithSingleDomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/SubdomainTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TechnicalUserTenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantContextProvider.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/agencyservice/api/tenant/TenantResolverService.java
- src/main/java/de/caritas/cob/agencyservice/config/AppConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/AuthenticatedUserConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/agencyservice/config/CustomSwaggerUIPathWebMvcConfigurer.java
- src/main/java/de/caritas/cob/agencyservice/config/FreeMarkerConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/SpringFoxConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/agencyservice/config/security/AuthorisationService.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverter.java
- src/main/java/de/caritas/cob/agencyservice/config/security/JwtAuthConverterProperties.java
- src/main/java/de/caritas/cob/agencyservice/filter/HttpTenantFilter.java

## ORISO-ConsultingTypeService

Consulting type, topic, topic group, application settings, and tenant-aware taxonomy service.

OpenAPI contracts:

- api/applicationsettingsservice.yml
- api/consultingtypeadminservice.yml
- api/consultingtypeservice.yml
- api/topicservice.yml

Main paths:

- /settings
- /settingsadmin
- /consultingtypeadmin
- /consultingtypeadmin/consultingtypes
- /consultingtypes/basic
- /consultingtypes/{consultingTypeId}/basic
- /consultingtypes/{consultingTypeId}/extended
- /consultingtypes/{consultingTypeId}/full
- /consultingtypes/byslug/{slug}/full
- /consultingtypes/bytenant/{tenantId}/full
- /consultingtypes/groups
- /consultingtypes
- /consultingtypes/{id}
- /topic-groups
- /topic
- /topic/{id}
- /topic/public
- /topicadmin
- /topicadmin/{id}

Controllers:

- src/main/java/de/caritas/cob/consultingtypeservice/api/admin/controller/ConsultingTypeAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ApplicationSettingsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/ConsultingTypeController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicAdminController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/TopicGroupsController.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/controller/VersionController.java

Data/repository modules:

- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/consultingtypes/ConsultingTypeTenantAwareRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/ApplicationSettingsRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicGroupRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/repository/TopicRepository.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/ApplicationSettingsEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/ConsultingTypeEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicGroupEntity.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicStatus.java

Security/tenant/config:

- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/Authority.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/auth/RoleAuthorizationAuthorityMapper.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/TopicFeatureAuthorisationService.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/service/securityheader/SecurityHeaderSupplier.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantAspect.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantContext.java
- src/main/java/de/caritas/cob/consultingtypeservice/api/tenant/TenantResolver.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/AppConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/CacheManagerConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/ConfigurationValidator.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/CustomSwaggerUIPathWebMvcConfigurer.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/KeycloakConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/SecurityConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/config/resttemplate/RestTemplateConfig.java
- src/main/java/de/caritas/cob/consultingtypeservice/filter/HttpTenantFilter.java
