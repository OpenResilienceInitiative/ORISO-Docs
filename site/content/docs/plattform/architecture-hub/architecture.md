---
title: ORISO End-to-End Architecture
description: Enriched platform architecture from source graphs and direct source inspection.
---

# ORISO End-to-End Architecture

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

Diagram: [service-architecture.mmd](./diagrams/service-architecture.mmd)

## Runtime Shape

Browser apps authenticate with Keycloak, call API host routes exposed by Kubernetes ingress, and receive data from service-owned Spring backends. Backends validate tokens, resolve tenant context where applicable, call peer services through generated contracts/configured clients, and persist data in service-owned databases.

## Layer Summary

- UI: ORISO-Frontend and ORISO-Admin.
- IAM: ORISO-Keycloak online-beratung realm.
- Backend services: TenantService, UserService, AgencyService, ConsultingTypeService.
- Data: MariaDB service schemas, MongoDB consulting/application documents, Matrix PostgreSQL, Redis, RabbitMQ.
- Runtime: ORISO-Kubernetes Helm charts and ingress manifests.

## Concrete Source References

Frontend app and routes:

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

Admin app and routes:

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

Backend OpenAPI contracts:

- ORISO-UserService/api/appointmentservice.yaml
- ORISO-UserService/api/conversationservice.yaml
- ORISO-UserService/api/useradminservice.yaml
- ORISO-UserService/api/userservice.yaml
- ORISO-UserService/api/userstatisticsservice.yaml
- ORISO-AgencyService/api/agencyadminservice.yaml
- ORISO-AgencyService/api/agencyservice.yaml
- ORISO-ConsultingTypeService/api/applicationsettingsservice.yml
- ORISO-ConsultingTypeService/api/consultingtypeadminservice.yml
- ORISO-ConsultingTypeService/api/consultingtypeservice.yml
- ORISO-ConsultingTypeService/api/topicservice.yml
- ORISO-TenantService/api/tenantservice.yaml

Kubernetes ingress:

- ingress/00-keycloak-auth-domain-ingress.yaml: auth.oriso-dev.site -> oriso-platform-keycloak
- ingress/01-keycloak-ingress.yaml: api.oriso-dev.site -> oriso-platform-keycloak
- ingress/02-userservice-ingress.yaml: api.oriso-dev.site -> oriso-platform-userservice
- ingress/03-agencyservice-ingress.yaml: api.oriso-dev.site -> oriso-platform-agencyservice
- ingress/04-consultingtypeservice-ingress.yaml: api.oriso-dev.site -> oriso-platform-consultingtypeservice
- ingress/05-tenantservice-ingress.yaml: api.oriso-dev.site -> oriso-platform-tenantservice
- ingress/06-matrix-ingress.yaml: api.oriso-dev.site -> oriso-platform-matrix-synapse
- ingress/08-uploadservice-ingress.yaml: api.oriso-dev.site -> oriso-platform-uploadservice
- ingress/10-health-ingress.yaml: api.oriso-dev.site -> oriso-platform-health-dashboard
- ingress/11-rocketchat-ingress.yaml: api.oriso-dev.site -> rocketchat
- ingress/12-matrix-domain-ingress.yaml: matrix.oriso-dev.site -> oriso-platform-matrix-synapse
- ingress/13-frontend-ingress.yaml: app.oriso-dev.site -> oriso-platform-frontend
- ingress/14-admin-ingress.yaml: admin.oriso-dev.site -> oriso-platform-admin
- ingress/15-health-dashboard-ingress.yaml: health.oriso-dev.site -> oriso-platform-health-dashboard
- ingress/16-element-ingress.yaml: element.oriso-dev.site -> oriso-platform-element
- ingress/17-element-call-ingress.yaml: call.oriso-dev.site -> oriso-platform-element-call
- ingress/18-livekit-ingress.yaml: livekit.oriso-dev.site -> oriso-platform-livekit-token-service, oriso-platform-livekit
- ingress/19-redis-commander-ingress.yaml: redis.oriso-dev.site -> oriso-platform-redis-commander
- ingress/20-signoz-ingress.yaml: signoz.oriso-dev.site -> oriso-platform-signoz
- ingress/21-status-page-ingress.yaml: status.oriso-dev.site -> oriso-platform-status-page
- ingress/22-storybook-ingress.yaml: storybook.oriso-dev.site -> oriso-platform-storybook
- ingress/ingress-values.yaml: - -> -

## Important Architecture Rules

- Do not bypass service ownership by writing another service's schema directly.
- Do not treat frontend/admin environment files as production truth; verify Kubernetes/runtime config.
- Do not assume a Keycloak role is sufficient for tenant access; tenant resolvers and service authorization rules also matter.
- Use OpenAPI files as the first source for backend endpoint shape, then inspect controllers/services for behavior.

## Needs Verification

- Active API gateway prefixes in staging/production.
- Whether Rocket.Chat references are still active or compatibility-only after Matrix migration.
