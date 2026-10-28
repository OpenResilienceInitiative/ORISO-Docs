# Independent domain naming audit — 6 October 2026

The read-only subagent audited fresh development source, using the online graph first. The graph is orientation from 21 September; the October 6 source revisions below are distinct from graph freshness, deployment and database runtime proof.

## Source revisions and bounded coverage

```text
ORISO-Docs:                  7b544fbb0faca5ec941db4369855b4bcfa28207c
ORISO-AgencyService:         549efae58e1a38530ed23c26f0b8a0bb48ca6012
ORISO-TenantService:         f812000dd830eaa88704b529e30b7563bc6bada0
ORISO-ConsultingTypeService: e7fb7cbc679e4c9390f038d3326fe266c9198356
ORISO-UserService:           d8283fd0af4c9c5913fafd9526a6557ab96335ff
ORISO-Admin:                 04f5c5d567509ae2305728128e5ad28fe3cd477c
ORISO-Frontend:              05ac6cde4ac61d83e7b99a450f41eb2bf885fd5f
ORISO-Database GitHub dev:   c9630a93f84f1d45853ba54b657ebd3bc0ff8acc

Online manifest: https://understand.oriso.org/ua/current/manifest.json
Generation:747d86fc-7221-43a7-a8b9-6081be8d394c
Generated:2026-09-21T12:52:42.456966+00:00

Initial focused scan:1,121 tracked files in declared source directories:
190 domain/repository files;562 migration files;38 provider/consumer API specs;
10 DE/EN locale files;321 Admin/App API adapter/model directory files with tests.
Plus four ORISO-Database MariaDB DDL exports, fetched from GitHub because the local
Database directory is not a Git checkout.
The token inventory covers those directories. Individual findings below are
manually verified examples, not proof that every textual occurrence is erroneous.
Initial exclusions:runtime DB introspection;other/infrastructure repositories;other languages;
binary MongoDB dumps;untracked generated Java build output;runtime acceptance.
Generated client ownership was traced to OpenAPI sources; generation was not run.
```

## Findings and dispositions

| Business meaning | Preferred English | Existing naming | Disposition |
| --- | --- | --- | --- |
| Beratungsstelle | Counselling Centre | agency/Agency/agencyId and Agency Unit; German Agentur-Admins | Technical compatibility alias; visible mistranslations need a copy change. |
| Träger | Provider | tenant/TenantEntity/tenantId; Organisation; Tenant Units | Preferred display term follows this request; Organisation synonym; tenancy remains valid technical terminology. |
| Fachbereich | Department | agency_topic/AgencyTopic | Valid compatibility mapping for a centre × topic, not an independent legal person. |
| Thema | Topic | TopicEntity/topic/main_topic_id | Stable domain wording; global ownership is accepted intent while the inspected entity still carries tenant filtering. |
| Kategorie | Category | TopicGroup/topic_group/topic_group_x_topic | Valid technical alias; many-to-many grouping of topics. |
| Berater:in | Counsellor | Consultant/consultant; counselor/counsellor/consultant copy | Use consistent human copy; preserve model/endpoint names until separate compatibility work. |
| Ratsuchende Person | Help-seeker | user/client/asker/Advice seeker | Preferred editorial term; Advice seeker synonym; User can mean more than help-seeker depending on context. |
| Anfrage/Fall/Gespräch | Enquiry/Case/Conversation | Session/session/request/inquiry | One persistence name does not collapse three domain concepts; lifecycle and conversation kind stay separate. |
| Plattformvertrag | Platform Services Agreement | TenantDpa/content_dpa and DPA-labelled whole workflow | Accepted semantic distinction; intended full agreement model absent in inspected TenantService scope. |
| AVV | Data Processing Agreement | tenant_dpa_version/tenant_dpa_signature/DpaSignatureDTO | Correct for Annex 1; identify old whole-flow naming without claiming the complete agreement is implemented. |
| Gruppenteilnahme-Sitzungsreferenz | Group participation session reference | group_chat_participant.chat_id / GroupChatParticipant.chatId | Concrete misleading identifier: it points to session.id; separately reviewed migration candidate. |
| Technischer Kontext | Context-specific technical term | auth/React providers, tenant context/filter mechanics, consultant permissions | Valid technical vocabulary must not be replaced by global text substitution. |

## Reproducible source evidence

```text
Agency entity/table:
https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/549efae58e1a38530ed23c26f0b8a0bb48ca6012/src/main/java/de/caritas/cob/agencyservice/api/repository/agency/Agency.java#L42
Admin Agency Unit:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/en/translation.json#L327
Admin German Agentur-Admins:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/de/translation.json#L341
Tenant entity/table:
https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/f812000dd830eaa88704b529e30b7563bc6bada0/src/main/java/com/vi/tenantservice/api/model/TenantEntity.java#L18
Admin Provider:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/en/translation.json#L570
Admin Organisation:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/en/translation.json#L54
Admin Tenant Units:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/en/translation.json#L321
Department actual unique mapping:
https://github.com/OpenResilienceInitiative/ORISO-AgencyService/blob/549efae58e1a38530ed23c26f0b8a0bb48ca6012/src/main/java/de/caritas/cob/agencyservice/api/repository/agencytopic/AgencyTopic.java#L31
Topic entity:
https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/e7fb7cbc679e4c9390f038d3326fe266c9198356/src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicEntity.java#L13
Category many-to-many mapping:
https://github.com/OpenResilienceInitiative/ORISO-ConsultingTypeService/blob/e7fb7cbc679e4c9390f038d3326fe266c9198356/src/main/java/de/caritas/cob/consultingtypeservice/api/model/TopicGroupEntity.java#L37
Consultant entity:
https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/d8283fd0af4c9c5913fafd9526a6557ab96335ff/src/main/java/de/caritas/cob/userservice/api/model/Consultant.java#L73
Admin counselor adapter:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/api/counselor/editCounselorData.ts#L24
User entity:
https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/d8283fd0af4c9c5913fafd9526a6557ab96335ff/src/main/java/de/caritas/cob/userservice/api/model/User.java#L35
Session model/status:
https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/d8283fd0af4c9c5913fafd9526a6557ab96335ff/src/main/java/de/caritas/cob/userservice/api/model/Session.java#L43
DPA version entity:
https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/f812000dd830eaa88704b529e30b7563bc6bada0/src/main/java/com/vi/tenantservice/api/model/TenantDpaVersionEntity.java#L24
DPA signature entity:
https://github.com/OpenResilienceInitiative/ORISO-TenantService/blob/f812000dd830eaa88704b529e30b7563bc6bada0/src/main/java/com/vi/tenantservice/api/model/TenantDpaSignatureEntity.java#L30
DPA renewal copy:
https://github.com/OpenResilienceInitiative/ORISO-Admin/blob/04f5c5d567509ae2305728128e5ad28fe3cd477c/src/locales/en/translation.json#L2635
Misleading participant chat_id documented in entity:
https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/d8283fd0af4c9c5913fafd9526a6557ab96335ff/src/main/java/de/caritas/cob/userservice/api/model/GroupChatParticipant.java#L42
```

## Architectural lifecycle findings

Accepted versioned ADRs distinguish Department, Category and Topic, help-seeker consent and the provider agreement. ADR-001 remains Proposed. ADR-003's old single-topic picker was superseded by ADR-014; do not reintroduce it through glossary definitions.

The local relationship-visibility decision is marked Accepted on 23 September, but shares number ADR-024 with a different versioned notification decision. Its local title/provenance must remain visible until the collision is reconciled. This does not block the glossary's basic vocabulary. It prevents citing an ambiguous number as unique canonical authority. Accepted ADR-022 already permits several counselling centres on one account.

```text
Accepted contract terminology (ADR-023):
https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/7b544fbb0faca5ec941db4369855b4bcfa28207c/oriso-platform/decisions/ADR-023-platform-services-agreement-and-traeger-governance.md#L34
Accepted consent decision, multiple centres on one account:
https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/7b544fbb0faca5ec941db4369855b4bcfa28207c/oriso-platform/decisions/ADR-022-consent-gates-and-re-consent-in-counselling-sessions.md#L102
Proposed modalities ADR:
https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/7b544fbb0faca5ec941db4369855b4bcfa28207c/oriso-platform/decisions/ADR-001-counselling-modalities-as-modules.md#L3
Versioned ADR-024 is notification matrix:
https://github.com/OpenResilienceInitiative/ORISO-Docs/blob/7b544fbb0faca5ec941db4369855b4bcfa28207c/oriso-platform/decisions/ADR-024-notification-matrix-two-lists-not-one-filtered.md#L1
Local same-number decision title:
ADR-024-visibility-follows-the-counselling-relationship-not-the-traeger
```

## Database evidence boundary

The four GitHub DDL exports retain old names and omit newer DPA structures. Service migrations are the relevant additional source; exported DDL is not the schema of the running database. No schema rename, data mutation or feature acceptance is claimed.

## Extended complete lexical family inventory

The subsequent independent pass expanded the search to every tracked code/config file in the declared gate, including all tracked locale languages. Family-level dispositions are complete within this gate; occurrence counts remain candidates, not translation errors.

```text
Coverage:6,725 files /1,029,128 lines, at the exact source revisions above.
Gate:tracked .java/.ts/.tsx/.js/.jsx/.json/.yml/.yaml/.xml/.sql under src/, api/,
services/, tests/contracts/ in AgencyService, TenantService, UserService,
ConsultingTypeService, Admin and Frontend; plus four GitHub Database DDL exports.
Read manifests via git ls-tree; extract git archive <exact-SHA> -- selected paths.
Database:GitHub contents at exact sourceSHA.
Token pattern:[A-Za-z_][A-Za-z0-9_]*; normalize CamelCase to snake_case and match
the family roots below. Count each line once per family; families overlap.
Comments, string literals, fixtures, all locale languages and immutable migration
history are included. Counts cannot be added to obtain unique defective lines.

Excluded:build-generated Java;other extensions/directories;binary datasets;other
repositories;graph enrichment inputs;deployed databases. OpenAPI sources cover
generated-contract ownership. No generator, build or runtime test was executed.

Columns:A AgencyService;T TenantService;U UserService;C ConsultingTypeService;
Ad Admin;F Frontend;DB Database;Distinct distinct raw matching tokens.

Family                              A      T      U      C    Ad      F   DB Distinct
agency                          24980    371  14237    102  5657   3357   68     3735
tenant                          17226  10445  12977    979  8555   1847   28     3411
consultant/counsellor/advisor       281    255  24208     89  3544   5073   63     3333
user/asker/client/help-seeker      1416   1115  24117    303  7629  11840  254     3495
topic_group/category                 3      0    144    158    16    391   12      104
agency_topic/department           1750     55    363      0  1113    476    7      357
topic                            1830    157   3149   1157  2591   2888   36     1464
session                            39     49  14749    103   384  10227   44     2540
chat_id/session_id                   0      0   2172      0    20   1110   29      214
conversation/consulting_type      1958    407   2836   1431   359   2137    4     1023
enquiry/inquiry/request           1007   1096   9518    338  1353   4524    8     2012
dpa/avv                            48   1787   1825     38  2516    428    0      625
agreement/annex/signature          124   1817   1802     55  1304    758   38      690
dpp/privacy/data_protection       1508    673    386     21  1064    739    8      388
legal_text/legal_content          1098    168     22     26   514    179    0      205
imprint/impressum/legal_notice     496    253    151      8   792    345    1      113
consent/confirmation               328    263   1007      4  1554   1463    6      493
legal draft/template/proposal      476    829      1      0   769      0    0      255
legal version/publication          335    467    261      5   271     23    0      206
terms_and_conditions                 5     66     71      4    64     42    4       23
roles/admin/supervision           3019   3229  17243    518 11148   5765   31     3642
case/handover/reassign               79    313   2538     14   916   2316   21      637
catchment/postcode/diocese        15649     55    351     24   145    555   19      248
group/series/occurrence/participant 326    595   4621    523   592   6704   18     1480
activity/event/notification         88    166   5256     78  2876  10290   19     1564
provider/context/filter            942    767   5479    487  2010   6117    5     1305
```

### Complete family-level dispositions

```text
agency;tenant:preferred human Counselling Centre/Provider;legacy IDs, routes,
role codes and tenancy mechanics remain valid compatibility/technical names.
consultant/counselor/counsellor/advisor;user/asker/client/help-seeker:preferred
human Counsellor/Help-seeker;Advice seeker synonym;generic users/clients remain valid.
topic_group/category;agency_topic/department;topic:Category/Department/Topic;
legacy group and pairing aliases retained;global-ownership intent vs source separate.
session;chat_id/session_id:Session is broader than an accepted Case;participant
chatId->session.id is the specifically verified migration candidate, not all chat_id.
conversation/consulting_type;enquiry/inquiry/request:kind is modality;configuration
concept separate;Enquiry business term;generic HTTP requests valid.
dpa/avv;agreement/annex/signature:DPA annex vs full Platform Services Agreement;
map legacy whole-module names explicitly;no expansion/rename implied by glossary.
dpp/privacy/data_protection;imprint/impressum/legal_notice;terms_and_conditions:
Privacy notice/Legal notice/Terms of use as appropriate;preserve DPP/IMPRINT fields;
distinct legal functions must not be collapsed by a common translation.
legal_text/legal_content;legal draft/template/proposal;legal version/publication:
valid objects/lifecycles;separate template/proposal/draft/published/archive.
consent/confirmation:qualify account/session/document/handover consent;keep
wire fields;signature separate;generic confirmation dialog valid.
roles/admin/supervision:human assigned rights;preserve permission codes;
professional supervision is separate from provider administration.
case/handover/reassign:Case/Case handover scoped language;reassign alias;
generic programming case valid;handover variants retain participation differences.
catchment/postcode/diocese:area concept vs postcode storage;diocese grouping is
not access boundary;centre-vs-department catchment scope source-backed separately.
group/series/occurrence/participant:retain distinct group/Series/Occurrence/
exception/participant;Chat/Session names must not collapse different group kinds.
activity/event/notification:separate Activity event/Activity Timeline/Toast/email/
Matrix timeline;event_notification compatibility alias retained.
provider/context/filter:React/auth/dependency/data providers,tenant contexts and
query filters are legitimate;no global replacement or permission change follows.

Catch-all legal subfamilies:A/T/U/C/Ad/F matching-line counts
legal name/form:41/146/34/0/114/22
legal framework/DPIA:0/308/4/0/493/2
legal link/render/token:153/27/0/0/158/672
legal authority/access guard:11/8/2/0/0/4
legal resolution/UI:472/220/22/7/421/402
other/unqualified legal:2038/1341/201/29/3889/1601
data-responsibility parties:369/224/129/11/167/44
Illegal* technical exceptions:51/70/601/21/0/1

Keep legitimate legal-party/form/DPO/framework fields and link/render/guard/
resolution mechanisms. IllegalArgumentException is unrelated vocabulary.
legalHighs and guardianship subjects are topic vocabulary.
Unresolved catch-all:bare Legal,legalType,legalForm require context qualification;
they are inventoried, not silently called erroneous.

Declaration probe:90 distinct table names across service histories/JPA, including
historical/removed tables. API schema-name inventories:A180/T174/U313/C77, including
bundled consumer contracts. These are not deployed/current table or endpoint counts.
Additional tables for reservations/invites/email/appointments/audit/support rooms/
identity/deletion/media/preferences/tutorial/background jobs have no demonstrated
translation defect in this audit;retain valid business and technical vocabulary.
```

## Final independent review and status

The independent reviewer found two factual corrections: the conversation kind is the modality axis, and the legacy flow called DPA cannot be assumed to implement an annex-only agreement model. Both were corrected. The reviewer reported no further blocking factual error in the specification and seed, with the explicit ADR-024 lifecycle collision retained.

The complete bounded family inventory is finished. Every occurrence has been inventoried lexically within the declared gate; manual classification of every individual occurrence remains an implementation acceptance task. Neither zero translation errors, zero legacy identifiers nor current deployed schema state is claimed.
