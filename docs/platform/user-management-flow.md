---
title: User Management Flow
description: Enriched registration, login, user admin, session and chat flow.
---

# User Management Flow

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

## Flow

1. Frontend resolves tenant and intake context.
2. User authenticates/registers through Keycloak-facing frontend flow.
3. Frontend calls UserService users/conversation/session APIs.
4. UserService owns relational user/session/chat metadata and coordinates Keycloak account and Matrix chat operations through adapters.
5. Admin manages consultants, tenant admins, agency admins, users, sessions and reports through Admin API clients and UserService useradmin endpoints.

## Source References

Frontend registration/API:

- src/api/apiAddSessionSupervisor.ts
- src/api/apiAppointmentServiceSet.ts
- src/api/apiDeleteMessage.ts
- src/api/apiDeleteSessionAndUser.ts
- src/api/apiDeleteUserFromRoom.ts
- src/api/apiDraftMessages.ts
- src/api/apiEnquiryAcceptance.ts
- src/api/apiGetAnonymousEnquiryDetails.ts
- src/api/apiGetApiAppointmentServiceEventTypes.ts
- src/api/apiGetAppointmentServiceTeam.ts
- src/api/apiGetAppointmentsServiceBookingEventsByUserId.ts
- src/api/apiGetAskerSessionList.ts
- src/api/apiGetAskerSessionList.ts.backup
- src/api/apiGetChatRoomById.ts
- src/api/apiGetConsultantAppointments.ts
- src/api/apiGetConsultantSessionList.ts
- src/api/apiGetGroupChatInfo.ts
- src/api/apiGetIsUsernameAvailable.ts
- src/api/apiGetSessionData.ts
- src/api/apiGetSessionRooms.ts
- src/api/apiGetSessionSupervisors.ts
- src/api/apiGetUserData.ts
- src/api/apiGetUserDataBySessionId.ts
- src/api/apiGroupChatSettings.ts
- src/api/apiJoinGroupChat.ts
- src/api/apiLogoutRocketchat.ts
- src/api/apiMatrixSettingsPublic.ts
- src/api/apiMatrixUpload.ts
- src/api/apiPatchMessage.ts
- src/api/apiPatchUserData.ts
- src/api/apiPostAdditionalEnquiry.ts
- src/api/apiPostBanUser.ts
- src/api/apiPostMessageEventNotification.ts
- src/api/apiPostRegistration.ts
- src/api/apiPutGroupChat.ts
- src/api/apiRemoveSessionSupervisor.ts
- src/api/apiRocketChatFetchMyKeys.ts
- src/api/apiRocketChatGetUsersOfRoomWithoutKey.ts
- src/api/apiRocketChatGroupMembers.ts
- src/api/apiRocketChatResetE2EKey.ts
- src/api/apiRocketChatRoomsGet.ts
- src/api/apiRocketChatRoomsInfo.ts
- src/api/apiRocketChatSetRoomKeyID.ts
- src/api/apiRocketChatSetUserKeys.ts
- src/api/apiRocketChatSettingsPublic.ts
- src/api/apiRocketChatSubscriptionsGet.ts
- src/api/apiRocketChatSubscriptionsGetOne.ts
- src/api/apiRocketChatUpdateGroupKey.ts
- src/api/apiRocketChatUsersGetStatus.ts
- src/api/apiRocketChatUsersInfo.ts

Admin user management:

- src/api/admins/addAgencyAdminData.ts
- src/api/admins/deleteAgencyAdminData.ts
- src/api/admins/ediAgencytAdminData.ts
- src/api/agency/getAgencyByCounselorData.ts
- src/api/agency/putAgenciesForAdmin.ts
- src/api/agency/putAgenciesForCounselor.ts
- src/api/counselor/addCounselorData.ts
- src/api/counselor/addFAKECounselorData.ts
- src/api/counselor/deleteCounselorData.ts
- src/api/counselor/deleteFAKECounselorData.ts
- src/api/counselor/editCounselorData.ts
- src/api/counselor/editFAKECounselorData.ts
- src/api/counselor/getCounselorSearchData.ts
- src/api/user/apiTwoFactorAuth.ts
- src/api/user/getFAKEUserData.ts
- src/api/user/getUserData.ts

UserService endpoints:

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
- /users/consultants/search
- /users/sessions/{sessionId}/consultant/{consultantId}
- /users/password/change
- /users/messages/key
- /users/consultants/sessions/{sessionId}
- /users/chat/e2e
- /users/chat/new
- /users/chat/v2/new
- /users/chat/{chatId}/update
- /users/{chatUserId}/chat/{chatId}/ban
- /users/chat/{chatId}/start
- /users/chat/{chatId}/stop
- /users/chat/{chatId}
- /users/chat/{groupId}/assign
- /users/chat/{chatId}/join
- /users/chat/{chatId}/verify
- /users/chat/{chatId}/members
- /users/chat/{chatId}/leave
- /users/chat/room/{chatId}
- /users/account

UserService adapters:

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
