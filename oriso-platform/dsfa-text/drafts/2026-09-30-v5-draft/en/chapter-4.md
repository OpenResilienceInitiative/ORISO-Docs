Chapter 4

## Actors, roles and governance

Technical part — maintained by ORISO — Section 4.5 is organisational —

Partners, organisations and the operator jointly decide on the purposes and means of processing; a joint-controller agreement exists (Section 28(1), sentence 2 KDG / Article 26(1) GDPR). Organisations and counselling centres remain responsible for professional counselling, including case documentation outside the platform. The platform digitally supports conclusion of data processing agreements with organisations; organisation representatives sign through personalised, tokenised links without themselves being users of the counselling application.

[Operator’s governance description: cooperation structure, bodies, decision-making processes — operator-specific free text]

### 4.1 Processors and recipients

Table scrolls horizontally on narrow viewports

| Name | Activity | Location | Joint controller | Processor | DPA |
| --- | --- | --- | --- | --- | --- |
| Counselling centres or organisations | Professional counselling | Germany | Yes | No | No |
| neusta integrate GmbH | Server hosting, production operation | Germany | No | Yes | Yes |
| GS Design GmbH Kreuzbergstr. 30 VH, 10965 Berlin | Development, maintenance, support | Germany | No | Yes | Yes |
| Greyt.IT UG Richardstr. 11, 12043 Berlin — subcontractor of GS Design GmbH | Technical development | Germany | No | Yes | Yes |

Development workstations have no access to personal production data; development and testing use only synthetic data. Production operation and administration are handled by the operating service provider in the data centre (Annex 3 to the data processing agreement, dated 14 August 2026).

### 4.2 Roles and permissions

The platform has four staff levels and the anonymous advice seeker. Internally, fourteen Keycloak realm roles represent fine-grained API permissions. Two rules apply throughout: **hierarchical isolation** — one organisation cannot see another, and one counselling centre cannot see another centre’s advice seekers or counsellors — and **inheritance of legal texts**: legal notice, privacy notice and consent text exist at every level; where no local version exists, the version from the parent level applies.

Platform administrator

Operates the platform, creates organisations and maintains legal-text templates at platform level. Technically cannot access chat content.

user-admin — 2FA mandatory

Organisation administrator

Responsible for an organisation: creates counselling centres and their administration, maintains legal texts at organisation level. Fully isolated from other organisations.

tenant-admin — single-tenant-admin — 2FA mandatory

Counselling-centre administrator

Manages a counselling centre: invites counsellors, configures the live-chat link, topics and postcode assignment, and can override their centre’s legal texts.

agency-admin — restricted-agency-admin — restricted-consultant-admin

Counsellor

Accepts enquiries from the waiting room (oldest first) and provides encrypted counselling. Supervision is a function of this role, not a separate role.

consultant — group-chat-consultant — supervisor-consultant

**Advice seeker (anonymous)** — enters the waiting room without registration under a system-generated pseudonym; Keycloak role anonymous. Only the pseudonym, short-lived session cookie, queue position and topic selected through the link are collected. On leaving, the pseudonym and room are automatically removed. The user role is reserved for a future registered workflow.

### 4.3 Permission matrix

Table scrolls horizontally on narrow viewports

| Capability | Platform administrator | Organisation administrator | Centre administrator | Counsellor | Advice seeker |
| --- | --- | --- | --- | --- | --- |
| Create organisations | Yes | No | No | No | No |
| Create counselling centres | No | Yes | No | No | No |
| Create / invite counsellors | Yes | Yes | Yes | No | No |
| View own organisation’s data | n/a | Yes | own centre only | own centre only | No |
| View other organisations’ data | No | No | No | No | No |
| Edit platform-level legal texts | Yes | No | No | No | No |
| Edit organisation-level legal texts | No | Yes | No | No | No |
| Edit centre-level legal texts | No | Yes | Yes | No | No |
| Generate live-chat links | No | Yes | Yes | No | No |
| Accept a waiting-room ticket | No | No | No | Yes | No |
| Toggle own live-chat availability | No | No | No | Yes | No |
| Read chat **content** | E2EE | E2EE | E2EE | own session only | own session only |
| Deletion on leaving | No | No | No | No | Yes |
| 2FA enforced | Yes | Yes | recommended | recommended | n/a |

### 4.4 Inheritance of legal texts

Platform template — platform administrator

Organisation version — organisation administrator

Counselling-centre version — centre administrator

Effective text for advice seekers

Legal notice, privacy notice and consent text exist at every level. If a counselling centre does not maintain its own version, the organisation’s version applies; if the organisation has none, the platform template applies. Advice seekers therefore always see a complete set of legal texts.

### 4.5 Governance and decision-making bodies

Organisational part — maintained by the platform operator (contractual documents) — editing in the administration area will follow —

This section describes the organisation, decision-making processes and legal balancing by the organisation. It cannot be derived from source code and is therefore not maintained by ORISO. Until the organisation writes it, the document contains only the draft text, originally collapsed; the square brackets deliberately mark open fields.

Show draft text

The platform is operated by [controller’s name] together with [name of association or cooperation]; it serves affiliated organisations and their counselling centres. The central steering body is [body’s name, e.g. steering committee], composed of [membership: numbers and appointing organisations], meeting [frequency, e.g. twice annually]; it decides on purposes and means of processing, fundamental matters and the budget. Operational management is assigned to [office/department], which reports to the body at least [frequency]. The body receives specialist advice from [other bodies, e.g. data protection advisory board, technical development steering group], whose responsibilities and membership are set out in [reference to cooperation agreement/rules of procedure]. Organisations and counselling centres are legally independent bodies; they participate in decision-making through [appointment or participation procedure].
