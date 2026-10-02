Chapter 6

## Procedures and technology

E2EE Olm / Megolm — TLS transport encryption — 2FA for counsellors — anonymous accounts deleted on a timer

Technical part — maintained by ORISO —

### 6.1 Purpose

Processing aims to provide and technically operate an online counselling platform (“platform”) through which organisations and counselling centres can fulfil their professional counselling mandate digitally, independently of location and with accessible entry. The organisations are responsible for counselling itself and its specialist documentation; substantive case documentation does not take place on the platform. Counselling content is transmitted and stored with end-to-end encryption (Section 6.9).

### 6.2 Counselling formats

#### 6.2.1 Individual counselling (1:1 chat)

Registered advice seekers send their initial enquiry to a counselling centre; assignment follows the postcode provided and the selected counselling topic. Counselling takes place in a separate, non-publicly discoverable, end-to-end encrypted chat room, synchronously or asynchronously. Another counsellor may access an existing case only through the logged handover procedure (Section 6.13).

#### 6.2.2 Anonymous individual live chat

Individual live chat is usable without registration. The advice seeker enters a virtual waiting room under a system-generated pseudonym; no personal details are collected. This chat also uses end-to-end encryption. Anonymous accounts are automatically deactivated following inactivity and subsequently deleted (Section 6.18).

#### 6.2.3 Group chat

Group chat enables moderated many-to-many counselling, particularly for self-help formats. Moderators create offers with a topic, date, time and a one-off or recurring schedule; expired group chats are automatically deactivated. Group rooms are also created with end-to-end encryption enabled.

**Risk and compensation.** Group participants perceive one another; confidentiality towards other advice seekers therefore depends on pseudonymity and moderation, rather than technical separation. Compensating safeguards are system-generated pseudonyms (Section 6.3), moderation permissions including removing participants, and participant limits. A recurring series can itself reveal a participation profile; moderation and participant information must address this residual risk.

#### 6.2.4 Video and audio counselling

Video counselling is browser-based through a self-operated media relay, described separately in Section 6.10.

#### 6.2.5 Voice messages

Voice messages are available in every chat format and can be disabled by organisation and chat type; their specific risk profile is described separately in Section 6.11.

#### 6.2.6 Appointment management not delivered

Appointment management in the sense of a calendar or booking module is **not part of the current service scope**. A model is described in an architectural decision (ADR-020, “Scheduled calls, secure invitations, and a unified contact calendar”, status “Accepted”); none of it has yet been delivered. An appointment record in the data model originates from the predecessor platform and is not enabled in the delivered version. This DPIA therefore does not assess the planned function; it must be added upon delivery.

### 6.3 Advice-seeker registration, anonymity and pseudonymity

Registration is possible without identifying information. The username is **system-generated** (combining an adjective, animal name and name component, supplemented with an avatar colour); a freely chosen, potentially identifying real name is excluded by design. This is a deliberate improvement over the predecessor platform, which allowed freely chosen usernames. The postcode is mandatory to assign the responsible counselling centre; its accuracy is not checked. An email address is optional.

**Honest classification.** A system-generated pseudonym is **not anonymous data**. The account identifier permanently links it to all counselling interactions of the same person, so it must be treated as personal data. Complete anonymity exists only in registration-free individual live chat, while the advice seeker does not voluntarily provide identifying details. Whether use is anonymous thus follows the access route and account status — it **cannot be inferred from the displayed name**.

**Effective but limited data minimisation.** Depending on the specialist area, details stored alongside a session form a narrow quasi-identifier set: postcode, age, gender, reason for counselling and relationship situation occur together in one row. A re-identification risk therefore cannot be ruled out for small centres. Compensating safeguards are voluntary additional details, specialist-area control of collection scope and absence of links to external data sources. A registration origin reference (referrer) is also stored; it is unnecessary for counselling and must be identified as a minimisation candidate.

### 6.4 Counsellor and administrative accounts and invitation procedure

Counsellor and administrative accounts are created through invitations by the relevant organisation or centre administration, rather than by data subjects themselves. First and last name, work email address, target role and organisation/centre assignment are processed. Invitations arrive by email with a time-limited, cryptographically secured link; the access key is stored only as a hash.

Counsellors use real names; their chat-service display name corresponds to their real name, while advice seekers appear only under pseudonyms. Bulk importing invitees from a file is possible; these data are not collected from data subjects themselves, so the inviting organisation must fulfil the information obligation for third-party collection under Section 16 KDG / Article 14 GDPR.

**Residual risk.** Sending is archived with a complete copy of the message, including recipient address; no retention period has yet been defined. No deletion run exists for expired, unaccepted invitations either. Both are listed as deletion-concept measures (Section 6.18).

### 6.5 Authentication, roles and two-factor authentication

Login uses central identity management (Keycloak), OAuth 2.0 and OpenID Connect with signed tokens; passwords are stored only as salted hashes in identity management and are never available to the application in plaintext. All connections use transport encryption.

**Role model.** The platform has four staff levels and the advice seeker; internally, fine-grained realm roles represent API permissions.

| Level | Task | Access to counselling content |
| --- | --- | --- |
| Platform administration | Platform operation, creation of organisations, maintenance of platform-level legal-text templates | no |
| Organisation administration | Responsibility for an organisation: creation of counselling centres and their administration, maintenance of organisation-level legal texts | no |
| Counselling-centre administration | Centre management: inviting counsellors, configuring topics, postcode areas and live-chat access | no |
| Counsellors | Accepting enquiries and conducting encrypted counselling; supervision is a function of this role, not a separate role | own cases only |
| Advice seekers | Using counselling | own session only |

Two rules apply throughout: **hierarchical isolation** — one organisation cannot see another, and one centre cannot see another centre’s advice seekers or counsellors — and **inheritance of legal texts**: legal notice, privacy notice and consent text exist at each level; absent a local version, the parent-level version applies.

**Composite administrative roles.** Creating an organisation administrator assigns several roles as a bundle (user, agency and tenant management, and topic management outside single-domain operation). Platform administration technically uses the same combination without tenant binding; it therefore has **comprehensive read permissions across organisations**. No role currently permits operating an organisation without access to its confidential operational and counselling metadata. Section 6.16 addresses this residual risk.

**Two-factor authentication.** Second-factor options are an authenticator application (TOTP, six-digit code, 30-second interval) and an email one-time code (six digits, valid for 15 minutes, at most three failed attempts). Setup is optional for advice seekers. For all invited accounts — particularly organisation/centre administrators and counsellors — setup is a **mandatory part of account activation**: accounts remain blocked until a second factor is active. Exemption is possible only administratively, requires a reason and is documented per person with timestamp and initiating person. Platform administrators, by contrast, only receive a login prompt that can be deferred per session (“set up later”) and reappears at the next login; no technical enforcement exists there.

**Honest statement of limits.** The relevant identity-management configuration is imported at first startup and subsequently modified by runtime scripts; no source-versioned configuration file is therefore authoritative for live state. A live-realm export is needed for this DPIA’s final version. Versioned states also show that automatic protection against systematic login guessing (brute-force blocking) is **not enabled** — meaning no failed-attempt or IP history is stored — and access-token validity is generously set to five hours. A password policy (minimum length, character classes) is **not evidenced by the repositories** and must not be claimed in this DPIA before live-system verification.

### 6.6 IP-address processing and logging in transit

Application services do not store data subjects’ IP addresses in specialist datasets; they use pseudonymous identifiers and signed tokens. A filter for forwarding client IPs to specialist services has a strict mode removing the forwarding header; **this strict mode is not active by default**.

It must honestly be stated that IP addresses arise elsewhere in transit:

- The upstream ingress proxy logs the client IP, requested path and browser identifier in its standard format. Central log shipping is not configured; retention follows container-platform rotation settings and is therefore **not explicitly defined**.
- Identity management does not persist login events in its database but writes them through its active logging listener to the **server log stream, including IP addresses**. An IP-free listener variant exists but is inactive — an obvious, low-effort hardening measure.
- Individual two-factor extension endpoints include usernames in URL paths, placing them in upstream access logs.
- Video connection setup currently contacts public STUN servers of a US provider, transferring client IPs to a third-country recipient (Section 6.10).

**Compensation and measures.** The administration-interface container already deliberately logs without client IPs; the same format is planned for other web containers. Measures are enabling the IP-free identity-management listener, defining explicit access-log retention, masking token-bearing URL parameters in access logs and replacing external STUN servers with self-operated components. The predecessor documentation’s statement that IP addresses were “never recorded by the system” is **unsustainable** in this absolute form and deliberately not carried forward.

### 6.7 Cookies and website usage data

The platform completely avoids tracking, analytics services, advertising networks, external fonts and third-party scripts; it serves all components itself. No product or error telemetry is collected for third parties in users’ browsers. Only technically necessary cookies are used; a consent banner is therefore unnecessary. The application cannot be used without cookie support; users are informed before login.

| Cookie | Setter | Purpose | Storage period | Attributes |
| --- | --- | --- | --- | --- |
| `keycloak` | Application | API authentication (access token) | session | SameSite=Strict, Secure |
| `refreshToken` | Application | Renewing login session | session | SameSite=Strict, Secure |
| `CSRF-TOKEN` | Application | Cross-site request forgery protection | session | SameSite=Strict |
| `lang` | Application | Language selection | session | SameSite=Strict |
| `useInformal` | Application | Informal/formal address | session | SameSite=Strict |
| `tenantId` | Application | Tenant assignment | session | SameSite=Strict |
| `ui-version` | Application | Interface-version selection | limited (expiry date) | SameSite=Lax |
| `matrix_sso_user_id`, `matrix_sso_access_token`, `matrix_sso_device_id`, `matrix_sso_hs_url` | Application | Chat-session handover when changing interface version | session | SameSite=Lax, Secure |
| `oriso-admin.language` | Administration interface | Language selection | limited | — |
| `AUTH_SESSION_ID`, `KEYCLOAK_IDENTITY`, `KEYCLOAK_SESSION`, `KC_RESTART`, `KEYCLOAK_LOCALE`, `KC_AUTH_STATE` (each optionally `_LEGACY`) | Identity management | Single-sign-on session | tied to realm session lifetimes | HttpOnly, Secure |

**Residual risk.** The application’s two authentication cookies lack `HttpOnly` and are also mirrored in browser local storage, making them readable to page-context scripts. Chat-session handover cookies additionally carry a Matrix access token with relaxed `SameSite`. Both increase the impact of successful cross-site scripting and must be identified as hardening measures (`HttpOnly`, server-side session management, avoiding mirroring). No Content Security Policy or Referrer Policy is currently set at the ingress proxy.

### 6.8 Use on different devices

Specialist processing takes place on the server; devices retain session data, display settings and, by design, cryptographic end-to-end encryption keys. Securing devices is users’ responsibility; counsellors additionally follow their organisation’s rules for work or approved devices.

Specifically, devices store access and refresh tokens and their expiry times, chat-service credentials (access token, user and device identifiers), the end-to-end encryption cryptographic store in a browser database (IndexedDB) and interface settings.

**Two findings must be openly stated.** First, **unsent message drafts are stored in plaintext** in browser local storage; end-to-end encryption starts only upon sending. This can disclose counselling content on shared devices. Second, logout clears local and session storage, **but not the cryptographic store in the browser database**; key material therefore remains on the device after logout. Both require measures (encrypting or avoiding persistent drafts; completely wiping the cryptographic store on logout). Until then, advice to use personally controlled, locked devices forms part of user information.

### 6.9 End-to-end encryption and key concept

The platform is based on the open **Matrix** communication protocol with a self-operated homeserver. All counselling rooms — individual counselling, anonymous live chat, group chat, supervision and internal case coordination — are **mandatorily created server-side with end-to-end encryption enabled**; no unencrypted sending path exists.

**Key concept.**

- **Device keys and Olm.** Each device generates its own key pair at first login. Direct device-to-device exchange, particularly distributing room keys, uses pairwise Olm encryption.
- **Room keys and Megolm.** Message content is encrypted with a room key using Megolm (`m.megolm.v1.aes-sha2`). The key is distributed exclusively to authorised devices of room members; the server never receives it. Encryption is a room property rather than an interface switch — downgrading individual messages is excluded by design.
- **Device verification (cross-signing).** Keys are generally distributed only to cross-signed, verified devices. Anonymous live-chat users’ devices are exempt, prioritising counselling accessibility over device isolation; encryption itself remains fully effective.
- **File attachments.** Files are additionally encrypted client-side with a one-time AES-256 key before leaving the device. The server receives neither filename nor content type, only an undecryptable block; the associated key travels exclusively within the Megolm-encrypted message.
- **Server-side key backup (“Silent Key Backup”).** Recovery after device loss or new login uses a server-side, itself encrypted backup of all room keys. Its key resides in encrypted Secret Storage, openable only with a recovery key retained by the user. The server cannot read backed-up keys. Resetting the backup is destructive: previously backed-up history becomes permanently unreadable.
- **Parked device (Device Dehydration).** An additional deposited pseudo-device for seamless resumption is implemented but feature-gated and effective only when enabled. It expands the attack surface by a server-parked identity and requires separate assessment upon activation.
- **Key transfer during case handover.** Relevant room keys are selectively and securely transferred to a newly joining authorised professional’s device to share counselling history (Section 6.13).

**No federation.** Federation with external Matrix servers is deliberately disabled; no counselling data leave the platform homeserver for external servers.

**Honest distinction — what is assured and what is not.** The assurance is that counselling content reaches and leaves the server only encrypted and that operators and service providers cannot view plaintext. A cryptographic exclusion of every conceivable operator action is **not** assured: the homeserver has administrative functions capable of issuing session tokens for user accounts; access obtained this way could receive future keys. Within a counselling centre, the decisive confidentiality boundary is also not encryption but application access control combined with the logged handover procedure (ADR-002, Section 6.13). This distinction is deliberately disclosed because a blanket encryption promise would misdescribe actual protection. Administrative homeserver access must be contractually constrained and logged as a supporting organisational measure.

**Improvement over the predecessor platform.** There, end-to-end encryption was feature-switch-controlled alongside a server-side encryption path whose key components all resided on the server; the operator could technically decrypt content. Anonymous live chat was practically exempt from end-to-end encryption because keys were derived from login passwords. Participants without their own public key also had a fallback whose replacement key could be derived from a server-known identifier, and errors silently fell back to server-side encryption. The current platform has neither a server-side decryption path nor fallback; encryption applies throughout every chat format, including anonymous live chat, files and voice messages.

**Metadata remaining by design.** Even with effective end-to-end encryption, the homeserver processes metadata: room associations and memberships, pseudonymous sender identifiers, timestamps, event types, referenced events for replies and reactions, ciphertext size, read receipts and online status (presence). Online status is currently **not disabled**; disabling it should be considered for a counselling platform. Reactions and relationships between events remain visible server-side; this is inherent in the protocol for reaction events.

### 6.10 Video and audio counselling

Browser-based video and audio counselling uses a self-operated media relay (LiveKit) and Element Call. Call rooms are not publicly joinable; only members of the associated counselling room gain access. Participants’ media streams use end-to-end encryption; if encryption is unavailable, the call is not established (fail-closed). Recording is not configured; no recording or export service is part of delivery. Empty rooms are automatically discarded after a short period. The delivered call-application configuration contains no product, crash or error telemetry to third parties.

**Residual risk.** Connection setup currently contacts public STUN servers of a US provider, transferring client IP addresses to a third-country recipient. Switching to self-operated STUN/TURN components is necessary; until then, the privacy notice must disclose the transfer.

**Improvement over the predecessor platform.** Media encryption there worked only under narrow conditions (certain browser families, support by all participants) and was automatically disabled when additional people entered the waiting room; the media relay generally saw content.

### 6.11 Voice messages

The platform supports short voice messages (at most three minutes) in every counselling chat format. Organisation and chat-type settings — individual counselling, anonymous live chat, groups, supervision — can disable the function in administration; it is **enabled by default** and also depends on media-upload permission. Individual centre-level disabling is not currently supported.

**Specific risk.** The human voice is identifying and close to biometric information. In pseudonymous counselling, a voice message weakens the advice seeker’s pseudonymity towards the counsellor, though not towards platform or server operators. Advice seekers voluntarily and actively disclose their voice through deliberate recording with preview and discard options; no covert collection occurs.

**Safeguards.** Voice messages are transmitted solely with end-to-end encryption: audio is encrypted client-side with a one-time AES-256 key before leaving the device; the key travels exclusively within the Megolm-encrypted chat message. The server stores only undecryptable ciphertext without filename or content type; recording duration and time also reside solely in encrypted message content. Operators and service providers cannot listen to or substantively evaluate voice messages. Audio is not permanently stored on devices. Server metadata remaining by design are room assignment, pseudonymous sender identifier, timestamp and ciphertext size — size allows a rough estimate of recording duration.

**Residual risk and planned measures.** Encrypted media files currently have unlimited server retention; automatic media retention and switching to authenticated downloads are planned hardening measures.

### 6.12 Media uploads and malware scanning

The platform permits image uploads in chats, including anonymous registration-free live chat, and in legal-text editorial editors. Editorial images undergo server-side format validation (file signature checks, PNG/JPEG/WebP allowed, no SVG, 2 MB limit, authenticated upload).

Chat media currently have **no automated virus or content scan**. As an interim risk reduction, anonymous guests’ live-chat images initially appear blurred to counsellors and are displayed only after deliberate individual approval; senders cannot manipulate a blocking flag. This check is enforced client-side; the file itself remains retrievable server-side. Outside anonymous live chat, there is no display pre-check.

The target architecture is defined in an architectural decision (“Media scanning via matrix-content-scanner, fail-closed”): an upstream scanning proxy with virus scanning and optional AI image assessment that makes unchecked or rejected files inaccessible **server-side**. A reviewed proof of concept, disabled by default, exists but is **not deployed in production**; commissioning was deferred in July 2026 for prioritisation reasons. No activation date is set. Because end-to-end encryption has become permanently active since the architectural decision, operating the proxy additionally requires implementing the encrypted-media protocol. Before activating AI image assessment, a processing or subprocessing agreement assuring non-retention is required; virus-only scanning can be enabled independently. Planned bot protection at anonymous live-chat entry is likewise not operating.

**Residual risk.** Malware or unlawful images can technically be transmitted and retrieved; blur/approval mechanisms and format validation only partly limit exposure. Media downloads on the homeserver are currently possible **without authentication**: anyone knowing a media address can retrieve the encrypted block. File encryption protects substance, but this cannot support an assurance of “authorised access only” and is therefore listed as a hardening measure.

### 6.13 Collegial case coordination (team discussion) and case handover

**(1) Team discussion.** Counsellors at the responsible centre have a separate technical discussion room to coordinate an enquiry not yet accepted (ADR-016). This is a separate Matrix room; the advice seeker is never a member and cannot view or discover it. Participation permissions match enquiry visibility: only counsellors actively assigned to the case’s centre; application access by other centres, the organisation or platform operator is not provided (server-enforced). On acceptance, the room automatically closes permanently and remains read-only for centre counsellors (technically enforced through Matrix permission levels). Room creation and counsellor participation are timestamp-logged; message content is not logged. Advice seekers have no consent or objection right for team discussion; processing is not based on consent but designed as internal professional coordination without disclosing counselling content to additional recipient groups.

**Honest statement of limits.** Team discussion concerns an advice seeker **without their knowledge**; the archive remains permanently readable. It creates a dataset about the person outside their counselling room, relevant to access rights (Section 8.4). Planned retention is **90 days from archiving**, at the latest until deletion of the associated counselling session. Deletion is decided but not implemented (as at 5 September 2026); no archive deletion path exists in delivery. The period is planned as an operator-configurable parameter without code changes. Reason: the archive’s purpose — contextual continuity for a newly taking-over professional — is largely fulfilled when the case is accepted; subsequently it contains only process narrative about the advice seeker, whose indefinite retention cannot be justified against storage limitation (Section 7(1)(e) KDG; Caritas specialist position: process data are deleted after the client relationship ends). The period is a convention, not a statutory value, and remains subject to approval by the operational data protection officer. Currently only creation and participation are logged, not read or archive access.

**(2) Case handover.** Additional counsellor access to an existing case — sickness cover, holiday cover, collegial advice or departure — occurs solely through structured handover. Only counsellors of the same centre may apply. Every request requires a catalogued reason and justification. Each reason defines whether prior advice-seeker consent is required. Where required, the request remains pending; the advice seeker accepts or refuses within the application, and access is granted or refused only afterwards. Where consent is unnecessary — standard cases of sickness, holiday, emergency and departure — a system message immediately informs the advice seeker of the takeover and reason. The previous professional remains a room member, allowing transfer back.

**(3) Logging.** Every handover request, including refusals, is stored for auditability (requesting and previous professional, reason, outcome, consent requirement, applicable policy, timestamps). Counselling content is not part of log data. Log access is role-limited and precisely filtered by tenant and centre; administrator accounts without centre assignment receive no log access (fail-closed).

**Residual risk.** Mandatory free-text justification is stored and displayed to administration; it may contain case content. Until masking exists, the claim “without content” is accurate only with this qualification. Planned measures are an input warning (“no case content in the justification”) and masking in administrative logs. One catalogued reason (“professional ill”) also constitutes health data about the **counsellor** and requires employment-data-protection assessment.

**(4) Technical confidentiality.** Both room types are created server-side as private, undiscoverable Matrix rooms with end-to-end encryption enabled. The decisive confidentiality boundary towards non-assigned counsellors of the same centre is application access control (visibility and permissions, centre-specific search) together with the logged handover procedure, rather than encryption; third parties outside the centre additionally face room-membership separation.

**(5) Configurability.** Platform administration can enable or disable team discussion per tenant (organisation); a deployment-wide switch also exists. The handover reason catalogue, including consent requirements per reason, is administratively configurable but currently **platform-wide**, rather than per organisation. Neither function has a complete delegation cascade down to individual centres; this must **not** be claimed.

**(6) Supervision — distinction.** Supervision is a separate third tool providing accompanying read access. Standing supervision is **permanently active and cannot be disabled by the advice seeker** (decision dated 5 September 2026, ADR-008 addendum): it forms part of the centre’s professional working method; the supervising person belongs to the same centre, only reads, does not write to the counselling room and is invisible to the advice seeker. Active information replaces an objection procedure: centre privacy notices inform advice seekers when entering chat, and an additional system message should appear in their counselling room once a counsellor accepts the enquiry, when standing supervision is attached. This message is decided but **not yet implemented** (as at 5 September 2026; ORISO-Frontend#1315). A technically existing opt-out endpoint is not offered in the application; removal remains open. Case handover retains its own objection procedure unaffected. Supervision records may include free-text notes containing special categories of personal data about advice seekers (Section 11 KDG, Article 9 GDPR). Planned retention is **case end + 90 days** (start: session completion or archiving, alternatively termination of the supervision relationship, whichever occurs first). Deletion is decided but not implemented (as at 5 September 2026); today deleting a session or counsellor removes only the database row, while the Matrix side room remains indefinitely. The period is planned as an operator-configurable parameter without code changes. Reason: professional oversight ceases at case end; only process narrative about the advice seeker remains, which the Caritas specialist position says should be deleted “after the client relationship ends”. The period is a convention, not a statutory value, and subject to approval by the operational data protection officer.

**(7) Reason catalogue and special categories — current delivery and decisions.** The delivered catalogue contains `COUNSELLOR_ASKED_FOR_ADVICE`, `COUNSELLOR_ON_HOLIDAY`, `OTHER_EMERGENCY`, `COUNSELLOR_IS_ILL` and `COUNSELLOR_LEFT`. “Professional ill” (`COUNSELLOR_IS_ILL`) is health data about the **counsellor** under Section 11 KDG / Article 9 GDPR; it is written to the handover record, administrative log, notification parameters and, as derived display text, the advice seeker’s counselling room. On 5 September 2026 a decision replaced the catalogue with cause-neutral reasons `PLANNED_ABSENCE`, `UNPLANNED_ABSENCE`, `ASSIGNMENT_ENDED` and `ADVICE_REQUESTED`, with advice-seeker text naming neither cause nor duration (addendum to `ADR-002-silent-room-membership-and-access-control-curtain.md`). The opposite handover direction (“hand off case”: offer, recipient acceptance, then the same approval path) is also decided but not delivered; acceptance is expressly **not** a third consent threshold under ADR-022. Neither exists in delivery and neither may be described as current until implemented; already-sent room events are immutable and cannot retrospectively be made cause-neutral.

**(8) Evidence chain.** Function description: [Case Handover](https://docs.oriso.org/produkt/core-features/case-handover). Architectural decisions (cited by filename, not number): `ADR-002-silent-room-membership-and-access-control-curtain.md` — silent room membership, access-control curtain, addendum dated 5 September 2026; `ADR-016-team-besprechung-side-room-hard-close-at-accept.md` — hard closure of discussion room; `ADR-022-consent-gates-and-re-consent-in-counselling-sessions.md` — exactly two consent thresholds. Code: [endpoints](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/src/main/java/de/caritas/cob/userservice/api/adapters/web/controller/CaseHandoverController.java#L39-L131), [consent requirement by reason](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/src/main/java/de/caritas/cob/userservice/api/model/CaseHandoverReasonPolicy.java#L33-L34), [tenant/centre-specific log visibility](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/src/main/java/de/caritas/cob/userservice/api/service/CaseHandoverLogsService.java#L33-L109), [delivered reason catalogue](https://github.com/OpenResilienceInitiative/ORISO-UserService/blob/dev/src/main/resources/db/changelog/changeset/0057_case_handover_request/case-handover-request.sql#L52-L100). Machine-readable evidence is recorded under `case-handover-*` identifiers in `evidence-map.yaml`.

**Open issue.** Handover logs have **no** retention period: service configuration defines periods for notifications (90 days after reading, 365 days absolute) and break-glass logs (12 months), but not `case_handover_request`. Deletion occurs only upon deletion of the counsellor’s account. Planned retention is **12 months from log-entry creation**, with daily deletion. Deletion is decided but not implemented (as at 5 September 2026). The value is planned as an operator-configurable parameter without code changes. Reason: the log contains no conversation content and serves only to verify who gained case access, when and why; it does not fall below the binding six-month minimum (Section 6(f), sentence 2 KDG-DVO, input control) and follows the delivered break-glass audit’s twelve months. The deletion concept (Annex 2) must finally define the period; this is a controller decision, not a technical derivation, subject to approval by the operational data protection officer.

### 6.14 In-app and email notifications

**In-app notifications (“timeline”).** Each notification event produces a tenant-separated server record: recipient pseudonym, event type, creation/read timestamp, session reference, internal application link, display texts and structured metadata.

*Counselling communication content is not stored:* encrypted-chat message texts never reach notification processing by design because encrypted events have no message body; configurable preview mode is fixed to “no preview” in all environments, so client-submitted preview texts are also discarded.

However, **communication metadata** are stored: who wrote to whom, when and in which session, message content type, counsellor display names and, for new enquiries, counselling-topic category, itself capable of revealing the counselling reason. Handover notifications currently additionally include counsellor-written free-text justification, potentially revealing counselling content. Each notification’s read timestamp is stored to the second, enabling usage and presence profiles.

Access is strictly limited to the recipient; the API provides no administrative read access. Data subjects can fully delete their notification history themselves at any time. Since delivery dated 14 August 2026, two standard periods apply: read notifications are deleted **90 days** after reading and all others at most **365 days** after creation; a nightly deletion run (03:15) enforces both, with both values environment-configurable (`EVENT_NOTIFICATION_RETENTION_READ_DAYS`, `EVENT_NOTIFICATION_RETENTION_ABSOLUTE_DAYS`; `0` disables the respective period). Account deletion has since included the records, with separate deletion steps for advice seekers and counsellors.

**Reservation.** Both periods are this DPIA’s proposal and are not yet confirmed by the controller’s data protection officer; service configuration comments also state this.

*Planned remedies:* (1) finish migration to entirely client-rendered notification texts, eliminating server-side plaintext display texts, including handover free text; (2) reduce read timestamps to a read flag; (3) remove preview mode from source code so a configuration change alone cannot turn the table into a content store.

**Email notifications.** Email leaves the end-to-end encryption domain. Invitations, password resets, two-factor one-time codes, new-enquiry notices and contract-signing notifications are sent. **Chat or counselling content is not included**; absence of message texts has been verified in the source baseline. Depending on occasion, emails do contain enquiry postcode, centre name, counsellor name and sometimes advice-seeker pseudonym. Delivery itself reveals the existence of a counselling relationship to mail infrastructure. Several sending routes (application services, tenant mail servers, counselling-type service) use mandatory transport encryption (STARTTLS).

*Residual risk.* Mail-server credentials are protected inconsistently: encrypted in one location, encrypted in another only when a secret is configured, and unencrypted in a third configuration record. Standardisation (encryption at rest, write-only API access) is necessary (also Section 6.16). Mobile push notifications through a US service are disabled in delivery; they contain no content by design but would transfer metadata to a third country and require separate assessment before activation.

### 6.15 Statistical evaluation

Statistics are exclusively aggregated and detached from individual counselling cases. An administration dashboard displays aggregate figures (new enquiries, active cases, topic distribution, counsellor numbers and group chats — per organisation or centre, daily, weekly and monthly); individuals cannot be inferred. **Small-cell suppression** protects against inference from small groups: aggregates appear only with at least five contributing counsellors, otherwise values are suppressed; checks are fail-closed and enforced in production.

Counsellor message statistics store no plain identifier: counting uses a cryptographic pseudonym (HMAC-SHA256 over the counsellor identifier with a server-managed secret). Counsellors can see only their own metrics; the application offers no third-party individual performance evaluation.

**Honest statement of limits.** Pseudonymisation is not fully effective: the triggering counselling-session identifier is also stored in plaintext, permitting re-identification through session-data linkage. These counts have no retention period and are not removed on counsellor-account deletion. An individual-session endpoint, including postcode, is reserved for technical service accounts. The application can also publish statistical events to a message bus; registration events would contain account identifier, age, gender, postcode, topic and referrer in one record. Publication is **disabled** in delivery; no processing recipient was found in reviewed sources, and message-bus transport encryption is not configured. Before activation, recipients, storage location, retention and deletion propagation must be clarified and event content minimised.

### 6.16 Tenant isolation

The platform supports multiple tenants: each organisation forms a tenant with associated centres, counsellors, legal texts and configuration. Isolation uses tenant identifiers on records and an application filter; it is **application-level, not database-level**. Specialist datasets such as handover logs and notifications carry and filter tenant identifiers; administrative evaluations are restricted to the caller’s agencies and fail closed.

**Risk and compensation.** Purely application-level separation is sensitive to misconfiguration and programming errors; a cross-organisation visibility error occurred and was fixed previously. Consistent filtering at access layers, fail-closed administrative evaluations and a restricted agency-administrator role compensate. Regression tests for tenant isolation and assessment of database-level separation must be listed as measures.

**Finding requiring open disclosure.** Platform administration can retrieve every tenant’s complete settings, currently including **organisation mail-server credentials in plaintext**, also stored unencrypted; DPA signature data are likewise visible across organisations. Required measures are write-only secret API access, encryption at rest and separation of operational and viewing permissions (break-glass access with organisation approval, time limit and logging). Until implementation, platform-administrator membership must be narrow, contractually constrained and documented.

### 6.17 Operation, observability and telemetry

**Service logging.** Application services write structured logs to standard output; services do not rotate or retain logs themselves, leaving this to the container platform. Log context contains a correlation identifier rather than account identifier. Nevertheless, personal details appear in some log texts: account identifiers, plaintext usernames, occasionally complete email addresses and, at debugging level, access-token content. Log level can be changed at runtime through an exposed management endpoint. **Measures:** secure that endpoint, remove record dumps containing names/email addresses, filter personal details and define explicit log retention.

**Tracing and metrics.** Integration with an observability platform (SigNoz) is prepared; export is **disabled by default and in production** in delivery. The pre-production environment exports only metrics, not traces. Before activation, traces must be assessed for identifier-bearing paths; observability retention and access protection must be defined.

**Browser error reports.** The application can report browser errors to the server (message text, requested address, browser identifier, call stack, correlation identifier, each length-limited). These may contain personal data and are subject to log retention. Browser data are **not** transferred to external telemetry services.

**Backup and recovery.** Chat-service database backup/recovery procedures retain full backups for 30 days and continuous log backups for seven days. Other core databases have **no backup jobs** in delivery — an availability gap under processing security, Section 26 KDG / Article 32 GDPR. More importantly, backup scripts include a path transferring database extracts to an external source-code management system of a US provider. **Whether this path is active must be conclusively clarified before DPIA approval; if active, it constitutes an impermissible third-country transfer with practically undeletable history.** Deleted data also survive in backups until backup periods expire.

**Legal-text translation.** An external language-model interface can translate tenant-specific legal texts (legal notice, privacy notice, DPA). The full text is transferred, including controllers’ and data protection officers’ names, addresses and email addresses. Providers are located outside the territorial scope; use requires a processing agreement and third-country-transfer assessment. **Counselling content is never transferred to language-model services.**

**Operational chat-service hardening.** Delivery enables open registration without verification, practically removes rate limits, permits unauthenticated media retrieval and defines no message or media retention. These contradict the principle that accounts originate exclusively through the application and must be resolved before production operation.

### 6.18 Deletion and retention

The deletion concept (Annex 2) consolidates periods by data category. Technical procedures are:

- **Account deletion by the data subject.** Advice seekers can delete their accounts. A 48-hour read-only protection window precedes automatic execution. In fixed order, deletion removes identity account, chat account (with explicit deletion marker and room cleanup), sessions and additional data, topic assignments, supervision assignments, handover requests, agency assignments, pseudonym-registry entry, mobile-device identifiers and finally the account record. Deletion can be suspended for three to at most twelve months, with a documented reason.
- **Anonymous accounts.** Deactivation after 360 minutes of inactivity, deletion after 2,820 minutes (47 hours), each checked hourly.
- **Group chats.** Expired group chats are checked and deactivated every minute.
- **Registered accounts without counselling.** A 30-day deletion run is implemented but disabled in delivery; if it remains inactive, accounts with supplied email addresses persist indefinitely.
- **Evidentiary data.** Rejected DPA signatures are deleted after a configured period; signed ones are retained for evidence. Support-access audit logs are automatically deleted after twelve months — the only explicitly documented retention period in the dataset.
- **Tombstone record.** After final deletion, a reference record retains the complete former account identifier and neutral display marker to resolve references in surviving records. It has unlimited retention.

**Honest gap disclosure — what deletion currently misses.** Account deletion does not cover in-app notifications, server-stored message drafts, pseudonymised counsellor message statistics, the archive of invitation emails sent, inactivity-notification audit logs or a migration-era person/chat-room mapping table absent from the application data model and therefore invisible to every deletion procedure. None has a time-based retention limit. The chat service additionally lacks message/media retention and deleted data remain in backups until expiry. “Complete” deletion may be claimed only after these gaps close; until then they must appear as deletion-concept measures. This disclosure is deliberate: a DPIA describing incomplete deletion as complete would defeat its purpose.

### 6.19 Overview of data categories and recipients

Deletion periods per data category: see Annex 2 — deletion concept (in preparation). Recipients and processors: see Chapter 4.

Landscape table — horizontally scrollable in its own container

| Data subjects | Source | Data categories | Protection class |
| --- | --- | --- | --- |
| Registered advice seekers | Self-reported during registration/use | - system-generated pseudonymous username; password hash - unverified postcode; optional specialist-area details (e.g. age, concern) - optional email address, 2FA features - end-to-end encrypted counselling content, files and voice messages - session and notification metadata | I–III depending on voluntary details |
| Live-chat advice seekers, without registration | System-generated | - generated pseudonymous username - temporary session data; automatic deletion after a short period | I–III |
| Counsellors | Invitation by organisation administrators | - name, work email address - counselling centre, role/team assignment, 2FA status - pseudonymised activity statistics (HMAC) | I |
| Organisation representatives signing DPA, not app users | Self-reported during signing | - name, role, organisation, email address - signature status/time (evidence purpose, Section 29 KDG / Article 28 GDPR) | I |
| Administrators | Created by operator or organisation | - name, email address, role, tenant/centre assignment | I |
