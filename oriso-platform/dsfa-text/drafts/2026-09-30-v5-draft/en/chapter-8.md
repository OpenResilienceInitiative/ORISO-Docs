Chapter 8

## Data subject rights

### 8.1 Identity verification

Organisational part — maintained by the platform operator (contractual documents) — editing in the administration area will follow —

This section describes the organisation, decision-making processes and legal balancing by the organisation. It cannot be derived from source code and is therefore not maintained by ORISO. Until the organisation writes it, the document contains only the draft text, originally collapsed; the square brackets deliberately mark open fields.

Show draft text

Before handling a data subject request, the applicant’s identity must be verified. At platform-operator level this is **almost impossible**: the platform knows neither real names nor verified contact details, only a system-generated pseudonym and, possibly, a voluntarily supplied, unverified email address. The operator therefore identifies the responsible counselling centre and asks it to verify identity; the centre compares the available details with the counselling history it knows and confirms the assignment through [channel, e.g. a reply in the counselling chat]. Additional options include [other means of identification, e.g. confirmation through the stored email address, naming case-specific characteristics]. If there are reasonable doubts about identity, additional information is requested under Section 17(3) KDG / Article 12(6) GDPR; if identity cannot be established, the request is refused with reasons. [Office/function] is responsible, and the processing deadline is [deadline].

### 8.3 Privacy notices and information channels

Organisational part — maintained by the platform operator (contractual documents) — editing in the administration area will follow —

This section describes the organisation, decision-making processes and legal balancing by the organisation. It cannot be derived from source code and is therefore not maintained by ORISO. Until the organisation writes it, the document contains only the draft text, originally collapsed; the square brackets deliberately mark open fields.

Show draft text

Privacy notices under Sections 15 and 16 KDG / Articles 13 and 14 GDPR are linked on the registration page before registration and permanently within the application after login; registration-free live chat displays them on the preceding entry page. Legal notice, privacy notice and consent text exist at every platform level; if a counselling centre has no local version, the organisation’s version applies, otherwise the platform template — advice seekers therefore always see a complete set of legal texts. Counselling centres themselves provide information about **their own** processing, particularly case documentation outside the platform, through [channel, e.g. a counselling-chat notice, document upload, link to their own privacy notice]. Changes to privacy notices are announced through [procedure, e.g. a notice at next login]. [Contact channel] is available for questions.

Technical part — maintained by ORISO — Sections 8.1, 8.3 and 8.11 are organisational —

Data subject rights under Sections 14 et seq. KDG / Articles 12 et seq. GDPR can be exercised against any joint controller; internal allocation is governed by the joint-controller agreement. The following sections describe, for each right, **what is technically possible and what is technically impossible**. This deliberately sharp distinction reflects that continuous end-to-end encryption, extensive data minimisation and self-deletion considerably strengthen rights in some areas but create technical limits in others that organisational effort cannot overcome.

*Sections 8.1 (identity verification), 8.2 (specific features of anonymous use), 8.3 (privacy notices) and 8.11 (disclosure to investigative authorities) are operator-specific and maintained by the controller; prefilled drafts are available for 8.1, 8.3 and 8.11.*

### 8.4 Right of access (Section 17 KDG / Article 15 GDPR)

**Technically possible.** The platform operator can provide access to the master and system data it stores. These principally include the system-generated pseudonym, any email address supplied, postcode, counselling-centre and specialist-area assignment, selected counselling topics and specialist-area details, registration and terms/privacy acceptance timestamps, two-factor authentication status, language and notification settings, counselling-session metadata (creation, assignment, archiving), notification-history entries and case-handover log entries concerning the person.

**Technically impossible.** The platform operator cannot provide access to counselling communication **content** — messages, files, voice messages, video and audio conversations. These exist only as ciphertext; decryption keys are held solely on participants’ devices (Section 6.9). The operator can neither read nor export this content nor include it in an access response. Advice seekers, however, can see the full content in their application at any time; access to counselling content is therefore effectively provided by the application itself and, where necessary, the counselling centre.

**Limit that must be stated honestly.** Two datasets deserve particular mention because they contain data **about** an advice seeker outside their own counselling room: the team discussion in which counsellors discuss an enquiry not yet accepted, and the free-text reason in the case-handover procedure. Neither is visible to the advice seeker. Handover free text is available to the controller in plaintext and can therefore be disclosed; team-discussion content cannot, for the same cryptographic reasons as counselling content — only metadata (room existence, time, participating professionals) can be disclosed. For access requests this means access must be granted but cannot include the substance of colleagues’ discussion. This restriction must be explicitly stated in the response and must not be hidden behind general wording.

**Procedural note.** Access requires verification of the applicant’s identity, which the platform deliberately does not know; identity verification under Section 8.1 must therefore precede it and can practically only be performed through the counselling centre.

### 8.5 Right to rectification (Section 18 KDG / Article 16 GDPR)

**Technically possible.** Advice seekers can directly change their email address, password, language, notification settings and second factor themselves in the application. Counsellors and administrative roles have names, work email addresses, absence notices and assignments changed through their administration.

**Practically limited.** Other details are either system-generated (pseudonym, account identifier) or document actual system use (timestamps, session status, log entries). Such documentation data cannot be rectified because a change would make the documented event inaccurate; instead they are deleted after their retention period. The postcode can be changed; its substantive accuracy is not checked by the system anyway.

**Technically impossible.** Rectification of counselling content by the platform operator is excluded. Advice seekers can, however, delete their own messages and send them again; this is the more effective practical route.

### 8.6 Right to erasure (Section 19 KDG / Article 17 GDPR)

**Technically possible — designed to be particularly privacy-friendly.** Advice seekers can independently and immediately delete individual messages and their entire account without applying to the controller. Account deletion includes a 48-hour protection window with read-only access to guard against accidental action, followed by automated execution. The deletion run removes the identity account, chat account (including an explicit deletion marker and room cleanup on the chat server), sessions and additional session data, topic and supervision assignments, case-handover requests, agency assignments, the pseudonym-registry entry, mobile-device identifiers and finally the account record. Anonymous accounts are automatically deleted after a short period without action by the data subject.

During onboarding, counsellors are informed that advice seekers may remove counselling data at any time without notice.

**Technically impossible.** The server operator cannot identify an **individual** message within an encrypted history and therefore cannot selectively delete it; complete rooms and their media can be removed. Individual messages are therefore deleted solely by the data subject themselves in the application.

**Limits that must be stated honestly.**

- **Datasets not covered.** Account deletion currently does not cover in-app notification history, server-stored message drafts, pseudonymised counsellor message statistics, the archive of invitation emails sent, the inactivity-notification audit log or a person-to-chat-room mapping table remaining from migration. Closing these gaps is listed as a measure (Section 6.18); until then deletion is **incomplete** and must not be described as complete.
- **Reference record after deletion.** A reference record retaining the full former account identifier remains after execution to resolve references in surviving records. Personal identifiability therefore survives deletion. A retention period must be defined or the identifier itself pseudonymised.
- **Backups.** Deleted data remain in backups until the backup periods expire (30 days for full backups, seven days for continuous chat-service log backups). This is usual for staggered backups and must be documented in the deletion concept.
- **Log and evidentiary data.** Log and evidentiary data with independent legal bases and retention periods are excluded from deletion requests (Section 7.5).
- **Counsellors.** Counsellor accounts cannot be deleted during active service; termination of the service relationship with the organisation is decisive.
- **Team-discussion archive.** Closed discussion rooms remain readable; a retention period must be defined.

### 8.7 Right to restriction of processing (Section 20 KDG / Article 18 GDPR)

**Not technically implementable in its actual form.** The platform does not support marking data as “stored only, not processed”; such a marker would also be ineffective for end-to-end encrypted content because the controller does not process it anyway.

**Technically possible as a functional equivalent.** Available options are **suspending deletion** for three to at most twelve months with a documented reason, preserving the dataset unchanged; the **48-hour read window** in the deletion process, during which no further writing occurs; and **blocking or deleting the account** through the controller. Temporary account deactivation is additionally available for counsellors and is the closest practical equivalent to restriction.

Advice seekers cannot block their own accounts, only delete them. A restriction request must therefore be directed to the controller, who arranges blocking.

### 8.8 Right to data portability (Section 22 KDG / Article 20 GDPR)

**Technically possible.** Consent-based master data (pseudonym, email address, postcode, topic and specialist-area assignment, voluntary additional details and consent timestamps) can be provided in a structured, commonly used, machine-readable format.

**Technically impossible.** A machine-readable export of counselling content by the controller is excluded because it cannot decrypt that content. Advice seekers can see the full content in the application and save it on their device; no server-generated export exists. A client-side export of decrypted history should be considered as a possible product measure, but is not currently implemented. This restriction is the direct counterpart of encryption — the price of protection that would not otherwise exist — and is therefore openly stated rather than minimised.

The right generally does not apply to counsellors because their data are based neither on consent nor on a contract between them and the platform operator.

### 8.9 Right to object (Section 23 KDG / Article 21 GDPR)

**Practically narrow scope.** Objection addresses processing based on legitimate interests. For advice seekers, this only concerns technical usage and operational data (Section 7.2, paragraph 1). These are essential for operation; an objection would mean the platform could no longer be used. It therefore amounts to ending use and exercising the erasure right under Section 8.6. There is no advertising or marketing processing subject to unconditional objection.

For counsellors, compelling legitimate grounds of the controller generally prevail because counselling and accountability are impossible without accounts, role assignments and logging. Objections must be assessed individually, particularly concerning activity statistics (Section 6.15), where the performance-related nature requires careful documentation of the balancing exercise.

### 8.10 Right to withdraw consent (Section 8(6) KDG / Article 7(3) GDPR)

**Technically possible and immediately effective.** Withdrawal may be declared to the counselling centre or platform operator. Since registration and counselling rely on consent, withdrawal removes their basis; account deletion, which the data subject can initiate themselves, implements it directly. Partial withdrawal is possible for voluntary additional details: email address and two-factor authentication can be removed at any time by the user.

The lawfulness of processing before withdrawal is unaffected. Withdrawal does not apply to counsellors because their processing is not based on consent (Section 7.3).

**Evidence of consent — open issue.** Acceptance of terms and privacy notices is stored with a timestamp. A client-side-only confirmation check is documented for part of the registration flow; server-enforced evidence must be ensured to fulfil the burden of proof under Section 8(2) KDG / Article 7(1) GDPR. This is listed as a measure.

### 8.12 Summary assessment by right

| Right | KDG provision (GDPR) | Implementability |
| --- | --- | --- |
| Access | Section 17 KDG (Article 15) | limited — master and system data yes, counselling content technically no |
| Rectification | Section 18 KDG (Article 16) | limited — editable fields self-managed, documentation data not rectifiable |
| Erasure | Section 19 KDG (Article 17) | largely — self-deletion of messages and account; identified residual datasets open |
| Restriction | Section 20 KDG (Article 18) | limited — blocking, deletion suspension or deactivation only |
| Portability | Section 22 KDG (Article 20) | limited — master data exportable, counselling content not |
| Objection | Section 23 KDG (Article 21) | hardly applicable in practice — operational data essential |
| Withdrawal | Section 8(6) KDG (Article 7(3)) | complete — directly implemented through self-deletion |

### 8.11 Escalation chain and disclosure to investigative authorities

Organisational part — maintained by the platform operator (contractual documents) — editing in the administration area will follow —

This section describes the organisation, decision-making processes and legal balancing by the organisation. It cannot be derived from source code and is therefore not maintained by ORISO. Until the organisation writes it, the document contains only the draft text, originally collapsed; the square brackets deliberately mark open fields.

Show draft text

If a reportable criminal offence is announced during counselling or an acute threat becomes apparent (“worst case”), a jointly developed action recommendation provides this responsibility chain: (1) the counsellor immediately informs [counselling-centre management]; (2) [function] performs a professional threat assessment, consulting [specialist service] where necessary; (3) where Section 138 of the German Criminal Code or a child-welfare threat applies, **the counselling centre**, rather than the platform operator, forwards required information to [police / youth welfare office]; (4) [department management, data protection officer, organisation representative] are informed in parallel. Only message content viewed by the counsellor, the system-recorded timestamp and the processor’s address can be disclosed; **advice seekers’ IP addresses are not retained in specialist datasets and therefore cannot be disclosed**, and the platform operator has no plaintext counselling content because of end-to-end encryption. Separately, for data protection incidents under Section 33 KDG / Article 33 GDPR: notify [supervisory authority] within 72 hours through [reporting channel], internally alert [functions] within [deadline], with substitution by [function].
