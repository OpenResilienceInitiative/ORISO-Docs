# ORISO-Platform — how the platform hangs together

> Historical implementation notes and build snapshots retained from the imported September 4 work. Counts, self-loops and deployment descriptions below are not current acceptance evidence. Use the current generation manifest, metadata.stats, typed relations and the remediation matrix; differing older counts refer to different intermediate runs.


Numbers as of build **2026-09-04T13:22:17.568Z** (`out/knowledge-graph.json`,
736 nodes, 1151 edges; sources at commits listed in `metadata.sources`) and
the reports in `out/reports/`. Nothing is inferred from a running system.
This is the run after Problem A (own/consumed/external endpoint
classification, the `consumes` edge type, `graph.metadata.stats`) — see
`README.md` for the before/after tables and exact classification rule.

## The tiers

**Callers (2 repos).** `ORISO-Frontend` is the browser application for askers
and consultants; `ORISO-Admin` is the administration SPA for platform, tenant
(Träger) and agency admins. Neither exposes an endpoint or owns a table in this
graph. Frontend contributes 88 `calls` edges, Admin 83. Both build backend
URLs from origin variables — five in the Frontend's
`src/resources/scripts/endpoints.ts`, differently named equivalents in Admin's
`src/appConfig.ts`, plus an ambiguous `apiUrl` proxy origin that only resolves
through a path-prefix fallback table.

**Backends (5 repos).** `ORISO-UserService` owns people, sessions, enquiries and
group chats — the binding between an asker, a consultant, an agency, a Matrix
room and a tenant. `ORISO-AgencyService` owns agencies, departments, catchment
areas and department-level legal texts. `ORISO-TenantService` owns the Träger:
theming, translations, DPA signatures, DPIA master data, permission policies.
`ORISO-ConsultingTypeService` owns consulting types, topics, topic groups and
global application settings. `ORISO-Keycloak` appears only through its vendored
`otp-config` SPI (5 own endpoints, 0 consumed). Of the 290 OWN endpoint nodes
(the ones that get an `exposes` edge), 216 come from OpenAPI yaml and 74 were
recovered from Spring `@RestController` annotations that no spec documents. A
further 300 raw consumed-sibling-spec references and 35 external-contract
references exist as `consumes` edges, not `exposes` — see the own/consumed/
external table below.

**Platform & infrastructure (10 repos).** `ORISO-Helm` carries the only
`deploys` edges — 6 of them. `ORISO-Docs` supplies most of the 74 document
nodes (ADRs + Fumadocs pages). `ORISO-Database` owns 48 table nodes read from
the Helm MariaDB schema dumps. `ORISO-ElementCall` and `ORISO-Livekit` appear
as deploy targets and ADR subjects only. `ORISO-E2E`, `ORISO-Infra`,
`ORISO-SigNoz`, `ORISO-Status` and `ORISO-HealthDashboard` are bare service
nodes: the graph records that the repos exist and nothing more.

## Own vs. consumed vs. external endpoints (`graph.metadata.stats`)

| Repo | Own (`exposes`) | Consumed-internal (`consumes`) | External (`consumes`) | Own endpoints with ≥1 caller |
| --- | ---: | ---: | ---: | ---: |
| ORISO-UserService | 179 | 109 | 35 | 64 / 179 |
| ORISO-AgencyService | 40 | 97 | 0 | 6 / 40 |
| ORISO-TenantService | 43 | 67 | 0 | 5 / 43 |
| ORISO-ConsultingTypeService | 23 | 27 | 0 | 6 / 23 |
| ORISO-Keycloak | 5 | 0 | 0 | 0 / 5 |
| **Total** | **290** | **300** | **35** | **81 / 290 (27.9%)** |

`consumes` edges total: 335. Of the 300 internal consumed references, 40 are
**spec drift** — the owner is in this graph but does not itself expose a
matching endpoint (`reports/spec-drift.md`); the rest collapse onto the
owner's own endpoint node (no duplicate created).

## Service-to-service dependencies (`depends_on`, 20 edges)

Weight = `calls`-edge count + `consumes`-reference count between that pair.
Before this fix, backend-to-backend dependencies were invisible (`depends_on`
only existed for Frontend/Admin → backend). Now the consumed-spec references
surface them:

| Source | Target | Weight | Evidence |
| --- | --- | ---: | --- |
| ORISO-Frontend | ORISO-UserService | 73 | calls |
| ORISO-Admin | ORISO-UserService | 45 | calls |
| ORISO-Admin | ORISO-TenantService | 26 | calls |
| ORISO-AgencyService | ORISO-UserService | 50 | consumes |
| ORISO-TenantService | ORISO-UserService | 33 | consumes |
| ORISO-UserService | ORISO-TenantService | 29 | consumes |
| ORISO-UserService | ORISO-AgencyService | 32 | consumes |
| ORISO-TenantService | ORISO-AgencyService | 22 | consumes |
| ORISO-AgencyService | ORISO-TenantService | 27 | consumes |
| ORISO-ConsultingTypeService | ORISO-TenantService | 27 | consumes |
| ORISO-UserService | ORISO-ConsultingTypeService | 20 | consumes |
| ORISO-AgencyService | ORISO-ConsultingTypeService | 20 | consumes |
| ORISO-TenantService | ORISO-ConsultingTypeService | 12 | consumes |
| ORISO-Admin | ORISO-AgencyService | 8 | calls |
| ORISO-Frontend | ORISO-AgencyService | 6 | calls |
| ORISO-UserService | ORISO-UserService | 23 | consumes (self: bundles a stale copy of its own spec — see spec-drift.md) |
| ORISO-Frontend | ORISO-ConsultingTypeService | 5 | calls |
| ORISO-UserService | ORISO-Keycloak | 5 | consumes |
| ORISO-Frontend | ORISO-TenantService | 4 | calls |
| ORISO-Admin | ORISO-ConsultingTypeService | 4 | calls |

## The call map

`calls` edges by caller repo and callee service (171 total).

| Caller repo | Callee service | `calls` edges | exact | wildcard |
| --- | --- | ---: | ---: | ---: |
| ORISO-Frontend | ORISO-UserService | 73 | 51 | 22 |
| ORISO-Admin | ORISO-UserService | 45 | 43 | 2 |
| ORISO-Admin | ORISO-TenantService | 26 | 26 | 0 |
| ORISO-Frontend | ORISO-AgencyService | 6 | 5 | 1 |
| ORISO-Frontend | ORISO-ConsultingTypeService | 5 | 5 | 0 |
| ORISO-Frontend | ORISO-TenantService | 4 | 4 | 0 |
| ORISO-Admin | ORISO-ConsultingTypeService | 4 | 4 | 0 |
| ORISO-Admin | ORISO-AgencyService | 8 | 8 | 0 |
| **Total** | | **171** | **146** | **25** |

By `methodConfidence`: 109 edges recovered the HTTP verb, 62 are `path-only`
(the target node's verb is the one the endpoint happens to carry, not
necessarily the one the caller sends). The 25 `wildcard` edges lined a backend
`{param}` up against a caller-side literal; most collapse onto
`GET /users/{username}` and should be read as "reaches UserService", not as
"reaches that operation".

## Data ownership

126 `owns` edges (table and index nodes), attributed to the repo whose Liquibase
changeset creates them. No shared schema — cross-service reads go over HTTP.

| Service | Nodes owned | Examples |
| --- | ---: | --- |
| ORISO-UserService | 54 | `userservice` core tables, `event_notification`, `account_invite`, `invite_email_template`, `case_handover_request`, `team_discussion`, `user_do_not_disturb`, `consultant_message_stat`, `identity_tombstone` |
| ORISO-Database | 48 | agency / topic / tenant / userservice schemas as seeded by Helm, incl. `DATABASECHANGELOG` pairs |
| ORISO-TenantService | 12 | `tenantservice`, `tenant_admin_controls`, `platform_dpia_master_data`, `tenant_permission_policy`, `TENANT_ID_RESERVATION` |
| ORISO-AgencyService | 7 | `agencyservice` (agency, agency_topic, legal_text, legal_text_version, agency_id_reservation, admin controls) |
| ORISO-ConsultingTypeService | 5 | `consultingtypeservice`, `topic`, `topic_group`, `topic_group_x_topic` |

## Decisions per area (`governs` edges, 61 total)

Linked by name mention, never by ADR number. An ADR never governs its own repo.
(Unchanged by Problem A — the ADR/document layer isn't touched by the
endpoint-classification fix.)

| ADR | Services it governs |
| --- | --- |
| ADR-001 Counselling modalities as modules | UserService, AgencyService, TenantService, ConsultingTypeService, Frontend |
| ADR-002 Silent room membership / access-control curtain | UserService, TenantService, Frontend |
| ADR-003 Department = unique (Agency × Topic) with imprint + DPP | UserService, AgencyService, TenantService |
| ADR-004 Keep custom chat UI, adopt matrix-js-sdk Megolm | UserService, Frontend, ElementCall |
| ADR-005 Matrix federation off, real DNS server_name | UserService, Frontend |
| ADR-006 `conversation_type` as persisted modality | UserService, AgencyService, TenantService, Frontend |
| ADR-007 Live-chat availability and liveness | UserService |
| ADR-008 Supervision role and side-channel confidentiality | UserService, Frontend |
| ADR-009 Global topic/category ownership, AI-assisted translation | AgencyService, TenantService, ConsultingTypeService, Frontend |
| ADR-010 Per-Träger appearance allowlist | TenantService, Frontend |
| ADR-011 Helm-only deployment, single-domain path routing | Keycloak, Frontend, Admin, ElementCall, Helm |
| ADR-012 Self-help group chat — extend, not rebuild | UserService, TenantService, Frontend, ElementCall |
| ADR-013 2FA via vendored otp-config SPI | UserService, Keycloak, Frontend |
| ADR-014 Shared legal-text objects, topic-before-consent | AgencyService, Frontend |
| ADR-015 Per-chat-type media flag families | Frontend |
| ADR-016 Team-Besprechung side room | Frontend |
| ADR-018 (Docs) Erstantwort as one persisted event | UserService, Frontend, Helm |
| ADR-018 (Frontend) Embed Element Call via Matrix Widget API | UserService, ElementCall, Livekit |
| ADR-020 Scheduled calls, secure invitations, contact calendar | UserService, TenantService, Keycloak, Frontend, ElementCall |
| ADR-021 Legal-text hierarchy, versioning, consent text | TenantService, Frontend |
| ADR-022 Two consent gates, re-consent on change | UserService, Frontend |
| ADR Security-02 (UserService) Unified cryptographic boundary | Frontend |

ADR-017, ADR-019 and ADR-023 carry no `governs` edge. Fumadocs pages carry a
further 142 `documents` edges under a stricter mention rule.

## Known gaps

Counts quoted from `out/reports/` and `graph.metadata.stats`.

- **Own endpoints without callers: 209 of 290 (81 reached, 27.9%)** —
  `uncalled-endpoints.md`, restricted to OWN endpoints only (Problem A removed
  the consumed-duplicate inflation that used to make this "539 of 625,
  13.8%"). Per repo: UserService 115/179, AgencyService 34/40, TenantService
  38/43, ConsultingTypeService 17/23, Keycloak 5/5. What still inflates this:
  Admin's partial parse coverage, and the fact that no service-to-service
  Java client is traced at all — only Frontend/Admin callers.
- **Spec drift: 40 rows** — `reports/spec-drift.md`: a consumed sibling spec
  whose owner IS in this graph but has no matching own endpoint. Examples:
  `ORISO-UserService` bundles `services/appointmentService.yaml`'s
  `POST /consultants`, attributed to owner `ORISO-UserService` itself (a
  stale self-referential copy); `ORISO-AgencyService` and `ORISO-TenantService`
  each bundle drifted contracts attributed to `ORISO-UserService` too.
- **Dead frontend/admin calls: 18 deduped entries** —
  `dead-frontend-calls.md`, grouped by suspected cause (legacy pre-Matrix
  messaging, appointment/caldav, other). Some of the *other* entries are
  flagged by the report itself for manual reclassification because the grep
  found a nearby `@…Mapping`.
- **Caller coverage** — `coverage.md`: Frontend 55/80 endpoint-map keys
  matched (68.8%), 2 unparseable; Admin 32/52 (61.5%), 10 unparseable. Both
  dropped slightly from the pre-Problem-A run (58/80, 33/52) because a
  handful of calls used to match a *consumed/external* node that no longer
  participates in call-matching (own-endpoint-only now) — see README's
  "Own/consumed/external split" section for why that's an accepted,
  understood trade-off, not a bug.
- **ADR numbering drift: 3 collisions** — `adr-number-drift.md`: ADR-002,
  ADR-018 and ADR-019 each mean different things in ORISO-Docs than in
  ORISO-Frontend / ORISO-UserService. Reference ADRs by name.
- **Match-quality caveats** — 25 `calls` edges are `wildcard`, 62 are
  `path-only`. 3 of the 171 `calls` edges are attributed to a `file:` node
  rather than a function.
- **Deployment blind spot** — Helm's `matrix` and `media-scanner` Deployments
  carry no `deploys` edge: no repo in the 17-repo list owns them 1:1.
