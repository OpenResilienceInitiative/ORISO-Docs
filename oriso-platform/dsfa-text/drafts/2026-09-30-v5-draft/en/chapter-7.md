Chapter 7

## Legal bases

Technical part — maintained by ORISO —

Processing relies on different authorisations for each processing step. The assignment below gives the provision of the Church Data Protection Act (“KDG”) and, in parentheses, its counterpart in the General Data Protection Regulation (“GDPR”), allowing switching through the compliance preset.

### 7.1 Overview

| # | Processing step | KDG legal basis | GDPR counterpart |
| --- | --- | --- | --- |
| 1 | Technical usage and operational data (session control, technically necessary cookies, access and error logs, operational security) | Section 6(1)(g) KDG | (Article 6(1)(f) GDPR) |
| 2 | Advice seekers’ registration data (system-generated pseudonym, password hash, postcode) | Section 6(1)(b) KDG | (Article 6(1)(a) GDPR) |
| 3 | Voluntary additional information (email address, age, gender, reason for counselling, two-factor features) | Section 6(1)(b) KDG | (Article 6(1)(a) GDPR) |
| 4 | Counselling content including special categories of personal data | Section 6(1)(b) in conjunction with Section 11(1)(a) KDG | (Article 9(2)(a) GDPR) |
| 5 | Anonymous live-chat use without any personal information | KDG scope does not apply | (GDPR scope does not apply) |
| 6 | Counsellor and administrator data (account, roles, assignment, two-factor status) | Section 6(1)(g) and (f) KDG | (Article 6(1)(b) or (f) GDPR) |
| 7 | Pseudonymised counsellor activity statistics | Section 6(1)(g) KDG | (Article 6(1)(f) GDPR) |
| 8 | Internal case coordination and handover (team discussion, handover log, supervision) | Section 6(1)(g) KDG; additionally Section 6(1)(b) KDG for handover reasons requiring consent | (Article 6(1)(f) or (a) GDPR) |
| 9 | Organisation representatives’ signature data for the data processing agreement | Section 6(1)(c) in conjunction with Section 29 KDG | (Article 6(1)(c) in conjunction with Article 28 GDPR) |
| 10 | Log and evidentiary data (access, invitation and support logs) | Section 6(1)(c) and (g) KDG | (Article 6(1)(c) and (f) GDPR) |

### 7.2 Advice seekers’ data

**(1) Technical usage data.** Platform operation requires session control, authentication, technically necessary cookies and operational and security logs. This processing is based on legitimate interests under Section 6(1)(g) KDG / Article 6(1)(f) GDPR. The interest is in providing a functioning, available counselling service protected against misuse. No overriding interests of data subjects requiring protection oppose this, because processing is limited to technical necessities, no tracking or analytics services are used, and application services do not retain IP addresses in their specialist datasets. A qualification is that IP addresses occur in access logs of the ingress proxy and identity management (Section 6.6); a retention period must be defined to maintain necessity.

**(2) Registration data.** Registration is voluntary; advice seekers decide for themselves whether to use the service. Processing the system-generated pseudonym, password hash and postcode relies on consent under Section 6(1)(b) KDG / Article 6(1)(a) GDPR, obtained and documented during registration. The postcode is the only mandatory field and is used solely to assign the responsible counselling centre; its accuracy is not checked.

**(3) Voluntary additional information.** Providing an email address, enabling two-factor authentication and specialist-area details (including age, gender, relationship situation and reason for seeking advice) are voluntary and also rely on consent under Section 6(1)(b) KDG / Article 6(1)(a) GDPR. Consent can be withdrawn at any time; Section 8.10 describes the consequences.

**(4) Counselling content.** Counselling content regularly contains special categories of personal data under Section 11 KDG / Article 9 GDPR. Processing relies on explicit consent under Section 6(1)(b) in conjunction with Section 11(1)(a) KDG / Article 9(2)(a) GDPR, obtained before counselling begins. Additionally, the platform operator technically cannot read the content because it is transmitted and stored solely with end-to-end encryption (Section 6.9); end-to-end encryption is not a legal basis, but an essential technical safeguard under Section 26 KDG / Article 32 GDPR.

**(5) Anonymous use.** Registration-free individual live chat collects no personal data about the advice seeker unless they voluntarily provide identifying information. To this extent, the KDG (GDPR) scope does not apply; as soon as the advice seeker provides personal details during the conversation, the legal basis in paragraph 4 applies. Classification follows the access route and account status, rather than the displayed name.

### 7.3 Counsellor and administrative-role data

Processing counsellors’ and administrative roles’ account, role and assignment data relies on legitimate interests under Section 6(1)(g) KDG and the church interest under Section 6(1)(f) KDG in a unified, secure counselling platform jointly operated for all affiliated organisations. Consent is not the principal basis because using the platform forms part of professional or voluntary activity and is not voluntary in the data protection sense.

**Preset note (the only substantive difference).** The church interest under Section 6(1)(f) KDG has **no GDPR counterpart**. This section therefore requires rewording in the GDPR preset: processing there relies on Article 6(1)(b) GDPR (performance of the employment or service relationship, where the counsellor is employed by the controller) and otherwise Article 6(1)(f) GDPR; for employees, the national employment data protection provision must also be applied. All other sections in this chapter are preset-neutral and only change the statutory references.

**Employment data protection.** Two processing activities particularly concern employees and require separate assessment: first, pseudonymised message statistics generate a row for each message sent and therefore allow an activity profile; their design lets counsellors view only their own metrics and subjects aggregated evaluations to small-cell suppression (Section 6.15). Second, the handover reason “professional ill” constitutes a health datum about the counsellor and must additionally be assessed against Section 11 KDG / Article 9 GDPR. Both issues require coordination with the competent employee representative body.

### 7.4 Organisation representatives’ data

Details collected about signatories to the data processing agreement (name, role, organisation, email address, signature status and timestamp) fulfil a legal obligation under Section 6(1)(c) in conjunction with Section 29 KDG / Article 6(1)(c) in conjunction with Article 28 GDPR. The data subjects are generally **not users of the counselling application**; they sign through personalised, time-limited links. They therefore form a separate group of data subjects with a distinct processing purpose. Completed signatures are retained as evidence; rejected signatures are deleted after a configured period.

### 7.5 Log and evidentiary data

Access, invitation, handover and support logs serve accountability under Section 7(1) KDG / Article 5(2) GDPR and processing security under Section 26 KDG / Article 32 GDPR. The legal basis is Section 6(1)(c) and (g) KDG / Article 6(1)(c) and (f) GDPR. As these data have independent retention purposes, they are excluded from data subjects’ deletion requests and subject to a separate retention period to be defined in the deletion concept. Several log datasets currently lack such a period (Section 6.18); this is listed as a measure because indefinite retention without a defined purpose would contradict storage limitation under Section 7(1)(e) KDG / Article 5(1)(e) GDPR.

### 7.6 Legal bases not relied upon

The following are explicitly **not** relied upon: processing for advertising or marketing, profiling, individual automated decisions under Section 24 KDG / Article 22 GDPR, and any sharing of counselling content with third parties for the operator’s or service providers’ own purposes. Counselling content is not transferred to language-model or other AI services; the existing translation function concerns only editorial legal texts (Section 6.17).
